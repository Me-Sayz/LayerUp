"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card, ErrorNote, inputClass } from "@/components/panel/ui";
import { Rank } from "@/games/ml/hud/rank";
import {
  GRADING_SLOTS,
  MYTHIC_STAR_MAX,
  ROMAN,
  TIERS,
  TIER_IDS,
  gradingStars,
  initialRank,
  parsePos,
  posLabel,
  type RankPos,
  type RankState,
  type TierId,
} from "@/games/ml/rank";
import { RANK_KEYS, RANK_LABELS, sameRankSettings, type RankSettings } from "@/games/ml/settings";
import { ML_GAME_ID, type MLState } from "@/games/ml/state";
import { sendEvent } from "@/lib/send-event";
import { sendSettings } from "@/lib/send-settings";

const SAVED_MS = 2000;
const ERROR_MS = 4000;
const PREVIEW_WIDTH = 480;
const PREVIEW_HEIGHT = 168;

const SAMPLE_RANK: RankState = { ...initialRank(), pos: { tier: "epic", division: 3, stars: 3 } };
const SAMPLE_GRADING: RankState = { ...initialRank(), grading: ["W", "W", "L", "W"] };
const SAMPLE_MYTHIC: RankState = { ...initialRank(), pos: { tier: "mythic", division: 0, stars: 37 } };
const SAMPLES = [
  { id: "biasa", label: "Epic", rank: SAMPLE_RANK },
  { id: "mythic", label: "Mythic", rank: SAMPLE_MYTHIC },
  { id: "grading", label: "Grading", rank: SAMPLE_GRADING },
] as const;

const TIER_OPTIONS = TIER_IDS.map((id) => ({ id, name: TIERS[id].name }));

// SECTION: TAMPILAN RANK
export function RankDisplayCard({ saved }: { saved: RankSettings }) {
  const [draft, setDraft] = useState<RankSettings | null>(null);
  const [sample, setSample] = useState<(typeof SAMPLES)[number]["id"]>("biasa");
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    },
    [],
  );

  const current = draft ?? saved;
  const dirty = draft !== null && !sameRankSettings(draft, saved);
  const preview = SAMPLES.find((item) => item.id === sample)?.rank ?? SAMPLE_RANK;

  function change(next: RankSettings): void {
    setDraft(next);
    setJustSaved(false);
    setError(null);
  }

  async function save(): Promise<void> {
    if (!draft || saving) return;
    setSaving(true);
    setError(null);
    const result = await sendSettings(ML_GAME_ID, { rank: draft });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDraft(null);
    setJustSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setJustSaved(false), SAVED_MS);
  }

  const status = saving ? "Menyimpan..." : dirty ? "Belum disimpan" : justSaved ? "Tersimpan. Overlay sudah berubah." : "Sama dengan overlay yang tampil";

  return (
    <Card title="Overlay rank" description="Pilih elemen yang tampil di widget Rank. Berlaku ke overlay setelah kamu klik Simpan.">
      <div className="flex flex-wrap gap-6">
        <div className="min-w-64 flex-1 space-y-2">
          <p className="mb-2 text-xs text-panel-muted">Elemen</p>
          {RANK_KEYS.map((key) => (
            <label key={key} className="flex cursor-pointer items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={current[key]}
                onChange={(event) => change({ ...current, [key]: event.target.checked })}
                className="h-4 w-4 accent-panel-accent"
              />
              {RANK_LABELS[key]}
            </label>
          ))}
          <p className="pt-2 text-xs text-panel-muted">
            Gambar diambil dari folder <span className="font-mono text-panel-text">public/ranks/</span> dengan nama{" "}
            <span className="font-mono text-panel-text">warrior, elite, master, grandmaster, epic, legend, mythic, honor, glory, immortal, grading</span>{" "}
            (.webp). Kalau file belum ada, tampil lencana cadangan.
          </p>
        </div>

        <div className="shrink-0">
          <div className="mb-2 flex items-center gap-2">
            <p className="text-xs text-panel-muted">Pratinjau</p>
            {SAMPLES.map((item) => (
              <Button key={item.id} size="sm" tone={sample === item.id ? "accent" : "neutral"} aria-pressed={sample === item.id} onClick={() => setSample(item.id)}>
                {item.label}
              </Button>
            ))}
          </div>
          <div className="max-w-full overflow-x-auto rounded-md border border-panel-line bg-panel">
            <div aria-label="Pratinjau rank" style={{ containerType: "size", width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}>
              <Rank rank={preview} settings={current} />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-panel-line pt-4">
        <Button tone="accent" disabled={!dirty || saving} onClick={() => void save()}>
          Simpan
        </Button>
        {dirty && (
          <Button disabled={saving} onClick={() => setDraft(null)}>
            Batalkan perubahan
          </Button>
        )}
        <span className={`text-xs ${dirty ? "text-panel-accent" : "text-panel-muted"}`} role="status">
          {status}
        </span>
      </div>
    </Card>
  );
}
// END TAMPILAN RANK

interface PosDraft {
  tier: TierId;
  division: number;
  stars: string;
}

function toDraft(pos: RankPos): PosDraft {
  return { tier: pos.tier, division: pos.division, stars: String(pos.stars) };
}

function toPos(draft: PosDraft): RankPos | null {
  const text = draft.stars.trim();
  if (text === "") return null;
  return parsePos({ tier: draft.tier, division: draft.division, stars: Number(text) });
}

