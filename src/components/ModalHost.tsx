import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useApp } from "../store";
import { CreatePlaylistModal } from "./modals/CreatePlaylistModal";
import { ImportModal } from "./modals/ImportModal";
import { AccountModal, PartyModal } from "./modals/AccountPartyModals";
import { ShareModal } from "./modals/ShareModal";
import { AddAddonModal, AboutModal, NetworkShareModal, ShortcutsModal } from "./modals/SourcesInfoModals";
import { ReportBugModal } from "./modals/ReportBugModal";
import { StatsForNerdsModal } from "./StatsForNerdsModal";

export function ModalHost() {
  const { modal, nerdsStatsOpen, shareTarget } = useApp();

  return (
    <>
      {(nerdsStatsOpen || modal === "stats-for-nerds") && <StatsForNerdsModal />}
      {(() => {
        switch (modal) {
          case "import":
            return <ImportModal />;
          case "create-playlist":
            return <CreatePlaylistModal />;
          case "add-account":
            return <AccountModal />;
          case "party":
            return <PartyModal />;
          case "share":
            return <ShareModal track={shareTarget?.track} playlist={shareTarget?.playlist} />;
          case "add-addon":
            return <AddAddonModal />;
          case "network-share":
            return <NetworkShareModal />;
          case "about":
            return <AboutModal />;
          case "shortcuts":
            return <ShortcutsModal />;
          case "report-bug":
            return <ReportBugModal />;
          default:
            return null;
        }
      })()}
    </>
  );
}

export function ToastHost() {
  const { toasts, dismissToast } = useApp();
  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed bottom-[100px] left-4 z-[140] flex w-[320px] flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-3 rounded-xl border border-[var(--line-strong)] bg-[var(--glass-strong)] px-3.5 py-3 shadow-[var(--shadow)] backdrop-blur-2xl animate-fade-up"
        >
          <span className="mt-0.5 text-[var(--ink)]">
            {toast.tone === "error" ? (
              <AlertCircle size={15} />
            ) : toast.tone === "success" ? (
              <CheckCircle2 size={15} />
            ) : (
              <Info size={15} />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11.5px] font-semibold leading-tight">{toast.title}</p>
            {toast.description && (
              <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-[var(--muted)]">{toast.description}</p>
            )}
          </div>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => dismissToast(toast.id)}
            className="mt-0.5 grid h-5 w-5 place-items-center rounded text-[var(--faint)] transition hover:bg-[var(--hover)] hover:text-[var(--ink)]"
          >
            <X size={11} />
          </button>
        </div>
      ))}
    </div>
  );
}
