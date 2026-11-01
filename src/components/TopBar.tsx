import { ChevronLeft, ChevronRight, Search, Users } from "lucide-react";
import { useApp } from "../store";
import { AccountMenu } from "./AccountMenu";
import { IconButton } from "./Primitives";

function viewLabel(view: ReturnType<typeof useApp>["view"]): string {
  switch (view.name) {
    case "home":
      return "Home";
    case "explore":
      return "Explore";
    case "library":
      return "Library";
    case "search":
      return "Search";
    case "settings":
      return "Settings";
    case "collection":
      return view.title ?? "Collection";
    default:
      return "chordly";
  }
}

export function TopBar() {
  const { view, canGoBack, canGoForward, goBack, goForward, openSearch, openModal, settings } = useApp();

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--canvas)]/20 backdrop-blur-2xl">
      <div className="mx-auto flex h-[58px] max-w-[1280px] items-center gap-3 px-6 lg:px-[38px]">
        <div className="flex items-center gap-1">
          <IconButton
            label="Go back"
            disabled={!canGoBack}
            onClick={goBack}
            className="h-8 w-8"
          >
            <ChevronLeft size={17} />
          </IconButton>
          <IconButton
            label="Go forward"
            disabled={!canGoForward}
            onClick={goForward}
            className="h-8 w-8"
          >
            <ChevronRight size={17} />
          </IconButton>
        </div>

        <div className="ml-1 flex min-w-0 items-center gap-2 text-[12px]">
          <span className="text-[var(--faint)]">chordly</span>
          <span className="text-[var(--faint)]">/</span>
          <span className="truncate font-medium text-[var(--ink)]">{viewLabel(view)}</span>
        </div>

        <div className="flex flex-1 items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => openSearch()}
            className="group flex h-[34px] w-[250px] items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--hover)] px-3 text-left text-[11.5px] text-[var(--faint)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--muted)] xl:w-[300px]"
          >
            <Search size={14} className="shrink-0" />
            <span className="flex-1 truncate">Search songs, artists, albums…</span>
            <span className="rounded border border-[var(--line)] px-1.5 py-0.5 text-[8.5px] tracking-wide text-[var(--faint)]">
              Ctrl K
            </span>
          </button>

          {settings.showPartyButton && (
            <IconButton label="Listen together" className="h-8 w-8" onClick={() => openModal("party")}>
              <Users size={16} />
            </IconButton>
          )}

          <div className="ml-1">
            <AccountMenu compact />
          </div>
        </div>
      </div>
    </header>
  );
}
