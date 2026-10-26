import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetForm } from "@/components/auth/reset-form";

export const metadata: Metadata = { title: "Sandi baru - LayerUp" };

export default function ResetPage() {
  return (
    <AuthShell>
      <ResetForm />
    </AuthShell>
  );
}
