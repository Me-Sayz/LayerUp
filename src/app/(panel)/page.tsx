import Link from "next/link";
import { GAME_MENUS } from "@/games/menu";

const STEPS = [
  "Buka halaman Overlay milik game yang kamu mainkan, lalu salin link widget yang dibutuhkan.",
  "Di TikTok LIVE Studio, tambahkan sumber berupa link dan tempel link tadi. Satu link untuk satu widget.",
  "Buka Kontrol Live untuk mengatur skor dan memunculkan banner saat live.",
];

export default function HomePage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Beranda</h1>
        <p className="mt-1 text-sm text-panel-muted">
          Panel kontrol dan overlay untuk live di TikTok LIVE Studio.
        </p>
      </header>

      <section aria-labelledby="mulai-cepat">
        <h2 id="mulai-cepat" className="mb-3 text-sm font-medium">
          Mulai cepat
        </h2>
        <ol className="space-y-2">
          {STEPS.map((step, index) => (
            <li
              key={step}
              className="flex gap-3 rounded-lg border border-panel-line bg-panel-raised px-4 py-3 text-sm"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-panel-hover text-xs font-medium text-panel-muted">
                {index + 1}
              </span>
              <span className="text-panel-text">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="game">
        <h2 id="game" className="mb-3 text-sm font-medium">
          Game
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {GAME_MENUS.map((game) => (
            <div key={game.id} className="rounded-lg border border-panel-line bg-panel-raised p-4">
              <h3 className="text-sm font-medium">{game.name}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {game.items.map((item, index) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={
                      index === 0
                        ? "rounded-md bg-panel-accent px-3 py-1.5 text-sm font-medium text-panel-accent-ink transition-opacity hover:opacity-90"
                        : "rounded-md border border-panel-line px-3 py-1.5 text-sm text-panel-muted transition-colors hover:bg-panel-hover hover:text-panel-text"
                    }
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}