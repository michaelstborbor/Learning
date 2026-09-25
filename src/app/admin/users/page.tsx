import { redirect } from "next/navigation";
import { Nav } from "@/components/ui/Nav";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { PUBLISH_ROLES } from "@/lib/roles";
import { UserRow } from "@/components/admin/UserRow";

export default async function AdminUsersPage() {
  const session = await requireRole(PUBLISH_ROLES);
  if (!session) redirect("/login");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <h1 className="font-display text-2xl font-bold text-ink-900">Users</h1>
        <p className="mt-1 text-ink-500">
          Grant roles and manage account access. Only a Super Admin can grant
          or change the Super Admin role.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md */}
          {users.map((user: any) => (
            <UserRow
              key={user.id}
              userId={user.id}
              fullName={user.fullName}
              email={user.email}
              role={user.role}
              isActive={user.isActive}
              canEdit={user.id !== session.userId}
            />
          ))}
        </div>
      </main>
    </>
  );
}
