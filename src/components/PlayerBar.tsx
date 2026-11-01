import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ChevronUp,
  Heart,
  ListMusic,
  Maximize2,
  Mic2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
  X,
  AudioLines,
  Activity,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useApp } from "../store";
import { cn, codecLabel, formatBitrate, formatSampleRate, formatTime, trackFormatBadge, useOutsideClick } from "../lib/utils";
import { Artwork } from "./Artwork";
import { Equalizer, IconButton } from "./Primitives";

function PlaybackControls() {
  const {
    isPlaying,
    togglePlay,
    next,
    previous,
    shuffle,
    toggleShuffle,
    repeatMode,
    cycleRepeat,
    currentTrack,
  } = useApp();

  return (
    <div className="flex items-center gap-1.5">
      <IconButton
        label="Shuffle"
        active={shuffle}
        onClick={toggleShuffle}
        className="h-8 w-8"
      >
        <Shuffle size={14} />
      </IconButton>
      <IconButton label="Previous" onClick={previous} className="h-8 w-8" disabled={!currentTrack}>
        <SkipBack size={17} fill="currentColor" />
      </IconButton>
      <button
        type="button"
        aria-label={isPlaying ? "Pause" : "Play"}
        onClick={togglePlay}
        disabled={!currentTrack}
        className="mx-1 grid h-[42px] w-[42px] place-items-center rounded-full bg-[var(--ink)] text-[var(--canvas)] shadow-[0_4px_16px_rgba(0,0,0,0.25)] transition-transform duration-200 hover:scale-[1.06] active:scale-95 disabled:opacity-30"
      >
        {isPlaying ? (
          <Pause size={17} fill="currentColor" />
        ) : (
          <Play size={17} fill="currentColor" className="ml-[2px]" />
        )}
      </button>
      <IconButton label="Next" onClick={next} className="h-8 w-8" disabled={!currentTrack}>
        <SkipForward size={17} fill="currentColor" />
      </IconButton>
      <IconButton
        label={repeatMode === "one" ? "Repeat one" : "Repeat"}
        active={repeatMode !== "off"}
        onClick={cycleRepeat}
        className="h-8 w-8"
      >
        {repeatMode === "one" ? <Repeat1 size={14} /> : <Repeat size={14} />}
      </IconButton>
    </div>
  );
}

function VolumeControl() {
  const { volume, muted, changeVolume, toggleMute, settings } = useApp();
  if (settings.hideVolume) return null;
  const effective = muted ? 0 : volume;
  return (
    <div className="flex items-center gap-1.5">
      <IconButton label={muted ? "Unmute" : "Mute"} onClick={toggleMute} className="h-8 w-8">
        {effective === 0 ? <VolumeX size={16} /> : effective < 0.45 ? <Volume1 size={16} /> : <Volume2 size={16} />}
      </IconButton>
      <input
        aria-label="Volume"
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={effective}
        onChange={(event) => changeVolume(Number(event.target.value))}
        className="slider w-[84px]"
        style={{ "--progress": `${effective * 100}%` } as CSSProperties}
      />
    </div>
  );
}

