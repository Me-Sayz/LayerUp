import type { ComponentProps, ReactNode } from "react";

export type Tone = "neutral" | "accent" | "ok" | "bad" | "armed" | "hint";
export type Size = "sm" | "md" | "lg";

const TONES: Record<Tone, string> = {
  neutral: "border-panel-line bg-panel-raised text-panel-text hover:bg-panel-hover",
  accent: "border-panel-accent bg-panel-accent text-panel-accent-ink hover:opacity-90",
  ok: "border-panel-ok/40 bg-panel-ok/15 text-panel-ok hover:bg-panel-ok/25",
  bad: "border-panel-bad/40 bg-panel-bad/15 text-panel-bad hover:bg-panel-bad/25",
  armed: "border-panel-bad bg-panel-bad text-white hover:opacity-90",
  hint: "border-panel-accent/60 bg-panel-accent/10 text-panel-accent hover:bg-panel-accent/20",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-2.5 text-sm",
  md: "h-9 px-3 text-sm",
  lg: "h-11 px-4 text-sm",
};

export const inputClass =
  "h-9 min-w-0 rounded-md border border-panel-line bg-panel px-3 text-sm text-panel-text placeholder:text-panel-muted focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-panel-accent";

interface ButtonProps extends Omit<ComponentProps<"button">, "className"> {
  tone?: Tone;
  size?: Size;
}

export function Button({ tone = "neutral", size = "md", type = "button", children, ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={`rounded-md border font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-panel-accent disabled:cursor-not-allowed disabled:opacity-50 ${SIZES[size]} ${TONES[tone]}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Card({
  title,
  description,
  aside,
  children,
}: {
  title: string;
  description?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-panel-line bg-panel-raised">
      <header className="flex items-start justify-between gap-4 border-b border-panel-line px-4 py-3">
        <div>
          <h3 className="text-sm font-medium">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-panel-muted">{description}</p>}
        </div>
        {aside}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-md border border-panel-line bg-panel px-3 py-2.5">
      <dt className="text-xs text-panel-muted">{label}</dt>
      <dd className="mt-0.5 font-mono text-xl tabular-nums text-panel-text">{value}</dd>
      {hint && <p className="mt-0.5 text-[11px] text-panel-muted">{hint}</p>}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-md bg-panel-bad/15 px-3 py-2 text-xs text-panel-bad">
      {children}
    </p>
  );
}