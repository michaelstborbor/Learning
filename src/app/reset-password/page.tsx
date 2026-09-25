import { Nav } from "@/components/ui/Nav";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <>
      <Nav />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-2 px-4 py-16">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Set a new password</h1>
        </div>
        <ResetPasswordForm token={token} />
      </main>
    </>
  );
}
