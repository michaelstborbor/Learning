"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const ROLES = [
  "SUPER_ADMIN",
  "PLATFORM_ADMIN",
  "INSTRUCTOR",
  "CONTENT_REVIEWER",
  "ORGANIZATION",
  "MENTOR",
  "LEARNER",
  "PARTNER_CENTRE",
] as const;

function formatRole(role: string): string {
  return role
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export function UserRow({
  userId,
  fullName,
  email,
  role,
  isActive,
  canEdit,
}: {
  userId: string;
  fullName: string;
  email: string;
  role: (typeof ROLES)[number];
  isActive: boolean;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState(role);
  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function patchUser(body: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
    } finally {
      setSaving(false);
      setConfirmingDeactivate(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-ink-100 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-medium text-ink-900">{fullName}</p>
          <p className="text-xs text-ink-500">{email}</p>
        </div>
        {!isActive && (
          <span className="rounded-full bg-danger-100 px-2.5 py-1 text-xs font-medium text-danger-700">
            Deactivated
          </span>
        )}
      </div>

      {error && <Alert tone="danger" title={error} />}

      {canEdit ? (
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-md border border-ink-300 px-2 py-1.5 text-sm outline-none focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-100"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as typeof role)}
            disabled={saving}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {formatRole(r)}
              </option>
            ))}
          </select>
          <Button
            variant="ghost"
            disabled={saving || selectedRole === role}
            onClick={() => patchUser({ role: selectedRole })}
          >
            {saving ? "Saving…" : "Save role"}
          </Button>

          {isActive ? (
            confirmingDeactivate ? (
              <>
                <Button variant="danger" disabled={saving} onClick={() => patchUser({ isActive: false })}>
                  Confirm deactivate
                </Button>
                <Button variant="ghost" onClick={() => setConfirmingDeactivate(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button variant="danger" onClick={() => setConfirmingDeactivate(true)}>
                Deactivate
              </Button>
            )
          ) : (
            <Button variant="ghost" disabled={saving} onClick={() => patchUser({ isActive: true })}>
              Reactivate
            </Button>
          )}
        </div>
      ) : (
        <p className="text-xs text-ink-500">
          {formatRole(role)} · You can&apos;t modify your own account here.
        </p>
      )}
    </div>
  );
}
