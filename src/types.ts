export type ThemeMode = "dark" | "light" | "system";
export type Quality = "Lossless" | "High" | "Medium" | "Low";
export type OutputPrecision = "16-bit PCM" | "32-bit float";
export type RepeatMode = "off" | "all" | "one";
export type AppIcon = "default" | "monochrome" | "liquid";

export interface Artist {
  id: string;
  name: string;
  cover: string;
  genre: string;
  monthly: string;
  bio: string;
  verified?: boolean;
}

export interface Album {
  id: string;
  title: string;
  artistId: string;
  artist: string;
  cover: string;
  year: number;
  type: "Album" | "EP" | "Single" | "Live";
  genre: string;
  description: string;
}

export interface Track {
  id: string;
  title: string;
  artistId: string;
  artist: string;
  albumId: string;
  album: string;
  cover: string;
  genre: string;
  moods: string[];
  src: string;
  duration: number;
  year: number;
  plays: string;
  video?: boolean;
  explicit?: boolean;
  quality: string;
  local?: boolean;
  remote?: boolean;
  lossless?: boolean;
  format?: string;
  youtubeId?: string;
  videoId?: string;
  setVideoId?: string;
  filePath?: string;
  sampleRate?: number;
  bitDepth?: number;
  bitrate?: number;
  codec?: string;
  addonId?: string;
  addonBaseUrl?: string;
  rawAddonId?: string;
  streamHost?: string;
  source?: string;
}

export interface NerdsStats {
  trackId: string;
  title: string;
  artist: string;
  source: string;
  codec: string;
  container: string;
  format: string;
  quality: string;
  bitrate: string;
  sampleRate: string;
  bitDepth: string;
  channels: string;
  bufferHealth: string;
  bufferAheadSeconds: number;
  bufferPercent: number;
  streamHost: string;
  streamUrl: string;
  audioState: string;
  audioOutput: string;
  volumeGain: string;
  playhead: string;
  duration: string;
  droppedOrErrors: string;
}

export type ScanPhase = "walking" | "reading" | "done";

export interface ScanProgress {
  phase: ScanPhase;
  inspected?: number;
  processed?: number;
  total?: number;
  found?: number;
  skipped?: number;
}

export interface LocalLibrary {
  folder: string | null;
  scannedAt: string | null;
  tracks: Track[];
  totalBytes: number;
  skipped: number;
}

export interface Playlist {
  id: string;
  browseId?: string;
  name: string;
  title?: string;
  subtitle?: string;
  description: string;
  cover: string;
  coverUrl?: string;
  trackIds: string[];
  trackCount?: number;
  system?: boolean;
  synced?: boolean;
  source?: string;
  accountId?: string;
  createdAt: number;
}

export interface Mood {
  id: string;
  name: string;
  blurb: string;
  cover: string;
  gradient: string;
}

export interface Genre {
  id: string;
  name: string;
  cover: string;
  description: string;
  accent: string;
}

export interface Podcast {
  id: string;
  title: string;
  host: string;
  cover: string;
  episodes: number;
  description: string;
  category: string;
}

export interface Account {
  id: string;
  name: string;
  email: string;
  handle?: string;
  avatarUrl?: string;
  initial: string;
  color: string;
  brand?: boolean;
  plan: string;
  cookies?: {
    sapisid: string;
    secure3papisid: string;
    hsid: string;
    ssid: string;
    apisid: string;
    loginInfo?: string;
  };
  brandAccounts?: Array<{ id: string; name: string; email: string }>;
  activeBrandId?: string;
  syncedAt?: number;
}

export interface Source {
  id: string;
  name: string;
  description: string;
  kind: "addon" | "fallback" | "network" | "local";
  enabled: boolean;
  url?: string;
  quality: string;
  icon: string;
}

export interface NetworkMount {
  id: string;
  name: string;
  protocol: "WebDAV" | "SMB";
  host: string;
  path: string;
  status: "connected" | "error";
}

export interface LyricLine {
  time: number;
  text: string;
}

export type ModalType =
  | "import"
  | "create-playlist"
  | "add-account"
  | "party"
  | "share"
  | "add-addon"
  | "network-share"
  | "about"
  | "shortcuts"
  | "stats-for-nerds"
  | "report-bug"
  | null;

