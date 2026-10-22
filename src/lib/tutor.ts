import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { TRANSCRIPT_LANGUAGES, isTranscriptLanguage } from "@/lib/transcript";
import type { TutorLanguage, TutorLevel } from "@/lib/tutor-options";

// The AI study buddy: a per-course tutor learners chat with. It is grounded
// in the course itself (lesson text, video and audio transcripts, the
// project brief) and never sees quiz answers, so it can't be used to
// cheat on graded work.
//
// Needs ANTHROPIC_API_KEY. TUTOR_MODEL overrides the model.

const DEFAULT_MODEL = "claude-opus-5-5";

// Keeps one request comfortably inside the context window and the bill
// predictable, even for very long courses.
const MAX_CONTEXT_CHARS = 180_000;
const MAX_LESSON_CHARS = 12_000;
const HISTORY_MESSAGES = 30;

export function tutorEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  client ??= new Anthropic();
  return client;
}

// Course text goes inside XML-style tags; keep titles from breaking them.
function attr(value: string): string {
  return value.replace(/[<>"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}\n[…shortened]` : text;
}

/** Everything the tutor may draw on for one course, as plain text. */
export async function courseContext(courseId: string): Promise<{ title: string; text: string } | null> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      title: true,
      description: true,
      category: true,
      level: true,
      modules: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          lessons: { orderBy: { order: "asc" }, select: { id: true, title: true, content: true } },
          quizzes: { select: { title: true } },
        },
      },
      media: {
        where: { status: "READY" },
        orderBy: { createdAt: "asc" },
        select: { kind: true, title: true, lessonId: true, moduleId: true, transcript: true, transcriptLanguage: true },
      },
      project: { select: { title: true, instructions: true } },
    },
  });
  if (!course) return null;

  const parts: string[] = [
    `<course title="${attr(course.title)}" category="${attr(course.category)}" level="${attr(course.level)}">`,
    course.description,
  ];
  const mediaFor = (lessonId: string | null) =>
    course.media.filter((m) => m.lessonId === lessonId && (lessonId !== null || m.moduleId === null));
  const describeMedia = (m: (typeof course.media)[number]) => {
    if (m.kind === "DOCUMENT") return `<document title="${attr(m.title)}" />`;
    const kind = m.kind === "VIDEO" ? "video" : "audio";
    if (!m.transcript) return `<${kind} title="${attr(m.title)}">No transcript was provided.</${kind}>`;
    const language = isTranscriptLanguage(m.transcriptLanguage) ? TRANSCRIPT_LANGUAGES[m.transcriptLanguage] : "English";
    return `<${kind} title="${attr(m.title)}" transcript_language="${language}">\n${m.transcript}\n</${kind}>`;
  };

  course.modules.forEach((module, mi) => {
    parts.push(`<module number="${mi + 1}" title="${attr(module.title)}">`);
    module.lessons.forEach((lesson, li) => {
      parts.push(`<lesson number="${mi + 1}.${li + 1}" id="${lesson.id}" title="${attr(lesson.title)}">`);
      parts.push(clip(lesson.content, MAX_LESSON_CHARS));
      mediaFor(lesson.id).forEach((m) => parts.push(describeMedia(m)));
      parts.push("</lesson>");
    });
    course.media.filter((m) => m.moduleId === module.id).forEach((m) => parts.push(describeMedia(m)));
    if (module.quizzes.length) {
      parts.push(`(This module ends with a graded quiz: ${module.quizzes.map((q) => q.title).join(", ")}.)`);
    }
    parts.push("</module>");
  });

  const resources = mediaFor(null);
  if (resources.length) {
    parts.push("<course_resources>", ...resources.map(describeMedia), "</course_resources>");
  }
  if (course.project) {
    parts.push(`<practical_project title="${attr(course.project.title)}">\n${course.project.instructions}\n</practical_project>`);
  }
  parts.push("</course>");

  return { title: course.title, text: clip(parts.join("\n"), MAX_CONTEXT_CHARS) };
}

