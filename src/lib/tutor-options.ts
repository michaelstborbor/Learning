// Options for the AI study buddy that both the chat screen and the server
// use (see src/lib/tutor.ts).

export const TUTOR_LEVELS = [
  { id: "expert", label: "Expert", hint: "Full depth and proper terms" },
  { id: "standard", label: "Normal", hint: "Clear, with an example" },
  { id: "simple", label: "Simple", hint: "Everyday words, no jargon" },
  { id: "beginner", label: "Total beginner", hint: "Tiny steps, like I'm new" },
] as const;

export type TutorLevel = (typeof TUTOR_LEVELS)[number]["id"];

export const TUTOR_LANGUAGES = [
  { id: "en", label: "English" },
  { id: "kri", label: "Krio" },
] as const;

export type TutorLanguage = (typeof TUTOR_LANGUAGES)[number]["id"];

export const MAX_TUTOR_MESSAGE_CHARS = 4000;
