"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export interface NavItem {
  href: string;
  label: string;
}

// Client-side only to know the current path, so the active section is
// highlighted (and announced with aria-current) on every page.
export function NavLinks({ items, layout }: { items: NavItem[]; layout: "bar" | "menu" }) {
  const pathname = usePathname();

  return (
    <>
      {items.map((item) => {
        const active =
          pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              layout === "bar"
                ? "nav-link rounded-md py-1 hover:text-brand-600"
                : "rounded-lg px-3 py-2.5 hover:bg-brand-50",
              active && (layout === "bar" ? "font-semibold text-brand-700" : "bg-brand-50 font-semibold text-brand-700"),
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
