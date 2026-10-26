import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/auth/logo-mark";

export function LegalShell({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="panel-root min-h-screen bg-panel px-4 py-10 font-sans text-panel-text">
      <div className="mx-auto max-w-2xl">
        <Link href="/login" className="mb-8 inline-flex items-center gap-2 text-sm text-panel-muted hover:text-panel-text">
          <LogoMark size={20} />
          <span>Kembali ke LayerUp</span>
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-xs text-panel-muted">Terakhir diperbarui {updated}</p>
        <div className="mt-6 space-y-6 text-sm leading-relaxed text-panel-text/90 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-panel-text [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1">
          {children}
        </div>
      </div>
    </main>
  );
}

const REPO = "https://github.com/Me-Sayz/LayerUp/issues";
const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "";

export function ContactLine() {
  return CONTACT ? (
    <p>
      Pertanyaan atau permintaan bisa dikirim ke{" "}
      <a href={`mailto:${CONTACT}`} className="text-panel-accent underline underline-offset-2">
        {CONTACT}
      </a>
      .
    </p>
  ) : (
    <p>
      Pertanyaan atau permintaan bisa disampaikan lewat{" "}
      <a href={REPO} target="_blank" rel="noreferrer" className="text-panel-accent underline underline-offset-2">
        halaman Issues di GitHub LayerUp
      </a>
      .
    </p>
  );
}