export type CollectionKind =
  | "album"
  | "playlist"
  | "artist"
  | "mood"
  | "genre"
  | "liked"
  | "downloads"
  | "local"
  | "podcasts"
  | "videos"
  | "subscriptions";

export type View =
  | { name: "home" }
  | { name: "explore" }
  | { name: "library" }
  | { name: "search" }
  | { name: "settings" }
  | { name: "collection"; kind: CollectionKind; id?: string; title?: string; artist?: string; cover?: string };

export interface Toast {
  id: number;
  title: string;
  description?: string;
  tone?: "default" | "success" | "error";
}

export type BgType = "ambient" | "custom" | "preset" | "color";

export interface AppSettings {
  theme: ThemeMode;
  font: string;
  reduceMotion: boolean;
  liquidGlass: boolean;
  fullScreenCover: boolean;
  animatedCovers: boolean;
  spotifyCanvas: boolean;
  syncedLyrics: boolean;
  lyricsBlur: boolean;
  lyricProviders: Record<string, boolean>;

  bgType: BgType;
  bgCustomUrl: string;
  bgPreset: string;
  bgColor: string;
  bgOpacity: number;
  bgBlur: number;
  nowPlayingGlass: boolean;
  nowPlayingBlur: number;
  nowPlayingOpacity: number;

  directStream: boolean;
  wifiQuality: Quality;
  mobileQuality: Quality;
  downloadQuality: Quality;
  dolbyAtmos: boolean;

  outputPrecision: OutputPrecision;
  bitPerfect: boolean;
  wasapiExclusive: boolean;
  loudnessNormalization: boolean;
  disableOnSpeaker: boolean;
  crossfade: number;
  automix: boolean;
  skipSilence: boolean;
  spatialAudio: boolean;
  equalizer: boolean;
  eqBands: number[];
  preamp: number;

  highPerformance: boolean;

  scanFolder: string;
  filterNonMusic: boolean;
  autoScan: boolean;

  cacheLimit: number;
  autoCache: boolean;

  discord: boolean;
  discordClientId: string;
  spotifyLinked: boolean;
  listenbrainzToken: string;
  lastfm: boolean;
  scrobbleStart: number;

  partyServer: string;

  stopOnClose: boolean;
  hideVolume: boolean;
  showPartyButton: boolean;
  showStats: boolean;
  queueHistory: boolean;
  repeatBehavior: string;
  swipeActions: boolean;

  appIcon: AppIcon;
  smartAlignment: boolean;
  experimental: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "dark",
  font: "SF Pro Display",
  reduceMotion: false,
  liquidGlass: true,
  fullScreenCover: false,
  animatedCovers: true,
  spotifyCanvas: true,
  syncedLyrics: true,
  lyricsBlur: true,
  lyricProviders: {
    "BetterLyrics": true,
    "LyricsPlus": true,
    "Musixmatch": true,
    "Genius": true,
  },

  bgType: "ambient",
  bgCustomUrl: "",
  bgPreset: "aurora",
  bgColor: "#070709",
  bgOpacity: 0.82,
  bgBlur: 0,
  nowPlayingGlass: true,
  nowPlayingBlur: 36,
  nowPlayingOpacity: 0.6,

  directStream: true,
  wifiQuality: "Lossless",
  mobileQuality: "High",
  downloadQuality: "Lossless",
  dolbyAtmos: false,

  outputPrecision: "32-bit float",
  bitPerfect: true,
  wasapiExclusive: true,
  loudnessNormalization: true,
  disableOnSpeaker: false,
  crossfade: 4,
  automix: false,
  skipSilence: true,
  spatialAudio: false,
  equalizer: false,
  eqBands: [0, 0, 0, 0, 0, 0, 0],
  preamp: 0,

  highPerformance: true,

  scanFolder: "C:\\Users\\Edward\\Music",
  filterNonMusic: true,
  autoScan: true,

  cacheLimit: 512,
  autoCache: true,

  discord: true,
  discordClientId: "",
  spotifyLinked: false,
  listenbrainzToken: "",
  lastfm: false,
  scrobbleStart: 50,

  partyServer: "wss://party.chordly.app",

  stopOnClose: false,
  hideVolume: false,
  showPartyButton: true,
  showStats: false,
  queueHistory: true,
  repeatBehavior: "Play entire playlist",
  swipeActions: true,

  appIcon: "default",
  smartAlignment: true,
  experimental: false,
};
