import React from "react";

interface ChordlyLogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}

export const ChordlyLogo: React.FC<ChordlyLogoProps> = ({
  size = 36,
  showWordmark = false,
  className = "",
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer C-Arc (295 deg to 65 deg counter-clockwise) */}
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
      {showWordmark && (
        <span className="font-sans font-bold tracking-tight text-current lowercase text-xl">
          chordly
        </span>
      )}
    </div>
  );
};
