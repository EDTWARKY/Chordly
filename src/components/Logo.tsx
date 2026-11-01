import { cn } from "../lib/utils";

export function ChordlyMark({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Outer C-Arc */}
      <path
        d="M 389 135 A 190 190 0 1 0 389 377"
        stroke="currentColor"
        strokeWidth="24"
        strokeLinecap="round"
      />
      {/* Middle C-Arc with 3 Orbital Chord Nodes */}
      <path
        d="M 358 166 A 148 148 0 1 0 358 346"
        stroke="currentColor"
        strokeWidth="24"
        strokeLinecap="round"
      />
      {/* Inner C-Arc */}
      <path
        d="M 328 196 A 106 106 0 1 0 328 316"
        stroke="currentColor"
        strokeWidth="24"
        strokeLinecap="round"
      />
      {/* 3 Orbital Dots on Middle Ring */}
      <circle cx="205" cy="117" r="19" fill="currentColor" />
      <circle cx="305" cy="117" r="19" fill="currentColor" />
      <circle cx="152" cy="361" r="19" fill="currentColor" />
      {/* Rounded Center Play Triangle */}
      <path
        d="M 232 204 L 316 256 L 232 308 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="20"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChordlyLogo({
  className,
  markClass = "h-[30px] w-[30px]",
  wordClass = "text-[25px]",
}: {
  className?: string;
  markClass?: string;
  wordClass?: string;
}) {
  return (
    <div className={cn("flex items-center gap-[9px]", className)}>
      <ChordlyMark className={cn("text-[var(--ink)]", markClass)} />
      <span
        className={cn(
          "logo-word leading-none font-semibold tracking-[-0.065em] text-[var(--ink)]",
          wordClass,
        )}
      >
        chordly
      </span>
    </div>
  );
}
