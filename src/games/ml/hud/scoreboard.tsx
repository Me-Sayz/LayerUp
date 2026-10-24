"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { formatDuration } from "@/games/ml/format";
import {
  DEFAULT_SESSION,
  defaultMLSettings,
  parseMLSettings,
  type MLSettings,
  type ScoreboardSettings,
  type SessionSettings,
} from "@/games/ml/settings";
import { ML_GAME_ID, type MLState } from "@/games/ml/state";
import { FIT_H, fitUnit, fitVar, onFontsReady, writeFit } from "@/lib/overlay-fit";
import { useGameSettings, useGameState } from "@/lib/use-game-state";

const DEFAULT_HEIGHT = 340;
const FRAME_Y = 38;
const FRAME = 48;
const MIN_INNER = 180;
const WINRATE_MIN = 150;
const TITLE_ROW = { both: 392, title: 260, hero: 180 } as const;
const TOP_GAP = 10;
const TOP_WIDTH = { win: 118, lose: 118, streak: 136 } as const;
const MARK_SIZE = 26;
const MARK_GAP = 6;
const GOAL_MIN = 260;
const TIMER_MIN = 150;
const EXTRA_GAP = 10;
const u = (n: number) => `calc(var(--u) * ${n})`;
const CUT = u(22);
const CUT_SHAPE = `polygon(0 0, calc(100% - ${CUT}) 0, 100% ${CUT}, 100% 100%, ${CUT} 100%, 0 calc(100% - ${CUT}))`;

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

function subscribeClock(onChange: () => void): () => void {
  const id = setInterval(onChange, 1000);
  return () => clearInterval(id);
}

const clockSecond = () => Math.floor(Date.now() / 1000);

function MatchTimer({ startedAt, lastDurationMs }: { startedAt: number; lastDurationMs: number }) {
  const nowSecond = useSyncExternalStore(subscribeClock, clockSecond, () => 0);
  const running = startedAt > 0;
  const frozen = !running && lastDurationMs > 0;
  const text = running
    ? formatDuration(Math.max(0, nowSecond * 1000 - startedAt))
    : frozen
      ? formatDuration(lastDurationMs)
      : "--:--";

  return (
    <div className="flex items-baseline justify-between" style={{ opacity: running || frozen ? 1 : 0.42 }}>
      <i className="font-bold not-italic text-hud-muted" style={{ fontSize: u(19) }}>
        {frozen ? "DURASI" : "MATCH"}
      </i>
      <b
        className={`font-hud-num font-semibold ${frozen ? "text-hud-gold" : "text-hud-ice"}`}
        style={{ fontSize: u(40), lineHeight: 1, fontVariantNumeric: "tabular-nums" }}
      >
        {text}
      </b>
    </div>
  );
}

