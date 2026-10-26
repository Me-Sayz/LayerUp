"use client";

import { useId, useState, type ReactNode } from "react";
import { INVALID_INPUT_CLASS } from "@/components/auth/auth-field";
import { inputClass } from "@/components/panel/ui";
import { passwordStrength } from "@/lib/password";

const BAR_COLOR = ["bg-panel-line", "bg-panel-bad", "bg-panel-bad", "bg-panel-accent", "bg-panel-ok"] as const;

function Eye({ off }: { off: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  );
}

export interface Check {
  label: string;
  ok: boolean;
}

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  autoComplete: "current-password" | "new-password";
  strength?: boolean;
  checks?: Check[];
  error?: string | null;
  aside?: ReactNode;
  id?: string;
}

// SECTION: KOLOM SANDI
export function PasswordField({ label, value, onChange, onBlur, autoComplete, strength = false, checks, error, aside, id }: Props) {
  const auto = useId();
  const inputId = id ?? auto;
  const errorId = `${inputId}-error`;
  const [shown, setShown] = useState(false);
  const rating = passwordStrength(value);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label htmlFor={inputId} className="text-xs text-panel-muted">
          {label}
        </label>
        {aside}
      </div>
      <div className="relative">
        <input
          id={inputId}
          type={shown ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          className={`${error ? INVALID_INPUT_CLASS : inputClass} h-10 w-full pr-11`}
        />
        <button
          type="button"
          onClick={() => setShown((open) => !open)}
          aria-label={shown ? "Sembunyikan sandi" : "Tampilkan sandi"}
          aria-pressed={shown}
          className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded text-panel-muted transition-colors hover:text-panel-text focus-visible:outline-2 focus-visible:outline-panel-accent"
        >
          <Eye off={shown} />
        </button>
      </div>
      {error && (
        <p id={errorId} className="mt-1 text-xs text-panel-bad">
          {error}
        </p>
      )}
      {strength && value !== "" && (
        <div className="mt-2" aria-live="polite">
          <div className="flex gap-1" aria-hidden>
            {[1, 2, 3, 4].map((step) => (
              <span key={step} className={`h-1 flex-1 rounded-full ${rating.score >= step ? BAR_COLOR[rating.score] : "bg-panel-line"}`} />
            ))}
          </div>
          <p className="mt-1 text-xs text-panel-muted">Kekuatan sandi: {rating.label}</p>
        </div>
      )}
      {checks && value !== "" && (
        <ul className="mt-1.5 space-y-0.5 text-xs">
          {checks.map((check) => (
            <li key={check.label} className={check.ok ? "text-panel-ok" : "text-panel-muted"}>
              <span aria-hidden>{check.ok ? "✓" : "○"}</span> {check.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
// END KOLOM SANDI
