import { useEffect } from "react";
import { useApp } from "./store";
import { cover } from "./data";
import { codecLabel, formatBitrate, formatSampleRate, isEditableElement, upgradeCoverUrl, cn } from "./lib/utils";
import { getActiveWallpaperUrl } from "./lib/wallpapers";
import { TitleBar } from "./components/TitleBar";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { PlayerBar } from "./components/PlayerBar";
import { NowPlaying } from "./components/NowPlaying";
import { QueuePanel } from "./components/QueuePanel";
import { ModalHost, ToastHost } from "./components/ModalHost";
import { Home } from "./pages/Home";
import { Explore } from "./pages/Explore";
import { Library } from "./pages/Library";
import { Search } from "./pages/Search";
import { Collection } from "./pages/Collection";
import { Settings } from "./pages/Settings";

function CurrentPage() {
  const { view } = useApp();
  switch (view.name) {
    case "home":
      return <Home />;
    case "explore":
      return <Explore />;
    case "library":
      return <Library />;
    case "search":
      return <Search />;
    case "settings":
      return <Settings />;
    case "collection":
      return <Collection />;
    default:
      return <Home />;
  }
}

function NerdsOverlay() {
  const { settings, currentTrack } = useApp();
  if (!settings.showStats || !currentTrack) return null;
  const lossless = currentTrack.quality === "Lossless";
  const codec = codecLabel(currentTrack.codec) ?? (lossless ? "FLAC" : "AAC");
  const depthRate =
    currentTrack.bitDepth || currentTrack.sampleRate
      ? `${currentTrack.bitDepth ? `${currentTrack.bitDepth}-bit` : "—"}${
          currentTrack.sampleRate ? ` / ${formatSampleRate(currentTrack.sampleRate)}` : ""
        }`
      : lossless
        ? "24-bit / 192 kHz"
        : "16-bit / 44.1 kHz";
  const bitrate = formatBitrate(currentTrack.bitrate) ?? (lossless ? "4,608 kbps" : "256 kbps");
  return (
    <div className="pointer-events-none fixed bottom-[102px] right-3 z-[35] hidden w-[250px] rounded-xl border border-[var(--line-strong)] bg-[var(--glass-strong)]/95 px-3 py-2.5 shadow-[var(--shadow)] backdrop-blur-2xl md:block">
      <p className="mb-1.5 flex items-center justify-between text-[8px] font-semibold uppercase tracking-[0.14em] text-[var(--faint)]">
        <span>Stats for nerds</span>
        <span className="flex items-center gap-1 text-[var(--muted)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--ink)]" />
          Windows shared
        </span>
      </p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9px]">
        <span className="text-[var(--faint)]">Codec</span>
        <span className="truncate text-right font-medium tabular-nums" title={codec}>
          {codec}
        </span>
        <span className="text-[var(--faint)]">Depth / rate</span>
        <span className="text-right font-medium tabular-nums">{depthRate}</span>
        <span className="text-[var(--faint)]">Bitrate</span>
        <span className="text-right font-medium tabular-nums">{bitrate}</span>
        <span className="text-[var(--faint)]">Precision</span>
        <span className="text-right font-medium tabular-nums">{settings.outputPrecision}</span>
        <span className="text-[var(--faint)]">Buffer</span>
        <span className="text-right font-medium tabular-nums">Automatic</span>
      </div>
    </div>
  );
}

