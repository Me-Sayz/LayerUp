"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import {
  defaultMLSettings,
  parseMLSettings,
  type MLSettings,
  type ScoreboardSettings,
} from "@/games/ml/settings";
import { LABELS, ML_GAME_ID, RECORDED_IDS, type MLState, type RecordedId } from "@/games/ml/state";
import { FIT_H, fitUnit, fitVar, onFontsReady, writeFit } from "@/lib/overlay-fit";
import { useGameSettings, useGameState } from "@/lib/use-game-state";

const DEFAULT_HEIGHT = 340;
const FRAME_Y = 38;
const FRAME = 48;
const MIN_INNER = 180;
const WINRATE_MIN = 150;
const TITLE_ROW = { both: 392, title: 260, hero: 180 } as const;
const RECORDS_MIN = 300;
const TOP_GAP = 10;
const MATCH_GAP = 8;
const TOP_WIDTH = { win: 118, lose: 118, streak: 136 } as const;
const MATCH_WIDTH = { kill: 84, death: 84, assist: 84, ratio: 114 } as const;
const u = (n: number) => `calc(var(--u) * ${n})`;
const CUT = u(22);
const CUT_SHAPE = `polygon(0 0, calc(100% - ${CUT}) 0, 100% ${CUT}, 100% 100%, ${CUT} 100%, 0 calc(100% - ${CUT}))`;

const CHIP_COLORS: Record<RecordedId, string> = {
  firstblood: "#ff4d5e",
  doublekill: "#ffb347",
  triplekill: "#ff8a3d",
  maniac: "#ff5fa2",
  savage: "#b36bff",
  legendary: "#f2c14e",
  mvp: "#8fe3ff",
};

function PopNumber({ value, size, className }: { value: number | string; size: number; className: string }) {
  const ref = useRef<HTMLElement>(null);
  const previous = useRef(value);

  useEffect(() => {
    const el = ref.current;
    if (el && previous.current !== value && typeof el.animate === "function") {
      el.animate(
        [{ transform: "scale(1.4)" }, { transform: "scale(1)" }],
        { duration: 380, easing: "cubic-bezier(.2, 1.4, .4, 1)" },
      );
    }
    previous.current = value;
  }, [value]);

  return (
    <b
      ref={ref}
      className={`inline-block font-hud-num font-semibold ${className}`}
      style={{ fontSize: u(size), lineHeight: 0.95, transformOrigin: "left bottom" }}
    >
      {value}
    </b>
  );
}

function Flame({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ width: u(size), height: u(size) }}>
      <path d="M12 2c1 3.5 4.5 5.5 4.5 10a4.5 4.5 0 0 1-9 0c0-1.8.8-3 1.7-4 .2 1.4.9 2.2 1.8 2.5C10.6 7.6 11 4.7 12 2z" />
    </svg>
  );
}

function span(widths: number[], gap: number): number {
  if (widths.length === 0) return 0;
  return widths.reduce((sum, width) => sum + width, 0) + gap * (widths.length - 1);
}

const MEASURE_PASSES = 3;

function measureHeight(root: HTMLElement | null): void {
  const content = root?.querySelector<HTMLElement>("[data-inner]");
  if (!root || !content) return;
  const inner = Number(content.dataset.inner);
  for (let pass = 0; pass < MEASURE_PASSES; pass++) {
    const rect = content.getBoundingClientRect();
    if (!inner || rect.width <= 0) return;
    if (!writeFit(root, FIT_H, rect.height / (rect.width / inner) + FRAME_Y)) return;
  }
}

