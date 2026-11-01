import { ArrowUpRight, Play, Pause } from "lucide-react";
import type { Album, Artist, Genre, Mood, Playlist, Track } from "../types";
import { useApp } from "../store";
import { getAlbumTracks, getArtistTracks, getGenreTracks, getMoodTracks, getPlaylistTracks } from "../data";
import { Artwork } from "./Artwork";
import { TrackMenu } from "./TrackMenu";
import { cn } from "../lib/utils";

function PlayOverlay({
  onPlay,
  large = false,
  isPlaying = false,
  isCurrent = false,
}: {
  onPlay: () => void;
  large?: boolean;
  isPlaying?: boolean;
  isCurrent?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={isPlaying ? "Pause" : "Play"}
      className={cn(
        "play-fab absolute bottom-3 right-3 transition-all duration-300",
        isCurrent
          ? "translate-y-0 opacity-100"
          : "translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100",
        large && "h-[52px] w-[52px]",
      )}
      onClick={(event) => {
        event.stopPropagation();
        onPlay();
      }}
    >
      {isPlaying ? (
        <Pause size={large ? 18 : 16} fill="currentColor" />
      ) : (
        <Play size={large ? 19 : 17} fill="currentColor" className="ml-[2px]" />
      )}
    </button>
  );
}

export function AlbumCard({
  album,
  className,
  subtitle,
}: {
  album: Album;
  className?: string;
  subtitle?: string;
}) {
  const { navigate, playQueue, currentTrack, isPlaying, togglePlay } = useApp();
  const albumTracks = getAlbumTracks(album.id);
  const isCurrentAlbum = Boolean(
    currentTrack &&
      (currentTrack.albumId === album.id ||
        (currentTrack.album && currentTrack.album.toLowerCase() === album.title.toLowerCase())),
  );

  const handlePlay = () => {
    if (isCurrentAlbum) {
      togglePlay();
    } else if (albumTracks.length) {
      playQueue(albumTracks, 0, album.title);
    }
  };

  const open = () =>
    navigate({
      name: "collection",
      kind: "album",
      id: album.id,
      title: album.title,
      artist: album.artist,
      cover: album.cover,
    });

  return (
    <article
      className={cn("card-hover group min-w-0 cursor-pointer select-none", className)}
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === "Enter") open();
      }}
      role="button"
      tabIndex={0}
      aria-label={`${album.title} by ${album.artist}`}
    >
      <div className="relative">
        <Artwork src={album.cover} alt={album.title} className="aspect-square w-full rounded-[14px]" />
        <div className="pointer-events-none absolute inset-0 rounded-[14px] bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <PlayOverlay
          onPlay={handlePlay}
          isPlaying={isCurrentAlbum && isPlaying}
          isCurrent={isCurrentAlbum}
        />
      </div>
      <div className="mt-3 min-w-0">
        <p className="line-clamp-1 text-[13px] font-semibold tracking-[-0.015em] text-[var(--ink)]">{album.title}</p>
        <p className="mt-0.5 line-clamp-1 text-[11.5px] text-[var(--muted)]">{subtitle ?? album.artist}</p>
      </div>
    </article>
  );
}

export function TrackCard({
  track,
  queue,
  label,
  className,
  hideArtist,
}: {
  track: Track;
  queue?: Track[];
  label?: string;
  className?: string;
  hideArtist?: boolean;
}) {
  const { playTrack, currentTrack, isPlaying, togglePlay } = useApp();
  const list = queue && queue.length ? queue : [track];
  const isCurrent = currentTrack?.id === track.id;

  const handleAction = () => {
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track, list, label);
    }
  };

  return (
    <article
      className={cn("card-hover group min-w-0 cursor-pointer select-none", className)}
      onClick={handleAction}
    >
      <div className="relative">
        <Artwork src={track.cover} alt={track.title} className="aspect-square w-full rounded-[14px]" />
        <div className="pointer-events-none absolute inset-0 rounded-[14px] bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <div className="absolute right-2.5 top-2.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <TrackMenu
            track={track}
            queue={list}
            queueLabel={label}
            triggerClassName="bg-black/40 text-white backdrop-blur-md hover:bg-black/60 hover:text-white"
          />
        </div>
        <PlayOverlay
          onPlay={handleAction}
          isPlaying={isCurrent && isPlaying}
          isCurrent={isCurrent}
        />
        {track.video && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-black/55 px-2 py-[3px] text-[9px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur">
            Video
          </span>
        )}
      </div>
      <div className="mt-3 min-w-0">
        <p className="line-clamp-1 text-[13px] font-semibold tracking-[-0.015em] text-[var(--ink)]">{track.title}</p>
        {!hideArtist && <p className="mt-0.5 line-clamp-1 text-[11.5px] text-[var(--muted)]">{track.artist}</p>}
      </div>
    </article>
  );
}

