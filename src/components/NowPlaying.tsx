import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  ChevronDown,
  Download,
  Heart,
  ListMusic,
  Mic2,
  MoreHorizontal,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Share2,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Check,
  Activity,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useApp } from "../store";
import { lyricsByTrack } from "../data";
import type { LyricLine, Track } from "../types";
import { cn, formatTime, trackFormatBadge, upgradeCoverUrl, useOutsideClick } from "../lib/utils";
import { Artwork } from "./Artwork";
import { Equalizer, IconButton } from "./Primitives";
import { TrackMenu } from "./TrackMenu";
import { getActiveWallpaperUrl } from "../lib/wallpapers";

type Tab = "lyrics" | "queue";

export function NowPlaying() {
  const { nowPlayingOpen, currentTrack } = useApp();
  if (!nowPlayingOpen || !currentTrack) return null;
  return <NowPlayingContent currentTrack={currentTrack} />;
}

function NowPlayingContent({ currentTrack }: { currentTrack: Track }) {
  const {
    nowPlayingOpen,
    setNowPlayingOpen,
    isPlaying,
    togglePlay,
    previous,
    next,
    progress,
    duration,
    seek,
    shuffle,
    toggleShuffle,
    repeatMode,
    cycleRepeat,
    isLiked,
    toggleLike,
    isDownloaded,
    toggleDownload,
    pushToast,
    navigate,
    queue,
    queueLabel,
    playFromQueue,
    volume,
    muted,
    changeVolume,
    toggleMute,
    settings,
    setNerdsStatsOpen,
    upgradeTrackToLossless,
    upgradingLossless,
    openShare,
  } = useApp();

  const [tab, setTab] = useState<Tab>("lyrics");
  const [volumeOpen, setVolumeOpen] = useState(false);
  const volumeRef = useOutsideClick<HTMLDivElement>(() => setVolumeOpen(false), volumeOpen);
  const lyricsContainer = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const npSliderRef = useRef<HTMLInputElement>(null);
  const npTimeTextRef = useRef<HTMLSpanElement>(null);
  const isNpSeekingRef = useRef(false);

  useEffect(() => {
    const onTime = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      const { currentTime, duration: dur } = detail;
      if (npTimeTextRef.current) {
        npTimeTextRef.current.textContent = formatTime(currentTime);
      }
      if (npSliderRef.current && !isNpSeekingRef.current) {
        const total = dur || duration || 1;
        npSliderRef.current.value = String(Math.min(currentTime, total));
        const pct = Math.min(100, (currentTime / total) * 100);
        npSliderRef.current.style.setProperty("--progress", `${pct}%`);
      }
    };
    window.addEventListener("chordly:timeupdate", onTime);
    return () => window.removeEventListener("chordly:timeupdate", onTime);
  }, [duration]);

  const [loadedLyrics, setLoadedLyrics] = useState<{ trackId: string; lines: LyricLine[]; provider?: string } | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsRetryTick, setLyricsRetryTick] = useState(0);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [providerDropdownOpen, setProviderDropdownOpen] = useState(false);
  const providerDropdownRef = useOutsideClick<HTMLDivElement>(
    () => setProviderDropdownOpen(false),
    providerDropdownOpen,
  );

  const AVAILABLE_PROVIDERS = [
    { id: "BetterLyrics", name: "BetterLyrics", desc: "Fast synchronized LRC" },
    { id: "LyricsPlus", name: "LyricsPlus", desc: "Multi-source synchronized" },
    { id: "Musixmatch", name: "Musixmatch", desc: "Official verified lyrics" },
    { id: "Genius", name: "Genius", desc: "Annotated & structured" },
    { id: "LRCLIB", name: "LRCLIB", desc: "Bit-perfect open database" },
    { id: "KuGou", name: "KuGou", desc: "Millisecond synchronized" },
    { id: "Unison", name: "Unison", desc: "Open community lyrics" },
  ];

  const lastTrackIdRef = useRef<string | null>(null);
  if (lastTrackIdRef.current !== currentTrack?.id) {
    lastTrackIdRef.current = currentTrack?.id || null;
    if (selectedProvider) setSelectedProvider(null);
  }

  useEffect(() => {
    if (!currentTrack) {
      setLoadedLyrics(null);
      setLyricsLoading(false);
      return;
    }

    if (!selectedProvider && lyricsByTrack[currentTrack.id]?.length) {
      setLoadedLyrics({ trackId: currentTrack.id, lines: lyricsByTrack[currentTrack.id], provider: "Cached" });
      setLyricsLoading(false);
      return;
    }

    let cancelled = false;
    setLyricsLoading(true);

    const desktop = (window as unknown as { chordlyDesktop?: { lyrics?: { get?: (track: Track, provider?: string) => Promise<any> } } }).chordlyDesktop;
    const getLyrics = desktop?.lyrics?.get || (window as unknown as { chordly?: { getLyrics?: (track: Track, provider?: string) => Promise<any> } }).chordly?.getLyrics;

    if (!getLyrics) {
      setLyricsLoading(false);
      return;
    }

    void getLyrics(currentTrack, selectedProvider || undefined)
      .then((res: any) => {
        if (cancelled) return;
        if (res && res.lines && res.lines.length) {
          if (!selectedProvider) lyricsByTrack[currentTrack.id] = res.lines;
          setLoadedLyrics({ trackId: currentTrack.id, lines: res.lines, provider: res.provider || selectedProvider || "Lyrics" });
        } else {
          setLoadedLyrics({ trackId: currentTrack.id, lines: [], provider: res?.provider || selectedProvider || undefined });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("[chordly] Lyrics fetch error:", err);
        setLoadedLyrics({ trackId: currentTrack.id, lines: [] });
      })
      .finally(() => {
        if (!cancelled) setLyricsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentTrack?.id, lyricsRetryTick, selectedProvider]);

  const lyrics: LyricLine[] = useMemo(() => {
    if (!currentTrack) return [];
    if (loadedLyrics?.trackId === currentTrack.id) return loadedLyrics.lines;
    return lyricsByTrack[currentTrack.id] ?? [];
  }, [currentTrack, loadedLyrics]);
  const formatBadge = currentTrack ? trackFormatBadge(currentTrack) ?? "Audio" : null;
  const activeIndex = useMemo(
    () =>
      settings.syncedLyrics
        ? lyrics.reduce((active: number, line: LyricLine, index: number) => (line.time <= progress + 0.3 ? index : active), -1)
        : -1,
    [lyrics, progress, settings.syncedLyrics],
  );

  useEffect(() => {
    if (!nowPlayingOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNowPlayingOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nowPlayingOpen, setNowPlayingOpen]);

  useEffect(() => {
    if (tab !== "lyrics") return;
    const container = lyricsContainer.current;
    const line = lineRefs.current[activeIndex];
    if (!container || !line) return;
    container.scrollTo({
      top: line.offsetTop - container.clientHeight / 2 + line.clientHeight / 2,
      behavior: settings.reduceMotion ? "auto" : "smooth",
    });
  }, [activeIndex, tab, settings.reduceMotion, nowPlayingOpen]);

  if (!nowPlayingOpen || !currentTrack) return null;

  const upcoming = queue.filter((track) => track.id !== currentTrack.id);
  const liked = isLiked(currentTrack);
  const downloaded = isDownloaded(currentTrack);
  const currentIndex = queue.findIndex((track) => track.id === currentTrack.id);
  const nextUp = queue.slice(currentIndex + 1).length
    ? queue.slice(currentIndex + 1)
    : queue.filter((track) => track.id !== currentTrack.id);

  const share = () => {
    openShare({ track: currentTrack });
  };

  const activeWallpaper = getActiveWallpaperUrl(settings);

  return (
    <div
      className={cn(
        "np-overlay",
        settings.fullScreenCover && "np-full-art",
        settings.nowPlayingGlass && "np-glass-mode",
      )}
      style={{
        backgroundColor: settings.nowPlayingGlass
          ? `rgba(6, 6, 8, ${settings.nowPlayingOpacity ?? 0.6})`
          : undefined,
        backdropFilter: settings.nowPlayingGlass
          ? `blur(${settings.nowPlayingBlur ?? 36}px) saturate(135%)`
          : undefined,
        WebkitBackdropFilter: settings.nowPlayingGlass
          ? `blur(${settings.nowPlayingBlur ?? 36}px) saturate(135%)`
          : undefined,
      }}
    >
      {/* Blurred transparentish custom background */}
      {activeWallpaper ? (
        <>
          <img
            src={activeWallpaper}
            alt=""
            className="np-custom-wallpaper"
            style={{
              filter: `blur(${settings.nowPlayingBlur ?? 36}px) brightness(0.52) saturate(1.25)`,
            }}
          />
          {/* Chromatic ambient glow from the current album cover */}
          <img
            src={upgradeCoverUrl(currentTrack.cover)}
            alt=""
            className="np-bg-ambient-tint"
            style={{ filter: "blur(140px) saturate(1.4)", opacity: 0.35 }}
          />
        </>
      ) : (
        <img
          src={upgradeCoverUrl(currentTrack.cover)}
          alt=""
          className="np-bg"
          style={{
            filter: `blur(${settings.nowPlayingBlur ?? 36}px) saturate(1.1) brightness(0.4)`,
            opacity: 0.72,
          }}
        />
      )}
      <div className={cn("np-scrim", activeWallpaper && "np-scrim-wallpaper")} />
      <div className="grain !z-[2]" />

      <header className="np-top">
        <button
          type="button"
          onClick={() => setNowPlayingOpen(false)}
          className="flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3.5 text-[11px] font-medium text-white/70 backdrop-blur transition hover:bg-white/[0.12] hover:text-white"
        >
          <ChevronDown size={15} /> Close
        </button>
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
          <Equalizer paused={!isPlaying} /> Now playing
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[8.5px] font-semibold uppercase tracking-[0.14em] text-white/55 sm:flex">
            <span className="h-1 w-1 rounded-full bg-white/80" />
            Windows shared
          </span>
          <button
            type="button"
            onClick={() => setTab("queue")}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-white/60 transition hover:bg-white/[0.12] hover:text-white"
            aria-label="Show queue"
          >
            <ListMusic size={15} />
          </button>
          <button
            type="button"
            onClick={() => setNerdsStatsOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-white/60 transition hover:bg-white/[0.12] hover:text-white"
            title="Stats for Nerds (Shift+N)"
            aria-label="Stats for nerds"
          >
            <Activity size={15} />
          </button>
          <TrackMenu
            track={currentTrack}
            queue={queue}
            queueLabel={queueLabel}
            triggerClassName="h-9 w-9 border border-white/10 bg-white/[0.05] text-white/60 hover:bg-white/[0.12] hover:text-white"
            trigger={<MoreHorizontal size={16} />}
          />
        </div>
      </header>

      <div className="np-main">
        <section className="np-left">
          <div className="np-art">
            <div className="np-art-glow" />
            <Artwork
              src={currentTrack.cover}
              alt={currentTrack.album}
              className="np-cover aspect-square w-full rounded-[20px]"
              rounded="rounded-[20px]"
              priority
            />
            {formatBadge && <span className="np-art-badge">{formatBadge}</span>}
          </div>

          <div className="mt-7 w-full max-w-[430px]">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-white/40">
                  Playing from {queueLabel}
                </p>
                <h1 className="text-balance text-[clamp(28px,3vw,40px)] font-semibold leading-[1.02] tracking-[-0.05em] text-white">
                  {currentTrack.title}
                </h1>
                <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-white/55">
                  <button
                    type="button"
                    className="font-medium text-white/80 transition hover:text-white hover:underline"
                    onClick={() =>
                      navigate({
                        name: "collection",
                        kind: "artist",
                        id: currentTrack.artistId,
                        title: currentTrack.artist,
                        cover: currentTrack.cover,
                      })
                    }
                  >
                    {currentTrack.artist}
                  </button>
                  <span className="text-white/25">·</span>
                  <button
                    type="button"
                    className="transition hover:text-white hover:underline"
                    onClick={() =>
                      navigate({
                        name: "collection",
                        kind: "album",
                        id: currentTrack.albumId,
                        title: currentTrack.album,
                        artist: currentTrack.artist,
                        cover: currentTrack.cover,
                      })
                    }
                  >
                    {currentTrack.album}
                  </button>
                  <span className="text-white/25">·</span>
                  <span>{currentTrack.year}</span>
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {currentTrack.lossless || currentTrack.format === "flac" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                      <Check size={12} /> Bit-Perfect Lossless ({currentTrack.format?.toUpperCase() || "FLAC"})
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void upgradeTrackToLossless()}
                      disabled={upgradingLossless}
                      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/50 bg-emerald-500/20 px-3.5 py-1 text-[10.5px] font-bold uppercase tracking-wider text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)] transition hover:bg-emerald-500/30 hover:border-emerald-400 active:scale-95 disabled:opacity-50"
                      title="Force upgrade quality by finding bit-perfect FLAC from connected addons"
                    >
                      {upgradingLossless ? (
                        <Loader2 size={12} className="animate-spin text-emerald-300" />
                      ) : (
                        <Sparkles size={12} className="text-emerald-300" />
                      )}
                      {upgradingLossless ? "Finding on Addons…" : "Force Upgrade Quality (Find on Addons)"}
                    </button>
                  )}
                  {currentTrack.source && (
                    <span className="text-[10px] text-white/40">via {currentTrack.source}</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                aria-label={liked ? "Unlike" : "Like"}
                onClick={() => toggleLike(currentTrack)}
                className={cn(
                  "mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 text-white/60 transition hover:border-white/25 hover:text-white",
                  liked && "border-white/30 bg-white/10 text-white",
                )}
              >
                <Heart size={15} className={liked ? "fill-current" : ""} />
              </button>
            </div>

            <div className="mt-6">
              <input
                ref={npSliderRef}
                type="range"
                aria-label="Seek"
                min={0}
                max={Math.max(1, duration)}
                step={1}
                defaultValue={Math.min(progress, duration || 0)}
                onMouseDown={() => { isNpSeekingRef.current = true; }}
                onMouseUp={() => { isNpSeekingRef.current = false; }}
                onTouchStart={() => { isNpSeekingRef.current = true; }}
                onTouchEnd={() => { isNpSeekingRef.current = false; }}
                onChange={(event) => {
                  const val = Number(event.target.value);
                  if (npSliderRef.current) {
                    const total = Math.max(1, duration);
                    npSliderRef.current.style.setProperty("--progress", `${(val / total) * 100}%`);
                  }
                  if (npTimeTextRef.current) {
                    npTimeTextRef.current.textContent = formatTime(val);
                  }
                  seek(val);
                }}
                className="slider np-slider"
                style={{ "--progress": `${duration ? (progress / duration) * 100 : 0}%` } as CSSProperties}
              />
              <div className="mt-1 flex justify-between text-[9.5px] tabular-nums text-white/40">
                <span ref={npTimeTextRef}>{formatTime(progress)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <IconButton
                  label="Shuffle"
                  onClick={toggleShuffle}
                  className={cn("h-9 w-9 text-white/55 hover:bg-white/10 hover:text-white", shuffle && "bg-white/10 text-white")}
                >
                  <Shuffle size={15} />
                </IconButton>
                <IconButton label="Previous" onClick={previous} className="h-10 w-10 text-white/70 hover:bg-white/10 hover:text-white">
                  <SkipBack size={19} fill="currentColor" />
                </IconButton>
                <button
                  type="button"
                  aria-label={isPlaying ? "Pause" : "Play"}
                  onClick={togglePlay}
                  className="mx-1 grid h-[56px] w-[56px] place-items-center rounded-full bg-white text-black shadow-[0_10px_30px_rgba(0,0,0,0.4)] transition hover:scale-105 active:scale-95"
                >
                  {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-[3px]" />}
                </button>
                <IconButton label="Next" onClick={next} className="h-10 w-10 text-white/70 hover:bg-white/10 hover:text-white">
                  <SkipForward size={19} fill="currentColor" />
                </IconButton>
                <IconButton
                  label="Repeat"
                  onClick={cycleRepeat}
                  className={cn("h-9 w-9 text-white/55 hover:bg-white/10 hover:text-white", repeatMode !== "off" && "bg-white/10 text-white")}
                >
                  {repeatMode === "one" ? <Repeat1 size={15} /> : <Repeat size={15} />}
                </IconButton>
              </div>

              <div className="flex items-center gap-1">
                <div className="relative" ref={volumeRef}>
                  <IconButton
                    label="Volume"
                    onClick={() => setVolumeOpen((value) => !value)}
                    className="h-9 w-9 text-white/50 hover:bg-white/10 hover:text-white"
                  >
                    {muted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  </IconButton>
                  {volumeOpen && (
                    <div className="absolute bottom-[calc(100%+8px)] right-0 flex w-36 items-center gap-2 rounded-full border border-white/10 bg-black/70 px-3 py-2 backdrop-blur-xl">
                      <button type="button" aria-label="Mute" onClick={toggleMute} className="text-white/60 hover:text-white">
                        {muted || volume === 0 ? <VolumeX size={13} /> : <Volume2 size={13} />}
                      </button>
                      <input
                        type="range"
                        aria-label="Volume"
                        min={0}
                        max={1}
                        step={0.01}
                        value={muted ? 0 : volume}
                        onChange={(event) => changeVolume(Number(event.target.value))}
                        className="slider flex-1"
                        style={{ "--progress": `${(muted ? 0 : volume) * 100}%` } as CSSProperties}
                      />
                    </div>
                  )}
                </div>
                <IconButton
                  label={downloaded ? "Remove download" : "Download"}
                  onClick={() => toggleDownload(currentTrack)}
                  className={cn("h-9 w-9 text-white/50 hover:bg-white/10 hover:text-white", downloaded && "text-white")}
                >
                  <Download size={15} />
                </IconButton>
                <IconButton label="Share" onClick={share} className="h-9 w-9 text-white/50 hover:bg-white/10 hover:text-white">
                  <Share2 size={15} />
                </IconButton>
              </div>
            </div>
          </div>
        </section>

        <section className="np-right">
          <div className="np-tabs">
            <button
              type="button"
              onClick={() => setTab("lyrics")}
              className={cn("np-tab", tab === "lyrics" && "np-tab-active")}
            >
              <Mic2 size={14} /> Lyrics
            </button>
            <button
              type="button"
              onClick={() => setTab("queue")}
              className={cn("np-tab", tab === "queue" && "np-tab-active")}
            >
              <ListMusic size={14} /> Up next
              <span className="rounded-full bg-white/10 px-1.5 py-[1px] text-[8.5px] tabular-nums text-white/60">
                {upcoming.length}
              </span>
            </button>
            <div className="relative ml-auto hidden items-center sm:flex" ref={providerDropdownRef}>
              <button
                type="button"
                onClick={() => setProviderDropdownOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] uppercase tracking-[0.14em] text-white/70 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                title="Change lyrics provider (BetterLyrics, LyricsPlus, Musixmatch, Genius, LRCLIB...)"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${lyrics.length ? "bg-emerald-400" : "bg-white/40"}`} />
                <span>
                  {loadedLyrics?.provider || selectedProvider || (settings.syncedLyrics ? "BetterLyrics" : "Lyrics")}
                  {loadedLyrics?.lines?.some((l: LyricLine) => l.time > 0) ? " · Synced" : ""}
                </span>
                <ChevronDown size={11} className={cn("text-white/40 transition-transform", providerDropdownOpen && "rotate-180")} />
              </button>

              {providerDropdownOpen && (
                <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-52 rounded-xl border border-white/15 bg-black/90 p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.6)] backdrop-blur-2xl animate-fade-in">
                  <div className="px-2 py-1 text-[8.5px] font-semibold uppercase tracking-[0.12em] text-white/40">
                    Select Lyrics Provider
                  </div>
                  <div className="space-y-0.5">
                    {AVAILABLE_PROVIDERS.map((p) => {
                      const isCurrent = (loadedLyrics?.provider || selectedProvider || "BetterLyrics") === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedProvider(p.id);
                            setLyricsLoading(true);
                            setLyricsRetryTick((t) => t + 1);
                            setProviderDropdownOpen(false);
                          }}
                          className={cn(
                            "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[11px] transition hover:bg-white/10",
                            isCurrent ? "bg-white/10 font-semibold text-white" : "text-white/70",
                          )}
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span>{p.name}</span>
                              {["BetterLyrics", "LyricsPlus", "Musixmatch", "Genius"].includes(p.id) && (
                                <span className="rounded bg-white/10 px-1 py-[0.5px] text-[7.5px] uppercase tracking-wider text-white/60">
                                  Default
                                </span>
                              )}
                            </div>
                            <div className="text-[9px] text-white/40">{p.desc}</div>
                          </div>
                          {isCurrent && <Check size={12} className="text-emerald-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {tab === "lyrics" ? (
            lyricsLoading ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center animate-fade-in">
                <Loader2 size={24} className="animate-spin text-white/50" />
                <p className="mt-4 text-[13.5px] font-semibold text-white/80">Fetching synchronized lyrics…</p>
                <p className="mt-1 text-[10.5px] text-white/40">Querying multi-provider lyrics cascade</p>
              </div>
            ) : lyrics.length > 0 ? (
              <div ref={lyricsContainer} className="np-lyrics scrollbar">
                <div className="py-[38%]">
                  {lyrics.map((line: LyricLine, index: number) => (
                    <button
                      key={`${line.time}-${index}`}
                      type="button"
                      ref={(element) => {
                        lineRefs.current[index] = element;
                      }}
                      onClick={() => seek(line.time)}
                      className={cn(
                        "lyrics-line block w-full py-2 text-left text-[clamp(19px,2.1vw,26px)] font-semibold leading-[1.35] tracking-[-0.025em]",
                        index === activeIndex ? "active" : settings.lyricsBlur ? "idle" : "",
                        index < activeIndex && "opacity-30",
                        index > activeIndex && "opacity-55",
                      )}
                    >
                      {line.text}
                    </button>
                  ))}
                  <div className="pb-14 pt-8 text-center text-[9px] uppercase tracking-[0.12em] text-white/25">
                    Lyrics provided by {loadedLyrics?.provider || "Community Providers"} · Credit to KuGou, LRCLIB, Musixmatch, Genius, Unison, BetterLyrics, PaxSenix, SimpMusic, lrc.red, BiniLyrics & LyricsPlus
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center animate-fade-in">
                <div className="grid h-14 w-14 place-items-center rounded-full border border-white/10 text-white/30">
                  <Mic2 size={21} />
                </div>
                <p className="mt-5 text-[15px] font-semibold tracking-[-0.02em] text-white/85">No synchronized lyrics found</p>
                <p className="mt-1.5 max-w-[340px] text-[11px] leading-relaxed text-white/40">
                  Searched KuGou, LRCLIB, Musixmatch, Genius, Unison, and NetEase databases for &ldquo;{currentTrack.title}&rdquo; by {currentTrack.artist}.
                </p>
                <button
                  type="button"
                  onClick={() => setLyricsRetryTick((t) => t + 1)}
                  className="mt-5 flex h-8 items-center gap-2 rounded-full border border-white/15 px-3.5 text-[10.5px] font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  <Sparkles size={12} />
                  Retry search
                </button>
              </div>
            )
          ) : (
            <div className="np-queue scrollbar">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                  Now playing
                </p>
                <span className="text-[9.5px] tabular-nums text-white/30">{upcoming.length} up next</span>
              </div>
              <div className="np-queue-current">
                <Artwork src={currentTrack.cover} alt="" className="h-11 w-11 rounded-md" rounded="rounded-md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-white">{currentTrack.title}</p>
                  <p className="truncate text-[10px] text-white/45">{currentTrack.artist}</p>
                </div>
                <span className="text-[9px] uppercase tracking-[0.12em] text-white/35">Playing</span>
              </div>
              <div className="mt-4 flex flex-col">
                {nextUp.map((track, index) => (
                  <button
                    key={`${track.id}-${index}`}
                    type="button"
                    onClick={() => playFromQueue(track.id)}
                    className="group flex items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-white/[0.06]"
                  >
                    <span className="w-4 text-right text-[9.5px] tabular-nums text-white/25 group-hover:hidden">
                      {index + 1}
                    </span>
                    <span className="hidden w-4 text-white group-hover:block">
                      <Play size={10} fill="currentColor" />
                    </span>
                    <Artwork src={track.cover} alt="" className="h-9 w-9 rounded" rounded="rounded" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11.5px] font-medium text-white/80 group-hover:text-white">
                        {track.title}
                      </span>
                      <span className="block truncate text-[9.5px] text-white/35">{track.artist}</span>
                    </span>
                    <span className="text-[9px] tabular-nums text-white/25">{formatTime(track.duration)}</span>
                  </button>
                ))}
                {!nextUp.length && (
                  <div className="py-16 text-center text-[11px] text-white/35">
                    <Check size={18} className="mx-auto mb-2 opacity-50" />
                    You've reached the end of the queue.
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
