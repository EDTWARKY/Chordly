import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Cloud,
  FileAudio,
  Link2,
  Loader2,
  Music2,
  Sparkles,
  Upload,
} from "lucide-react";
import { useApp } from "../../store";
import { tracks as catalog, cover, trackById, registerRemoteTracks } from "../../data";
import type { Track } from "../../types";
import { cn, formatTime } from "../../lib/utils";
import { Modal } from "./Modal";

type Tab = "link" | "file";
type Phase = "idle" | "matching" | "done";

const stageLabels = [
  "Fetching playlist metadata…",
  "Resolving tracks…",
  "Matching against YouTube Music…",
];

const demoImportOrder = [
  "velvet-static",
  "slow-motion",
  "neon-rain",
  "golden-hour",
  "monsoon",
  "saudade",
  "lullaby",
  "orbit",
  "fever-dream",
  "paper-moon",
];

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function matchTrack(title: string, artist: string): Track | null {
  const nTitle = normalize(title);
  const nArtist = normalize(artist);
  if (!nTitle) return null;
  const exact = catalog.find(
    (track) => normalize(track.title) === nTitle && (!nArtist || normalize(track.artist).includes(nArtist) || nArtist.includes(normalize(track.artist))),
  );
  if (exact) return exact;
  const titleOnly = catalog.find((track) => normalize(track.title) === nTitle);
  if (titleOnly) return titleOnly;
  if (nTitle.length > 3) {
    const partial = catalog.find(
      (track) => normalize(track.title).includes(nTitle) || nTitle.includes(normalize(track.title)),
    );
    if (partial) return partial;
  }
  return null;
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parsePlaylistText(text: string, fileName: string) {
  const isCsv = /\.csv$/i.test(fileName) || (!text.trim().startsWith("#EXTM3U") && text.includes(",") && /track|title|artist/i.test(text.split(/\r?\n/)[0] ?? ""));
  let matched: Track[] = [];
  let unmatched = 0;

  if (isCsv) {
    const rows = text
      .split(/\r?\n/)
      .filter((line) => line.trim())
      .map(parseCsvLine);
    if (!rows.length) return { matched, unmatched };
    const header = rows[0].map((cell) => cell.toLowerCase());
    const titleIndex = header.findIndex((cell) => cell.includes("track name") || cell === "title" || cell === "song" || cell.includes("track"));
    const artistIndex = header.findIndex((cell) => cell.includes("artist"));
    const hasHeader = titleIndex >= 0 || artistIndex >= 0;
    const dataRows = hasHeader ? rows.slice(1) : rows;
    dataRows.forEach((row) => {
      const title = row[titleIndex >= 0 ? titleIndex : 0] ?? "";
      const artist = row[artistIndex >= 0 ? artistIndex : 1] ?? "";
      if (!title || /^track name$/i.test(title)) return;
      const match = matchTrack(title, artist);
      if (match) matched.push(match);
      else unmatched++;
    });
  } else {
    const entries: { title: string; artist: string }[] = [];
    text.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#EXTM3U")) return;
      if (trimmed.startsWith("#EXTINF:")) {
        const afterComma = trimmed.slice(trimmed.indexOf(",") + 1).trim();
        const parts = afterComma.split(" - ");
        if (parts.length > 1) entries.push({ artist: parts[0], title: parts.slice(1).join(" - ") });
        else entries.push({ title: afterComma, artist: "" });
      } else if (!trimmed.startsWith("#")) {
        if (/\.(mp3|flac|m4a|wav|ogg)$/i.test(trimmed)) {
          const base = trimmed.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, "") ?? "";
          const parts = base.split(" - ");
          if (parts.length > 1) entries.push({ artist: parts[0], title: parts.slice(1).join(" - ") });
          else entries.push({ title: base, artist: "" });
        } else if (!text.includes("#EXTINF")) {
          const parts = trimmed.split(" - ");
          if (parts.length > 1) entries.push({ artist: parts[0], title: parts.slice(1).join(" - ") });
          else entries.push({ title: trimmed, artist: "" });
        }
      }
    });
    entries.forEach((entry) => {
      const match = matchTrack(entry.title, entry.artist);
      if (match) matched.push(match);
      else unmatched++;
    });
  }

  const deduped = matched.filter((track, index) => matched.findIndex((item) => item.id === track.id) === index);
  unmatched += matched.length - deduped.length;
  return { matched: deduped, unmatched };
}

