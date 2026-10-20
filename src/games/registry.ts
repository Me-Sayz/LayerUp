import { mlGame } from "@/games/ml/definition";
import type { GameDefinition, GameId } from "@/lib/types";

// GAMES: daftarkan game baru di array ini
const games: GameDefinition[] = [mlGame];
// END GAMES

const byId = new Map<GameId, GameDefinition>();
for (const game of games) {
  if (byId.has(game.id)) throw new Error(`Game id ganda: ${game.id}`);
  byId.set(game.id, game);
}

export function listGames(): GameDefinition[] {
  return games;
}

export function getGame(id: GameId): GameDefinition | undefined {
  return byId.get(id);
}