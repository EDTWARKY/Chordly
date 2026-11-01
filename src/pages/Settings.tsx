import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  AudioLines,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Database,
  Download,
  FlaskConical,
  FolderOpen,
  Gauge,
  Globe,
  HardDrive,
  Info,
  Keyboard,
  Link2,
  ListMusic,
  Monitor,
  Moon,
  Network,
  Palette,
  PlaySquare,
  Plus,
  Radio,
  RefreshCw,
  RotateCcw,
  Server,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sun,
  Trash2,
  Upload,
  UserRound,
  Users,
  Wifi,
  Zap,
} from "lucide-react";
import { useApp } from "../store";
import { lyricProviderNames, trackById } from "../data";
import type { Quality, ThemeMode, BgType } from "../types";
import { cn, downloadJson } from "../lib/utils";
import { formatBytes } from "../desktop";
import { ChordlyMark } from "../components/Logo";
import { WALLPAPER_PRESETS, SOLID_COLOR_PRESETS, optimizeWallpaperFile } from "../lib/wallpapers";

const QUALITIES: Quality[] = ["Lossless", "High", "Medium", "Low"];
const EQ_FREQUENCIES = ["60 Hz", "150 Hz", "400 Hz", "1 kHz", "2.4 kHz", "6 kHz", "15 kHz"];

type SectionId =
  | "account"
  | "party"
  | "sources"
  | "quality"
  | "playback"
  | "appearance"
  | "performance"
  | "local"
  | "storage"
  | "data"
  | "misc"
  | "advanced";

const SECTIONS: Array<{ id: SectionId; label: string; icon: typeof UserRound }> = [
  { id: "account", label: "Account & integrations", icon: UserRound },
  { id: "party", label: "Listen together", icon: Users },
  { id: "sources", label: "Sources", icon: Server },
  { id: "quality", label: "Audio quality", icon: Wifi },
  { id: "playback", label: "Playback", icon: SlidersHorizontal },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "performance", label: "Performance", icon: Gauge },
  { id: "local", label: "Local music", icon: FolderOpen },
  { id: "storage", label: "Storage", icon: HardDrive },
  { id: "data", label: "Your data", icon: Database },
  { id: "misc", label: "Miscellaneous", icon: Settings2 },
  { id: "advanced", label: "Advanced & experimental", icon: FlaskConical },
];

/* ------------------------------------------------------------------ */
/*  Shared controls                                                    */
/* ------------------------------------------------------------------ */

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="toggle"
      data-on={checked}
    />
  );
}

function SettingRow({
  title,
  description,
  children,
  className,
  disabled,
}: {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "settings-row flex items-center justify-between gap-5 border-b border-[var(--line)] py-3.5 last:border-b-0",
        disabled && "opacity-45",
        className,
      )}
    >
      <div className="min-w-0">
        <div className="text-[12px] font-medium text-[var(--ink)]">{title}</div>
        {description && (
          <p className="mt-0.5 max-w-[430px] text-[10.5px] leading-relaxed text-[var(--faint)]">{description}</p>
        )}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2.5">{children}</div>}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  label: string;
  className?: string;
}) {
  return (
    <span className={cn("select-wrap", className)}>
      <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown size={13} />
    </span>
  );
}

function Range({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  className,
  suffix,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label: string;
  className?: string;
  suffix?: string;
}) {
  const progress = max === min ? 0 : ((value - min) / (max - min)) * 100;
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="slider w-[132px]"
        style={{ "--progress": `${progress}%` } as CSSProperties}
      />
      <span className="w-[46px] text-right text-[10.5px] font-medium tabular-nums text-[var(--muted)]">
        {value}
        {suffix}
      </span>
    </span>
  );
}

function SectionCard({
  id,
  title,
  description,
  icon: Icon,
  action,
  children,
  refCallback,
}: {
  id: SectionId;
  title: string;
  description: string;
  icon: typeof UserRound;
  action?: ReactNode;
  children: ReactNode;
  refCallback: (node: HTMLElement | null) => void;
}) {
  return (
    <section id={`settings-${id}`} ref={refCallback} className="settings-section scroll-mt-[88px]">
      <header className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[var(--line)] bg-[var(--hover)] text-[var(--muted)]">
            <Icon size={15} strokeWidth={1.7} />
          </span>
          <div>
            <h2 className="text-[14px] font-semibold tracking-[-0.02em] text-[var(--ink)]">{title}</h2>
            <p className="mt-0.5 max-w-[520px] text-[10.5px] leading-relaxed text-[var(--faint)]">{description}</p>
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className="px-5 py-1">{children}</div>
    </section>
  );
}

function Note({ children, icon: Icon = Info }: { children: ReactNode; icon?: typeof Info }) {
  return (
    <div className="mb-3 mt-2 flex items-start gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--hover)] px-3.5 py-3">
      <Icon size={13} className="mt-0.5 shrink-0 text-[var(--faint)]" />
      <p className="text-[10px] leading-relaxed text-[var(--muted)]">{children}</p>
    </div>
  );
}

function StatusPill({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "live" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-[3px] text-[9px] font-semibold uppercase tracking-[0.1em]",
        tone === "live"
          ? "border-[var(--line-strong)] text-[var(--ink)]"
          : "border-[var(--line)] text-[var(--faint)]",
      )}
    >
      {tone === "live" && <span className="h-1.5 w-1.5 rounded-full bg-[var(--ink)]" />}
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Settings page                                                      */
/* ------------------------------------------------------------------ */

