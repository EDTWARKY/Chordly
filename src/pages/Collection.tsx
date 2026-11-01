import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  BadgeCheck,
  Check,
  CopyPlus,
  Disc3,
  Download,
  FolderOpen,
  Heart,
  ListPlus,
  Loader2,
  MoreHorizontal,
  Music2,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Share2,
  Shuffle,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { useApp } from "../store";
import {
  albumById,
  albums,
  artistById,
  artists,
  getAlbumTracks,
  getArtistAlbums,
  getArtistTracks,
  getGenreTracks,
  getMoodTracks,
  getPlaylistTracks,
  genres,
  moods,
  podcasts,
  registerRemoteTracks,
  subscriptions,
  trackById,
  tracks,
} from "../data";
import type { Album, Playlist, Track } from "../types";
import { cn, formatTime, useOutsideClick } from "../lib/utils";
import { formatBytes } from "../desktop";
import { Artwork } from "../components/Artwork";
import { AlbumCard, ArtistCard, VideoCard } from "../components/Cards";
import { SectionHeading } from "../components/Primitives";
import { TrackRow } from "../components/TrackRow";

const genreMoodCache = new Map<string, Track[]>();
const artistAlbumCache = new Map<string, Track[]>();

const GENRE_MOOD_QUERIES: Record<string, string> = {
  pop: "Top pop hits music",
  rnb: "R&B Soul hits music",
  rock: "Classic rock hits music",
  hiphop: "Hip-hop rap hits music",
  indie: "Indie alternative hits music",
  jazz: "Jazz classics music",
  classical: "Classical music masterpieces",
  electronic: "Electronic dance EDM music",
  energy: "High energy music",
  relax: "Chill relaxing acoustic music",
  focus: "Focus study instrumental music",
  "late-night": "Late night vibes music",
  workout: "Workout energetic gym music",
};

const makeStarter = (id: string, title: string, artist: string, album: string, duration: number, cover: string, genre: string, moods: string[]): Track => ({
  id,
  videoId: id,
  title,
  artistId: `art-${id}`,
  artist,
  albumId: `alb-${id}`,
  album,
  duration,
  cover,
  year: 2024,
  genre,
  moods,
  quality: "High",
  plays: "YouTube",
  src: `chordly://stream/${id}`,
  remote: true,
  source: "youtube",
});

const GENRE_MOOD_STARTERS: Record<string, Track[]> = {
  pop: [
    makeStarter("rouojv6Xu8Q", "Espresso", "Sabrina Carpenter", "Short n' Sweet", 175, "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80", "Pop", ["Energy", "Pop"]),
    makeStarter("T3E9Wjbq44E", "BIRDS OF A FEATHER", "Billie Eilish", "HIT ME HARD AND SOFT", 191, "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80", "Pop", ["Chill", "Pop"]),
    makeStarter("2Vv-BfVoq4g", "Perfect", "Ed Sheeran", "÷ (Divide)", 263, "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=600&auto=format&fit=crop&q=80", "Pop", ["Relax", "Pop"]),
  ],
  energy: [
    makeStarter("4NRXx6U8ABQ", "Blinding Lights", "The Weeknd", "After Hours", 200, "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80", "Electronic", ["Energy"]),
    makeStarter("rouojv6Xu8Q", "Espresso", "Sabrina Carpenter", "Short n' Sweet", 175, "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80", "Pop", ["Energy"]),
    makeStarter("kJQP7kiw5Fk", "Despacito", "Luis Fonsi ft. Daddy Yankee", "VIDA", 228, "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80", "Pop", ["Energy"]),
  ],
  rock: [
    makeStarter("fJ9rUzIMcZQ", "Bohemian Rhapsody", "Queen", "A Night at the Opera", 359, "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=600&auto=format&fit=crop&q=80", "Rock", ["Rock"]),
    makeStarter("1w7OgIMMRc4", "Sweet Child O' Mine", "Guns N' Roses", "Appetite for Destruction", 356, "https://images.unsplash.com/photo-1564186763535-ebb21ef5277f?w=600&auto=format&fit=crop&q=80", "Rock", ["Rock"]),
    makeStarter("kXYiU_JCYtU", "Numb", "Linkin Park", "Meteora", 185, "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=600&auto=format&fit=crop&q=80", "Rock", ["Rock"]),
  ],
  rnb: [
    makeStarter("4NRXx6U8ABQ", "Blinding Lights", "The Weeknd", "After Hours", 200, "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80", "R&B & Soul", ["R&B"]),
    makeStarter("T3E9Wjbq44E", "BIRDS OF A FEATHER", "Billie Eilish", "HIT ME HARD AND SOFT", 191, "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80", "R&B & Soul", ["R&B"]),
  ],
  hiphop: [
    makeStarter("YVkUvmDQ3HY", "Without Me", "Eminem", "The Eminem Show", 290, "https://images.unsplash.com/photo-1572327918628-bf61496743ce?w=600&auto=format&fit=crop&q=80", "Hip-hop", ["Hip-hop"]),
    makeStarter("L7_jYl8A_MU", "Sunflower", "Post Malone & Swae Lee", "Spider-Man: Into the Spider-Verse", 158, "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80", "Hip-hop", ["Hip-hop"]),
  ],
  indie: [
    makeStarter("T3E9Wjbq44E", "BIRDS OF A FEATHER", "Billie Eilish", "HIT ME HARD AND SOFT", 191, "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=600&auto=format&fit=crop&q=80", "Indie", ["Indie"]),
  ],
  jazz: [
    makeStarter("2Vv-BfVoq4g", "Autumn Leaves", "Jazz Trio", "Blue Note Classics", 263, "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=600&auto=format&fit=crop&q=80", "Jazz", ["Jazz"]),
  ],
  classical: [
    makeStarter("fJ9rUzIMcZQ", "Symphony No. 5", "Ludwig van Beethoven", "Classical Essentials", 359, "https://images.unsplash.com/photo-1513883049090-d0b7439799bf?w=600&auto=format&fit=crop&q=80", "Classical", ["Classical"]),
  ],
  electronic: [
    makeStarter("4NRXx6U8ABQ", "Blinding Lights", "The Weeknd", "After Hours", 200, "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80", "Electronic", ["Electronic"]),
  ],
  relax: [
    makeStarter("2Vv-BfVoq4g", "Perfect", "Ed Sheeran", "÷ (Divide)", 263, "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80", "Acoustic", ["Relax"]),
  ],
  blue: [
    makeStarter("T3E9Wjbq44E", "BIRDS OF A FEATHER", "Billie Eilish", "HIT ME HARD AND SOFT", 191, "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=600&auto=format&fit=crop&q=80", "Indie", ["Feeling Blue"]),
  ],
  chill: [
    makeStarter("2Vv-BfVoq4g", "Perfect", "Ed Sheeran", "÷ (Divide)", 263, "https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=600&auto=format&fit=crop&q=80", "Acoustic", ["Chill"]),
  ],
  focus: [
    makeStarter("T3E9Wjbq44E", "BIRDS OF A FEATHER", "Billie Eilish", "HIT ME HARD AND SOFT", 191, "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=600&auto=format&fit=crop&q=80", "Instrumental", ["Focus"]),
  ],
};

