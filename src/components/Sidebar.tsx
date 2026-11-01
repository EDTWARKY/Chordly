import {
  Compass,
  Download,
  FolderOpen,
  Heart,
  Home,
  Library,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { useApp } from "../store";
import { cn } from "../lib/utils";
import { ChordlyLogo } from "./Logo";
import { AccountMenu } from "./AccountMenu";

const primaryNav = [
  { name: "home" as const, label: "Home", icon: Home },
  { name: "explore" as const, label: "Explore", icon: Compass },
  { name: "library" as const, label: "Library", icon: Library },
  { name: "search" as const, label: "Search", icon: Search },
];

export function Sidebar() {
  const { view, navigate, playlists, openModal, openSearch, liked } = useApp();

  const isActive = (name: string) => {
    if (view.name === "collection") return false;
    return view.name === name;
  };

  return (
    <aside className="sidebar">
      <div className="logo-row flex items-center justify-between px-5 pb-3 pt-5">
        <button type="button" onClick={() => navigate({ name: "home" })} aria-label="Chordly home">
          <ChordlyLogo markClass="h-[30px] w-[30px]" wordClass="text-[24px]" />
        </button>
        <button
          type="button"
          aria-label="Import playlist"
          className="sidebar-copy grid h-7 w-7 place-items-center rounded-full text-[var(--faint)] transition hover:bg-[var(--hover)] hover:text-[var(--ink)]"
          onClick={() => openModal("import")}
          title="Import playlist"
        >
          <Plus size={15} />
        </button>
      </div>

      <nav className="px-2.5">
        {primaryNav.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.name);
          return (
            <button
              key={item.name}
              type="button"
              onClick={() =>
                item.name === "search" ? openSearch() : navigate({ name: item.name })
              }
              className={cn(
                "nav-row group relative flex h-[38px] w-full items-center gap-3 rounded-lg px-2.5 text-left transition-colors",
                active
                  ? "bg-[var(--active)] text-[var(--ink)]"
                  : "text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--ink)]",
              )}
            >
              <Icon size={17} strokeWidth={active ? 2 : 1.7} className="shrink-0" />
              <span
                className={cn(
                  "nav-label flex-1 text-[12.5px]",
                  active ? "font-semibold" : "font-medium",
                )}
              >
                {item.label}
              </span>
              {item.name === "search" && (
                <span className="nav-label rounded border border-[var(--line)] px-1 py-0.5 text-[8.5px] text-[var(--faint)]">
                  Ctrl K
                </span>
              )}
              {active && <span className="nav-dot h-1 w-1 rounded-full bg-[var(--ink)]" />}
            </button>
          );
        })}
      </nav>

      <div className="divider mx-4 my-3" />

      <div className="flex min-h-0 flex-1 flex-col px-2.5">
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => navigate({ name: "collection", kind: "liked", title: "Liked Music" })}
            className={cn(
              "nav-row flex h-[34px] w-full items-center gap-3 rounded-lg px-2.5 text-left transition-colors",
              view.name === "collection" && view.kind === "liked"
                ? "bg-[var(--active)] text-[var(--ink)]"
                : "text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--ink)]",
            )}
          >
            <Heart
              size={16}
              className={cn(
                "shrink-0",
                view.name === "collection" && view.kind === "liked" && "fill-current",
              )}
            />
            <span className="nav-label flex-1 text-[12px] font-medium">Liked Music</span>
            <span className="nav-label text-[9.5px] tabular-nums text-[var(--faint)]">{liked.length}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate({ name: "collection", kind: "downloads", title: "Downloads" })}
            className={cn(
              "nav-row flex h-[34px] w-full items-center gap-3 rounded-lg px-2.5 text-left transition-colors",
              view.name === "collection" && view.kind === "downloads"
                ? "bg-[var(--active)] text-[var(--ink)]"
                : "text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--ink)]",
            )}
          >
            <Download size={16} className="shrink-0" />
            <span className="nav-label flex-1 text-[12px] font-medium">Downloads</span>
          </button>
          <button
            type="button"
            onClick={() => navigate({ name: "collection", kind: "local", title: "Local Music" })}
            className={cn(
              "nav-row flex h-[34px] w-full items-center gap-3 rounded-lg px-2.5 text-left transition-colors",
              view.name === "collection" && view.kind === "local"
                ? "bg-[var(--active)] text-[var(--ink)]"
                : "text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--ink)]",
            )}
          >
            <FolderOpen size={16} className="shrink-0" />
            <span className="nav-label flex-1 text-[12px] font-medium">Local Music</span>
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between px-2.5 pb-1.5">
          <span className="sidebar-section eyebrow">Playlists</span>
          <button
            type="button"
            aria-label="Create playlist"
            onClick={() => openModal("create-playlist")}
            className="sidebar-copy grid h-5 w-5 place-items-center rounded text-[var(--faint)] transition hover:bg-[var(--hover)] hover:text-[var(--ink)]"
          >
            <Plus size={13} />
          </button>
        </div>

        <div className="scrollbar min-h-0 flex-1 overflow-y-auto">
          {playlists.map((playlist) => {
            const active =
              view.name === "collection" && view.kind === "playlist" && view.id === playlist.id;
            return (
              <button
                key={playlist.id}
                type="button"
                onClick={() =>
                  navigate({
                    name: "collection",
                    kind: "playlist",
                    id: playlist.id,
                    title: playlist.name,
                  })
                }
                className={cn(
                  "nav-row flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[5px] text-left transition-colors",
                  active
                    ? "bg-[var(--active)] text-[var(--ink)]"
                    : "text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--ink)]",
                )}
              >
                <img
                  src={playlist.cover}
                  alt=""
                  className="h-[26px] w-[26px] shrink-0 rounded-[5px] object-cover"
                />
                <span className="sidebar-section min-w-0 flex-1">
                  <span className="block truncate text-[11.5px] font-medium">{playlist.name}</span>
                  <span className="flex items-center gap-1 text-[9px] text-[var(--faint)]">
                    {playlist.trackIds.length} songs
                    {playlist.synced && <span className="text-[8px]">· synced</span>}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5 p-2.5 pt-2">
        <button
          type="button"
          onClick={() => openModal("party")}
          className="group flex w-full items-center gap-2.5 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--hover)] px-3 py-2.5 text-left transition-colors hover:bg-[var(--active)]"
        >
          <span className="relative grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[var(--line-strong)]">
            <Users size={13} />
            <span className="absolute right-0 top-0 h-1.5 w-1.5 rounded-full bg-[var(--ink)]" />
          </span>
          <span className="sidebar-copy min-w-0 flex-1">
            <span className="block text-[10.5px] font-semibold text-[var(--ink)]">Listen together</span>
            <span className="block text-[9px] text-[var(--faint)]">Start a party · 18 ms</span>
          </span>
          <span className="sidebar-copy rounded-full border border-[var(--line)] px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-[var(--faint)]">
            Live
          </span>
        </button>
        <AccountMenu direction="up" />
      </div>
    </aside>
  );
}
