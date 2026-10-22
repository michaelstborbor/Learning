import { z } from "zod";

// Shared by the routes that add and edit modules and lessons, so a lesson
// edited later follows the same rules as when it was first written.
export const moduleSchema = z.object({
  title: z.string().trim().min(2, "Give the module a title.").max(200, "Keep the title under 200 characters."),
});

export const lessonSchema = z.object({
  title: z.string().trim().min(2, "Give the lesson a title.").max(200, "Keep the title under 200 characters."),
  content: z.string().trim().min(10, "Lesson content is too short.").max(100000, "Lesson content is too long. Split it into two lessons."),
});
