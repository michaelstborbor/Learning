import { HTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

// Restraint principle: thin border, one radius, no drop-shadow soup.
export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-lg border border-ink-100 bg-white p-5",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
