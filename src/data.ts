import type {
  Account,
  Album,
  Artist,
  Genre,
  LyricLine,
  Mood,
  NetworkMount,
  Playlist,
  Podcast,
  Source,
  Track,
} from "./types";

export const cover = (n: number) => `/covers/cover${n}.jpg`;

/* ------------------------------------------------------------------ */
/*  Zero Demo Catalog (Clean Fresh Install State)                     */
/* ------------------------------------------------------------------ */

export const artists: Artist[] = [];
export const albums: Album[] = [];
export const tracks: Track[] = [];

export const initialPlaylists: Playlist[] = [];

export const initialLiked: string[] = [];
export const initialLikedSongs: string[] = [];

export const initialDownloads: string[] = [];

export const initialRecents: string[] = [];

export const initialRecentSearches: string[] = [];

export const initialLocalTracks: Track[] = [];

export const recentAlbums: Album[] = [];

export const podcasts: Podcast[] = [];
export const initialPodcasts: Podcast[] = [];

export const subscriptions: string[] = [];
export const initialSubscriptions: string[] = [];

export const heroPicks: Array<{
  albumId: string;
  trackId: string;
  kicker: string;
  title: string;
  blurb: string;
  stat: string;
}> = [];

export const stats = {
  minutes: 0,
  topSong: "",
  topArtist: "",
  topAlbum: "",
  streak: 0,
};

export const lyricsByTrack: Record<string, LyricLine[]> = {};

/* ------------------------------------------------------------------ */
/*  Accounts, Sources & Network Mounts                                */
/* ------------------------------------------------------------------ */

export const initialAccounts: Account[] = [];

export const initialSources: Source[] = [
  {
    id: "qobuz-soundfean",
    name: "Qobuz [Heisenbergg]",
    description: "24-bit / 192kHz Hi-Res Lossless Vault",
    kind: "addon",
    enabled: true,
    url: "https://soundfean-musics.onrender.com/a",
    quality: "Hi-Res Lossless",
    icon: "Q",
  },
  {
    id: "lossless-bridge",
    name: "Lossless Bridge",
    description: "NetEase Bit-Perfect Lossless FLAC",
    kind: "addon",
    enabled: true,
    url: "https://losslessbridge.de.deplexo.com/u/toq2o0.qOKmuDcMf11MWbx0TmLQVA.tUQqxAdZOZA67WhKsv-SP7",
    quality: "Lossless FLAC",
    icon: "L",
  },
  {
    id: "nas",
    name: "Home NAS",
    description: "WebDAV / Local network share",
    kind: "network",
    enabled: false,
    quality: "Original",
    icon: "N",
  },
  {
    id: "youtube-music",
    name: "YouTube Music",
    description: "Default catalogue · 100M+ tracks",
    kind: "fallback",
    enabled: true,
    quality: "High",
    icon: "Y",
  },
];

export const initialMounts: NetworkMount[] = [];

/* ------------------------------------------------------------------ */
/*  Explore Taxonomy & Moods                                          */
/* ------------------------------------------------------------------ */

export const EXPLORE_MOODS_AND_GENRES = [
  { id: "chill", title: "Chill", subtitle: "Hits Cafe" },
  { id: "commute", title: "Commute", subtitle: "Feel-Good Indie" },
  { id: "energize", title: "Energize", subtitle: "pump-up pop" },
  { id: "feel_good", title: "Feel good", subtitle: "Sunshine Indie" },
  { id: "focus", title: "Focus", subtitle: "Lofi Loft" },
  { id: "gaming", title: "Gaming", subtitle: "Gaming Mix" },
  { id: "party", title: "Party", subtitle: "Party Anthems" },
  { id: "romance", title: "Romance", subtitle: "Sweetheart" },
  { id: "sad", title: "Sad", subtitle: "Burn the Photos" },
  { id: "sleep", title: "Sleep", subtitle: "Classical for Sleeping" },
  { id: "workout", title: "Workout", subtitle: "Beast Mode" },
  { id: "indie", title: "Indie & alternative", subtitle: "Indie Hits" },
  { id: "pop", title: "Pop", subtitle: "Pop Rising" },
  { id: "rock", title: "Rock", subtitle: "Rock Classics" },
  { id: "metal", title: "Metal", subtitle: "Heavy Metal" },
  { id: "hiphop", title: "Hip-hop", subtitle: "Rap Caviar" },
  { id: "rnb", title: "R&B & soul", subtitle: "Soul Lounge" },
  { id: "kpop", title: "K-Pop", subtitle: "K-Pop ON!" },
  { id: "jpop", title: "J-Pop", subtitle: "Tokyo Super Hits" },
  { id: "jazz", title: "Jazz", subtitle: "Late Night Jazz" },
];

