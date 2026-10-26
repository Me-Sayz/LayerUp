export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className="text-panel-accent" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 3 3 8l9 5 9-5-9-5z" />
      <path d="m3 12 9 5 9-5" opacity="0.65" />
      <path d="m3 16 9 5 9-5" opacity="0.35" />
    </svg>
  );
}
