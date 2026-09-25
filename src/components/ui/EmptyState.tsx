import { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

// Writing rule: an empty screen is an invitation to act, not a dead end.
// "You haven't enrolled in any courses yet." + a way to browse, not a blank page.
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-ink-300 px-6 py-12 text-center">
      <p className="font-medium text-ink-900">{title}</p>
      <p className="max-w-sm text-sm text-ink-500">{description}</p>
      {action}
    </div>
  );
}
