import type { GameId } from "@/lib/types";

export interface MenuItem {
  label: string;
  href: string;
}

export interface GameMenu {
  id: GameId;
  name: string;
  items: MenuItem[];
}

export const GENERAL_MENU: MenuItem[] = [
  { label: "Beranda", href: "/" },
  { label: "Akun", href: "/akun" },
];

// MENU: tambahkan menu game baru di array ini
export const GAME_MENUS: GameMenu[] = [
  {
    id: "ml",
    name: "Mobile Legends",
    items: [
      { label: "Kontrol Live", href: "/ml/kontrol" },
      { label: "Overlay", href: "/ml/overlay" },
      { label: "Riwayat sesi", href: "/ml/riwayat" },
      { label: "Pengaturan", href: "/ml/pengaturan" },
    ],
  },
];
// END MENU

export function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function gameForPath(pathname: string): GameMenu | undefined {
  return GAME_MENUS.find((game) => pathname === `/${game.id}` || pathname.startsWith(`/${game.id}/`));
}