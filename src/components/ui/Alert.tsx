import { ReactNode } from "react";
import clsx from "clsx";

type AlertTone = "info" | "success" | "danger";

interface AlertProps {
  tone?: AlertTone;
  title: string;
  children?: ReactNode;
}

const toneClasses: Record<AlertTone, string> = {
  info: "border-brand-400 bg-brand-50 text-brand-800",
  success: "border-verified-500 bg-verified-100 text-verified-700",
  danger: "border-danger-500 bg-danger-100 text-danger-700",
};

// Writing rule (see DEVELOPMENT.md): errors state what happened and how to
// fix it, in the interface's voice — never vague, never apologetic filler.
export function Alert({ tone = "info", title, children }: AlertProps) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={clsx("rounded-md border-l-4 p-4", toneClasses[tone])}
    >
      <p className="text-sm font-medium">{title}</p>
      {children && <div className="mt-1 text-sm opacity-90">{children}</div>}
    </div>
  );
}
