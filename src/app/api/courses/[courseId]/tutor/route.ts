import { NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canViewCourseMedia } from "@/lib/media";
import { TutorRefusal, streamTutorReply, tutorEnabled } from "@/lib/tutor";
import { MAX_TUTOR_MESSAGE_CHARS } from "@/lib/tutor-options";
import { rejectBots } from "@/lib/bot-check";

// The AI study buddy chat for one course: GET loads the learner's
// conversation, POST sends a message and streams the reply back as plain
// text, DELETE starts a fresh conversation.

export const maxDuration = 120;

// Per learner, counted in the database so it holds across server instances.
const MESSAGES_PER_HOUR = 40;

async function access(courseId: string) {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: "Log in to chat with your study buddy." }, { status: 401 }) };
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true, instructorId: true } });
  if (!course) return { error: NextResponse.json({ error: "Course not found." }, { status: 404 }) };
  if (!(await canViewCourseMedia(session, course))) {
    return { error: NextResponse.json({ error: "Enrol in the course to use its study buddy." }, { status: 403 }) };
  }
  return { session, course };
}

export async function GET(_request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const result = await access(courseId);
  if (result.error) return result.error;

  const messages = await prisma.tutorMessage.findMany({
    where: { courseId, userId: result.session.userId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, role: true, content: true, createdAt: true },
  });
  return NextResponse.json({ enabled: tutorEnabled(), messages: messages.reverse() });
}

const sendSchema = z.object({
  message: z.string().trim().min(1, "Type a message first.").max(MAX_TUTOR_MESSAGE_CHARS, "That message is too long."),
  level: z.enum(["expert", "standard", "simple", "beginner"]).default("standard"),
  language: z.enum(["en", "kri"]).default("en"),
  lessonId: z.string().max(40).optional().nullable(),
});

export async function POST(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const result = await access(courseId);
  if (result.error) return result.error;
  const { session } = result;
  const bot = await rejectBots();
  if (bot) return bot;

  if (!tutorEnabled()) {
    return NextResponse.json(
      { error: "The study buddy isn't switched on yet. An administrator needs to add an ANTHROPIC_API_KEY." },
      { status: 503 },
    );
  }

  const parsed = sendSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid message." }, { status: 400 });
  }
  const { message, level, language, lessonId } = parsed.data;

  const recent = await prisma.tutorMessage.count({
    where: { userId: session.userId, role: "USER", createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  if (recent >= MESSAGES_PER_HOUR) {
    return NextResponse.json(
      { error: "You've sent a lot of messages this hour. Take a short break and try again soon." },
      { status: 429 },
    );
  }

  const lesson = lessonId
    ? await prisma.lesson.findFirst({ where: { id: lessonId, module: { courseId } }, select: { title: true } })
    : null;

  await prisma.tutorMessage.create({
    data: { courseId, userId: session.userId, role: "USER", content: message },
  });
  const history = await prisma.tutorMessage.findMany({
    where: { courseId, userId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { role: true, content: true },
  });
  history.reverse();

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let reply = "";
      try {
        for await (const chunk of streamTutorReply({
          courseId,
          history,
          level,
          language,
          lessonTitle: lesson?.title ?? null,
        })) {
          reply += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
        if (reply.trim()) {
          await prisma.tutorMessage.create({
            data: { courseId, userId: session.userId, role: "ASSISTANT", content: reply },
          });
        }
      } catch (error) {
        // The status line is already sent, so failures travel in-band on a
        // marker line the chat screen recognises.
        let text = "Your study buddy couldn't answer just now. Please try again.";
        if (error instanceof TutorRefusal) text = "I can't help with that one. Let's get back to the course!";
        else if (error instanceof Anthropic.RateLimitError) text = "Lots of learners are asking questions right now. Try again in a minute.";
        else console.error("Tutor reply failed", error);
        controller.enqueue(encoder.encode(`\n\u0000ERROR:${text}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const result = await access(courseId);
  if (result.error) return result.error;
  await prisma.tutorMessage.deleteMany({ where: { courseId, userId: result.session.userId } });
  return NextResponse.json({ ok: true });
}
