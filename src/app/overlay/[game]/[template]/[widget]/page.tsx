import { notFound } from "next/navigation";
import type { ReactElement } from "react";
import { MLBanner } from "@/games/ml/hud/banner";
import { MLKillfeed } from "@/games/ml/hud/killfeed";
import { MLScoreboard } from "@/games/ml/hud/scoreboard";

const WIDGETS: Record<string, ReactElement | undefined> = {
  "ml/hud/scoreboard": <MLScoreboard />,
  "ml/hud/killfeed": <MLKillfeed />,
  "ml/hud/banner": <MLBanner />,
};

export const instant = false;

export default async function OverlayPage({
  params,
}: PageProps<"/overlay/[game]/[template]/[widget]">) {
  const { game, template, widget } = await params;
  const element = WIDGETS[`${game}/${template}/${widget}`];
  if (!element) notFound();
  return <div className="overlay-root">{element}</div>;
}