export default function App() {
  const {
    view,
    currentTrack,
    settings,
    modal,
    closeModal,
    openModal,
    nowPlayingOpen,
    setNowPlayingOpen,
    queueOpen,
    setQueueOpen,
    toggleNerdsStats,
    openSearch,
    togglePlay,
    next,
    previous,
    seek,
    seekBy,
    volume,
    changeVolume,
    toggleMute,
    toggleLike,
  } = useApp();

  /* keyboard shortcuts --------------------------------------------- */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isEditableElement(event.target)) {
        if (event.key === "Escape") (event.target as HTMLElement).blur();
        return;
      }

      if (modal) {
        if (event.key === "Escape") closeModal();
        return;
      }

      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch();
        return;
      }

      if (event.key === "Escape") {
        if (nowPlayingOpen) setNowPlayingOpen(false);
        else if (queueOpen) setQueueOpen(false);
        return;
      }

      if (mod && event.key === "ArrowRight") {
        event.preventDefault();
        next();
        return;
      }
      if (mod && event.key === "ArrowLeft") {
        event.preventDefault();
        previous();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        seekBy(5);
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        seekBy(-5);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        changeVolume(volume + 0.05);
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        changeVolume(volume - 0.05);
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        if (!event.repeat) togglePlay();
        return;
      }
      if (mod || event.altKey || event.repeat) return;

      if (event.shiftKey && event.key === "?") {
        event.preventDefault();
        openModal("shortcuts");
        return;
      }

      switch (event.key.toLowerCase()) {
        case "m":
          toggleMute();
          break;
        case "l":
          if (currentTrack) toggleLike(currentTrack);
          break;
        case "q":
          setQueueOpen(!queueOpen);
          break;
        case "n":
          if (event.shiftKey) {
            toggleNerdsStats();
          } else if (currentTrack) {
            setNowPlayingOpen(!nowPlayingOpen);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    closeModal,
    currentTrack,
    modal,
    next,
    nowPlayingOpen,
    openModal,
    openSearch,
    previous,
    queueOpen,
    seek,
    seekBy,
    setNowPlayingOpen,
    setQueueOpen,
    toggleLike,
    toggleMute,
    togglePlay,
    toggleNerdsStats,
    volume,
    changeVolume,
  ]);

  /* Pause all animations & videos when hidden or minimized to reach <1% idle CPU */
  useEffect(() => {
    const handleVisibility = () => {
      const isHidden = document.visibilityState === "hidden";
      document.documentElement.classList.toggle("app-hidden", isHidden);
      const videos = document.querySelectorAll("video");
      videos.forEach((v) => {
        if (isHidden && !v.paused) {
          v.pause();
          v.dataset.wasPlaying = "true";
        } else if (!isHidden && v.dataset.wasPlaying === "true") {
          delete v.dataset.wasPlaying;
          void v.play().catch(() => {});
        }
      });
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const activeWallpaper = getActiveWallpaperUrl(settings);

  return (
    <>
      <div
        className={cn(
          "ambient",
          (activeWallpaper || settings.bgType === "color") && "ambient-custom-active",
        )}
        aria-hidden="true"
      >
        {activeWallpaper ? (
          <div className="ambient-custom-wrap">
            <img
              src={activeWallpaper}
              alt=""
              className="ambient-custom-art"
              style={{
                filter: `blur(${settings.bgBlur || 0}px)`,
                opacity: settings.bgOpacity ?? 0.82,
              }}
            />
            {currentTrack?.cover && (
              <img
                key={currentTrack.cover}
                src={upgradeCoverUrl(currentTrack.cover)}
                alt=""
                className="ambient-track-glow"
              />
            )}
            <div className="ambient-custom-dim" />
          </div>
        ) : settings.bgType === "color" ? (
          <div
            className="ambient-color-fill"
            style={{ backgroundColor: settings.bgColor || "#070709" }}
          />
        ) : (
          <img
            key={currentTrack?.cover ?? "default"}
            src={upgradeCoverUrl(currentTrack?.cover) || cover(2)}
            alt=""
            className="ambient-art"
          />
        )}
      </div>

      <div className="app-shell">
        <TitleBar />
        <div className="app-body">
          <Sidebar />
          <main className="main-panel">
            <div className="page-scroll">
              <TopBar />
              <div key={`${view.name}-${view.name === "collection" ? `${view.kind}-${view.id ?? ""}` : ""}`}>
                <CurrentPage />
              </div>
            </div>
          </main>
        </div>
        <NerdsOverlay />
        <PlayerBar />
        <NowPlaying />
        <QueuePanel />
      </div>

      <ModalHost />
      <ToastHost />
    </>
  );
}
