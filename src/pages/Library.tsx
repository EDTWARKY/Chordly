import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  Clock3,
  Disc3,
  Download,
  FolderOpen,
  Heart,
  Mic2,
  Music2,
  Pause,
  Play,
  Plus,
  Radio,
  Upload,
  Users,
} from "lucide-react";
import { useApp } from "../store";
import {
  albumById,
  artistById,
  getArtistTracks,
  podcasts,
  subscriptions,
  trackById,
} from "../data";
import { Artwork } from "../components/Artwork";
import { ArtistCard, PlaylistCard } from "../components/Cards";
import { SectionHeading } from "../components/Primitives";
import { cn } from "../lib/utils";

export function Library() {
  const {
    navigate,
    playlists,
    liked,
    downloads,
    playQueue,
    playTrack,
    openModal,
    isLiked,
    toggleLike,
    localTracks,
    isDesktop,
    pushToast,
    stats,
    weekStats,
    topSong,
    topSongs,
    topArtist,
    topArtists,
    topAlbum,
    topAlbums,
    currentTrack,
    isPlaying,
    togglePlay,
  } = useApp();

  const [songRank, setSongRank] = useState(0);
  const [artistRank, setArtistRank] = useState(0);
  const [albumRank, setAlbumRank] = useState(0);

  const selectedSong = topSongs[songRank] ?? (songRank === 0 ? topSong : null);
  const isSelectedSongActive = Boolean(selectedSong && currentTrack?.id === selectedSong.id);

  const selectedArtist = topArtists[artistRank] ?? (artistRank === 0 ? topArtist : null);
  const selectedAlbum = topAlbums[albumRank] ?? (albumRank === 0 ? topAlbum : null);

  const rankBadgeStyle = (rank: number) => {
    if (rank === 0) return "bg-amber-400 text-black ring-1 ring-black/40";
    if (rank === 1) return "bg-zinc-300 text-black ring-1 ring-black/40";
    return "bg-amber-700 text-white ring-1 ring-black/40";
  };

  const followedArtists = subscriptions.map((id) => artistById[id]).filter(Boolean);

  const shortcutCards = [
    {
      title: "Liked Music",
      subtitle: `${liked.length} tracks`,
      icon: Heart,
      action: () => navigate({ name: "collection", kind: "liked", title: "Liked Music" }),
      accent: true,
    },
    {
      title: "Downloads",
      subtitle: `${downloads.length} offline`,
      icon: Download,
      action: () => navigate({ name: "collection", kind: "downloads", title: "Downloads" }),
    },
    {
      title: "Local Music",
      subtitle: localTracks.length
        ? `${localTracks.length.toLocaleString()} on this PC`
        : isDesktop
          ? "Not scanned"
          : "Windows app required",
      icon: FolderOpen,
      action: () => navigate({ name: "collection", kind: "local", title: "Local Music" }),
    },
    {
      title: "New playlist",
      subtitle: "YouTube Music sync",
      icon: Plus,
      action: () => openModal("create-playlist"),
      yt: true,
    },
    {
      title: "Import Spotify",
      subtitle: "Link, CSV or M3U8",
      icon: Upload,
      action: () => openModal("import"),
    },
  ];

  return (
    <div className="page-inner">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end animate-fade-up">
        <div>
          <p className="eyebrow">Your library</p>
          <h1 className="page-title mt-2">Everything you keep close.</h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-2 text-[11.5px] text-[var(--muted)]">
            <span>{liked.length} liked songs</span>
            <span className="text-[var(--faint)]">·</span>
            <span>{playlists.length} playlists</span>
            <span className="text-[var(--faint)]">·</span>
            <span>{followedArtists.length} artists followed</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-sm" onClick={() => openModal("import")}>
            <Upload size={13} /> Import
          </button>
          <button type="button" className="btn btn-sm btn-primary" onClick={() => openModal("create-playlist")}>
            <Plus size={13} /> New playlist
          </button>
        </div>
      </div>

      {/* stats */}
      <section className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 animate-fade-up" style={{ animationDelay: "60ms" }}>
        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--hover)] p-4">
          <div className="flex w-full items-start justify-between">
            <div>
              <p className="eyebrow">Listening this week</p>
              <p className="mt-1 flex items-baseline gap-1.5">
                <span className="text-[28px] font-semibold leading-none tracking-[-0.05em]">{stats.minutes}</span>
                <span className="text-[10px] text-[var(--faint)]">minutes</span>
              </p>
            </div>
            <span className="badge-yt shrink-0">{stats.streak} day streak</span>
          </div>
          <div className="mt-3 flex h-[34px] w-full items-end gap-[5px]">
            {weekStats.map((day, index) => (
              <div key={index} className="flex h-full flex-1 flex-col justify-end gap-1">
                <div
                  className={cn(
                    "w-full rounded-[2px] transition-all",
                    day.isToday ? "bg-[var(--ink)]" : "bg-[var(--line-strong)]",
                  )}
                  style={{ height: `${Math.max(12, day.value)}%` }}
                />
                <span className={cn("text-center text-[7.5px]", day.isToday ? "font-bold text-[var(--ink)]" : "text-[var(--faint)]")}>
                  {day.day}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Song Card */}
        <div
          role="button"
          tabIndex={0}
          className="group flex flex-col justify-between rounded-2xl border border-[var(--line)] bg-[var(--hover)] p-4 text-left transition hover:border-[var(--line-strong)] cursor-pointer select-none"
          onClick={() => {
            if (!selectedSong) return;
            if (isSelectedSongActive) {
              togglePlay();
            } else {
              playTrack(selectedSong, [selectedSong], `Top ${songRank + 1} song`);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (!selectedSong) return;
              if (isSelectedSongActive) togglePlay();
              else playTrack(selectedSong, [selectedSong], `Top ${songRank + 1} song`);
            }
          }}
        >
          <div className="flex w-full items-start justify-between">
            <p className="eyebrow">Top {songRank + 1} song</p>
            <div className="flex items-center gap-0.5 rounded-full bg-white/[0.06] p-0.5 border border-white/10">
              {[0, 1, 2].map((r) => {
                const hasRank = Boolean(topSongs[r] || (r === 0 && topSong));
                const isSelected = songRank === r;
                return (
                  <button
                    key={r}
                    type="button"
                    disabled={!hasRank && r !== 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSongRank(r);
                    }}
                    title={`Top ${r + 1} Song`}
                    className={cn(
                      "h-5 min-w-[20px] rounded-full px-1 text-[9px] font-bold transition flex items-center justify-center",
                      isSelected
                        ? "bg-[var(--ink)] text-[var(--canvas)] shadow-sm"
                        : hasRank
                          ? "text-[var(--muted)] hover:bg-white/10 hover:text-[var(--ink)] cursor-pointer"
                          : "opacity-25 cursor-not-allowed text-[var(--faint)]",
                    )}
                  >
                    {r + 1}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-3 flex w-full items-center gap-3">
            <div className="relative shrink-0">
              {selectedSong ? (
                <Artwork src={selectedSong.cover} alt="" className="h-11 w-11 rounded-lg" rounded="rounded-lg" />
              ) : (
                <div className="grid h-11 w-11 place-items-center rounded-lg border border-[var(--line)] bg-white/5 text-[var(--muted)]">
                  <Music2 size={18} />
                </div>
              )}
              <span
                className={cn(
                  "absolute -bottom-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[8px] font-black shadow",
                  rankBadgeStyle(songRank),
                )}
              >
                #{songRank + 1}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-semibold leading-tight">
                {selectedSong?.title || (songRank === 0 ? "No tracks played yet" : `No #${songRank + 1} song yet`)}
              </p>
              <p className="mt-1 truncate text-[10px] leading-tight text-[var(--muted)]">
                {selectedSong?.artist || (songRank === 0 ? "Start listening to see stats" : "Play more songs to rank")}
              </p>
              <p className="mt-1 truncate text-[8.5px] leading-tight text-[var(--faint)]">
                {selectedSong ? `${selectedSong.plays || 1} ${(selectedSong.plays || 1) === "1" || (selectedSong.plays || 1) === 1 ? "play" : "plays"}` : "0 plays"}
              </p>
            </div>
            <span
              className={cn(
                "ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--line)] transition",
                isSelectedSongActive && isPlaying
                  ? "bg-[var(--ink)] text-[var(--canvas)]"
                  : "text-[var(--muted)] group-hover:bg-[var(--ink)] group-hover:text-[var(--canvas)]",
              )}
            >
              {isSelectedSongActive && isPlaying ? (
                <Pause size={12} fill="currentColor" />
              ) : (
                <Play size={12} fill="currentColor" className="ml-[1px]" />
              )}
            </span>
          </div>
        </div>

        {/* Top Artist Card */}
        <div
          role="button"
          tabIndex={0}
          className="group flex flex-col justify-between rounded-2xl border border-[var(--line)] bg-[var(--hover)] p-4 text-left transition hover:border-[var(--line-strong)] cursor-pointer select-none"
          onClick={() =>
            selectedArtist &&
            navigate({ name: "collection", kind: "artist", id: selectedArtist.id, title: selectedArtist.name, cover: selectedArtist.cover })
          }
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (selectedArtist) navigate({ name: "collection", kind: "artist", id: selectedArtist.id, title: selectedArtist.name, cover: selectedArtist.cover });
            }
          }}
        >
          <div className="flex w-full items-start justify-between">
            <p className="eyebrow">Top {artistRank + 1} artist</p>
            <div className="flex items-center gap-0.5 rounded-full bg-white/[0.06] p-0.5 border border-white/10">
              {[0, 1, 2].map((r) => {
                const hasRank = Boolean(topArtists[r] || (r === 0 && topArtist));
                const isSelected = artistRank === r;
                return (
                  <button
                    key={r}
                    type="button"
                    disabled={!hasRank && r !== 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setArtistRank(r);
                    }}
                    title={`Top ${r + 1} Artist`}
                    className={cn(
                      "h-5 min-w-[20px] rounded-full px-1 text-[9px] font-bold transition flex items-center justify-center",
                      isSelected
                        ? "bg-[var(--ink)] text-[var(--canvas)] shadow-sm"
                        : hasRank
                          ? "text-[var(--muted)] hover:bg-white/10 hover:text-[var(--ink)] cursor-pointer"
                          : "opacity-25 cursor-not-allowed text-[var(--faint)]",
                    )}
                  >
                    {r + 1}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-3 flex w-full items-center gap-3">
            <div className="relative shrink-0">
              {selectedArtist ? (
                <Artwork src={selectedArtist.cover} alt="" className="h-11 w-11 rounded-full" rounded="rounded-full" />
              ) : (
                <div className="grid h-11 w-11 place-items-center rounded-full border border-[var(--line)] bg-white/5 text-[var(--muted)]">
                  <Users size={18} />
                </div>
              )}
              <span
                className={cn(
                  "absolute -bottom-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[8px] font-black shadow",
                  rankBadgeStyle(artistRank),
                )}
              >
                #{artistRank + 1}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-semibold leading-tight">
                {selectedArtist?.name || (artistRank === 0 ? "No artist yet" : `No #${artistRank + 1} artist yet`)}
              </p>
              <p className="mt-1 truncate text-[10px] leading-tight text-[var(--muted)]">
                {selectedArtist ? (selectedArtist.genre && !["youtube", "music"].includes(selectedArtist.genre.toLowerCase()) ? selectedArtist.genre : "Artist") : "Play music to see stats"}
              </p>
              <p className="mt-1 truncate text-[8.5px] leading-tight text-[var(--faint)]">
                {selectedArtist ? `${selectedArtist.plays || 1} ${(selectedArtist.plays || 1) === 1 ? "play" : "plays"}` : "0 plays"}
              </p>
            </div>
            <span className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--line)] text-[var(--muted)] transition group-hover:bg-[var(--ink)] group-hover:text-[var(--canvas)]">
              <ArrowUpRight size={13} />
            </span>
          </div>
        </div>

        {/* Top Album Card */}
        <div
          role="button"
          tabIndex={0}
          className="group flex flex-col justify-between rounded-2xl border border-[var(--line)] bg-[var(--hover)] p-4 text-left transition hover:border-[var(--line-strong)] cursor-pointer select-none"
          onClick={() =>
            selectedAlbum &&
            navigate({
              name: "collection",
              kind: "album",
              id: selectedAlbum.id,
              title: selectedAlbum.title,
              artist: selectedAlbum.artist,
              cover: selectedAlbum.cover,
            })
          }
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (selectedAlbum)
                navigate({
                  name: "collection",
                  kind: "album",
                  id: selectedAlbum.id,
                  title: selectedAlbum.title,
                  artist: selectedAlbum.artist,
                  cover: selectedAlbum.cover,
                });
            }
          }}
        >
          <div className="flex w-full items-start justify-between">
            <p className="eyebrow">Top {albumRank + 1} album</p>
            <div className="flex items-center gap-0.5 rounded-full bg-white/[0.06] p-0.5 border border-white/10">
              {[0, 1, 2].map((r) => {
                const hasRank = Boolean(topAlbums[r] || (r === 0 && topAlbum));
                const isSelected = albumRank === r;
                return (
                  <button
                    key={r}
                    type="button"
                    disabled={!hasRank && r !== 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setAlbumRank(r);
                    }}
                    title={`Top ${r + 1} Album`}
                    className={cn(
                      "h-5 min-w-[20px] rounded-full px-1 text-[9px] font-bold transition flex items-center justify-center",
                      isSelected
                        ? "bg-[var(--ink)] text-[var(--canvas)] shadow-sm"
                        : hasRank
                          ? "text-[var(--muted)] hover:bg-white/10 hover:text-[var(--ink)] cursor-pointer"
                          : "opacity-25 cursor-not-allowed text-[var(--faint)]",
                    )}
                  >
                    {r + 1}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-3 flex w-full items-center gap-3">
            <div className="relative shrink-0">
              {selectedAlbum ? (
                <Artwork src={selectedAlbum.cover} alt="" className="h-11 w-11 rounded-lg" rounded="rounded-lg" />
              ) : (
                <div className="grid h-11 w-11 place-items-center rounded-lg border border-[var(--line)] bg-white/5 text-[var(--muted)]">
                  <Disc3 size={18} />
                </div>
              )}
              <span
                className={cn(
                  "absolute -bottom-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[8px] font-black shadow",
                  rankBadgeStyle(albumRank),
                )}
              >
                #{albumRank + 1}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-semibold leading-tight">
                {selectedAlbum?.title || (albumRank === 0 ? "No album yet" : `No #${albumRank + 1} album yet`)}
              </p>
              <p className="mt-1 truncate text-[10px] leading-tight text-[var(--muted)]">
                {selectedAlbum?.artist || "Play music to see stats"}
              </p>
              <p className="mt-1 truncate text-[8.5px] leading-tight text-[var(--faint)]">
                {selectedAlbum ? `${selectedAlbum.plays || 1} ${(selectedAlbum.plays || 1) === 1 ? "play" : "plays"}` : "0 plays"}
              </p>
            </div>
            <span className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--line)] text-[var(--muted)] transition group-hover:bg-[var(--ink)] group-hover:text-[var(--canvas)]">
              <ArrowUpRight size={13} />
            </span>
          </div>
        </div>
      </section>

      {/* shortcuts */}
      <section className="mb-10">
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-5">
          {shortcutCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.title}
                type="button"
                onClick={card.action}
                className={cn(
                  "group flex items-center gap-3 rounded-xl border p-3 text-left transition",
                  card.accent
                    ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--canvas)]"
                    : "border-[var(--line)] bg-[var(--hover)] hover:border-[var(--line-strong)]",
                )}
              >
                <span
                  className={cn(
                    "grid h-9 w-9 shrink-0 place-items-center rounded-lg border",
                    card.accent ? "border-black/10 bg-black/10" : "border-[var(--line)] bg-[var(--canvas)]/20",
                  )}
                >
                  <Icon size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[11px] font-semibold">{card.title}</span>
                    {card.yt && (
                      <span
                        className={cn(
                          "rounded-full border px-1 py-0 text-[7px] font-semibold uppercase tracking-wider",
                          card.accent ? "border-black/20 text-black/50" : "border-[var(--line)] text-[var(--faint)]",
                        )}
                      >
                        YT
                      </span>
                    )}
                  </span>
                  <span className={cn("block truncate text-[9px]", card.accent ? "text-black/50" : "text-[var(--faint)]")}>
                    {card.subtitle}
                  </span>
                </span>
                <ArrowUpRight
                  size={13}
                  className={cn(
                    "shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5",
                    card.accent ? "text-black/40" : "text-[var(--faint)]",
                  )}
                />
              </button>
            );
          })}
        </div>
      </section>

      {/* playlists */}
      <section className="mb-10">
        <SectionHeading
          title="Your playlists"
          subtitle="Synced both ways with YouTube Music."
          action="New playlist"
          onAction={() => openModal("create-playlist")}
        />
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
          {playlists.slice(0, 5).map((playlist) => (
            <PlaylistCard key={playlist.id} playlist={playlist} />
          ))}
          <button
            type="button"
            onClick={() => openModal("create-playlist")}
            className="group flex min-h-[180px] flex-col items-center justify-center rounded-[14px] border border-dashed border-[var(--line-strong)] text-[var(--faint)] transition hover:border-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--ink)]"
          >
            <span className="grid h-10 w-10 place-items-center rounded-full border border-[var(--line)] transition group-hover:border-[var(--line-strong)]">
              <Plus size={16} />
            </span>
            <span className="mt-3 text-[10.5px] font-medium">New playlist</span>
            <span className="mt-0.5 flex items-center gap-1 text-[8px]">
              <Check size={8} /> YT Music sync
            </span>
          </button>
        </div>
      </section>

      {/* artists and subscriptions */}
      {followedArtists.length > 0 && (
        <section className="mb-10 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div>
            <SectionHeading title="Artists you follow" />
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
              {followedArtists.map((artist) => (
                <ArtistCard key={artist.id} artist={artist} showGenre={false} />
              ))}
            </div>
          </div>
          <div>
            <SectionHeading
              title="Subscriptions"
              action="Manage"
              onAction={() => navigate({ name: "collection", kind: "subscriptions", title: "Subscriptions" })}
            />
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--hover)] p-1.5">
              {followedArtists.slice(0, 4).map((artist) => (
                <button
                  key={artist.id}
                  type="button"
                  onClick={() => navigate({ name: "collection", kind: "artist", id: artist.id, title: artist.name })}
                  className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition hover:bg-[var(--hover)]"
                >
                  <Artwork src={artist.cover} alt="" className="h-9 w-9 rounded-full" rounded="rounded-full" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-medium">{artist.name}</span>
                    <span className="block truncate text-[9px] text-[var(--faint)]">
                      {artist.monthly} subscribers · {artist.genre}
                    </span>
                  </span>
                  <span className="flex items-center gap-1 text-[8.5px] text-[var(--faint)]">
                    <Check size={10} /> Subscribed
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* podcasts */}
      {podcasts.length > 0 && (
        <section className="mb-8">
          <SectionHeading
            title="Podcasts"
            subtitle="The stories behind the songs."
            action="All podcasts"
            onAction={() => navigate({ name: "collection", kind: "podcasts", title: "Podcasts" })}
          />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {podcasts.map((podcast) => (
              <button
                key={podcast.id}
                type="button"
                className="group flex min-w-0 items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--hover)] p-2.5 text-left transition hover:border-[var(--line-strong)]"
                onClick={() => navigate({ name: "collection", kind: "podcasts", title: "Podcasts" })}
              >
                <Artwork src={podcast.cover} alt="" className="h-[52px] w-[52px] rounded-lg" rounded="rounded-lg" />
                <span className="min-w-0">
                  <span className="block truncate text-[11.5px] font-semibold">{podcast.title}</span>
                  <span className="block truncate text-[9.5px] text-[var(--muted)]">{podcast.host}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[8.5px] text-[var(--faint)]">
                    <Radio size={9} /> {podcast.episodes} episodes
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* liked preview */}
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--hover)] p-4">
        <div className="mb-2 flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Heart size={15} className="fill-current" />
            <h2 className="section-title !text-[17px]">Liked Music</h2>
          </div>
          {liked.length > 0 && (
            <button
              type="button"
              className="text-[10px] font-medium text-[var(--faint)] hover:text-[var(--ink)]"
              onClick={() => navigate({ name: "collection", kind: "liked", title: "Liked Music" })}
            >
              View all {liked.length}
            </button>
          )}
        </div>
        {liked.length === 0 ? (
          <p className="px-1 py-4 text-[11px] text-[var(--faint)]">
            No liked tracks yet. Search YouTube Music or connect your Google account to sync your Liked Music.
          </p>
        ) : (
          <div className="grid gap-1.5 md:grid-cols-2">
            {liked.slice(0, 6).map((id) => {
              const track = trackById[id];
              if (!track) return null;
              return (
                <div key={id} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-[var(--hover)]">
                  <Artwork src={track.cover} alt="" className="h-8 w-8 rounded" rounded="rounded" />
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => playTrack(track, liked.map((likedId) => trackById[likedId]).filter(Boolean), "Liked Music")}
                  >
                    <p className="truncate text-[11px] font-medium">{track.title}</p>
                    <p className="truncate text-[9px] text-[var(--faint)]">{track.artist}</p>
                  </button>
                  <button
                    type="button"
                    aria-label="Unlike"
                    onClick={() => toggleLike(track)}
                    className="grid h-6 w-6 place-items-center rounded-full text-[var(--ink)]"
                  >
                    <Heart size={11} className="fill-current" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