function StatsPopover({ onClose }: { onClose: () => void }) {
  const { currentTrack, settings, navigate, setNerdsStatsOpen, upgradeTrackToLossless, upgradingLossless } = useApp();
  const lossless = currentTrack?.quality === "Lossless" || currentTrack?.lossless || currentTrack?.format === "flac";
  const local = currentTrack?.local === true;
  const sourceName = currentTrack?.source || (local ? "This PC" : currentTrack?.addonId ? "Lossless Source" : "YouTube Music");
  const codec = (currentTrack?.codec ? currentTrack.codec.toUpperCase() : null) ?? codecLabel(currentTrack?.codec) ?? (lossless ? "FLAC" : "AAC");
  const depth = currentTrack?.bitDepth
    ? `${currentTrack.bitDepth}-bit`
    : currentTrack?.codec
      ? "—"
      : lossless
        ? "16-bit / 24-bit"
        : "16-bit";
  const rate = formatSampleRate(currentTrack?.sampleRate) ?? (lossless ? "44.1 kHz" : "44.1 kHz");
  const bitrate = formatBitrate(currentTrack?.bitrate) ?? (lossless ? "Lossless Bit-Perfect" : "160 kbps");
  const rows = [
    ["Codec", codec],
    ["Bit depth", depth],
    ["Sample rate", rate],
    ["Bitrate", bitrate],
    ["Output", "Windows shared"],
    ["Precision", settings.outputPrecision],
    ["Buffer", "Direct Streaming"],
    ["Source", sourceName],
    ["Stream Host", currentTrack?.streamHost || (currentTrack?.addonBaseUrl ? new URL(currentTrack.addonBaseUrl).hostname : "Local / Proxy")],
  ];
  return (
    <div className="absolute bottom-[calc(100%+12px)] right-0 z-40 w-[304px] rounded-2xl border border-[var(--line-strong)] bg-[var(--glass-strong)] p-3.5 shadow-[var(--shadow)] backdrop-blur-2xl animate-scale-in">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-[var(--muted)]">Stats for nerds</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close stats"
          className="grid h-6 w-6 place-items-center rounded-full text-[var(--faint)] hover:bg-[var(--hover)] hover:text-[var(--ink)]"
        >
          <X size={12} />
        </button>
      </div>
      <div className="space-y-1.5 font-mono text-[10.5px]">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4">
            <span className="text-[10px] text-[var(--faint)] font-sans">{label}</span>
            <span className="text-right text-[10.5px] font-medium tabular-nums text-[var(--ink)] truncate max-w-[180px]">{value}</span>
          </div>
        ))}
      </div>
      {!lossless && (
        <button
          type="button"
          disabled={upgradingLossless}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 py-2 text-[10.5px] font-bold text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)] transition hover:bg-emerald-500/25 active:scale-95 disabled:opacity-50"
          onClick={() => {
            onClose();
            void upgradeTrackToLossless();
          }}
        >
          {upgradingLossless ? (
            <Loader2 size={12} className="animate-spin text-emerald-300" />
          ) : (
            <Sparkles size={12} className="text-emerald-300" />
          )}
          Force Upgrade Quality (Find on Addons)
        </button>
      )}
      <button
        type="button"
        className={cn(
          "flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--line-strong)] bg-[var(--hover)] py-2 text-[10.5px] font-semibold text-[var(--ink)] transition hover:bg-white/10",
          !lossless ? "mt-1.5" : "mt-3"
        )}
        onClick={() => {
          onClose();
          setNerdsStatsOpen(true);
        }}
      >
        <Activity size={12} />
        Advanced Telemetry HUD (Shift+N)
      </button>
      <button
        type="button"
        className="mt-1 w-full rounded-lg py-1 text-[10px] font-medium text-[var(--faint)] transition hover:bg-[var(--hover)] hover:text-[var(--ink)]"
        onClick={() => {
          onClose();
          navigate({ name: "settings" });
        }}
      >
        Audio Settings
      </button>
    </div>
  );
}

