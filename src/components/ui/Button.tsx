import { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

// Design rule: "primary" (action/ochre) is reserved for the single most
// important action on a screen (enrol, submit, save). "secondary" is for
// everything else that still matters. "ghost" is for low-emphasis actions.
// Never use more than one "primary" button in the same view.
const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-action-500 text-white hover:bg-action-600 focus-visible:outline-action-600",
  secondary:
    "bg-white text-brand-600 border border-brand-400 hover:bg-brand-50 focus-visible:outline-brand-400",
  ghost:
    "bg-transparent text-ink-700 hover:bg-ink-100 focus-visible:outline-ink-300",
  danger:
    "bg-danger-500 text-white hover:bg-danger-700 focus-visible:outline-danger-500",
};

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
