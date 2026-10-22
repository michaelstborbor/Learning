"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

// Floating "Support us" button that leads to the donation page. Bottom-left,
// so it never covers the study buddy button (bottom-right). Hidden while
// learning, where the lesson bar and study buddy already use the corners,
// and on the support page itself.
export function SupportFab() {
  const pathname = usePathname();
  if (pathname === "/support" || pathname.startsWith("/learn/")) return null;

  return (
    <Link
      href="/support"
      className="fixed bottom-4 left-4 z-30 inline-flex min-h-12 items-center gap-2 rounded-full bg-action-500 pl-3.5 pr-4 text-sm font-semibold text-white shadow-overlay transition-[background-color,scale] duration-150 hover:bg-action-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-600 active:scale-95 sm:bottom-6 sm:left-6"
    >
      <Icon name="heart" size={20} />
      Support us
    </Link>
  );
}