export function PlayerBar() {
  const {
    currentTrack,
    isPlaying,
    progress,
    duration,
    seek,
    isLiked,
    toggleLike,
    setNowPlayingOpen,
    queueOpen,
    setQueueOpen,
    settings,
    queue,
  } = useApp();
  const [statsOpen, setStatsOpen] = useState(false);
  const statsRef = useOutsideClick<HTMLDivElement>(() => setStatsOpen(false), statsOpen);
  const sliderRef = useRef<HTMLInputElement>(null);
  const timeTextRef = useRef<HTMLSpanElement>(null);
  const isSeekingRef = useRef(false);

  useEffect(() => {
    const onTime = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      const { currentTime, duration: dur } = detail;
      if (timeTextRef.current) {
        timeTextRef.current.textContent = formatTime(currentTime);
      }
      if (sliderRef.current && !isSeekingRef.current) {
        const total = dur || duration || 1;
        sliderRef.current.value = String(Math.min(currentTime, total));
        const pct = Math.min(100, (currentTime / total) * 100);
        sliderRef.current.style.setProperty("--progress", `${pct}%`);
      }
    };
    window.addEventListener("chordly:timeupdate", onTime);
    return () => window.removeEventListener("chordly:timeupdate", onTime);
  }, [duration]);

  const progressPercent = duration > 0 ? Math.min(100, (progress / duration) * 100) : 0;
  const liked = currentTrack ? isLiked(currentTrack) : false;
  const localCodec = codecLabel(currentTrack?.codec) ?? "LOCAL";
  const isLossless = Boolean(currentTrack?.lossless || currentTrack?.format === "flac" || currentTrack?.quality === "Lossless");
  const displayQuality = currentTrack?.local
    ? `${localCodec} · ${isLossless ? "LOSSLESS" : "LOCAL"}`
    : currentTrack
      ? trackFormatBadge(currentTrack) ?? (isLossless ? "FLAC · LOSSLESS" : "OPUS · 160")
      : "OPUS · 160";

  return (
    <div className="player-shell px-2 pb-2">
      <div className="player-bar glass-strong relative grid h-[82px] items-center rounded-[18px] px-3.5">
        {/* track */}
        <div className="flex min-w-0 items-center gap-3">
          {currentTrack ? (
            <>
              <button
                type="button"
                onClick={() => setNowPlayingOpen(true)}
                className="group relative shrink-0"
                aria-label="Open now playing"
              >
                <Artwork
                  src={currentTrack.cover}
                  alt={currentTrack.album}
                  className="h-[54px] w-[54px] rounded-[8px]"
                  rounded="rounded-[8px]"
                  priority
                />
                <span className="absolute inset-0 grid place-items-center rounded-[8px] bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <ChevronUp size={17} className="text-white" />
                </span>
              </button>
              <div className="min-w-0">
                <button
                  type="button"
                  className="flex max-w-full items-center gap-1.5 text-left"
                  onClick={() => setNowPlayingOpen(true)}
                >
                  <span className="truncate text-[12.5px] font-semibold tracking-[-0.01em] text-[var(--ink)] hover:underline">
                    {currentTrack.title}
                  </span>
                  {currentTrack.video && (
                    <span className="shrink-0 text-[8.5px] uppercase tracking-wider text-[var(--faint)]">Video</span>
                  )}
                </button>
                <p className="mt-0.5 truncate text-[10.5px] text-[var(--muted)]">
                  {currentTrack.artist}
                  <span className="mx-1 text-[var(--faint)]">·</span>
                  <span className="text-[var(--faint)]">{currentTrack.album}</span>
                </p>
              </div>
              <button
                type="button"
                aria-label={liked ? "Unlike" : "Like"}
                onClick={() => toggleLike(currentTrack)}
                className={cn(
                  "ml-1 hidden h-7 w-7 shrink-0 place-items-center rounded-full text-[var(--muted)] transition hover:bg-[var(--hover)] hover:text-[var(--ink)] md:grid",
                  liked && "text-[var(--ink)]",
                )}
              >
                <Heart size={14} className={liked ? "fill-current" : ""} />
              </button>
            </>
          ) : (
            <div className="text-[11px] text-[var(--faint)]">Nothing playing</div>
          )}
        </div>

        {/* center */}
        <div className="flex min-w-0 flex-col items-center justify-center px-2">
          <PlaybackControls />
          <div className="mt-1.5 flex w-full max-w-[520px] items-center gap-2.5">
            <span
              ref={timeTextRef}
              className="w-8 shrink-0 text-right text-[9.5px] tabular-nums text-[var(--faint)]"
            >
              {formatTime(progress)}
            </span>
            <input
              ref={sliderRef}
              aria-label="Seek"
              type="range"
              min={0}
              max={Math.max(1, duration)}
              step={1}
              defaultValue={Math.min(progress, duration || 0)}
              onMouseDown={() => { isSeekingRef.current = true; }}
              onMouseUp={() => { isSeekingRef.current = false; }}
              onTouchStart={() => { isSeekingRef.current = true; }}
              onTouchEnd={() => { isSeekingRef.current = false; }}
              onChange={(event) => {
                const val = Number(event.target.value);
                if (sliderRef.current) {
                  const total = Math.max(1, duration);
                  sliderRef.current.style.setProperty("--progress", `${(val / total) * 100}%`);
                }
                if (timeTextRef.current) {
                  timeTextRef.current.textContent = formatTime(val);
                }
                seek(val);
              }}
              className="slider flex-1"
              style={{ "--progress": `${progressPercent}%` } as CSSProperties}
            />
            <span className="w-8 shrink-0 text-[9.5px] tabular-nums text-[var(--faint)]">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* right */}
        <div className="flex items-center justify-end gap-1">
          <div className="relative mr-1 hidden lg:block" ref={statsRef}>
            <button
              type="button"
              onClick={() => setStatsOpen((value) => !value)}
              title="Show audio stats"
              className={cn(
                "flex h-[24px] items-center gap-1.5 rounded-full border px-2.5 text-[8.5px] font-semibold tracking-[0.06em] transition whitespace-nowrap",
                isLossless
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                  : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--line-strong)] hover:text-[var(--ink)]",
                statsOpen && "ring-1 ring-white/20",
              )}
            >
              <AudioLines size={11} className={isLossless ? "text-emerald-400" : ""} />
              {displayQuality}
              <span className={cn("h-1.5 w-1.5 rounded-full", isLossless ? "bg-emerald-400 animate-pulse" : "bg-[var(--faint)]")} />
            </button>
            {statsOpen && <StatsPopover onClose={() => setStatsOpen(false)} />}
          </div>
          <IconButton
            label="Synced lyrics"
            className="h-8 w-8"
            onClick={() => setNowPlayingOpen(true)}
          >
            <Mic2 size={16} />
          </IconButton>
          <IconButton
            label="Queue"
            active={queueOpen}
            className="relative h-8 w-8"
            onClick={() => setQueueOpen(!queueOpen)}
          >
            <ListMusic size={16} />
            {queue.length > 1 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-3 min-w-3 place-items-center rounded-full bg-[var(--ink)] px-0.5 text-[7px] font-bold text-[var(--canvas)]">
                {Math.max(0, queue.length - 1)}
              </span>
            )}
          </IconButton>
          <VolumeControl />
          <IconButton
            label="Full screen"
            className="ml-0.5 hidden h-8 w-8 xl:grid"
            onClick={() => setNowPlayingOpen(true)}
          >
            <Maximize2 size={15} />
          </IconButton>
        </div>
      </div>
    </div>
  );
}
