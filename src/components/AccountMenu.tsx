import { useState } from "react";
import {
  BadgeCheck,
  Check,
  ChevronUp,
  LogOut,
  Plus,
  Settings2,
  UserPlus,
  Users,
} from "lucide-react";
import { useApp } from "../store";
import { cn } from "../lib/utils";
import { useOutsideClick } from "../lib/utils";

export function AccountMenu({ compact = false, direction = "down" }: { compact?: boolean; direction?: "up" | "down" }) {
  const {
    accounts,
    activeAccount,
    switchAccount,
    listeningProfile,
    setListeningProfile,
    openModal,
    navigate,
    pushToast,
  } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useOutsideClick<HTMLDivElement>(() => setOpen(false), open);

  const validAccounts = (accounts || []).filter(
    (a) => a && a.id && a.name && a.name !== "user@gmail.com" && a.email !== "user@gmail.com"
  );
  const displayAccounts = Array.from(
    new Map(validAccounts.map((a) => [a.handle || a.email || a.id, a])).values()
  );

  return (
    <div className="relative" ref={ref}>
      {compact ? (
        <button
          type="button"
          aria-label="Account menu"
          onClick={() => setOpen((value) => !value)}
          className="relative grid h-8 w-8 place-items-center rounded-full border border-[var(--line-strong)] bg-[var(--hover)] text-[11px] font-semibold text-[var(--ink)] transition hover:border-[var(--ink)]"
        >
          {activeAccount.initial}
          <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-[var(--canvas)] bg-[var(--ink)]" />
        </button>
      ) : (
        <button
          type="button"
          aria-label="Account menu"
          onClick={() => setOpen((value) => !value)}
          className={cn(
            "group flex w-full items-center gap-2.5 rounded-xl border border-transparent p-2 text-left transition-colors hover:border-[var(--line)] hover:bg-[var(--hover)]",
            open && "border-[var(--line)] bg-[var(--hover)]",
          )}
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--line-strong)] bg-[var(--hover)] text-[11px] font-semibold text-[var(--ink)]">
            {activeAccount.initial}
          </span>
          <span className="sidebar-account-copy min-w-0 flex-1">
            <span className="block truncate text-[11.5px] font-semibold text-[var(--ink)]">{activeAccount.name}</span>
            <span className="block truncate text-[9.5px] text-[var(--faint)]">
              {listeningProfile} · {activeAccount.plan}
            </span>
          </span>
          <span className="sidebar-account-copy grid h-6 w-6 place-items-center rounded-md text-[var(--faint)] group-hover:text-[var(--ink)]">
            <ChevronUp
              size={13}
              className={cn("transition-transform duration-200", !open && "rotate-180")}
            />
          </span>
        </button>
      )}

      {open && (
        <div
          className={cn(
            "absolute z-[100] w-[222px] overflow-hidden rounded-2xl border border-[var(--line-strong)] bg-[#18181b] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.85)] animate-scale-in",
            direction === "up" ? "bottom-[calc(100%+8px)] left-0" : "right-0 top-[calc(100%+8px)]",
          )}
        >
          <div className="flex items-center gap-3 rounded-xl p-3">
            <div className="grid h-11 w-11 place-items-center rounded-full border border-[var(--line-strong)] bg-gradient-to-br from-white/15 to-white/0 text-sm font-semibold">
              {activeAccount.initial}
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 truncate text-[12.5px] font-semibold">
                {activeAccount.name}
                <BadgeCheck size={13} className="text-[var(--ink)]" />
              </p>
              <p className="truncate text-[10.5px] text-[var(--faint)]">{activeAccount.email}</p>
            </div>
          </div>

          <div className="px-2 pb-1.5 pt-1">
            <p className="eyebrow mb-1.5">Listen as</p>
            <div className="flex gap-1.5">
              {(["Personal", "Brand"] as const).map((profile) => (
                <button
                  key={profile}
                  type="button"
                  onClick={() => setListeningProfile(profile)}
                  className={cn("chip flex-1 justify-center py-1 text-[11px]", listeningProfile === profile && "chip-active")}
                >
                  {profile}
                </button>
              ))}
            </div>
          </div>

          {displayAccounts.length > 0 && (
            <>
              <div className="menu-sep" />
              <p className="eyebrow px-2.5 pb-1 pt-1.5">Switch account</p>
              {displayAccounts.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  className="menu-item"
                  onClick={() => {
                    switchAccount(account.id);
                    setOpen(false);
                  }}
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[var(--line)] text-[9px] font-semibold">
                    {account.initial}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{account.name}</span>
                    <span className="block truncate text-[9px] text-[var(--faint)]">{account.email}</span>
                  </span>
                  {activeAccount.id === account.id && <Check size={13} className="text-[var(--ink)]" />}
                </button>
              ))}
            </>
          )}

          <div className="menu-sep" />
          <button
            type="button"
            className="menu-item"
            onClick={() => {
              setOpen(false);
              openModal("add-account");
            }}
          >
            <UserPlus size={14} /> Add account
          </button>
          <button
            type="button"
            className="menu-item"
            onClick={() => {
              setOpen(false);
              navigate({ name: "settings" });
            }}
          >
            <Settings2 size={14} /> Settings
          </button>
          <button
            type="button"
            className="menu-item"
            onClick={() => {
              setOpen(false);
              openModal("party");
            }}
          >
            <Users size={14} /> Listen together
          </button>
          <button
            type="button"
            className="menu-item"
            onClick={() => {
              setOpen(false);
              pushToast("Signed out", "This is a local demo profile");
            }}
          >
            <LogOut size={14} /> Sign out
          </button>
          <div className="px-2 pb-1 pt-1 text-[9px] text-[var(--faint)]">
            <span className="flex items-center gap-1">
              <BadgeCheck size={10} /> {activeAccount.plan} · YouTube Music connected
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function AddAccountShortcut() {
  const { openModal } = useApp();
  return (
    <button
      type="button"
      onClick={() => openModal("add-account")}
      className="menu-item"
      aria-label="Add account"
    >
      <Plus size={14} /> Add account
    </button>
  );
}
