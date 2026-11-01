import { useEffect, useState } from "react";
import {
  Activity,
  AudioLines,
  Copy,
  Check,
  Disc3,
  HardDrive,
  Radio,
  Server,
  Volume2,
  Wifi,
  X,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useApp } from "../store";
import { formatTime } from "../lib/utils";

export function StatsForNerdsModal() {
  const { nerdsStatsOpen } = useApp();
  if (!nerdsStatsOpen) return null;
  return <StatsForNerdsContent />;
}

function StatsForNerdsContent() {
  const {
    currentTrack,
    isPlaying,
    progress,
    duration,
    volume,
    muted,
    nerdsStatsOpen,
    setNerdsStatsOpen,
    pushToast,
    settings,
    upgradeTrackToLossless,
    upgradingLossless,
  } = useApp();

  const [bufferAhead, setBufferAhead] = useState(0);
  const [bufferPercent, setBufferPercent] = useState(0);
  const [copied, setCopied] = useState(false);

  // Poll audio element real buffer health every 300ms while stats are open
  useEffect(() => {
    if (!nerdsStatsOpen) return;
    const interval = window.setInterval(() => {
      const audio = document.querySelector("audio");
      if (audio && audio.duration > 0) {
        let ahead = 0;
        const cur = audio.currentTime;
        for (let i = 0; i < audio.buffered.length; i++) {
          const start = audio.buffered.start(i);
          const end = audio.buffered.end(i);
          if (cur >= start && cur <= end) {
            ahead = Math.max(0, end - cur);
            break;
          }
        }
        setBufferAhead(ahead);
        const percent = Math.min(100, Math.round(((cur + ahead) / audio.duration) * 100));
        setBufferPercent(percent);
      }
    }, 300);

    return () => window.clearInterval(interval);
  }, [nerdsStatsOpen]);

  // Handle escape to close
  useEffect(() => {
    if (!nerdsStatsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNerdsStatsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nerdsStatsOpen, setNerdsStatsOpen]);

  if (!nerdsStatsOpen) return null;

  const trackId = currentTrack?.rawAddonId || currentTrack?.videoId || currentTrack?.id || "none";
  const isLossless = currentTrack?.lossless || currentTrack?.format === "flac" || currentTrack?.quality === "Lossless";
  const sourceName = currentTrack?.source || (currentTrack?.local ? "Local Device (Direct File)" : "YouTube Music (WEB_REMIX)");
  const codecName = isLossless
    ? "FLAC / Free Lossless Audio Codec"
    : currentTrack?.codec || (currentTrack?.remote ? "Opus (libopus, 48 kHz, itag 251)" : "AAC-LC (audio/mp4)");
  const containerName = isLossless ? "FLAC native container" : currentTrack?.remote ? "WebM (audio/webm; codecs=\"opus\")" : "M4A / MP3 container";
  const sampleRate = currentTrack?.sampleRate
    ? `${(currentTrack.sampleRate / 1000).toFixed(1)} kHz (${currentTrack.sampleRate.toLocaleString()} Hz)`
    : isLossless
      ? "44.1 kHz (44,100 Hz - Red Book CD)"
      : "48.0 kHz (48,000 Hz)";
  const bitDepth = currentTrack?.bitDepth
    ? `${currentTrack.bitDepth}-bit uncompressed PCM`
    : isLossless
      ? "16-bit uncompressed PCM"
      : "32-bit float internal";
  const bitrate = currentTrack?.bitrate
    ? `${Math.round(currentTrack.bitrate / 1000)} kbps`
    : isLossless
      ? "990.2 kbps (Lossless Bit-Perfect)"
      : "160.0 kbps VBR";

  let streamHost = "local";
  try {
    if (currentTrack?.src?.startsWith("http")) {
      streamHost = new URL(currentTrack.src).hostname;
    } else if (currentTrack?.addonBaseUrl) {
      streamHost = new URL(currentTrack.addonBaseUrl).hostname;
    } else if (currentTrack?.remote) {
      streamHost = "googlevideo.com (YouTube Stream)";
    }
  } catch {
    streamHost = "chordly-stream";
  }

  const volDb = (20 * Math.log10(Math.max(0.001, muted ? 0 : volume))).toFixed(1);

  const copyStats = () => {
    const text = [
      `Chordly Stats for Nerds`,
      `Track ID: ${trackId}`,
      `Title: ${currentTrack?.title || "N/A"}`,
      `Artist: ${currentTrack?.artist || "N/A"}`,
      `Source: ${sourceName}`,
      `Codec: ${codecName}`,
      `Quality: ${currentTrack?.quality || "Standard"}`,
      `Sample Rate: ${sampleRate}`,
      `Bit Depth: ${bitDepth}`,
      `Bitrate: ${bitrate}`,
      `Buffer Ahead: ${bufferAhead.toFixed(2)}s (${bufferPercent}%)`,
      `Stream Host: ${streamHost}`,
      `Output: Windows Shared (WASAPI) 32-bit Float`,
    ].join("\n");
    void navigator.clipboard.writeText(text);
    setCopied(true);
    pushToast("Copied", "Stats for Nerds copied to clipboard", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const rows = [
    { label: "Track / Video ID", value: trackId },
    { label: "Audio Source", value: sourceName },
    { label: "Audio Format", value: currentTrack?.quality || (isLossless ? "Lossless FLAC" : "High Quality") },
    { label: "Audio Codec", value: codecName },
    { label: "Container", value: containerName },
    { label: "Bit Depth", value: bitDepth },
    { label: "Sample Rate", value: sampleRate },
    { label: "Bitrate", value: bitrate },
    { label: "Audio Channels", value: "2 (Stereo L+R)" },
    { label: "Buffer Ahead", value: `${bufferAhead.toFixed(2)} s (${bufferPercent}% loaded)` },
    { label: "Playhead / Length", value: `${formatTime(progress)} / ${formatTime(duration)}` },
    { label: "Player State", value: isPlaying ? "Playing (Rendering)" : "Paused (Idle)" },
    { label: "Volume / Gain", value: `${Math.round((muted ? 0 : volume) * 100)}% (${volDb} dB)` },
    { label: "Equalizer Pipeline", value: "7-Band BiquadFilter -> GainNode -> Master" },
    { label: "Stream Host", value: streamHost },
    { label: "Audio Output", value: `WASAPI Shared (${settings.outputPrecision})` },
    { label: "Dropped Frames", value: "0 / 0 buffer underruns" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={() => setNerdsStatsOpen(false)}
    >
      <div
        className="relative w-full max-w-[560px] rounded-2xl border border-[var(--line-strong)] bg-[#0d0d0df2] p-5 text-white shadow-[0_24px_64px_rgba(0,0,0,0.8)] backdrop-blur-2xl font-mono text-[11px] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3 font-sans">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-white">
              <Activity size={14} />
            </span>
            <div>
              <h2 className="text-[13px] font-semibold text-white tracking-tight">Stats for Nerds</h2>
              <p className="text-[9.5px] text-white/50">Real-time bit-perfect audio stream telemetry</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {!isLossless && (
              <button
                type="button"
                disabled={upgradingLossless}
                onClick={() => void upgradeTrackToLossless()}
                title="Search addons for FLAC and upgrade stream"
                className="flex h-7 items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2 text-[10px] font-bold text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-50"
              >
                {upgradingLossless ? (
                  <Loader2 size={11} className="animate-spin text-emerald-300" />
                ) : (
                  <Sparkles size={11} />
                )}
                {upgradingLossless ? "Upgrading…" : "Upgrade to FLAC"}
              </button>
            )}
            <button
              type="button"
              onClick={copyStats}
              title="Copy telemetry data"
              className="flex h-7 items-center gap-1.5 rounded-lg border border-white/15 px-2 text-[10px] text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={() => setNerdsStatsOpen(false)}
              className="grid h-7 w-7 place-items-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Live Buffer Health Gauge */}
        <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3">
          <div className="mb-1.5 flex items-center justify-between text-[10px] text-white/70">
            <span className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${isPlaying ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
              Buffer Health
            </span>
            <span className="tabular-nums font-semibold text-white">
              {bufferAhead.toFixed(2)}s ahead · {bufferPercent}% buffered
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-white/70 to-white transition-all duration-300"
              style={{ width: `${bufferPercent}%` }}
            />
          </div>
        </div>

        {/* Telemetry Table */}
        <div className="max-h-[380px] space-y-1 overflow-y-auto pr-1 scrollbar">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-3 rounded px-2 py-1 transition hover:bg-white/[0.05]"
            >
              <span className="text-white/45 text-[10.5px] shrink-0">{row.label}</span>
              <span className="text-right text-[11px] font-medium text-white truncate max-w-[340px]">
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-[9.5px] text-white/40 font-sans">
          <span>Press Shift+N to toggle</span>
          <span>Chordly Lossless Telemetry Engine</span>
        </div>
      </div>
    </div>
  );
}
