"use client";

import { useEffect } from "react";

/*
  Mouse effects for EliteSkills Academy. No extra packages, about 3 KB.

  What it does (styles live in globals.css):
    1. Cards get a soft teal spotlight that follows the cursor + a small lift.
    2. Main action buttons are gently pulled toward the cursor.
    3. A faint ambient glow trails the cursor around the page.
    4. Clicking a link or button shows a small orange ring.

  It only runs for a real mouse and never when the visitor has "reduce
  motion" turned on, so phones and tablets are not affected at all.
  It finds cards and buttons by their Tailwind classes, so no component
  files need to change.
*/

// "Card-like" = rounded + bordered, but not pills/badges, form fields or buttons.
const CARD_SELECTOR =
  '[class*="rounded"][class*="border"]:not([class*="rounded-full"]):not(input):not(select):not(textarea):not(button):not(a[class*="bg-action"])';
// Main call-to-action buttons use the action (orange) background.
const MAGNET_SELECTOR = 'a[class*="bg-action"], button[class*="bg-action"]';
const CLICKABLE_SELECTOR = "a, button, [role='button'], summary";

function isCardSized(el: HTMLElement): boolean {
  // Skips tiny chips and page-wide wrappers so only real cards react.
  const r = el.getBoundingClientRect();
  return r.width >= 140 && r.width <= 960 && r.height >= 64 && r.height <= 640;
}

function findCard(start: Element): HTMLElement | null {
  let card = start.closest<HTMLElement>(CARD_SELECTOR);
  while (card && (card.closest("header") || !isCardSized(card))) {
    card = card.parentElement?.closest<HTMLElement>(CARD_SELECTOR) ?? null;
  }
  return card;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function enable(): () => void {
  const glow = document.createElement("div");
  glow.className = "fx-glow";
  glow.setAttribute("aria-hidden", "true");
  document.body.appendChild(glow);

  let px = 0;
  let py = 0;
  let gx = 0;
  let gy = 0;
  let glowShown = false;
  let moved = false;
  let raf = 0;

  let lastTarget: Element | null = null;
  let card: HTMLElement | null = null;
  let magnet: HTMLElement | null = null;
  let magnetDx = 0;
  let magnetDy = 0;
  const ripples = new Set<HTMLElement>();

  const releaseMagnet = () => {
    if (magnet) {
      magnet.style.removeProperty("translate");
      magnet = null;
      magnetDx = 0;
      magnetDy = 0;
    }
  };

  const updateHover = (target: Element | null) => {
    if (target !== lastTarget) {
      lastTarget = target;
      card = target ? findCard(target) : null;
      const nextMagnet = target
        ? target.closest<HTMLElement>(MAGNET_SELECTOR)
        : null;
      if (nextMagnet !== magnet) {
        releaseMagnet();
        magnet = nextMagnet;
        if (magnet) magnet.dataset.fx = "magnet";
      }
      if (card) card.dataset.fx = "card";
    }

    if (card) {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${px - r.left}px`);
      card.style.setProperty("--my", `${py - r.top}px`);
    }

    if (magnet) {
      const r = magnet.getBoundingClientRect();
      // The rectangle already includes the current shift, so take it back out
      // to find the button's true centre (avoids jitter).
      const cx = r.left + r.width / 2 - magnetDx;
      const cy = r.top + r.height / 2 - magnetDy;
      magnetDx = clamp((px - cx) * 0.18, -5, 5);
      magnetDy = clamp((py - cy) * 0.25, -4, 4);
      magnet.style.setProperty("translate", `${magnetDx}px ${magnetDy}px`);
    }
  };

  let latestTarget: Element | null = null;

  const frame = () => {
    raf = 0;
    if (moved) {
      moved = false;
      updateHover(latestTarget);
    }
    // Ease the ambient glow toward the pointer for a soft trailing feel.
    gx += (px - gx) * 0.14;
    gy += (py - gy) * 0.14;
    glow.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;
    if (moved || Math.abs(px - gx) > 0.4 || Math.abs(py - gy) > 0.4) {
      raf = requestAnimationFrame(frame);
    }
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    px = e.clientX;
    py = e.clientY;
    latestTarget = e.target instanceof Element ? e.target : null;
    moved = true;
    if (!glowShown) {
      gx = px;
      gy = py;
      glow.dataset.on = "true";
      glowShown = true;
    }
    if (!raf) raf = requestAnimationFrame(frame);
  };

  const onLeaveWindow = () => {
    glow.dataset.on = "false";
    glowShown = false;
    lastTarget = null;
    card = null;
    releaseMagnet();
  };

  const onDown = (e: PointerEvent) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const target = e.target instanceof Element ? e.target : null;
    if (!target?.closest(CLICKABLE_SELECTOR)) return;
    const ring = document.createElement("span");
    ring.className = "fx-ripple";
    ring.style.left = `${e.clientX}px`;
    ring.style.top = `${e.clientY}px`;
    const remove = () => {
      ring.remove();
      ripples.delete(ring);
    };
    ring.addEventListener("animationend", remove, { once: true });
    window.setTimeout(remove, 800); // safety net
    ripples.add(ring);
    document.body.appendChild(ring);
  };

  document.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("pointerdown", onDown, { passive: true });
  document.documentElement.addEventListener("mouseleave", onLeaveWindow);

  // Cleanup: leave the page exactly as it was.
  return () => {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerdown", onDown);
    document.documentElement.removeEventListener("mouseleave", onLeaveWindow);
    if (raf) cancelAnimationFrame(raf);
    releaseMagnet();
    glow.remove();
    ripples.forEach((r) => r.remove());
    document.querySelectorAll<HTMLElement>("[data-fx]").forEach((el) => {
      el.removeAttribute("data-fx");
      el.style.removeProperty("--mx");
      el.style.removeProperty("--my");
      el.style.removeProperty("translate");
    });
  };
}

export function MouseEffects() {
  useEffect(() => {
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let teardown: (() => void) | null = null;

    const stop = () => {
      teardown?.();
      teardown = null;
    };

    const start = () => {
      stop();
      if (!finePointer.matches || reduceMotion.matches) return;
      teardown = enable();
    };

    start();
    finePointer.addEventListener("change", start);
    reduceMotion.addEventListener("change", start);

    return () => {
      finePointer.removeEventListener("change", start);
      reduceMotion.removeEventListener("change", start);
      stop();
    };
  }, []);

  return null;
}
