"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button, Card, ErrorNote, inputClass } from "@/components/panel/ui";
import { ML_GAME_ID } from "@/games/ml/state";
import { sendEvent } from "@/lib/send-event";

const COPIED_MS = 2000;
const ERROR_MS = 4000;
const TEST_TEXT = "Tes overlay";

interface Widget {
  id: string;
  name: string;
  description: string;
  path: string;
  size: string;
  anchor: string;
  previewWidth: number;
  previewHeight: number;
  canTest?: boolean;
}

// WIDGET: tambahkan widget baru di array ini
const WIDGETS: Widget[] = [
  {
    id: "scoreboard",
    name: "Scoreboard",
    description: "Menang, kalah, streak, win rate, dan K/D/A match berjalan.",
    path: "/overlay/ml/hud/scoreboard",
    size: "lebar bebas, tarik tepi bawah sampai pas dengan kartu",
    anchor: "kiri atas",
    previewWidth: 240,
    previewHeight: 180,
  },
  {
    id: "killfeed",
    name: "Kill feed",
    description: "Daftar pengumuman kill yang muncul sebentar lalu hilang.",
    path: "/overlay/ml/hud/killfeed",
    size: "bebas, tarik kotak sampai pas untuk 5 baris",
    anchor: "kanan atas",
    previewWidth: 240,
    previewHeight: 200,
  },
  {
    id: "banner",
    name: "Banner",
    description: "Banner besar di tengah untuk First Blood, Savage, Victory, dan teks bebas.",
    path: "/overlay/ml/hud/banner",
    size: "bebas, tarik kotak sampai pas dengan banner terbesar",
    anchor: "tengah",
    previewWidth: 480,
    previewHeight: 150,
    canTest: true,
  },
];
// END WIDGET

function subscribeNever(): () => void {
  return () => {};
}

function useOrigin(): string {
  return useSyncExternalStore(subscribeNever, () => window.location.origin, () => "");
}

type CopyState = "idle" | "ok" | "fail";

function WidgetCard({ widget, origin }: { widget: Widget; origin: string }) {
  const [preview, setPreview] = useState(false);
  const [copy, setCopy] = useState<CopyState>("idle");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const url = `${origin}${widget.path}`;

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
      if (errorTimer.current) clearTimeout(errorTimer.current);
    },
    [],
  );

  async function copyLink(): Promise<void> {
    let next: CopyState = "ok";
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      inputRef.current?.select();
      next = "fail";
    }
    setCopy(next);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopy("idle"), COPIED_MS);
  }

  async function testBanner(): Promise<void> {
    const result = await sendEvent(ML_GAME_ID, "custom", { text: TEST_TEXT });
    if (result.ok) return;
    setError(result.error);
    if (errorTimer.current) clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setError(null), ERROR_MS);
  }

  return (
    <Card title={widget.name} description={widget.description}>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          readOnly
          value={url}
          aria-label={`Link ${widget.name}`}
          onFocus={(event) => event.currentTarget.select()}
          className={`${inputClass} flex-1 font-mono text-xs`}
        />
        <Button tone="accent" disabled={!origin} onClick={() => void copyLink()}>
          {copy === "ok" ? "Tersalin" : copy === "fail" ? "Tekan Ctrl+C" : "Salin"}
        </Button>
      </div>

      <p className="mt-2 text-xs text-panel-muted">
        Ukuran kotak: <span className="text-panel-text">{widget.size}</span>. Tampilan otomatis mengisi kotak, ditaruh di {widget.anchor}.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" aria-pressed={preview} onClick={() => setPreview((open) => !open)}>
          {preview ? "Sembunyikan pratinjau" : "Tampilkan pratinjau"}
        </Button>
        <a
          href={widget.path}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 items-center rounded-md border border-panel-line bg-panel-raised px-2.5 text-sm font-medium text-panel-text transition-colors hover:bg-panel-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-panel-accent"
        >
          Buka di tab baru
        </a>
        {widget.canTest && (
          <Button size="sm" onClick={() => void testBanner()}>
            Tes banner
          </Button>
        )}
      </div>

      {error && (
        <div className="mt-3">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      {preview && (
        <div className="mt-3 overflow-x-auto rounded-md border border-panel-line bg-panel p-3">
          <iframe
            title={`Pratinjau ${widget.name}`}
            src={widget.path}
            width={widget.previewWidth}
            height={widget.previewHeight}
            className="block border-0"
            style={{ colorScheme: "normal" }}
          />
        </div>
      )}
    </Card>
  );
}

export function OverlayLinks() {
  const origin = useOrigin();

  return (
    <div className="space-y-4">
      <p className="text-sm text-panel-muted">
        Di TikTok LIVE Studio, tambahkan sumber berupa link dan tempel satu link untuk satu widget. Alamatnya memakai komputer ini
        (localhost), jadi hanya jalan kalau LIVE Studio berjalan di komputer yang sama.
      </p>
      {WIDGETS.map((widget) => (
        <WidgetCard key={widget.id} widget={widget} origin={origin} />
      ))}
    </div>
  );
}