export const moods: Mood[] = [
  {
    id: "energy",
    name: "Energy",
    blurb: "High voltage, no skips.",
    cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80",
    gradient: "linear-gradient(140deg, rgba(255,80,40,.40), rgba(220,20,80,.12) 65%)",
  },
  {
    id: "relax",
    name: "Relax",
    blurb: "Let the shoulders drop.",
    cover: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80",
    gradient: "linear-gradient(140deg, rgba(30,160,200,.35), rgba(10,70,140,.12) 65%)",
  },
  {
    id: "blue",
    name: "Feeling Blue",
    blurb: "For the quiet hours.",
    cover: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=800&auto=format&fit=crop&q=80",
    gradient: "linear-gradient(140deg, rgba(50,80,220,.40), rgba(15,15,70,.12) 65%)",
  },
  {
    id: "chill",
    name: "Chill",
    blurb: "Soft edges, slow time.",
    cover: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=800&auto=format&fit=crop&q=80",
    gradient: "linear-gradient(140deg, rgba(220,160,50,.35), rgba(110,65,15,.12) 65%)",
  },
  {
    id: "focus",
    name: "Focus",
    blurb: "One thing at a time.",
    cover: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&auto=format&fit=crop&q=80",
    gradient: "linear-gradient(140deg, rgba(140,140,160,.30), rgba(40,40,55,.12) 65%)",
  },
];

export const genres: Genre[] = [
  {
    id: "pop",
    name: "Pop",
    cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80",
    description: "The shape of right now.",
    accent: "from-pink-500/25",
  },
  {
    id: "rnb",
    name: "R&B & Soul",
    cover: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80",
    description: "A voice like a low lamp.",
    accent: "from-amber-500/20",
  },
  {
    id: "rock",
    name: "Rock",
    cover: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=800&auto=format&fit=crop&q=80",
    description: "Raw power and driven chords.",
    accent: "from-red-600/20",
  },
  {
    id: "hiphop",
    name: "Hip-hop",
    cover: "https://images.unsplash.com/photo-1572327918628-bf61496743ce?w=800&auto=format&fit=crop&q=80",
    description: "City noise turned to rhythm.",
    accent: "from-yellow-500/20",
  },
  {
    id: "indie",
    name: "Indie",
    cover: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800&auto=format&fit=crop&q=80",
    description: "Porch lights and open doors.",
    accent: "from-emerald-500/20",
  },
  {
    id: "jazz",
    name: "Jazz",
    cover: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800&auto=format&fit=crop&q=80",
    description: "Conversations without words.",
    accent: "from-blue-500/20",
  },
  {
    id: "classical",
    name: "Classical",
    cover: "https://images.unsplash.com/photo-1513883049090-d0b7439799bf?w=800&auto=format&fit=crop&q=80",
    description: "Masterpieces, symphony and quiet rooms.",
    accent: "from-indigo-500/20",
  },
  {
    id: "electronic",
    name: "Electronic",
    cover: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=80",
    description: "Synths, basslines, and late-night rave.",
    accent: "from-cyan-500/25",
  },
];

export const DEFAULT_LYRICS_SOURCES = [
  "BetterLyrics",
  "LyricsPlus",
  "Musixmatch",
  "Genius",
  "LRCLIB",
  "KuGou",
  "Unison",
  "lrc.red",
  "BiniLyrics",
  "PaxSenix",
  "SimpMusic",
  "Megalobiz",
];

export const lyricProviderNames = DEFAULT_LYRICS_SOURCES;

export const addonsForSearch = [
  { name: "Qobuz", quality: "24-bit / 192kHz", enabled: true },
  { name: "JioSaavn", quality: "16-bit / 44.1kHz", enabled: true },
  { name: "YouTube Music", quality: "256kbps AAC", enabled: true },
];

/* ------------------------------------------------------------------ */
/*  Dynamic In-Memory Registry for Remote (YouTube) & Local Tracks    */
/* ------------------------------------------------------------------ */

export const trackById: Record<string, Track> = {};
export const albumById: Record<string, Album> = {};
export const artistById: Record<string, Artist> = {};

let registeredLocalTrackIds: string[] = [];

export function syncLocalTracks(list: Track[]) {
  for (const id of registeredLocalTrackIds) delete trackById[id];
  registeredLocalTrackIds = list.map((track) => track.id);
  for (const track of list) {
    trackById[track.id] = track;
    if (track.albumId && !albumById[track.albumId]) {
      albumById[track.albumId] = {
        id: track.albumId,
        title: track.album || "Local Album",
        artistId: track.artistId || "local-artist",
        artist: track.artist || "Unknown Artist",
        cover: track.cover || cover(1),
        year: track.year || 2026,
        type: "Album",
        genre: track.genre || "Local",
        description: "Local music file on this device.",
      };
    }
    if (track.artistId && !artistById[track.artistId]) {
      artistById[track.artistId] = {
        id: track.artistId,
        name: track.artist || "Unknown Artist",
        cover: track.cover || cover(1),
        genre: track.genre || "Local",
        monthly: "Local",
        bio: "Local artist on this device.",
      };
    }
  }
}

