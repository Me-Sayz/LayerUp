"use client";

import { useEffect, useLayoutEffect, useRef, useState, type Ref } from "react";
import { ANNOUNCE_EFFECT, LABELS, LIMITS, ML_GAME_ID, isResultId, type ResultId } from "@/games/ml/state";
import type { GameEffect } from "@/lib/types";
import { FIT_H, FIT_W, fitUnit, fitVar, onFontsReady, writeFit } from "@/lib/overlay-fit";
import { useGameEffects } from "@/lib/use-game-state";

const DEFAULT_WIDTH = 1000;
const DEFAULT_HEIGHT = 300;
const FIT_RATIO = 0.94;
const EDGE = 8;
const MAX_QUEUE = 4;
const IN_MS = 600;
const OUT_MS = 420;
const RUSH_FACTOR = 0.6;

const u = (n: number | string) => `calc(var(--u) * ${n})`;
const FIT_WIDTH = fitVar(FIT_W, DEFAULT_WIDTH);
const FIT_HEIGHT = fitVar(FIT_H, DEFAULT_HEIGHT);

type BannerId = ResultId | "custom";
type Tier = 2 | 3 | 4;
type IconKind = "crown";

interface Style {
  tier: Tier;
  color: string;
  holdMs: number;
  icon: IconKind | null;
  sparks: number;
}

const STYLES: Record<BannerId, Style> = {
  custom: { tier: 2, color: "#ffe39a", holdMs: 2800, icon: null, sparks: 0 },
  defeat: { tier: 3, color: "#9aa7d9", holdMs: 4000, icon: null, sparks: 0 },
  victory: { tier: 4, color: "#f2c14e", holdMs: 4200, icon: "crown", sparks: 16 },
};

const FONT_SIZE: Record<Tier, number> = { 2: 140, 3: 160, 4: 185 };

interface Item {
  key: number;
  label: string;
  style: Style;
  holdMs: number;
}

const IN_FRAMES: Keyframe[] = [
  { opacity: 0, transform: "scale(2.4) translateY(-30px)", filter: "blur(14px)", offset: 0 },
  { opacity: 1, transform: "scale(0.95) translateY(0)", filter: "blur(0)", offset: 0.55 },
  { opacity: 1, transform: "scale(1) translateY(0)", filter: "blur(0)", offset: 1 },
];

const OUT_FRAMES: Keyframe[] = [
  { opacity: 1, transform: "translateY(0) scale(1)" },
  { opacity: 0, transform: "translateY(-30px) scale(0.96)" },
];

const HALO_FRAMES: Keyframe[] = [
  { opacity: 0, transform: "translate(-50%, -50%) scale(0.5)", offset: 0 },
  { opacity: 0.5, offset: 0.25 },
  { opacity: 0.16, transform: "translate(-50%, -50%) scale(1)", offset: 1 },
];

const SHEEN_FRAMES: Keyframe[] = [
  { backgroundPosition: "130% 0, 0 0" },
  { backgroundPosition: "-30% 0, 0 0" },
];

const SHAKE_FRAMES: Keyframe[] = [
  { transform: "translate(0, 0)", offset: 0 },
  { transform: "translate(-1%, 1.5%)", offset: 0.15 },
  { transform: "translate(0.8%, -1.5%)", offset: 0.3 },
  { transform: "translate(-0.7%, -0.8%)", offset: 0.45 },
  { transform: "translate(0.6%, 1.2%)", offset: 0.6 },
  { transform: "translate(-0.3%, 0.4%)", offset: 0.8 },
  { transform: "translate(0, 0)", offset: 1 },
];

function readBannerId(effect: GameEffect): { id: BannerId; label: string } | null {
  if (effect.type !== ANNOUNCE_EFFECT) return null;
  const id = effect.payload?.id;
  if (typeof id !== "string") return null;
  if (id === "custom") {
    const text = effect.payload?.text;
    if (typeof text !== "string" || !text.trim()) return null;
    return { id, label: text.trim().slice(0, LIMITS.customText) };
  }
  if (isResultId(id)) return { id, label: LABELS[id] };
  return null;
}

function Icon({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ width: u(size), height: u(size) }}>
      <path d="M2 7l5 4 5-7 5 7 5-4-2 12H4z" />
    </svg>
  );
}

function seeded(key: number, index: number, salt: number): number {
  const x = Math.sin((key + 1) * 12.9898 + index * 78.233 + salt * 37.719) * 43758.5453;
  return x - Math.floor(x);
}