export function PlaylistCard({ playlist, className }: { playlist: Playlist; className?: string }) {
  const { navigate, playQueue, loadPlaylistTracks, currentTrack, isPlaying, togglePlay } = useApp();
  const playlistTracks = getPlaylistTracks(playlist);
  const isCurrentPlaylist =
    Boolean(currentTrack) &&
    (playlistTracks.some((t) => t.id === currentTrack?.id) ||
      Boolean(playlist.trackIds && playlist.trackIds.includes(currentTrack?.id || "")));

  const handlePlay = async () => {
    if (isCurrentPlaylist) {
      togglePlay();
      return;
    }
    if (playlistTracks.length) {
      playQueue(playlistTracks, 0, playlist.name);
    } else {
      const targetId = playlist.browseId || playlist.id;
      const tracks = await loadPlaylistTracks(targetId, playlist.accountId);
      if (tracks && tracks.length) {
        playQueue(tracks, 0, playlist.name);
      }
    }
  };

  return (
    <article
      className={cn("card-hover group min-w-0 cursor-pointer select-none", className)}
      onClick={() =>
        navigate({ name: "collection", kind: "playlist", id: playlist.id, title: playlist.name })
      }
    >
      <div className="relative">
        <Artwork src={playlist.cover} alt={playlist.name} className="aspect-square w-full rounded-[14px]" />
        <div className="pointer-events-none absolute inset-0 rounded-[14px] bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-70" />
        <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2">
          <p className="line-clamp-2 text-[13px] font-semibold leading-tight text-white drop-shadow-md">
            {playlist.name}
          </p>
        </div>
        <PlayOverlay
          onPlay={handlePlay}
          isPlaying={isCurrentPlaylist && isPlaying}
          isCurrent={isCurrentPlaylist}
        />
      </div>
      <div className="mt-3 min-w-0">
        <p className="line-clamp-1 text-[13px] font-semibold tracking-[-0.015em] text-[var(--ink)]">
          {playlist.name}
        </p>
        <p className="mt-0.5 line-clamp-1 text-[11.5px] text-[var(--muted)]">
          {playlist.trackCount || playlist.trackIds.length} songs · {playlist.synced ? "Synced" : "Local"}
        </p>
      </div>
    </article>
  );
}

export function ArtistCard({
  artist,
  className,
  showGenre = true,
}: {
  artist: Artist;
  className?: string;
  showGenre?: boolean;
}) {
  const { navigate, playQueue, currentTrack, isPlaying, togglePlay } = useApp();
  const artistTracks = getArtistTracks(artist.id);
  const isCurrentArtist = Boolean(
    currentTrack &&
      (currentTrack.artistId === artist.id ||
        (currentTrack.artist && currentTrack.artist.toLowerCase() === artist.name.toLowerCase())),
  );

  const handlePlay = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (isCurrentArtist) {
      togglePlay();
    } else if (artistTracks.length) {
      playQueue(artistTracks, 0, artist.name);
    }
  };

  return (
    <article
      className={cn("card-hover group min-w-0 cursor-pointer select-none text-center", className)}
      onClick={() =>
        navigate({
          name: "collection",
          kind: "artist",
          id: artist.id,
          title: artist.name,
          cover: artist.cover,
        })
      }
    >
      <div className="relative overflow-hidden rounded-full">
        <Artwork src={artist.cover} alt={artist.name} className="aspect-square w-full rounded-full" />
        <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <button
          type="button"
          aria-label={isCurrentArtist && isPlaying ? `Pause ${artist.name}` : `Play ${artist.name}`}
          className={cn(
            "play-fab absolute bottom-[8%] right-[8%] h-10 w-10 transition-all duration-300",
            isCurrentArtist
              ? "translate-y-0 opacity-100"
              : "translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100",
          )}
          onClick={handlePlay}
        >
          {isCurrentArtist && isPlaying ? (
            <Pause size={15} fill="currentColor" />
          ) : (
            <Play size={15} fill="currentColor" className="ml-[2px]" />
          )}
        </button>
      </div>
      <div className="mt-3 min-w-0 px-1">
        <p className="line-clamp-1 text-[12.5px] font-semibold text-[var(--ink)]">{artist.name}</p>
        {showGenre && <p className="mt-0.5 line-clamp-1 text-[11px] text-[var(--muted)]">{artist.genre}</p>}
      </div>
    </article>
  );
}

