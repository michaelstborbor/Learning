import { Nav } from "@/components/ui/Nav";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-2 px-4 py-16">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Log in</h1>
          <p className="mt-1 text-sm text-ink-500">Welcome back.</p>
        </div>
        <LoginForm />
      </main>
    </>
  );
}