function Banner({ item, onDone }: { item: Item; onDone: () => void }) {
  const shakeRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const fitRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const sparksRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(onDone);
  const { style } = item;

  useEffect(() => {
    doneRef.current = onDone;
  });

  useLayoutEffect(() => {
    const root = rootRef.current;
    const text = textRef.current;
    const fit = fitRef.current;
    if (!root || !text || !fit) return;
    const scale = Math.min(1, (root.clientWidth * FIT_RATIO) / Math.max(1, text.scrollWidth));
    fit.style.setProperty("--fit", String(scale));
  }, [item]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    root.animate(IN_FRAMES, { duration: IN_MS, easing: "cubic-bezier(.2, 1.15, .3, 1)", fill: "both" });
    haloRef.current?.animate(HALO_FRAMES, { duration: 1300, easing: "ease-out", fill: "both" });
    barRef.current?.animate(
      [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
      { duration: 700, delay: 120, easing: "cubic-bezier(.2, .8, .2, 1)", fill: "both" },
    );
    textRef.current?.animate(SHEEN_FRAMES, { duration: 900, delay: IN_MS - 150, easing: "ease-in-out", fill: "both" });
    if (style.tier >= 4) shakeRef.current?.animate(SHAKE_FRAMES, { duration: 500 });

    const rise = root.clientHeight;
    Array.from(sparksRef.current?.children ?? []).forEach((spark, index) => {
      const dx = (seeded(item.key, index, 3) - 0.5) * root.clientWidth * 0.12;
      const dy = rise * (0.55 + seeded(item.key, index, 4) * 0.7);
      spark.animate(
        [
          { transform: "translate(0, 0) rotate(45deg) scale(0)", opacity: 0, offset: 0 },
          { transform: `translate(${dx * 0.3}px, ${-dy * 0.25}px) rotate(45deg) scale(1)`, opacity: 1, offset: 0.2 },
          { transform: `translate(${dx}px, ${-dy}px) rotate(45deg) scale(0.4)`, opacity: 0, offset: 1 },
        ],
        {
          duration: 1500 + seeded(item.key, index, 5) * 1100,
          delay: 200 + seeded(item.key, index, 6) * 700,
          easing: "ease-out",
          fill: "both",
        },
      );
    });

    const leave = setTimeout(() => {
      root.animate(OUT_FRAMES, { duration: OUT_MS, easing: "ease-in", fill: "forwards" });
    }, item.holdMs);
    const done = setTimeout(() => doneRef.current(), item.holdMs + OUT_MS);

    return () => {
      clearTimeout(leave);
      clearTimeout(done);
    };
  }, [item, style.tier]);

  return (
    <div ref={shakeRef} style={{ position: "relative" }}>
      <div
        ref={rootRef}
        className="flex flex-col items-center"
        style={{ position: "relative", width: u(FIT_WIDTH), opacity: 0, color: style.color, ["--c" as string]: style.color }}
      >
        {style.sparks > 0 && (
          <div ref={sparksRef} aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            {Array.from({ length: style.sparks }, (_, index) => (
              <span
                key={index}
                style={{
                  position: "absolute",
                  left: `${8 + seeded(item.key, index, 1) * 84}%`,
                  top: `${45 + seeded(item.key, index, 2) * 40}%`,
                  width: u(9 + seeded(item.key, index, 7) * 9),
                  height: u(9 + seeded(item.key, index, 7) * 9),
                  background: index % 3 === 0 ? "#ffffff" : "var(--c)",
                  opacity: 0,
                  boxShadow: `0 0 ${u(10)} var(--c)`,
                }}
              />
            ))}
          </div>
        )}
        <BannerFace
          label={item.label}
          style={style}
          haloRef={haloRef}
          fitRef={fitRef}
          textRef={textRef}
          barRef={barRef}
        />
      </div>
    </div>
  );
}

