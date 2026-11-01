import { useEffect, useMemo, useRef, useState } from "react";
import {
  AudioLines,
  Bug,
  Disc3,
  Heart,
  Library,
  Loader2,
  Music2,
  Pause,
  Play,
  Search as SearchIcon,
  UserRound,
  X,
  Youtube,
} from "lucide-react";
import { useApp } from "../store";
import {
  albumById,
  artistById,
  genres,
  registerRemoteTracks,
  searchCatalog,
  trackById,
  tracks,
} from "../data";
import { getAlbumTracks, getArtistTracks, getGenreTracks } from "../data";
import { getDesktopBridge } from "../desktop";
import type { Track } from "../types";
import { cn } from "../lib/utils";
import { Artwork } from "../components/Artwork";
import { AlbumCard, ArtistCard } from "../components/Cards";
import { SectionHeading } from "../components/Primitives";
import { TrackRow } from "../components/TrackRow";
import { TrackMenu } from "../components/TrackMenu";

type Scope = "youtube" | "library" | "addons";

const scopeTabs: { id: Scope; label: string; icon: typeof Youtube }[] = [
  { id: "youtube", label: "YouTube", icon: Youtube },
  { id: "library", label: "Library", icon: Library },
  { id: "addons", label: "Addons", icon: AudioLines },
];

