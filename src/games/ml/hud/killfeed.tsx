"use client";

import { useEffect, useLayoutEffect, useRef, useState, type Ref } from "react";
import {
  ANNOUNCE_EFFECT,
  ANNOUNCE_IDS,
  LABELS,
  ML_GAME_ID,
  isAnnounceId,
  type AnnounceId,
} from "@/games/ml/state";
import { FIT_H, FIT_W, fitUnit, fitVar, onFontsReady, writeFit } from "@/lib/overlay-fit";
import { useGameEffects } from "@/lib/use-game-state";

const DEFAULT_WIDTH = 400;
const DEFAULT_HEIGHT = 282;
const ROW_GAP = 8;
const MAX_ROWS = 5;
const SHOW_MS = 5000;
const OUT_MS = 500;

const u = (n: number | string) => `calc(var(--u) * ${n})`;
const ROW_SHAPE = `polygon(${u(18)} 0, 100% 0, 100% 100%, 0 100%)`;

const COLORS: Record<AnnounceId, string> = {
  firstblood: "#ff4d5e",
  doublekill: "#ffb347",
  triplekill: "#ff8a3d",
  maniac: "#ff5fa2",
  savage: "#b36bff",
  legendary: "#f2c14e",
  mvp: "#8fe3ff",
  shutdown: "#3ddc97",
};

interface Row {
  key: number;
  id: AnnounceId;
  leaving: boolean;
}

function Icon({ id, size }: { id: AnnounceId; size: number }) {
  const style = { width: u(size), height: u(size), flex: "none" } as const;
  if (id === "mvp") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden style={style}>
        <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3l-6.1 3.3 1.4-6.8-5.1-4.7 6.9-.8z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden style={style}>
      <path
        fillRule="evenodd"
        d="M12 2a8 8 0 0 0-8 8c0 2.6 1.2 4.5 3 5.8V19a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-3.2c1.8-1.3 3-3.2 3-5.8a8 8 0 0 0-8-8zM8.5 11.5a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6zm7 0a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6z"
      />
    </svg>
  );
}

function RowView({ id, rowRef }: { id: AnnounceId; rowRef?: Ref<HTMLDivElement> }) {
  const color = COLORS[id];
  return (
    <div
      ref={rowRef}
      className="flex items-center"
      style={{
        gap: u(12),
        padding: `${u(7)} ${u(20)} ${u(7)} ${u(28)}`,
        background: "rgba(12, 17, 48, 0.94)",
        borderRight: `${u(6)} solid ${color}`,
        clipPath: ROW_SHAPE,
        color,
      }}
    >
      <Icon id={id} size={28} />
      <span
        className="font-hud-num font-medium uppercase text-hud-text"
        style={{ fontSize: u(36), lineHeight: 1, letterSpacing: "0.02em" }}
      >
        {LABELS[id]}
      </span>
    </div>
  );
}

function FeedRow({ row }: { row: Row }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.animate(
      [
        { opacity: 0, transform: "translateX(20%)" },
        { opacity: 1, transform: "translateX(0)" },
      ],
      { duration: 450, easing: "cubic-bezier(.2, 1.1, .3, 1)", fill: "backwards" },
    );
  }, []);

  useEffect(() => {
    if (!row.leaving) return;
    ref.current?.animate(
      [
        { opacity: 1, transform: "translateX(0)" },
        { opacity: 0, transform: "translateX(15%)" },
      ],
      { duration: OUT_MS, easing: "ease-in", fill: "forwards" },
    );
  }, [row.leaving]);

  return <RowView id={row.id} rowRef={ref} />;
}

function measureFeed(root: HTMLElement | null, probe: HTMLElement | null): void {
  if (!root || !probe || probe.children.length === 0) return;
  let width = 0;
  let rowHeight = 0;
  for (const child of Array.from(probe.children)) {
    const rect = child.getBoundingClientRect();
    width = Math.max(width, rect.width);
    rowHeight = Math.max(rowHeight, rect.height);
  }
  writeFit(root, FIT_W, width);
  writeFit(root, FIT_H, rowHeight * MAX_ROWS + ROW_GAP * (MAX_ROWS - 1));
}

export function MLKillfeed() {
  const rootRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const nextKey = useRef(0);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const active = timers.current;
    return () => active.forEach((timer) => clearTimeout(timer));
  }, []);

  useLayoutEffect(() => {
    measureFeed(rootRef.current, probeRef.current);
  }, []);

  useEffect(() => onFontsReady(() => measureFeed(rootRef.current, probeRef.current)), []);

  function later(action: () => void, ms: number): void {
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      action();
    }, ms);
    timers.current.add(timer);
  }

  useGameEffects(ML_GAME_ID, (effect) => {
    if (effect.type !== ANNOUNCE_EFFECT) return;
    const id = effect.payload?.id;
    if (typeof id !== "string" || !isAnnounceId(id)) return;

    const key = nextKey.current++;
    setRows((prev) => [...prev, { key, id, leaving: false }].slice(-MAX_ROWS));
    later(() => setRows((prev) => prev.map((r) => (r.key === key ? { ...r, leaving: true } : r))), SHOW_MS);
    later(() => setRows((prev) => prev.filter((r) => r.key !== key)), SHOW_MS + OUT_MS);
  });

  return (
    <div
      ref={rootRef}
      className="flex justify-end font-hud-ui"
      style={{
        ["--u" as string]: fitUnit(fitVar(FIT_W, DEFAULT_WIDTH), fitVar(FIT_H, DEFAULT_HEIGHT)),
        width: "100cqw",
      }}
    >
      <div
        aria-hidden
        ref={probeRef}
        className="flex flex-col items-start"
        style={{ ["--u" as string]: "1px", position: "absolute", left: 0, top: 0, visibility: "hidden", width: "max-content" }}
      >
        {ANNOUNCE_IDS.map((id) => (
          <RowView key={id} id={id} />
        ))}
      </div>
      <div className="flex flex-col items-end" style={{ width: u(fitVar(FIT_W, DEFAULT_WIDTH)), gap: u(ROW_GAP) }}>
        {rows.map((row) => (
          <FeedRow key={row.key} row={row} />
        ))}
      </div>
    </div>
  );
}
