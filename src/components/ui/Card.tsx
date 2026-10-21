import { HTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

// Restraint principle: thin border, one radius, one soft brand-tinted
// elevation step (--shadow-raised). No stacked shadows.
export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-xl border border-ink-100 bg-white p-5 shadow-raised",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