export function MoodCard({ mood, className }: { mood: Mood; className?: string }) {
  const { navigate, playQueue } = useApp();
  const moodTracks = getMoodTracks(mood.name);

  return (
    <article
      className={cn(
        "group relative min-h-[132px] cursor-pointer overflow-hidden rounded-2xl border border-[var(--line)] p-4 transition-all duration-300 hover:border-[var(--line-strong)]",
        className,
      )}
      onClick={() =>
        navigate({ name: "collection", kind: "mood", id: mood.id, title: mood.name })
      }
    >
      <img
        src={mood.cover}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-45 transition-transform duration-700 group-hover:scale-105 group-hover:opacity-60"
      />
      <div className="absolute inset-0" style={{ background: mood.gradient }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="flex items-start justify-between">
          <span className="eyebrow !text-white/70 drop-shadow-sm">{mood.blurb}</span>
          <button
            type="button"
            aria-label={`Play ${mood.name}`}
            className="grid h-8 w-8 place-items-center rounded-full border border-white/20 text-white opacity-0 transition-all duration-300 hover:bg-white hover:text-black group-hover:opacity-100"
            onClick={(event) => {
              event.stopPropagation();
              if (moodTracks.length) playQueue(moodTracks, 0, mood.name);
            }}
          >
            <Play size={13} fill="currentColor" className="ml-[1px]" />
          </button>
        </div>
        <div className="flex items-end justify-between">
          <h3 className="text-[22px] font-semibold tracking-[-0.04em] text-white drop-shadow-md">{mood.name}</h3>
          <ArrowUpRight
            size={16}
            className="text-white/60 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white"
          />
        </div>
      </div>
    </article>
  );
}

export function GenreCard({ genre, className }: { genre: Genre; className?: string }) {
  const { navigate } = useApp();
  return (
    <article
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-2xl border border-[var(--line)] transition-all duration-300 hover:border-[var(--line-strong)]",
        className,
      )}
      onClick={() => navigate({ name: "collection", kind: "genre", id: genre.id, title: genre.name })}
    >
      <img
        src={genre.cover}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-55 transition-all duration-700 group-hover:scale-105 group-hover:opacity-75"
      />
      <div className={cn("absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent")} />
      <div className="relative z-10 flex h-full min-h-[150px] flex-col justify-end p-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white/65 drop-shadow-sm">
              {genre.description}
            </p>
            <h3 className="text-[22px] font-semibold tracking-[-0.04em] text-white drop-shadow-md">{genre.name}</h3>
          </div>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/20 text-white opacity-0 transition-all group-hover:opacity-100">
            <ArrowUpRight size={15} />
          </span>
        </div>
      </div>
    </article>
  );
}

export function VideoCard({ track, queue, label }: { track: Track; queue?: Track[]; label?: string }) {
  const { playTrack, currentTrack, isPlaying, togglePlay } = useApp();
  const list = queue && queue.length ? queue : [track];
  const isCurrent = currentTrack?.id === track.id;

  const handleAction = () => {
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track, list, label ?? "Music videos");
    }
  };

  return (
    <article
      className="group min-w-0 cursor-pointer select-none"
      onClick={handleAction}
    >
      <div className="relative overflow-hidden rounded-[14px] border border-[var(--line)]">
        <Artwork
          src={track.cover}
          alt={track.title}
          className="aspect-[16/10] w-full rounded-[14px]"
          rounded="rounded-[14px]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/10" />
        <span className="absolute right-2.5 top-2.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[9.5px] font-medium text-white backdrop-blur">
          4K
        </span>
        <button
          type="button"
          aria-label={isCurrent && isPlaying ? `Pause ${track.title} video` : `Play ${track.title} video`}
          className={cn(
            "absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-black/25 text-white backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-white hover:text-black",
            isCurrent && isPlaying ? "opacity-100 scale-105 bg-white text-black" : "",
          )}
          onClick={(event) => {
            event.stopPropagation();
            handleAction();
          }}
        >
          {isCurrent && isPlaying ? (
            <Pause size={17} fill="currentColor" />
          ) : (
            <Play size={17} fill="currentColor" className="ml-[2px]" />
          )}
        </button>
        <p className="absolute bottom-3 left-3 right-3 line-clamp-1 text-[13px] font-semibold text-white">
          {track.title}
        </p>
      </div>
      <p className="mt-2.5 line-clamp-1 text-[11.5px] text-[var(--muted)]">
        {track.artist} · Music video
      </p>
    </article>
  );
}
