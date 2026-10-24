"use client";

import { useState } from "react";
import {
  GRADING_SLOTS,
  TIERS,
  imageId,
  isMythic,
  romanOf,
  tierName,
  type ImageId,
  type RankPos,
  type RankState,
} from "@/games/ml/rank";
import {
  defaultMLSettings,
  parseMLSettings,
  type MLSettings,
  type RankSettings,
} from "@/games/ml/settings";
import { ML_GAME_ID, type MLState } from "@/games/ml/state";
import { useGameSettings, useGameState } from "@/lib/use-game-state";

const WIDTH = 480;
const HEIGHT = 168;
const IMAGE = 124;
const SLOT = 30;
const SLOT_GAP = 6;
const u = (n: number) => `calc(var(--u) * ${n})`;
const CUT = u(20);
const CUT_SHAPE = `polygon(0 0, calc(100% - ${CUT}) 0, 100% ${CUT}, 100% 100%, ${CUT} 100%, 0 calc(100% - ${CUT}))`;

const BADGE_COLORS: Record<ImageId, string> = {
  warrior: "#b08a5a",
  elite: "#9fb3c8",
  master: "#e0b84a",
  grandmaster: "#d9604c",
  epic: "#b36bff",
  legend: "#4fa8ff",
  mythic: "#ff5f6d",
  honor: "#ff8a3d",
  glory: "#ffd23f",
  immortal: "#8fe3ff",
  grading: "#8f9bc7",
};

function Badge({ id, size }: { id: ImageId; size: number }) {
  const color = BADGE_COLORS[id];
  return (
    <svg viewBox="0 0 100 112" aria-hidden style={{ width: u(size), height: u(size * 1.12) }}>
      <path d="M50 4 94 20v38c0 24-18 40-44 50C24 98 6 82 6 58V20z" fill="rgba(255,255,255,0.06)" stroke={color} strokeWidth="6" strokeLinejoin="round" />
      <path d="M50 22 76 32v24c0 14-10 24-26 31C34 80 24 70 24 56V32z" fill={color} opacity="0.85" />
    </svg>
  );
}