function systemPrompt(courseTitle: string): string {
  return `You are the study buddy for "${courseTitle}" on EliteSkills Academy, an online learning platform in Sierra Leone. Learners chat with you in a messaging app, often on a phone and on mobile data.

Your job is to help each learner truly understand this course. Explain concepts at whatever depth they ask for, from expert detail down to the simplest everyday explanation, using local, familiar examples (markets, farming, okadas, football, family life in Sierra Leone) when that helps. Check understanding with a short question now and then, and encourage the learner without overdoing praise.

Ground your answers in the course material provided below. Video and audio content is available to you only through its transcript; transcripts may be in English or Krio. When the course doesn't cover something, say so briefly, then help with general knowledge if it's relevant to the subject. Politely steer conversations that are unrelated to learning back to the course.

Graded quizzes and the practical project test the learner's own understanding. Don't hand over answers to them: explain the underlying ideas, give similar worked examples, and let the learner do the work.

Write like a friendly tutor texting: short paragraphs, plain words, and simple formatting only (**bold**, bullet lists with "- ", numbered steps). No headings, tables or long essays unless the learner asks for depth. Latency matters: begin your answer straight away.`;
}

const LEVEL_GUIDE: Record<TutorLevel, string> = {
  expert:
    "Explain at an expert level: precise terminology, the underlying theory, edge cases and how this connects to related ideas.",
  standard: "Explain clearly at the level of the course, with one good example.",
  simple: "Explain simply: everyday words, a short concrete example, no jargon (or define any you must use).",
  beginner:
    "Explain as if to someone completely new to the subject: tiny steps, a familiar everyday comparison, no jargon at all, and finish by checking they followed.",
};

function preferences(level: TutorLevel, language: TutorLanguage, lessonTitle: string | null): string {
  const lines = [
    LEVEL_GUIDE[level],
    language === "kri"
      ? "Reply in Krio (Sierra Leone Krio), written the way people text it. Keep technical terms in English where there is no common Krio word."
      : "Reply in English.",
  ];
  if (lessonTitle) lines.push(`The learner is currently on the lesson "${lessonTitle}".`);
  return `<reply_preferences>\n${lines.join("\n")}\n</reply_preferences>`;
}

export interface TutorTurn {
  role: "USER" | "ASSISTANT";
  content: string;
}

/** Recent history as alternating user/assistant turns that start with a
 * user turn (a reply that failed to save can leave two in a row). */
export function toConversation(history: TutorTurn[]): Anthropic.Beta.BetaMessageParam[] {
  const turns: Anthropic.Beta.BetaMessageParam[] = [];
  for (const message of history.slice(-HISTORY_MESSAGES)) {
    const role = message.role === "USER" ? "user" : "assistant";
    const last = turns.at(-1);
    if (last?.role === role) last.content = `${last.content as string}\n\n${message.content}`;
    else if (turns.length || role === "user") turns.push({ role, content: message.content });
  }
  return turns;
}

export class TutorRefusal extends Error {}

/** Streams the tutor's reply as text chunks. */
export async function* streamTutorReply(opts: {
  courseId: string;
  history: TutorTurn[];
  level: TutorLevel;
  language: TutorLanguage;
  lessonTitle: string | null;
}): AsyncGenerator<string> {
  const context = await courseContext(opts.courseId);
  if (!context) throw new Error("Course not found.");

  const messages = toConversation(opts.history);
  const latest = messages.at(-1);
  if (!latest || latest.role !== "user") throw new Error("Nothing to answer.");
  latest.content = `${latest.content as string}\n\n${preferences(opts.level, opts.language, opts.lessonTitle)}`;

  const stream = anthropic().beta.messages.stream({
    model: process.env.TUTOR_MODEL || DEFAULT_MODEL,
    max_tokens: 4096,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low" },
    system: [
      { type: "text", text: systemPrompt(context.title) },
      // The course material is the same on every turn, so it is cached.
      { type: "text", text: context.text, cache_control: { type: "ephemeral" } },
    ],
    messages,
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield event.delta.text;
    }
  }
  const final = await stream.finalMessage();
  if (final.stop_reason === "refusal") throw new TutorRefusal("The study buddy can't help with that one.");
}
