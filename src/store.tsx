import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  albumById,
  artistById,
  cover,
  initialAccounts,
  initialDownloads,
  initialLiked,
  initialMounts,
  initialPlaylists,
  initialRecentSearches,
  initialRecents,
  initialSources,
  registerRemoteTracks,
  syncLocalTracks,
  trackById,
  tracks,
} from "./data";
import {
  DEFAULT_SETTINGS,
  type Account,
  type AppSettings,
  type LocalLibrary,
  type ModalType,
  type NetworkMount,
  type Playlist,
  type RepeatMode,
  type ScanProgress,
  type Source,
  type Toast,
  type Track,
  type View,
} from "./types";
import { generateId } from "./lib/utils";
import { formatBytes, getDesktopBridge, isDesktopApp } from "./desktop";

/* ------------------------------------------------------------------ */
/*  Persistence helpers                                                */
/* ------------------------------------------------------------------ */

function readKey<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function useStoredState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => readKey(key, initial));
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage is optional */
    }
  }, [key, value]);
  return [value, setValue];
}

function readSettings(): AppSettings {
  const saved = readKey<Partial<AppSettings> | null>("chordly.settings.v2", null);
  if (!saved) return { ...DEFAULT_SETTINGS, lyricProviders: { ...DEFAULT_SETTINGS.lyricProviders } };
  return {
    ...DEFAULT_SETTINGS,
    ...saved,
    lyricProviders: { ...DEFAULT_SETTINGS.lyricProviders, ...(saved.lyricProviders ?? {}) },
    eqBands:
      Array.isArray(saved.eqBands) && saved.eqBands.length === 7 ? saved.eqBands : DEFAULT_SETTINGS.eqBands,
  };
}

const EMPTY_LOCAL_LIBRARY: LocalLibrary = {
  folder: null,
  scannedAt: null,
  tracks: [],
  totalBytes: 0,
  skipped: 0,
};

function scanErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  return (
    raw.replace(/^Error invoking remote method '[^']+':\s*(?:Error:\s*)?/, "").trim() ||
    "Windows could not read that folder."
  );
}

export interface StoredStats {
  dailySeconds: Record<string, number>;
  trackPlays: Record<string, number>;
  artistPlays: Record<string, number>;
  albumPlays: Record<string, number>;
  lastActiveDate: string;
  streak: number;
}

const initialStoredStats: StoredStats = {
  dailySeconds: {},
  trackPlays: {},
  artistPlays: {},
  albumPlays: {},
  lastActiveDate: "",
  streak: 0,
};

function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

