import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Key,
  Loader2,
  Lock,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useApp } from "../../store";
import { Modal } from "./Modal";
import type { ChordlyDesktopBridge } from "../../desktop";

declare global {
  interface Window {
    chordlyDesktop?: ChordlyDesktopBridge;
  }
}

/* ------------------------------------------------------------------ */
/*  Add / Manage Accounts                                              */
/* ------------------------------------------------------------------ */

export function AccountModal() {
  const { closeModal, pushToast, refreshAccounts, refreshPlaylists } = useApp();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [showCookie, setShowCookie] = useState(false);
  const [cookieInput, setCookieInput] = useState("");
  const [cookieLoading, setCookieLoading] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const list =
        (await window.chordly?.listAccounts?.()) ||
        (await window.chordlyDesktop?.accounts.list?.());
      setAccounts(list || []);
    } catch (error) {
      console.error("Failed to load accounts:", error);
    }
  };

  const handleAddAccount = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const account = window.chordly?.addAccount
        ? await window.chordly.addAccount()
        : await window.chordlyDesktop?.accounts.add?.("youtube");
      pushToast("Account added", `${account?.name || account?.email || "Connected"}`, "success");
      await refreshAccounts();
      if (account?.id) {
        await refreshPlaylists(account.id);
      }
      closeModal();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Authentication failed";
      pushToast("Error", msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddWithCookie = async () => {
    if (!cookieInput.trim()) {
      pushToast("Cookie required", "Please paste your YouTube Music cookie string", "error");
      return;
    }
    setCookieLoading(true);
    try {
      const fn =
        window.chordly?.addAccountWithCookie ||
        window.chordlyDesktop?.accounts?.addCookie;
      if (!fn) {
        throw new Error("Cookie import not available in this environment");
      }
      const account = await fn(cookieInput.trim());
      pushToast("Account connected", account?.name || account?.email || "Connected via cookies", "success");
      await refreshAccounts();
      if (account?.id) {
        await refreshPlaylists(account.id);
      }
      closeModal();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to import cookies";
      pushToast("Error", msg, "error");
    } finally {
      setCookieLoading(false);
    }
  };

  const handleRemoveAccount = async (accountId: string) => {
    try {
      if (window.chordly?.removeAccount) {
        await window.chordly.removeAccount(accountId);
      } else {
        await window.chordlyDesktop?.accounts.remove?.(accountId);
      }
      setAccounts(accounts.filter((a) => a.id !== accountId));
      await refreshAccounts();
      pushToast("Account removed");
    } catch (error) {
      pushToast("Error", "Failed to remove account", "error");
    }
  };

  return (
    <Modal
      title={accounts.length === 0 ? "Add your YouTube Music account" : "Your accounts"}
      eyebrow="Accounts"
      description={
        accounts.length === 0
          ? "Sign in with Google to sync your YouTube Music library and playlists."
          : `You have ${accounts.length} account${accounts.length !== 1 ? "s" : ""} connected.`
      }
      onClose={closeModal}
      size="md"
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-[9.5px] text-[var(--faint)]">
            <Lock size={11} />
            Cookies stored locally on this device
          </span>
          <div className="flex gap-2">
            <button className="btn btn-sm" onClick={closeModal} type="button">
              Done
            </button>
            {accounts.length === 0 && (
              <button
                className="btn btn-sm btn-primary"
                type="button"
                disabled={loading}
                onClick={handleAddAccount}
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                {loading ? "Signing in…" : "Add YouTube Music"}
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        {accounts.length === 0 ? (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--hover)] p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-full border border-[var(--line-strong)] bg-[var(--canvas)] text-[15px] font-bold tracking-[-0.08em]">
                G
              </span>
              <div>
                <p className="text-[11px] font-medium">Sign in with Google</p>
                <p className="text-[9px] text-[var(--faint)]">to YouTube Music</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 rounded-xl border border-[var(--line)] p-3">
              <ShieldCheck size={14} className="mt-0.5 shrink-0 text-[var(--muted)]" />
              <p className="text-[9px] leading-relaxed text-[var(--faint)]">
                Chordly extracts session cookies from your Google login to authenticate with YouTube Music. No password stored, no OAuth screen.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between rounded-lg border border-[var(--line)] p-3 hover:bg-[var(--hover)]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold"
                    style={{ backgroundColor: account.color }}
                  >
                    {account.initial}
                  </div>
                  <div>
                    <p className="text-[11px] font-medium">{account.email}</p>
                    <p className="text-[9px] text-[var(--faint)]">
                      {account.brandAccounts?.length > 0 && `${account.brandAccounts.length} brand accounts`}
                      {!account.brandAccounts?.length && "Personal account"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveAccount(account.id)}
                  className="p-1 hover:bg-[var(--line)] rounded transition"
                  title="Remove account"
                >
                  <Trash2 size={14} className="text-[var(--muted)]" />
                </button>
              </div>
            ))}
            <button
              onClick={handleAddAccount}
              disabled={loading}
              className="w-full mt-3 btn btn-sm btn-primary"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
              {loading ? "Signing in…" : "Add another account"}
            </button>
          </div>
        )}

        {/* Manual Cookie Import Fallback */}
        <div className="pt-2 border-t border-[var(--line)]">
          <button
            type="button"
            onClick={() => setShowCookie((v) => !v)}
            className="flex items-center justify-between w-full text-left py-1.5 text-[10px] text-[var(--muted)] hover:text-[var(--foreground)] transition font-medium"
          >
            <span className="flex items-center gap-1.5">
              <Key size={12} />
              <span>Alternative: Paste YouTube Music Cookie</span>
            </span>
            {showCookie ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {showCookie && (
            <div className="mt-2 space-y-3 p-3.5 rounded-xl border border-[var(--line)] bg-[var(--canvas)]">
              <div>
                <p className="text-[10px] font-semibold text-[var(--ink)]">Quick Cookie Guide (Bypasses Google Blocks):</p>
                <ol className="mt-1.5 space-y-1 text-[9.5px] text-[var(--muted)] list-decimal list-inside leading-relaxed">
                  <li>
                    Open{" "}
                    <button
                      type="button"
                      onClick={() => {
                        const bridge = (window as any).chordlyDesktop ?? (window as any).chordly;
                        if (bridge?.openExternal) void bridge.openExternal("https://music.youtube.com");
                        else window.open("https://music.youtube.com", "_blank");
                      }}
                      className="underline text-[var(--ink)] hover:text-amber-400 inline-flex items-center gap-0.5 font-medium"
                    >
                      music.youtube.com <ExternalLink size={9} />
                    </button>{" "}
                    in your regular browser (Chrome, Edge, etc.)
                  </li>
                  <li>
                    Press <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-[8.5px]">F12</kbd> &rarr; Click <strong>Console</strong>
                  </li>
                  <li>
                    Paste{" "}
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText("copy(document.cookie)").catch(() => {});
                        pushToast("Copied command", "copy(document.cookie) copied to clipboard", "success");
                      }}
                      className="font-mono text-[9px] bg-white/10 hover:bg-white/20 px-1.5 py-0.5 rounded text-[var(--ink)] inline-flex items-center gap-1 font-bold"
                      title="Click to copy snippet"
                    >
                      <code>copy(document.cookie)</code>
                      <Copy size={9} />
                    </button>{" "}
                    and press <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-[8.5px]">Enter</kbd>
                  </li>
                  <li>Paste the copied text into the box below and click Connect</li>
                </ol>
              </div>

              <textarea
                value={cookieInput}
                onChange={(e) => setCookieInput(e.target.value)}
                placeholder="Paste cookie string here (e.g. SAPISID=...; HSID=...)"
                rows={3}
                className="w-full text-[10px] font-mono bg-[var(--hover)] border border-[var(--line)] rounded-lg p-2 resize-none focus:outline-none focus:border-[var(--foreground)]"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={cookieLoading || !cookieInput.trim()}
                  onClick={handleAddWithCookie}
                  className="btn btn-sm btn-primary"
                >
                  {cookieLoading ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                  {cookieLoading ? "Connecting…" : "Connect with Cookie"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Party Modal (Listen Together)                                      */
/* ------------------------------------------------------------------ */

export function PartyModal() {
  const {
    closeModal,
    pushToast,
    partyRoom,
    startPartyHost,
    joinPartyRoom,
    leaveParty,
  } = useApp();

  const [mode, setMode] = useState<"create" | "join">("create");
  const [joinCode, setJoinCode] = useState("");
  const [hostIp, setHostIp] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await startPartyHost();
      pushToast("Party created", `Room code: ${res?.roomCode || ""}`, "success");
    } catch {
      pushToast("Failed to create party", "", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) {
      pushToast("Room code required", "Enter a 6-character room code", "error");
      return;
    }
    setLoading(true);
    try {
      await joinPartyRoom(joinCode.trim(), hostIp.trim() || undefined);
      pushToast("Joined party room", `Code: ${joinCode.toUpperCase()}`, "success");
    } catch {
      pushToast("Failed to join party", "Check code or host IP", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!partyRoom?.roomCode) return;
    try {
      await navigator.clipboard.writeText(partyRoom.roomCode);
      setCopied(true);
      pushToast("Invite code copied", partyRoom.roomCode, "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <Modal
      title="Listen together"
      eyebrow="Party mode"
      description={
        partyRoom
          ? "You are listening together in real time."
          : "Host a party or join friends on your network to listen to music in perfect sync."
      }
      onClose={closeModal}
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          {partyRoom ? (
            <button
              type="button"
              className="btn btn-sm text-[var(--danger)] hover:bg-[var(--danger)]/10"
              onClick={() => {
                leaveParty();
                pushToast("Left party");
              }}
            >
              Leave party
            </button>
          ) : (
            <div />
          )}
          <button className="btn btn-sm" onClick={closeModal} type="button">
            Done
          </button>
        </div>
      }
    >
      {partyRoom ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--line-strong)] bg-gradient-to-br from-white/[0.06] via-[var(--canvas)] to-[var(--hover)] p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {partyRoom.isHost ? "Host" : "Guest"}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                  ⚡ {partyRoom.pingMs || 1} ms
                </span>
                <span className="text-[10px] text-[var(--muted)]">
                  👥 {partyRoom.memberCount} member{partyRoom.memberCount !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            <p className="text-[10px] text-[var(--faint)] uppercase tracking-wider mb-1">Room Code</p>
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-3xl font-extrabold tracking-widest text-white">
                {partyRoom.roomCode}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="btn btn-sm flex items-center gap-1.5"
              >
                {copied ? "Copied!" : "Copy code"}
              </button>
            </div>

            <div className="mt-3 pt-3 border-t border-[var(--line)] flex items-center justify-between text-[10px] text-[var(--faint)]">
              <span>Host IP / LAN:</span>
              <span className="font-mono text-[var(--muted)]">{partyRoom.hostIp}:39420</span>
            </div>
          </div>

          <p className="text-[11px] text-[var(--muted)] leading-relaxed text-center">
            Playback, play/pause, seeks, and queue changes will sync automatically to all party members.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex rounded-xl border border-[var(--line)] bg-[var(--hover)] p-1">
            <button
              type="button"
              onClick={() => setMode("create")}
              className={`flex-1 rounded-lg py-1.5 text-[11px] font-medium transition ${
                mode === "create" ? "bg-[var(--canvas)] text-[var(--foreground)] shadow-sm" : "text-[var(--faint)]"
              }`}
            >
              Host a Party
            </button>
            <button
              type="button"
              onClick={() => setMode("join")}
              className={`flex-1 rounded-lg py-1.5 text-[11px] font-medium transition ${
                mode === "join" ? "bg-[var(--canvas)] text-[var(--foreground)] shadow-sm" : "text-[var(--faint)]"
              }`}
            >
              Join a Party
            </button>
          </div>

          {mode === "create" ? (
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--hover)] p-5 space-y-3">
              <div>
                <h4 className="text-[12px] font-semibold text-[var(--foreground)]">Start a Listening Room</h4>
                <p className="text-[10px] text-[var(--faint)] mt-0.5 leading-relaxed">
                  Creates a room with a 6-character invite code. Friends on your network can connect and listen together in real time.
                </p>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={handleCreate}
                className="w-full btn btn-sm btn-primary"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : null}
                {loading ? "Starting server…" : "Create room"}
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--hover)] p-5 space-y-3">
              <div>
                <label className="text-[10.5px] font-medium text-[var(--foreground)]">
                  Room Invite Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="e.g. CHRD88"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3 py-2 text-center text-lg font-mono font-bold tracking-widest text-[var(--foreground)] focus:outline-none focus:border-[var(--foreground)] uppercase"
                />
              </div>

              <div>
                <label className="text-[10px] text-[var(--faint)]">
                  Host LAN IP (Optional, defaults to local network)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 192.168.1.50 or localhost"
                  value={hostIp}
                  onChange={(e) => setHostIp(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--canvas)] px-3 py-1.5 text-[11px] font-mono text-[var(--muted)] focus:outline-none"
                />
              </div>

              <button
                type="button"
                disabled={loading || !joinCode.trim()}
                onClick={handleJoin}
                className="w-full btn btn-sm btn-primary"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : null}
                {loading ? "Connecting…" : "Join Room"}
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
