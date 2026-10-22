"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

// Copies a mobile money number so it can be pasted straight into the
// Orange Money or Afrimoney app. Falls back to a hidden text box on older
// phone browsers without the Clipboard API.
function copyText(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    const box = document.createElement("textarea");
    box.value = text;
    box.setAttribute("readonly", "");
    box.style.position = "fixed";
    box.style.opacity = "0";
    document.body.appendChild(box);
    box.select();
    const ok = document.execCommand("copy");
    box.remove();
    if (ok) resolve();
    else reject(new Error("copy failed"));
  });
}

export function CopyNumberButton({ number, label }: { number: string; label: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function handleCopy() {
    try {
      await copyText(number);
      setState("copied");
    } catch {
      setState("failed");
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 3000);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-brand-400 bg-white px-4 text-sm font-semibold text-brand-600 transition-[background-color,scale] duration-150 hover:bg-brand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 active:scale-[0.98]"
      >
        <Icon name={state === "copied" ? "check" : "copy"} size={18} />
        {state === "copied" ? "Number copied" : `Copy ${label} number`}
      </button>
      <span className="sr-only" aria-live="polite">
        {state === "copied" ? `${label} number copied` : state === "failed" ? "Couldn't copy. Please write the number down." : ""}
      </span>
      {state === "failed" && (
        <span className="text-sm text-danger-700">Couldn&apos;t copy. Please write the number down.</span>
      )}
    </>
  );
}