let registeredRemoteTrackIds: string[] = [];

// Hydrate cached tracks from localStorage so imported playlists retain track metadata across reloads
try {
  if (typeof window !== "undefined" && window.localStorage) {
    const raw = window.localStorage.getItem("chordly.cached-tracks.v1");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const t of parsed) {
          if (t && t.id) {
            trackById[t.id] = t;
            if (!registeredRemoteTrackIds.includes(t.id)) registeredRemoteTrackIds.push(t.id);
          }
        }
      }
    }
  }
} catch {}

export function registerRemoteTracks(list: Track[]) {
  for (const track of list) {
    if (!registeredRemoteTrackIds.includes(track.id)) registeredRemoteTrackIds.push(track.id);
    trackById[track.id] = track;
    if (track.albumId && !albumById[track.albumId]) {
      albumById[track.albumId] = {
        id: track.albumId,
        title: track.album || track.title,
        artistId: track.artistId || "yt-artist",
        artist: track.artist || "YouTube Artist",
        cover: track.cover || cover(1),
        year: track.year || 2026,
        type: "Album",
        genre: track.genre || "YouTube",
        description: "YouTube Music release.",
      };
    }
    if (track.artistId && !artistById[track.artistId]) {
      artistById[track.artistId] = {
        id: track.artistId,
        name: track.artist || "YouTube Artist",
        cover: track.cover || cover(1),
        genre: track.genre || "YouTube",
        monthly: "YouTube",
        bio: "YouTube Music Artist.",
      };
    }
  }
  while (registeredRemoteTrackIds.length > 800) {
    const oldest = registeredRemoteTrackIds.shift();
    if (oldest) delete trackById[oldest];
  }

  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const toSave = registeredRemoteTrackIds.map((id) => trackById[id]).filter(Boolean).slice(-400);
      window.localStorage.setItem("chordly.cached-tracks.v1", JSON.stringify(toSave));
    }
  } catch {}
}

export const getAlbumTracks = (albumIdOrTitle: string) => {
  if (!albumIdOrTitle) return [];
  const lower = albumIdOrTitle.toLowerCase();
  return Object.values(trackById).filter(
    (t) =>
      t.albumId === albumIdOrTitle ||
      (t.album && t.album.toLowerCase() === lower)
  );
};

export const getArtistTracks = (artistIdOrName: string) => {
  if (!artistIdOrName) return [];
  const lower = artistIdOrName.toLowerCase();
  return Object.values(trackById).filter(
    (t) =>
      t.artistId === artistIdOrName ||
      (t.artist && t.artist.toLowerCase() === lower)
  );
};

export const getArtistAlbums = (artistIdOrName: string) => {
  if (!artistIdOrName) return [];
  const lower = artistIdOrName.toLowerCase();
  return Object.values(albumById).filter(
    (a) =>
      a.artistId === artistIdOrName ||
      (a.artist && a.artist.toLowerCase() === lower)
  );
};

export const getMoodTracks = (mood: string) =>
  Object.values(trackById).filter((t) => t.moods?.includes(mood));

export const getGenreTracks = (genreName: string) =>
  Object.values(trackById).filter(
    (t) => t.genre?.toLowerCase() === genreName.toLowerCase()
  );

export const getPlaylistTracks = (playlist: Playlist) =>
  (playlist.trackIds || []).map((id) => trackById[id]).filter(Boolean);

export const lyricsCatalog: Record<string, LyricLine[]> = {};

/* ------------------------------------------------------------------ */
/*  Utilities                                                          */
/* ------------------------------------------------------------------ */

export const trackDurationLabel = (track: Track) => {
  const m = Math.floor((track.duration || 0) / 60);
  const s = Math.floor((track.duration || 0) % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export const searchCatalog = (query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) {
    return { tracks: [] as Track[], albums: [] as Album[], artists: [] as Artist[] };
  }
  return {
    tracks: Object.values(trackById).filter(
      (t) =>
        t.title?.toLowerCase().includes(q) ||
        t.artist?.toLowerCase().includes(q) ||
        t.album?.toLowerCase().includes(q) ||
        t.genre?.toLowerCase().includes(q) ||
        t.moods?.some((m) => m.toLowerCase().includes(q)),
    ),
    albums: Object.values(albumById).filter(
      (a) =>
        a.title?.toLowerCase().includes(q) ||
        a.artist?.toLowerCase().includes(q) ||
        a.genre?.toLowerCase().includes(q),
    ),
    artists: Object.values(artistById).filter(
      (a) => a.name?.toLowerCase().includes(q) || a.genre?.toLowerCase().includes(q),
    ),
  };
};
