"use client";

import { useId, type ReactNode } from "react";
import { inputClass } from "@/components/panel/ui";

export const INVALID_INPUT_CLASS = inputClass.replace("border-panel-line", "border-panel-bad");

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string | null;
  errorAction?: ReactNode;
  type?: "text" | "email";
  autoComplete?: string;
  id?: string;
  placeholder?: string;
  aside?: ReactNode;
}

// SECTION: KOLOM TEKS
export function AuthField({ label, value, onChange, onBlur, error, errorAction, type = "text", autoComplete, id, placeholder, aside }: Props) {
  const auto = useId();
  const inputId = id ?? auto;
  const errorId = `${inputId}-error`;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label htmlFor={inputId} className="text-xs text-panel-muted">
          {label}
        </label>
        {aside}
      </div>
      <input
        id={inputId}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className={`${error ? INVALID_INPUT_CLASS : inputClass} h-10 w-full`}
      />
      {error && (
        <p id={errorId} className="mt-1 text-xs text-panel-bad">
          {error}
          {errorAction && <span className="ml-1.5">{errorAction}</span>}
        </p>
      )}
    </div>
  );
}
// END KOLOM TEKS