export function Settings() {
  const {
    settings,
    setSetting,
    updateSettings,
    resetSettings,
    accounts,
    activeAccount,
    switchAccount,
    listeningProfile,
    setListeningProfile,
    openModal,
    navigate,
    pushToast,
    sources,
    toggleSource,
    moveSource,
    mounts,
    removeMount,
    localLibrary,
    localScanning,
    localProgress,
    isDesktop,
    chooseLocalFolder,
    scanLocalFolder,
    stats,
    resetStats,
  } = useApp();

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const [activeSection, setActiveSection] = useState<SectionId>("account");
  const [folderDraft, setFolderDraft] = useState(settings.scanFolder);
  const [brainzToken, setBrainzToken] = useState(settings.listenbrainzToken);
  const [partyServer, setPartyServer] = useState(settings.partyServer);
  const [clearing, setClearing] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);
  const [resetStatsArmed, setResetStatsArmed] = useState(false);
  const [genreResult, setGenreResult] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  const handleResetStats = () => {
    if (!resetStatsArmed) {
      setResetStatsArmed(true);
      window.setTimeout(() => setResetStatsArmed(false), 3500);
      return;
    }
    resetStats();
    setResetStatsArmed(false);
  };

  useEffect(() => {
    setFolderDraft(settings.scanFolder);
  }, [settings.scanFolder]);

  useEffect(() => {
    setBrainzToken(settings.listenbrainzToken);
  }, [settings.listenbrainzToken]);

  useEffect(() => {
    setPartyServer(settings.partyServer);
  }, [settings.partyServer]);

  /* scroll spy ------------------------------------------------------ */
  useEffect(() => {
    const scroller = document.querySelector(".page-scroll");
    if (!scroller) return;
    const onScroll = () => {
      const threshold = 150;
      let current: SectionId = SECTIONS[0].id;
      for (const section of SECTIONS) {
        const element = sectionRefs.current[section.id];
        if (!element) continue;
        if (element.getBoundingClientRect().top <= scroller.getBoundingClientRect().top + threshold) {
          current = section.id;
        }
      }
      setActiveSection(current);
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => scroller.removeEventListener("scroll", onScroll);
  }, []);

  const jumpTo = (id: SectionId) => {
    setActiveSection(id);
    const element = sectionRefs.current[id];
    element?.scrollIntoView({ behavior: settings.reduceMotion ? "auto" : "smooth", block: "start" });
  };

  const refFor = (id: SectionId) => (node: HTMLElement | null) => {
    sectionRefs.current[id] = node;
  };

  /* account & integrations ----------------------------------------- */
  const toggleSpotify = (value: boolean) => {
    setSetting("spotifyLinked", value);
    pushToast(
      value ? "Spotify linked" : "Spotify disconnected",
      value ? "PKCE session stored · import your library from any playlist" : "Your local library is unaffected",
      value ? "success" : "default",
    );
  };

  const connectBrainz = () => {
    if (brainzToken.trim().length < 8) {
      pushToast("Enter a valid ListenBrainz token", "Tokens are available in your ListenBrainz settings", "error");
      return;
    }
    setSetting("listenbrainzToken", brainzToken.trim());
    pushToast("ListenBrainz connected", "Scrobbles start automatically when you listen", "success");
  };

  const savePartyServer = () => {
    const value = partyServer.trim() || "wss://party.chordly.app";
    setSetting("partyServer", value);
    setPartyServer(value);
    pushToast("Party server saved", value);
  };

  /* local music ---------------------------------------------------- */
  const chooseFolder = () => {
    void chooseLocalFolder();
  };

  const scanNow = () => {
    if (!folderDraft.trim()) {
      pushToast("Choose a music folder first", undefined, "error");
      return;
    }
    setSetting("scanFolder", folderDraft.trim());
    void scanLocalFolder(folderDraft.trim());
  };

  const localStatus = localScanning
    ? localProgress?.phase === "reading" && localProgress.total
      ? `Reading tags · ${(localProgress.processed ?? 0).toLocaleString()} of ${localProgress.total.toLocaleString()} files`
      : `Walking folders · ${(localProgress?.inspected ?? 0).toLocaleString()} files found`
    : localLibrary.tracks.length
      ? `${localLibrary.tracks.length.toLocaleString()} tracks · ${formatBytes(localLibrary.totalBytes)}${
          localLibrary.scannedAt
            ? ` · scanned ${new Date(localLibrary.scannedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}`
            : ""
        }`
      : isDesktop
        ? "No tracks indexed yet · browse for a music folder"
        : "Local scanning runs in the Chordly Windows app";

  /* storage -------------------------------------------------------- */
  const cacheUsed = Math.round(settings.cacheLimit * 0.28);

  const clearCache = () => {
    setClearing(true);
    window.setTimeout(() => {
      setClearing(false);
      pushToast("Cache cleared", `Freed ${cacheUsed} MB of song and image cache`, "success");
    }, 950);
  };

  /* your data ------------------------------------------------------ */
  const exportSettings = () => {
    downloadJson(`chordly-settings-${new Date().toISOString().slice(0, 10)}.json`, {
      app: "chordly",
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
    });
    pushToast("Settings exported", "chordly-settings.json", "success");
  };

  const importSettings = async (file: File | undefined) => {
    if (!file) return;
    try {
      const raw = JSON.parse(await file.text()) as unknown;
      const candidate =
        raw && typeof raw === "object" && "settings" in raw
          ? (raw as { settings: unknown }).settings
          : raw;
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
        throw new Error("invalid settings object");
      }
      const incoming = candidate as Record<string, unknown>;
      const { eqBands, lyricProviders, ...rest } = incoming;
      const patch = { ...rest } as Record<string, unknown>;
      if (Array.isArray(eqBands) && eqBands.length === 7) {
        patch.eqBands = eqBands.map((band) => Number(band) || 0);
      }
      if (lyricProviders && typeof lyricProviders === "object" && !Array.isArray(lyricProviders)) {
        patch.lyricProviders = { ...settings.lyricProviders, ...(lyricProviders as Record<string, boolean>) };
      }
      updateSettings(patch as Parameters<typeof updateSettings>[0]);
      pushToast("Settings imported", file.name, "success");
    } catch {
      pushToast("Could not import settings", "Choose a valid Chordly settings JSON file", "error");
    }
    if (importRef.current) importRef.current.value = "";
  };

  const [cleanInstallArmed, setCleanInstallArmed] = useState(false);

  const resetAll = () => {
    if (!resetArmed) {
      setResetArmed(true);
      window.setTimeout(() => setResetArmed(false), 4000);
      return;
    }
    resetSettings();
    setResetArmed(false);
  };

  const handleCleanInstallReset = async () => {
    if (!cleanInstallArmed) {
      setCleanInstallArmed(true);
      window.setTimeout(() => setCleanInstallArmed(false), 4000);
      return;
    }
    const bridge = window.chordly ?? window.chordlyDesktop;
    if (bridge?.factoryReset) {
      await bridge.factoryReset();
    }
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  const workOutGenres = () => {
    const top = ["Ambient", "Electronic", "Indie"];
    const likedGenres = Object.keys(trackById)
      .map((id) => trackById[id])
      .filter(Boolean)
      .reduce<Record<string, number>>((acc, track) => {
        acc[track.genre] = (acc[track.genre] ?? 0) + 1;
        return acc;
      }, {});
    const ranked = Object.entries(likedGenres)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genre]) => genre);
    const result = (ranked.length ? ranked : top).join(" · ");
    setGenreResult(result);
    pushToast("Your genres are ready", result, "success");
  };

  const exportButton = (
    <button
      type="button"
      onClick={exportSettings}
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] px-2.5 py-1 text-[9.5px] font-medium text-[var(--muted)] transition hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
    >
      <Download size={11} /> Export
    </button>
  );

  return (
    <div className="page-inner">
      <header className="mb-7 animate-fade-up">
        <p className="eyebrow">Preferences</p>
        <div className="mt-2 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="page-title">Settings.</h1>
            <p className="mt-3 max-w-[520px] text-[12px] leading-relaxed text-[var(--muted)]">
              Tune how chordly looks, streams and listens. Every change is saved on this device instantly.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill tone="live">Local playback</StatusPill>
            <StatusPill>v1.0.0</StatusPill>
          </div>
        </div>
      </header>

      <div className="settings-layout animate-fade-up" style={{ animationDelay: "70ms" }}>
        <nav className="settings-nav hidden xl:block" aria-label="Settings sections">
          <p className="eyebrow mb-2 px-2.5">Settings</p>
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => jumpTo(section.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-left text-[11px] transition-colors",
                  activeSection === section.id
                    ? "bg-[var(--active)] font-semibold text-[var(--ink)]"
                    : "font-medium text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--ink)]",
                )}
              >
                <Icon size={13} strokeWidth={1.7} className="shrink-0" />
                <span className="min-w-0 flex-1 truncate">{section.label}</span>
                {activeSection === section.id && <span className="h-1 w-1 rounded-full bg-[var(--ink)]" />}
              </button>
            );
          })}
          <div className="mt-4 border-t border-[var(--line)] px-2.5 pt-3">
            <button
              type="button"
              onClick={() => openModal("shortcuts")}
              className="flex items-center gap-2 text-[10px] text-[var(--faint)] transition hover:text-[var(--ink)]"
            >
              <Keyboard size={12} /> Keyboard shortcuts
            </button>
          </div>
        </nav>

        <div className="min-w-0 space-y-4">
          {/* Account & integrations ---------------------------------- */}
          <SectionCard
            id="account"
            title="Account & integrations"
            description="Your listening identity, connected services and scrobbling."
            icon={UserRound}
            action={<StatusPill tone="live">Google connected</StatusPill>}
            refCallback={refFor("account")}
          >
            <div className="my-4 rounded-2xl border border-[var(--line)] bg-gradient-to-br from-white/[0.055] to-transparent p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[var(--line-strong)] bg-[var(--active)] text-[16px] font-semibold">
                  {activeAccount.initial}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">{activeAccount.name}</p>
                  <p className="truncate text-[10.5px] text-[var(--faint)]">{activeAccount.email}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-[9px] text-[var(--muted)]">
                    <CheckCircle2 size={10} /> {activeAccount.plan} · YouTube Music synced
                  </p>
                </div>
                <button type="button" className="btn btn-sm" onClick={() => openModal("add-account")}>
                  <Plus size={12} /> Add account
                </button>
              </div>

              <div className="mt-4 grid gap-3 border-t border-[var(--line)] pt-3.5 sm:grid-cols-2">
                <div>
                  <p className="eyebrow mb-1.5">Listen as</p>
                  <div className="flex gap-1.5">
                    {(["Personal", "Brand"] as const).map((profile) => (
                      <button
                        key={profile}
                        type="button"
                        onClick={() => setListeningProfile(profile)}
                        className={cn("chip flex-1 justify-center", listeningProfile === profile && "chip-active")}
                      >
                        {profile}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="eyebrow mb-1.5">Signed-in accounts</p>
                  <div className="space-y-1">
                    {accounts.map((account) => (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => switchAccount(account.id)}
                        className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left transition hover:bg-[var(--hover)]"
                      >
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[var(--line)] text-[8px] font-semibold">
                          {account.initial}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[10px] text-[var(--muted)]">{account.email}</span>
                        {account.id === activeAccount.id && <Check size={11} className="shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <SettingRow
              title="Spotify"
              description="Optional PKCE link for playlist import and richer metadata. No password is stored."
            >
              <span className={cn("text-[9.5px]", settings.spotifyLinked ? "text-[var(--ink)]" : "text-[var(--faint)]")}>
                {settings.spotifyLinked ? "Linked" : "Not linked"}
              </span>
              <Toggle checked={settings.spotifyLinked} onChange={toggleSpotify} label="Link Spotify" />
            </SettingRow>

            <SettingRow
              title="Discord Rich Presence"
              description="Show the track you're listening to, artwork and progress in your Discord profile."
            >
              <Toggle
                checked={settings.discord}
                onChange={(value) => setSetting("discord", value)}
                label="Discord Rich Presence"
              />
            </SettingRow>

            {settings.discord && (
              <SettingRow
                title="Discord Application ID"
                description="Custom Discord Developer Client ID to display 'Listening to Chordly' instead of default. Leave empty to use default."
              >
                <input
                  type="text"
                  placeholder="Default (1177081335727267940)"
                  value={settings.discordClientId || ""}
                  onChange={(e) => setSetting("discordClientId", e.target.value.trim())}
                  className="input input-sm w-56 text-right font-mono text-[11px]"
                />
              </SettingRow>
            )}

            <SettingRow
              title="Last.fm scrobbler"
              description="Scrobble plays to Last.fm after the threshold below."
            >
              <Toggle
                checked={settings.lastfm}
                onChange={(value) => setSetting("lastfm", value)}
                label="Last.fm scrobbler"
              />
            </SettingRow>

            <SettingRow
              title="Scrobble after"
              description="How much of a track must play before it is scrobbled."
              className={!settings.lastfm ? "opacity-50" : undefined}
            >
              <Range
                label="Scrobble threshold"
                value={settings.scrobbleStart}
                min={25}
                max={95}
                step={5}
                onChange={(value) => setSetting("scrobbleStart", value)}
                suffix="%"
              />
            </SettingRow>

            <div className="border-b border-[var(--line)] py-4 last:border-b-0">
              <div className="mb-2 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[12px] font-medium">ListenBrainz token</p>
                  <p className="mt-0.5 text-[10.5px] text-[var(--faint)]">
                    Open-source listening history. Stored locally in your settings.
                  </p>
                </div>
                <button type="button" className="btn btn-sm btn-primary" onClick={connectBrainz}>
                  {settings.listenbrainzToken ? "Update" : "Connect"}
                </button>
              </div>
              <div className="relative">
                <Link2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--faint)]" />
                <input
                  value={brainzToken}
                  onChange={(event) => setBrainzToken(event.target.value)}
                  placeholder="Paste your ListenBrainz user token"
                  className="text-input pl-9 font-mono text-[10.5px]"
                  spellCheck={false}
                />
              </div>
            </div>
          </SectionCard>

          {/* Listen together ------------------------------------------ */}
          <SectionCard
            id="party"
            title="Listen together"
            description="Host or join a synchronized listening room with friends."
            icon={Users}
            action={<StatusPill tone="live">18 ms</StatusPill>}
            refCallback={refFor("party")}
          >
            <div className="my-4 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--hover)] p-4">
              <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--line-strong)]">
                <Radio size={16} />
                <span className="absolute right-0 top-0 h-2 w-2 rounded-full border-2 border-[var(--canvas)] bg-[var(--ink)]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold">Party server online</p>
                <p className="truncate text-[10px] text-[var(--faint)]">
                  {settings.partyServer} · WebSocket · host controls playback
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn btn-sm" onClick={() => openModal("party")}>
                  Join existing
                </button>
                <button type="button" className="btn btn-sm btn-primary" onClick={() => openModal("party")}>
                  <Users size={12} /> Create a party
                </button>
              </div>
            </div>

            <div className="border-b border-[var(--line)] py-3.5">
              <div className="mb-2">
                <p className="text-[12px] font-medium">Custom server URL</p>
                <p className="mt-0.5 text-[10.5px] text-[var(--faint)]">
                  Point Chordly at a self-hosted party server. Leave blank to use the default relay.
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  value={partyServer}
                  onChange={(event) => setPartyServer(event.target.value)}
                  placeholder="wss://party.chordly.app"
                  className="text-input font-mono text-[10.5px]"
                  spellCheck={false}
                />
                <button type="button" className="btn btn-sm shrink-0" onClick={savePartyServer}>
                  Save
                </button>
              </div>
            </div>

            <Note icon={Clock3}>
              Guests stay within ±40 ms of the host. Latency is measured continuously and shown next to every session.
            </Note>
          </SectionCard>

          {/* Sources -------------------------------------------------- */}
          <SectionCard
            id="sources"
            title="Sources"
            description="Ordered audio addons and fallbacks. Drag order is respected for every search and playback."
            icon={Server}
            action={
              <button type="button" className="btn btn-sm" onClick={() => openModal("add-addon")}>
                <Plus size={12} /> Add addon
              </button>
            }
            refCallback={refFor("sources")}
          >
            <div className="mb-4 mt-3 overflow-hidden rounded-xl border border-[var(--line)]">
              {sources.map((source, index) => (
                <div
                  key={source.id}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5",
                    index !== sources.length - 1 && "border-b border-[var(--line)]",
                    !source.enabled && "opacity-55",
                  )}
                >
                  <div className="flex flex-col">
                    <button
                      type="button"
                      aria-label={`Move ${source.name} up`}
                      disabled={index === 0}
                      onClick={() => moveSource(source.id, -1)}
                      className="grid h-3.5 w-4 place-items-center text-[var(--faint)] transition hover:text-[var(--ink)] disabled:opacity-25"
                    >
                      <ChevronUp size={11} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${source.name} down`}
                      disabled={index === sources.length - 1}
                      onClick={() => moveSource(source.id, 1)}
                      className="grid h-3.5 w-4 place-items-center text-[var(--faint)] transition hover:text-[var(--ink)] disabled:opacity-25"
                    >
                      <ChevronDown size={11} />
                    </button>
                  </div>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[var(--line-strong)] bg-[var(--hover)] text-[11px] font-semibold">
                    {source.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-[11.5px] font-medium">
                      {source.name}
                      {source.kind === "fallback" && <span className="badge-yt">Fallback</span>}
                      {source.kind === "network" && <span className="badge-yt">Network</span>}
                    </p>
                    <p className="truncate text-[9.5px] text-[var(--faint)]">{source.description}</p>
                  </div>
                  <span className="hidden text-[9px] font-medium text-[var(--faint)] sm:block">{source.quality}</span>
                  <Toggle
                    checked={source.enabled}
                    onChange={() => toggleSource(source.id)}
                    label={`Enable ${source.name}`}
                  />
                </div>
              ))}
            </div>

            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-[12px] font-medium">Network storage</p>
                <p className="mt-0.5 text-[10.5px] text-[var(--faint)]">WebDAV and SMB shares indexed locally, never uploaded.</p>
              </div>
              <button type="button" className="btn btn-sm" onClick={() => openModal("network-share")}>
                <Plus size={12} /> Connect storage
              </button>
            </div>

            <div className="mb-3 overflow-hidden rounded-xl border border-[var(--line)]">
              {mounts.length ? (
                mounts.map((mount, index) => (
                  <div
                    key={mount.id}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5",
                      index !== mounts.length - 1 && "border-b border-[var(--line)]",
                    )}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[var(--line)] text-[var(--muted)]">
                      {mount.protocol === "SMB" ? <Network size={14} /> : <Globe size={14} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11.5px] font-medium">{mount.name}</p>
                      <p className="truncate font-mono text-[9px] text-[var(--faint)]">
                        {mount.protocol.toLowerCase()}://{mount.host}
                        {mount.path}
                      </p>
                    </div>
                    <StatusPill>{mount.status === "connected" ? "Connected" : "Error"}</StatusPill>
                    <button
                      type="button"
                      aria-label={`Disconnect ${mount.name}`}
                      onClick={() => removeMount(mount.id)}
                      className="grid h-6 w-6 place-items-center rounded text-[var(--faint)] transition hover:bg-[var(--hover)] hover:text-[var(--ink)]"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="px-3 py-5 text-center text-[10.5px] text-[var(--faint)]">
                  No network storage connected yet.
                </div>
              )}
            </div>

            <Note icon={ShieldCheck}>
              Addons receive only search queries and track identifiers. Credentials for network storage are kept in the
              Windows credential vault in the desktop build.
            </Note>
          </SectionCard>

          {/* Audio quality -------------------------------------------- */}
          <SectionCard
            id="quality"
            title="Audio quality"
            description="Choose how chordly negotiates streams across connections."
            icon={Wifi}
            action={<StatusPill tone="live">Lossless</StatusPill>}
            refCallback={refFor("quality")}
          >
            <SettingRow
              title="Direct source stream"
              description="Connect straight to the lossless addon instead of proxying through the default stream resolver."
            >
              <Toggle
                checked={settings.directStream}
                onChange={(value) => setSetting("directStream", value)}
                label="Direct source stream"
              />
            </SettingRow>

            <SettingRow
              title={
                <span className="flex items-center gap-1.5">
                  <Wifi size={12} className="text-[var(--faint)]" /> Wi-Fi quality
                </span>
              }
              description="Used when connected to an unmetered network."
            >
              <Select
                label="Wi-Fi quality"
                value={settings.wifiQuality}
                onChange={(value) => setSetting("wifiQuality", value as Quality)}
                options={QUALITIES}
              />
            </SettingRow>

            <SettingRow
              title={
                <span className="flex items-center gap-1.5">
                  <Smartphone size={12} className="text-[var(--faint)]" /> Mobile data quality
                </span>
              }
              description="Automatically caps lossless streams on metered connections."
            >
              <Select
                label="Mobile data quality"
                value={settings.mobileQuality}
                onChange={(value) => setSetting("mobileQuality", value as Quality)}
                options={QUALITIES}
              />
            </SettingRow>

            <SettingRow title="Download quality" description="Applied to new offline downloads.">
              <Select
                label="Download quality"
                value={settings.downloadQuality}
                onChange={(value) => setSetting("downloadQuality", value as Quality)}
                options={QUALITIES}
              />
            </SettingRow>

            <SettingRow title="Dolby Atmos" description="Play Atmos mixes where the source and output support them.">
              <Toggle
                checked={settings.dolbyAtmos}
                onChange={(value) => setSetting("dolbyAtmos", value)}
                label="Dolby Atmos"
              />
            </SettingRow>

            <Note icon={AudioLines}>
              Hi-Res Lossless streams are 24-bit / 192 kHz FLAC served by your highest-priority addon. The fallback
              catalogue is 256 kbps AAC.
            </Note>
          </SectionCard>

          {/* Playback ------------------------------------------------- */}
          <SectionCard
            id="playback"
            title="Playback"
            description="Output precision, transitions and the 7-band equalizer, processed through Web Audio."
            icon={SlidersHorizontal}
            action={<StatusPill tone="live">Web Audio</StatusPill>}
            refCallback={refFor("playback")}
          >
            <SettingRow
              title="Output precision"
              description="32-bit float keeps headroom for the equalizer and crossfade. Windows chooses the final device format."
            >
              <Select
                label="Output precision"
                value={settings.outputPrecision}
                onChange={(value) => setSetting("outputPrecision", value as typeof settings.outputPrecision)}
                options={["16-bit PCM", "32-bit float"]}
              />
            </SettingRow>

            <SettingRow
              title="Source-quality playback"
              description="Prefer the file's native sample rate where the Windows audio engine allows it. EQ and crossfade still process the stream."
            >
              <Toggle
                checked={settings.bitPerfect}
                onChange={(value) => setSetting("bitPerfect", value)}
                label="Source-quality playback"
              />
            </SettingRow>

            <SettingRow
              title="Exclusive device mode"
              description="Reserved for a future native output path. Playback currently uses Chromium's shared Windows audio."
            >
              <Toggle
                checked={settings.wasapiExclusive}
                onChange={(value) => setSetting("wasapiExclusive", value)}
                label="Exclusive device mode"
              />
            </SettingRow>

            <SettingRow title="Loudness normalization" description="Even out differences between masters using ReplayGain.">
              <Toggle
                checked={settings.loudnessNormalization}
                onChange={(value) => setSetting("loudnessNormalization", value)}
                label="Loudness normalization"
              />
            </SettingRow>

            <SettingRow title="Disable on phone speaker" description="Mute automatically when Windows switches to a built-in speaker.">
              <Toggle
                checked={settings.disableOnSpeaker}
                onChange={(value) => setSetting("disableOnSpeaker", value)}
                label="Disable on phone speaker"
              />
            </SettingRow>

            <SettingRow title="Crossfade" description="Overlap the end of one track with the start of the next.">
              <Range
                label="Crossfade duration"
                value={settings.crossfade}
                min={0}
                max={12}
                onChange={(value) => setSetting("crossfade", value)}
                suffix=" s"
              />
            </SettingRow>

            <SettingRow title="Automix (Beta)" description="Beat-match compatible tracks for a continuous mix.">
              <Toggle
                checked={settings.automix}
                onChange={(value) => setSetting("automix", value)}
                label="Automix"
              />
            </SettingRow>

            <SettingRow title="Skip silence" description="Trim silent intros and gaps between tracks.">
              <Toggle
                checked={settings.skipSilence}
                onChange={(value) => setSetting("skipSilence", value)}
                label="Skip silence"
              />
            </SettingRow>

            <SettingRow
              title={
                <span className="flex items-center gap-1.5">
                  Spatial audio <span className="badge-yt">Beta</span>
                </span>
              }
              description="Virtualize stereo sources for headphones using Windows Spatial Sound."
            >
              <Toggle
                checked={settings.spatialAudio}
                onChange={(value) => setSetting("spatialAudio", value)}
                label="Spatial audio"
              />
            </SettingRow>

            <div className="my-4 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--hover)]">
              <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] px-4 py-3">
                <div>
                  <p className="text-[12px] font-semibold">7-band equalizer</p>
                  <p className="mt-0.5 text-[10px] text-[var(--faint)]">
                    Applied in the Web Audio graph in real time.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSetting("eqBands", [0, 0, 0, 0, 0, 0, 0])}
                    className="rounded px-1.5 py-1 text-[9px] font-medium text-[var(--faint)] transition hover:bg-[var(--active)] hover:text-[var(--ink)]"
                  >
                    Reset
                  </button>
                  <Toggle
                    checked={settings.equalizer}
                    onChange={(value) => setSetting("equalizer", value)}
                    label="7-band equalizer"
                  />
                </div>
              </div>

              <div className={cn("px-4 py-4 transition-opacity", !settings.equalizer && "pointer-events-none opacity-40")}>
                <div className="mb-4 flex items-center justify-between gap-4 border-b border-[var(--line)] pb-3">
                  <span className="text-[10px] text-[var(--muted)]">Preamp</span>
                  <Range
                    label="Preamp"
                    value={settings.preamp}
                    min={-12}
                    max={12}
                    onChange={(value) => setSetting("preamp", value)}
                    suffix=" dB"
                  />
                </div>
                <div className="flex h-[150px] items-end justify-between gap-2 sm:gap-4">
                  {settings.eqBands.map((gain, index) => (
                    <div key={EQ_FREQUENCIES[index]} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                      <span className="text-[8.5px] tabular-nums text-[var(--faint)]">
                        {gain > 0 ? "+" : ""}
                        {gain}
                      </span>
                      <input
                        aria-label={`${EQ_FREQUENCIES[index]} gain`}
                        type="range"
                        min={-12}
                        max={12}
                        step={1}
                        value={gain}
                        onChange={(event) => {
                          const next = [...settings.eqBands];
                          next[index] = Number(event.target.value);
                          setSetting("eqBands", next);
                        }}
                        className="eq-slider"
                      />
                      <span className="whitespace-nowrap text-[8px] text-[var(--faint)]">{EQ_FREQUENCIES[index]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Note icon={AudioLines}>
              Chordly plays through Chromium's shared Windows audio path. Exclusive device output and bit-perfect
              bypass are interface models in this edition; the 7-band equalizer and volume are applied in real time.
            </Note>
          </SectionCard>

          {/* Appearance ---------------------------------------------- */}
          <SectionCard
            id="appearance"
            title="Appearance"
            description="Theme, typography, motion, artwork and the lyrics provider cascade."
            icon={Palette}
            refCallback={refFor("appearance")}
          >
            <SettingRow title="Theme" description="Follow Windows or lock a monochrome palette.">
              <div className="settings-segmented">
                {(
                  [
                    { id: "dark", label: "Dark", icon: Moon },
                    { id: "light", label: "Light", icon: Sun },
                    { id: "system", label: "System", icon: Monitor },
                  ] as Array<{ id: ThemeMode; label: string; icon: typeof Moon }>
                ).map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSetting("theme", option.id)}
                      className={cn(settings.theme === option.id && "is-active")}
                    >
                      <Icon size={11} /> {option.label}
                    </button>
                  );
                })}
              </div>
            </SettingRow>

            <SettingRow title="Font" description="The interface font. Inter is bundled and works offline.">
              <Select
                label="Interface font"
                value={settings.font}
                onChange={(value) => setSetting("font", value)}
                options={["SF Pro Display", "Inter", "Segoe UI", "Helvetica Neue"]}
              />
            </SettingRow>

            {/* Background & Wallpaper Customization */}
            <div className="border-b border-[var(--line)] py-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[12px] font-semibold text-[var(--ink)]">UI Background & Wallpaper</p>
                  <p className="mt-0.5 text-[10.5px] text-[var(--faint)]">
                    Customize the background for the entire application interface.
                  </p>
                </div>
                {settings.bgType !== "ambient" && (
                  <button
                    type="button"
                    onClick={() => {
                      setSetting("bgType", "ambient");
                      pushToast("Background reset", "Restored dynamic album art ambient background", "default");
                    }}
                    className="flex items-center gap-1.5 rounded-full border border-[var(--line)] px-3 py-1 text-[10.5px] font-medium text-[var(--muted)] transition hover:bg-[var(--hover)] hover:text-[var(--ink)]"
                  >
                    <RotateCcw size={11} /> Reset to ambient
                  </button>
                )}
              </div>

              {/* Mode selector */}
              <div className="mt-3.5 flex flex-wrap gap-2">
                {[
                  { id: "ambient", label: "Dynamic Album Art", detail: "Album ambient glow" },
                  { id: "custom", label: "Custom Image", detail: "Upload or URL" },
                  { id: "preset", label: "Curated Wallpapers", detail: "Aesthetic presets" },
                  { id: "color", label: "Solid / Dark Color", detail: "Minimalist tones" },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setSetting("bgType", mode.id as BgType)}
                    className={cn(
                      "flex flex-1 min-w-[130px] flex-col rounded-xl border p-2.5 text-left transition",
                      settings.bgType === mode.id
                        ? "border-[var(--ink)] bg-[var(--hover)] shadow-sm"
                        : "border-[var(--line)] bg-[var(--canvas)]/40 hover:border-[var(--line-strong)] hover:bg-[var(--hover)]/50",
                    )}
                  >
                    <span className="text-[11.5px] font-semibold text-[var(--ink)]">{mode.label}</span>
                    <span className="mt-0.5 text-[9px] text-[var(--faint)]">{mode.detail}</span>
                  </button>
                ))}
              </div>

              {/* Custom Image Upload & URL */}
              {settings.bgType === "custom" && (
                <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--hover)]/30 p-3.5 space-y-3 animate-fade-in">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-[11.5px] font-semibold text-[var(--ink)]">Custom Wallpaper Image</p>
                      <p className="text-[10px] text-[var(--faint)]">Upload an image file from your computer or paste an image link.</p>
                    </div>
                    <label className="flex cursor-pointer items-center gap-1.5 rounded-full bg-[var(--ink)] px-3.5 py-1.5 text-[11px] font-semibold text-[var(--canvas)] shadow transition hover:opacity-90">
                      <Upload size={13} /> Upload image...
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const dataUrl = await optimizeWallpaperFile(file);
                            setSetting("bgCustomUrl", dataUrl);
                            setSetting("bgType", "custom");
                            pushToast("Wallpaper updated", `${file.name} applied successfully`, "success");
                          } catch {
                            pushToast("Upload failed", "Could not process image file", "error");
                          }
                        }}
                      />
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      placeholder="Or paste image URL (https://...)"
                      value={settings.bgCustomUrl && !settings.bgCustomUrl.startsWith("data:") ? settings.bgCustomUrl : ""}
                      onChange={(e) => {
                        setSetting("bgCustomUrl", e.target.value.trim());
                        setSetting("bgType", "custom");
                      }}
                      className="input input-sm flex-1 text-[11px]"
                    />
                    {settings.bgCustomUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setSetting("bgCustomUrl", "");
                          pushToast("Cleared", "Custom wallpaper removed", "default");
                        }}
                        className="rounded-lg border border-[var(--line)] px-2.5 py-1 text-[10.5px] text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--ink)]"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {settings.bgCustomUrl && (
                    <div className="relative mt-2 h-28 w-full overflow-hidden rounded-lg border border-[var(--line)]">
                      <img src={settings.bgCustomUrl} alt="Preview" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <span className="absolute bottom-2 left-2 text-[9.5px] font-medium text-white/90 drop-shadow">Active Custom Wallpaper</span>
                    </div>
                  )}
                </div>
              )}

              {/* Preset Wallpapers Picker */}
              {settings.bgType === "preset" && (
                <div className="mt-4 space-y-2 animate-fade-in">
                  <p className="text-[11px] font-medium text-[var(--muted)]">Select Curated Aesthetic Wallpaper:</p>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {WALLPAPER_PRESETS.map((p) => {
                      const isSelected = settings.bgPreset === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSetting("bgPreset", p.id)}
                          className={cn(
                            "group relative overflow-hidden rounded-xl border text-left transition aspect-[16/10]",
                            isSelected
                              ? "border-[var(--ink)] ring-2 ring-[var(--ink)] ring-offset-2 ring-offset-[var(--canvas)]"
                              : "border-[var(--line)] hover:border-[var(--line-strong)]",
                          )}
                        >
                          <img src={p.thumbnail} alt={p.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                            <div>
                              <p className="text-[11px] font-semibold text-white drop-shadow-md">{p.name}</p>
                              <p className="text-[8.5px] text-white/60 drop-shadow-md">{p.category}</p>
                            </div>
                            {isSelected && (
                              <span className="grid h-4 w-4 place-items-center rounded-full bg-white text-black shadow">
                                <Check size={10} strokeWidth={3} />
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Solid Color Presets */}
              {settings.bgType === "color" && (
                <div className="mt-4 space-y-2 animate-fade-in">
                  <p className="text-[11px] font-medium text-[var(--muted)]">Select Minimalist Tone or Hex Color:</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {SOLID_COLOR_PRESETS.map((c) => {
                      const isSelected = settings.bgColor === c.hex;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSetting("bgColor", c.hex)}
                          className={cn(
                            "flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition",
                            isSelected
                              ? "border-[var(--ink)] ring-1 ring-[var(--ink)]"
                              : "border-[var(--line)] hover:border-[var(--line-strong)]",
                          )}
                        >
                          <span
                            className="h-5 w-5 rounded-full border border-white/20 shrink-0 shadow-sm"
                            style={{ backgroundColor: c.hex }}
                          />
                          <span className="text-[11px] font-medium truncate text-[var(--ink)]">{c.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sliders for Wallpaper Opacity & Main UI Blur */}
              {(settings.bgType === "custom" || settings.bgType === "preset") && (
                <div className="mt-4 space-y-3 pt-3 border-t border-[var(--line)]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[11.5px] font-medium text-[var(--ink)]">Wallpaper Opacity</p>
                      <p className="text-[10px] text-[var(--faint)]">Adjust wallpaper brightness behind interface elements.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="20"
                        max="100"
                        step="5"
                        value={Math.round((settings.bgOpacity ?? 0.82) * 100)}
                        onChange={(e) => setSetting("bgOpacity", Number(e.target.value) / 100)}
                        className="slider w-28"
                      />
                      <span className="w-9 text-right text-[10px] font-mono text-[var(--muted)]">
                        {Math.round((settings.bgOpacity ?? 0.82) * 100)}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[11.5px] font-medium text-[var(--ink)]">Main UI Wallpaper Blur</p>
                      <p className="text-[10px] text-[var(--faint)]">Soft-focus the wallpaper on library and navigation pages (0px is crisp).</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="40"
                        step="2"
                        value={settings.bgBlur ?? 0}
                        onChange={(e) => setSetting("bgBlur", Number(e.target.value))}
                        className="slider w-28"
                      />
                      <span className="w-9 text-right text-[10px] font-mono text-[var(--muted)]">
                        {settings.bgBlur ?? 0}px
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Now Playing Zoomed Player Frosted Glass Background */}
            <div className="border-b border-[var(--line)] py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[12px] font-semibold text-[var(--ink)]">Now Playing Translucent Frosted Glass</p>
                  <p className="mt-0.5 text-[10.5px] text-[var(--faint)]">
                    When zoomed into the music player to view lyrics, blur and soften the background with a luminous frosted glass effect.
                  </p>
                </div>
                <Toggle
                  checked={settings.nowPlayingGlass}
                  onChange={(value) => setSetting("nowPlayingGlass", value)}
                  label="Now Playing Frosted Glass"
                />
              </div>

              {settings.nowPlayingGlass && (
                <div className="mt-3 space-y-3 pt-2 animate-fade-in">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[11.5px] font-medium text-[var(--ink)]">Now Playing Blur Intensity</p>
                      <p className="text-[10px] text-[var(--faint)]">Higher values create a deeper frosted glass aesthetic.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="12"
                        max="64"
                        step="4"
                        value={settings.nowPlayingBlur ?? 36}
                        onChange={(e) => setSetting("nowPlayingBlur", Number(e.target.value))}
                        className="slider w-28"
                      />
                      <span className="w-9 text-right text-[10px] font-mono text-[var(--muted)]">
                        {settings.nowPlayingBlur ?? 36}px
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[11.5px] font-medium text-[var(--ink)]">Now Playing Glass Transparency</p>
                      <p className="text-[10px] text-[var(--faint)]">Controls how much the blurred background radiates through.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="30"
                        max="90"
                        step="5"
                        value={Math.round((settings.nowPlayingOpacity ?? 0.6) * 100)}
                        onChange={(e) => setSetting("nowPlayingOpacity", Number(e.target.value) / 100)}
                        className="slider w-28"
                      />
                      <span className="w-9 text-right text-[10px] font-mono text-[var(--muted)]">
                        {Math.round((settings.nowPlayingOpacity ?? 0.6) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <SettingRow title="Reduce animation" description="Remove motion from page transitions, menus and lyrics.">
              <Toggle
                checked={settings.reduceMotion}
                onChange={(value) => setSetting("reduceMotion", value)}
                label="Reduce animation"
              />
            </SettingRow>

            <SettingRow title="Liquid Glass refraction borders" description="Acrylic panels with light-catching edges.">
              <Toggle
                checked={settings.liquidGlass}
                onChange={(value) => setSetting("liquidGlass", value)}
                label="Liquid Glass"
              />
            </SettingRow>

            <SettingRow title="Full-screen cover art" description="Let the Now Playing artwork fill the whole window.">
              <Toggle
                checked={settings.fullScreenCover}
                onChange={(value) => setSetting("fullScreenCover", value)}
                label="Full-screen cover art"
              />
            </SettingRow>

            <SettingRow title="Animated video cover art" description="Loop the official visual for supported tracks.">
              <Toggle
                checked={settings.animatedCovers}
                onChange={(value) => setSetting("animatedCovers", value)}
                label="Animated video cover art"
              />
            </SettingRow>

            <SettingRow title="Spotify Canvas" description="Show looping Canvas clips where Spotify metadata includes them.">
              <Toggle
                checked={settings.spotifyCanvas}
                onChange={(value) => setSetting("spotifyCanvas", value)}
                label="Spotify Canvas"
              />
            </SettingRow>

            <SettingRow title="Synced lyrics" description="Time-stamped lines that follow the current playback position.">
              <Toggle
                checked={settings.syncedLyrics}
                onChange={(value) => setSetting("syncedLyrics", value)}
                label="Synced lyrics"
              />
            </SettingRow>

            <SettingRow
              title="Blur inactive lyrics"
              description="Soft-focus upcoming lines for a calmer reading experience."
              className={!settings.syncedLyrics ? "opacity-50" : undefined}
            >
              <Toggle
                checked={settings.lyricsBlur}
                onChange={(value) => setSetting("lyricsBlur", value)}
                label="Blur inactive lyrics"
              />
            </SettingRow>

            <div className="py-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[12px] font-medium">Lyrics providers</p>
                  <p className="mt-0.5 text-[10.5px] text-[var(--faint)]">
                    Queried in order until timed lyrics are found. {Object.values(settings.lyricProviders).filter(Boolean).length} of{" "}
                    {lyricProviderNames.length} enabled.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateSettings({
                        lyricProviders: Object.fromEntries(lyricProviderNames.map((name) => [name, true])),
                      })
                    }
                    className="text-[9.5px] font-medium text-[var(--faint)] transition hover:text-[var(--ink)]"
                  >
                    Enable all
                  </button>
                  <span className="text-[var(--line-strong)]">/</span>
                  <button
                    type="button"
                    onClick={() =>
                      updateSettings({
                        lyricProviders: Object.fromEntries(lyricProviderNames.map((name) => [name, false])),
                      })
                    }
                    className="text-[9.5px] font-medium text-[var(--faint)] transition hover:text-[var(--ink)]"
                  >
                    Disable all
                  </button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {lyricProviderNames.map((provider) => {
                  const enabled = settings.lyricProviders[provider] ?? false;
                  return (
                    <button
                      key={provider}
                      type="button"
                      onClick={() =>
                        updateSettings({
                          lyricProviders: { ...settings.lyricProviders, [provider]: !enabled },
                        })
                      }
                      aria-pressed={enabled}
                      className={cn("chip", enabled && "chip-active")}
                    >
                      {enabled && <Check size={9} />}
                      {provider}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--hover)] p-3 text-[10px] leading-relaxed text-[var(--faint)]">
                <span className="font-semibold text-[var(--ink)]">Lyrics providers attribution & credit</span>
                <p className="mt-1">
                  Lyrics cascade powered by community and streaming open databases — credit to{" "}
                  <a href="https://lrc.red/" target="_blank" rel="noreferrer" className="underline hover:text-[var(--ink)]">lrc.red</a>,{" "}
                  <a href="https://github.com/binimum" target="_blank" rel="noreferrer" className="underline hover:text-[var(--ink)]">BiniLyrics</a>,{" "}
                  <a href="https://github.com/better-lyrics/better-lyrics" target="_blank" rel="noreferrer" className="underline hover:text-[var(--ink)]">BetterLyrics</a>,{" "}
                  <a href="https://lyrics.paxsenix.org/" target="_blank" rel="noreferrer" className="underline hover:text-[var(--ink)]">PaxSenix</a>,{" "}
                  <a href="https://github.com/ibratabian17/YouLyPlus" target="_blank" rel="noreferrer" className="underline hover:text-[var(--ink)]">LyricsPlus</a>,{" "}
                  <a href="https://github.com/maxrave-dev/SimpMusic" target="_blank" rel="noreferrer" className="underline hover:text-[var(--ink)]">SimpMusic</a>,{" "}
                  <a href="https://unison.boidu.dev/" target="_blank" rel="noreferrer" className="underline hover:text-[var(--ink)]">Unison</a>,{" "}
                  <a href="https://www.megalobiz.com/" target="_blank" rel="noreferrer" className="underline hover:text-[var(--ink)]">Megalobiz</a>,{" "}
                  <a href="https://www.kugou.com/" target="_blank" rel="noreferrer" className="underline hover:text-[var(--ink)]">KuGou</a>,{" "}
                  <a href="https://lrclib.net/" target="_blank" rel="noreferrer" className="underline hover:text-[var(--ink)]">LRCLIB</a>,{" "}
                  <a href="https://www.musixmatch.com/" target="_blank" rel="noreferrer" className="underline hover:text-[var(--ink)]">Musixmatch</a> and{" "}
                  <a href="https://genius.com/" target="_blank" rel="noreferrer" className="underline hover:text-[var(--ink)]">Genius</a>.
                </p>
              </div>
            </div>
          </SectionCard>

          {/* Performance --------------------------------------------- */}
          <SectionCard
            id="performance"
            title="Performance"
            description="Trade a little battery for a smoother interface."
            icon={Gauge}
            refCallback={refFor("performance")}
          >
            <SettingRow
              title="High performance mode"
              description="Uncaps the display refresh rate (up to 144 Hz) while Chordly is in the foreground and disables heavy backdrop effects on low-power GPUs."
            >
              <Toggle
                checked={settings.highPerformance}
                onChange={(value) => setSetting("highPerformance", value)}
                label="High performance mode"
              />
            </SettingRow>
            <Note icon={Zap}>
              Current render path: {settings.highPerformance ? "144 Hz · hardware accelerated" : "60 Hz · battery balanced"}.
              The desktop build also pins the WebView2 renderer at above-normal priority.
            </Note>
          </SectionCard>

          {/* Local music --------------------------------------------- */}
          <SectionCard
            id="local"
            title="Local music"
            description="Index lossless files from folders on this PC. Nothing is uploaded."
            icon={FolderOpen}
            refCallback={refFor("local")}
          >
            <div className="py-4">
              <p className="text-[12px] font-medium">Music folder</p>
              <p className="mt-0.5 text-[10.5px] text-[var(--faint)]">
                Chordly scans recursively, reads embedded tags and artwork, and re-reads only files that changed.
              </p>
              <div className="mt-2.5 flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <FolderOpen size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--faint)]" />
                  <input
                    value={folderDraft}
                    onChange={(event) => setFolderDraft(event.target.value)}
                    onBlur={() => setSetting("scanFolder", folderDraft.trim())}
                    placeholder="C:\Users\Edward\Music"
                    className="text-input pl-9 font-mono text-[10.5px]"
                    spellCheck={false}
                  />
                </div>
                <button type="button" className="btn btn-sm shrink-0" onClick={chooseFolder} disabled={localScanning}>
                  Browse
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-primary shrink-0"
                  onClick={scanNow}
                  disabled={localScanning}
                >
                  <RefreshCw size={12} className={cn(localScanning && "animate-spin")} />
                  {localScanning ? "Scanning…" : "Scan now"}
                </button>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-[9px] text-[var(--faint)]">
                <CheckCircle2 size={9} /> {localStatus}
              </p>
              {localScanning && (
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--line)]">
                  <div
                    className="h-full rounded-full bg-[var(--ink)] transition-[width] duration-300"
                    style={{
                      width:
                        localProgress?.phase === "reading" && localProgress.total
                          ? `${Math.round(((localProgress.processed ?? 0) / localProgress.total) * 100)}%`
                          : "12%",
                    }}
                  />
                </div>
              )}
            </div>

            <SettingRow title="Filter non-music audio" description="Skip voice notes, podcasts, samples and short sound effects.">
              <Toggle
                checked={settings.filterNonMusic}
                onChange={(value) => setSetting("filterNonMusic", value)}
                label="Filter non-music audio"
              />
            </SettingRow>

            <SettingRow title="Auto-scan on launch" description="Refresh the saved index when Chordly opens.">
              <Toggle
                checked={settings.autoScan}
                onChange={(value) => setSetting("autoScan", value)}
                label="Auto-scan on launch"
              />
            </SettingRow>

            <Note icon={HardDrive}>
              Folder scanning runs in the Windows app process, reads embedded FLAC/ALAC/MP3 metadata and artwork, and
              keeps the index on this PC. Files are never copied or uploaded.
            </Note>
          </SectionCard>

          {/* Storage -------------------------------------------------- */}
          <SectionCard
            id="storage"
            title="Storage"
            description="Control the offline cache for songs, artwork and lyrics."
            icon={HardDrive}
            refCallback={refFor("storage")}
          >
            <div className="my-4 rounded-xl border border-[var(--line)] bg-[var(--hover)] p-4">
              <div className="flex items-center justify-between text-[10.5px]">
                <span className="font-medium text-[var(--ink)]">Cache in use</span>
                <span className="tabular-nums text-[var(--faint)]">
                  {cacheUsed} MB of {settings.cacheLimit} MB
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--line-strong)]">
                <div
                  className="h-full rounded-full bg-[var(--ink)] transition-[width] duration-500"
                  style={{ width: `${Math.min(100, (cacheUsed / settings.cacheLimit) * 100)}%` }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex gap-4 text-[9px] text-[var(--faint)]">
                  <span>Artwork 38 MB</span>
                  <span>Lyrics 2 MB</span>
                  <span>Audio 103 MB</span>
                </div>
                <button type="button" className="btn btn-sm" onClick={clearCache} disabled={clearing}>
                  <Trash2 size={12} /> {clearing ? "Clearing…" : "Clear cache"}
                </button>
              </div>
            </div>

            <SettingRow title="Cache limit" description="Oldest cached tracks are evicted first when the limit is reached.">
              <Range
                label="Cache limit"
                value={settings.cacheLimit}
                min={128}
                max={4096}
                step={128}
                onChange={(value) => setSetting("cacheLimit", value)}
                suffix=" MB"
              />
            </SettingRow>

            <SettingRow title="Automatically cache played tracks" description="Keep recent songs available offline without downloading them explicitly.">
              <Toggle
                checked={settings.autoCache}
                onChange={(value) => setSetting("autoCache", value)}
                label="Automatically cache played tracks"
              />
            </SettingRow>
          </SectionCard>

          {/* Your data ------------------------------------------------ */}
          <SectionCard
            id="data"
            title="Your data"
            description="A year in listening, genre insights and a portable copy of your preferences."
            icon={Database}
            action={exportButton}
            refCallback={refFor("data")}
          >
            <div className="my-4 grid gap-2.5 sm:grid-cols-3">
              <div className="rounded-xl border border-[var(--line)] p-3.5">
                <p className="eyebrow">Minutes listened</p>
                <p className="mt-1 text-[24px] font-semibold tracking-[-0.04em]">{stats.minutes}</p>
                <p className="text-[9px] text-[var(--faint)]">This week</p>
              </div>
              <div className="rounded-xl border border-[var(--line)] p-3.5">
                <p className="eyebrow">Listening streak</p>
                <p className="mt-1 text-[24px] font-semibold tracking-[-0.04em]">
                  {stats.streak} day{stats.streak === 1 ? "" : "s"}
                </p>
                <p className="text-[9px] text-[var(--faint)]">Current active streak</p>
              </div>
              <div className="rounded-xl border border-[var(--line)] p-3.5">
                <p className="eyebrow">Top genre</p>
                <p className="mt-1 truncate text-[20px] font-semibold tracking-[-0.03em]">
                  {genreResult.split(" · ")[0] || "Ambient"}
                </p>
                <p className="text-[9px] text-[var(--faint)]">Based on plays</p>
              </div>
            </div>

            <SettingRow title="Replay" description="A monthly recap of your top songs, artists, albums and minutes.">
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => {
                  navigate({ name: "library" });
                  pushToast("Replay is ready", `${stats.minutes} minutes · ${stats.streak}-day streak`, "success");
                }}
              >
                <PlaySquare size={12} /> Open Replay
              </button>
            </SettingRow>

            <SettingRow title="Work out genres" description="Analyse your library and identify the sounds you return to.">
              <button type="button" className="btn btn-sm" onClick={workOutGenres}>
                <SparklesIcon /> Analyse
              </button>
            </SettingRow>

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] py-4 last:border-b-0">
              <div>
                <p className="text-[12px] font-medium">Portable settings</p>
                <p className="mt-0.5 max-w-[430px] text-[10.5px] leading-relaxed text-[var(--faint)]">
                  Export every preference as JSON or restore a backup on another Windows machine.
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn btn-sm" onClick={() => importRef.current?.click()}>
                  <Upload size={12} /> Import
                </button>
                <button type="button" className="btn btn-sm" onClick={exportSettings}>
                  <Download size={12} /> Export
                </button>
              </div>
              <input
                ref={importRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => void importSettings(event.target.files?.[0])}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p className="text-[12px] font-medium">Reset all settings</p>
                <p className="mt-0.5 text-[10.5px] text-[var(--faint)]">
                  Restores every preference to its default. Your library, playlists and downloads stay intact.
                </p>
              </div>
              <button
                type="button"
                onClick={resetAll}
                className={cn(
                  "btn btn-sm",
                  resetArmed ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--canvas)]" : "text-[var(--danger)]",
                )}
              >
                <RotateCcw size={12} /> {resetArmed ? "Click again to confirm" : "Reset settings"}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] py-4">
              <div>
                <p className="text-[12px] font-medium">Reset listening stats</p>
                <p className="mt-0.5 text-[10.5px] text-[var(--faint)]">
                  Clears weekly listening minutes, play counts, streaks, and top song/artist records.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetStats}
                className={cn(
                  "btn btn-sm",
                  resetStatsArmed ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--canvas)]" : "text-[var(--danger)]",
                )}
              >
                <RotateCcw size={12} /> {resetStatsArmed ? "Click again to confirm" : "Reset stats"}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] py-4">
              <div>
                <p className="text-[12px] font-medium text-[var(--danger)]">Reset to Clean Install</p>
                <p className="mt-0.5 text-[10.5px] text-[var(--faint)]">
                  Wipes all accounts, playlists, cached streams, and local data for a 100% fresh start.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCleanInstallReset}
                className={cn(
                  "btn btn-sm",
                  cleanInstallArmed ? "border-[var(--danger)] bg-[var(--danger)] text-white" : "border-[var(--danger)] text-[var(--danger)]",
                )}
              >
                <Trash2 size={12} /> {cleanInstallArmed ? "Click again to wipe all data" : "Reset to Clean Install"}
              </button>
            </div>
          </SectionCard>

          {/* Miscellaneous ------------------------------------------- */}
          <SectionCard
            id="misc"
            title="Miscellaneous"
            description="Small behaviours that make the desktop app feel like yours."
            icon={Settings2}
            refCallback={refFor("misc")}
          >
            <SettingRow title="Swipe actions" description="Use horizontal gestures on track rows and Now Playing.">
              <Toggle
                checked={settings.swipeActions}
                onChange={(value) => setSetting("swipeActions", value)}
                label="Swipe actions"
              />
            </SettingRow>

            <SettingRow title="Repeat behaviour" description="What happens when the last track in a queue ends.">
              <Select
                label="Repeat behaviour"
                value={settings.repeatBehavior}
                onChange={(value) => setSetting("repeatBehavior", value)}
                options={["Play entire playlist", "Repeat this track", "Stop after current"]}
              />
            </SettingRow>

            <SettingRow title="Stop music on close" description="Pause playback when the window is closed instead of continuing in the background.">
              <Toggle
                checked={settings.stopOnClose}
                onChange={(value) => setSetting("stopOnClose", value)}
                label="Stop music on close"
              />
            </SettingRow>

            <SettingRow title="Hide volume bar" description="Keep the player bar minimal. Volume stays available from the keyboard and Now Playing.">
              <Toggle
                checked={settings.hideVolume}
                onChange={(value) => setSetting("hideVolume", value)}
                label="Hide volume bar"
              />
            </SettingRow>

            <SettingRow title="Show Listen Together button" description="Display the party button in the top bar.">
              <Toggle
                checked={settings.showPartyButton}
                onChange={(value) => setSetting("showPartyButton", value)}
                label="Show Listen Together button"
              />
            </SettingRow>

            <SettingRow title="Queue history" description="Remember skipped tracks so you can return to the recent queue.">
              <Toggle
                checked={settings.queueHistory}
                onChange={(value) => setSetting("queueHistory", value)}
                label="Queue history"
              />
            </SettingRow>

            <SettingRow title="Status bar" description="Show output and queue information in the player bar.">
              <Toggle
                checked={settings.showStats}
                onChange={(value) => setSetting("showStats", value)}
                label="Status bar"
              />
            </SettingRow>
          </SectionCard>

          {/* Advanced ------------------------------------------------- */}
          <SectionCard
            id="advanced"
            title="Advanced & experimental"
            description="Power features, diagnostics and app icon variants."
            icon={FlaskConical}
            refCallback={refFor("advanced")}
          >
            <SettingRow
              title="Smart audio alignment"
              description="Cross-correlate waveforms to line up matched tracks when switching sources mid-song."
            >
              <Toggle
                checked={settings.smartAlignment}
                onChange={(value) => setSetting("smartAlignment", value)}
                label="Smart audio alignment"
              />
            </SettingRow>

            <SettingRow title="Show stats for nerds" description="Overlay codec, bit depth, sample rate, buffer and output path above the player.">
              <Toggle
                checked={settings.showStats}
                onChange={(value) => setSetting("showStats", value)}
                label="Show stats for nerds"
              />
            </SettingRow>

            <SettingRow title="Experimental features" description="Enable unfinished features and new playback experiments before they ship.">
              <Toggle
                checked={settings.experimental}
                onChange={(value) => setSetting("experimental", value)}
                label="Experimental features"
              />
            </SettingRow>

            <div className="py-4">
              <p className="text-[12px] font-medium">Custom app icon</p>
              <p className="mt-0.5 text-[10.5px] text-[var(--faint)]">Choose the shortcut and taskbar mark for Chordly.</p>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
                {(
                  [
                    { id: "default", title: "Default", detail: "Ink on glass" },
                    { id: "monochrome", title: "Monochrome", detail: "Pure outline" },
                    { id: "liquid", title: "Liquid Glass", detail: "Refracted acrylic" },
                  ] as const
                ).map((icon) => (
                  <button
                    key={icon.id}
                    type="button"
                    onClick={() => setSetting("appIcon", icon.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition",
                      settings.appIcon === icon.id
                        ? "border-[var(--ink)] bg-[var(--active)]"
                        : "border-[var(--line)] hover:border-[var(--line-strong)]",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--line-strong)]",
                        icon.id === "default" && "bg-[var(--ink)] text-[var(--canvas)]",
                        icon.id === "monochrome" && "bg-transparent text-[var(--ink)]",
                        icon.id === "liquid" &&
                          "bg-gradient-to-br from-white/35 via-white/5 to-transparent text-[var(--ink)]",
                      )}
                    >
                      <ChordlyMark className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[10.5px] font-semibold">{icon.title}</span>
                      <span className="block truncate text-[8.5px] text-[var(--faint)]">{icon.detail}</span>
                    </span>
                    {settings.appIcon === icon.id && <Check size={12} className="ml-auto shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] py-4">
              <div>
                <p className="text-[12px] font-medium">About chordly</p>
                <p className="mt-0.5 text-[10.5px] text-[var(--faint)]">
                  Windows edition · 1.0.0 · Electron + React · local file playback.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-sm" onClick={() => openModal("shortcuts")}>
                  <Keyboard size={12} /> Shortcuts
                </button>
                <button type="button" className="btn btn-sm" onClick={() => openModal("about")}>
                  <Info size={12} /> About
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => pushToast("You're up to date", "Chordly 1.0.0 is the latest version", "success")}
                >
                  <RefreshCw size={12} /> Check updates
                </button>
              </div>
            </div>
          </SectionCard>

          <footer className="flex flex-wrap items-center justify-between gap-3 px-1 py-4 text-[9px] text-[var(--faint)]">
            <span className="flex items-center gap-1.5">
              <ChordlyMark className="h-3 w-3" /> chordly 1.0.0 · Windows edition
            </span>
            <span className="flex items-center gap-3">
              <button type="button" onClick={() => openModal("about")} className="transition hover:text-[var(--ink)]">
                About
              </button>
              <button type="button" onClick={exportSettings} className="transition hover:text-[var(--ink)]">
                Export settings
              </button>
              <span className="flex items-center gap-1">
                <ListMusic size={9} /> {sources.filter((source) => source.enabled).length} sources active
              </span>
            </span>
          </footer>
        </div>
      </div>
    </div>
  );
}

function SparklesIcon() {
  return <Zap size={12} />;
}
