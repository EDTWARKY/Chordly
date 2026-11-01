import { useState } from "react";
import { Check, Cloud, Plus } from "lucide-react";
import { useApp } from "../../store";
import { cover } from "../../data";
import { cn } from "../../lib/utils";
import { Modal } from "./Modal";

const coverChoices = [8, 4, 9, 7, 5, 12, 2, 1];

export function CreatePlaylistModal() {
  const { closeModal, createPlaylist, navigate, pushToast } = useApp();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCover, setSelectedCover] = useState(coverChoices[0]);
  const [sync, setSync] = useState(true);

  const create = () => {
    if (!name.trim()) {
      pushToast("Give your playlist a name", undefined, "error");
      return;
    }
    const id = createPlaylist(name, description, cover(selectedCover));
    closeModal();
    navigate({ name: "collection", kind: "playlist", id, title: name.trim() });
  };

  return (
    <Modal
      title="New playlist"
      eyebrow="Your library"
      description="Start a fresh collection. Chordly can mirror it to your YouTube Music account automatically."
      onClose={closeModal}
      size="md"
      footer={
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-[10px] text-[var(--faint)]">
            <Cloud size={12} />
            {sync ? "Will sync to YouTube Music" : "Local playlist only"}
          </span>
          <div className="flex gap-2">
            <button type="button" className="btn btn-sm" onClick={closeModal}>
              Cancel
            </button>
            <button type="button" className="btn btn-sm btn-primary" onClick={create}>
              <Plus size={13} /> Create playlist
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5 pb-1 sm:flex-row">
        <div className="w-full shrink-0 sm:w-[156px]">
          <div className="aspect-square overflow-hidden rounded-xl border border-[var(--line)]">
            <img src={cover(selectedCover)} alt="Playlist cover" className="h-full w-full object-cover" />
          </div>
          <div className="mt-2.5 grid grid-cols-4 gap-1.5">
            {coverChoices.map((choice) => (
              <button
                key={choice}
                type="button"
                aria-label={`Use cover ${choice}`}
                onClick={() => setSelectedCover(choice)}
                className={cn(
                  "relative aspect-square overflow-hidden rounded-md border transition",
                  selectedCover === choice ? "border-[var(--ink)]" : "border-transparent opacity-60 hover:opacity-100",
                )}
              >
                <img src={cover(choice)} alt="" className="h-full w-full object-cover" />
                {selectedCover === choice && (
                  <span className="absolute inset-0 grid place-items-center bg-black/40 text-white">
                    <Check size={10} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-3.5">
          <label className="block">
            <span className="mb-1.5 block text-[10.5px] font-medium text-[var(--muted)]">Playlist name</span>
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") create();
              }}
              placeholder="Late night, early morning…"
              className="text-input"
              maxLength={60}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10.5px] font-medium text-[var(--muted)]">Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is this playlist for?"
              className="text-input textarea"
              maxLength={180}
            />
          </label>
          <div className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--hover)] px-3 py-2.5">
            <span>
              <span className="block text-[11px] font-medium">Two-way YouTube Music sync</span>
              <span className="block text-[9.5px] text-[var(--faint)]">Edits appear on both sides within seconds</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={sync}
              data-on={sync}
              className="toggle"
              onClick={() => setSync((value) => !value)}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
