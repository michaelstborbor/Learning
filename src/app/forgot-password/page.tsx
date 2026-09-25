import { Nav } from "@/components/ui/Nav";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-2 px-4 py-16">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Reset your password</h1>
          <p className="mt-1 text-sm text-ink-500">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>
        <ForgotPasswordForm />
      </main>
    </>
  );
}
