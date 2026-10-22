"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Icon, type IconName } from "@/components/ui/Icon";

/** The "My account" button in the top bar, opening a small menu. */
export function AccountMenu({
  fullName,
  email,
  avatarUrl,
  showCertificates,
}: {
  fullName: string;
  email: string;
  avatarUrl: string | null;
  showCertificates: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function logOut() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ everywhere: false }),
    });
    router.push("/");
    router.refresh();
  }

  const items: { href: string; label: string; icon: IconName }[] = [
    { href: "/account/profile", label: "Your profile", icon: "user" },
    { href: "/account", label: "Account settings", icon: "settings" },
    ...(showCertificates ? [{ href: "/certificates", label: "Certificates", icon: "award" as const }] : []),
  ];

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg min-[420px]:gap-2 bg-action-500 py-1.5 pl-1.5 pr-2.5 text-sm font-semibold text-white hover:bg-action-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-600 sm:pr-3"
      >
        <Avatar name={fullName} src={avatarUrl} size={28} className="ring-2 ring-white/70" />
        {/* Just the photo and arrow on small phones, where the bar is tight. */}
        <span className="sr-only min-[420px]:not-sr-only">My account</span>
        <Icon name="chevronDown" size={16} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="My account"
          className="rise-in absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-brand-100 bg-white p-2 shadow-overlay"
        >
          <div className="flex items-center gap-3 border-b border-ink-100 px-2 pb-3 pt-1">
            <Avatar name={fullName} src={avatarUrl} size={40} />
            <div className="min-w-0">
              <p className="break-words text-sm font-semibold text-ink-900">{fullName}</p>
              <p className="truncate text-xs text-ink-500">{email}</p>
            </div>
          </div>
          <div className="flex flex-col gap-0.5 pt-2">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm text-ink-700 hover:bg-brand-50 hover:text-brand-700"
              >
                <Icon name={item.icon} size={18} /> {item.label}
              </Link>
            ))}
            <button
              type="button"
              role="menuitem"
              onClick={logOut}
              disabled={loggingOut}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-left text-sm text-ink-700 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50"
            >
              <Icon name="logout" size={18} /> {loggingOut ? "Logging out…" : "Log out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