function BannerFace({
  label,
  style,
  haloRef,
  fitRef,
  textRef,
  barRef,
}: {
  label: string;
  style: Style;
  haloRef?: Ref<HTMLDivElement>;
  fitRef?: Ref<HTMLDivElement>;
  textRef?: Ref<HTMLSpanElement>;
  barRef?: Ref<HTMLDivElement>;
}) {
  return (
    <>
      {haloRef && (
        <div
          ref={haloRef}
          aria-hidden
          style={{
            position: "absolute",
            left: "50%",
            top: "55%",
            width: u(FIT_WIDTH),
            height: u(`${FIT_HEIGHT} * 1.12`),
            opacity: 0,
            zIndex: -1,
            background: "radial-gradient(closest-side, var(--c), transparent)",
          }}
        />
      )}
      {style.icon && (
        <div style={{ marginBottom: u(6), filter: `drop-shadow(0 ${u(5)} ${u(8)} rgba(0, 0, 0, 0.4))` }}>
          <Icon size={76} />
        </div>
      )}
      <div ref={fitRef} style={{ transform: "scale(var(--fit, 1))" }}>
        <span
          ref={textRef}
          className="block font-hud-num font-semibold uppercase"
          style={{
            fontSize: u(FONT_SIZE[style.tier]),
            lineHeight: 0.98,
            letterSpacing: "0.02em",
            padding: `0 ${u(34)}`,
            whiteSpace: "nowrap",
            background:
              "linear-gradient(100deg, transparent 38%, rgba(255, 255, 255, 0.95) 50%, transparent 62%), linear-gradient(180deg, #ffffff 12%, var(--c) 118%)",
            backgroundSize: "260% 100%, 100% 100%",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "130% 0, 0 0",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            filter: `drop-shadow(0 0 ${u(16)} var(--c)) drop-shadow(0 ${u(5)} 0 rgba(0, 0, 0, 0.35))`,
          }}
        >
          {label}
        </span>
      </div>
      <div ref={barRef} className="flex items-center justify-center" style={{ width: "86%", gap: u(10), marginTop: u(2) }}>
        <span style={{ flex: 1, height: u(4), borderRadius: u(2), background: "linear-gradient(90deg, transparent, var(--c))" }} />
        <span style={{ width: u(14), height: u(14), transform: "rotate(45deg)", background: "var(--c)", boxShadow: `0 0 ${u(12)} var(--c)` }} />
        <span style={{ flex: 1, height: u(4), borderRadius: u(2), background: "linear-gradient(270deg, transparent, var(--c))" }} />
      </div>
    </>
  );
}

const PROBE_IDS = (Object.keys(STYLES) as BannerId[]).filter((id) => id !== "custom");

function measureBanner(root: HTMLElement | null, probe: HTMLElement | null): void {
  if (!root || !probe || probe.children.length === 0) return;
  let width = 0;
  let height = 0;
  for (const child of Array.from(probe.children)) {
    const rect = child.getBoundingClientRect();
    width = Math.max(width, rect.width);
    height = Math.max(height, rect.height);
  }
  writeFit(root, FIT_W, width / FIT_RATIO);
  writeFit(root, FIT_H, height + EDGE);
}

export function MLBanner() {
  const rootRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState<Item | null>(null);
  const queue = useRef<Item[]>([]);
  const busy = useRef(false);
  const nextKey = useRef(0);

  useLayoutEffect(() => {
    measureBanner(rootRef.current, probeRef.current);
  }, []);

  useEffect(() => onFontsReady(() => measureBanner(rootRef.current, probeRef.current)), []);

  function showNext(): void {
    const next = queue.current.shift() ?? null;
    busy.current = next !== null;
    if (next && queue.current.length > 0) next.holdMs = Math.round(next.holdMs * RUSH_FACTOR);
    setCurrent(next);
  }

  useGameEffects(ML_GAME_ID, (effect) => {
    const parsed = readBannerId(effect);
    if (!parsed) return;
    const style = STYLES[parsed.id];
    queue.current.push({ key: nextKey.current++, label: parsed.label, style, holdMs: style.holdMs });
    if (queue.current.length > MAX_QUEUE) queue.current.shift();
    if (!busy.current) showNext();
  });

  return (
    <div
      ref={rootRef}
      className="flex items-center justify-center font-hud-ui"
      style={{ ["--u" as string]: fitUnit(FIT_WIDTH, FIT_HEIGHT), width: "100cqw", height: "100cqh" }}
    >
      <div
        aria-hidden
        ref={probeRef}
        className="flex flex-col items-start"
        style={{ ["--u" as string]: "1px", position: "absolute", left: 0, top: 0, visibility: "hidden" }}
      >
        {PROBE_IDS.map((id) => (
          <div key={id} className="flex flex-col items-center" style={{ width: "max-content", ["--c" as string]: STYLES[id].color }}>
            <BannerFace label={LABELS[id]} style={STYLES[id]} />
          </div>
        ))}
      </div>
      {current && <Banner key={current.key} item={current} onDone={showNext} />}
    </div>
  );
}
