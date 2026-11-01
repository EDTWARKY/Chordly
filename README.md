# Chordly

<p align="center">
  <strong>A free, open-source desktop music player for YouTube Music, SoundCloud, and local files.</strong><br>
  Built with frosted glass & Material Design 3, no tracking, and no account needed.
</p>

<p align="center">
  <a href="#features">Features</a> · 
  <a href="#built-in-audio-suite">Audio Suite</a> · 
  <a href="#material-design-3-expressive-ui">Interface</a> · 
  <a href="#download-and-install">Install</a> · 
  <a href="#faq">FAQ</a> · 
  <a href="#build-from-source">Build</a> · 
  <a href="#credits">Credits</a>
</p>

---

> [!IMPORTANT]
> ### Contributions & Pull Requests Policy
> This project is actively developed and maintained exclusively by its core team. Public Pull Requests are disabled and will not be accepted.
> - **Bugs**: Please report them via the Issues tab using the provided bug report template, or directly via the in-app Bug Reporter.
> - **Custom features & experiments**: You are welcome to fork the repository and maintain your own builds.
> - *Please do not open issues requesting to enable PRs.*

---

## What is Chordly?

Chordly is an open-source, telemetry-free desktop music player engineered for Windows. It unifies playback across YouTube Music, YouTube, and offline local media into a single high-performance interface without third-party ads, subscriptions, or mandatory logins. 

Built with **Electron**, **React 18**, **TypeScript**, **Tailwind CSS**, and the **Web Audio API**, Chordly delivers ultra-responsive UI interactions, hardware-accelerated audio visualization, and a surgical resource diet:
- **<1% Idle CPU footprint**: Bypasses React re-render cycles with direct DOM audio synchronization.
- **128MB V8 memory cap**: Aggressive garbage collection and automatic decoding buffer flushing on track transition.
- **100% Strict Privacy**: Distributed under the MIT license with zero tracking, no analytics pings, and all session cookies/cache saved exclusively to your local machine.

---

## Features

- **Ad-Free High Quality Streaming**: Stream from YouTube Music without audio ads, banners, or account requirements.
- **Lossless Offline Playback**: Full local library indexing for audiophile high-resolution formats including **FLAC**, **WAV**, **ALAC**, **AIFF**, **MP3**, **OGG**, and **M4A**.
- **Built-in Audio Suite**: Real-time 7-band parametric equalizer, loudness normalization, and Web Audio API DSP signal chain.
- **1-Click Multi-Platform Playlist Migration**: Instant import and search resolution for public playlists from **Spotify**, **Apple Music**, **Deezer**, and **YouTube Music**.
- **Material Design 3 & Frosted Glass UI**: Real-time dynamic color extraction from album artwork, customizable blur intensities, opacity sliders, and custom wallpaper support.
- **Synchronized Lyrics Engine**: Syllable and word-level synchronized lyrics highlighting powered by multi-provider fallbacks.
- **Hardware-Accelerated Visuals**: Interactive progress scrubbers, ambient glow lighting, and live canvas audio spectrum visualizers.
- **Discord Rich Presence**: Live playback status reporting current track title, artist, album art, and elapsed time directly to Discord.
- **Listen Together (Party Mode)**: Built-in local-network WebSocket room system to broadcast synchronized music playback with friends.
- **Zero Telemetry**: No tracking identifiers, telemetry telemetry pings, or background data collection.

---

## Built-in Audio Suite

Chordly includes an integrated audio engineering toolkit accessible directly within the player interface:

### 7-Band Parametric Equalizer
- Dedicated frequency sliders covering 32 Hz through 16 kHz with pre-configured acoustic profiles (**Bass Boost**, **Vocal Clarity**, **Electronic**, **Flat**, **Rock**).
- Per-band gain adjustments with real-time Web Audio API biquad filtering.

### Real-Time DSP Effects Chain
- **Playback Speed**: Dynamically adjust playback rate (0.5× – 2.0×) with pitch preservation.
- **Loudness Normalization**: Prevents sudden volume spikes across different audio sources and masters.
- **Bit-Perfect Output**: Direct digital audio pass-through for external USB DACs at source sample rates and bit depths.

### Offline Library & Tag Pipeline
- Recursive local directory scanner with asynchronous audio metadata extraction.
- Reads embedded ID3, Vorbis, and MP4 tags, including high-resolution cover art and codec details.
- Instant search indexing across your entire offline catalog.

---

## Material Design 3 Expressive UI

Chordly implements the Material Design 3 (M3 Expressive) specification merged with Telegram-style frosted glass:

- **Dynamic Color Extraction**: Generates responsive UI tonal palettes on the fly based on the dominant and secondary hues of active album art.
- **Deep UI Customization**: Configurable banner backdrops, mesh gradients, frosted-glass blur filters, and interface opacity sliders.
- **Optimized Layout Modes**:
  - **Standard View**: Clean navigation with sidebar, queue, and multi-source discovery.
  - **Mini-Player**: Minimalist floating window for background listening while working or gaming.
  - **Fullscreen Immersive View**: Cinematic cover art display with real-time synchronized karaoke lyrics.

---

## Multi-Platform Playlist Migration

