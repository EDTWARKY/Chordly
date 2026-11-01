import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ArrowRight, MoreHorizontal } from "lucide-react";
import { cn } from "../lib/utils";

export function IconButton({
  label,
  active,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "grid place-items-center rounded-full text-[var(--muted)] transition-all duration-200 hover:bg-[var(--hover)] hover:text-[var(--ink)] active:scale-95 disabled:opacity-30",
        active && "bg-[var(--active)] text-[var(--ink)]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function SectionHeading({
  title,
  subtitle,
  action,
  onAction,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-4", className)}>
      <div>
        <h2 className="section-title text-[var(--ink)]">{title}</h2>
        {subtitle && <p className="mt-1 text-[12.5px] text-[var(--muted)]">{subtitle}</p>}
      </div>
      {action && (
        <button
          type="button"
          onClick={onAction}
          className="group flex shrink-0 items-center gap-1.5 text-[11.5px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
        >
          {action}
          <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-0.5" />
        </button>
      )}
    </div>
  );
}

export function ThreeDots({ className }: { className?: string }) {
  return <MoreHorizontal size={16} className={className} />;
}

export function Equalizer({ paused = false }: { paused?: boolean }) {
  return (
    <span className="flex h-3 items-end gap-[2px]" aria-label={paused ? "Paused" : "Playing"}>
      {[0.15, 0.5, 0.32, 0.72].map((delay, index) => (
        <span
          key={index}
          className="equalizer-bar"
          style={{
            animationDelay: `${delay}s`,
            animationPlayState: paused ? "paused" : "running",
            transform: paused ? "translate3d(0, 0, 0) scaleY(0.4)" : undefined,
            opacity: 0.9,
          }}
        />
      ))}
    </span>
  );
}

export function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-[var(--line)] px-2 py-[2px] text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]",
        className,
      )}
    >
      {children}
    </span>
  );
}
