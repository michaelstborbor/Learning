"use client";

import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Icon } from "@/components/ui/Icon";
import { ChatText } from "./ChatText";
import {
  MAX_TUTOR_MESSAGE_CHARS,
  TUTOR_LANGUAGES,
  TUTOR_LEVELS,
  type TutorLanguage,
  type TutorLevel,
} from "@/lib/tutor-options";

interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  createdAt: string;
  // Client-only states.
  pending?: boolean;
  failed?: boolean;
}

const ERROR_MARKER = "\u0000ERROR:";

const STARTERS = [
  "Explain the main idea of this course simply",
  "What should I learn first?",
  "Give me a real-life example from Sierra Leone",
  "Quiz me with 3 quick questions",
];

const FOLLOW_UPS: { label: string; message: string; level?: TutorLevel; language?: TutorLanguage }[] = [
  { label: "Explain it simpler", message: "Can you explain that more simply?", level: "beginner" },
  { label: "Give me an example", message: "Give me a real-life example of that." },
  { label: "Go deeper", message: "Go deeper: explain that at an expert level.", level: "expert" },
  { label: "Say am na Krio", message: "Explain that again in Krio, please.", language: "kri" },
  { label: "Quiz me", message: "Ask me one question to check I understood that." },
];

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { weekday: "long", day: "numeric", month: "short" });
}

function savedPreference<T extends string>(key: string, allowed: readonly { id: T }[], fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return allowed.some((option) => option.id === value) ? (value as T) : fallback;
  } catch {
    return fallback;
  }
}

function remember(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private browsing: the choice just isn't remembered.
  }
}