function RankImage({ id, size }: { id: ImageId; size: number }) {
  const [failed, setFailed] = useState<ImageId | null>(null);
  if (failed === id) return <Badge id={id} size={size} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/ranks/${id}.png`}
      alt=""
      onError={() => setFailed(id)}
      style={{ width: u(size), height: u(size), objectFit: "contain", filter: `drop-shadow(0 ${u(4)} ${u(8)} rgba(0, 0, 0, 0.45))` }}
    />
  );
}

function Star({ on, size }: { on: boolean; size: number }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden style={{ width: u(size), height: u(size) }}>
      <path
        d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8-6.1-3.3-6.1 3.3 1.4-6.8-5.1-4.7 6.9-.8z"
        fill={on ? "#f2c14e" : "rgba(255, 255, 255, 0.08)"}
        stroke={on ? "#ffe39a" : "rgba(255, 255, 255, 0.22)"}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Stars({ pos, show }: { pos: RankPos; show: { stars: boolean; count: boolean } }) {
  if (isMythic(pos)) {
    if (!show.stars && !show.count) return null;
    return (
      <div className="flex items-center" style={{ gap: u(8) }}>
        {show.stars && <Star on size={34} />}
        {show.count && (
          <b className="font-hud-num font-semibold text-hud-gold-soft" style={{ fontSize: u(46), lineHeight: 1 }}>
            {pos.stars}
          </b>
        )}
      </div>
    );
  }
  const max = TIERS[pos.tier].stars;
  return (
    <div className="flex items-center" style={{ gap: u(10) }}>
      {show.stars && (
        <div className="flex" style={{ gap: u(4) }}>
          {Array.from({ length: max }, (_, index) => (
            <Star key={index} on={index < pos.stars} size={28} />
          ))}
        </div>
      )}
      {show.count && (
        <b className="font-hud-num font-semibold text-hud-muted" style={{ fontSize: u(30), lineHeight: 1 }}>
          {pos.stars}/{max}
        </b>
      )}
    </div>
  );
}

function GradingSlots({ marks }: { marks: RankState["grading"] }) {
  const list = marks ?? [];
  return (
    <div className="flex shrink-0 flex-wrap" style={{ gap: u(SLOT_GAP), width: u(5 * SLOT + 4 * SLOT_GAP) }} aria-label="Slot grading">
      {Array.from({ length: GRADING_SLOTS }, (_, index) => {
        const mark = list[index];
        const win = mark === "W";
        const color = win ? "#3ddc97" : "#ff5c6c";
        return (
          <span
            key={index}
            className="inline-flex items-center justify-center font-hud-num font-semibold"
            style={{
              width: u(SLOT),
              height: u(SLOT),
              fontSize: u(20),
              borderRadius: u(6),
              color: mark ? color : "transparent",
              border: `${u(1.5)} solid ${mark ? color : "rgba(255, 255, 255, 0.16)"}`,
              background: mark ? (win ? "rgba(61, 220, 151, 0.14)" : "rgba(255, 92, 108, 0.14)") : "transparent",
            }}
          >
            {mark ?? "-"}
          </span>
        );
      })}
    </div>
  );
}

const LONG_NAME = 12;

function Title({ children, sub }: { children: string; sub?: string }) {
  const size = children.length > LONG_NAME ? 38 : 46;
  return (
    <div className="flex flex-wrap items-baseline" style={{ columnGap: u(12) }}>
      <span className="font-hud-num font-semibold uppercase text-hud-gold-soft" style={{ fontSize: u(size), lineHeight: 1, letterSpacing: "0.02em" }}>
        {children}
      </span>
      {sub && (
        <span className="font-hud-num font-semibold text-hud-ice" style={{ fontSize: u(size), lineHeight: 1 }}>
          {sub}
        </span>
      )}
    </div>
  );
}

export function Rank({ rank, settings }: { rank: RankState; settings: RankSettings }) {
  const grading = rank.grading !== null;
  const id: ImageId = grading ? "grading" : imageId(rank.pos);
  const mythic = isMythic(rank.pos);
  const name = tierName(rank.pos);
  const showHead = settings.name;
  const nothing = !settings.image && !settings.name && !settings.stars && !settings.count && !grading;

  return (
    <div
      className="flex items-start font-hud-ui"
      style={{ ["--u" as string]: `min(100cqw / ${WIDTH}, 100cqh / ${HEIGHT})`, width: "100cqw", height: "100cqh" }}
    >
      {!nothing && (
        <div style={{ width: u(WIDTH), filter: `drop-shadow(0 ${u(8)} ${u(18)} rgba(0, 0, 0, 0.4))` }}>
          <div style={{ padding: u(2), clipPath: CUT_SHAPE, background: "linear-gradient(140deg, #ffe39a 0%, #c99a2c 38%, #4f63ff 100%)" }}>
            <div
              className="flex items-center"
              style={{
                height: u(HEIGHT - 4),
                gap: u(20),
                padding: `${u(14)} ${u(24)}`,
                clipPath: CUT_SHAPE,
                background: "linear-gradient(165deg, #1c2552 0%, #0c1130 72%)",
              }}
            >
              {settings.image && (
                <div className="flex shrink-0 items-center justify-center" style={{ width: u(IMAGE), height: u(IMAGE) }}>
                  <RankImage id={id} size={IMAGE - 8} />
                </div>
              )}
              <div className="flex min-w-0 flex-1 flex-col justify-center" style={{ gap: u(10) }}>
                {grading ? (
                  <>
                    {showHead && <Title>Grading</Title>}
                    <div className="flex items-center" style={{ gap: u(12) }}>
                      <GradingSlots marks={rank.grading} />
                      <b className="font-hud-num font-semibold text-hud-ice" style={{ fontSize: u(46), lineHeight: 1, whiteSpace: "nowrap" }}>
                        {rank.grading?.length ?? 0}/{GRADING_SLOTS}
                      </b>
                    </div>
                  </>
                ) : (
                  <>
                    {showHead && <Title sub={mythic ? undefined : romanOf(rank.pos)}>{name}</Title>}
                    <Stars pos={rank.pos} show={{ stars: settings.stars, count: settings.count }} />
                  </>
                )}
                {rank.pending && (
                  <span className="font-bold uppercase text-hud-gold" style={{ fontSize: u(18), letterSpacing: "0.04em" }}>
                    Menuju Mythic...
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function MLRank() {
  const state = useGameState<MLState>(ML_GAME_ID);
  const stored = useGameSettings<MLSettings>(ML_GAME_ID);
  if (!state) return null;
  const settings = parseMLSettings(stored) ?? defaultMLSettings();
  return <Rank rank={state.rank} settings={settings.rank} />;
}

