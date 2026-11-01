import type { LocalLibrary, ScanProgress, Track, Account, Playlist, LyricLine } from "./types";

export interface DiscordActivityPayload {
  title: string;
  artist: string;
  album?: string;
  cover?: string;
  isPlaying?: boolean;
  progress?: number;
  duration?: number;
}

export interface ChordlyWindowBridge {
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<boolean>;
  closeWindow: () => Promise<void>;

  listAccounts: () => Promise<Account[]>;
  addAccount: () => Promise<Account>;
  addAccountWithCookie?: (cookieString: string) => Promise<Account>;
  removeAccount: (accountId: string) => Promise<boolean>;
  switchActiveAccount: (accountId: string) => Promise<boolean>;
  getBrandAccounts: (accountId: string) => Promise<Array<{ id: string; name: string; email: string }>>;
  switchBrandAccount: (
    accountId: string,
    authUser?: string,
    pageId?: string | null
  ) => Promise<{ success: boolean; playlists: Playlist[] }>;

  fetchPlaylists: (accountId?: string) => Promise<Playlist[]>;
  getPlaylists: (accountId?: string) => Promise<Playlist[]>;
  getPlaylistTracks: (playlistId: string, accountId?: string) => Promise<Track[]>;
  createPlaylist: (payload: { title: string; description?: string }) => Promise<{ id: string; name: string; description: string }>;
  addTrackToPlaylist: (playlistId: string, videoId: string, accountId?: string) => Promise<{ success: boolean }>;
  removeTrackFromPlaylist: (
    playlistId: string,
    videoId: string,
    setVideoId?: string,
    accountId?: string
  ) => Promise<{ success: boolean }>;

  importSpotifyPlaylistUrl: (
    url: string,
    saveToYTM?: boolean
  ) => Promise<{
    title: string;
    tracks: Track[];
    matchedCount: number;
    totalCount: number;
    ytmPlaylistId?: string | null;
  }>;

  getHomeFeed: () => Promise<any>;
  getExploreFeed: () => Promise<any>;
  searchYouTube: (query: string, filter?: string) => Promise<Track[]>;
  resolveStreamUrl: (track: Track) => Promise<any>;

  listAddons: () => Promise<any[]>;
  addAddonUrl: (url: string) => Promise<any[]>;
  removeAddon: (addonId: string) => Promise<any[]>;
  reorderAddons: (orderedIds: string[]) => Promise<any[]>;
  searchAddons: (query: string) => Promise<any[]>;
  fetchAddonManifest?: (url: string) => Promise<any>;
  resolveAddonStream?: (addonId: string, trackId: string) => Promise<any>;

  scanLocalMusic: (folderPath: string, filterNonMusic?: boolean) => Promise<LocalLibrary>;
  selectLocalFolder: (options?: { filterNonMusic?: boolean }) => Promise<LocalLibrary | null>;
  clearCache: (type: string) => Promise<boolean>;

  getLyrics: (track: Track, provider?: string) => Promise<{ provider: string; synced: boolean; text: string; lines?: LyricLine[] } | null>;

  setDiscordActivity?: (activity: DiscordActivityPayload) => Promise<boolean>;
  updateDiscordPresence?: (payload: { track?: Track; isPlaying?: boolean; currentTime?: number; duration?: number }) => Promise<boolean>;
  clearDiscordActivity?: () => Promise<boolean>;
  setDiscordEnabled?: (enabled: boolean) => Promise<boolean>;
  setDiscordClientId?: (clientId: string) => Promise<boolean>;

  createPartyRoom?: () => Promise<{ roomCode: string; ip: string; port: number; wsUrl: string }>;
  getPartyInfo?: () => Promise<{ ip: string; port: number; wsUrl: string }>;
  stopPartyRoom?: () => Promise<boolean>;
  factoryReset?: () => Promise<boolean>;
}