function HistoryStrip({ results, count }: { results: MLState["results"]; count: number }) {
  const shown = results.slice(-count);
  return (
    <div className="flex" style={{ gap: u(MARK_GAP) }} aria-label="Riwayat match">
      {Array.from({ length: count }, (_, index) => {
        const mark = shown[index];
        const win = mark === "W";
        const color = win ? "#3ddc97" : "#ff5c6c";
        return (
          <span
            key={index}
            className="inline-flex items-center justify-center font-hud-num font-semibold"
            style={{
              width: u(MARK_SIZE),
              height: u(MARK_SIZE),
              fontSize: u(18),
              borderRadius: u(5),
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

function GoalRow({
  label,
  value,
  goal,
  done,
  tone,
}: {
  label: string;
  value: number;
  goal: number;
  done: boolean;
  tone: "good" | "limit";
}) {
  const color = done ? (tone === "good" ? "#f2c14e" : "#ff5c6c") : tone === "good" ? "#3ddc97" : "#8c93a1";
  return (
    <div>
      <div className="flex items-baseline justify-between" style={{ fontSize: u(18) }}>
        <i className="font-bold not-italic text-hud-muted">{label}</i>
        <b className="font-hud-num font-semibold" style={{ color, fontSize: u(24) }}>
          {done && tone === "good" ? "\u2713 " : ""}
          {value}/{goal}
        </b>
      </div>
      <div style={{ height: u(6), marginTop: u(3), borderRadius: u(3), background: "rgba(255, 255, 255, 0.12)", overflow: "hidden" }}>
        <span
          className="block h-full"
          style={{
            width: `${Math.min(100, (value / goal) * 100)}%`,
            borderRadius: u(3),
            background: color,
            transition: "width 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)",
          }}
        />
      </div>
    </div>
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

export function Scoreboard({
  state,
  settings,
  session: sessionSettings = DEFAULT_SESSION,
}: {
  state: MLState;
  settings: ScoreboardSettings;
  session?: SessionSettings;
}) {
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

  const { session, hero } = state;
  const played = session.wins + session.losses;
  const winRate = played === 0 ? null : Math.round((session.wins / played) * 100);
  const streakOn = session.streak > 0;
  const streakHot = session.streak >= 3;
  const heroOn = state.matchStartedAt > 0 || state.lastDurationMs > 0;

  const topKeys = (["win", "lose", "streak"] as const).filter((key) => settings[key]);
  const goalKeys = (["goalWin", "goalStreak", "goalLose"] as const).filter((key) => settings[key]);
  const extras = settings.history || settings.timer || goalKeys.length > 0;
  const visible = [
    settings.title || settings.hero,
    topKeys.length > 0,
    settings.winrate,
    extras,
  ];
  const { goals, historyCount } = sessionSettings;
  const first = visible.indexOf(true);
  if (first === -1) return null;
  const gapAt = (index: number, size: number) => u(index === first ? 0 : size);

  const headerWidth = settings.title && settings.hero ? TITLE_ROW.both : settings.title ? TITLE_ROW.title : settings.hero ? TITLE_ROW.hero : 0;
  const innerWidth = Math.max(
    MIN_INNER,
    headerWidth,
    span(topKeys.map((key) => TOP_WIDTH[key]), TOP_GAP),
    settings.winrate ? WINRATE_MIN : 0,
    settings.history ? span(Array<number>(historyCount).fill(MARK_SIZE), MARK_GAP) : 0,
    goalKeys.length > 0 ? GOAL_MIN : 0,
    settings.timer ? TIMER_MIN : 0,
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
                      style={{ fontSize: u(21), maxWidth: u(180), opacity: heroOn ? 1 : 0, transition: "opacity 0.4s" }}
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
              <div style={{ marginTop: gapAt(2, 14) }}>
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
              </div>
              )}

              {visible[3] && (
                <div
                  className="flex flex-col"
                  style={{
                    gap: u(EXTRA_GAP),
                    marginTop: gapAt(3, 14),
                    paddingTop: first === 3 ? 0 : u(12),
                    borderTop: first === 3 ? "none" : `${u(1)} solid rgba(255, 255, 255, 0.13)`,
                  }}
                >
                  {settings.history && <HistoryStrip results={state.results} count={historyCount} />}
                  {settings.goalWin && (
                    <GoalRow label="TARGET MENANG" value={session.wins} goal={goals.win} done={session.wins >= goals.win} tone="good" />
                  )}
                  {settings.goalStreak && (
                    <GoalRow
                      label="TARGET STREAK"
                      value={session.best >= goals.streak ? goals.streak : session.streak}
                      goal={goals.streak}
                      done={session.best >= goals.streak}
                      tone="good"
                    />
                  )}
                  {settings.goalLose && (
                    <GoalRow label="BATAS KALAH" value={session.losses} goal={goals.lose} done={session.losses >= goals.lose} tone="limit" />
                  )}
                  {settings.timer && (
                    <MatchTimer startedAt={state.matchStartedAt} lastDurationMs={state.lastDurationMs} />
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
  return <Scoreboard state={state} settings={settings.scoreboard} session={settings.session} />;
}
