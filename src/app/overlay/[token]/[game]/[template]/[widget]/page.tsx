import { notFound } from "next/navigation";
import type { ReactElement } from "react";
import { MLBanner } from "@/games/ml/hud/banner";
import { MLRank } from "@/games/ml/hud/rank";
import { MLScoreboard } from "@/games/ml/hud/scoreboard";

const WIDGETS: Record<string, ReactElement | undefined> = {
  "ml/hud/scoreboard": <MLScoreboard />,
  "ml/hud/banner": <MLBanner />,
  "ml/hud/rank": <MLRank />,
};

export const instant = false;

export default async function OverlayPage({
  params,
}: PageProps<"/overlay/[token]/[game]/[template]/[widget]">) {
  const { game, template, widget } = await params;
  const element = WIDGETS[`${game}/${template}/${widget}`];
  if (!element) notFound();
  return <div className="overlay-root">{element}</div>;
}