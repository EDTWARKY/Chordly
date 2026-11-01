import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  ChevronRight,
  Download,
  FolderOpen,
  Heart,
  ListEnd,
  ListPlus,
  MoreHorizontal,
  Play,
  Plus,
  Share2,
  UserRound,
  Disc3,
  Trash2,
  Activity,
  Sparkles,
} from "lucide-react";
import { useApp } from "../store";
import type { Track } from "../types";
import { cn } from "../lib/utils";

interface TrackMenuProps {
  track: Track;
  queue?: Track[];
  queueLabel?: string;
  triggerClassName?: string;
  trigger?: ReactNode;
  size?: number;
}

export function TrackMenu({ track, queue, queueLabel, triggerClassName, trigger, size = 16 }: TrackMenuProps) {
  const {
    openModal,
    pushToast,
    playNext,
    addToQueue,
    isLiked,
    toggleLike,
    isDownloaded,
    toggleDownload,
    addTrackToPlaylist,
    playlists,
    navigate,
    revealLocalTrack,
    setNerdsStatsOpen,
    upgradeTrackToLossless,
    openShare,
  } = useApp();
  const [open, setOpen] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) {
      setReady(false);
      setPlaylistOpen(false);
      return;
    }
    const button = triggerRef.current;
    const menu = menuRef.current;
    if (!button || !menu) return;
    const buttonRect = button.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    let left = buttonRect.right - menuRect.width;
    let top = buttonRect.bottom + 7;
    if (left < 10) left = 10;
    if (left + menuRect.width > window.innerWidth - 10) left = window.innerWidth - menuRect.width - 10;
    if (top + menuRect.height > window.innerHeight - 10) top = buttonRect.top - menuRect.height - 7;
    if (top < 10) top = 10;
    setPosition({ top, left });
    setReady(true);
  }, [open, playlistOpen]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !triggerRef.current?.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  const act = (callback: () => void) => {
    setOpen(false);
    callback();
  };

  const liked = isLiked(track);
  const downloaded = isDownloaded(track);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`More options for ${track.title}`}
        className={cn(
          "grid h-7 w-7 place-items-center rounded-full text-[var(--muted)] transition-all hover:bg-[var(--hover)] hover:text-[var(--ink)]",
          triggerClassName,
        )}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        {trigger ?? <MoreHorizontal size={size} />}
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="menu fixed"
            style={{
              top: position.top,
              left: position.left,
              opacity: ready ? 1 : 0,
              zIndex: 130,
            }}
            role="menu"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 px-2.5 pb-2 pt-2">
              <img src={track.cover} alt="" className="h-8 w-8 rounded-md object-cover" />
              <div className="min-w-0">
                <p className="truncate text-[11.5px] font-semibold text-[var(--ink)]">{track.title}</p>
                <p className="truncate text-[10px] text-[var(--faint)]">{track.artist}</p>
              </div>
            </div>
            <div className="menu-sep" />
            <button className="menu-item" onClick={() => act(() => playNext(track))}>
              <ListEnd size={14} /> Play next
            </button>
            <button className="menu-item" onClick={() => act(() => addToQueue(track))}>
              <ListPlus size={14} /> Add to queue
            </button>
            <button className="menu-item" onClick={() => act(() => toggleLike(track))}>
              <Heart size={14} className={liked ? "fill-current" : ""} />
              {liked ? "Remove from Liked Music" : "Add to Liked Music"}
            </button>
            <button
              className="menu-item justify-between"
              onClick={(event) => {
                event.stopPropagation();
                setPlaylistOpen((value) => !value);
              }}
            >
              <span className="flex items-center gap-2.5">
                <Plus size={14} /> Add to playlist
              </span>
              {playlistOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>
            {playlistOpen && (
              <div className="mb-1 ml-3 border-l border-[var(--line)] pl-1.5">
                {playlists.slice(0, 5).map((playlist) => (
                  <button
                    key={playlist.id}
                    className="menu-item"
                    onClick={() => act(() => addTrackToPlaylist(playlist.id, track))}
                  >
                    <span className="grid h-5 w-5 shrink-0 place-items-center overflow-hidden rounded">
                      <img src={playlist.cover} alt="" className="h-full w-full object-cover" />
                    </span>
                    <span className="truncate">{playlist.name}</span>
                  </button>
                ))}
                <button
                  className="menu-item"
                  onClick={() => act(() => openModal("create-playlist"))}
                >
                  <span className="grid h-5 w-5 place-items-center rounded border border-[var(--line)]">
                    <Plus size={11} />
                  </span>
                  New playlist
                </button>
              </div>
            )}
            {!track.local && (
              <button className="menu-item" onClick={() => act(() => toggleDownload(track))}>
                {downloaded ? <Trash2 size={14} /> : <Download size={14} />}
                {downloaded ? "Remove download" : "Download"}
              </button>
            )}
            <div className="menu-sep" />
            {track.local ? (
              <button className="menu-item" onClick={() => act(() => revealLocalTrack(track))}>
                <FolderOpen size={14} /> Show in File Explorer
              </button>
            ) : (
              <>
                <button
                  className="menu-item"
                  onClick={() =>
                    act(() =>
                      navigate({
                        name: "collection",
                        kind: "artist",
                        id: track.artistId,
                        title: track.artist,
                        cover: track.cover,
                      }),
                    )
                  }
                >
                  <UserRound size={14} /> Go to artist
                </button>
                <button
                  className="menu-item"
                  onClick={() =>
                    act(() =>
                      navigate({
                        name: "collection",
                        kind: "album",
                        id: track.albumId,
                        title: track.album,
                        artist: track.artist,
                        cover: track.cover,
                      }),
                    )
                  }
                >
                  <Disc3 size={14} /> Go to album
                </button>
              </>
            )}
            <button
              className="menu-item"
              onClick={() =>
                act(() => {
                  openShare({ track });
                })
              }
            >
              <Share2 size={14} /> Share
            </button>
            {!track.lossless && track.format !== "flac" && (
              <button
                className="menu-item text-emerald-400 hover:text-emerald-300 font-semibold"
                onClick={() =>
                  act(() => {
                    void upgradeTrackToLossless(track);
                  })
                }
              >
                <Sparkles size={14} className="text-emerald-400" /> Find lossless on addons
              </button>
            )}
            <button
              className="menu-item"
              onClick={() =>
                act(() => {
                  setNerdsStatsOpen(true);
                })
              }
            >
              <Activity size={14} /> Stats for nerds
            </button>
            {queue && queue.length > 0 && (
              <>
                <div className="menu-sep" />
                <button
                  className="menu-item"
                  onClick={() =>
                    act(() => {
                      pushToast(`Playing from ${queueLabel ?? "queue"}`, `${queue.length} tracks`);
                    })
                  }
                >
                  <Play size={14} /> Play in context
                </button>
              </>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