interface AppContextValue {
  /* navigation */
  view: View;
  navigate: (view: View) => void;
  goBack: () => void;
  goForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  openSearch: (query?: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  recentSearches: string[];
  addRecentSearch: (query: string) => void;
  removeRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;

  /* library */
  liked: string[];
  isLiked: (track: Track | string) => boolean;
  toggleLike: (track: Track) => void;
  downloads: string[];
  isDownloaded: (track: Track | string) => boolean;
  toggleDownload: (track: Track) => void;
  localTracks: Track[];
  localLibrary: LocalLibrary;
  localScanning: boolean;
  localProgress: ScanProgress | null;
  isDesktop: boolean;
  chooseLocalFolder: () => Promise<void>;
  scanLocalFolder: (folder?: string) => Promise<void>;
  revealLocalTrack: (track: Track) => void;
  recents: string[];
  playlists: Playlist[];
  createPlaylist: (name: string, description?: string, coverUrl?: string, trackIds?: string[]) => string;
  addTrackToPlaylist: (playlistId: string, track: Track) => void;
  deletePlaylist: (playlistId: string) => void;
  refreshAccounts: () => Promise<void>;
  refreshPlaylists: (accountId?: string) => Promise<void>;
  loadPlaylistTracks: (playlistId: string, accountId?: string) => Promise<Track[]>;
  setPlaylists: Dispatch<SetStateAction<Playlist[]>>;

  /* statistics */
  stats: { minutes: number; streak: number };
  weekStats: Array<{ day: string; date: string; seconds: number; value: number; isToday: boolean }>;
  topSong: Track | null;
  topSongs: Track[];
  topArtist: { id: string; name: string; cover: string; genre: string; monthly?: string; plays?: number } | null;
  topArtists: Array<{ id: string; name: string; cover: string; genre: string; monthly?: string; plays?: number }>;
  topAlbum: { id: string; title: string; artist: string; cover: string; genre?: string; year?: number; plays?: number } | null;
  topAlbums: Array<{ id: string; title: string; artist: string; cover: string; genre?: string; year?: number; plays?: number }>;
  recordListeningTime: (seconds: number) => void;
  recordTrackPlay: (track: Track) => void;
  resetStats: () => void;

  /* accounts */
  accounts: Account[];
  activeAccount: Account;
  switchAccount: (id: string) => void;
  addAccount: (data: { name: string; email: string; brand: boolean }) => void;
  listeningProfile: "Personal" | "Brand";
  setListeningProfile: (profile: "Personal" | "Brand") => void;

  /* audio player */
  queue: Track[];
  queueLabel: string;
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeatMode: RepeatMode;
  playQueue: (tracks: Track[], startIndex?: number, label?: string) => void;
  playTrack: (track: Track, list?: Track[], label?: string) => void;
  playFromQueue: (trackId: string) => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  seekBy: (seconds: number) => void;
  changeVolume: (value: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  addToQueue: (track: Track) => void;
  playNext: (track: Track) => void;
  removeFromQueue: (trackId: string) => void;
  clearQueue: () => void;
  nowPlayingOpen: boolean;
  setNowPlayingOpen: (open: boolean) => void;
  queueOpen: boolean;
  setQueueOpen: (open: boolean) => void;
  nerdsStatsOpen: boolean;
  setNerdsStatsOpen: (open: boolean) => void;
  toggleNerdsStats: () => void;
  upgradeTrackToLossless: (targetTrack?: Track) => Promise<Track | null>;
  upgradingLossless: boolean;

  /* sources */
  sources: Source[];
  toggleSource: (id: string) => void;
  moveSource: (id: string, direction: -1 | 1) => void;
  addSource: (source: Omit<Source, "id">) => void;
  mounts: NetworkMount[];
  addMount: (mount: Omit<NetworkMount, "id">) => void;
  removeMount: (id: string) => void;

  /* settings */
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  setSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  resetSettings: () => void;

  /* ui */
  modal: ModalType;
  openModal: (modal: ModalType) => void;
  closeModal: () => void;
  toasts: Toast[];
  pushToast: (title: string, description?: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: number) => void;

  /* share & party */
  shareTarget: { track?: Track; playlist?: Playlist } | null;
  openShare: (target?: { track?: Track; playlist?: Playlist }) => void;
  partyRoom: { roomCode: string; isHost: boolean; memberCount: number; pingMs: number; hostIp: string } | null;
  startPartyHost: () => Promise<any>;
  joinPartyRoom: (code: string, hostAddress?: string) => Promise<boolean>;
  leaveParty: () => void;
  broadcastPartyState: (track?: Track | null, currentTime?: number, isPlaying?: boolean) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppProvider");
  return context;
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function AppProvider({ children }: { children: ReactNode }) {
  console.log("[chordly-renderer] AppProvider: starting");
  
  /* navigation ------------------------------------------------------ */
  const [view, setView] = useState<View>({ name: "home" });
  console.log("[chordly-renderer] AppProvider: view state initialized");
  
  const [backStack, setBackStack] = useState<View[]>([]);
  const [forwardStack, setForwardStack] = useState<View[]>([]);
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [nerdsStatsOpen, setNerdsStatsOpen] = useState(false);
  const toggleNerdsStats = useCallback(() => setNerdsStatsOpen((prev) => !prev), []);

  const navigate = useCallback(
    (next: View) => {
      if (JSON.stringify(next) === JSON.stringify(view)) return;
      setBackStack((stack) => [...stack.slice(-24), view]);
      setForwardStack([]);
      setView(next);
      setNowPlayingOpen(false);
      setQueueOpen(false);
      const scroller = document.querySelector(".page-scroll");
      if (scroller) scroller.scrollTop = 0;
    },
    [view],
  );

  const goBack = useCallback(() => {
    if (!backStack.length) return;
    const target = backStack[backStack.length - 1];
    setBackStack((stack) => stack.slice(0, -1));
    setForwardStack((stack) => [view, ...stack]);
    setView(target);
    setNowPlayingOpen(false);
  }, [backStack, view]);

  const goForward = useCallback(() => {
    if (!forwardStack.length) return;
    const target = forwardStack[0];
    setForwardStack((stack) => stack.slice(1));
    setBackStack((stack) => [...stack, view]);
    setView(target);
    setNowPlayingOpen(false);
  }, [forwardStack, view]);

  /* toasts ---------------------------------------------------------- */
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastCounter = useRef(0);
  const dismissToast = useCallback((id: number) => {
    setToasts((list) => list.filter((toast) => toast.id !== id));
  }, []);
  const pushToast = useCallback(
    (title: string, description?: string, tone: Toast["tone"] = "default") => {
      const id = Date.now() + ++toastCounter.current;
      setToasts((list) => [...list.slice(-3), { id, title, description, tone }]);
      window.setTimeout(() => {
        setToasts((list) => list.filter((toast) => toast.id !== id));
      }, 4200);
    },
    [],
  );

  /* modal ----------------------------------------------------------- */
  const [modal, setModal] = useState<ModalType>(null);
  const openModal = useCallback((next: ModalType) => {
    if (next === "stats-for-nerds") {
      setNerdsStatsOpen(true);
      return;
    }
    if (next) setNowPlayingOpen(false);
    setModal(next);
  }, []);
  const closeModal = useCallback(() => setModal(null), []);

  /* search ---------------------------------------------------------- */
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useStoredState<string[]>(
    "chordly.recent-searches.v1",
    initialRecentSearches,
  );
  console.log("[chordly-renderer] AppProvider: search state initialized");
  
  const openSearch = useCallback(
    (query?: string) => {
      if (query !== undefined) setSearchQuery(query);
      navigate({ name: "search" });
    },
    [navigate],
  );
  const addRecentSearch = useCallback(
    (query: string) => {
      const clean = query.trim();
      if (!clean) return;
      setRecentSearches((list) => [clean, ...list.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, 7));
    },
    [setRecentSearches],
  );
  const removeRecentSearch = useCallback(
    (query: string) => setRecentSearches((list) => list.filter((item) => item !== query)),
    [setRecentSearches],
  );
  const clearRecentSearches = useCallback(() => setRecentSearches([]), [setRecentSearches]);

  /* library --------------------------------------------------------- */
  const [liked, setLiked] = useStoredState<string[]>("chordly.liked.v1", initialLiked);
  const [downloads, setDownloads] = useStoredState<string[]>("chordly.downloads.v1", initialDownloads);
  const [recentTracks, setRecentTracks] = useStoredState<string[]>("chordly.recents.v1", initialRecents);
  const [storedStats, setStoredStats] = useStoredState<StoredStats>("chordly.stats.v2", initialStoredStats);
  const [playlists, setPlaylists] = useStoredState<Playlist[]>("chordly.playlists.v1", initialPlaylists);
  const [accounts, setAccounts] = useStoredState<Account[]>("chordly.accounts.v1", initialAccounts);
  const [activeAccountId, setActiveAccountId] = useStoredState<string>(
    "chordly.active-account.v1",
    initialAccounts[0]?.id ?? "default"
  );
  console.log("[chordly-renderer] AppProvider: library state initialized");
  const [listeningProfile, setListeningProfileStored] = useStoredState<"Personal" | "Brand">(
    "chordly.listening-profile.v1",
    "Personal",
  );

  const activeAccount: Account =
    accounts.find((account) => account.id === activeAccountId) ??
    accounts[0] ??
    initialAccounts[0] ?? {
      id: "guest",
      name: "Guest",
      email: "guest@chordly.app",
      initial: "G",
      color: "#d4d4d4",
      brand: false,
      plan: "Free",
    };

  const refreshAccounts = useCallback(async () => {
    try {
      const list = await (window.chordly?.listAccounts?.() || window.chordlyDesktop?.accounts?.list?.());
      if (Array.isArray(list) && list.length > 0) {
        setAccounts(list);
        const active = list.find((a: any) => a.isActive) || list[0];
        if (active) setActiveAccountId(active.id);
      }
    } catch (e) {
      console.warn("[chordly] refreshAccounts error:", e);
    }
  }, [setAccounts, setActiveAccountId]);

  const refreshPlaylists = useCallback(
    async (accountId?: string) => {
      try {
        const id = accountId || activeAccountId;
        const list = await (window.chordly?.fetchPlaylists?.(id) ||
          window.chordlyDesktop?.playlists?.fetch?.(id));
        if (Array.isArray(list) && list.length > 0) {
          setPlaylists((prev) => {
            const localOnly = prev.filter(
              (p) => !list.some((remote: any) => remote.id === p.id || remote.browseId === p.id || remote.id === p.browseId)
            );
            return [...localOnly, ...list];
          });
        }
      } catch (e) {
        console.warn("[chordly] refreshPlaylists error:", e);
      }
    },
    [activeAccountId, setPlaylists]
  );

  const loadPlaylistTracks = useCallback(
    async (playlistId: string, accountId?: string): Promise<Track[]> => {
      if (!playlistId) return [];
      try {
        const id = accountId || activeAccountId;
        const targetId = playlistId.startsWith("VL") || playlistId === "LM" ? playlistId : `VL${playlistId}`;
        const tracks = await (
          window.chordly?.getPlaylistTracks?.(targetId, id) ||
          window.chordlyDesktop?.playlists?.getTracks?.(targetId, id)
        );
        if (Array.isArray(tracks) && tracks.length > 0) {
          registerRemoteTracks(tracks);
          const trackIds = tracks.map((t) => t.id);
          const cleanId = playlistId.startsWith("VL") ? playlistId.slice(2) : playlistId;
          setPlaylists((prev) =>
            prev.map((p) =>
              p.id === cleanId || p.browseId === targetId || p.id === playlistId
                ? { ...p, trackIds, trackCount: tracks.length }
                : p
            )
          );
          return tracks;
        }
      } catch (err) {
        console.warn("[chordly] loadPlaylistTracks error:", err);
      }
      return [];
    },
    [activeAccountId, setPlaylists]
  );

  useEffect(() => {
    void refreshAccounts();
  }, [refreshAccounts]);

  useEffect(() => {
    if (activeAccountId && activeAccountId !== "default" && activeAccountId !== "guest") {
      void refreshPlaylists(activeAccountId);
    }
  }, [activeAccountId, refreshPlaylists]);

  /* local library --------------------------------------------------- */
  const [localLibrary, setLocalLibrary] = useState<LocalLibrary>(EMPTY_LOCAL_LIBRARY);
  const [localScanning, setLocalScanning] = useState(false);
  const [localProgress, setLocalProgress] = useState<ScanProgress | null>(null);

  const isLiked = useCallback(
    (track: Track | string) => liked.includes(typeof track === "string" ? track : track.id),
    [liked],
  );
  const toggleLike = useCallback(
    (track: Track) => {
      const wasLiked = liked.includes(track.id);
      setLiked((list) => (wasLiked ? list.filter((id) => id !== track.id) : [track.id, ...list]));
      pushToast(wasLiked ? "Removed from Liked Music" : "Added to Liked Music", `${track.title} · ${track.artist}`);
    },
    [liked, pushToast, setLiked],
  );
  const isDownloaded = useCallback(
    (track: Track | string) => downloads.includes(typeof track === "string" ? track : track.id),
    [downloads],
  );
  const toggleDownload = useCallback(
    (track: Track) => {
      const wasDownloaded = downloads.includes(track.id);
      setDownloads((list) => (wasDownloaded ? list.filter((id) => id !== track.id) : [track.id, ...list]));
      pushToast(wasDownloaded ? "Removed download" : "Downloaded for offline", `${track.title} · Lossless`, wasDownloaded ? "default" : "success");
    },
    [downloads, pushToast, setDownloads],
  );

  const recordTrackPlay = useCallback(
    (track: Track) => {
      if (!track || !track.id) return;
      registerRemoteTracks([track]);
      const today = getLocalDateString();
      setStoredStats((prev) => {
        const trackPlays = { ...(prev.trackPlays || {}) };
        const artistPlays = { ...(prev.artistPlays || {}) };
        const albumPlays = { ...(prev.albumPlays || {}) };
        const daily = { ...(prev.dailySeconds || {}) };

        trackPlays[track.id] = (trackPlays[track.id] || 0) + 1;
        if (track.artist) {
          artistPlays[track.artist] = (artistPlays[track.artist] || 0) + 1;
        }
        if (track.album) {
          albumPlays[track.album] = (albumPlays[track.album] || 0) + 1;
        }

        let streak = prev.streak || 1;
        let lastDate = prev.lastActiveDate || today;
        if (lastDate !== today) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = getLocalDateString(yesterday);
          if (lastDate === yesterdayStr) {
            streak += 1;
          } else {
            streak = 1;
          }
          lastDate = today;
        }

        return {
          ...prev,
          trackPlays,
          artistPlays,
          albumPlays,
          dailySeconds: daily,
          streak,
          lastActiveDate: lastDate,
        };
      });
    },
    [setStoredStats],
  );

  const recordListeningTime = useCallback(
    (seconds: number) => {
      if (seconds <= 0) return;
      const today = getLocalDateString();
      setStoredStats((prev) => {
        const daily = { ...(prev.dailySeconds || {}) };
        daily[today] = (daily[today] || 0) + seconds;

        let streak = prev.streak || 1;
        let lastDate = prev.lastActiveDate || today;
        if (lastDate !== today) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = getLocalDateString(yesterday);
          if (lastDate === yesterdayStr) {
            streak += 1;
          } else {
            streak = 1;
          }
          lastDate = today;
        }

        return {
          ...prev,
          dailySeconds: daily,
          streak,
          lastActiveDate: lastDate,
        };
      });
    },
    [setStoredStats],
  );

  const resetStats = useCallback(() => {
    setStoredStats(initialStoredStats);
    activeListenSecondsRef.current = 0;
    scrobbledTrackIdRef.current = null;
    pendingDailySecondsRef.current = 0;
    pushToast("Listening stats reset", "Your playback history and stats have been cleared.");
  }, [pushToast, setStoredStats]);

  const addRecent = useCallback(
    (trackId: string) => {
      setRecentTracks((list) => [trackId, ...list.filter((id) => id !== trackId)].slice(0, 14));
    },
    [setRecentTracks],
  );

  const createPlaylist = useCallback(
    (name: string, description = "", coverUrl?: string, trackIds: string[] = []) => {
      const id = generateId("playlist");
      const playlist: Playlist = {
        id,
        name: name.trim() || "Untitled playlist",
        description,
        cover: coverUrl ?? cover(8),
        trackIds,
        synced: true,
        createdAt: Date.now(),
      };
      setPlaylists((list) => [playlist, ...list]);
      if (window.chordly?.createPlaylist) {
        void window.chordly.createPlaylist({ title: playlist.name, description });
      } else if (window.chordlyDesktop?.playlists?.create) {
        void window.chordlyDesktop.playlists.create(activeAccountId, playlist.name, description);
      }
      pushToast("Playlist created", `${playlist.name} · synced to YouTube Music`);
      return id;
    },
    [activeAccountId, pushToast, setPlaylists],
  );

  const addTrackToPlaylist = useCallback(
    (playlistId: string, track: Track) => {
      const target = playlists.find((playlist) => playlist.id === playlistId);
      if (!target) return;
      if (target.trackIds.includes(track.id)) {
        pushToast("Already in this playlist", target.name);
        return;
      }
      setPlaylists((list) =>
        list.map((playlist) =>
          playlist.id === playlistId ? { ...playlist, trackIds: [...playlist.trackIds, track.id] } : playlist,
        ),
      );
      const vid = track.videoId || track.id;
      if (vid && window.chordly?.addTrackToPlaylist) {
        void window.chordly.addTrackToPlaylist(playlistId, vid, activeAccountId);
      } else if (vid && window.chordlyDesktop?.playlists?.addTrack) {
        void window.chordlyDesktop.playlists.addTrack(activeAccountId, playlistId, vid);
      }
      pushToast("Added to playlist", `${track.title} → ${target.name}`);
    },
    [activeAccountId, playlists, pushToast, setPlaylists],
  );

  const deletePlaylist = useCallback(
    (playlistId: string) => {
      const target = playlists.find((playlist) => playlist.id === playlistId);
      setPlaylists((list) => list.filter((playlist) => playlist.id !== playlistId));
      if (target) pushToast("Playlist deleted", target.name);
    },
    [playlists, pushToast, setPlaylists],
  );

  const switchAccount = useCallback(
    (id: string) => {
      const account = accounts.find((item) => item.id === id);
      if (!account) return;
      setActiveAccountId(id);
      setListeningProfileStored(account.brand ? "Brand" : "Personal");
      pushToast("Account switched", `${account.name} · ${account.email}`);
    },
    [accounts, pushToast, setActiveAccountId, setListeningProfileStored],
  );

  const addAccount = useCallback(
    (data: { name: string; email: string; brand: boolean }) => {
      const account: Account = {
        id: generateId("account"),
        name: data.name.trim() || "New listener",
        email: data.email.trim() || "listener@gmail.com",
        initial: (data.name.trim()[0] ?? "N").toUpperCase(),
        color: data.brand ? "#8f8f8f" : "#d4d4d4",
        brand: data.brand,
        plan: "Music Premium",
      };
      setAccounts((list) => [...list, account]);
      setActiveAccountId(account.id);
      setListeningProfileStored(data.brand ? "Brand" : "Personal");
      pushToast("Account added", `${account.name} is now listening`);
    },
    [pushToast, setAccounts, setActiveAccountId, setListeningProfileStored],
  );

  const setListeningProfile = useCallback(
    (profile: "Personal" | "Brand") => {
      setListeningProfileStored(profile);
      pushToast(`Listening as ${profile === "Brand" ? "brand profile" : "personal profile"}`);
    },
    [pushToast, setListeningProfileStored],
  );

  /* audio ----------------------------------------------------------- */
  const initialQueue = useMemo(
    () => initialRecents.map((id) => trackById[id]).filter(Boolean),
    [],
  );
  const [queue, setQueue] = useState<Track[]>(initialQueue);
  const [queueLabel, setQueueLabel] = useState("Recently played");
  const [currentId, setCurrentId] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
  const [volume, setVolumeState] = useStoredState<number>("chordly.volume.v1", 0.72);
  const [muted, setMuted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const filterRef = useRef<BiquadFilterNode[]>([]);
  const preampRef = useRef<GainNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const graphReadyRef = useRef(false);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  /* party & share state */
  const [partyRoom, setPartyRoom] = useState<{
    roomCode: string;
    isHost: boolean;
    memberCount: number;
    pingMs: number;
    hostIp: string;
  } | null>(null);
  const partySocketRef = useRef<WebSocket | null>(null);
  const partyPingTimerRef = useRef<any>(null);

  const [shareTarget, setShareTarget] = useState<{ track?: Track; playlist?: Playlist } | null>(null);
  const remoteMediaRef = useRef<{
    mediaSource: MediaSource;
    objectUrl: string;
    controller: AbortController;
  } | null>(null);

  const currentTrack = currentId
    ? queue.find((t) => t.id === currentId) ?? trackById[currentId] ?? null
    : null;
  const currentTrackRef = useRef<Track | null>(null);
  currentTrackRef.current = currentTrack;
  const autoUpgradeAttemptedRef = useRef<Set<string>>(new Set());

  const activeListenSecondsRef = useRef(0);
  const scrobbledTrackIdRef = useRef<string | null>(null);
  const currentTrackIdForScrobbleRef = useRef<string | null>(null);
  const pendingDailySecondsRef = useRef(0);

  // Reset active session listen counters when track changes
  useEffect(() => {
    if (currentTrack?.id !== currentTrackIdForScrobbleRef.current) {
      currentTrackIdForScrobbleRef.current = currentTrack?.id ?? null;
      activeListenSecondsRef.current = 0;
      scrobbledTrackIdRef.current = null;
    }
  }, [currentTrack?.id]);

  // Anti-abuse active listening monitor:
  // Requires at least 30 seconds of active playback (or 50% for tracks under 60s) before counting as a play.
  useEffect(() => {
    if (!isPlaying || !currentTrack) return;

    const interval = window.setInterval(() => {
      const audio = audioRef.current;
      // Do not count if audio is paused, buffering, or stalled
      if (audio && audio.paused) return;

      activeListenSecondsRef.current += 1;
      pendingDailySecondsRef.current += 1;

      // Flush daily listening seconds periodically (every 30 seconds to minimize disk/state writes)
      if (pendingDailySecondsRef.current >= 30) {
        recordListeningTime(pendingDailySecondsRef.current);
        pendingDailySecondsRef.current = 0;
      }

      // Spotify / Apple Music / Last.fm standard:
      // Minimum 30s of active playback, or 50% of track length for tracks under 60 seconds
      const trackDuration =
        currentTrack.duration && currentTrack.duration > 0
          ? currentTrack.duration
          : audio?.duration && Number.isFinite(audio.duration) && audio.duration > 0
            ? audio.duration
            : 180;
      const qualifyingThreshold = Math.min(30, Math.max(10, Math.round(trackDuration * 0.5)));

      if (
        activeListenSecondsRef.current >= qualifyingThreshold &&
        scrobbledTrackIdRef.current !== currentTrack.id
      ) {
        scrobbledTrackIdRef.current = currentTrack.id;
        recordTrackPlay(currentTrack);
      }
    }, 1000);

    return () => {
      window.clearInterval(interval);
      if (pendingDailySecondsRef.current > 0) {
        recordListeningTime(pendingDailySecondsRef.current);
        pendingDailySecondsRef.current = 0;
      }
    };
  }, [isPlaying, currentTrack, recordListeningTime, recordTrackPlay]);

  // Derived live statistics
  const liveStats = useMemo(() => {
    const todayDate = new Date();
    const todayStr = getLocalDateString(todayDate);

    // Calculate last 7 days listening
    let totalWeekSeconds = 0;
    const weekDays: Array<{ day: string; date: string; seconds: number; value: number; isToday: boolean }> = [];
    const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

    const past7Days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      past7Days.push(getLocalDateString(d));
    }

    let maxSeconds = 1;
    past7Days.forEach((dateStr) => {
      const sec = storedStats.dailySeconds?.[dateStr] || 0;
      totalWeekSeconds += sec;
      if (sec > maxSeconds) maxSeconds = sec;
    });

    past7Days.forEach((dateStr) => {
      const parts = dateStr.split("-").map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      const dayLetter = dayLabels[d.getDay()];
      const sec = storedStats.dailySeconds?.[dateStr] || 0;
      const isToday = dateStr === todayStr;

      const ratio = sec > 0 ? sec / maxSeconds : 0;
      const value = isToday && sec === 0 ? 30 : Math.max(sec > 0 ? 15 : 8, Math.round(ratio * 95));

      weekDays.push({
        day: dayLetter,
        date: dateStr,
        seconds: sec,
        value,
        isToday,
      });
    });

    const minutes = Math.round(totalWeekSeconds / 60);

    // Top songs (up to 3)
    const sortedTrackEntries = Object.entries(storedStats.trackPlays || {})
      .filter(([_, plays]) => plays > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const topSongs: Track[] = sortedTrackEntries
      .map(([id, plays]) => {
        const trackObj =
          trackById[id] ||
          (currentTrack?.id === id ? currentTrack : null) ||
          queue.find((t) => t.id === id);
        if (!trackObj) return null;
        return { ...trackObj, plays: `${plays}` };
      })
      .filter(Boolean) as Track[];

    const topSong = topSongs[0] ?? null;

    // Top artists (up to 3)
    const sortedArtistEntries = Object.entries(storedStats.artistPlays || {})
      .filter(([_, plays]) => plays > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const topArtists: Array<{ id: string; name: string; cover: string; genre: string; monthly?: string; plays?: number }> =
      sortedArtistEntries.map(([name, plays]) => {
        const existingArtist = Object.values(artistById).find(
          (a) => a.name.toLowerCase() === name.toLowerCase(),
        );
        if (existingArtist) {
          return {
            ...existingArtist,
            plays,
          };
        }
        const matchingTrack =
          Object.values(trackById).find((t) => t.artist?.toLowerCase() === name.toLowerCase()) ||
          (currentTrack?.artist?.toLowerCase() === name.toLowerCase() ? currentTrack : null) ||
          queue.find((t) => t.artist?.toLowerCase() === name.toLowerCase());
        return {
          id: `art-${name.toLowerCase().replace(/\s+/g, "-")}`,
          name,
          cover:
            matchingTrack?.cover ||
            topSong?.cover ||
            "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
          genre: "Artist",
          monthly: "1.2M",
          plays,
        };
      });

    const topArtist = topArtists[0] ?? null;

    // Top albums (up to 3)
    const sortedAlbumEntries = Object.entries(storedStats.albumPlays || {})
      .filter(([_, plays]) => plays > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const topAlbums: Array<{ id: string; title: string; artist: string; cover: string; genre?: string; year?: number; plays?: number }> =
      sortedAlbumEntries.map(([name, plays]) => {
        const existingAlbum = Object.values(albumById).find(
          (a) => a.title.toLowerCase() === name.toLowerCase(),
        );
        if (existingAlbum) {
          return {
            ...existingAlbum,
            plays,
          };
        }
        const matchingTrack =
          Object.values(trackById).find((t) => t.album?.toLowerCase() === name.toLowerCase()) ||
          (currentTrack?.album?.toLowerCase() === name.toLowerCase() ? currentTrack : null) ||
          queue.find((t) => t.album?.toLowerCase() === name.toLowerCase());
        return {
          id: `alb-${name.toLowerCase().replace(/\s+/g, "-")}`,
          title: name,
          artist: matchingTrack?.artist || topArtist?.name || "Artist",
          cover:
            matchingTrack?.cover ||
            topSong?.cover ||
            "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80",
          genre: "Lossless",
          year: 2024,
          plays,
        };
      });

    const topAlbum = topAlbums[0] ?? null;

    return {
      minutes,
      streak: storedStats.streak || (minutes > 0 ? 1 : 0),
      weekStats: weekDays,
      topSong,
      topSongs,
      topArtist,
      topArtists,
      topAlbum,
      topAlbums,
    };
  }, [storedStats, currentTrack]);

  /* settings */
  const [settings, setSettings] = useState<AppSettings>(readSettings);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((previous) => ({ ...previous, ...patch }));
  }, []);
  const setSetting = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((previous) => ({ ...previous, [key]: value }));
  }, []);
  const resetSettings = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS, lyricProviders: { ...DEFAULT_SETTINGS.lyricProviders } });
    pushToast("Settings reset", "All preferences are back to their defaults");
  }, [pushToast]);
  useEffect(() => {
    try {
      localStorage.setItem("chordly.settings.v2", JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

  /* local library --------------------------------------------------- */
  const applyLocalLibrary = useCallback(
    (library: LocalLibrary) => {
      const next: LocalLibrary = {
        folder: library?.folder ?? null,
        scannedAt: library?.scannedAt ?? null,
        tracks: Array.isArray(library?.tracks) ? library.tracks : [],
        totalBytes: Number(library?.totalBytes) || 0,
        skipped: Number(library?.skipped) || 0,
      };
      syncLocalTracks(next.tracks);
      setLocalLibrary(next);
      if (next.folder) setSetting("scanFolder", next.folder);
    },
    [setSetting],
  );

  useEffect(() => {
    const bridge = getDesktopBridge();
    if (!bridge) return;
    let cancelled = false;
    let autoScanTimer: number | null = null;
    const stopProgress = bridge.library.onScanProgress((progress) => {
      if (!cancelled) setLocalProgress(progress);
    });
    void bridge.library
      .get()
      .then((library) => {
        if (cancelled) return;
        applyLocalLibrary(library);
        if (!settingsRef.current.autoScan || !library.folder) return;
        autoScanTimer = window.setTimeout(() => {
          if (cancelled) return;
          setLocalScanning(true);
          void bridge.library
            .scan(library.folder!, { filterNonMusic: settingsRef.current.filterNonMusic })
            .then((updated) => {
              if (!cancelled) applyLocalLibrary(updated);
            })
            .catch(() => {
              /* A background refresh should never interrupt the app. */
            })
            .finally(() => {
              if (!cancelled) {
                setLocalScanning(false);
                setLocalProgress(null);
              }
            });
        }, 1800);
      })
      .catch(() => {
        /* The renderer can still run without local library data. */
      });
    return () => {
      cancelled = true;
      stopProgress();
      if (autoScanTimer !== null) window.clearTimeout(autoScanTimer);
    };
  }, [applyLocalLibrary]);

  const chooseLocalFolder = useCallback(async () => {
    const bridge = getDesktopBridge();
    if (!bridge) {
      pushToast(
        "Windows app required",
        "Choose a local folder from the Chordly desktop app on this PC.",
        "error",
      );
      return;
    }
    setLocalScanning(true);
    setLocalProgress({ phase: "walking", inspected: 0 });
    try {
      const library = await bridge.library.chooseAndScan({ filterNonMusic: settings.filterNonMusic });
      if (!library) {
        pushToast("Folder scan cancelled");
        return;
      }
      applyLocalLibrary(library);
      pushToast(
        "Music folder indexed",
        `${library.tracks.length.toLocaleString()} tracks · ${formatBytes(library.totalBytes)} stay on this PC`,
        "success",
      );
    } catch (error) {
      pushToast("Could not scan that folder", scanErrorMessage(error), "error");
    } finally {
      setLocalScanning(false);
      setLocalProgress(null);
    }
  }, [applyLocalLibrary, pushToast, settings.filterNonMusic]);

  const scanLocalFolder = useCallback(
    async (folder?: string) => {
      const bridge = getDesktopBridge();
      if (!bridge) {
        pushToast(
          "Windows app required",
          "Local scanning is available in the Chordly desktop app on this PC.",
          "error",
        );
        return;
      }
      const target = (folder ?? localLibrary.folder ?? settings.scanFolder ?? "").trim();
      if (!target) {
        await chooseLocalFolder();
        return;
      }
      setLocalScanning(true);
      setLocalProgress({ phase: "walking", inspected: 0 });
      try {
        const library = await bridge.library.scan(target, { filterNonMusic: settings.filterNonMusic });
        applyLocalLibrary(library);
        pushToast(
          "Local library up to date",
          `${library.tracks.length.toLocaleString()} tracks · ${formatBytes(library.totalBytes)}`,
          "success",
        );
      } catch (error) {
        pushToast("Scan failed", scanErrorMessage(error), "error");
      } finally {
        setLocalScanning(false);
        setLocalProgress(null);
      }
    },
    [applyLocalLibrary, chooseLocalFolder, localLibrary.folder, pushToast, settings.filterNonMusic, settings.scanFolder],
  );

  const revealLocalTrack = useCallback(
    (track: Track) => {
      const bridge = getDesktopBridge();
      if (!bridge || !track.filePath) {
        pushToast("File location unavailable", "This track is not stored on this PC.");
        return;
      }
      void bridge.library
        .showInFolder(track.filePath)
        .then((shown) => {
          if (!shown) pushToast("File not found", track.filePath, "error");
        })
        .catch(() => pushToast("Could not open File Explorer", track.filePath, "error"));
    },
    [pushToast],
  );

  /* theme, font & motion */
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const applyTheme = () => {
      const resolved = settings.theme === "system" ? (media.matches ? "light" : "dark") : settings.theme;
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.colorScheme = resolved;
    };
    applyTheme();
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [settings.theme]);

  useEffect(() => {
    const fonts: Record<string, string> = {
      "SF Pro Display": '"SF Pro Display", "Inter", "Segoe UI Variable Display", "Segoe UI", sans-serif',
      Inter: '"Inter", "Segoe UI", sans-serif',
      "Segoe UI": '"Segoe UI Variable Display", "Segoe UI", sans-serif',
      "Helvetica Neue": '"Helvetica Neue", "Inter", sans-serif',
    };
    document.documentElement.style.setProperty("--font-app", fonts[settings.font] ?? fonts.Inter);
  }, [settings.font]);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = String(settings.reduceMotion);
    document.documentElement.dataset.glass = String(settings.liquidGlass);
  }, [settings.reduceMotion, settings.liquidGlass]);

  useEffect(() => {
    document.title = currentTrack ? `${currentTrack.title} · ${currentTrack.artist} — chordly` : "chordly";
  }, [currentTrack]);

  // Synchronize Discord Rich Presence with current playback state (only fires when track changes or play/pause toggles)
  const lastDiscordActivityRef = useRef<string>("");

  useEffect(() => {
    const bridge = window.chordly ?? window.chordlyDesktop;
    if (!bridge) return;

    if (!settings.discord) {
      if (lastDiscordActivityRef.current !== "disabled") {
        lastDiscordActivityRef.current = "disabled";
        if (bridge.setDiscordEnabled) void bridge.setDiscordEnabled(false);
        else if (bridge.clearDiscordActivity) void bridge.clearDiscordActivity();
      }
      return;
    }

    if (bridge.setDiscordEnabled) {
      void bridge.setDiscordEnabled(true);
    }

    if (bridge.setDiscordClientId) {
      void bridge.setDiscordClientId(settings.discordClientId || "");
    }

    if (!currentTrack) {
      if (lastDiscordActivityRef.current !== "none") {
        lastDiscordActivityRef.current = "none";
        if (bridge.clearDiscordActivity) void bridge.clearDiscordActivity();
      }
      return;
    }

    const activityKey = `${currentTrack.id}:${isPlaying}:${Math.round(currentTrack.duration || duration || 0)}`;
    if (lastDiscordActivityRef.current === activityKey) {
      return;
    }
    lastDiscordActivityRef.current = activityKey;

    if (bridge.setDiscordActivity) {
      void bridge.setDiscordActivity({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album,
        cover: currentTrack.cover,
        isPlaying,
        progress: audioRef.current?.currentTime || 0,
        duration: currentTrack.duration || duration || 0,
      });
    }
  }, [currentTrack?.id, isPlaying, settings.discord, settings.discordClientId, duration]);

  /* audio graph (7-band EQ & Loudness Normalization) */
  const ensureAudioGraph = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || graphReadyRef.current) {
      if (audioContextRef.current?.state === "suspended") void audioContextRef.current.resume();
      return;
    }
    // Only hijack the audio element with Web Audio API if equalizer or loudness normalization is enabled
    if (!settings.equalizer && !settings.loudnessNormalization) return;

    try {
      const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const context = new Context();
      const source = context.createMediaElementSource(audio);
      const preamp = context.createGain();
      preamp.gain.value = settings.equalizer ? 10 ** (settings.preamp / 20) : 1;
      const frequencies = [60, 150, 400, 1000, 2400, 6000, 15000];
      const filters = frequencies.map((frequency) => {
        const filter = context.createBiquadFilter();
        filter.type = "peaking";
        filter.frequency.value = frequency;
        filter.Q.value = 0.9;
        return filter;
      });
      source.connect(preamp);
      preamp.connect(filters[0]);
      filters.forEach((filter, index) => {
        if (index < filters.length - 1) filter.connect(filters[index + 1]);
      });

      // Dynamics Compressor for Loudness Normalization
      const compressor = context.createDynamicsCompressor();
      if (settings.loudnessNormalization) {
        compressor.threshold.value = -24;
        compressor.knee.value = 30;
        compressor.ratio.value = 12;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.25;
      } else {
        compressor.threshold.value = 0;
        compressor.ratio.value = 1;
      }
      filters[filters.length - 1].connect(compressor);
      compressor.connect(context.destination);

      filters.forEach((filter, index) => {
        filter.gain.value = settings.equalizer ? settings.eqBands[index] ?? 0 : 0;
      });
      audioContextRef.current = context;
      filterRef.current = filters;
      preampRef.current = preamp;
      compressorRef.current = compressor;
      graphReadyRef.current = true;
      if (context.state === "suspended") void context.resume();
    } catch {
      /* Web Audio can fail on restricted systems — HTML audio still works. */
    }
  }, [settings.equalizer, settings.eqBands, settings.preamp, settings.loudnessNormalization]);

  useEffect(() => {
    if ((settings.equalizer || settings.loudnessNormalization) && !graphReadyRef.current) {
      ensureAudioGraph();
    }
    filterRef.current.forEach((filter, index) => {
      filter.gain.value = settings.equalizer ? settings.eqBands[index] ?? 0 : 0;
    });
    if (preampRef.current) {
      preampRef.current.gain.value = settings.equalizer ? 10 ** (settings.preamp / 20) : 1;
    }
    if (compressorRef.current) {
      if (settings.loudnessNormalization) {
        compressorRef.current.threshold.value = -24;
        compressorRef.current.ratio.value = 12;
      } else {
        compressorRef.current.threshold.value = 0;
        compressorRef.current.ratio.value = 1;
      }
    }
  }, [settings.equalizer, settings.eqBands, settings.preamp, settings.loudnessNormalization, ensureAudioGraph]);

  const teardownRemoteMedia = useCallback(() => {
    const current = remoteMediaRef.current;
    remoteMediaRef.current = null;
    if (!current) return;
    current.controller.abort();
    try {
      const buffers = current.mediaSource.sourceBuffers;
      for (let index = 0; index < buffers.length; index += 1) {
        try {
          if (buffers[index].updating) buffers[index].abort();
        } catch {
          /* The source buffer may already be detached. */
        }
      }
    } catch {
      /* MediaSource may already be closed. */
    }
    URL.revokeObjectURL(current.objectUrl);
  }, []);

  /* YouTube adaptive streams are fragmented DASH, so they need MSE.
     Chromium can decode Opus/WebM through a SourceBuffer even though a
     plain <audio src> cannot open the fragmented container. */
  const setupRemoteMedia = useCallback(
    (track: Track) => {
      const audio = audioRef.current;
      if (!audio) return;
      teardownRemoteMedia();

      const controller = new AbortController();
      const mediaSource = new MediaSource();
      const objectUrl = URL.createObjectURL(mediaSource);
      remoteMediaRef.current = { mediaSource, objectUrl, controller };
      audio.src = objectUrl;

      mediaSource.addEventListener(
        "sourceopen",
        () => {
          if (remoteMediaRef.current?.mediaSource !== mediaSource) return;
          const mime = MediaSource.isTypeSupported('audio/webm; codecs="opus"')
            ? 'audio/webm; codecs="opus"'
            : 'audio/mp4; codecs="mp4a.40.2"';
          if (!MediaSource.isTypeSupported(mime)) {
            pushToast("Playback not supported", "This build cannot decode the YouTube audio stream.", "error");
            setIsPlaying(false);
            return;
          }

          let sourceBuffer: SourceBuffer;
          try {
            sourceBuffer = mediaSource.addSourceBuffer(mime);
          } catch {
            pushToast("Playback not supported", "Could not create the YouTube audio pipeline.", "error");
            setIsPlaying(false);
            return;
          }

          const append = (chunk: Uint8Array) =>
            new Promise<void>((resolve, reject) => {
              const onEnd = () => {
                sourceBuffer.removeEventListener("updateend", onEnd);
                sourceBuffer.removeEventListener("error", onError);
                resolve();
              };
              const onError = () => {
                sourceBuffer.removeEventListener("updateend", onEnd);
                sourceBuffer.removeEventListener("error", onError);
                reject(new Error("The YouTube audio segment was rejected."));
              };
              sourceBuffer.addEventListener("updateend", onEnd);
              sourceBuffer.addEventListener("error", onError);
              try {
                sourceBuffer.appendBuffer(chunk as unknown as BufferSource);
              } catch (error) {
                onError();
                reject(error);
              }
            });

          void (async () => {
            try {
              const response = await fetch(track.src, { signal: controller.signal });
              if (!response.ok || !response.body) {
                throw new Error(`YouTube stream unavailable (${response.status}).`);
              }
              const reader = response.body.getReader();
              const queue: Uint8Array[] = [];
              let queued = 0;
              let firstFlush = true;
              const flush = async () => {
                if (!queued) return;
                const merged = new Uint8Array(queued);
                let offset = 0;
                for (const part of queue) {
                  merged.set(part, offset);
                  offset += part.byteLength;
                }
                queue.length = 0;
                queued = 0;
                await append(merged);
                if (firstFlush) {
                  firstFlush = false;
                  if (isPlayingRef.current) void audio.play().catch(() => undefined);
                }
              };

              for (;;) {
                const { value, done } = await reader.read();
                if (controller.signal.aborted) return;
                if (done) break;
                if (!value?.byteLength) continue;
                queue.push(value);
                queued += value.byteLength;
                if (queued >= 512 * 1024) await flush();
              }
              await flush();
              if (isPlayingRef.current && audio.paused) {
                void audio.play().catch(() => undefined);
              }
              if (!controller.signal.aborted && mediaSource.readyState === "open") {
                mediaSource.endOfStream();
              }
            } catch (error) {
              const name = error instanceof DOMException ? error.name : "";
              if (controller.signal.aborted || name === "AbortError") return;
              console.error("[chordly] YouTube playback failed:", error);
              pushToast(
                "Could not play this track",
                "The YouTube stream failed to load. Try another result or check your connection.",
                "error",
              );
              setIsPlaying(false);
            }
          })();
        },
        { once: true },
      );
    },
    [pushToast, teardownRemoteMedia],
  );

  /* audio source + metadata */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!currentTrack) {
      teardownRemoteMedia();
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      return;
    }

    teardownRemoteMedia();
    const absolute = new URL(currentTrack.src, window.location.href).href;
    if (audio.src !== absolute) {
      // Explicitly flush previous track's audio buffer and streams from RAM
      audio.removeAttribute("src");
      audio.load();
      audio.src = currentTrack.src;
      audio.load();
    }
    setProgress(0);
    setDuration(currentTrack.duration);
    window.dispatchEvent(
      new CustomEvent("chordly:timeupdate", {
        detail: { currentTime: 0, duration: currentTrack.duration || 0 },
      }),
    );
    if ("mediaSession" in navigator && "MediaMetadata" in window) {
      try {
        const artwork = new URL(currentTrack.cover, window.location.href).href;
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentTrack.title,
          artist: currentTrack.artist,
          album: currentTrack.album,
          artwork: /^https?:/i.test(artwork)
            ? [{ src: artwork, sizes: "800x800", type: "image/jpeg" }]
            : [],
        });
      } catch {
        /* metadata is best-effort */
      }
    }
  }, [currentTrack, setupRemoteMedia, teardownRemoteMedia]);

  useEffect(() => () => teardownRemoteMedia(), [teardownRemoteMedia]);

  // When an addon track starts, asynchronously enrich its real live telemetry (bitrate, sample rate, bit depth, stream host)
  useEffect(() => {
    if (!currentTrack?.addonId || currentTrack.streamHost) return;
    const addonId = currentTrack.addonId;
    const trackId = currentTrack.rawAddonId || currentTrack.id;
    const desktop = (window as unknown as {
      chordlyDesktop?: {
        addons?: {
          resolveStream?: (opts: { addonId: string; trackId: string }) => Promise<{
            codec?: string;
            format?: string;
            quality?: string;
            bitDepth?: number;
            sampleRate?: number;
            bitrate?: number;
            streamHost?: string;
          }>;
        };
      };
    }).chordlyDesktop;
    const resolve = desktop?.addons?.resolveStream;
    if (!resolve) return;

    let cancelled = false;
    void resolve({ addonId, trackId })
      .then((meta) => {
        if (cancelled || !meta) return;
        setQueue((prevQueue) =>
          prevQueue.map((t) =>
            t.id === currentTrack.id
              ? {
                  ...t,
                  codec: meta.codec || t.codec || meta.format || "flac",
                  format: meta.format || t.format || "flac",
                  quality: meta.quality || t.quality,
                  bitDepth: meta.bitDepth || t.bitDepth,
                  sampleRate: meta.sampleRate || t.sampleRate,
                  bitrate: meta.bitrate || t.bitrate,
                  streamHost: meta.streamHost || t.streamHost,
                }
              : t,
          ),
        );
      })
      .catch((err) => {
        console.warn("[chordly] Could not enrich addon track stream metadata:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [currentTrack?.id, currentTrack?.addonId, currentTrack?.streamHost]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = muted ? 0 : volume;
  }, [volume, muted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (isPlaying) {
      ensureAudioGraph();
      void audio.play().catch(() => {
        if (audio.error) setIsPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, currentTrack, ensureAudioGraph]);

  const playQueue = useCallback(
    (items: Track[], startIndex = 0, label = "Queue") => {
      const cleanQueue = items.filter(Boolean);
      if (!cleanQueue.length) return;
      registerRemoteTracks(cleanQueue);
      const index = Math.max(0, Math.min(startIndex, cleanQueue.length - 1));
      const start = cleanQueue[index];
      ensureAudioGraph();
      setQueue(cleanQueue);
      setQueueLabel(label);
      setCurrentId(start.id);
      setProgress(0);
      setIsPlaying(true);
      addRecent(start.id);
    },
    [addRecent, ensureAudioGraph],
  );

  const playTrack = useCallback(
    (track: Track, list?: Track[], label = "Queue") => {
      registerRemoteTracks([track]);
      if (list && list.length) {
        const index = list.findIndex((item) => item.id === track.id);
        playQueue(list, index < 0 ? 0 : index, label);
        return;
      }
      ensureAudioGraph();
      setQueue((previous) => {
        if (previous.some((item) => item.id === track.id)) return previous;
        return [...previous, track];
      });
      setCurrentId(track.id);
      setProgress(0);
      setIsPlaying(true);
      addRecent(track.id);
    },
    [addRecent, ensureAudioGraph, playQueue],
  );

  const togglePlay = useCallback(() => {
    if (!currentTrack) return;
    ensureAudioGraph();
    setIsPlaying((playing) => !playing);
  }, [currentTrack, ensureAudioGraph]);

  const goNext = useCallback(
    (auto = false) => {
      if (!queue.length) return;
      const index = Math.max(
        0,
        queue.findIndex((track) => track.id === currentId),
      );
      let nextIndex = index + 1;
      if (shuffle && queue.length > 1) {
        do {
          nextIndex = Math.floor(Math.random() * queue.length);
        } while (nextIndex === index);
      } else if (nextIndex >= queue.length) {
        if (auto && repeatMode === "off") {
          setIsPlaying(false);
          setProgress(0);
          const audio = audioRef.current;
          if (audio) audio.currentTime = 0;
          return;
        }
        nextIndex = 0;
      }
      const track = queue[nextIndex];
      if (!track) return;
      setCurrentId(track.id);
      setProgress(0);
      setIsPlaying(true);
      addRecent(track.id);
    },
    [queue, currentId, shuffle, repeatMode, addRecent],
  );

  const next = useCallback(() => goNext(false), [goNext]);

  const handleEnded = useCallback(() => {
    // If track finished naturally and wasn't scrobbled yet (e.g. short track under 30s)
    if (currentTrack && scrobbledTrackIdRef.current !== currentTrack.id) {
      const trackDuration = currentTrack.duration && currentTrack.duration > 0 ? currentTrack.duration : 30;
      if (activeListenSecondsRef.current >= Math.min(8, Math.round(trackDuration * 0.4))) {
        scrobbledTrackIdRef.current = currentTrack.id;
        recordTrackPlay(currentTrack);
      }
    }

    const audio = audioRef.current;
    if (repeatMode === "one") {
      // For repeat loop: reset scrobble state so the next full play counts after another 30s
      scrobbledTrackIdRef.current = null;
      activeListenSecondsRef.current = 0;
      if (audio) {
        audio.currentTime = 0;
        void audio.play();
      }
      setProgress(0);
      setIsPlaying(true);
      return;
    }
    // Flush previous audio buffer from memory
    if (audio) {
      audio.removeAttribute("src");
      audio.load();
    }
    goNext(true);
  }, [repeatMode, goNext, currentTrack, recordTrackPlay]);

  const handleAudioError = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (!audio.error || audio.error.code === 1) return;
    pushToast(
      "Could not play this track",
      currentTrack.remote
        ? "The YouTube stream did not respond. Check your connection and try again."
        : "Chordly could not decode this file. Check that the file still exists.",
      "error",
    );
    setIsPlaying(false);
  }, [currentTrack, pushToast]);

  const previous = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setProgress(0);
      return;
    }
    if (!queue.length) return;
    const index = Math.max(
      0,
      queue.findIndex((track) => track.id === currentId),
    );
    let previousIndex = index - 1;
    if (shuffle && queue.length > 1) {
      do {
        previousIndex = Math.floor(Math.random() * queue.length);
      } while (previousIndex === index);
    } else if (previousIndex < 0) {
      previousIndex = queue.length - 1;
    }
    const track = queue[previousIndex];
    if (!track) return;
    setCurrentId(track.id);
    setProgress(0);
    setIsPlaying(true);
    addRecent(track.id);
  }, [queue, currentId, shuffle, addRecent]);

  const seek = useCallback(
    (seconds: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      const max = Number.isFinite(duration) && duration > 0 ? duration : audio.duration || 0;
      const nextTime = Math.max(0, Math.min(seconds, max));
      audio.currentTime = nextTime;
      setProgress(nextTime);
      lastProgressUpdateRef.current = performance.now();
      window.dispatchEvent(
        new CustomEvent("chordly:timeupdate", {
          detail: { currentTime: nextTime, duration: max },
        }),
      );

      if ("mediaSession" in navigator && "setPositionState" in navigator.mediaSession && max > 0) {
        try {
          navigator.mediaSession.setPositionState({
            duration: max,
            position: nextTime,
            playbackRate: isPlaying ? 1 : 0,
          });
        } catch {}
      }

      const bridge = window.chordly ?? window.chordlyDesktop;
      if (settings.discord && currentTrack && bridge?.setDiscordActivity) {
        void bridge.setDiscordActivity({
          title: currentTrack.title,
          artist: currentTrack.artist,
          album: currentTrack.album,
          cover: currentTrack.cover,
          isPlaying,
          progress: nextTime,
          duration: currentTrack.duration || duration || 0,
        });
      }
    },
    [duration, settings.discord, currentTrack, isPlaying],
  );

  const seekBy = useCallback(
    (delta: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      seek(audio.currentTime + delta);
    },
    [seek],
  );

  const lastProgressUpdateRef = useRef<number>(0);
  const handleTimeUpdate = useCallback(
    (event: React.SyntheticEvent<HTMLAudioElement>) => {
      const audio = event.currentTarget;
      const currentSec = audio.currentTime;
      const now = performance.now();

      // Dispatch lightweight window event for progress sliders & time labels to update directly in DOM without React re-render
      window.dispatchEvent(
        new CustomEvent("chordly:timeupdate", {
          detail: {
            currentTime: currentSec,
            duration: audio.duration || duration || 0,
          },
        }),
      );

      // Throttle global React state update to at most once per second (1000ms)
      if (now - lastProgressUpdateRef.current >= 1000) {
        lastProgressUpdateRef.current = now;
        setProgress(Math.floor(currentSec));
      }
    },
    [duration],
  );

  const changeVolume = useCallback(
    (value: number) => {
      const clamped = Math.max(0, Math.min(1, value));
      setVolumeState(clamped);
      if (clamped > 0) setMuted(false);
    },
    [setVolumeState],
  );

  const toggleMute = useCallback(() => setMuted((value) => !value), []);

  const toggleShuffle = useCallback(() => {
    const nextValue = !shuffle;
    setShuffle(nextValue);
    pushToast(nextValue ? "Shuffle on" : "Shuffle off");
  }, [shuffle, pushToast]);

  const cycleRepeat = useCallback(() => {
    const nextMode: RepeatMode = repeatMode === "off" ? "all" : repeatMode === "all" ? "one" : "off";
    setRepeatMode(nextMode);
    pushToast(nextMode === "off" ? "Repeat off" : nextMode === "all" ? "Repeat queue" : "Repeat this track");
  }, [repeatMode, pushToast]);

  const playFromQueue = useCallback(
    (trackId: string) => {
      const track = trackById[trackId];
      if (!track) return;
      setCurrentId(trackId);
      setProgress(0);
      setIsPlaying(true);
      addRecent(trackId);
    },
    [addRecent],
  );

  const addToQueue = useCallback(
    (track: Track) => {
      if (queue.some((item) => item.id === track.id)) {
        pushToast("Already in the queue", track.title);
        return;
      }
      setQueue((list) => [...list, track]);
      pushToast("Added to queue", `${track.title} · ${track.artist}`);
    },
    [queue, pushToast],
  );

  const playNext = useCallback(
    (track: Track) => {
      setQueue((list) => {
        const filtered = list.filter((item) => item.id !== track.id);
        const index = filtered.findIndex((item) => item.id === currentId);
        const insertAt = index < 0 ? 0 : index + 1;
        return [...filtered.slice(0, insertAt), track, ...filtered.slice(insertAt)];
      });
      pushToast("Playing next", `${track.title} · ${track.artist}`);
    },
    [currentId, pushToast],
  );

  const removeFromQueue = useCallback(
    (trackId: string) => {
      if (trackId === currentId) return;
      setQueue((list) => list.filter((track) => track.id !== trackId));
    },
    [currentId],
  );

  const clearQueue = useCallback(() => {
    setQueue((list) => list.filter((track) => track.id === currentId));
    pushToast("Queue cleared");
  }, [currentId, pushToast]);

  const [upgradingLossless, setUpgradingLossless] = useState(false);

  const upgradeTrackToLossless = useCallback(
    async (targetTrack?: Track): Promise<Track | null> => {
      const track = targetTrack ?? currentTrack;
      if (!track) return null;
      if (track.lossless && track.format === "flac") {
        pushToast("Already Lossless", `"${track.title}" is already streaming in bit-perfect FLAC.`, "default");
        return track;
      }
      setUpgradingLossless(true);
      pushToast("Searching Addons...", `Finding lossless FLAC for "${track.title}"...`, "default");
      try {
        const desktop = (window as unknown as {
          chordlyDesktop?: {
            addons?: {
              search?: (q: string) => Promise<Track[]>;
              resolveStream?: (opts: { addonId: string; trackId: string }) => Promise<{
                url?: string;
                bitDepth?: number;
                sampleRate?: number;
                bitrate?: number;
                streamHost?: string;
                format?: string;
                codec?: string;
                quality?: string;
              }>;
            };
          };
        }).chordlyDesktop;
        const searchFn = desktop?.addons?.search;
        if (!searchFn) {
          pushToast("Desktop Required", "Lossless addon search is only available in the Chordly desktop app.", "error");
          setUpgradingLossless(false);
          return null;
        }

        const cleanTitle = track.title.replace(/\s*[\(\[](official\s*(music\s*)?video|audio|lyrics?|visualizer|remaster(ed)?(\s*\d+)?|4k|hd|hq)[\)\]].*/gi, "").trim();
        const query = `${track.artist} ${cleanTitle}`.trim();
        let results: Track[] = await searchFn(query);

        if (!results || !results.length) {
          results = await searchFn(cleanTitle);
        }

        if (!results || !results.length) {
          pushToast("No Lossless Match", `No FLAC stream found on active addons for "${cleanTitle}".`, "error");
          setUpgradingLossless(false);
          return null;
        }

        const losslessMatch = results.find((r) => r.lossless || r.format === "flac") || results[0];
        if (!losslessMatch) {
          pushToast("No Lossless Match", "No lossless stream found on active addons.", "error");
          setUpgradingLossless(false);
          return null;
        }

        registerRemoteTracks([losslessMatch]);

        let streamUrl = losslessMatch.src;
        let streamDetails: {
          url?: string;
          bitDepth?: number;
          sampleRate?: number;
          bitrate?: number;
          streamHost?: string;
          format?: string;
          codec?: string;
          quality?: string;
        } | null = null;

        const resolveFn = desktop?.addons?.resolveStream;
        if (resolveFn) {
          try {
            streamDetails = await resolveFn({
              addonId: losslessMatch.addonId || "",
              trackId: losslessMatch.rawAddonId || losslessMatch.id,
            });
            if (streamDetails?.url) {
              streamUrl = streamDetails.url;
            }
          } catch (e) {
            console.warn("[chordly] resolveStream fallback to proxy:", e);
          }
        }

        const audio = audioRef.current;
        const currentProgress = audio?.currentTime ?? progress;
        const wasPlaying = isPlaying;

        const upgradedTrack: Track = {
          ...track,
          ...losslessMatch,
          id: track.id,
          rawAddonId: losslessMatch.rawAddonId,
          addonId: losslessMatch.addonId,
          addonBaseUrl: losslessMatch.addonBaseUrl,
          src: streamUrl,
          format: "flac",
          codec: "flac",
          lossless: true,
          quality: "Lossless",
          bitDepth: streamDetails?.bitDepth || losslessMatch.bitDepth || 16,
          sampleRate: streamDetails?.sampleRate || losslessMatch.sampleRate || 44100,
          bitrate: streamDetails?.bitrate || losslessMatch.bitrate || 990208,
          source: losslessMatch.source || "Lossless Addon",
          streamHost: streamDetails?.streamHost || losslessMatch.streamHost,
          cover: losslessMatch.cover || track.cover,
        };

        trackById[track.id] = upgradedTrack;

        setQueue((prevQueue) =>
          prevQueue.map((item) => (item.id === track.id ? upgradedTrack : item))
        );

        if (currentTrack?.id === track.id) {
          teardownRemoteMedia();
          if (audio) {
            audio.src = streamUrl;
            audio.load();
            audio.currentTime = currentProgress;
            if (wasPlaying) {
              void audio.play().catch((playErr) => {
                console.warn("[chordly] Play after upgrade error:", playErr);
              });
            }
          }
        }

        pushToast(
          "Upgraded to Lossless FLAC",
          `Now streaming "${losslessMatch.title}" in bit-perfect FLAC (${losslessMatch.source || "Lossless Addon"})`,
          "success"
        );
        setUpgradingLossless(false);
        return losslessMatch;
      } catch (err: unknown) {
        setUpgradingLossless(false);
        pushToast("Upgrade Failed", err instanceof Error ? err.message : String(err), "error");
        return null;
      }
    },
    [currentTrack, isPlaying, progress, pushToast, teardownRemoteMedia]
  );

  /* Windows media keys & system transport controls ------------------ */
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const session = navigator.mediaSession;
    const handlers: [MediaSessionAction, MediaSessionActionHandler | null][] = [
      [
        "play",
        () => {
          ensureAudioGraph();
          setIsPlaying(true);
        },
      ],
      ["pause", () => setIsPlaying(false)],
      ["previoustrack", () => previous()],
      ["nexttrack", () => next()],
      [
        "seekbackward",
        (details) => seekBy(-(details.seekOffset ?? 10)),
      ],
      [
        "seekforward",
        (details) => seekBy(details.seekOffset ?? 10),
      ],
      [
        "seekto",
        (details) => {
          if (typeof details.seekTime === "number") seek(details.seekTime);
        },
      ],
    ];
    for (const [action, handler] of handlers) {
      try {
        session.setActionHandler(action, handler);
      } catch {
        /* Some actions are not supported by every Chromium build. */
      }
    }
    return () => {
      for (const [action] of handlers) {
        try {
          session.setActionHandler(action, null);
        } catch {
          /* ignore */
        }
      }
    };
  }, [ensureAudioGraph, next, previous, seek, seekBy]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    if (duration > 0 && "setPositionState" in navigator.mediaSession) {
      try {
        const audio = audioRef.current;
        const pos = audio ? audio.currentTime : 0;
        navigator.mediaSession.setPositionState({
          duration,
          position: Math.max(0, Math.min(pos, duration)),
          playbackRate: isPlaying ? 1 : 0,
        });
      } catch {
        /* Position reporting is best-effort. */
      }
    }
  }, [duration, isPlaying, currentTrack?.id]);

  /* sources --------------------------------------------------------- */
  const sortSourcesByQuality = (list: Source[]): Source[] => {
    const getScore = (s: Source) => {
      if (s.id === "youtube-music" || s.kind === "fallback") return -100;
      const q = (s.quality || "").toLowerCase();
      const n = (s.name || "").toLowerCase();
      if (q.includes("hi-res") || n.includes("hi-res") || q.includes("192") || q.includes("24-bit")) return 100;
      if (q.includes("flac") || q.includes("lossless") || n.includes("lossless")) return 80;
      if (s.kind === "network" || q.includes("original")) return 50;
      return 10;
    };
    return [...list].sort((a, b) => getScore(b) - getScore(a));
  };

  const [sources, setSources] = useStoredState<Source[]>(
    "chordly.sources.v1",
    sortSourcesByQuality(initialSources),
  );
  const [mounts, setMounts] = useStoredState<NetworkMount[]>("chordly.mounts.v1", initialMounts);

  // Automatically arrange sources so Hi-Res / Lossless FLAC stay on top, YouTube Music at bottom
  useEffect(() => {
    setSources((prev) => {
      const sorted = sortSourcesByQuality(prev);
      const isDifferent = sorted.some((s, idx) => s.id !== prev[idx]?.id);
      return isDifferent ? sorted : prev;
    });
  }, [setSources]);

  const toggleSource = useCallback(
    (id: string) => {
      setSources((list) => list.map((source) => (source.id === id ? { ...source, enabled: !source.enabled } : source)));
    },
    [setSources],
  );
  const moveSource = useCallback(
    (id: string, direction: -1 | 1) => {
      setSources((list) => {
        const index = list.findIndex((source) => source.id === id);
        if (index < 0) return list;
        const target = index + direction;
        if (target < 0 || target >= list.length) return list;
        const copy = [...list];
        [copy[index], copy[target]] = [copy[target], copy[index]];
        return copy;
      });
    },
    [setSources],
  );
  const addSource = useCallback(
    (source: Omit<Source, "id">) => {
      setSources((list) => sortSourcesByQuality([...list, { ...source, id: generateId("source") }]));
      pushToast("Addon connected", `${source.name} · ${source.quality}`);
    },
    [pushToast, setSources],
  );
  const addMount = useCallback(
    (mount: Omit<NetworkMount, "id">) => {
      setMounts((list) => [...list, { ...mount, id: generateId("mount") }]);
      pushToast("Network storage connected", `${mount.name} · ${mount.protocol}`);
    },
    [pushToast, setMounts],
  );
  const removeMount = useCallback(
    (id: string) => {
      setMounts((list) => list.filter((mount) => mount.id !== id));
      pushToast("Network storage disconnected");
    },
    [pushToast, setMounts],
  );

  // Automatic lossless quality upgrade: when playing a non-lossless track,
  // automatically check active Hi-Res / Lossless FLAC addons in the background
  // and upgrade seamlessly without requiring manual action!
  useEffect(() => {
    if (!currentTrack || currentTrack.lossless || currentTrack.format === "flac") return;
    if (autoUpgradeAttemptedRef.current.has(currentTrack.id)) return;
    autoUpgradeAttemptedRef.current.add(currentTrack.id);

    // Only search if any lossless addon is active
    const hasLosslessSource = sources.some(
      (s) =>
        s.enabled &&
        (s.kind === "addon" ||
          s.quality?.toLowerCase().includes("lossless") ||
          s.quality?.toLowerCase().includes("flac") ||
          s.quality?.toLowerCase().includes("hi-res")),
    );
    if (!hasLosslessSource) return;

    let cancelled = false;
    const trackToUpgrade = currentTrack;

    const desktop = (window as unknown as {
      chordlyDesktop?: {
        addons?: {
          search?: (q: string) => Promise<Track[]>;
          resolveStream?: (opts: { addonId: string; trackId: string }) => Promise<{
            url?: string;
            bitDepth?: number;
            sampleRate?: number;
            bitrate?: number;
            streamHost?: string;
            format?: string;
            codec?: string;
            quality?: string;
          }>;
        };
      };
    }).chordlyDesktop;

    const searchFn = desktop?.addons?.search;
    if (!searchFn) return;

    const cleanTitle = trackToUpgrade.title
      .replace(
        /\s*[\(\[](official\s*(music\s*)?video|audio|lyrics?|visualizer|remaster(ed)?(\s*\d+)?|4k|hd|hq)[\)\]].*/gi,
        "",
      )
      .trim();
    const query = `${trackToUpgrade.artist} ${cleanTitle}`.trim();

    (async () => {
      try {
        let results: Track[] = await searchFn(query);
        if ((!results || !results.length) && cleanTitle) {
          results = await searchFn(cleanTitle);
        }
        if (cancelled || !results || !results.length) return;

        const losslessMatch =
          results.find((r) => r.lossless || r.format === "flac") ||
          (results[0].addonId ? results[0] : null);
        if (!losslessMatch) return;

        let streamUrl = losslessMatch.src;
        let streamDetails: {
          url?: string;
          bitDepth?: number;
          sampleRate?: number;
          bitrate?: number;
          streamHost?: string;
          format?: string;
          codec?: string;
          quality?: string;
        } | null = null;

        const resolveFn = desktop?.addons?.resolveStream;
        if (resolveFn) {
          try {
            streamDetails = await resolveFn({
              addonId: losslessMatch.addonId || "",
              trackId: losslessMatch.rawAddonId || losslessMatch.id,
            });
            if (streamDetails?.url) streamUrl = streamDetails.url;
          } catch {}
        }

        if (cancelled) return;

        const audio = audioRef.current;
        const isCurrent = currentTrackRef.current?.id === trackToUpgrade.id;
        const currentProgress = audio?.currentTime || 0;
        const wasPlaying = isPlayingRef.current;

        const upgradedTrack: Track = {
          ...trackToUpgrade,
          ...losslessMatch,
          id: trackToUpgrade.id,
          rawAddonId: losslessMatch.rawAddonId,
          addonId: losslessMatch.addonId,
          addonBaseUrl: losslessMatch.addonBaseUrl,
          src: streamUrl,
          format: "flac",
          codec: "flac",
          lossless: true,
          quality:
            streamDetails?.bitDepth && streamDetails.bitDepth > 16
              ? "Hi-Res Lossless"
              : "Lossless FLAC",
          bitDepth: streamDetails?.bitDepth || losslessMatch.bitDepth || 16,
          sampleRate: streamDetails?.sampleRate || losslessMatch.sampleRate || 44100,
          bitrate: streamDetails?.bitrate || losslessMatch.bitrate || 990208,
          source: losslessMatch.source || "Lossless Addon",
          streamHost: streamDetails?.streamHost || losslessMatch.streamHost,
          cover: losslessMatch.cover || trackToUpgrade.cover,
        };

        trackById[trackToUpgrade.id] = upgradedTrack;

        setQueue((prevQueue) =>
          prevQueue.map((item) => (item.id === trackToUpgrade.id ? upgradedTrack : item)),
        );

        if (isCurrent && audio) {
          teardownRemoteMedia();
          audio.src = streamUrl;
          audio.load();
          audio.currentTime = currentProgress;
          if (wasPlaying) {
            void audio.play().catch(() => {});
          }
          const sRate = upgradedTrack.sampleRate ? (upgradedTrack.sampleRate / 1000).toFixed(1) : "44.1";
          pushToast(
            "Auto-selected Lossless FLAC",
            `Upgraded to ${upgradedTrack.quality} (${upgradedTrack.bitDepth || 16}-bit / ${sRate}kHz)`,
            "success",
          );
        }
      } catch (e) {
        console.warn("[chordly] Auto-upgrade error:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentTrack?.id, sources, pushToast, teardownRemoteMedia]);

  /* share & party */
  const openShare = useCallback(
    (target?: { track?: Track; playlist?: Playlist }) => {
      setShareTarget(target ?? (currentTrack ? { track: currentTrack } : null));
      openModal("share");
    },
    [currentTrack, openModal],
  );

  const connectPartySocket = useCallback(
    (wsUrl: string, roomCode: string, isHost: boolean, hostIp: string) => {
      if (partySocketRef.current) {
        try {
          partySocketRef.current.close();
        } catch {}
        partySocketRef.current = null;
      }
      if (partyPingTimerRef.current) {
        clearInterval(partyPingTimerRef.current);
        partyPingTimerRef.current = null;
      }

      try {
        const ws = new WebSocket(wsUrl);
        partySocketRef.current = ws;

        ws.onopen = () => {
          ws.send(JSON.stringify({ type: "join", roomCode }));
          setPartyRoom({ roomCode, isHost, memberCount: 1, pingMs: 1, hostIp });

          partyPingTimerRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "ping", timestamp: Date.now() }));
            }
          }, 3000);
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "pong") {
              const latency = Math.max(1, Date.now() - Number(msg.timestamp || Date.now()));
              setPartyRoom((prev) => (prev ? { ...prev, pingMs: latency } : null));
            } else if (msg.type === "member_count" || msg.type === "joined") {
              if (typeof msg.memberCount === "number") {
                setPartyRoom((prev) => (prev ? { ...prev, memberCount: msg.memberCount } : null));
              }
            } else if (msg.type === "state_update" && msg.state) {
              const s = msg.state;
              const audio = audioRef.current;
              if (s.track && s.track.id !== currentTrack?.id) {
                playTrack(s.track, s.queue || [s.track]);
              }
              if (typeof s.isPlaying === "boolean") {
                if (s.isPlaying && audio?.paused) {
                  void audio.play().catch(() => {});
                  setIsPlaying(true);
                } else if (!s.isPlaying && !audio?.paused) {
                  audio?.pause();
                  setIsPlaying(false);
                }
              }
              if (typeof s.currentTime === "number" && audio) {
                if (Math.abs(audio.currentTime - s.currentTime) > 2) {
                  audio.currentTime = s.currentTime;
                  setProgress(s.currentTime);
                }
              }
            }
          } catch {}
        };

        ws.onclose = () => {
          if (partyPingTimerRef.current) clearInterval(partyPingTimerRef.current);
          partyPingTimerRef.current = null;
          partySocketRef.current = null;
          setPartyRoom(null);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (e) {
        console.warn("Failed to connect party socket:", e);
      }
    },
    [currentTrack?.id, playTrack],
  );

  const startPartyHost = useCallback(async () => {
    try {
      const bridge = window.chordly ?? window.chordlyDesktop;
      const res = bridge?.createPartyRoom ? await bridge.createPartyRoom() : null;
      if (res?.roomCode) {
        connectPartySocket(res.wsUrl || `ws://localhost:39420`, res.roomCode, true, res.ip || "127.0.0.1");
        return res;
      }
    } catch (e) {
      console.warn("startPartyHost error:", e);
    }
    const fallbackCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    connectPartySocket("ws://localhost:39420", fallbackCode, true, "127.0.0.1");
    return { roomCode: fallbackCode, ip: "127.0.0.1", port: 39420, wsUrl: "ws://localhost:39420" };
  }, [connectPartySocket]);

  const joinPartyRoom = useCallback(
    async (code: string, hostAddress: string = "localhost") => {
      const cleanHost = hostAddress.trim() || "localhost";
      const port = 39420;
      const wsUrl = `ws://${cleanHost}:${port}`;
      connectPartySocket(wsUrl, code.trim().toUpperCase(), false, cleanHost);
      return true;
    },
    [connectPartySocket],
  );

  const leaveParty = useCallback(() => {
    if (partyPingTimerRef.current) clearInterval(partyPingTimerRef.current);
    if (partySocketRef.current) {
      partySocketRef.current.close();
      partySocketRef.current = null;
    }
    const bridge = window.chordly ?? window.chordlyDesktop;
    if (bridge?.stopPartyRoom) void bridge.stopPartyRoom();
    setPartyRoom(null);
  }, []);

  const broadcastPartyState = useCallback(
    (track?: Track | null, currentTime?: number, playing?: boolean) => {
      const ws = partySocketRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      const t = track ?? currentTrack;
      if (!t) return;
      ws.send(
        JSON.stringify({
          type: "sync_state",
          state: {
            track: t,
            currentTime: currentTime ?? audioRef.current?.currentTime ?? 0,
            isPlaying: playing ?? isPlaying,
            queue: queue.slice(0, 50),
          },
        }),
      );
    },
    [currentTrack, isPlaying, queue],
  );

  useEffect(() => {
    if (partyRoom?.isHost && currentTrack) {
      broadcastPartyState(currentTrack, audioRef.current?.currentTime ?? 0, isPlaying);
    }
  }, [currentTrack?.id, isPlaying, partyRoom?.isHost, broadcastPartyState]);

  /* memoized context ------------------------------------------------ */
  const value: AppContextValue = {
    view,
    navigate,
    goBack,
    goForward,
    canGoBack: backStack.length > 0,
    canGoForward: forwardStack.length > 0,
    openSearch,
    searchQuery,
    setSearchQuery,
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,

    liked,
    isLiked,
    toggleLike,
    downloads,
    isDownloaded,
    toggleDownload,
    localTracks: localLibrary.tracks,
    localLibrary,
    localScanning,
    localProgress,
    isDesktop: isDesktopApp,
    chooseLocalFolder,
    scanLocalFolder,
    revealLocalTrack,
    recents: recentTracks,
    playlists,
    createPlaylist,
    addTrackToPlaylist,
    deletePlaylist,
    refreshAccounts,
    refreshPlaylists,
    loadPlaylistTracks,
    setPlaylists,

    stats: { minutes: liveStats.minutes, streak: liveStats.streak },
    weekStats: liveStats.weekStats,
    topSong: liveStats.topSong,
    topSongs: liveStats.topSongs,
    topArtist: liveStats.topArtist,
    topArtists: liveStats.topArtists,
    topAlbum: liveStats.topAlbum,
    topAlbums: liveStats.topAlbums,
    recordListeningTime,
    recordTrackPlay,
    resetStats,

    accounts,
    activeAccount,
    switchAccount,
    addAccount,
    listeningProfile,
    setListeningProfile,

    queue,
    queueLabel,
    currentTrack,
    isPlaying,
    progress,
    duration,
    volume,
    muted,
    shuffle,
    repeatMode,
    playQueue,
    playTrack,
    playFromQueue,
    togglePlay,
    next,
    previous,
    seek,
    seekBy,
    changeVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    addToQueue,
    playNext,
    removeFromQueue,
    clearQueue,
    nowPlayingOpen,
    setNowPlayingOpen,
    queueOpen,
    setQueueOpen,
    nerdsStatsOpen,
    setNerdsStatsOpen,
    toggleNerdsStats,
    upgradeTrackToLossless,
    upgradingLossless,

    sources,
    toggleSource,
    moveSource,
    addSource,
    mounts,
    addMount,
    removeMount,

    settings,
    updateSettings,
    setSetting,
    resetSettings,

    modal,
    openModal,
    closeModal,
    toasts,
    pushToast,
    dismissToast,

    shareTarget,
    openShare,
    partyRoom,
    startPartyHost,
    joinPartyRoom,
    leaveParty,
    broadcastPartyState,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={(event) => {
          const value = event.currentTarget.duration;
          if (Number.isFinite(value) && value > 0) setDuration(value);
        }}
        onEnded={handleEnded}
        onError={handleAudioError}
      />
    </AppContext.Provider>
  );
}

export { tracks };
