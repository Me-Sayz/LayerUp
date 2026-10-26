import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/auth/logo-mark";

// SECTION: KERANGKA AUTH
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="panel-root flex min-h-screen items-center justify-center bg-panel px-4 py-10 font-sans text-panel-text">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <LogoMark />
          <div>
            <p className="text-lg font-semibold leading-none tracking-tight">LayerUp</p>
            <p className="mt-1 text-xs text-panel-muted">Kontrol dan overlay untuk live TikTok</p>
          </div>
        </div>

        <div className="relative isolate pb-4">
          <span aria-hidden className="absolute inset-x-3 bottom-2 top-5 -z-10 rounded-lg border border-panel-line bg-panel-raised/55" />
          <span aria-hidden className="absolute inset-x-6 bottom-0 top-9 -z-20 rounded-lg border border-panel-line/70 bg-panel-raised/25" />
          <section className="rounded-lg border border-panel-line bg-panel-raised p-5 sm:p-6">{children}</section>
        </div>

        <p className="mt-6 text-center text-xs text-panel-muted">
          <Link href="/syarat" className="underline-offset-2 hover:text-panel-text hover:underline">
            Syarat penggunaan
          </Link>
          <span aria-hidden className="mx-2">
            |
          </span>
          <Link href="/privasi" className="underline-offset-2 hover:text-panel-text hover:underline">
            Kebijakan privasi
          </Link>
        </p>
      </div>
    </main>
  );
}

export function AuthHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-panel-muted">{subtitle}</p>}
    </div>
  );
}
// END KERANGKA AUTH