function changeTier(draft: PosDraft, tier: TierId): PosDraft {
  if (tier === "mythic") return { tier, division: 0, stars: draft.tier === "mythic" ? draft.stars : "1" };
  const info = TIERS[tier];
  const division = draft.tier === "mythic" ? info.divisions : Math.min(Math.max(draft.division, 1), info.divisions);
  const stars = draft.tier === "mythic" ? "0" : String(Math.min(Number(draft.stars) || 0, info.stars));
  return { tier, division, stars };
}

// SECTION: POSISI RANK
export function RankPositionCard({ state }: { state: MLState }) {
  const { rank } = state;
  const [draft, setDraft] = useState<PosDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (errorTimer.current) clearTimeout(errorTimer.current);
    },
    [],
  );

  const current = draft ?? toDraft(rank.pos);
  const parsed = toPos(current);
  const mythic = current.tier === "mythic";
  const info = mythic ? null : TIERS[current.tier];
  const dirty = draft !== null && (parsed === null || JSON.stringify(parsed) !== JSON.stringify(rank.pos) || rank.grading !== null || rank.pending);

  async function run(type: string, payload?: Record<string, unknown>): Promise<boolean> {
    const result = await sendEvent(ML_GAME_ID, type, payload);
    if (result.ok) {
      setError(null);
      return true;
    }
    setError(result.error);
    if (errorTimer.current) clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setError(null), ERROR_MS);
    return false;
  }

  async function apply(): Promise<void> {
    if (!parsed) return;
    if (await run("rank_set", { ...parsed })) setDraft(null);
  }

  return (
    <Card title="Posisi rank" description="Rank sekarang. Naik dan turun mengikuti hasil Victory dan Defeat, dan bisa dikoreksi di sini kapan saja.">
      <p className="mb-4 rounded-md bg-panel px-3 py-2 font-mono text-sm" aria-live="polite">
        {rank.grading ? `Grading ${rank.grading.length}/${GRADING_SLOTS}` : posLabel(rank.pos)}
        {rank.pending && <span className="ml-2 text-xs text-panel-accent">menunggu pilihan grading di Kontrol Live</span>}
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-panel-muted">
          Tier
          <select
            value={current.tier}
            onChange={(event) => setDraft(changeTier(current, event.target.value as TierId))}
            className={`${inputClass} mt-1 block w-40`}
          >
            {TIER_OPTIONS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        {info && (
          <label className="text-xs text-panel-muted">
            Divisi
            <select
              value={current.division}
              onChange={(event) => setDraft({ ...current, division: Number(event.target.value) })}
              className={`${inputClass} mt-1 block w-24`}
            >
              {Array.from({ length: info.divisions }, (_, index) => info.divisions - index).map((division) => (
                <option key={division} value={division}>
                  {ROMAN[division]}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="text-xs text-panel-muted">
          {mythic ? "Total bintang" : "Bintang"}
          {info ? (
            <select
              value={current.stars}
              onChange={(event) => setDraft({ ...current, stars: event.target.value })}
              className={`${inputClass} mt-1 block w-24`}
            >
              {Array.from({ length: info.stars + 1 }, (_, index) => index).map((count) => (
                <option key={count} value={count}>
                  {count}/{info.stars}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={MYTHIC_STAR_MAX}
              value={current.stars}
              onChange={(event) => setDraft({ ...current, stars: event.target.value })}
              aria-invalid={parsed === null}
              className={`${inputClass} mt-1 block w-28`}
            />
          )}
        </label>

        <Button tone="accent" disabled={!parsed || !dirty} onClick={() => void apply()}>
          Terapkan rank
        </Button>
        {draft && <Button onClick={() => setDraft(null)}>Batalkan</Button>}
      </div>

      <div className="mt-5 space-y-3 border-t border-panel-line pt-4">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={rank.auto}
            onChange={(event) => void run("rank_auto", { value: event.target.checked })}
            className="h-4 w-4 accent-panel-accent"
          />
          Naik dan turun otomatis dari Victory dan Defeat
        </label>

        <div className="flex flex-wrap items-center gap-2">
          {rank.grading ? (
            <Button onClick={() => void run("rank_grade", { mode: "cancel" })}>Batalkan grading</Button>
          ) : (
            <Button onClick={() => void run("rank_grade", { mode: "start" })}>Mulai grading Mythic</Button>
          )}
          <span className="text-xs text-panel-muted">
            Grading {GRADING_SLOTS} match. Bintang awal Mythic: 2 per menang sampai 5 menang ({gradingStars(5)} bintang), lalu 1 per menang berikutnya.
            Hasilnya bisa dikoreksi lewat Terapkan rank.
          </span>
        </div>
      </div>

      <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-panel-muted">
        <li>Legend I bintang penuh lalu menang: Kontrol Live menanyakan mau grading atau langsung Mythic (1 bintang).</li>
        <li>Warrior: kalah tidak mengurangi bintang. Mythic bintang 0 lalu kalah: turun ke Legend I bintang 4.</li>
        <li>Aturan di luar ini (bonus streak, kartu perlindungan bintang) tidak diketahui aplikasi, jadi koreksi manual kalau berbeda.</li>
        <li>Menekan Undo di Kontrol Live ikut mengembalikan rank.</li>
      </ul>

      {error && (
        <div className="mt-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
    </Card>
  );
}
// END POSISI RANK