export function Scoreboard({ state, settings }: { state: MLState; settings: ScoreboardSettings }) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  const attachRoot = useCallback((element: HTMLDivElement | null) => {
    rootRef.current = element;
    if (!element) return;
    const observer = new ResizeObserver(() => measureHeight(element));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    measureHeight(rootRef.current);
  });

  useEffect(() => onFontsReady(() => measureHeight(rootRef.current)), []);

  const { match, session, records, hero } = state;
  const played = session.wins + session.losses;
  const winRate = played === 0 ? null : Math.round((session.wins / played) * 100);
  const ratio = ((match.k + match.a) / Math.max(1, match.d)).toFixed(1);
  const streakOn = session.streak > 0;
  const streakHot = session.streak >= 3;
  const chips = settings.records ? RECORDED_IDS.filter((id) => records[id] > 0) : [];

  const topKeys = (["win", "lose", "streak"] as const).filter((key) => settings[key]);
  const matchKeys = (["kill", "death", "assist"] as const).filter((key) => settings[key]);
  const matchCount = matchKeys.length + (settings.ratio ? 1 : 0);
  const visible = [
    settings.title || settings.hero,
    topKeys.length > 0,
    matchCount > 0,
    settings.winrate || chips.length > 0,
  ];
  const first = visible.indexOf(true);
  if (first === -1) return null;
  const gapAt = (index: number, size: number) => u(index === first ? 0 : size);

  const headerWidth = settings.title && settings.hero ? TITLE_ROW.both : settings.title ? TITLE_ROW.title : settings.hero ? TITLE_ROW.hero : 0;
  const innerWidth = Math.max(
    MIN_INNER,
    headerWidth,
    settings.records ? RECORDS_MIN : 0,
    span(topKeys.map((key) => TOP_WIDTH[key]), TOP_GAP),
    span(
      [...matchKeys.map((key) => MATCH_WIDTH[key]), ...(settings.ratio ? [MATCH_WIDTH.ratio] : [])],
      MATCH_GAP,
    ),
    settings.winrate ? WINRATE_MIN : 0,
  );

  const width = innerWidth + FRAME;

  return (
    <div
      ref={attachRoot}
      className="flex items-start font-hud-ui"
      style={{
        ["--u" as string]: fitUnit(String(width), fitVar(FIT_H, DEFAULT_HEIGHT)),
        width: "100cqw",
        height: "100cqh",
      }}
    >
      <div
        className="flex"
        style={{ width: "100%", filter: `drop-shadow(0 ${u(8)} ${u(18)} rgba(0, 0, 0, 0.4))` }}
      >
        <div
          className="flex flex-1"
          style={{
            padding: u(2),
            clipPath: CUT_SHAPE,
            background: "linear-gradient(140deg, #ffe39a 0%, #c99a2c 38%, #4f63ff 100%)",
          }}
        >
          <div
            className="flex flex-1 items-center justify-center"
            style={{
              padding: `${u(16)} ${u(22)} ${u(18)}`,
              clipPath: CUT_SHAPE,
              background: "linear-gradient(165deg, #1c2552 0%, #0c1130 72%)",
            }}
          >
            <div data-inner={innerWidth} style={{ width: u(innerWidth) }}>
              {visible[0] && (
                <div className="flex items-baseline justify-between" style={{ gap: u(12) }}>
                  {settings.title && (
                    <span
                      className="font-hud-num font-semibold uppercase text-hud-gold-soft"
                      style={{ fontSize: u(28), letterSpacing: "0.03em" }}
                    >
                      Mobile Legends
                    </span>
                  )}
                  {settings.hero && (
                    <span
                      className="truncate font-bold text-hud-ice"
                      style={{ fontSize: u(21), maxWidth: u(180) }}
                    >
                      {hero}
                    </span>
                  )}
                </div>
              )}

              {visible[1] && (
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: topKeys.map((key) => (key === "streak" ? "1.15fr" : "1fr")).join(" "),
                    gap: u(TOP_GAP),
                    marginTop: gapAt(1, 8),
                  }}
                >
                  {settings.win && (
                    <div>
                      <PopNumber value={session.wins} size={78} className="text-hud-green" />
                      <i className="block font-bold not-italic text-hud-muted" style={{ fontSize: u(19) }}>WIN</i>
                    </div>
                  )}
                  {settings.lose && (
                    <div>
                      <PopNumber value={session.losses} size={78} className="text-hud-red" />
                      <i className="block font-bold not-italic text-hud-muted" style={{ fontSize: u(19) }}>LOSE</i>
                    </div>
                  )}
                  {settings.streak && (
                    <div style={{ opacity: streakOn ? 1 : 0.42, transition: "opacity 0.3s" }}>
                      <PopNumber
                        value={session.streak}
                        size={78}
                        className={streakOn ? "text-hud-gold" : "text-hud-muted"}
                      />
                      <i
                        className="flex items-center font-bold not-italic text-hud-muted"
                        style={{ fontSize: u(19), gap: u(4) }}
                      >
                        {streakOn && (
                          <span className={streakHot ? "text-orange-400" : "text-hud-gold"} style={{ display: "inline-flex" }}>
                            <Flame size={19} />
                          </span>
                        )}
                        STREAK
                      </i>
                    </div>
                  )}
                </div>
              )}

              {visible[2] && (
                <div
                  className="grid items-end"
                  style={{
                    gridTemplateColumns: [...matchKeys.map(() => "1fr"), ...(settings.ratio ? ["1.35fr"] : [])].join(" "),
                    gap: u(MATCH_GAP),
                    marginTop: gapAt(2, 12),
                    paddingTop: first === 2 ? 0 : u(10),
                    borderTop: first === 2 ? "none" : `${u(1)} solid rgba(255, 255, 255, 0.13)`,
                  }}
                >
                  {(
                    [
                      ["K", "kill", match.k, "text-hud-gold-soft"],
                      ["D", "death", match.d, "text-hud-red"],
                      ["A", "assist", match.a, "text-hud-ice"],
                    ] as const
                  )
                    .filter(([, key]) => settings[key])
                    .map(([label, , value, color]) => (
                      <div key={label} className={`flex items-baseline ${color}`} style={{ gap: u(6) }}>
                        <i className="font-bold not-italic" style={{ fontSize: u(22) }}>{label}</i>
                        <PopNumber value={value} size={64} className="" />
                      </div>
                    ))}
                  {settings.ratio && (
                    <div className="text-right" style={{ lineHeight: 1 }}>
                      <b className="block font-hud-num font-semibold text-hud-gold" style={{ fontSize: u(46) }}>{ratio}</b>
                      <i className="font-bold not-italic text-hud-muted" style={{ fontSize: u(17) }}>KDA</i>
                    </div>
                  )}
                </div>
              )}

              {visible[3] && (
              <div style={{ marginTop: gapAt(3, 14) }}>
                {settings.winrate && (
                  <div className="flex items-center" style={{ gap: u(12) }}>
                    <div
                      className="flex-1 overflow-hidden"
                      style={{ height: u(8), borderRadius: u(4), background: "rgba(255, 255, 255, 0.12)" }}
                    >
                      <span
                        className="block h-full"
                        style={{
                          width: `${winRate ?? 0}%`,
                          borderRadius: u(4),
                          background: "linear-gradient(90deg, #3ddc97, #8fe3ff)",
                          transition: "width 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)",
                        }}
                      />
                    </div>
                    <em
                      className="text-right font-bold not-italic"
                      style={{ fontSize: u(19), minWidth: u(74) }}
                    >
                      {winRate === null ? "-" : `${winRate}%`} WR
                    </em>
                  </div>
                )}

                {chips.length > 0 && (
                  <div className="flex flex-wrap" style={{ gap: u(6), marginTop: settings.winrate ? u(11) : 0 }}>
                    {chips.map((id) => (
                      <span
                        key={id}
                        className="font-bold"
                        style={{
                          fontSize: u(17),
                          padding: `${u(2)} ${u(10)}`,
                          borderRadius: u(6),
                          border: `${u(1)} solid ${CHIP_COLORS[id]}`,
                          background: "rgba(255, 255, 255, 0.05)",
                        }}
                      >
                        {LABELS[id]} x{records[id]}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MLScoreboard() {
  const state = useGameState<MLState>(ML_GAME_ID);
  const stored = useGameSettings<MLSettings>(ML_GAME_ID);
  if (!state) return null;
  const settings = parseMLSettings(stored) ?? defaultMLSettings();
  return <Scoreboard state={state} settings={settings.scoreboard} />;
}
