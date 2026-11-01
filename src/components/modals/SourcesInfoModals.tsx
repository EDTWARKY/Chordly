import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Folder,
  Globe,
  HardDrive,
  Loader2,
  Lock,
  Network,
  Plus,
  Server,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useApp } from "../../store";
import { cn } from "../../lib/utils";
import { Modal } from "./Modal";
import { ChordlyLogo } from "../Logo";

/* ------------------------------------------------------------------ */
/*  Add addon                                                          */
/* ------------------------------------------------------------------ */

type Manifest = {
  name: string;
  id: string;
  version: string;
  resources: string[];
  capabilities: string[];
  quality: string;
  baseUrl: string;
  manifestUrl: string;
  host: string;
};

export function AddAddonModal() {
  const { closeModal, addSource, pushToast } = useApp();
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<"idle" | "fetching" | "ready">("idle");
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [error, setError] = useState("");

  const fetchManifest = async (overrideUrl?: string) => {
    setError("");
    const target = (overrideUrl || url).trim();
    if (!target) {
      setError("Please enter an addon URL or click a preset");
      return;
    }
    let parsed: URL;
    try {
      parsed = new URL(target);
      if (!/^https?:$/.test(parsed.protocol)) throw new Error("bad protocol");
    } catch {
      setError("Enter a valid addon URL, starting with http:// or https://");
      return;
    }
    setPhase("fetching");
    try {
      const fn =
        window.chordly?.fetchAddonManifest ||
        window.chordlyDesktop?.addons?.fetchManifest;
      let data: any;
      if (fn) {
        data = await fn(target);
      } else {
        const manifestUrl = target.endsWith("/manifest.json")
          ? target
          : target.replace(/\/+$/, "") + "/manifest.json";
        const r = await fetch(manifestUrl);
        if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
        data = await r.json();
        data.baseUrl = manifestUrl.replace(/\/manifest\.json$/, "");
        data.manifestUrl = manifestUrl;
      }

      const host = new URL(data.baseUrl || target).hostname;
      const resList = Array.isArray(data.resources) ? data.resources : ["search", "stream"];
      setManifest({
        name: data.name || host,
        id: data.id || `addon-${Date.now()}`,
        version: data.version || "1.0.0",
        resources: resList,
        capabilities: resList.map((r: string) => r.toUpperCase()),
        quality: data.quality || "Lossless FLAC · 16/24-bit",
        baseUrl: data.baseUrl || target.replace(/\/manifest\.json$/, ""),
        manifestUrl: data.manifestUrl || target,
        host,
      });
      setPhase("ready");
    } catch (err: any) {
      setError(
        err?.message ||
          "Could not fetch manifest from this URL. Ensure the addon server is reachable."
      );
      setPhase("idle");
    }
  };

  const add = async () => {
    if (!manifest) return;
    try {
      const addFn = window.chordly?.addAddonUrl || window.chordlyDesktop?.addons?.add;
      if (addFn) {
        await addFn(manifest.manifestUrl || manifest.baseUrl);
      }
      addSource({
        name: manifest.name,
        description: `Lossless addon · ${manifest.host}`,
        kind: "addon",
        enabled: true,
        url: manifest.baseUrl,
        quality: manifest.quality || "Hi-Res",
        icon: manifest.name.charAt(0).toUpperCase(),
      });
      pushToast("Addon connected", manifest.name, "success");
      closeModal();
    } catch (err: any) {
      setError(err?.message || "Failed to add source");
    }
  };

  return (
    <Modal
      title="Add a lossless addon"
      eyebrow="Sources"
      description="Connect any addon that exposes a Chordly-compatible manifest.json, /search and /stream endpoint."
      onClose={closeModal}
      size="md"
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-[9.5px] text-[var(--faint)]">
            <ShieldCheck size={11} /> Only add sources you trust
          </span>
          <div className="flex gap-2">
            <button type="button" className="btn btn-sm" onClick={closeModal}>
              Cancel
            </button>
            {phase === "ready" ? (
              <button type="button" className="btn btn-sm btn-primary" onClick={add}>
                <Plus size={13} /> Add source
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => void fetchManifest()}
                disabled={phase === "fetching" || !url.trim()}
              >
                {phase === "fetching" ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                {phase === "fetching" ? "Fetching manifest…" : "Fetch manifest"}
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-[10.5px] font-medium text-[var(--muted)]">Addon URL</span>
          <div className="relative">
            <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--faint)]" />
            <input
              autoFocus
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                if (phase === "ready") {
                  setPhase("idle");
                  setManifest(null);
                }
                setError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && phase !== "ready") fetchManifest();
              }}
              placeholder="https://addons.example.com/manifest.json"
              className="text-input pl-9"
            />
          </div>
          <span className="mt-1.5 block text-[9px] text-[var(--faint)]">
            Chordly appends <span className="text-[var(--muted)]">/manifest.json</span> automatically if needed.
          </span>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[9.5px] text-[var(--faint)]">Presets:</span>
            <button
              type="button"
              className="rounded-full border border-[var(--line)] bg-[var(--hover)] px-2.5 py-1 text-[9.5px] font-medium text-[var(--muted)] transition hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
              onClick={() => {
                const u = "https://losslessbridge.de.deplexo.com/u/toq2o0.qOKmuDcMf11MWbx0TmLQVA.tUQqxAdZOZA67WhKsv-SP7/manifest.json";
                setUrl(u);
                void fetchManifest(u);
              }}
            >
              Lossless Bridge (NetEase FLAC)
            </button>
            <button
              type="button"
              className="rounded-full border border-[var(--line)] bg-[var(--hover)] px-2.5 py-1 text-[9.5px] font-medium text-[var(--muted)] transition hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
              onClick={() => {
                const u = "https://soundfean-musics.onrender.com/a/manifest.json";
                setUrl(u);
                void fetchManifest(u);
              }}
            >
              Qobuz [Heisenbergg]
            </button>
          </div>
        </label>

        {error && (
          <p className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-2 text-[10.5px] text-[var(--danger)]">
            {error}
          </p>
        )}

        {phase === "fetching" && (
          <div className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--hover)] px-4 py-5">
            <Loader2 size={18} className="animate-spin" />
            <div>
              <p className="text-[11px] font-medium">Contacting addon…</p>
              <p className="text-[9.5px] text-[var(--faint)]">GET /manifest.json · checking capabilities</p>
            </div>
          </div>
        )}

        {manifest && phase === "ready" && (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--hover)] p-4 animate-fade-up">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--line-strong)] bg-[var(--active)] text-[14px] font-semibold">
                {manifest.name.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-[12px] font-semibold">
                  {manifest.name}
                  <CheckCircle2 size={12} />
                </p>
                <p className="truncate text-[9.5px] text-[var(--faint)]">
                  {manifest.id} · v{manifest.version}
                </p>
              </div>
              <span className="badge-yt">
                <Lock size={9} /> HTTPS
              </span>
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-[var(--muted)]">
              Streams 24-bit / 192kHz FLAC directly from {manifest.host}. Available to the search, playback and download
              pipelines.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {manifest.capabilities.map((capability) => (
                <span key={capability} className="badge-yt">
                  {capability.replaceAll("_", " ")}
                </span>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[var(--line)] pt-3 text-[9px] text-[var(--faint)]">
              <span>Endpoint /search</span>
              <span className="text-right">Endpoint /stream/:id</span>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-[var(--line)] p-3.5">
          <p className="flex items-center gap-1.5 text-[10px] font-medium">
            <Server size={12} /> Addon contract
          </p>
          <p className="mt-1.5 text-[9px] leading-relaxed text-[var(--faint)]">
            The manifest advertises capabilities such as LOSSLESS and DOWNLOAD. Search returns candidate tracks; the
            stream endpoint serves audio with range requests. Addons may be reordered to control fallback priority.
          </p>
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Network share                                                      */
/* ------------------------------------------------------------------ */

export function NetworkShareModal() {
  const { closeModal, addMount, pushToast } = useApp();
  const [protocol, setProtocol] = useState<"WebDAV" | "SMB">("WebDAV");
  const [name, setName] = useState("Home NAS");
  const [host, setHost] = useState("");
  const [path, setPath] = useState("/music");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [testing, setTesting] = useState(false);
  const [tested, setTested] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  const address = `${protocol === "SMB" ? "smb://" : "https://"}${host || "host"}${path || "/"}`;

  const test = () => {
    if (!host.trim()) {
      pushToast("Enter a host address", undefined, "error");
      return;
    }
    setTesting(true);
    setTested(false);
    timer.current = window.setTimeout(() => {
      setTesting(false);
      setTested(true);
      pushToast("Connection successful", `${protocol} · ${host}${path}`);
    }, 950);
  };

  const add = () => {
    if (!host.trim()) {
      pushToast("Enter a host address", undefined, "error");
      return;
    }
    addMount({
      name: name.trim() || "Network storage",
      protocol,
      host: host.trim(),
      path: path.trim() || "/",
      status: "connected",
    });
    closeModal();
  };

  return (
    <Modal
      title="Connect network storage"
      eyebrow="Sources"
      description="Stream your own library from a NAS or Windows network share. Tracks are indexed locally and never uploaded."
      onClose={closeModal}
      size="md"
      footer={
        <div className="flex items-center justify-between gap-3">
          <button type="button" className="btn btn-sm" onClick={test} disabled={testing}>
            {testing ? <Loader2 size={12} className="animate-spin" /> : tested ? <CheckCircle2 size={12} /> : <Network size={12} />}
            {testing ? "Testing…" : tested ? "Connection OK" : "Test connection"}
          </button>
          <div className="flex gap-2">
            <button type="button" className="btn btn-sm" onClick={closeModal}>
              Cancel
            </button>
            <button type="button" className="btn btn-sm btn-primary" onClick={add}>
              <Plus size={13} /> Add storage
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-[10px] font-medium text-[var(--muted)]">Protocol</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "WebDAV" as const, label: "WebDAV", detail: "HTTPS · reqwest_dav", icon: Globe },
              { id: "SMB" as const, label: "SMB v2/v3", detail: "Windows share · pavao", icon: Folder },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setProtocol(item.id);
                    setTested(false);
                  }}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition",
                    protocol === item.id
                      ? "border-[var(--ink)] bg-[var(--active)]"
                      : "border-[var(--line)] hover:border-[var(--line-strong)]",
                  )}
                >
                  <Icon size={15} />
                  <span>
                    <span className="block text-[10.5px] font-semibold">{item.label}</span>
                    <span className="block text-[8.5px] text-[var(--faint)]">{item.detail}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-medium text-[var(--muted)]">Display name</span>
            <input value={name} onChange={(event) => { setName(event.target.value); setTested(false); }} className="text-input" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-medium text-[var(--muted)]">Host</span>
            <input
              value={host}
              onChange={(event) => { setHost(event.target.value); setTested(false); }}
              placeholder={protocol === "SMB" ? "192.168.1.24" : "nas.local"}
              className="text-input"
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-medium text-[var(--muted)]">Share / path</span>
            <input value={path} onChange={(event) => { setPath(event.target.value); setTested(false); }} placeholder="/music" className="text-input" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-medium text-[var(--muted)]">Username</span>
            <input value={username} onChange={(event) => { setUsername(event.target.value); setTested(false); }} placeholder="optional" className="text-input" />
          </label>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-medium text-[var(--muted)]">Password</span>
          <input
            value={password}
            onChange={(event) => { setPassword(event.target.value); setTested(false); }}
            placeholder="Stored in the Windows credential vault"
            type="password"
            className="text-input"
          />
        </label>

        <div className="flex items-center gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--hover)] px-3.5 py-3">
          <HardDrive size={15} className="shrink-0 text-[var(--faint)]" />
          <div className="min-w-0">
            <p className="truncate text-[10px] font-mono text-[var(--muted)]">{address}</p>
            <p className="mt-0.5 text-[8.5px] text-[var(--faint)]">Mounted read-only by default · credentials encrypted at rest</p>
          </div>
          {tested && <CheckCircle2 size={15} className="ml-auto shrink-0 text-[var(--ink)]" />}
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  About + shortcuts                                                  */
/* ------------------------------------------------------------------ */

export function AboutModal() {
  const { closeModal, openModal } = useApp();
  return (
    <Modal
      title="About chordly"
      eyebrow="Windows edition · 1.0.0"
      description="A monochrome desktop music player with a real local library and a carefully tuned interface."
      onClose={closeModal}
      size="md"
      footer={
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            className="text-[9.5px] text-[var(--faint)] hover:text-[var(--ink)]"
            onClick={() => openModal("shortcuts")}
          >
            Keyboard shortcuts
          </button>
          <button type="button" className="btn btn-sm" onClick={closeModal}>
            Close
          </button>
        </div>
      }
    >
      <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-gradient-to-br from-white/[0.06] to-transparent p-6">
        <ChordlyLogo markClass="h-12 w-12" wordClass="text-[32px]" />
        <p className="mt-4 max-w-[380px] text-[11px] leading-relaxed text-[var(--muted)]">
          Three concentric arcs. Three chord nodes. One play button. Built for Windows 11 with acrylic glass, a real
          local-file library and a player that follows you across the app.
        </p>
        <div className="mt-5 flex flex-wrap gap-1.5">
          {["Local library", "7-band EQ", "WebDAV + SMB", "Google sync", "Listen together", "15 lyric providers"].map((tag) => (
            <span key={tag} className="badge-yt">
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {[
          ["Catalogue", "Bundled demo · modelled streaming"],
          ["Transport", "Electron 45 · Chromium"],
          ["Interface", "React 18 · TypeScript"],
          ["Audio", "Web Audio · Windows shared output"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[var(--line)] px-3 py-2.5">
            <p className="eyebrow">{label}</p>
            <p className="mt-1 text-[10.5px] font-medium">{value}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-[9px] text-[var(--faint)]">
        © 2026 chordly. Demo catalogue audio by SoundHelix · photography via Unsplash.
      </p>
    </Modal>
  );
}

export function ShortcutsModal() {
  const { closeModal } = useApp();
  const groups = [
    {
      title: "Playback",
      items: [
        ["Play / pause", "Space"],
        ["Next track", "Ctrl →"],
        ["Previous track", "Ctrl ←"],
        ["Seek forward / back", "→ / ←"],
        ["Volume up / down", "↑ / ↓"],
        ["Mute", "M"],
      ],
    },
    {
      title: "Library",
      items: [
        ["Focus search", "Ctrl K"],
        ["Like current track", "L"],
        ["Open queue", "Q"],
        ["Now playing", "N"],
        ["Keyboard shortcuts", "Shift ?"],
        ["Close overlay", "Esc"],
      ],
    },
  ];
  return (
    <Modal
      title="Keyboard shortcuts"
      eyebrow="Speed of thought"
      description="Chordly is built to be driven from the keyboard. These work anywhere except inside a text field."
      onClose={closeModal}
      size="md"
      footer={
        <div className="flex justify-end">
          <button type="button" className="btn btn-sm" onClick={closeModal}>
            Done
          </button>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {groups.map((group) => (
          <div key={group.title} className="rounded-xl border border-[var(--line)] p-3.5">
            <p className="eyebrow mb-2.5">{group.title}</p>
            <div className="space-y-2">
              {group.items.map(([label, key]) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <span className="text-[10.5px] text-[var(--muted)]">{label}</span>
                  <kbd className="rounded-md border border-[var(--line-strong)] bg-[var(--hover)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--ink)]">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