function parseSpotifyLink(link: string) {
  const match = link.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?playlist\/([a-zA-Z0-9]+)/);
  if (!match) return null;
  const id = match[1];
  const names = ["Night Signals", "After Hours", "Slow Dancing", "Neon Letters"];
  const index = id.charCodeAt(0) % names.length;
  return {
    id,
    name: names[index],
    tracks: demoImportOrder
      .map((trackId, order) => (order + id.charCodeAt(1)) % 3 === 0 ? trackId : trackId)
      .map((trackId) => trackById[trackId])
      .filter(Boolean),
  };
}

export function ImportModal() {
  const { closeModal, createPlaylist, navigate, pushToast } = useApp();
  const [tab, setTab] = useState<Tab>("link");
  const [link, setLink] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [stage, setStage] = useState(0);
  const [results, setResults] = useState<Track[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [playlistName, setPlaylistName] = useState("Imported playlist");
  const [sourceLabel, setSourceLabel] = useState("Spotify");
  const [fileName, setFileName] = useState("");
  const [unmatched, setUnmatched] = useState(0);
  const [error, setError] = useState("");
  const [sync, setSync] = useState(true);
  const [dragging, setDragging] = useState(false);
  const timers = useRef<number[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const reset = () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    setPhase("idle");
    setResults([]);
    setSelected([]);
    setError("");
    setUnmatched(0);
    setFileName("");
    setStage(0);
  };

  const beginMatching = (matched: Track[], name: string, source: string, unmatchedCount = 0) => {
    setPhase("matching");
    setStage(0);
    setError("");
    setUnmatched(unmatchedCount);
    setPlaylistName(name);
    setSourceLabel(source);
    const timersToAdd = [
      window.setTimeout(() => setStage(1), 520),
      window.setTimeout(() => setStage(2), 1100),
      window.setTimeout(() => {
        setResults(matched);
        setSelected(matched.map((track) => track.id));
        setPhase("done");
      }, 1750),
    ];
    timers.current.push(...timersToAdd);
  };

  const analyzeLink = async () => {
    const trimmed = link.trim();
    if (!trimmed) {
      setError("Paste a public Spotify playlist, album, or track link.");
      return;
    }
    setPhase("matching");
    setStage(0);
    setError("");
    setPlaylistName("Fetching Spotify metadata…");
    setSourceLabel("Spotify");

    const t1 = window.setTimeout(() => setStage(1), 500);
    const t2 = window.setTimeout(() => setStage(2), 1100);
    timers.current.push(t1, t2);

    try {
      const bridge = window.chordly || (window as unknown as { chordlyDesktop?: any }).chordlyDesktop || (window as unknown as { desktop?: any }).desktop;
      const importFn =
        bridge?.importSpotifyPlaylistUrl ||
        bridge?.playlists?.importSpotify ||
        (window as unknown as { chordlyDesktop?: { playlists?: { importSpotify?: (url: string, sync?: boolean) => Promise<any> } } }).chordlyDesktop?.playlists?.importSpotify;

      if (!importFn) {
        throw new Error("Desktop bridge is not available. Ensure you are running in the Chordly app.");
      }

      const res = await importFn(trimmed, sync);

      if (!res || !res.tracks || !res.tracks.length) {
        throw new Error("No tracks could be resolved from this Spotify link. Please ensure it is public in Spotify (click '...' -> 'Make Public').");
      }

      registerRemoteTracks(res.tracks);
      setPlaylistName(res.title || "Imported Playlist");
      setResults(res.tracks);
      setSelected(res.tracks.map((track: Track) => track.id));
      setUnmatched(Math.max(0, (res.totalCount || res.tracks.length) - res.matchedCount));
      setPhase("done");
    } catch (err: any) {
      console.error("[chordly] Spotify import error:", err);
      setError(err?.message || "Failed to import from Spotify. Please check the URL.");
      setPhase("idle");
    }
  };

  const handleFile = async (file: File) => {
    setError("");
    setFileName(file.name);
    if (!/\.(csv|m3u8|m3u|txt)$/i.test(file.name)) {
      setError("Choose a CSV, M3U8, M3U or TXT file.");
      setPhase("idle");
      return;
    }
    try {
      const text = await file.text();
      const parsed = parsePlaylistText(text, file.name);
      if (!parsed.matched.length) {
        setError(`No catalog matches found in ${file.name}. ${parsed.unmatched} tracks were skipped.`);
        setPhase("idle");
        return;
      }
      registerRemoteTracks(parsed.matched);
      const cleanName = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
      beginMatching(parsed.matched.slice(0, 60), cleanName || "Imported playlist", file.name, parsed.unmatched);
    } catch {
      setError("That file could not be read.");
    }
  };

  const selectedTracks = useMemo(
    () => results.filter((track) => selected.includes(track.id)),
    [results, selected],
  );

  const save = () => {
    if (!selectedTracks.length) {
      pushToast("Select at least one track", undefined, "error");
      return;
    }
    registerRemoteTracks(selectedTracks);
    const id = createPlaylist(
      playlistName,
      `Imported from ${sourceLabel}${sync ? " · synced to YouTube Music" : " · local storage"}`,
      selectedTracks[0]?.cover,
      selectedTracks.map((track) => track.id),
    );
    closeModal();
    navigate({ name: "collection", kind: "playlist", id, title: playlistName });
    pushToast(
      "Playlist imported",
      `${selectedTracks.length} tracks · ${sync ? "synced to YouTube Music" : "saved locally"}`,
      "success",
    );
  };

  const toggleSelected = (id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  return (
    <Modal
      title="Import playlist"
      eyebrow="Universal importer"
      description="Bring playlists over from Spotify, Exportify CSV files or local M3U8 playlists. Chordly matches every track against your catalogue."
      onClose={closeModal}
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[10px] text-[var(--faint)]">
            <Cloud size={12} />
            <span>{phase === "done" ? `${selectedTracks.length} selected · ${phase === "done" ? "Ready" : ""}` : "Destination: YouTube Music"}</span>
          </div>
          <div className="flex items-center gap-2">
            {phase === "done" ? (
              <>
                <button type="button" className="btn btn-sm" onClick={reset}>
                  Import another
                </button>
                <button type="button" className="btn btn-sm btn-primary" onClick={save}>
                  <Check size={13} /> Save playlist
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn btn-sm" onClick={closeModal}>
                  Cancel
                </button>
                {tab === "link" ? (
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={analyzeLink}
                    disabled={phase === "matching"}
                  >
                    {phase === "matching" ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    Find playlist
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => fileRef.current?.click()}
                    disabled={phase === "matching"}
                  >
                    <Upload size={13} /> Choose file
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      }
    >
      <div className="mb-5 flex gap-1 rounded-xl border border-[var(--line)] bg-[var(--hover)] p-1">
        <button
          type="button"
          onClick={() => {
            setTab("link");
            reset();
          }}
          className={cn(
            "flex h-8 flex-1 items-center justify-center gap-2 rounded-lg text-[11px] font-medium transition",
            tab === "link" ? "bg-[var(--active)] text-[var(--ink)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--ink)]",
          )}
        >
          <Link2 size={13} /> Spotify link
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("file");
            reset();
          }}
          className={cn(
            "flex h-8 flex-1 items-center justify-center gap-2 rounded-lg text-[11px] font-medium transition",
            tab === "file" ? "bg-[var(--active)] text-[var(--ink)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--ink)]",
          )}
        >
          <FileAudio size={13} /> CSV / M3U8 file
        </button>
      </div>

      {phase === "matching" ? (
        <div className="flex flex-col items-center rounded-2xl border border-[var(--line)] bg-[var(--hover)] px-8 py-14 text-center">
          <div className="relative grid h-16 w-16 place-items-center rounded-full border border-[var(--line)]">
            <Loader2 size={25} className="animate-spin text-[var(--ink)]" />
          </div>
          <p className="mt-6 text-[14px] font-semibold tracking-[-0.02em]">{stageLabels[stage]}</p>
          <p className="mt-1 text-[10.5px] text-[var(--faint)]">
            {stage === 0 ? "Reading public metadata" : stage === 1 ? "Reading artist, title and duration" : "Concurrent match · 12 workers"}
          </p>
          <div className="mt-6 flex w-full max-w-[300px] gap-1.5">
            {[0, 1, 2].map((index) => (
              <span
                key={index}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors duration-500",
                  index <= stage ? "bg-[var(--ink)]" : "bg-[var(--line-strong)]",
                )}
              />
            ))}
          </div>
        </div>
      ) : phase === "done" ? (
        <div>
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--hover)] px-3.5 py-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--ink)] text-[var(--canvas)]">
              <CheckCircle2 size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11.5px] font-semibold">
                {results.length} of {results.length + unmatched} tracks matched
              </p>
              <p className="truncate text-[9.5px] text-[var(--faint)]">
                Source: {sourceLabel}{unmatched > 0 ? ` · ${unmatched} skipped` : " · 100% match"}
              </p>
            </div>
            <span className="badge-yt">YT Music</span>
          </div>

          <label className="mb-4 block">
            <span className="mb-1.5 block text-[10px] font-medium text-[var(--faint)]">Playlist name</span>
            <input
              value={playlistName}
              onChange={(event) => setPlaylistName(event.target.value)}
              className="text-input h-9"
              maxLength={70}
            />
          </label>

          <div className="mb-2 flex items-center justify-between">
            <p className="eyebrow">Matched tracks</p>
            <button
              type="button"
              className="text-[9.5px] font-medium text-[var(--faint)] hover:text-[var(--ink)]"
              onClick={() =>
                setSelected(selected.length === results.length ? [] : results.map((track) => track.id))
              }
            >
              {selected.length === results.length ? "Deselect all" : "Select all"}
            </button>
          </div>
          <div className="max-h-[270px] overflow-y-auto scrollbar rounded-xl border border-[var(--line)] p-1.5">
            {results.map((track, index) => {
              const isSelected = selected.includes(track.id);
              return (
                <button
                  key={`${track.id}-${index}`}
                  type="button"
                  onClick={() => toggleSelected(track.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-[var(--hover)]"
                >
                  <span
                    className={cn(
                      "grid h-4 w-4 shrink-0 place-items-center rounded border transition",
                      isSelected ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--canvas)]" : "border-[var(--line-strong)]",
                    )}
                  >
                    {isSelected && <Check size={10} />}
                  </span>
                  <img src={track.cover} alt="" className="h-9 w-9 rounded object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11.5px] font-medium">{track.title}</span>
                    <span className="block truncate text-[9.5px] text-[var(--faint)]">
                      {track.artist} · {track.album}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-0.5">
                    <span className="text-[9px] tabular-nums text-[var(--faint)]">{formatTime(track.duration)}</span>
                    <span className={cn("text-[8px] uppercase tracking-wider", track.quality === "Lossless" ? "text-[var(--muted)]" : "text-[var(--faint)]")}>
                      {track.quality}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-3.5 flex items-center justify-between rounded-xl border border-[var(--line)] px-3 py-2.5">
            <span className="flex items-center gap-1.5 text-[10.5px] text-[var(--muted)]">
              <Cloud size={12} /> Save to YouTube Music
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={sync}
              data-on={sync}
              className="toggle"
              onClick={() => setSync((value) => !value)}
            />
          </div>
          <p className="mt-3 text-[9px] leading-relaxed text-[var(--faint)]">
            Universal Spotify resolver: Tracks are extracted directly from Spotify and matched against YouTube Music and lossless sources. CSV and M3U8 file parsing runs locally.
          </p>
        </div>
      ) : tab === "link" ? (
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-[10.5px] font-medium text-[var(--muted)]">Public Spotify link (playlist, album, or track)</span>
            <div className="relative">
              <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--faint)]" />
              <input
                autoFocus
                value={link}
                onChange={(event) => {
                  setLink(event.target.value);
                  setError("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") analyzeLink();
                }}
                placeholder="https://open.spotify.com/playlist/37i9dQZF1DX…"
                className="text-input pl-9"
              />
            </div>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              ["Public link", "No login needed"],
              ["Concurrent matching", "12 workers"],
              ["Two-way sync", "YouTube Music"],
            ].map(([title, detail]) => (
              <div key={title} className="rounded-xl border border-[var(--line)] bg-[var(--hover)] p-3">
                <p className="text-[10px] font-semibold text-[var(--ink)]">{title}</p>
                <p className="mt-0.5 text-[9px] text-[var(--faint)]">{detail}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-dashed border-[var(--line-strong)] px-4 py-4">
            <p className="flex items-center gap-2 text-[10.5px] font-medium text-[var(--muted)]">
              <Music2 size={13} /> What gets imported?
            </p>
            <p className="mt-1.5 text-[10px] leading-relaxed text-[var(--faint)]">
              Track names, artists, album art and durations. Chordly replaces unavailable source tracks with the
              closest match from your enabled lossless addons.
            </p>
          </div>
          {error && (
            <p className="flex items-start gap-2 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-2 text-[10.5px] text-[var(--danger)]">
              <AlertCircle size={13} className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <label
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center transition",
              dragging
                ? "border-[var(--ink)] bg-[var(--active)]"
                : "border-[var(--line-strong)] bg-[var(--hover)] hover:border-[var(--muted)]",
            )}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const file = event.dataTransfer.files?.[0];
              if (file) void handleFile(file);
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.m3u8,.m3u,.txt"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
                event.target.value = "";
              }}
            />
            <span className="grid h-12 w-12 place-items-center rounded-full border border-[var(--line-strong)]">
              <Upload size={19} />
            </span>
            <p className="mt-4 text-[12px] font-semibold">Drop a playlist file here</p>
            <p className="mt-1 text-[10px] text-[var(--faint)]">CSV from Exportify, M3U8 or M3U · up to 5,000 tracks</p>
            {fileName && <p className="mt-3 badge-yt">Selected: {fileName}</p>}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-[var(--line)] p-3.5">
              <p className="text-[10px] font-semibold">Exportify CSV</p>
              <p className="mt-1 text-[9px] leading-relaxed text-[var(--faint)]">
                Uses the Track Name, Artist Name(s) and Album Name columns automatically.
              </p>
            </div>
            <div className="rounded-xl border border-[var(--line)] p-3.5">
              <p className="text-[10px] font-semibold">M3U8 / M3U</p>
              <p className="mt-1 text-[9px] leading-relaxed text-[var(--faint)]">
                Reads #EXTINF metadata and local file paths. Matches the embedded artist and title tags.
              </p>
            </div>
          </div>
          {error && (
            <p className="flex items-start gap-2 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-2 text-[10.5px] text-[var(--danger)]">
              <AlertCircle size={13} className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
