"use client";

// A standard accessibility pattern: visually hidden until keyboard-focused,
// then lets a keyboard/screen-reader user jump past repeated navigation
// straight to the page's main content. Implemented by finding the nearest
// <main> landmark at click time rather than requiring an id="main-content"
// on every one of this app's ~40 page files — same result, far less
// surface area to keep consistent.
export function SkipLink() {
  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const main = document.querySelector("main");
    if (main) {
      main.setAttribute("tabindex", "-1");
      (main as HTMLElement).focus();
    }
  }

  return (
    <a
      href="#main"
      onClick={handleClick}
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
    >
      Skip to content
    </a>
  );
}