export interface ChordlyDesktopBridge {
  isDesktop: true;
  platform: string;
  getExploreFeed?: () => Promise<any>;
  getHomeFeed?: () => Promise<any>;
  versions: {
    electron: string;
    chrome: string;
    node: string;
  };
  window: {
    minimize: () => Promise<void>;
    toggleMaximize: () => Promise<boolean>;
    close: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
  };
  library: {
    get: () => Promise<LocalLibrary>;
    scan: (folder: string, options?: { filterNonMusic?: boolean }) => Promise<LocalLibrary>;
    chooseAndScan: (options?: { filterNonMusic?: boolean }) => Promise<LocalLibrary | null>;
    showInFolder: (filePath: string) => Promise<boolean>;
    onScanProgress: (callback: (progress: ScanProgress) => void) => () => void;
  };
  youtube: {
    search: (query: string) => Promise<Track[]>;
  };
  accounts: {
    list: () => Promise<Account[]>;
    add: (service: string) => Promise<Account>;
    addCookie?: (cookieString: string) => Promise<Account>;
    remove: (accountId: string) => Promise<boolean>;
    switch?: (accountId: string) => Promise<boolean>;
    brandAccounts: (accountId: string) => Promise<Array<{ id: string; name: string; email: string }>>;
    switchBrand: (accountId: string, brandId: string) => Promise<{ success: boolean; playlists: any[] }>;
  };
  playlists: {
    fetch: (accountId?: string) => Promise<Playlist[]>;
    get: (accountId?: string) => Promise<Playlist[]>;
    getTracks?: (playlistId: string, accountId?: string) => Promise<Track[]>;
    addTrack: (accountId: string, playlistId: string, videoId: string) => Promise<{ success: boolean }>;
    removeTrack?: (accountId: string, playlistId: string, videoId: string, setVideoId?: string) => Promise<{ success: boolean }>;
    create: (accountId: string, title: string, description: string) => Promise<{ id: string; name: string; description: string }>;
    importSpotify?: (url: string, saveToYTM?: boolean) => Promise<any>;
  };
  addons?: {
    list: () => Promise<any[]>;
    add: (url: string) => Promise<any[]>;
    remove: (id: string) => Promise<any[]>;
    search: (query: string) => Promise<any[]>;
    fetchManifest?: (url: string) => Promise<any>;
    resolveStream?: (payload: { addonId: string; trackId: string }) => Promise<any>;
    toggle?: (id: string) => Promise<any[]>;
  };
  lyrics?: {
    get: (track: Track, provider?: string) => Promise<{ provider: string; synced: boolean; text: string; lines?: LyricLine[] } | null>;
  };
  discord?: {
    setActivity: (activity: DiscordActivityPayload) => Promise<boolean>;
    clearActivity: () => Promise<boolean>;
    setEnabled: (enabled: boolean) => Promise<boolean>;
    setClientId?: (clientId: string) => Promise<boolean>;
  };
  setDiscordActivity?: (activity: DiscordActivityPayload) => Promise<boolean>;
  clearDiscordActivity?: () => Promise<boolean>;
  setDiscordEnabled?: (enabled: boolean) => Promise<boolean>;
  setDiscordClientId?: (clientId: string) => Promise<boolean>;
  party?: {
    create: () => Promise<{ roomCode: string; ip: string; port: number; wsUrl: string }>;
    getInfo: () => Promise<{ ip: string; port: number; wsUrl: string }>;
    stop: () => Promise<boolean>;
  };
  createPartyRoom?: () => Promise<{ roomCode: string; ip: string; port: number; wsUrl: string }>;
  getPartyInfo?: () => Promise<{ ip: string; port: number; wsUrl: string }>;
  stopPartyRoom?: () => Promise<boolean>;
  factoryReset?: () => Promise<boolean>;
  openExternal: (url: string) => Promise<boolean>;
  sendDiscordReport?: (payload: any) => Promise<{ success: boolean; status?: number; error?: string }>;
}

declare global {
  interface Window {
    chordly?: ChordlyWindowBridge;
    chordlyDesktop?: ChordlyDesktopBridge;
  }
}

export function getDesktopBridge(): ChordlyDesktopBridge | null {
  if (typeof window === "undefined") return null;
  const bridge = window.chordlyDesktop;
  return bridge?.isDesktop ? bridge : null;
}

export const isDesktopApp =
  typeof window !== "undefined" && Boolean(window.chordlyDesktop?.isDesktop || window.chordly);

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** exponent;
  return `${value >= 100 ? value.toFixed(0) : value.toFixed(1)} ${units[exponent]}`;
}
