"use client";

import { useState } from "react";
import type { ReactNode } from "react";

const STORAGE_PREFIX = "layerup.mini.";

function loadMinimized(key: string): boolean {
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + key) === "1";
  } catch {
    return false;
  }
}

function saveMinimized(key: string, value: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, value ? "1" : "0");
  } catch {
    return;
  }
}

// SECTION: MINI PANEL
export function MiniPanel({
  label,
  summary,
  storageKey,
  collapsedAction,
  children,
}: {
  label: string;
  summary: string;
  storageKey: string;
  collapsedAction?: ReactNode;
  children: ReactNode;
}) {
  const [minimized, setMinimized] = useState(() => loadMinimized(storageKey));

  function toggle(): void {
    const next = !minimized;
    setMinimized(next);
    saveMinimized(storageKey, next);
  }

  return (
    <div className="rounded-md border border-panel-line bg-panel">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <div className="min-w-0">
          <p className="text-[11px] text-panel-muted">{label}</p>
          <p className="truncate font-mono text-sm tabular-nums" aria-live="polite">
            {summary}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {minimized && collapsedAction}
          <button
            type="button"
            onClick={toggle}
            aria-expanded={!minimized}
            aria-label={minimized ? `Tampilkan kontrol ${label.toLowerCase()}` : `Sembunyikan kontrol ${label.toLowerCase()}`}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-panel-muted transition-colors hover:bg-panel-hover hover:text-panel-text focus-visible:outline-2 focus-visible:outline-panel-accent"
          >
            <svg
              viewBox="0 0 24 24"
              className={`h-4 w-4 transition-transform ${minimized ? "" : "rotate-180"}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>
      {!minimized && <div className="border-t border-panel-line px-3 py-2">{children}</div>}
    </div>
  );
}
// END MINI PANEL
