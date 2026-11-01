import { useEffect, useState } from "react";
import { Dices, Play, Sparkles, TrendingUp, Disc3 } from "lucide-react";
import { useApp } from "../store";
import { albumById, genres, moods, registerRemoteTracks, trackById } from "../data";
import { AlbumCard, GenreCard, MoodCard, PlaylistCard, TrackCard } from "../components/Cards";
import { SectionHeading } from "../components/Primitives";
import { cn } from "../lib/utils";
import type { Album, Track } from "../types";

export function Explore() {
  const { navigate, playQueue, playlists } = useApp();
  const [exploreData, setExploreData] = useState<{
    trending: Track[];
    newReleases: Album[];
  }>({ trending: [], newReleases: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const bridge = window.chordly || window.chordlyDesktop;
    const fetchExplore =
      bridge?.getExploreFeed ||
      (window as unknown as { chordlyDesktop?: { getExploreFeed?: () => Promise<any> } }).chordlyDesktop?.getExploreFeed;

    if (fetchExplore) {
      setLoading(true);
      void fetchExplore()
        .then((data: any) => {
          if (cancelled || !data) return;
          if (data.trending && data.trending.length) {
            registerRemoteTracks(data.trending);
          }
          setExploreData({
            trending: data.trending || [],
            newReleases: data.newReleases || [],
          });
        })
        .catch((err: unknown) => {
          console.warn("[chordly] Explore feed fetch failed:", err);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const localAlbums = Object.values(albumById).slice(0, 6);
  const displayAlbums = exploreData.newReleases.length > 0 ? exploreData.newReleases : localAlbums;
  const curated = playlists.length ? playlists.slice(0, 4) : [];

  const surprise = () => {
    const pool = exploreData.trending.length > 0 ? exploreData.trending : Object.values(trackById);
    if (pool.length > 0) {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      if (pick) playQueue([pick, ...pool.filter((t) => t.id !== pick.id).slice(0, 15)], 0, "Surprise me");
    } else {
      navigate({ name: "search" });
    }
  };

  return (
    <div className="page-inner">
      <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end animate-fade-up">
        <div>
          <p className="eyebrow">Explore</p>
          <h1 className="page-title mt-2">Find the edge of your taste.</h1>
          <p className="mt-3 max-w-[470px] text-[12px] leading-relaxed text-[var(--muted)]">
            Every genre has a dark room and a bright window. Start somewhere unfamiliar — the catalogue is deeper
            than it looks.
          </p>
        </div>
        <button type="button" className="btn" onClick={surprise}>
          <Dices size={14} /> Surprise me
        </button>
      </div>

      {/* Trending tracks from YouTube Music */}
      {exploreData.trending.length > 0 && (
        <section className="mb-10 animate-fade-up">
          <SectionHeading
            title="Trending right now"
            subtitle="Top streamed tracks and viral hits."
            action="Play all"
            onAction={() => playQueue(exploreData.trending, 0, "Trending Right Now")}
          />
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 xl:grid-cols-6">
            {exploreData.trending.slice(0, 12).map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                queue={exploreData.trending}
                label="Trending Right Now"
              />
            ))}
          </div>
        </section>
      )}

      {/* New Releases & Albums */}
      {displayAlbums.length > 0 && (
        <section className="mb-10 animate-fade-up">
          <SectionHeading
            title="New albums & singles"
            subtitle="Fresh records, first listens."
            action="Browse all"
            onAction={() => navigate({ name: "search" })}
          />
          <div className="grid grid-cols-3 gap-x-4 gap-y-6 lg:grid-cols-6">
            {displayAlbums.slice(0, 12).map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        </section>
      )}

      {/* Genres */}
      <section className="mb-10 animate-fade-up" style={{ animationDelay: "60ms" }}>
        <SectionHeading title="Genres" subtitle="Browse by sonic landscape." />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {genres.map((genre, index) => (
            <GenreCard
              key={genre.id}
              genre={genre}
              className={cn("h-[166px] sm:h-[185px]", (index === 0 || index === 5 || index === 9) && "lg:col-span-2")}
            />
          ))}
        </div>
      </section>

      {/* Moods */}
      <section className="mb-10">
        <SectionHeading
          title="Mood radio"
          subtitle="A station for whatever the day turned into."
        />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {moods.map((mood) => (
            <MoodCard key={mood.id} mood={mood} />
          ))}
        </div>
      </section>

      {curated.length > 0 && (
        <section className="mb-10">
          <SectionHeading
            title="Your playlists"
            subtitle="From your library."
            action="Your playlists"
            onAction={() => navigate({ name: "library" })}
          />
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-4">
            {curated.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} />
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-4 rounded-2xl border border-[var(--line)] bg-[var(--hover)] p-6 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="eyebrow mb-2 flex items-center gap-1.5">
            <Sparkles size={11} /> Endless discovery
          </p>
          <h2 className="text-[24px] font-semibold tracking-[-0.04em]">Search across 100 million songs.</h2>
          <p className="mt-2 max-w-[520px] text-[11px] leading-relaxed text-[var(--muted)]">
            Explore trending charts, top albums, artists, moods and lossless music streams.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn"
            onClick={() => navigate({ name: "search" })}
          >
            <Play size={13} fill="currentColor" /> Open Search
          </button>
        </div>
      </section>
    </div>
  );
}
