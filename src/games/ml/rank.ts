import type { ResultMark } from "./state";

export const TIER_IDS = ["warrior", "elite", "master", "grandmaster", "epic", "legend", "mythic"] as const;
export type TierId = (typeof TIER_IDS)[number];

export type ImageId = TierId | "honor" | "glory" | "immortal" | "grading";

interface TierInfo {
  name: string;
  divisions: number;
  stars: number;
  protectedLoss: boolean;
}

export const TIERS: Record<TierId, TierInfo> = {
  warrior: { name: "Warrior", divisions: 3, stars: 3, protectedLoss: true },
  elite: { name: "Elite", divisions: 3, stars: 4, protectedLoss: false },
  master: { name: "Master", divisions: 4, stars: 4, protectedLoss: false },
  grandmaster: { name: "Grandmaster", divisions: 5, stars: 5, protectedLoss: false },
  epic: { name: "Epic", divisions: 5, stars: 5, protectedLoss: false },
  legend: { name: "Legend", divisions: 5, stars: 5, protectedLoss: false },
  mythic: { name: "Mythic", divisions: 0, stars: 0, protectedLoss: false },
};

export const MYTHIC_STEPS = [
  { from: 100, id: "immortal", name: "Mythical Immortal" },
  { from: 50, id: "glory", name: "Mythical Glory" },
  { from: 25, id: "honor", name: "Mythical Honor" },
  { from: 0, id: "mythic", name: "Mythic" },
] as const;

export const ROMAN = ["", "I", "II", "III", "IV", "V"] as const;

export const GRADING_SLOTS = 10;
export const GRADING_FREE_WINS = 5;
export const MYTHIC_ENTRY_STARS = 1;
export const MYTHIC_STAR_MAX = 9999;

export interface RankPos {
  tier: TierId;
  division: number;
  stars: number;
}

export interface RankState {
  pos: RankPos;
  auto: boolean;
  pending: boolean;
  grading: ResultMark[] | null;
}

export const DEFAULT_POS: RankPos = { tier: "epic", division: 5, stars: 0 };

export function initialRank(): RankState {
  return { pos: { ...DEFAULT_POS }, auto: true, pending: false, grading: null };
}

export function isMythic(pos: RankPos): boolean {
  return pos.tier === "mythic";
}

export function starsMax(pos: RankPos): number {
  return isMythic(pos) ? MYTHIC_STAR_MAX : TIERS[pos.tier].stars;
}

export function mythicStep(stars: number): (typeof MYTHIC_STEPS)[number] {
  return MYTHIC_STEPS.find((step) => stars >= step.from) ?? MYTHIC_STEPS[MYTHIC_STEPS.length - 1];
}

export function imageId(pos: RankPos): ImageId {
  return isMythic(pos) ? mythicStep(pos.stars).id : pos.tier;
}

export function tierName(pos: RankPos): string {
  return isMythic(pos) ? mythicStep(pos.stars).name : TIERS[pos.tier].name;
}

export function romanOf(pos: RankPos): string {
  return isMythic(pos) ? "" : ROMAN[pos.division];
}

export function posLabel(pos: RankPos): string {
  if (isMythic(pos)) return `${tierName(pos)} ★${pos.stars}`;
  return `${tierName(pos)} ${romanOf(pos)} ★${pos.stars}`;
}

export function rankLabel(rank: RankState): string {
  if (rank.grading) return `Grading ${rank.grading.length}/${GRADING_SLOTS}`;
  return posLabel(rank.pos);
}

export function validPos(pos: RankPos): boolean {
  if (!TIER_IDS.includes(pos.tier)) return false;
  if (!Number.isInteger(pos.stars) || pos.stars < 0) return false;
  if (isMythic(pos)) return pos.division === 0 && pos.stars <= MYTHIC_STAR_MAX;
  const info = TIERS[pos.tier];
  return Number.isInteger(pos.division) && pos.division >= 1 && pos.division <= info.divisions && pos.stars <= info.stars;
}

function topDivision(tier: TierId): number {
  return TIERS[tier].divisions;
}

function previousTier(tier: TierId): TierId | null {
  const index = TIER_IDS.indexOf(tier);
  return index > 0 ? TIER_IDS[index - 1] : null;
}

function nextTier(tier: TierId): TierId | null {
  const index = TIER_IDS.indexOf(tier);
  return index < TIER_IDS.length - 1 ? TIER_IDS[index + 1] : null;
}

export interface Step {
  pos: RankPos;
  pending: boolean;
}

