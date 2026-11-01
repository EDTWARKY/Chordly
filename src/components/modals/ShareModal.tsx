import { useState, useRef } from "react";
import { Check, Copy, ExternalLink, Image as ImageIcon, Radio, Share2, Sparkles } from "lucide-react";
import { useApp } from "../../store";
import { Modal } from "./Modal";
import { ChordlyLogo, ChordlyMark } from "../Logo";
import { formatTime } from "../../lib/utils";
import type { Track, Playlist } from "../../types";

interface ShareModalProps {
  track?: Track | null;
  playlist?: Playlist | null;
}

export function ShareModal({ track: propTrack, playlist: propPlaylist }: ShareModalProps) {
  const { closeModal, pushToast, currentTrack, progress, partyRoom, broadcastPartyState } = useApp();
  const track = propTrack ?? currentTrack;
  const playlist = propPlaylist ?? null;

  const [includeTimestamp, setIncludeTimestamp] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  if (!track && !playlist) {
    return (
      <Modal title="Share" eyebrow="Share music" onClose={closeModal} size="sm">
        <p className="text-[12px] text-[var(--faint)]">No song or playlist selected to share.</p>
      </Modal>
    );
  }

  const currentTime = Math.floor(progress || 0);

  // Compute Base URL
  const videoId = track?.videoId || (track?.src?.includes("youtube") ? track.id : track?.id);
  const rawUrl = track
    ? `https://music.youtube.com/watch?v=${videoId}`
    : `https://music.youtube.com/playlist?list=${playlist?.id}`;

  const shareUrl = track && includeTimestamp && currentTime > 0
    ? `${rawUrl}&t=${currentTime}s`
    : rawUrl;

  const formattedText = track
    ? `🎵 Listening to "${track.title}" by ${track.artist} on Chordly — ${shareUrl}`
    : `🎶 Check out playlist "${playlist?.name}" on Chordly — ${shareUrl}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      pushToast("Link copied to clipboard", shareUrl, "success");
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      pushToast("Failed to copy link", "", "error");
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(formattedText);
      setCopiedText(true);
      pushToast("Formatted text copied", "Ready to paste in Discord or chats", "success");
      setTimeout(() => setCopiedText(false), 2500);
    } catch {
      pushToast("Failed to copy text", "", "error");
    }
  };

  const handleBroadcastParty = () => {
    if (!partyRoom) {
      pushToast("No active party", "Join or start a party room first", "default");
      return;
    }
    if (track) {
      broadcastPartyState(track, progress, true);
      pushToast("Broadcast to party", `Now playing: ${track.title}`, "success");
    }
  };

  const handleCopyCardImage = async () => {
    if (!track) return;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 640, 360);
      grad.addColorStop(0, "#141416");
      grad.addColorStop(1, "#08080a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 360);

      // Card border
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 10, 620, 340);

      // Draw artwork
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = track.cover;
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });

      if (img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(36, 40, 180, 180);
        ctx.clip();
        ctx.drawImage(img, 36, 40, 180, 180);
        ctx.restore();
      }

      // Title & Artist
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 26px sans-serif";
      ctx.fillText(track.title.slice(0, 26), 240, 90);

      ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
      ctx.font = "18px sans-serif";
      ctx.fillText(track.artist.slice(0, 32), 240, 125);

      if (track.album) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.font = "14px sans-serif";
        ctx.fillText(track.album.slice(0, 36), 240, 155);
      }

      // Watermark
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText("CHORDLY", 36, 310);
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.font = "13px sans-serif";
      ctx.fillText("• Lossless Desktop Player", 125, 310);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          setCopiedImage(true);
          pushToast("Share card copied", "Image copied to clipboard", "success");
          setTimeout(() => setCopiedImage(false), 2500);
        } catch {
          pushToast("Image copy error", "Clipboard permissions needed", "error");
        }
      }, "image/png");
    } catch {
      pushToast("Could not generate share image", "", "error");
    }
  };

  return (
    <Modal
      title={track ? "Share song" : "Share playlist"}
      eyebrow="Share"
      description="Share this music with friends or broadcast to your active party."
      onClose={closeModal}
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          {partyRoom ? (
            <button
              type="button"
              onClick={handleBroadcastParty}
              className="btn btn-sm btn-primary flex items-center gap-1.5"
            >
              <Radio size={13} /> Broadcast to Party
            </button>
          ) : (
            <span className="text-[10px] text-[var(--faint)]">
              Party mode available in Listen Together
            </span>
          )}
          <button type="button" className="btn btn-sm" onClick={closeModal}>
            Done
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Visual Share Card Preview */}
        {track && (
          <div
            ref={cardRef}
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-[#09090b] to-[#040405] p-4 sm:p-5 flex items-center gap-4 shadow-xl"
          >
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/40">
              <img
                src={track.cover}
                alt=""
                className="h-full w-full object-cover"
                crossOrigin="anonymous"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-white/50 mb-1">
                <ChordlyMark className="h-3 w-3" />
                <span>Chordly Audio</span>
              </div>
              <h3 className="truncate text-[15px] font-semibold text-white">
                {track.title}
              </h3>
              <p className="truncate text-[12px] text-white/60">
                {track.artist}
              </p>
              {track.album && (
                <p className="truncate text-[10px] text-white/40 mt-0.5">
                  {track.album}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleCopyCardImage}
              title="Copy share card as PNG image to clipboard"
              className="shrink-0 rounded-xl border border-white/15 bg-white/5 p-2.5 text-white/80 hover:bg-white/15 hover:text-white transition"
            >
              {copiedImage ? <Check size={16} className="text-emerald-400" /> : <ImageIcon size={16} />}
            </button>
          </div>
        )}

        {/* Share Options */}
        <div className="space-y-2.5">
          {/* Timestamp checkbox */}
          {track && currentTime > 5 && (
            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-[var(--muted)] hover:text-[var(--foreground)]">
              <input
                type="checkbox"
                checked={includeTimestamp}
                onChange={(e) => setIncludeTimestamp(e.target.checked)}
                className="rounded border-[var(--line-strong)] bg-transparent text-[var(--foreground)] focus:ring-0"
              />
              <span>Start playback at {formatTime(currentTime)}</span>
            </label>
          )}

          {/* Copy Link input & button */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 rounded-xl border border-[var(--line)] bg-[var(--hover)] px-3 py-2 text-[11px] font-mono text-[var(--muted)] select-all focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className="btn btn-sm btn-primary shrink-0 flex items-center gap-1.5"
            >
              {copiedLink ? <Check size={13} /> : <Copy size={13} />}
              {copiedLink ? "Copied" : "Copy link"}
            </button>
          </div>

          {/* Formatted Text Button */}
          <div className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--hover)] p-3">
            <div className="min-w-0 flex-1 mr-2">
              <p className="text-[11px] font-medium text-[var(--foreground)]">
                Discord / Social Formatted Text
              </p>
              <p className="truncate text-[9.5px] text-[var(--faint)]">
                {formattedText}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyText}
              className="btn btn-sm shrink-0 flex items-center gap-1.5"
            >
              {copiedText ? <Check size={13} /> : <Share2 size={13} />}
              {copiedText ? "Copied" : "Copy text"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
