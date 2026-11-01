import { Heart, Pause, Play } from "lucide-react";
import type { Track } from "../types";
import { useApp } from "../store";
import { cn, formatTime } from "../lib/utils";
import { Artwork } from "./Artwork";
import { Equalizer } from "./Primitives";
import { TrackMenu } from "./TrackMenu";

export function TrackRow({
  track,
  index,
  queue,
  queueLabel,
  showAlbum = true,
  showCover = true,
  className,
}: {
  track: Track;
  index: number;
  queue?: Track[];
  queueLabel?: string;
  showAlbum?: boolean;
  showCover?: boolean;
  className?: string;
}) {
  const { currentTrack, isPlaying, playTrack, togglePlay, isLiked, toggleLike } = useApp();
  const current = currentTrack?.id === track.id;
  const list = queue && queue.length ? queue : [track];
  const liked = isLiked(track);

  const play = () => {
    if (current) {
      togglePlay();
    } else {
      playTrack(track, list, queueLabel ?? track.album);
    }
  };

  return (
    <div
      className={cn("track-row group", current && "is-current bg-[var(--hover)]", className)}
      onDoubleClick={play}
    >
      <button
        type="button"
        className="track-num flex h-6 items-center justify-end text-[var(--faint)] hover:text-[var(--ink)]"
        onClick={play}
        aria-label={current && isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
      >
        {current ? (
          <span className="text-[var(--ink)]">
            <span className="group-hover:hidden">
              <Equalizer paused={!isPlaying} />
            </span>
            <span className="hidden group-hover:block">
              {isPlaying ? (
                <Pause size={12} fill="currentColor" />
              ) : (
                <Play size={12} fill="currentColor" className="ml-[1px]" />
              )}
            </span>
          </span>
        ) : (
          <>
            <span className="group-hover:hidden">{String(index + 1).padStart(2, "0")}</span>
            <Play size={12} fill="currentColor" className="hidden group-hover:block" />
          </>
        )}
      </button>

      <button type="button" onClick={play} className="block shrink-0" aria-label={`Play ${track.title}`}>
        {showCover ? (
          <Artwork src={track.cover} alt={track.album} className="h-10 w-10 rounded-[6px]" rounded="rounded-[6px]" />
        ) : (
          <span className="grid h-10 w-10 place-items-center rounded-full border border-[var(--line)] text-[10px] font-semibold text-[var(--muted)]">
            {track.artist.slice(0, 1)}
          </span>
        )}
      </button>

      <div className="min-w-0 flex-1 cursor-pointer" onClick={play}>
        <div className="flex min-w-0 items-center gap-2">
          <p
            className={cn(
              "track-title truncate text-[12.5px] font-medium tracking-[-0.01em]",
              current ? "text-[var(--ink)]" : "text-[var(--ink)]/90",
            )}
          >
            {track.title}
          </p>
          {track.explicit && (
            <span className="rounded-[3px] border border-[var(--line)] px-1 text-[8px] font-bold text-[var(--faint)]">
              E
            </span>
          )}
          {track.video && <span className="text-[8.5px] uppercase tracking-wider text-[var(--faint)]">Video</span>}
          {track.lossless || track.format === "flac" ? (
            <span className="rounded-[3px] border border-emerald-500/40 bg-emerald-500/10 px-1 text-[7.5px] font-bold uppercase tracking-wider text-emerald-400">
              {track.format === "flac" ? "FLAC" : "Lossless"}
            </span>
          ) : track.addonId ? (
            <span className="rounded-[3px] border border-cyan-500/40 bg-cyan-500/10 px-1 text-[7.5px] font-semibold uppercase tracking-wider text-cyan-300">
              {track.source || "Addon"}
            </span>
          ) : track.remote ? (
            <span className="rounded-[3px] border border-[var(--line)] px-1 text-[7.5px] font-semibold uppercase tracking-wider text-[var(--faint)]">
              YouTube
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-[11px] text-[var(--muted)]">{track.artist}</p>
      </div>

      {showAlbum ? (
        <button
          type="button"
          className="block truncate text-left text-[11.5px] text-[var(--muted)] hover:text-[var(--ink)] hover:underline"
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          {track.album}
        </button>
      ) : (
        <div className="hidden" />
      )}

      <span className="text-right text-[11px] tabular-nums text-[var(--faint)]">{formatTime(track.duration)}</span>

      <div className="row-actions shrink-0 flex items-center justify-end gap-1">
        <button
          type="button"
          aria-label={liked ? "Unlike" : "Like"}
          className={cn(
            "grid h-7 w-7 place-items-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--ink)]",
            liked && "text-[var(--ink)]",
          )}
          onClick={(event) => {
            event.stopPropagation();
            toggleLike(track);
          }}
        >
          <Heart size={13} className={liked ? "fill-current" : ""} />
        </button>
        <TrackMenu track={track} queue={list} queueLabel={queueLabel} />
      </div>
    </div>
  );
}
