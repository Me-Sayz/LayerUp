import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotForm } from "@/components/auth/forgot-form";

export const metadata: Metadata = { title: "Lupa sandi - LayerUp" };

export default function ForgotPage() {
  return (
    <AuthShell>
      <Suspense>
        <ForgotForm />
      </Suspense>
    </AuthShell>
  );
}
