"use client";

import { MiniPanel } from "@/components/panel/ml/mini-panel";
import { rememberText, setSavedText, useSavedText } from "@/components/panel/ml/use-saved-text";
import { Button, inputClass } from "@/components/panel/ui";
import { LIMITS } from "@/games/ml/state";

type Run = (type: string, payload?: Record<string, unknown>) => Promise<unknown>;

// SECTION: KONTROL TEKS BEBAS
export function TeksControl({ run, storageKey }: { run: Run; storageKey: string }) {
  const saved = useSavedText();
  const text = saved.text.trim();

  async function show(value: string): Promise<void> {
    const next = value.trim();
    if (!next) return;
    rememberText(next);
    await run("custom", { text: next });
  }

  return (
    <MiniPanel
      label="Teks bebas"
      summary={text || "Belum ada teks"}
      storageKey={`teks.${storageKey}`}
      collapsedAction={
        <button
          type="button"
          disabled={!text}
          onClick={() => void show(saved.text)}
          aria-label="Tampilkan teks sekarang"
          title="Tampilkan teks sekarang"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-panel-accent bg-panel-accent text-panel-accent-ink transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-panel-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
            <path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z" />
          </svg>
        </button>
      }
    >
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void show(saved.text);
        }}
      >
        <input
          value={saved.text}
          onChange={(event) => setSavedText(event.target.value)}
          maxLength={LIMITS.customText}
          placeholder="Contoh: Terima kasih sudah nonton!"
          aria-label="Teks banner"
          autoComplete="off"
          className={`${inputClass} flex-1`}
        />
        <Button type="submit" tone="accent" disabled={!text}>
          Tampil
        </Button>
      </form>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {saved.recent.map((item) => (
          <button
            key={item}
            type="button"
            title="Tampilkan langsung"
            onClick={() => {
              setSavedText(item);
              void show(item);
            }}
            className="max-w-full truncate rounded-md border border-panel-line bg-panel-raised px-2 py-1 text-xs text-panel-text transition-colors hover:bg-panel-hover focus-visible:outline-2 focus-visible:outline-panel-accent"
          >
            {item}
          </button>
        ))}
        {saved.text !== "" && (
          <button
            type="button"
            onClick={() => setSavedText("")}
            className="rounded-md px-2 py-1 text-xs text-panel-muted transition-colors hover:text-panel-text focus-visible:outline-2 focus-visible:outline-panel-accent"
          >
            Kosongkan
          </button>
        )}
      </div>
      <p className="mt-2 text-[11px] text-panel-muted">
        Teks tidak terhapus setelah tampil, jadi bisa dipakai berulang. Klik teks di atas untuk menampilkannya langsung.
      </p>
    </MiniPanel>
  );
}
// END KONTROL TEKS BEBAS