export function TutorChat({
  courseId,
  courseTitle,
  lessonId,
  lessonTitle,
  backHref,
}: {
  courseId: string;
  courseTitle: string;
  lessonId: string | null;
  lessonTitle: string | null;
  backHref: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [level, setLevel] = useState<TutorLevel>("standard");
  const [language, setLanguage] = useState<TutorLanguage>("en");
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const stickToBottom = useRef(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/courses/${courseId}/tutor`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        // Restored here rather than on first render, which happens on the server.
        setLevel(savedPreference("tutor-level", TUTOR_LEVELS, "standard"));
        setLanguage(savedPreference("tutor-language", TUTOR_LANGUAGES, "en"));
        if (!ok) {
          setNotice(data.error ?? "The chat couldn't load.");
          return;
        }
        setEnabled(data.enabled);
        setMessages(data.messages);
      })
      .catch(() => !cancelled && setNotice("The chat couldn't load. Check your connection."))
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  // Follow the conversation down while the learner is at the bottom, but
  // don't yank them away if they scrolled up to reread something.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  function onScroll() {
    const el = scroller.current;
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  function autoSize() {
    const el = input.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }

  const send = useCallback(
    async (text: string, overrides: { level?: TutorLevel; language?: TutorLanguage } = {}) => {
      const message = text.trim();
      if (!message || streaming) return;
      const useLevel = overrides.level ?? level;
      const useLanguage = overrides.language ?? language;
      const now = new Date().toISOString();
      const userId = `local-${Date.now()}`;
      const replyId = `${userId}-reply`;
      stickToBottom.current = true;
      setNotice(null);
      setDraft("");
      requestAnimationFrame(autoSize);
      setMessages((current) => [...current, { id: userId, role: "USER", content: message, createdAt: now, pending: true }]);
      setStreaming(true);
      setTyping(true);
      if ("vibrate" in navigator) navigator.vibrate?.(8);

      try {
        const res = await fetch(`/api/courses/${courseId}/tutor`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, level: useLevel, language: useLanguage, lessonId }),
        });
        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Your message didn't send. Try again.");
        }
        setMessages((current) => current.map((m) => (m.id === userId ? { ...m, pending: false } : m)));

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let reply = "";
        let started = false;
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          reply += decoder.decode(value, { stream: true });
          const errorAt = reply.indexOf(ERROR_MARKER);
          if (errorAt !== -1) {
            // A reply that failed part-way is discarded, not shown half-done.
            const errorText = reply.slice(errorAt + ERROR_MARKER.length).trim();
            setMessages((current) => current.filter((m) => m.id !== replyId));
            throw new Error(errorText);
          }
          if (!started && reply.trim()) {
            started = true;
            setTyping(false);
            setMessages((current) => [
              ...current,
              { id: replyId, role: "ASSISTANT", content: reply, createdAt: new Date().toISOString() },
            ]);
          } else if (started) {
            const content = reply;
            setMessages((current) => current.map((m) => (m.id === replyId ? { ...m, content } : m)));
          }
        }
        if (!started) throw new Error("Your study buddy didn't answer. Try asking again.");
      } catch (error) {
        setMessages((current) => current.map((m) => (m.id === userId ? { ...m, pending: false, failed: true } : m)));
        setNotice(error instanceof Error ? error.message : "Something went wrong. Try again.");
      } finally {
        setTyping(false);
        setStreaming(false);
      }
    },
    [courseId, language, lessonId, level, streaming],
  );

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    send(draft);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends on a keyboard; Shift+Enter (and phone keyboards' return)
    // adds a new line.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) {
      event.preventDefault();
      send(draft);
    }
  }

  async function clearChat() {
    setMenuOpen(false);
    const res = await fetch(`/api/courses/${courseId}/tutor`, { method: "DELETE" });
    if (res.ok) setMessages([]);
  }

  function chooseLevel(next: TutorLevel) {
    setLevel(next);
    remember("tutor-level", next);
  }

  function chooseLanguage(next: TutorLanguage) {
    setLanguage(next);
    remember("tutor-language", next);
  }

  const lastMessage = messages.at(-1);
  const showFollowUps = enabled && !streaming && lastMessage?.role === "ASSISTANT";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white sm:rounded-2xl sm:border sm:border-ink-200 sm:shadow-overlay">
      {/* Header */}
      <header className="flex items-center gap-3 bg-brand-800 px-2 py-2 text-white sm:px-3">
        <Link
          href={backHref}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-white/10"
        >
          <Icon name="chevronLeft" label="Back to the course" />
        </Link>
        <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-300 to-brand-500 text-brand-900">
          <Icon name="bot" />
          <span
            aria-hidden="true"
            className={clsx(
              "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-brand-800",
              enabled ? "bg-[#25d366]" : "bg-ink-400",
            )}
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">Study buddy</p>
          <p className="truncate text-xs text-white/75" aria-live="polite">
            {typing ? "typing…" : !enabled ? "offline" : lessonTitle ? `Helping with: ${lessonTitle}` : courseTitle}
          </p>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            className="grid h-10 w-10 cursor-pointer place-items-center rounded-full hover:bg-white/10"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
              <circle cx="12" cy="5" r="1.8" />
              <circle cx="12" cy="12" r="1.8" />
              <circle cx="12" cy="19" r="1.8" />
            </svg>
            <span className="sr-only">Chat options</span>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-11 z-20 w-48 overflow-hidden rounded-xl bg-white py-1 text-sm text-ink-800 shadow-overlay">
              <button
                type="button"
                onClick={clearChat}
                disabled={streaming || messages.length === 0}
                className="flex min-h-11 w-full cursor-pointer items-center gap-2 px-4 text-left hover:bg-ink-50 disabled:opacity-50"
              >
                <Icon name="trash" size={16} /> Clear chat
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Conversation */}
      <div
        ref={scroller}
        onScroll={onScroll}
        className="chat-wall min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6"
        role="log"
        aria-label="Conversation with your study buddy"
        aria-live="polite"
        aria-busy={streaming}
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-1">
          <p className="mx-auto mb-3 max-w-sm rounded-lg bg-[#fff5c4] px-3 py-2 text-center text-xs text-ink-700 shadow-sm">
            <Icon name="sparkle" size={12} className="mr-1 inline align-[-1px]" />
            Your study buddy is an AI that knows this course. It can make mistakes, so check important facts with your lessons.
          </p>

          {loaded && messages.length === 0 && (
            <div className="bubble bubble-in bubble-tail bubble-pop mt-2 self-start">
              <p className="text-[0.9375rem] leading-relaxed">
                Hi! 👋 I&apos;m your study buddy for <strong>{courseTitle}</strong>. Ask me anything from the
                course and I&apos;ll explain it at the level you like, from expert detail to total beginner, in
                English or Krio.
              </p>
              <div className="mt-2 flex flex-col gap-1.5 pb-1">
                {STARTERS.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    disabled={!enabled}
                    onClick={() => send(starter)}
                    className="min-h-10 cursor-pointer rounded-lg border border-brand-200 px-3 text-left text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message, index) => {
            const previous = messages[index - 1];
            const newDay = !previous || dayLabel(previous.createdAt) !== dayLabel(message.createdAt);
            const firstOfRun = newDay || previous?.role !== message.role;
            const mine = message.role === "USER";
            const answered = mine && messages.slice(index + 1).some((m) => m.role === "ASSISTANT");
            return (
              <Fragment key={message.id}>
                {newDay && (
                  <p className="my-2 self-center rounded-lg bg-white/90 px-3 py-1 text-xs font-medium text-ink-600 shadow-sm">
                    {dayLabel(message.createdAt)}
                  </p>
                )}
                <div
                  className={clsx(
                    "bubble bubble-pop",
                    mine ? "bubble-out self-end" : "bubble-in self-start",
                    firstOfRun && "bubble-tail mt-2",
                  )}
                >
                  {mine ? (
                    <p className="whitespace-pre-wrap text-[0.9375rem] leading-relaxed">{message.content}</p>
                  ) : (
                    <ChatText text={message.content} />
                  )}
                  <span className="float-right ml-3 mt-1 inline-flex translate-y-1 items-center gap-1 text-[0.6875rem] leading-none text-ink-500">
                    {timeLabel(message.createdAt)}
                    {mine &&
                      (message.failed ? (
                        <span className="text-danger-500">Not sent</span>
                      ) : message.pending ? (
                        <Icon name="clock" size={12} label="Sending" />
                      ) : (
                        <svg
                          viewBox="0 0 18 12"
                          width="16"
                          height="11"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={answered ? "text-[#53bdeb]" : "text-ink-400"}
                          role="img"
                          aria-label={answered ? "Read" : "Delivered"}
                        >
                          <path d="m1 6.5 3.5 3.5L11 2M7 9.5l.5.5L14 2" />
                        </svg>
                      ))}
                  </span>
                </div>
              </Fragment>
            );
          })}

          {typing && (
            <div className="bubble bubble-in bubble-tail bubble-pop mt-2 self-start px-4 py-3" aria-label="Study buddy is typing">
              <span className="flex items-center gap-1">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-ink-200 bg-[#f0f2f5] px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 sm:px-4">
        {notice && (
          <p role="alert" className="mx-auto mb-2 max-w-3xl rounded-lg bg-danger-100 px-3 py-2 text-sm text-danger-700">
            {notice}
          </p>
        )}
        {!enabled && loaded && (
          <p className="mx-auto mb-2 max-w-3xl rounded-lg bg-white px-3 py-2 text-sm text-ink-700">
            The study buddy isn&apos;t switched on for this site yet. An administrator needs to add an AI key.
          </p>
        )}

        {showFollowUps && (
          <div className="mx-auto mb-2 flex max-w-3xl gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {FOLLOW_UPS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => send(item.message, { level: item.level, language: item.language })}
                className="min-h-9 shrink-0 cursor-pointer rounded-full border border-brand-200 bg-white px-3 text-sm font-medium text-brand-700 shadow-sm hover:bg-brand-50"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        <div className="mx-auto mb-2 flex max-w-3xl flex-wrap items-center gap-x-3 gap-y-2">
          <div role="radiogroup" aria-label="How should it explain?" className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
            {TUTOR_LEVELS.map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={level === option.id}
                title={option.hint}
                onClick={() => chooseLevel(option.id)}
                className={clsx(
                  "min-h-8 shrink-0 cursor-pointer rounded-full px-3 text-xs font-semibold transition-colors",
                  level === option.id ? "bg-brand-600 text-white" : "bg-white text-ink-600 hover:text-ink-900",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div role="radiogroup" aria-label="Reply language" className="ml-auto flex rounded-full bg-white p-0.5">
            {TUTOR_LANGUAGES.map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={language === option.id}
                onClick={() => chooseLanguage(option.id)}
                className={clsx(
                  "min-h-7 cursor-pointer rounded-full px-3 text-xs font-semibold transition-colors",
                  language === option.id ? "bg-highlight-500 text-white" : "text-ink-600 hover:text-ink-900",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={onSubmit} className="mx-auto flex max-w-3xl items-end gap-2">
          <label htmlFor="tutor-message" className="sr-only">
            Message your study buddy
          </label>
          <textarea
            ref={input}
            id="tutor-message"
            rows={1}
            value={draft}
            maxLength={MAX_TUTOR_MESSAGE_CHARS}
            disabled={!enabled}
            onChange={(e) => {
              setDraft(e.target.value);
              autoSize();
            }}
            onKeyDown={onKeyDown}
            placeholder={language === "kri" ? "Aks yu kwɛstyɔn…" : "Ask a question…"}
            className="max-h-36 min-h-11 flex-1 resize-none rounded-3xl border-0 bg-white px-4 py-2.5 text-base leading-6 text-ink-900 shadow-sm outline-none placeholder:text-ink-400 focus-visible:ring-2 focus-visible:ring-brand-300 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!draft.trim() || streaming || !enabled}
            className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full bg-brand-600 text-white shadow-raised transition-[scale,background-color] hover:bg-brand-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-ink-300"
          >
            <Icon name="send" size={20} label="Send" />
          </button>
        </form>
      </div>
    </div>
  );
}