export function stepUp(pos: RankPos): Step {
  if (isMythic(pos)) {
    return { pos: { ...pos, stars: Math.min(MYTHIC_STAR_MAX, pos.stars + 1) }, pending: false };
  }
  const info = TIERS[pos.tier];
  if (pos.stars < info.stars) return { pos: { ...pos, stars: pos.stars + 1 }, pending: false };
  if (pos.division > 1) return { pos: { tier: pos.tier, division: pos.division - 1, stars: 1 }, pending: false };
  if (nextTier(pos.tier) === "mythic") return { pos, pending: true };
  const next = nextTier(pos.tier);
  if (next === null) return { pos, pending: false };
  return { pos: { tier: next, division: topDivision(next), stars: 1 }, pending: false };
}

export function stepDown(pos: RankPos, force: boolean): RankPos {
  if (isMythic(pos)) {
    if (pos.stars > 0) return { ...pos, stars: pos.stars - 1 };
    return { tier: "legend", division: 1, stars: TIERS.legend.stars - 1 };
  }
  const info = TIERS[pos.tier];
  if (info.protectedLoss && !force) return pos;
  if (pos.stars > 0) return { ...pos, stars: pos.stars - 1 };
  if (pos.division < info.divisions) {
    return { tier: pos.tier, division: pos.division + 1, stars: info.stars - 1 };
  }
  const previous = previousTier(pos.tier);
  if (previous === null) return pos;
  return { tier: previous, division: 1, stars: TIERS[previous].stars - 1 };
}

export function gradingStars(wins: number): number {
  if (wins <= GRADING_FREE_WINS) return wins * 2;
  return GRADING_FREE_WINS * 2 + (wins - GRADING_FREE_WINS);
}

export function gradingWins(marks: ResultMark[]): number {
  return marks.filter((mark) => mark === "W").length;
}

export function applyResult(rank: RankState, won: boolean): RankState {
  if (!rank.auto || rank.pending) return rank;

  if (rank.grading) {
    const grading = [...rank.grading, won ? "W" : "L"] as ResultMark[];
    if (grading.length < GRADING_SLOTS) return { ...rank, grading };
    return {
      ...rank,
      grading: null,
      pos: { tier: "mythic", division: 0, stars: gradingStars(gradingWins(grading)) },
    };
  }

  if (won) {
    const step = stepUp(rank.pos);
    return { ...rank, pos: step.pos, pending: step.pending };
  }
  const pos = stepDown(rank.pos, false);
  return pos === rank.pos ? rank : { ...rank, pos };
}

export function adjustStars(rank: RankState, delta: 1 | -1): RankState {
  if (rank.grading || rank.pending) return rank;
  if (delta > 0) {
    const step = stepUp(rank.pos);
    return { ...rank, pos: step.pos, pending: step.pending };
  }
  const pos = stepDown(rank.pos, true);
  return pos === rank.pos ? rank : { ...rank, pos };
}

export function resolvePending(rank: RankState, mode: "grading" | "skip"): RankState {
  if (!rank.pending) return rank;
  if (mode === "grading") return { ...rank, pending: false, grading: [] };
  return { ...rank, pending: false, pos: { tier: "mythic", division: 0, stars: MYTHIC_ENTRY_STARS } };
}

export function setPosition(rank: RankState, pos: RankPos): RankState {
  return { ...rank, pos, pending: false, grading: null };
}

export function startGrading(rank: RankState): RankState {
  return { ...rank, pending: false, grading: [] };
}

function isPlain(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parsePos(value: unknown): RankPos | null {
  if (!isPlain(value)) return null;
  const { tier, division, stars } = value;
  if (typeof tier !== "string" || !(TIER_IDS as readonly string[]).includes(tier)) return null;
  if (typeof division !== "number" || typeof stars !== "number") return null;
  const pos: RankPos = { tier: tier as TierId, division, stars };
  return validPos(pos) ? pos : null;
}

export function normalizeRank(raw: unknown): RankState {
  const base = initialRank();
  if (!isPlain(raw)) return base;
  const pos = parsePos(raw.pos) ?? base.pos;
  const grading = Array.isArray(raw.grading)
    ? (raw.grading.filter((mark): mark is ResultMark => mark === "W" || mark === "L").slice(0, GRADING_SLOTS - 1) as ResultMark[])
    : null;
  return {
    pos,
    auto: raw.auto !== false,
    pending: raw.pending === true && grading === null && pos.tier === "legend" && pos.division === 1 && pos.stars === TIERS.legend.stars,
    grading,
  };
}
