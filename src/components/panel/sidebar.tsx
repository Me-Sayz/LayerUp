"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { GAME_MENUS, GENERAL_MENU, gameForPath, isActive, type MenuItem } from "@/games/menu";
import { useStreamConnected } from "@/lib/use-game-state";

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-5 py-5">
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-panel-accent" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M12 3 3 8l9 5 9-5-9-5z" />
        <path d="m3 12 9 5 9-5" opacity="0.65" />
        <path d="m3 16 9 5 9-5" opacity="0.35" />
      </svg>
      <span className="text-[15px] font-semibold tracking-tight text-panel-text">LayerUp</span>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="px-5 pb-1.5 pt-4 text-[11px] font-medium uppercase tracking-wider text-panel-muted">{children}</div>
  );
}

function NavLink({ item, pathname, nested }: { item: MenuItem; pathname: string; nested?: boolean }) {
  const active = isActive(item.href, pathname);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={[
        "flex items-center border-l-2 py-1.5 pr-3 text-sm transition-colors",
        nested ? "pl-9" : "pl-[18px]",
        active
          ? "border-panel-accent bg-panel-raised text-panel-text"
          : "border-transparent text-panel-muted hover:bg-panel-raised/60 hover:text-panel-text",
      ].join(" ")}
    >
      {item.label}
    </Link>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function ConnectionStatus() {
  const connected = useStreamConnected();
  return (
    <div className="flex items-center gap-2 border-t border-panel-line px-5 py-3.5 text-xs text-panel-muted">
      <span
        className={`h-2 w-2 rounded-full ${connected ? "bg-panel-ok" : "bg-panel-bad"}`}
        aria-hidden
      />
      <span role="status">{connected ? "Server terhubung" : "Menyambung ke server..."}</span>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const currentGame = gameForPath(pathname);
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-panel-line bg-panel-side">
      <Brand />
      <nav aria-label="Menu utama" className="flex-1 overflow-y-auto pb-4">
        <SectionLabel>Umum</SectionLabel>
        {GENERAL_MENU.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}

        <SectionLabel>Game</SectionLabel>
        {GAME_MENUS.map((game) => {
          const open = toggled[game.id] ?? currentGame?.id === game.id;
          const parentId = `menu-${game.id}`;
          return (
            <div key={game.id}>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={parentId}
                onClick={() => setToggled((prev) => ({ ...prev, [game.id]: !open }))}
                className={[
                  "flex w-full items-center justify-between border-l-2 border-transparent py-1.5 pl-[18px] pr-3 text-left text-sm font-medium transition-colors hover:bg-panel-raised/60",
                  currentGame?.id === game.id ? "text-panel-text" : "text-panel-muted hover:text-panel-text",
                ].join(" ")}
              >
                {game.name}
                <Chevron open={open} />
              </button>
              {open && (
                <div id={parentId}>
                  {game.items.map((item) => (
                    <NavLink key={item.href} item={item} pathname={pathname} nested />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <ConnectionStatus />
    </aside>
  );
}