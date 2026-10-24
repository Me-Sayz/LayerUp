"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      {open ? <path d="m6 6 12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
    </svg>
  );
}

function NavTree({ pathname }: { pathname: string }) {
  const currentGame = gameForPath(pathname);
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  return (
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
  );
}

// SECTION: SIDEBAR DESKTOP
function DesktopSidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="hidden h-full w-60 shrink-0 flex-col border-r border-panel-line bg-panel-side md:flex">
      <Brand />
      <NavTree pathname={pathname} />
      <ConnectionStatus />
    </aside>
  );
}
// END SIDEBAR DESKTOP

// SECTION: MENU HP
function MobileMenu({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <header className="flex shrink-0 items-center gap-1 border-b border-panel-line bg-panel-side pr-3">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="menu-drawer"
          aria-label={open ? "Tutup menu" : "Buka menu"}
          className="relative z-50 ml-2 flex h-11 w-11 items-center justify-center rounded-md text-panel-muted transition-colors hover:bg-panel-hover hover:text-panel-text focus-visible:outline-2 focus-visible:outline-panel-accent"
        >
          <MenuIcon open={open} />
        </button>
        <span className="text-[15px] font-semibold tracking-tight text-panel-text">LayerUp</span>
        <MobileStatusDot />
      </header>

      {open && (
        <div className="fixed inset-0 z-40">
          <button type="button" aria-label="Tutup menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/60" />
          <div
            id="menu-drawer"
            role="dialog"
            aria-label="Menu"
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("a")) setOpen(false);
            }}
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-panel-line bg-panel-side pt-12 shadow-2xl shadow-black/60"
          >
            <NavTree pathname={pathname} />
            <ConnectionStatus />
          </div>
        </div>
      )}
    </div>
  );
}

function MobileStatusDot() {
  const connected = useStreamConnected();
  return (
    <span
      className={`ml-auto h-2 w-2 rounded-full ${connected ? "bg-panel-ok" : "bg-panel-bad"}`}
      role="status"
      aria-label={connected ? "Server terhubung" : "Menyambung ke server"}
    />
  );
}
// END MENU HP

export function Sidebar() {
  const pathname = usePathname();
  return (
    <>
      <DesktopSidebar pathname={pathname} />
      <MobileMenu pathname={pathname} />
    </>
  );
}
