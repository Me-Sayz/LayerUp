import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Masuk - LayerUp" };

export default function LoginPage() {
  return (
    <main className="panel-root flex min-h-screen items-center justify-center bg-panel px-4 py-10 font-sans text-panel-text">
      <LoginForm />
    </main>
  );
}
