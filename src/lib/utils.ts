import { useEffect, useRef } from "react";
import clsx, { type ClassValue } from "clsx";

export const cn = (...inputs: ClassValue[]) => clsx(...inputs);

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useOutsideClick<T extends HTMLElement>(onClose: () => void, active = true) {
  const ref = useRef<T>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!active) return;
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) closeRef.current();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", key);
    };
  }, [active]);
  return ref;
}

export function isEditableElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

export function scrollIntoViewSoft(element: HTMLElement | null) {
  element?.scrollIntoView({ behavior: "smooth", block: "center" });
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function generateId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export const QUALITY_RANK: Record<string, number> = {
  Original: 5,
  "Hi-Res": 4,
  Lossless: 3,
  High: 2,
  Medium: 1,
  Low: 0,
};

export function codecLabel(codec?: string) {
  if (!codec) return null;
  const value = codec.toLowerCase();
  if (value.includes("mpeg") || value.includes("mp3")) return "MP3";
  if (value.includes("flac")) return "FLAC";
  if (value.includes("alac")) return "ALAC";
  if (value.includes("aac") || value.includes("mp4")) return "AAC";
  if (value.includes("vorbis")) return "OGG";
  if (value.includes("opus")) return "OPUS";
  if (value.includes("wave") || value.includes("pcm")) return "WAV";
  if (value.includes("wma")) return "WMA";
  return codec.toUpperCase();
}

export function formatBitrate(bitrate?: number) {
  if (!bitrate || !Number.isFinite(bitrate)) return null;
  return `${Math.round(bitrate / 1000)} kbps`;
}

export function formatSampleRate(sampleRate?: number) {
  if (!sampleRate || !Number.isFinite(sampleRate)) return null;
  return `${(sampleRate / 1000).toFixed(1)} kHz`;
}

export function upgradeCoverUrl(url?: string): string {
  if (!url || typeof url !== "string") return "";
  let clean = url;
  if (clean.includes("googleusercontent.com")) {
    clean = clean.replace(/=w\d+-h\d+[^?#]*/i, "=w1200-h1200-l90-rj").replace(/=s\d+[^?#]*/i, "=s1200");
  }
  if (clean.includes("ytimg.com")) {
    clean = clean.replace(/\/(default|hqdefault|mqdefault|sddefault)\.jpg/i, "/maxresdefault.jpg");
  }
  return clean;
}

export function trackFormatBadge(track: {
  codec?: string;
  format?: string;
  lossless?: boolean;
  quality?: string;
  bitDepth?: number;
  bitrate?: number;
  sampleRate?: number;
}) {
  if (track.lossless || track.format === "flac" || track.quality === "Lossless") {
    const depth = track.bitDepth ? `${track.bitDepth}/` : "";
    const rate = track.sampleRate ? Math.round(track.sampleRate / 1000) : "";
    return depth || rate ? `FLAC · ${depth}${rate}` : "FLAC · Lossless";
  }
  const codec = track.codec ? codecLabel(track.codec) : "OPUS";
  if (!codec) return null;
  const lossy = ["MP3", "AAC", "OGG", "OPUS", "WMA"].includes(codec);
  const detail = lossy
    ? track.bitrate
      ? String(Math.round(track.bitrate / 1000))
      : "160"
    : formatSampleRate(track.sampleRate)?.replace(" kHz", "") ?? null;
  return detail ? `${codec} · ${detail}` : codec;
}
