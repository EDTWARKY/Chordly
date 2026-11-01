import { useEffect } from "react";
import { ListMusic, Play, Save, Shuffle, Trash2, X } from "lucide-react";
import { useApp } from "../store";
import { cn, formatTime } from "../lib/utils";
import { Artwork } from "./Artwork";

export function QueuePanel() {
  const {
    queueOpen,
    setQueueOpen,
    queue,
    queueLabel,
    currentTrack,
    playFromQueue,
    removeFromQueue,
    clearQueue,
    shuffle,
    toggleShuffle,
    createPlaylist,
    pushToast,
  } = useApp();

  useEffect(() => {
    if (!queueOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setQueueOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [queueOpen, setQueueOpen]);

  if (!queueOpen) return null;

  const currentIndex = queue.findIndex((track) => track.id === currentTrack?.id);
  const upcoming = currentIndex >= 0 ? queue.slice(currentIndex + 1) : queue.filter((track) => track.id !== currentTrack?.id);

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/10 backdrop-blur-[1px] animate-fade-in"
      onClick={() => setQueueOpen(false)}
    >
      <aside
        className="queue-panel fixed right-2 top-2 bottom-[98px] flex w-[380px] flex-col overflow-hidden rounded-[18px] border border-[var(--line-strong)] bg-[var(--glass-strong)] shadow-[var(--shadow)] backdrop-blur-3xl animate-slide-in-right"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between px-5 pb-4 pt-5">
          <div>
            <p className="eyebrow mb-1">Now playing from</p>
            <h2 className="text-[20px] font-semibold tracking-[-0.03em]">Queue</h2>
            <p className="mt-1 text-[10.5px] text-[var(--faint)]">{queueLabel}</p>
          </div>
          <button
            type="button"
            onClick={() => setQueueOpen(false)}
            aria-label="Close queue"
            className="grid h-7 w-7 place-items-center rounded-full text-[var(--muted)] transition hover:bg-[var(--hover)] hover:text-[var(--ink)]"
          >
            <X size={15} />
          </button>
        </header>

        {currentTrack && (
          <div className="mx-3.5 flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--hover)] p-2.5">
            <Artwork src={currentTrack.cover} alt="" className="h-11 w-11 rounded-md" rounded="rounded-md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold">{currentTrack.title}</p>
              <p className="truncate text-[10px] text-[var(--muted)]">{currentTrack.artist}</p>
            </div>
            <span className="text-[8.5px] font-semibold uppercase tracking-[0.12em] text-[var(--faint)]">
              Playing
            </span>
          </div>
        )}

        <div className="flex items-center justify-between px-5 pb-2 pt-5">
          <p className="eyebrow">
            Next up <span className="ml-1 text-[var(--faint)]">{upcoming.length}</span>
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleShuffle}
              className={cn(
                "grid h-6 w-6 place-items-center rounded-full text-[var(--faint)] transition hover:bg-[var(--hover)] hover:text-[var(--ink)]",
                shuffle && "bg-[var(--active)] text-[var(--ink)]",
              )}
              title="Shuffle"
            >
              <Shuffle size={12} />
            </button>
            <button
              type="button"
              onClick={clearQueue}
              className="rounded px-1.5 py-1 text-[9.5px] font-medium text-[var(--faint)] transition hover:bg-[var(--hover)] hover:text-[var(--ink)]"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="scrollbar min-h-0 flex-1 overflow-y-auto px-2.5">
          {upcoming.length ? (
            upcoming.map((track) => (
              <div
                key={track.id}
                className="group flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 transition hover:bg-[var(--hover)]"
                onClick={() => {
                  playFromQueue(track.id);
                  setQueueOpen(false);
                }}
              >
                <span className="grid w-4 place-items-center text-[var(--faint)]">
                  <span className="text-[9px] tabular-nums group-hover:hidden">{String(upcoming.indexOf(track) + 1).padStart(2, "0")}</span>
                  <Play size={10} fill="currentColor" className="hidden group-hover:block" />
                </span>
                <Artwork src={track.cover} alt="" className="h-9 w-9 rounded-[5px]" rounded="rounded-[5px]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11.5px] font-medium">{track.title}</p>
                  <p className="truncate text-[9.5px] text-[var(--faint)]">{track.artist}</p>
                </div>
                <span className="text-[9px] tabular-nums text-[var(--faint)]">{formatTime(track.duration)}</span>
                <button
                  type="button"
                  aria-label="Remove from queue"
                  className="grid h-6 w-6 place-items-center rounded text-[var(--faint)] opacity-0 transition hover:bg-[var(--active)] hover:text-[var(--ink)] group-hover:opacity-100"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeFromQueue(track.id);
                  }}
                >
                  <X size={11} />
                </button>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center px-8 py-16 text-center">
              <ListMusic size={26} className="text-[var(--faint)]" />
              <p className="mt-3 text-[12px] font-medium">The queue is clear</p>
              <p className="mt-1 text-[10.5px] leading-relaxed text-[var(--faint)]">
                Add something from your library to keep the music going.
              </p>
            </div>
          )}
        </div>

        <footer className="border-t border-[var(--line)] p-3">
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-sm flex-1"
              onClick={() => {
                if (!queue.length) return;
                createPlaylist(
                  `Queue · ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
                  `Saved from ${queueLabel}`,
                  currentTrack?.cover,
                  queue.map((track) => track.id),
                );
                pushToast("Queue saved", `${queue.length} songs saved to a new playlist`);
              }}
            >
              <Save size={13} /> Save queue
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                clearQueue();
                setQueueOpen(false);
              }}
            >
              <Trash2 size={13} /> Clear
            </button>
          </div>
        </footer>
      </aside>
    </div>
  );
}
