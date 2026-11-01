import { Minus, Square, X } from "lucide-react";
import { useApp } from "../store";
import { getDesktopBridge } from "../desktop";

type TauriWindow = {
  minimize?: () => Promise<void>;
  toggleMaximize?: () => Promise<void>;
  close?: () => Promise<void>;
};

function getTauriWindow(): TauriWindow | null {
  const tauri = (window as unknown as { __TAURI__?: { window?: { getCurrentWindow?: () => TauriWindow } } }).__TAURI__;
  try {
    return tauri?.window?.getCurrentWindow?.() ?? null;
  } catch {
    return null;
  }
}

export function TitleBar() {
  const { pushToast } = useApp();
  const desktop = getDesktopBridge();

  const minimize = async () => {
    if (desktop) {
      await desktop.window.minimize();
      return;
    }
    const tauri = getTauriWindow();
    if (tauri?.minimize) {
      await tauri.minimize();
      return;
    }
    pushToast("Minimize", "Window controls activate in the desktop build");
  };

  const maximize = async () => {
    if (desktop) {
      await desktop.window.toggleMaximize();
      return;
    }
    const tauri = getTauriWindow();
    if (tauri?.toggleMaximize) {
      await tauri.toggleMaximize();
      return;
    }
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      pushToast("Maximize", "Fullscreen is not available in this window");
    }
  };

  const close = async () => {
    if (desktop) {
      await desktop.window.close();
      return;
    }
    const tauri = getTauriWindow();
    if (tauri?.close) {
      await tauri.close();
      return;
    }
    window.close();
    pushToast("Close", "Window controls activate in the desktop build");
  };

  return (
    <div
      className="titlebar"
      data-tauri-drag-region
      onDoubleClick={desktop ? undefined : maximize}
    >
      <div className="flex-1 h-full" data-tauri-drag-region />
      <div className="flex h-full items-stretch" onDoubleClick={(event) => event.stopPropagation()} style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
        <button className="win-btn" aria-label="Minimize window" title="Minimize" onClick={minimize} style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          <Minus size={14} strokeWidth={1.6} />
        </button>
        <button className="win-btn" aria-label="Maximize window" title="Maximize" onClick={maximize} style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          <Square size={11} strokeWidth={1.5} />
        </button>
        <button className="win-btn win-close" aria-label="Close window" title="Close" onClick={close} style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          <X size={15} strokeWidth={1.6} />
        </button>
      </div>
    </div>
  );
}