function totalDuration(list: Track[]) {
  const seconds = list.reduce((sum, track) => sum + track.duration, 0);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours > 0 ? `${hours} hr ${minutes} min` : `${minutes} min`;
}

export function Collection() {
  const {
    view,
    navigate,
    playQueue,
    playTrack,
    currentTrack,
    isPlaying,
    togglePlay,
    liked,
    downloads,
    playlists,
    activeAccount,
    createPlaylist,
    deletePlaylist,
    pushToast,
    openModal,
    settings,
    sources,
    localTracks,
    localLibrary,
    localScanning,
    localProgress,
    chooseLocalFolder,
    scanLocalFolder,
    loadPlaylistTracks,
  } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [fetchedTracks, setFetchedTracks] = useState<Track[]>([]);
  const menuRef = useOutsideClick<HTMLDivElement>(() => setMenuOpen(false), menuOpen);

  if (view.name !== "collection") return null;
  const { kind, id: collectionId, title: viewTitle, artist: viewArtist, cover: viewCover } = view as any;

  let title = viewTitle ?? "Collection";
  let eyebrow = "Collection";
  let description = "";
  let coverImage = "";
  let roundCover = false;
  let collectionTracks: Track[] = [];
  let showAlbum = true;
  let meta: string[] = [];
  let album: Album | null = null;
  let playlist: Playlist | null = null;
  let heroOverlay: "heart" | "download" | null = null;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (kind === "playlist" && collectionId) {
        const pl = playlists.find((item) => item.id === collectionId || item.browseId === collectionId);
        const existingTracks = pl ? getPlaylistTracks(pl) : [];
        if (existingTracks.length > 0) {
          setFetchedTracks(existingTracks);
          return;
        }

        setLoadingRemote(true);
        try {
          const targetId = pl?.browseId || collectionId;
          const tracks = await loadPlaylistTracks(targetId, pl?.accountId);
          if (!cancelled && Array.isArray(tracks) && tracks.length > 0) {
            setFetchedTracks(tracks);
          }
        } finally {
          if (!cancelled) setLoadingRemote(false);
        }
      } else if (kind === "liked") {
        const localLikedTracks = liked.map((id) => trackById[id]).filter(Boolean);
        if (localLikedTracks.length > 0) {
          setFetchedTracks(localLikedTracks);
        } else {
          setLoadingRemote(true);
          try {
            const likedPl = playlists.find((p) => p.id === "LM" || p.browseId === "VLLM");
            const tracks = await loadPlaylistTracks("VLLM", likedPl?.accountId);
            if (!cancelled && Array.isArray(tracks) && tracks.length > 0) {
              setFetchedTracks(tracks);
            }
          } finally {
            if (!cancelled) setLoadingRemote(false);
          }
        }
      } else if (kind === "genre" || kind === "mood") {
        const searchId = (collectionId || "").toLowerCase();
        const searchTitle = viewTitle ?? kind;
        const cacheKey = `${kind}:${searchId || searchTitle}`;

        if (genreMoodCache.has(cacheKey)) {
          const cached = genreMoodCache.get(cacheKey)!;
          if (cached.length > 0) {
            setFetchedTracks(cached);
            setLoadingRemote(false);
            return;
          }
        }

        setLoadingRemote(true);
        setFetchedTracks([]);
        try {
          const bridge = (window as any).chordly ?? (window as any).chordlyDesktop ?? (window as any).desktop;
          let results: Track[] = [];

          const query = GENRE_MOOD_QUERIES[searchId] || `${searchTitle} music`;

          // 1. YouTube Music search
          if (bridge?.searchYouTube) {
            try {
              const ytResults = await bridge.searchYouTube(query);
              if (Array.isArray(ytResults) && ytResults.length > 0) {
                results = ytResults;
              }
            } catch (ytErr) {
              console.warn("[chordly] YTM genre search error:", ytErr);
            }
          }

          // 2. Addon sources search (Lossless Bridge, Qobuz, etc.)
          if ((!results || results.length === 0) && bridge?.searchAddons) {
            try {
              const addonResults = await bridge.searchAddons(query);
              if (Array.isArray(addonResults) && addonResults.length > 0) {
                results = addonResults;
              }
            } catch (addonErr) {
              console.warn("[chordly] addon genre search error:", addonErr);
            }
          }

          // 3. Fallback to iTunes public catalog if other sources return empty
          if (!results || results.length === 0) {
            try {
              const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=30`);
              const data = await res.json();
              if (data?.results?.length) {
                results = data.results.map((item: any) => ({
                  id: `itunes-${item.trackId}`,
                  title: item.trackName,
                  artist: item.artistName,
                  album: item.collectionName || searchTitle,
                  duration: Math.round((item.trackTimeMillis || 180000) / 1000),
                  cover: item.artworkUrl100 ? item.artworkUrl100.replace("100x100bb", "600x600bb") : "",
                  year: item.releaseDate ? new Date(item.releaseDate).getFullYear() : 2024,
                  genre: searchTitle,
                  quality: "Lossless",
                  codec: "ALAC",
                  remote: true,
                  src: item.previewUrl,
                }));
              }
            } catch (itunesErr) {
              console.warn("[chordly] iTunes fallback search error:", itunesErr);
            }
          }

          if (!cancelled && Array.isArray(results) && results.length > 0) {
            registerRemoteTracks(results);
            genreMoodCache.set(cacheKey, results);
            setFetchedTracks(results);
          }
        } catch (err) {
          console.warn("[chordly] genre/mood search error:", err);
        } finally {
          if (!cancelled) setLoadingRemote(false);
        }
      } else if (kind === "artist") {
        const artistName = viewTitle || collectionId || "";
        const cacheKey = `artist:${(collectionId || artistName).toLowerCase()}`;
        if (artistAlbumCache.has(cacheKey)) {
          const cached = artistAlbumCache.get(cacheKey)!;
          if (cached.length > 0) {
            setFetchedTracks(cached);
            setLoadingRemote(false);
            return;
          }
        }

        const localMatches = getArtistTracks(collectionId || "")
          .concat(getArtistTracks(artistName))
          .filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i);

        if (localMatches.length > 0) {
          setFetchedTracks(localMatches);
        }

        if (localMatches.length < 8) {
          setLoadingRemote(true);
          try {
            const bridge = (window as any).chordly ?? (window as any).chordlyDesktop ?? (window as any).desktop;
            let results: Track[] = [];
            const query = `${artistName} top songs`;

            if (bridge?.searchYouTube) {
              try {
                const ytResults = await bridge.searchYouTube(query);
                if (Array.isArray(ytResults) && ytResults.length > 0) {
                  results = ytResults;
                }
              } catch (ytErr) {
                console.warn("[chordly] artist YTM search error:", ytErr);
              }
            }

            if ((!results || results.length === 0) && bridge?.searchAddons) {
              try {
                const addonResults = await bridge.searchAddons(query);
                if (Array.isArray(addonResults) && addonResults.length > 0) {
                  results = addonResults;
                }
              } catch (addonErr) {
                console.warn("[chordly] artist addon search error:", addonErr);
              }
            }

            if (!results || results.length === 0) {
              try {
                const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&entity=song&limit=30`);
                const data = await res.json();
                if (data?.results?.length) {
                  results = data.results.map((item: any) => ({
                    id: `itunes-${item.trackId}`,
                    videoId: `itunes-${item.trackId}`,
                    title: item.trackName,
                    artistId: `art-${encodeURIComponent(item.artistName.toLowerCase())}`,
                    artist: item.artistName,
                    albumId: `alb-${encodeURIComponent((item.collectionName || artistName).toLowerCase())}`,
                    album: item.collectionName || artistName,
                    duration: Math.round((item.trackTimeMillis || 180000) / 1000),
                    cover: item.artworkUrl100 ? item.artworkUrl100.replace("100x100bb", "600x600bb") : "",
                    year: item.releaseDate ? new Date(item.releaseDate).getFullYear() : 2024,
                    genre: item.primaryGenreName || "Music",
                    quality: "Lossless",
                    codec: "ALAC",
                    remote: true,
                    src: item.previewUrl,
                  }));
                }
              } catch (itunesErr) {
                console.warn("[chordly] artist iTunes search error:", itunesErr);
              }
            }

            if (!cancelled && Array.isArray(results) && results.length > 0) {
              const merged = [...localMatches];
              for (const r of results) {
                if (!merged.some((m) => m.id === r.id || m.title.toLowerCase() === r.title.toLowerCase())) {
                  merged.push(r);
                }
              }
              registerRemoteTracks(merged);
              artistAlbumCache.set(cacheKey, merged);
              setFetchedTracks(merged);
            }
          } catch (err) {
            console.warn("[chordly] artist load error:", err);
          } finally {
            if (!cancelled) setLoadingRemote(false);
          }
        } else {
          setLoadingRemote(false);
        }
      } else if (kind === "album") {
        const albumName = viewTitle || collectionId || "";
        const cacheKey = `album:${(collectionId || albumName).toLowerCase()}`;
        if (artistAlbumCache.has(cacheKey)) {
          const cached = artistAlbumCache.get(cacheKey)!;
          if (cached.length > 0) {
            setFetchedTracks(cached);
            setLoadingRemote(false);
            return;
          }
        }

        const localMatches = getAlbumTracks(collectionId || "")
          .concat(getAlbumTracks(albumName))
          .filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i);

        if (localMatches.length > 0) {
          setFetchedTracks(localMatches);
        }

        if (localMatches.length < 8) {
          setLoadingRemote(true);
          try {
            const bridge = (window as any).chordly ?? (window as any).chordlyDesktop ?? (window as any).desktop;
            let results: Track[] = [];
            const artistHint = viewArtist || localMatches[0]?.artist || "";
            const query = artistHint ? `${albumName} ${artistHint} full album` : `${albumName} album`;

            if (bridge?.searchYouTube) {
              try {
                const ytResults = await bridge.searchYouTube(query);
                if (Array.isArray(ytResults) && ytResults.length > 0) {
                  results = ytResults;
                }
              } catch (ytErr) {
                console.warn("[chordly] album YTM search error:", ytErr);
              }
            }

            if ((!results || results.length === 0) && bridge?.searchAddons) {
              try {
                const addonResults = await bridge.searchAddons(query);
                if (Array.isArray(addonResults) && addonResults.length > 0) {
                  results = addonResults;
                }
              } catch (addonErr) {
                console.warn("[chordly] album addon search error:", addonErr);
              }
            }

            if (!results || results.length === 0) {
              try {
                const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(`${albumName} ${artistHint}`.trim())}&entity=song&limit=30`);
                const data = await res.json();
                if (data?.results?.length) {
                  const albumMatches = data.results.filter(
                    (item: any) => item.collectionName && item.collectionName.toLowerCase().includes(albumName.toLowerCase())
                  );
                  const itemsToUse = albumMatches.length > 0 ? albumMatches : data.results;
                  results = itemsToUse.map((item: any) => ({
                    id: `itunes-${item.trackId}`,
                    videoId: `itunes-${item.trackId}`,
                    title: item.trackName,
                    artistId: `art-${encodeURIComponent(item.artistName.toLowerCase())}`,
                    artist: item.artistName,
                    albumId: `alb-${encodeURIComponent((item.collectionName || albumName).toLowerCase())}`,
                    album: item.collectionName || albumName,
                    duration: Math.round((item.trackTimeMillis || 180000) / 1000),
                    cover: item.artworkUrl100 ? item.artworkUrl100.replace("100x100bb", "600x600bb") : "",
                    year: item.releaseDate ? new Date(item.releaseDate).getFullYear() : 2024,
                    genre: item.primaryGenreName || "Music",
                    quality: "Lossless",
                    codec: "ALAC",
                    remote: true,
                    src: item.previewUrl,
                  }));
                }
              } catch (itunesErr) {
                console.warn("[chordly] album iTunes search error:", itunesErr);
              }
            }

            if (!cancelled && Array.isArray(results) && results.length > 0) {
              const merged = [...localMatches];
              for (const r of results) {
                if (!merged.some((m) => m.id === r.id || m.title.toLowerCase() === r.title.toLowerCase())) {
                  merged.push(r);
                }
              }
              registerRemoteTracks(merged);
              artistAlbumCache.set(cacheKey, merged);
              setFetchedTracks(merged);
            }
          } catch (err) {
            console.warn("[chordly] album load error:", err);
          } finally {
            if (!cancelled) setLoadingRemote(false);
          }
        } else {
          setLoadingRemote(false);
        }
      } else {
        setFetchedTracks([]);
        setLoadingRemote(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [kind, collectionId, playlists, liked, loadPlaylistTracks, viewTitle, viewArtist]);

  if (kind === "album") {
    album = view.id ? albumById[view.id] ?? null : null;
    const localAlbumTracks = getAlbumTracks(view.id || "")
      .concat(getAlbumTracks(viewTitle || ""))
      .filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i);
    const existingAlbumTracks = album ? getAlbumTracks(album.id) : [];
    collectionTracks =
      fetchedTracks.length > 0
        ? fetchedTracks
        : existingAlbumTracks.length > 0
        ? existingAlbumTracks
        : localAlbumTracks;

    if (album) {
      title = album.title;
      eyebrow = `${album.type} · ${album.year}`;
      description = album.description;
      coverImage = album.cover;
      meta = [album.artist, album.genre, `${collectionTracks.length} songs`, totalDuration(collectionTracks)];
      showAlbum = false;
    } else {
      const artName = viewArtist || collectionTracks[0]?.artist || "Artist";
      title = viewTitle || collectionTracks[0]?.album || "Album";
      eyebrow = `Album · ${collectionTracks[0]?.year || 2024}`;
      description = `Album release by ${artName}.`;
      coverImage = viewCover || collectionTracks[0]?.cover || "";
      meta = [artName, collectionTracks[0]?.genre || "Music", `${collectionTracks.length} songs`, totalDuration(collectionTracks)];
      showAlbum = false;
      album = {
        id: collectionId || `alb-${title.toLowerCase().replace(/\s+/g, "-")}`,
        title,
        artist: artName,
        artistId: collectionTracks[0]?.artistId || `art-${artName.toLowerCase().replace(/\s+/g, "-")}`,
        cover: coverImage,
        year: collectionTracks[0]?.year || 2024,
        type: "Album",
        genre: collectionTracks[0]?.genre || "Music",
        description,
      };
    }
  } else if (kind === "playlist") {
    playlist = playlists.find((item) => item.id === view.id || item.browseId === view.id) ?? null;
    if (playlist) {
      title = playlist.name;
      eyebrow = "Playlist";
      description = playlist.description;
      coverImage = playlist.cover;
      const cached = getPlaylistTracks(playlist);
      collectionTracks = fetchedTracks.length > 0 ? fetchedTracks : cached;
      meta = [
        `Made by ${activeAccount.name}`,
        `${collectionTracks.length || playlist.trackCount || 0} songs`,
        totalDuration(collectionTracks),
        playlist.synced ? "Synced to YouTube Music" : "Local playlist",
      ];
    }
  } else if (kind === "artist") {
    let artist = view.id ? artistById[view.id] ?? null : null;
    const localArtistTracks = getArtistTracks(view.id || "")
      .concat(getArtistTracks(viewTitle || ""))
      .filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i);
    const existingArtistTracks = artist ? getArtistTracks(artist.id) : [];
    collectionTracks =
      fetchedTracks.length > 0
        ? fetchedTracks
        : existingArtistTracks.length > 0
        ? existingArtistTracks
        : localArtistTracks;

    if (artist) {
      title = artist.name;
      eyebrow = "Artist";
      description = artist.bio;
      coverImage = artist.cover;
      roundCover = true;
      meta = [
        artist.monthly ? `${artist.monthly} monthly listeners` : "Popular artist",
        artist.genre,
        `${getArtistAlbums(artist.id).length} releases`,
        `${collectionTracks.length} songs`,
      ];
    } else {
      title = viewTitle || collectionTracks[0]?.artist || "Artist";
      eyebrow = "Artist";
      description = `Popular tracks and releases from ${title}.`;
      coverImage = viewCover || collectionTracks[0]?.cover || "";
      roundCover = true;
      meta = [
        "Popular artist",
        collectionTracks[0]?.genre || "Artist",
        `${collectionTracks.length} songs`,
      ];
      artist = {
        id: collectionId || `art-${title.toLowerCase().replace(/\s+/g, "-")}`,
        name: title,
        cover: coverImage,
        genre: collectionTracks[0]?.genre || "Artist",
        bio: description,
        monthly: "Popular",
      };
    }
  } else if (kind === "mood") {
    const mood = moods.find((item) => item.id === collectionId || item.name === viewTitle) ?? moods[0];
    title = mood.name;
    eyebrow = "Mood";
    description = `A playlist for ${mood.name.toLowerCase()} — ${mood.blurb.toLowerCase()}`;
    coverImage = mood.cover;
    const localMoodTracks = getMoodTracks(mood.name);
    const starterMoodTracks = GENRE_MOOD_STARTERS[mood.id.toLowerCase()] || [];
    if (starterMoodTracks.length) registerRemoteTracks(starterMoodTracks);
    collectionTracks =
      fetchedTracks.length > 0
        ? fetchedTracks
        : localMoodTracks.length > 0
        ? localMoodTracks
        : starterMoodTracks;
    meta = [`${collectionTracks.length} tracks`, "Curated by Chordly", "Updated weekly"];
  } else if (kind === "genre") {
    const genre = genres.find((item) => item.id === collectionId || item.name === viewTitle) ?? genres[0];
    title = genre.name;
    eyebrow = "Genre";
    description = genre.description;
    coverImage = genre.cover;
    const localGenreTracks = getGenreTracks(genre.name);
    const starterGenreTracks = GENRE_MOOD_STARTERS[genre.id.toLowerCase()] || [];
    if (starterGenreTracks.length) registerRemoteTracks(starterGenreTracks);
    collectionTracks =
      fetchedTracks.length > 0
        ? fetchedTracks
        : localGenreTracks.length > 0
        ? localGenreTracks
        : starterGenreTracks;
    meta = [`${collectionTracks.length} tracks`, "Lossless where available", "Curated by Chordly"];
  } else if (kind === "liked") {
    title = "Liked Music";
    eyebrow = "Collection";
    description = "Every song you've loved, in one place. Synced both ways with your YouTube Music account.";
    const localLiked = liked.map((id) => trackById[id]).filter(Boolean);
    collectionTracks = fetchedTracks.length > 0 ? fetchedTracks : localLiked;
    coverImage = collectionTracks[0]?.cover || "";
    heroOverlay = "heart";
    meta = [`${collectionTracks.length} songs`, totalDuration(collectionTracks), "Synced with YouTube Music"];
  } else if (kind === "downloads") {
    title = "Downloads";
    eyebrow = "Offline";
    description = "Lossless files kept on this device. Available with no connection, no buffering, no compromises.";
    collectionTracks = downloads.map((id) => trackById[id]).filter(Boolean);
    coverImage = collectionTracks[0]?.cover ?? albums[0]?.cover ?? "";
    heroOverlay = "download";
    meta = [`${collectionTracks.length} songs`, totalDuration(collectionTracks), "24-bit / 192kHz"];
  } else if (kind === "videos") {
    title = "Music Videos";
    eyebrow = "Collection";
    description = "Monochrome visuals from the artists you love, in 4K where available.";
    coverImage = albums[3]?.cover ?? albums[0]?.cover ?? "";
    collectionTracks = tracks.filter((track) => track.video);
    meta = [`${collectionTracks.length} videos`, "4K", "Synced playback"];
  } else if (kind === "podcasts") {
    title = "Podcasts";
    eyebrow = "Collection";
    description = "Long-form conversations about the music, the people and the process.";
    coverImage = podcasts[0]?.cover ?? albums[0]?.cover ?? "";
    meta = [`${podcasts.length} shows`, `${podcasts.reduce((sum, item) => sum + item.episodes, 0)} episodes`];
  } else if (kind === "subscriptions") {
    title = "Subscriptions";
    eyebrow = "Library";
    description = "Channels and artists you follow on YouTube Music. New uploads appear here automatically.";
    coverImage = artistById[subscriptions[0]]?.cover ?? albums[0]?.cover ?? "";
    meta = [`${subscriptions.length} subscriptions`, "Synced with YouTube Music"];
  }

  const queueLabel = title;
  const canPlay = collectionTracks.length > 0;
  const playlistUrl = `${window.location.origin}/?collection=${kind}${view.id ? `&id=${view.id}` : ""}`;

  const share = () => {
    void navigator.clipboard?.writeText(playlistUrl);
    pushToast("Link copied", title);
  };

  const duplicate = () => {
    if (!playlist) return;
    const id = createPlaylist(`${playlist.name} (copy)`, playlist.description, playlist.cover, playlist.trackIds);
    navigate({ name: "collection", kind: "playlist", id, title: `${playlist.name} (copy)` });
  };

  const isArtist = kind === "artist";
  let artistAlbums = isArtist && view.id ? getArtistAlbums(view.id) : [];
  if (isArtist && artistAlbums.length === 0 && collectionTracks.length > 0) {
    const albumMap = new Map<string, Album>();
    for (const t of collectionTracks) {
      const albName = (t.album || "").trim();
      if (albName && !albumMap.has(albName.toLowerCase())) {
        albumMap.set(albName.toLowerCase(), {
          id: t.albumId || `alb-${albName.toLowerCase().replace(/\s+/g, "-")}`,
          title: albName,
          artistId: t.artistId || view.id || `art-${(t.artist || title).toLowerCase().replace(/\s+/g, "-")}`,
          artist: t.artist || title,
          cover: t.cover,
          year: t.year || 2024,
          type: "Album",
          genre: t.genre || "Music",
          description: `Album by ${t.artist || title}.`,
        });
      }
    }
    artistAlbums = Array.from(albumMap.values());
  }
  const fansAlsoLike = isArtist
    ? artists
        .filter((artist) => artist.id !== view.id && artist.name.toLowerCase() !== title.toLowerCase())
        .slice(0, 5)
    : [];

  return (
    <div className="page-inner">
      {kind === "local" ? (
        <div>
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">Library</p>
              <h1 className="page-title mt-2">Local Music</h1>
              <p className="mt-2.5 max-w-[560px] text-[12px] leading-relaxed text-[var(--muted)]">
                Your own FLAC, ALAC, MP3 and WAV files, indexed from this PC. Chordly reads embedded tags and
                artwork, then plays everything through the same player as the rest of your library.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button type="button" className="btn btn-sm" onClick={() => void chooseLocalFolder()} disabled={localScanning}>
                <FolderOpen size={13} /> {localTracks.length ? "Change folder" : "Add folder"}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => void scanLocalFolder()}
                disabled={localScanning}
              >
                <RefreshCw size={13} className={cn(localScanning && "animate-spin")} />
                {localScanning ? "Scanning…" : "Rescan"}
              </button>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-[var(--line)] bg-[var(--hover)] px-4 py-3">
            <span className="flex min-w-0 items-center gap-2 font-mono text-[9.5px] text-[var(--muted)]">
              <FolderOpen size={11} className="shrink-0 text-[var(--faint)]" />
              <span className="truncate">{localLibrary.folder ?? settings.scanFolder ?? "No folder selected"}</span>
            </span>
            <span className="flex items-center gap-2 text-[9.5px] text-[var(--faint)]">
              <span>{localTracks.length.toLocaleString()} tracks</span>
              {localLibrary.totalBytes > 0 && <span>· {formatBytes(localLibrary.totalBytes)}</span>}
              {localLibrary.skipped > 0 && <span>· {localLibrary.skipped.toLocaleString()} skipped</span>}
            </span>
            {localScanning && (
              <span className="ml-auto flex items-center gap-2 text-[9.5px] text-[var(--muted)]">
                <Loader2 size={11} className="animate-spin" />
                {localProgress?.phase === "reading" && localProgress.total
                  ? `${(localProgress.processed ?? 0).toLocaleString()} / ${localProgress.total.toLocaleString()} files`
                  : `${(localProgress?.inspected ?? 0).toLocaleString()} files found`}
              </span>
            )}
          </div>

          {localTracks.length ? (
            <section className="rounded-2xl border border-[var(--line)] bg-[var(--hover)] p-2.5">
              <div className="mb-2 flex flex-wrap items-center gap-2 px-2 pt-1.5">
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => {
                    const isLocalActive = Boolean(currentTrack && localTracks.some((t) => t.id === currentTrack.id));
                    if (isLocalActive) {
                      togglePlay();
                    } else {
                      playQueue(localTracks, 0, "Local Music");
                    }
                  }}
                >
                  {Boolean(currentTrack && localTracks.some((t) => t.id === currentTrack.id)) && isPlaying ? (
                    <Pause size={12} fill="currentColor" />
                  ) : (
                    <Play size={12} fill="currentColor" />
                  )}
                  {Boolean(currentTrack && localTracks.some((t) => t.id === currentTrack.id)) && isPlaying ? "Pause" : "Play all"}
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => {
                    const shuffled = [...localTracks].sort(() => Math.random() - 0.5);
                    playQueue(shuffled, 0, "Local Music · Shuffle");
                  }}
                >
                  <Shuffle size={12} /> Shuffle
                </button>
                <span className="ml-auto pr-1 text-[9.5px] text-[var(--faint)]">
                  {totalDuration(localTracks)} · stays on this PC
                </span>
              </div>
              <div className="track-table-head mb-1">
                <span />
                <span />
                <span>Title</span>
                <span>Album</span>
                <span className="text-right">
                  <span className="sr-only">Duration</span>
                </span>
                <span />
              </div>
              {localTracks.map((track, index) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  index={index}
                  queue={localTracks}
                  queueLabel="Local Music"
                />
              ))}
            </section>
          ) : (
            <>
              <div className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--hover)]">
                {albums[8]?.cover && (
                  <img
                    src={albums[8].cover}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-[0.12]"
                  />
                )}
                <div className="relative flex flex-col items-center justify-center px-6 py-16 text-center">
                  <span className="grid h-16 w-16 place-items-center rounded-full border border-[var(--line-strong)]">
                    {localScanning ? <Loader2 size={24} className="animate-spin" /> : <FolderOpen size={24} />}
                  </span>
                  <h2 className="mt-5 text-[20px] font-semibold tracking-[-0.03em]">
                    {localScanning ? "Indexing your music…" : "No local files indexed yet"}
                  </h2>
                  <p className="mt-2 max-w-[420px] text-[11px] leading-relaxed text-[var(--faint)]">
                    {localScanning
                      ? "Chordly is walking the folder and reading embedded tags. Large libraries can take a minute the first time."
                      : "Choose a folder to scan. Embedded tags and cover art are read locally, and Windows folder paths are kept on this device."}
                  </p>
                  <p className="mt-4 flex max-w-full items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--canvas)]/20 px-3 py-2 font-mono text-[9.5px] text-[var(--muted)]">
                    <FolderOpen size={11} className="shrink-0" />
                    <span className="truncate">{localLibrary.folder ?? settings.scanFolder ?? "No folder selected"}</span>
                  </p>
                  {localScanning && localProgress?.phase === "reading" && localProgress.total ? (
                    <div className="mt-5 w-full max-w-[320px]">
                      <div className="h-1 overflow-hidden rounded-full bg-[var(--line)]">
                        <div
                          className="h-full rounded-full bg-[var(--ink)] transition-[width] duration-300"
                          style={{
                            width: `${Math.round(
                              ((localProgress.processed ?? 0) / Math.max(1, localProgress.total)) * 100,
                            )}%`,
                          }}
                        />
                      </div>
                      <p className="mt-2 text-[9px] tabular-nums text-[var(--faint)]">
                        {(localProgress.processed ?? 0).toLocaleString()} of{" "}
                        {localProgress.total.toLocaleString()} files · {(localProgress.found ?? 0).toLocaleString()} tracks
                      </p>
                    </div>
                  ) : (
                    <div className="mt-5 flex gap-2">
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={localScanning}
                        onClick={() => void chooseLocalFolder()}
                      >
                        <FolderOpen size={13} /> Choose music folder
                      </button>
                      <button type="button" className="btn btn-sm" onClick={() => navigate({ name: "settings" })}>
                        Folder settings
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  ["Embedded tags", "Artist, album, track number and artwork are read from each file."],
                  ["Non-music filter", "Voice notes, audiobooks and clips under 20 seconds are skipped."],
                  ["Local playback", "Seeking, queueing, likes and playlists all work with local files."],
                ].map(([heading, body]) => (
                  <div key={heading} className="rounded-xl border border-[var(--line)] p-4">
                    <p className="text-[10.5px] font-semibold">{heading}</p>
                    <p className="mt-1 text-[9.5px] leading-relaxed text-[var(--faint)]">{body}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          <section className="relative mb-7 overflow-hidden rounded-[22px] border border-[var(--line)] bg-[var(--hover)] p-6 animate-fade-up">
            {coverImage && (
              <>
                <img
                  src={coverImage}
                  alt=""
                  className="absolute right-0 top-0 h-full w-[58%] object-cover opacity-30"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--canvas)] via-[var(--canvas)]/85 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--canvas)]/70 to-transparent" />
              </>
            )}
            <div className="relative flex flex-col gap-6 md:flex-row md:items-end">
              <div className="relative shrink-0">
                {kind === "liked" ? (
                  <div className="relative aspect-square w-[168px] overflow-hidden rounded-2xl border border-[var(--line-strong)] shadow-[0_22px_50px_rgba(0,0,0,0.35)]">
                    <div className="grid h-full w-full grid-cols-2 gap-[2px] bg-[var(--surface)]">
                      {collectionTracks.slice(0, 4).map((track) => (
                        <img key={track.id} src={track.cover} alt="" className="h-full w-full object-cover" />
                      ))}
                      {!collectionTracks.length && <div className="col-span-2 row-span-2 bg-[var(--active)]" />}
                    </div>
                    <span className="absolute inset-0 grid place-items-center bg-black/45">
                      <Heart size={42} className="fill-white text-white drop-shadow-lg" />
                    </span>
                  </div>
                ) : kind === "downloads" ? (
                  <div className="relative aspect-square w-[168px] overflow-hidden rounded-2xl border border-[var(--line-strong)] bg-gradient-to-br from-white/10 via-[var(--hover)] to-black/50 shadow-[0_22px_50px_rgba(0,0,0,0.35)] grid place-items-center">
                    <Download size={44} className="text-white drop-shadow-lg" />
                  </div>
                ) : (
                  <Artwork
                    src={coverImage}
                    alt={title}
                    className={cn(
                      "aspect-square w-[168px] border border-[var(--line-strong)] shadow-[0_22px_50px_rgba(0,0,0,0.35)]",
                      roundCover ? "rounded-full" : "rounded-2xl",
                    )}
                    rounded={roundCover ? "rounded-full" : "rounded-2xl"}
                    priority
                  />
                )}
              </div>

              <div className="min-w-0 flex-1 pb-1">
                <p className="eyebrow flex items-center gap-1.5">
                  {eyebrow}
                  {isArtist && <BadgeCheck size={12} />}
                </p>
                <h1 className="mt-2 text-balance text-[clamp(30px,4.4vw,48px)] font-semibold leading-[0.98] tracking-[-0.055em]">
                  {title}
                </h1>
                <p className="mt-2.5 max-w-[580px] text-[11.5px] leading-relaxed text-[var(--muted)]">{description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-[var(--faint)]">
                  {meta.map((item, index) => (
                    <span key={`${item}-${index}`} className="flex items-center gap-2">
                      {index > 0 && <span className="h-2.5 w-px bg-[var(--line-strong)]" />}
                      {item}
                    </span>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!canPlay}
                    onClick={() => {
                      if (!canPlay) return;
                      const isCollectionActive = Boolean(currentTrack && collectionTracks.some((t) => t.id === currentTrack.id));
                      if (isCollectionActive) {
                        togglePlay();
                      } else {
                        playQueue(collectionTracks, 0, queueLabel);
                      }
                    }}
                  >
                    {Boolean(currentTrack && collectionTracks.some((t) => t.id === currentTrack.id)) && isPlaying ? (
                      <Pause size={13} fill="currentColor" />
                    ) : (
                      <Play size={13} fill="currentColor" />
                    )}
                    {Boolean(currentTrack && collectionTracks.some((t) => t.id === currentTrack.id)) && isPlaying ? "Pause" : "Play"}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    disabled={!canPlay}
                    onClick={() => {
                      if (!canPlay) return;
                      const shuffled = [...collectionTracks].sort(() => Math.random() - 0.5);
                      playQueue(shuffled, 0, `${queueLabel} · Shuffle`);
                    }}
                  >
                    <Shuffle size={13} /> Shuffle
                  </button>
                  {kind === "playlist" && playlist?.synced && (
                    <span className="badge-yt">
                      <Check size={9} /> Synced to YouTube Music
                    </span>
                  )}
                  <div className="relative ml-auto" ref={menuRef}>
                    <button
                      type="button"
                      aria-label="Collection options"
                      onClick={() => setMenuOpen((value) => !value)}
                      className="grid h-9 w-9 place-items-center rounded-full border border-[var(--line)] text-[var(--muted)] transition hover:bg-[var(--hover)] hover:text-[var(--ink)]"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    {menuOpen && (
                      <div className="menu absolute right-0 top-[calc(100%+8px)]">
                        <button className="menu-item" onClick={() => { setMenuOpen(false); share(); }}>
                          <Share2 size={14} /> Share collection
                        </button>
                        {kind === "playlist" && (
                          <>
                            <button className="menu-item" onClick={() => { setMenuOpen(false); duplicate(); }}>
                              <CopyPlus size={14} /> Duplicate playlist
                            </button>
                            <button
                              className="menu-item"
                              onClick={() => {
                                setMenuOpen(false);
                                if (!playlist) return;
                                deletePlaylist(playlist.id);
                                navigate({ name: "library" });
                              }}
                            >
                              <Trash2 size={14} /> Delete playlist
                            </button>
                          </>
                        )}
                        {kind === "album" && album && (
                          <button
                            className="menu-item"
                            onClick={() => {
                              setMenuOpen(false);
                              navigate({ name: "collection", kind: "artist", id: album!.artistId, title: album!.artist });
                            }}
                          >
                            <UserRound size={14} /> Go to artist
                          </button>
                        )}
                        <button
                          className="menu-item"
                          onClick={() => {
                            setMenuOpen(false);
                            if (!collectionTracks.length) return;
                            playQueue(collectionTracks, 0, queueLabel);
                            pushToast("Playing now", `${collectionTracks.length} tracks queued`);
                          }}
                        >
                          <ListPlus size={14} /> Add whole collection to queue
                        </button>
                        <button
                          className="menu-item"
                          onClick={() => {
                            setMenuOpen(false);
                            pushToast("Download queued", `${collectionTracks.length} tracks · lossless`);
                          }}
                        >
                          <Download size={14} /> Download all
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {kind === "podcasts" ? (
            <section>
              <SectionHeading title="All shows" subtitle="New episodes every week." />
              <div className="grid gap-3 sm:grid-cols-2">
                {podcasts.map((podcast) => (
                  <div
                    key={podcast.id}
                    className="group flex gap-4 rounded-2xl border border-[var(--line)] bg-[var(--hover)] p-3.5 transition hover:border-[var(--line-strong)]"
                  >
                    <Artwork src={podcast.cover} alt="" className="h-[92px] w-[92px] rounded-xl" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold">{podcast.title}</p>
                          <p className="mt-0.5 text-[10px] text-[var(--muted)]">{podcast.host}</p>
                        </div>
                        <span className="badge-yt">{podcast.category}</span>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-[10px] leading-relaxed text-[var(--faint)]">{podcast.description}</p>
                      <div className="mt-auto flex items-center justify-between pt-2">
                        <span className="flex items-center gap-1.5 text-[9px] text-[var(--faint)]">
                          <Radio size={10} /> {podcast.episodes} episodes
                        </span>
                        <button
                          type="button"
                          className="flex h-7 items-center gap-1.5 rounded-full border border-[var(--line)] px-2.5 text-[9.5px] font-medium transition hover:bg-[var(--active)]"
                          onClick={() => pushToast("Episode queued", `${podcast.title} · latest episode`)}
                        >
                          <Play size={10} fill="currentColor" /> Latest
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : kind === "subscriptions" ? (
            <section>
              <SectionHeading title="Channels you follow" subtitle="Synced from YouTube Music." />
              <div className="grid grid-cols-3 gap-5 sm:grid-cols-6">
                {subscriptions.map((id) => {
                  const artist = artistById[id];
                  return artist ? <ArtistCard key={id} artist={artist} /> : null;
                })}
              </div>
              <div className="mt-8">
                <SectionHeading title="Latest from your subscriptions" />
                <div className="space-y-0.5">
                  {tracks.slice(0, 8).map((track, index) => (
                    <TrackRow key={track.id} track={track} index={index} queue={tracks.slice(0, 8)} queueLabel="Subscriptions" />
                  ))}
                </div>
              </div>
            </section>
          ) : kind === "videos" ? (
            <section>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                {collectionTracks.map((track) => (
                  <VideoCard key={track.id} track={track} queue={collectionTracks} label="Music videos" />
                ))}
              </div>
            </section>
          ) : (
            <>
              {loadingRemote ? (
                <div className="flex flex-col items-center justify-center py-20 text-[var(--muted)]">
                  <Loader2 size={24} className="animate-spin mb-3 text-[var(--ink)]" />
                  <p className="text-[12px] font-medium">Loading {title} collection…</p>
                  <p className="mt-1 text-[10px] text-[var(--faint)]">Syncing tracks across streaming & lossless sources</p>
                </div>
              ) : collectionTracks.length ? (
                <section className="rounded-2xl border border-[var(--line)] bg-[var(--hover)] p-2.5">
                  <div className="track-table-head mb-1">
                    <span />
                    <span />
                    <span>{isArtist ? "Popular tracks" : "Title"}</span>
                    {showAlbum && <span>Album</span>}
                    <span className="text-right">
                      <span className="sr-only">Duration</span>
                    </span>
                    <span />
                  </div>
                  {collectionTracks.slice(0, isArtist ? 25 : 100).map((track, index) => (
                    <TrackRow
                      key={`${track.id}-${index}`}
                      track={track}
                      index={index}
                      queue={collectionTracks}
                      queueLabel={queueLabel}
                      showAlbum={showAlbum}
                    />
                  ))}
                </section>
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--line-strong)] px-6 py-16 text-center">
                  <Music2 size={24} className="mx-auto text-[var(--faint)]" />
                  <p className="mt-3 text-[13px] font-medium">Nothing here yet</p>
                  <p className="mt-1 text-[10.5px] text-[var(--faint)]">
                    {kind === "liked" ? "Like a track to add it to this collection." : "Add a track to get started."}
                  </p>
                  <button type="button" className="btn btn-sm mt-4" onClick={() => navigate({ name: "explore" })}>
                    Explore music
                  </button>
                </div>
              )}

              {isArtist && artistAlbums.length > 0 && (
                <section className="mt-9">
                  <SectionHeading title="Albums & singles" />
                  <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4 lg:grid-cols-5">
                    {artistAlbums.map((item) => (
                      <AlbumCard key={item.id} album={item} />
                    ))}
                  </div>
                </section>
              )}

              {isArtist && (
                <section className="mt-9 flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--hover)] px-5 py-4">
                  <div>
                    <p className="eyebrow">About the artist</p>
                    <p className="mt-1.5 max-w-[620px] text-[11px] leading-relaxed text-[var(--muted)]">
                      {description || "No biography available."}
                    </p>
                  </div>
                  <span className="flex items-center gap-1.5 text-[9px] text-[var(--faint)]">
                    <Users size={11} /> {meta[0]} · {meta[1]}
                  </span>
                </section>
              )}

              {isArtist && (
                <section className="mt-9">
                  <SectionHeading title="Fans also like" />
                  <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
                    {fansAlsoLike.map((artist) => (
                      <ArtistCard key={artist.id} artist={artist} />
                    ))}
                  </div>
                </section>
              )}

              {kind === "playlist" && (
                <section className="mt-9">
                  <SectionHeading title="You might also like" action="Explore" onAction={() => navigate({ name: "explore" })} />
                  <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4 lg:grid-cols-5">
                    {["afterglow", "monsoon", "blue-hour", "fever-dream", "neon-rain"]
                      .map((id) => albumById[id])
                      .filter(Boolean)
                      .map((item) => (
                        <AlbumCard key={item.id} album={item} />
                      ))}
                  </div>
                </section>
              )}

              {kind === "album" && album && (
                <section className="mt-9 flex flex-wrap items-center gap-4 rounded-2xl border border-[var(--line)] bg-[var(--hover)] p-5">
                  <Artwork src={artistById[album.artistId]?.cover ?? album.cover} alt="" className="h-14 w-14 rounded-full" rounded="rounded-full" />
                  <div className="min-w-0 flex-1">
                    <p className="eyebrow">About the artist</p>
                    <p className="mt-1 text-[12px] font-semibold">{album.artist}</p>
                    <p className="mt-0.5 line-clamp-1 text-[10px] text-[var(--faint)]">
                      {artistById[album.artistId]?.bio}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() =>
                      navigate({ name: "collection", kind: "artist", id: album!.artistId, title: album!.artist })
                    }
                  >
                    View artist <ArrowUpRight size={12} />
                  </button>
                </section>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