export function Search() {
  const {
    searchQuery,
    setSearchQuery,
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
    navigate,
    playQueue,
    playTrack,
    currentTrack,
    isPlaying,
    togglePlay,
    liked,
    downloads,
    playlists,
    sources,
    openModal,
    localTracks,
    pushToast,
  } = useApp();
  const [scope, setScope] = useState<Scope>("youtube");
  const [youtubeTracks, setYoutubeTracks] = useState<Track[]>([]);
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  const [youtubeAvailable, setYoutubeAvailable] = useState(true);
  const [addonTracks, setAddonTracks] = useState<Track[]>([]);
  const [addonLoading, setAddonLoading] = useState(false);
  const [addonError, setAddonError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const bridge = getDesktopBridge();

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setYoutubeTracks([]);
      setYoutubeLoading(false);
      setYoutubeError(null);
      return;
    }
    if (scope !== "youtube") {
      setYoutubeLoading(false);
      return;
    }
    if (!bridge?.youtube) {
      setYoutubeAvailable(false);
      setYoutubeLoading(false);
      return;
    }

    let cancelled = false;
    setYoutubeAvailable(true);
    setYoutubeLoading(true);
    setYoutubeError(null);
    const timer = window.setTimeout(() => {
      bridge.youtube
        .search(q)
        .then((results) => {
          if (cancelled) return;
          registerRemoteTracks(results);
          setYoutubeTracks(results);
        })
        .catch((error) => {
          if (cancelled) return;
          setYoutubeTracks([]);
          setYoutubeError(error instanceof Error ? error.message : String(error));
        })
        .finally(() => {
          if (!cancelled) setYoutubeLoading(false);
        });
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [bridge, retryTick, scope, searchQuery]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setAddonTracks([]);
      setAddonLoading(false);
      setAddonError(null);
      return;
    }
    if (scope !== "addons") {
      setAddonLoading(false);
      return;
    }

    let cancelled = false;
    setAddonLoading(true);
    setAddonError(null);
    const timer = window.setTimeout(async () => {
      try {
        const desktop = (window as unknown as {
          chordlyDesktop?: {
            addons?: {
              search?: (query: string) => Promise<Track[]>;
            };
          };
        }).chordlyDesktop;
        const searchFn = desktop?.addons?.search;
        if (!searchFn) {
          throw new Error("Lossless addon engine not available in browser mode. Open in Chordly desktop app.");
        }
        const results = await searchFn(q);
        if (cancelled) return;
        registerRemoteTracks(results);
        setAddonTracks(results);
      } catch (error: unknown) {
        if (cancelled) return;
        setAddonTracks([]);
        setAddonError(error instanceof Error ? error.message : String(error));
      } finally {
        if (!cancelled) setAddonLoading(false);
      }
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [retryTick, scope, searchQuery]);

  const youtubeMode = scope === "youtube" && Boolean(bridge?.youtube);

  const all = useMemo(() => {
    const catalog = searchCatalog(searchQuery);
    if (youtubeMode) return { tracks: youtubeTracks, albums: [], artists: [] };
    const q = searchQuery.trim().toLowerCase();
    if (!q || !localTracks.length) return catalog;
    const localMatches = localTracks.filter(
      (track) =>
        track.title.toLowerCase().includes(q) ||
        track.artist.toLowerCase().includes(q) ||
        track.album.toLowerCase().includes(q),
    );
    if (!localMatches.length) return catalog;
    return { ...catalog, tracks: [...localMatches, ...catalog.tracks] };
  }, [searchQuery, localTracks, youtubeMode, youtubeTracks]);

  const libraryTrackIds = useMemo(() => {
    const set = new Set<string>([...liked, ...downloads, ...localTracks.map((track) => track.id)]);
    playlists.forEach((playlist) => playlist.trackIds.forEach((id) => set.add(id)));
    return set;
  }, [liked, downloads, playlists, localTracks]);

  const filteredTracks = useMemo(() => {
    if (scope === "library") return all.tracks.filter((track) => libraryTrackIds.has(track.id));
    return all.tracks.filter((track) => !track.local);
  }, [all.tracks, scope, libraryTrackIds]);

  const filteredAlbums = useMemo(() => {
    if (scope === "library") {
      const albumIds = new Set<string>();
      libraryTrackIds.forEach((id) => {
        const track = trackById[id];
        if (track) albumIds.add(track.albumId);
      });
      return all.albums.filter((album) => albumIds.has(album.id));
    }
    return all.albums;
  }, [all.albums, scope, libraryTrackIds]);

  const filteredArtists = useMemo(() => {
    if (scope === "library") {
      const artistIds = new Set<string>();
      libraryTrackIds.forEach((id) => {
        const track = trackById[id];
        if (track) artistIds.add(track.artistId);
      });
      return all.artists.filter((artist) => artistIds.has(artist.id));
    }
    return all.artists;
  }, [all.artists, scope, libraryTrackIds]);

  const query = searchQuery.trim();

  const topTrack = filteredTracks[0];
  const topArtist = filteredArtists[0];
  const topAlbum = filteredAlbums[0];
  const topKind = topArtist && topArtist.name.toLowerCase() === query.toLowerCase() ? "artist" : topAlbum && topAlbum.title.toLowerCase() === query.toLowerCase() ? "album" : "track";

  const commit = (value: string) => {
    setSearchQuery(value);
    addRecentSearch(value);
    if (scope === "library") setScope("youtube");
  };

  const activeSources = sources.filter((source) => source.enabled);

  return (
    <div className="page-inner">
      <div className="mx-auto max-w-[1040px]">
        <div className="mb-7 animate-fade-up">
          <p className="eyebrow">Search</p>
          <h1 className="page-title mt-2">Find your next obsession.</h1>
          <p className="mt-2.5 text-[12px] text-[var(--muted)]">
            Search 100 million tracks, your own library and every connected lossless addon.
          </p>
        </div>

        <div className="relative animate-fade-up" style={{ animationDelay: "50ms" }}>
          <SearchIcon size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--faint)]" />
          <input
            ref={inputRef}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && query) {
                addRecentSearch(query);
                if (scope === "library") setScope("youtube");
              }
            }}
            placeholder="What do you want to listen to?"
            className="h-[54px] w-full rounded-2xl border border-[var(--line-strong)] bg-[var(--hover)] pl-12 pr-24 text-[14px] font-medium tracking-[-0.01em] text-[var(--ink)] outline-none transition focus:border-[var(--ink)] focus:bg-[var(--active)]"
          />
          <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearchQuery("");
                  inputRef.current?.focus();
                }}
                className="grid h-7 w-7 place-items-center rounded-full text-[var(--faint)] transition hover:bg-[var(--hover)] hover:text-[var(--ink)]"
              >
                <X size={14} />
              </button>
            )}
            <kbd className="rounded-md border border-[var(--line)] px-1.5 py-1 text-[8.5px] text-[var(--faint)]">
              ESC
            </kbd>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1 border-b border-[var(--line)] pb-0">
          {scopeTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setScope(tab.id)}
                className={cn(
                  "relative flex h-9 items-center gap-1.5 px-3 text-[11px] font-medium transition",
                  scope === tab.id ? "text-[var(--ink)]" : "text-[var(--faint)] hover:text-[var(--muted)]",
                )}
              >
                <Icon size={13} />
                {tab.label}
                {scope === tab.id && <span className="absolute inset-x-2 -bottom-px h-[1.5px] bg-[var(--ink)]" />}
              </button>
            );
          })}
          <div className="ml-auto pb-2 text-[9px] text-[var(--faint)]">
            {scope === "addons"
              ? `${activeSources.length} sources active`
              : scope === "library"
                ? "Your saved catalogue"
                : bridge?.youtube
                  ? "YouTube Music · live InnerTube"
                  : "Desktop app required for YouTube"}
          </div>
        </div>

        {!query ? (
          <div className="mt-7 animate-fade-up">
            <div className="mb-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="section-title !text-[16px]">Recent searches</h2>
                {recentSearches.length > 0 && (
                  <button
                    type="button"
                    onClick={clearRecentSearches}
                    className="text-[10px] font-medium text-[var(--faint)] transition hover:text-[var(--ink)]"
                  >
                    Clear all
                  </button>
                )}
              </div>
              {recentSearches.length ? (
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((item) => (
                    <span
                      key={item}
                      className="group flex h-8 items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--hover)] pl-3 pr-1 text-[10.5px] text-[var(--muted)] transition hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
                    >
                      <button type="button" onClick={() => commit(item)} className="flex items-center gap-1.5">
                        <SearchIcon size={10} className="text-[var(--faint)]" />
                        {item}
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${item} from recent searches`}
                        onClick={() => removeRecentSearch(item)}
                        className="grid h-5 w-5 place-items-center rounded-full text-[var(--faint)] hover:bg-[var(--active)] hover:text-[var(--ink)]"
                      >
                        <X size={9} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-[var(--faint)]">Your recent searches will appear here.</p>
              )}
            </div>

            <div>
              <SectionHeading title="Browse all" subtitle="Start with a genre and follow the rabbit hole." />
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {["Jazz", "Electronic", "Indie", "Rock", "R&B & Soul", "Classical"].map((genre) => {
                  const genreTracks = getGenreTracks(genre);
                  const genreObj = genres.find((g) => g.name.toLowerCase() === genre.toLowerCase());
                  const coverUrl = genreTracks[0]?.cover || genreObj?.cover;
                  return (
                    <button
                      key={genre}
                      type="button"
                      onClick={() =>
                        navigate({
                          name: "collection",
                          kind: "genre",
                          id: genreObj?.id || genre.toLowerCase().replace(/ /g, "-"),
                          title: genre,
                        })
                      }
                      className="group flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--hover)] p-2.5 text-left transition hover:border-[var(--line-strong)]"
                    >
                      {coverUrl ? (
                        <img
                          src={coverUrl}
                          alt=""
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-white/5 border border-white/10 grid place-items-center text-white/40">
                          <Music2 size={16} />
                        </div>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] font-semibold">{genre}</span>
                        <span className="block text-[9px] text-[var(--faint)]">
                          {genreTracks.length ? `${genreTracks.length} tracks` : "Curated station"}
                        </span>
                      </span>
                      <Play size={12} fill="currentColor" className="text-[var(--faint)] transition group-hover:text-[var(--ink)]" />
                    </button>
                  );
                })}
              </div>

              {/* Report a bug */}
              <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-[var(--line)] bg-[var(--hover)]/60 p-4 transition hover:border-[var(--line-strong)]">
                <div className="flex items-center gap-3.5">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
                    <Bug size={18} />
                  </div>
                  <div>
                    <p className="text-[12.5px] font-semibold text-[var(--ink)]">Found an issue or bug?</p>
                    <p className="mt-0.5 text-[10.5px] text-[var(--muted)]">
                      Send bug reports and feedback directly to our Discord developer channel.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openModal("report-bug")}
                  className="btn btn-sm shrink-0 flex items-center gap-2 border-[var(--line-strong)] bg-[var(--canvas)]/80 text-[var(--ink)] transition hover:bg-[var(--ink)] hover:text-[var(--canvas)] shadow-sm"
                >
                  <Bug size={13} />
                  <span>Report Bug</span>
                </button>
              </div>
            </div>

            {scope === "addons" && (
              <div className="mt-6 rounded-xl border border-[var(--line)] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[11px] font-semibold">Connected addons</p>
                  <button type="button" className="text-[9.5px] text-[var(--faint)] hover:text-[var(--ink)]" onClick={() => openModal("add-addon")}>
                    + Add addon
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {activeSources.slice(0, 3).map((source) => (
                    <div key={source.id} className="rounded-lg border border-[var(--line)] bg-[var(--hover)] px-3 py-2.5">
                      <p className="flex items-center gap-1.5 text-[10.5px] font-medium">
                        <span className="grid h-5 w-5 place-items-center rounded border border-[var(--line)] text-[8px]">
                          {source.icon}
                        </span>
                        {source.name}
                      </p>
                      <p className="mt-1 text-[8.5px] text-[var(--faint)]">{source.quality} · enabled</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : youtubeLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-32">
            <Loader2 size={22} className="animate-spin text-[var(--faint)]" />
            <p className="text-[10px] text-[var(--faint)]">Searching YouTube Music…</p>
          </div>
        ) : scope === "addons" ? (
          addonLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-32">
              <Loader2 size={24} className="animate-spin text-emerald-400" />
              <p className="text-[11px] text-[var(--muted)]">Searching FLAC &amp; Lossless addon sources…</p>
            </div>
          ) : (
            <div className="mt-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="section-title">Lossless &amp; Hi-Res Results</h2>
                  <p className="mt-0.5 text-[10.5px] text-[var(--faint)]">
                    {addonTracks.length} lossless stream{addonTracks.length === 1 ? "" : "s"} found across active addon manifests
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                    Bit-Perfect FLAC
                  </span>
                  <button
                    type="button"
                    onClick={() => openModal("add-addon")}
                    className="btn btn-sm text-[10px]"
                  >
                    Add Manifest URL
                  </button>
                </div>
              </div>
              {addonTracks.length ? (
                <div className="space-y-0.5">
                  {addonTracks.map((track, index) => (
                    <div
                      key={track.id}
                      className="group flex items-center gap-3 rounded-lg px-2.5 py-2 transition hover:bg-[var(--hover)]"
                      onDoubleClick={() => playTrack(track, addonTracks, `Lossless · ${query}`)}
                    >
                      {(() => {
                        const isCurrent = currentTrack?.id === track.id;
                        return (
                          <button
                            type="button"
                            onClick={() => (isCurrent ? togglePlay() : playTrack(track, addonTracks, `Lossless · ${query}`))}
                            className="w-4 text-right text-[9.5px] tabular-nums text-[var(--faint)] hover:text-white"
                          >
                            {isCurrent ? (
                              <span className="text-[var(--ink)]">
                                {isPlaying ? <Pause size={11} fill="currentColor" /> : <Play size={11} fill="currentColor" />}
                              </span>
                            ) : (
                              <>
                                <span className="group-hover:hidden">{String(index + 1).padStart(2, "0")}</span>
                                <Play size={11} fill="currentColor" className="hidden group-hover:inline-block ml-0.5" />
                              </>
                            )}
                          </button>
                        );
                      })()}
                      <button type="button" onClick={() => playTrack(track, addonTracks, `Lossless · ${query}`)}>
                        <Artwork src={track.cover} alt={track.album} className="h-10 w-10 rounded-md" rounded="rounded-md" />
                      </button>
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => playTrack(track, addonTracks, `Lossless · ${query}`)}
                      >
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-[12px] font-medium text-[var(--ink)]">{track.title}</p>
                          <span className="rounded-[3px] border border-emerald-500/40 bg-emerald-500/10 px-1 text-[7.5px] font-bold uppercase tracking-wider text-emerald-400">
                            {track.format?.toUpperCase() || "FLAC"}
                          </span>
                        </div>
                        <p className="truncate text-[10px] text-[var(--muted)]">
                          {track.artist} {track.album ? `· ${track.album}` : ""}
                        </p>
                      </button>
                      <div className="hidden text-right sm:block">
                        <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-emerald-400">
                          {track.quality || "Lossless"}
                        </p>
                        <p className="text-[9px] tabular-nums text-[var(--faint)]">
                          {track.bitDepth ? `${track.bitDepth}-bit` : "16-bit"} / {track.sampleRate ? `${(track.sampleRate / 1000).toFixed(1)}kHz` : "44.1kHz"}
                        </p>
                      </div>
                      <span className="badge-yt text-[9px]">{track.source || "Lossless"}</span>
                      <TrackMenu track={track} queue={addonTracks} queueLabel={`Lossless · ${query}`} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--line-strong)] px-6 py-16 text-center">
                  <AudioLines size={24} className="mx-auto text-[var(--faint)]" />
                  <p className="mt-3 text-[13px] font-medium">
                    {addonError ? "Lossless addon search error" : `No addon matches for “${query}”`}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--faint)] max-w-[420px] mx-auto">
                    {addonError || "Check that your lossless manifest URL is added in Sources, or try searching for another track / artist."}
                  </p>
                  <div className="mt-4 flex justify-center gap-2">
                    <button type="button" className="btn btn-sm" onClick={() => setRetryTick((v) => v + 1)}>
                      Try Again
                    </button>
                    <button type="button" className="btn btn-sm" onClick={() => openModal("add-addon")}>
                      Manage Lossless URLs
                    </button>
                    <button type="button" className="btn btn-sm" onClick={() => setScope("youtube")}>
                      Search YouTube instead
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        ) : (
          <div className="mt-7 animate-fade-up">
            {filteredTracks.length || filteredAlbums.length || filteredArtists.length ? (
              <>
                <div className="mb-7 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
                  <div>
                    <p className="eyebrow mb-2.5">Top result</p>
                    <div className="group relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--hover)] p-4">
                      {topKind === "artist" && topArtist ? (
                        <button
                          type="button"
                          className="text-left"
                          onClick={() => navigate({ name: "collection", kind: "artist", id: topArtist.id, title: topArtist.name, cover: topArtist.cover })}
                        >
                          <Artwork src={topArtist.cover} alt="" className="h-[112px] w-[112px] rounded-full" rounded="rounded-full" />
                          <p className="mt-4 text-[19px] font-semibold tracking-[-0.035em]">{topArtist.name}</p>
                          <p className="mt-0.5 text-[10px] text-[var(--faint)]">Artist · {topArtist.monthly} monthly listeners</p>
                        </button>
                      ) : topKind === "album" && topAlbum ? (
                        <button
                          type="button"
                          className="text-left"
                          onClick={() => navigate({ name: "collection", kind: "album", id: topAlbum.id, title: topAlbum.title, artist: topAlbum.artist, cover: topAlbum.cover })}
                        >
                          <Artwork src={topAlbum.cover} alt="" className="h-[112px] w-[112px] rounded-xl" />
                          <p className="mt-4 text-[19px] font-semibold tracking-[-0.035em]">{topAlbum.title}</p>
                          <p className="mt-0.5 text-[10px] text-[var(--faint)]">Album · {topAlbum.artist}</p>
                        </button>
                      ) : topTrack ? (
                        <button
                          type="button"
                          className="text-left"
                          onClick={() => playTrack(topTrack, filteredTracks, `Search · ${query}`)}
                        >
                          <Artwork src={topTrack.cover} alt="" className="h-[112px] w-[112px] rounded-xl" />
                          <p className="mt-4 text-[19px] font-semibold tracking-[-0.035em]">{topTrack.title}</p>
                          <p className="mt-0.5 text-[10px] text-[var(--faint)]">Song · {topTrack.artist}</p>
                        </button>
                      ) : null}
                      {(() => {
                        const isTopCurrent =
                          (topKind === "artist" && topArtist && (currentTrack?.artistId === topArtist.id || (currentTrack?.artist && currentTrack.artist.toLowerCase() === topArtist.name.toLowerCase()))) ||
                          (topKind === "album" && topAlbum && (currentTrack?.albumId === topAlbum.id || (currentTrack?.album && currentTrack.album.toLowerCase() === topAlbum.title.toLowerCase()))) ||
                          (topKind === "track" && topTrack && currentTrack?.id === topTrack.id);
                        return (
                          <button
                            type="button"
                            aria-label={isTopCurrent && isPlaying ? "Pause top result" : "Play top result"}
                            className={cn(
                              "play-fab absolute bottom-4 right-4 h-10 w-10 transition-all duration-300",
                              isTopCurrent ? "opacity-100 translate-y-0" : "opacity-0 group-hover:opacity-100",
                            )}
                            onClick={() => {
                              if (isTopCurrent) {
                                togglePlay();
                              } else if (topKind === "artist" && topArtist) {
                                playQueue(getArtistTracks(topArtist.id), 0, topArtist.name);
                              } else if (topKind === "album" && topAlbum) {
                                playQueue(getAlbumTracks(topAlbum.id), 0, topAlbum.title);
                              } else if (topTrack) {
                                playTrack(topTrack, filteredTracks, `Search · ${query}`);
                              }
                            }}
                          >
                            {isTopCurrent && isPlaying ? (
                              <Pause size={15} fill="currentColor" />
                            ) : (
                              <Play size={15} fill="currentColor" className="ml-[1px]" />
                            )}
                          </button>
                        );
                      })()}
                    </div>
                  </div>

                  <div>
                    <p className="eyebrow mb-2.5">Songs</p>
                    <div className="space-y-0.5">
                      {filteredTracks.slice(0, 5).map((track, index) => (
                        <TrackRow
                          key={track.id}
                          track={track}
                          index={index}
                          queue={filteredTracks}
                          queueLabel={`Search · ${query}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {filteredArtists.length > 0 && (
                  <section className="mb-7">
                    <SectionHeading title="Artists" />
                    <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
                      {filteredArtists.slice(0, 5).map((artist) => (
                        <ArtistCard key={artist.id} artist={artist} />
                      ))}
                    </div>
                  </section>
                )}

                {filteredAlbums.length > 0 && (
                  <section className="mb-7">
                    <SectionHeading title="Albums" />
                    <div className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-5">
                      {filteredAlbums.slice(0, 5).map((album) => (
                        <AlbumCard key={album.id} album={album} />
                      ))}
                    </div>
                  </section>
                )}

                {filteredTracks.length > 5 && (
                  <section>
                    <SectionHeading title="More songs" />
                    <div className="space-y-0.5">
                      {filteredTracks.slice(5, 12).map((track, index) => (
                        <TrackRow
                          key={track.id}
                          track={track}
                          index={index + 5}
                          queue={filteredTracks}
                          queueLabel={`Search · ${query}`}
                          showAlbum
                        />
                      ))}
                    </div>
                  </section>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--line-strong)] px-6 py-20 text-center">
                <Disc3 size={26} className="mx-auto text-[var(--faint)]" />
                <p className="mt-3 text-[14px] font-semibold">
                  {youtubeMode && youtubeError ? "YouTube search failed" : `No results for “${query}”`}
                </p>
                <p className="mt-1.5 max-w-[460px] mx-auto text-[11px] text-[var(--faint)]">
                  {!youtubeAvailable && scope === "youtube"
                    ? "Open Chordly as the Windows desktop app to search and stream YouTube Music."
                    : youtubeMode && youtubeError
                      ? youtubeError
                      : scope === "library"
                        ? "Nothing in your saved catalogue matches. Try the YouTube tab."
                        : youtubeMode
                          ? "YouTube Music returned no playable matches. Try another spelling or add more words to the query."
                          : "Check the spelling or try a different source."}
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  {youtubeMode && youtubeError && (
                    <button type="button" className="btn btn-sm" onClick={() => setRetryTick((value) => value + 1)}>
                      <Loader2 size={13} /> Try again
                    </button>
                  )}
                  {scope !== "youtube" && (
                    <button type="button" className="btn btn-sm" onClick={() => setScope("youtube")}>
                      <Youtube size={13} /> Search YouTube
                    </button>
                  )}
                  <button type="button" className="btn btn-sm" onClick={() => setSearchQuery("")}>
                    Clear search
                  </button>
                </div>
              </div>
            )}

            <p className="mt-8 flex items-center justify-center gap-1.5 text-[9px] text-[var(--faint)]">
              <Music2 size={10} /> Results from YouTube Music · synced library · lossless addons
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
