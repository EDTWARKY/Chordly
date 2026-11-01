import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

export function Modal({
  title,
  eyebrow,
  description,
  children,
  footer,
  onClose,
  size = "md",
  bodyClassName,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  size?: "sm" | "md" | "lg" | "xl";
  bodyClassName?: string;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const widths = {
    sm: "max-w-[440px]",
    md: "max-w-[560px]",
    lg: "max-w-[720px]",
    xl: "max-w-[900px]",
  };

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={cn("modal flex max-h-[min(88vh,860px)] flex-col", widths[size])} role="dialog" aria-modal="true">
        <header className="flex shrink-0 items-start justify-between gap-5 px-6 pb-4 pt-6">
          <div className="min-w-0">
            {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
            <h2 className="text-[21px] font-semibold tracking-[-0.035em] text-[var(--ink)]">{title}</h2>
            {description && (
              <p className="mt-1.5 max-w-[440px] text-[11.5px] leading-relaxed text-[var(--muted)]">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[var(--muted)] transition hover:bg-[var(--hover)] hover:text-[var(--ink)]"
          >
            <X size={16} />
          </button>
        </header>
        <div className={cn("scrollbar min-h-0 flex-1 overflow-y-auto px-6 pb-5", bodyClassName)}>{children}</div>
        {footer && <footer className="shrink-0 border-t border-[var(--line)] px-6 py-4">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
