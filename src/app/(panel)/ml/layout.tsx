"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { KontrolPopup } from "@/components/panel/ml/kontrol-popup";

export default function MLLayout({ children }: { children: ReactNode }) {
  const [popupOpen, setPopupOpen] = useState(false);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between border-b border-panel-line pb-4">
        <h2 className="text-sm font-medium text-panel-muted">Mobile Legends</h2>
        <button
          type="button"
          aria-pressed={popupOpen}
          onClick={() => setPopupOpen((open) => !open)}
          className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-panel-accent ${
            popupOpen
              ? "border-panel-accent bg-panel-accent text-panel-accent-ink hover:opacity-90"
              : "border-panel-line bg-panel-raised text-panel-text hover:bg-panel-hover"
          }`}
        >
          {popupOpen ? "Tutup kontrol cepat" : "Kontrol cepat"}
        </button>
      </div>

      {children}

      {popupOpen && <KontrolPopup onClose={() => setPopupOpen(false)} />}
    </div>
  );
}