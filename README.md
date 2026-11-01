# Chordly

<p align="center">
  <strong>A high-performance, frosted-glass music player for Windows.</strong><br>
  Built with Electron, React 18, TypeScript, and Tailwind CSS.
</p>

---

## Overview

Chordly is a modern desktop music application featuring a native frameless frosted-glass interface, custom titlebar, local library indexing, multi-source streaming, and real-time audio processing. Engineered with an extreme low-resource footprint (<1% idle CPU and aggressive V8 memory capping), Chordly delivers seamless playback for both local audiophile files and cloud streams.

---

## Key Features

- **Streaming & Addons**: Direct YouTube Music streaming via Innertube, Addon stream integration (Lossless Bridge, Qobuz, Tidal), and public metadata resolution.
- **Local Music Playback**: Recursive folder scanning with native tag extraction (FLAC, MP3, M4A, ALAC, WAV, Opus, OGG, AIFF). Displays accurate bit depth, sample rates, and embedded high-resolution cover art.
- **Ultra-Low Resource Architecture**:
  - Direct DOM progress synchronization bypassing React re-render cycles.
  - V8 heap capped at 128MB with automatic audio buffer flushing on track change.
  - Auto-throttled GPU render loop and background pause for sub-1% CPU idle footprint.
- **Synchronized Lyrics**: Millisecond-accurate LRC synchronized lyrics powered by BetterLyrics, Musixmatch, LRCLIB, Genius, KuGou, and Unison.
- **Discord Rich Presence**: Native Discord IPC integration displaying current track, artist, album art, and live elapsed playback timestamps.
- **Audio DSP & Equalizer**: Real-time 7-band parametric equalizer, loudness normalization, and stereo sound profile enhancements.
- **Listen Together (Party Mode)**: Local-network WebSocket listening rooms to broadcast synchronized playback state with friends.
- **Customizable Appearance**: Dynamic album art ambient glow, customizable wallpapers, adjustable blur, opacity, and pure dark mode.
- **In-App Bug Reporter**: Direct issue and diagnostics delivery to the development Discord webhook.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- [npm](https://www.npmjs.com/) (bundled with Node.js)
- Windows 10 or Windows 11

### Installation

Clone the repository and install dependencies:

```powershell
git clone <repository-url>
cd Chordly
npm install
```

---

## Development & Build Commands

| Command | Description |
| --- | --- |
| `npm run desktop` | Compiles the frontend and launches the Electron desktop app. |
| `npm run dev` | Starts the Vite development server with Hot Module Replacement (HMR). |
| `npm run build` | Runs TypeScript type checking (`tsc -b`) and bundles production assets via Vite. |
| `npm run preview` | Locally preview the production Vite build in the browser. |
| `npm run pack` | Packages an unpacked Windows executable in `release/win-unpacked/` for testing. |
| `npm run dist` | Generates the complete Windows NSIS installer and standalone portable `.exe` in `release/`. |
| `npm run clean-reset` | Clears development caches and resets local session state. |

---

## Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `Space` | Play / Pause |
| `←` / `→` | Seek backward / forward 5 seconds |
| `Ctrl + ←` / `Ctrl + →` | Previous / Next track |
| `↑` / `↓` | Volume up / down (5% increments) |
| `M` | Toggle Mute |
| `L` | Like / Unlike currently playing track |
| `Q` | Toggle Playback Queue |
| `N` | Toggle Full-Screen Now Playing view |
| `Ctrl + K` | Focus Global Search |
| `Shift + ?` | Open Keyboard Shortcuts modal |
| `Esc` | Dismiss modals, search, or Now Playing |

---

## Project Structure

```text
Chordly/
├── electron/              # Electron Main process, protocols & native bridges
│   ├── main.cjs           # Core lifecycle, window management, audio protocol handlers
│   ├── preload.cjs        # Context-isolated secure IPC bridge
│   ├── discordRpc.cjs     # Native Discord IPC client
│   └── partyServer.cjs    # WebSocket server for Listen Together
├── src/                   # React Renderer source code
│   ├── components/        # UI components (PlayerBar, NowPlaying, Modals, Cards)
│   ├── pages/             # Route views (Home, Explore, Library, Search, Collection, Settings)
│   ├── lib/               # Utility functions, tag helpers, wallpapers
│   ├── store.tsx          # Global application state & audio graph controller
│   ├── data.ts            # Local cache, starter catalogs, and mock fallback data
│   └── desktop.ts         # TypeScript declarations for the Electron bridge
├── public/                # Static assets, fonts, and demo audio
└── build/                 # Icons and Windows packaging resources
```

---

## License

Private repository. All rights reserved.
