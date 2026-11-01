import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Clock3,
  Heart,
  Pause,
  Play,
  Plus,
  Search as SearchIcon,
  Upload,
} from "lucide-react";
import { useApp } from "../store";
import {
  albumById,
  albums,
  cover,
  getAlbumTracks,
  heroPicks,
  moods,
  trackById,
  tracks,
} from "../data";
import { cn, formatTime } from "../lib/utils";
import { Artwork } from "../components/Artwork";
import { AlbumCard, MoodCard, TrackCard, VideoCard } from "../components/Cards";
import { SectionHeading } from "../components/Primitives";
import { TrackMenu } from "../components/TrackMenu";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function Home() {
  const {
    activeAccount,
    navigate,
    playQueue,
    playTrack,
    isPlaying,
    togglePlay,
    currentTrack,
    liked,
    openModal,
    recents,
  } = useApp();
  const [heroIndex, setHeroIndex] = useState(0);
  const pick = heroPicks[heroIndex] ?? heroPicks[0] ?? {
    albumId: "",
    trackId: "",
    kicker: "Welcome to Chordly",
    title: "Listen without limits",
    blurb: "Connect your YouTube Music account or search across 100M+ tracks.",
    stat: "Lossless Audio",
  };
  const album = albumById[pick.albumId] ?? {
    id: "chordly",
    cover: cover(1),
    title: "Chordly",
    artist: "Chordly",
    genre: "Lossless",
    year: 2026,
    type: "Album",
  };
  const heroTracks = getAlbumTracks(pick.albumId);
  const heroTrack = trackById[pick.trackId] ?? heroTracks[0];
  const heroCurrent = currentTrack?.id === heroTrack?.id;

  const recentTracks = recents
    .map((id) => trackById[id])
    .filter(Boolean)
    .slice(0, 12);

  const featuredAlbums = albums.slice(0, 6);
  const videos = tracks.filter((track) => track.video).slice(0, 4);

  useEffect(() => {
    if (!heroPicks.length) return;
    const timer = window.setInterval(() => {
      setHeroIndex((index) => (index + 1) % heroPicks.length);
    }, 12000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="page-inner">
      <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end animate-fade-up">
        <div>
          <p className="eyebrow">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="page-title mt-2">
            {greeting()}, {activeAccount?.name ? activeAccount.name.split(" ")[0] : "Listener"}.
          </h1>
          <p className="mt-2.5 max-w-[440px] text-[12px] leading-relaxed text-[var(--muted)]">
            Your evening, scored. Pick up where you left off or find something new for the quiet hours.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn btn-sm" onClick={() => openModal("import")}>
            <Upload size={13} /> Import
          </button>
        </div>
      </div>

      {/* hero banner */}
      <section className="mb-10 animate-fade-up" style={{ animationDelay: "60ms" }}>
        {heroPicks.length > 0 ? (
          <div className="group relative h-[350px] overflow-hidden rounded-[22px] border border-[var(--line)] bg-[#090909]">
            <img
              key={`bg-${heroIndex}`}
              src={album.cover}
              alt=""
              className="absolute inset-0 h-full w-full scale-105 object-cover opacity-65 transition-all duration-1000"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/10" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20" />

            <div className="relative z-10 flex h-full">
              <div className="flex min-w-0 flex-1 flex-col justify-between p-7 lg:p-9">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-[8.5px] font-semibold uppercase tracking-[0.15em] text-white/70 backdrop-blur">
                    <span className="h-1 w-1 rounded-full bg-white" />
                    {pick.kicker}
                  </span>
                  <h2 className="mt-5 max-w-[460px] text-balance text-[clamp(36px,4.6vw,58px)] font-semibold leading-[0.95] tracking-[-0.055em] text-white">
                    {pick.title}
                  </h2>
                  <p className="mt-3 max-w-[370px] text-[11.5px] leading-relaxed text-white/50">{pick.blurb}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    className="flex h-10 items-center gap-2 rounded-full bg-white px-5 text-[11.5px] font-semibold text-black transition hover:scale-[1.02] active:scale-95"
                    onClick={() => (heroCurrent ? togglePlay() : playQueue(heroTracks, 0, album.title))}
                  >
                    {heroCurrent && isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                    {heroCurrent && isPlaying ? "Pause" : "Play"}
                  </button>
                  <button
                    type="button"
                    className="flex h-10 items-center gap-2 rounded-full border border-white/20 px-4 text-[11.5px] font-medium text-white/80 backdrop-blur transition hover:bg-white/10 hover:text-white"
                    onClick={() => navigate({ name: "collection", kind: "album", id: album.id, title: album.title })}
                  >
                    View album
                    <ArrowUpRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative min-h-[250px] overflow-hidden rounded-[22px] border border-white/10 bg-gradient-to-br from-white/[0.07] via-[#080808] to-[#040404] p-7 sm:p-9 flex flex-col justify-between">
            <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-white/[0.04] blur-[80px] pointer-events-none" />
            <div>
              <h2 className="max-w-[540px] text-balance text-[clamp(26px,3.4vw,42px)] font-semibold leading-[1.08] tracking-[-0.04em] text-white">
                Everything you listen to, without compromise.
              </h2>
              <p className="mt-2.5 max-w-[460px] text-[12px] leading-relaxed text-white/55">
                Search over 100 million tracks on YouTube Music, sync your library with Google Sign-in, or play local lossless FLAC and ALAC audio.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                className="flex h-9 items-center gap-2 rounded-full bg-white px-5 text-[11.5px] font-semibold text-black transition hover:bg-white/90 active:scale-95"
                onClick={() => navigate({ name: "search" })}
              >
                <SearchIcon size={13} /> Search music
              </button>
              <button
                type="button"
                className="flex h-9 items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 text-[11.5px] font-medium text-white backdrop-blur transition hover:bg-white/10"
                onClick={() => openModal("add-account")}
              >
                Sign in with Google
              </button>
              <button
                type="button"
                className="flex h-9 items-center gap-2 rounded-full border border-white/15 px-4 text-[11.5px] font-medium text-white/70 backdrop-blur transition hover:bg-white/10 hover:text-white"
                onClick={() => navigate({ name: "collection", kind: "local", title: "Local Music" })}
              >
                Local music
              </button>
            </div>
          </div>
        )}
      </section>

      {/* recents */}
      {recentTracks.length > 0 && (
        <section className="mb-10 animate-fade-up" style={{ animationDelay: "110ms" }}>
          <SectionHeading
            title="Recents"
            subtitle="Jump back into what you were playing."
            action="Listening history"
            onAction={() => navigate({ name: "library" })}
          />
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {recentTracks.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                queue={recentTracks}
                label="Recently played"
              />
            ))}
          </div>
        </section>
      )}

      {/* moods */}
      <section className="mb-10">
        <SectionHeading title="Find your mood" subtitle="Explore stations curated for any moment." />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {moods.map((mood) => (
            <MoodCard key={mood.id} mood={mood} />
          ))}
        </div>
      </section>

      {/* albums */}
      {featuredAlbums.length > 0 && (
        <section className="mb-10">
          <SectionHeading
            title="Albums & singles"
            subtitle="Records with staying power."
            action="Explore more"
            onAction={() => navigate({ name: "explore" })}
          />
          <div className="grid grid-cols-3 gap-x-4 gap-y-6 lg:grid-cols-6">
            {featuredAlbums.map((featured) => (
              <AlbumCard key={featured.id} album={featured} />
            ))}
          </div>
        </section>
      )}

      {/* videos */}
      {videos.length > 0 && (
        <section className="mb-10">
          <SectionHeading
            title="Music videos"
            subtitle="Shot in monochrome, mixed in lossless."
            action="All videos"
            onAction={() => navigate({ name: "collection", kind: "videos", title: "Music Videos" })}
          />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {videos.map((track) => (
              <VideoCard key={track.id} track={track} queue={videos} label="Music videos" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