Migrate existing music libraries between platforms in a single operation:
- **Spotify**: Paste any public playlist URL (including playlists with 100+ tracks via automated pagination).
- **Apple Music, Deezer & YouTube Music**: Instant URL parsing and extraction.
- **Platform-Aware Search Resolution**: Automatically matches imported track titles and artists against high-bitrate streaming sources to construct immediate playable playlists.

---

## Synchronized Lyrics Engine

- **Multi-Provider Fallback Cascade**: Queries LRCLIB, Musixmatch, Genius, BetterLyrics, KuGou, and Unison to maximize coverage.
- **LRC Synchronization**: Millisecond-accurate timestamp alignment with smooth scrolling and syllable-level highlighting.
- **Manual Offset Calibration**: Fine-tune timestamp delays directly from the lyrics view for live streams or non-standard edits.
- **Plain Text Fallback**: Automatically switches to formatted text lyrics when timed LRC data is unavailable.

---

## Download and Install

Pre-built Windows binaries are available on the [Releases page](https://github.com/EDTWARKY/Chordly/releases).

1. Download `Chordly Setup 1.0.0.exe` from the latest release.
2. Run the installer to choose your preferred installation directory and desktop shortcuts.
3. Launch Chordly and begin listening immediately—no account setup required.

> *Note: Uninstalling Chordly will never delete your local music files or playlists.*

---

## Core Capabilities Breakdown

### Playback
- Instant search, browse, and playback of over 100 million tracks on YouTube Music.
- Lossless audio playback from local storage and configured addon modules.
- Gapless track transitions with continuous buffer preloading.
- System media keys integration (`Play`, `Pause`, `Next`, `Previous`, `Mute`).
- Background playback with native Windows thumbnail toolbar controls.

### Connectivity & Accounts
- **Google Sign-In**: Optional Google authentication to sync your personal YouTube Music library, liked songs, and custom playlists.
- **Spotify Integration**: Connect your Spotify account to import Liked Songs and playlists.
- **Discord Rich Presence**: Native IPC integration showing album art, song title, and live elapsed timestamps.
- **Pluggable Addon Sources**: Connect external audio stream backends and Lossless Bridges.

### Experience
- **Ambient Canvas**: Flowing background gradients that breathe in sync with active album artwork.
- **Stats for Nerds**: Technical inspection panel detailing audio codec, bitrate, sample rate, bit depth, and stream host.
- **In-App Bug Reporter**: Direct feedback and diagnostic delivery to the Discord developer webhook.

### Controls & Tweaks
- **Sleep Timer**: Set countdown timers or choose "Stop playback after current track".
- **Fine Volume Control**: 5% volume increments with mouse wheel and keyboard shortcuts.
- **Search Everywhere**: Quick search filter with instant keyboard shortcut (`Ctrl + K`).

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
| `Q` | Open / Close Playback Queue |
| `N` | Toggle Fullscreen Now Playing screen |
| `Ctrl + K` | Focus Global Search |
| `Shift + ?` | Open Keyboard Shortcuts modal |
| `Esc` | Dismiss modals, search, or Now Playing |

---

## Build from Source

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- [npm](https://www.npmjs.com/) (bundled with Node.js)
- Windows 10 or Windows 11

### Setup & Run
```powershell
# Clone the repository
git clone https://github.com/EDTWARKY/Chordly.git
cd Chordly

# Install dependencies
npm install

# Run the Electron desktop app in development
npm run desktop
```

### Packaging & Installer
```powershell
# Build production Vite bundle
npm run build

# Generate Windows NSIS installer (.exe) in release/
npm run dist
```

---

## FAQ

<details>
  <summary><strong>Do I need a Google or YouTube account to use Chordly?</strong></summary>
  No. Chordly works 100% out of the box as a guest listener without any account. Signing in is entirely optional if you wish to sync your existing YouTube Music library and personal playlists.
</details>

<details>
  <summary><strong>Does Chordly collect telemetry or personal data?</strong></summary>
  Zero. Chordly does not contain analytics packages, tracking scripts, or remote logging. All local files, cache, and authentication cookies stay on your local disk.
</details>

<details>
  <summary><strong>Can I play offline songs without an internet connection?</strong></summary>
  Yes! Chordly fully indexes your local folders. Point Chordly to your local music directory in Library settings to play your offline FLAC, WAV, MP3, and ALAC files at any time.
</details>

---

## Credits

Chordly is built possible thanks to the open-source ecosystem:
- **YouTube Music API Engine**: Powered by [youtubei.js](https://github.com/LuanRT/YouTube.js) (Innertube).
- **Lyrics Providers**: [LRCLIB](https://lrclib.net/), [Musixmatch](https://www.musixmatch.com/), [BetterLyrics](https://github.com/better-lyrics/better-lyrics), [Genius](https://genius.com/), [KuGou](https://www.kugou.com/), [Unison](https://unison.boidu.dev/), [BiniLyrics](https://github.com/binimum), and [PaxSenix](https://lyrics.paxsenix.org/).
- **Audio Architecture & Inspiration**: [Mornye](https://github.com/mornyeapp/Mornye) and [Riff](https://github.com/rootscripts/riff).
- **Icons**: [Lucide Icons](https://lucide.dev/).

---

## License

Distributed under the MIT License. See `LICENSE` for details.
