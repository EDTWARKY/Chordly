const {
  app,
  BrowserWindow,
  Menu,
  dialog,
  ipcMain,
  protocol,
  screen,
  session,
  shell,
} = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const crypto = require("node:crypto");
const { Readable } = require("node:stream");
const { DiscordRpcManager } = require("./discordRpc.cjs");
const { PartyServer } = require("./partyServer.cjs");

const discordRpc = new DiscordRpcManager();
const partyServer = new PartyServer(39420);

// ============================================================================
// AGGRESSIVE V8 MEMORY CAPPING & EXTREME LOW RESOURCE FOOTPRINT
// ============================================================================
// Force V8 to garbage collect aggressively and limit heap size to 128MB
app.commandLine.appendSwitch("js-flags", "--max-old-space-size=128 --expose-gc");

// Disable heavy Chromium features we don't need for a music player while maintaining Google login compatibility
app.commandLine.appendSwitch("disable-features", "HardwareMediaKeyHandling,MediaSessionService,BackForwardCache,Translate,WidgetLayering");
app.commandLine.appendSwitch("disable-http-cache");
app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");

// Throttle rendering when minimized/hidden
app.commandLine.appendSwitch("limit-fps", "30");
app.commandLine.appendSwitch("disk-cache-size", String(32 * 1024 * 1024));
app.commandLine.appendSwitch("media-cache-size", String(32 * 1024 * 1024));

const APP_SCHEME = "chordly";
const APP_HOST = "app";
const MEDIA_HOST = "media";
const STREAM_HOST = "stream";
const APP_ROOT = path.join(__dirname, "..", "dist");
const AUDIO_EXTENSIONS = new Set([
  ".mp3",
  ".flac",
  ".m4a",
  ".aac",
  ".wav",
  ".aiff",
  ".aif",
  ".ogg",
  ".oga",
  ".opus",
  ".wma",
  ".ape",
  ".wv",
  ".alac",
]);
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".avif"]);
const IGNORED_DIRECTORIES = new Set([
  "node_modules",
  "$RECYCLE.BIN",
  "System Volume Information",
  "AppData",
  ".git",
]);
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".flac": "audio/flac",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".opus": "audio/opus",
};

const YOUTUBE_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const YOUTUBE_VIDEO_ID = /^[a-zA-Z0-9_-]{11}$/;

// 1. ALWAYS use WEB_REMIX for Auth, Account Menu, Playlists, Browse, and Search!
const YTM_WEB_REMIX_CLIENT = {
  clientName: "WEB_REMIX",
  clientVersion: "1.20251006.03.00",
  hl: "en",
  gl: "US",
};

// 2. ONLY use STREAM_CLIENTS rotation when resolving audio URLs from /youtubei/v1/player
const STREAM_CLIENTS = [
  {
    clientName: "ANDROID_VR",
    clientVersion: "1.56.21",
    androidSdkVersion: 34,
    osName: "Android",
    osVersion: "14",
    deviceMake: "Oculus",
    deviceModel: "Quest 3",
    userAgent:
      "com.google.android.apps.youtube.vr.oculus/1.56.21 (Linux; U; Android 14; en_US; Quest 3; Build/UP1A.231005.007.A1; Cronet/122.0.6238.3)",
  },
  {
    clientName: "IOS",
    clientVersion: "19.45.4",
    deviceMake: "Apple",
    deviceModel: "iPhone16,2",
    osName: "iPhone",
    osVersion: "18.1.0.22B83",
    userAgent: "com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X;)",
  },
  {
    clientName: "ANDROID",
    clientVersion: "19.45.38",
    androidSdkVersion: 34,
    osName: "Android",
    osVersion: "14",
    userAgent: "com.google.android.youtube/19.45.38 (Linux; U; Android 14) gzip",
  },
];

let mainWindow = null;
let metadataModule = null;
let youtubeClientPromise = null;
const youtubeSearchCache = new Map();
const youtubeStreamCache = new Map();

/* ------------------------------------------------------------------ */
/*  Custom Protocol Scheme Registration                               */
/* ------------------------------------------------------------------ */

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
      bypassCSP: true,
    },
  },
]);

/* ------------------------------------------------------------------ */
/*  Storage Helpers (Accounts, Playlists, Addons, Window State)       */
/* ------------------------------------------------------------------ */

function accountsFile() {
  return path.join(app.getPath("userData"), "accounts.json");
}

function loadAccounts() {
  try {
    const file = accountsFile();
    if (fs.existsSync(file)) {
      const all = JSON.parse(fs.readFileSync(file, "utf8"));
      // Filter out placeholder/corrupted accounts
      return all.filter(
        (a) =>
          a &&
          a.id &&
          a.name &&
          a.name !== "user@gmail.com" &&
          a.name !== "" &&
          a.email !== "user@gmail.com"
      );
    }
  } catch (error) {
    console.error("[chordly] Failed to load accounts:", error.message);
  }
  return [];
}

function saveAccounts(accounts) {
  try {
    const file = accountsFile();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(accounts, null, 2), "utf8");
  } catch (error) {
    console.error("[chordly] Failed to save accounts:", error.message);
  }
}

function playlistsFile() {
  return path.join(app.getPath("userData"), "playlists.json");
}

function loadPlaylists() {
  try {
    const file = playlistsFile();
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    }
  } catch (error) {
    console.error("[chordly] Failed to load playlists:", error.message);
  }
  return {};
}

function savePlaylists(playlists) {
  try {
    const file = playlistsFile();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(playlists, null, 2), "utf8");
  } catch (error) {
    console.error("[chordly] Failed to save playlists:", error.message);
  }
}

function addonsFile() {
  return path.join(app.getPath("userData"), "addons.json");
}

function loadAddons() {
  try {
    const file = addonsFile();
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    }
  } catch {
    /* ignore */
  }
  return [
    {
      id: "app.bitchord.lossless-bridge",
      name: "Lossless Bridge",
      baseUrl: "https://losslessbridge.de.deplexo.com/u/toq2o0.qOKmuDcMf11MWbx0TmLQVA.tUQqxAdZOZA67WhKsv-SP7",
      manifestUrl: "https://losslessbridge.de.deplexo.com/u/toq2o0.qOKmuDcMf11MWbx0TmLQVA.tUQqxAdZOZA67WhKsv-SP7/manifest.json",
      enabled: true,
      quality: "Lossless FLAC · 16/24-bit",
      icon: "L",
    },
    {
      id: "dev.bitperfect.qobuz.de.personal",
      name: "Qobuz [Heisenbergg]",
      baseUrl: "https://soundfean-musics.onrender.com/a",
      manifestUrl: "https://soundfean-musics.onrender.com/a/manifest.json",
      enabled: true,
      quality: "Hi-Res Lossless 24-bit/192kHz",
      icon: "Q",
    },
  ];
}

function saveAddons(addons) {
  try {
    const file = addonsFile();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(addons, null, 2), "utf8");
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/*  Cookie & SAPISIDHASH InnerTube Auth Helper Functions               */
/* ------------------------------------------------------------------ */

function extractCookieValue(cookieString, name) {
  if (!cookieString) return null;
  const match = cookieString.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]*)"));
  return match ? match[1] : null;
}

function getSapisidFromCookieString(cookieString) {
  return (
    extractCookieValue(cookieString, "SAPISID") ||
    extractCookieValue(cookieString, "__Secure-3PAPISID") ||
    extractCookieValue(cookieString, "__Secure-1PAPISID")
  );
}

function generateSapisidHashHeader(cookieString, origin = "https://music.youtube.com") {
  const sapisid = getSapisidFromCookieString(cookieString);
  if (!sapisid) {
    throw new Error("Missing SAPISID / __Secure-3PAPISID cookie in session");
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const input = `${timestamp} ${sapisid} ${origin}`;
  const hash = crypto.createHash("sha1").update(input).digest("hex");
  return `SAPISIDHASH ${timestamp}_${hash} SAPISID1PHASH ${timestamp}_${hash} SAPISID3PHASH ${timestamp}_${hash}`;
}

function buildCookieString(account) {
  if (!account) return "";
  if (typeof account.rawCookies === "string" && account.rawCookies.length > 0) {
    return account.rawCookies;
  }
  if (typeof account.cookies === "string" && account.cookies.length > 0) {
    return account.cookies;
  }
  if (account.cookies && typeof account.cookies === "object") {
    if (account.cookies.raw) return account.cookies.raw;
    const { sapisid, secure3papisid, hsid, ssid, apisid, loginInfo } = account.cookies;
    const parts = [];
    if (sapisid) parts.push(`SAPISID=${sapisid}`);
    if (secure3papisid) parts.push(`__Secure-3PAPISID=${secure3papisid}`);
    if (hsid) parts.push(`HSID=${hsid}`);
    if (ssid) parts.push(`SSID=${ssid}`);
    if (apisid) parts.push(`APISID=${apisid}`);
    if (loginInfo) parts.push(`LOGIN_INFO=${loginInfo}`);
    return parts.join("; ");
  }
  return "";
}

/**
 * Unified helper for ALL authenticated YouTube Music InnerTube calls
 */
async function ytmAuthenticatedFetch(endpoint, account, bodyPayload = {}) {
  if (!account) {
    throw new Error("No authenticated Google account available");
  }
  const cookieStr = buildCookieString(account);
  if (!cookieStr) {
    throw new Error("Account has no cookies stored");
  }

  const origin = "https://music.youtube.com";
  const authHeader = generateSapisidHashHeader(cookieStr, origin);
  const authUser = String(account.authUser ?? (account.activeBrandId ? "1" : "0"));

  const payload = {
    context: {
      client: YTM_WEB_REMIX_CLIENT,
      user: {
        lockedSafetyMode: false,
        ...(account.pageId ? { onBehalfOfUser: account.pageId } : {}),
      },
    },
    ...bodyPayload,
  };

  const response = await fetch(`https://music.youtube.com/youtubei/v1/${endpoint}?prettyPrint=false`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
      Cookie: cookieStr,
      Origin: origin,
      "X-Origin": origin,
      Referer: "https://music.youtube.com/",
      "X-Goog-AuthUser": authUser,
      ...(account.visitorData ? { "X-Goog-Visitor-Id": account.visitorData } : {}),
      "User-Agent": YOUTUBE_UA,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`YTM InnerTube ${endpoint} failed (${response.status}): ${errText.slice(0, 240)}`);
  }

  return await response.json();
}

function findAllRenderers(obj, targetKey, results = []) {
  if (!obj || typeof obj !== "object") return results;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      findAllRenderers(item, targetKey, results);
    }
    return results;
  }
  for (const [key, value] of Object.entries(obj)) {
    if (key === targetKey && value && typeof value === "object") {
      results.push(value);
    } else {
      findAllRenderers(value, targetKey, results);
    }
  }
  return results;
}

function readRunsText(node) {
  if (!node) return "";
  if (typeof node.simpleText === "string") return node.simpleText;
  if (Array.isArray(node.runs)) return node.runs.map((r) => r.text).join("");
  return "";
}

function parseDurationToSeconds(durationText) {
  if (!durationText || typeof durationText !== "string") return 210;
  const parts = durationText.trim().split(":").map((p) => parseInt(p, 10));
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 210;
}

function parseAccountMenuResponse(json) {
  let name = "YouTube Music User";
  let handle = "";
  let avatarUrl = "";

  const header =
    json?.actions?.[0]?.openPopupAction?.popup?.multiPageMenuRenderer?.header
      ?.activeAccountHeaderRenderer;

  if (header) {
    name =
      header?.accountName?.runs?.[0]?.text ||
      header?.accountName?.simpleText ||
      name;
    handle =
      header?.channelHandle?.runs?.[0]?.text ||
      header?.channelHandle?.simpleText ||
      header?.email?.runs?.[0]?.text ||
      "";
    const thumbs = header?.accountPhoto?.thumbnails || [];
    if (thumbs.length > 0) {
      avatarUrl = thumbs[thumbs.length - 1].url;
    }
  }
  return { name, handle, avatarUrl };
}

function parseBrandAccountsList(json, defaultProfile) {
  const brands = [];
  try {
    const sections =
      json?.actions?.[0]?.openPopupAction?.popup?.multiPageMenuRenderer?.sections || [];
    for (const section of sections) {
      const items = section?.accountSectionListRenderer?.contents || [];
      for (const item of items) {
        const itemRenderer = item?.accountItemSectionRenderer?.items || [];
        for (const accountItem of itemRenderer) {
          const a = accountItem?.accountItem;
          if (a) {
            brands.push({
              id: a?.accountEmail || a?.channelHandle?.simpleText || Math.random().toString(36),
              name:
                readRunsText(a?.accountName) ||
                a?.accountDisplayName ||
                defaultProfile?.name ||
                "Brand Account",
              handle: readRunsText(a?.channelHandle) || a?.accountEmail || "",
              email: a?.accountEmail || "",
              avatarUrl: a?.accountPhoto?.thumbnails?.[0]?.url || defaultProfile?.avatarUrl || "",
              authUser: a?.endpoint?.selectActiveIdentityEndpoint?.supportedTokens?.[0]?.pageId
                ? "1"
                : "0",
              pageId:
                a?.endpoint?.selectActiveIdentityEndpoint?.supportedTokens?.[0]?.pageId || null,
              isSelected: Boolean(a?.isSelected),
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn("[chordly] Failed parsing brand accounts list:", err.message);
  }
  return brands.length > 0
    ? brands
    : [
        {
          id: "0",
          name: defaultProfile.name,
          handle: defaultProfile.handle,
          email: defaultProfile.email,
          avatarUrl: defaultProfile.avatarUrl,
          authUser: "0",
          pageId: null,
          isSelected: true,
        },
      ];
}

/* ------------------------------------------------------------------ */
/*  YouTube Music Two-Way Playlists                                   */
/* ------------------------------------------------------------------ */

async function fetchUserPlaylistsFromYTM(account) {
  let data;
  try {
    data = await ytmAuthenticatedFetch("browse", account, {
      browseId: "FEmusic_liked_playlists",
    });
  } catch (err) {
    console.warn("[chordly] FEmusic_liked_playlists failed, trying FEmusic_library_landing:", err.message);
    data = await ytmAuthenticatedFetch("browse", account, {
      browseId: "FEmusic_library_landing",
    });
  }

  const twoRowItems = findAllRenderers(data, "musicTwoRowItemRenderer");
  const playlists = [];
  const seenIds = new Set();

  for (const item of twoRowItems) {
    const title = readRunsText(item.title);
    const subtitle = readRunsText(item.subtitle);
    const browseId =
      item?.navigationEndpoint?.browseEndpoint?.browseId ||
      item?.title?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId ||
      "";

    if (!browseId || (!browseId.startsWith("VL") && !browseId.startsWith("PL") && browseId !== "VLLM")) {
      continue;
    }

    const rawPlaylistId = browseId.startsWith("VL") ? browseId.slice(2) : browseId;
    if (rawPlaylistId === "SE") continue;

    if (seenIds.has(rawPlaylistId)) continue;
    seenIds.add(rawPlaylistId);

    const thumbs =
      item?.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
      item?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
      [];
    const coverUrl = thumbs.length > 0 ? thumbs[thumbs.length - 1].url : "";

    const countMatch = subtitle.match(/(\d+)\s*(?:tracks|songs|views)/i);
    const trackCount = countMatch ? parseInt(countMatch[1], 10) : 0;

    playlists.push({
      id: rawPlaylistId,
      browseId: browseId.startsWith("VL") ? browseId : `VL${browseId}`,
      name: title || "Untitled Playlist",
      title: title || "Untitled Playlist",
      subtitle: subtitle || account.name || "YouTube Music",
      description: subtitle || "",
      cover: coverUrl,
      coverUrl,
      trackCount,
      trackIds: [],
      synced: true,
      source: "youtube_music",
      accountId: account.id,
      createdAt: Date.now(),
    });
  }

  if (!seenIds.has("LM")) {
    playlists.unshift({
      id: "LM",
      browseId: "VLLM",
      name: "Liked Music",
      title: "Liked Music",
      subtitle: "Auto-synced from YouTube Music",
      description: "Auto-synced from YouTube Music",
      cover: "https://lh3.googleusercontent.com/SZjJt_V67a6A-rZu0x5qyE_1Zxp7Z_0=w226-h226",
      coverUrl: "https://lh3.googleusercontent.com/SZjJt_V67a6A-rZu0x5qyE_1Zxp7Z_0=w226-h226",
      trackCount: 0,
      trackIds: [],
      synced: true,
      source: "youtube_music",
      accountId: account.id,
      createdAt: Date.now(),
    });
  }

  return playlists;
}

async function fetchPlaylistTracksFromYTM(account, playlistIdOrBrowseId) {
  if (!playlistIdOrBrowseId) return [];
  const rawId = String(playlistIdOrBrowseId).trim();
  const browseId = rawId === "LM"
    ? "VLLM"
    : rawId.startsWith("VL")
      ? rawId
      : `VL${rawId}`;

  try {
    console.log(`[chordly] Fetching playlist tracks for browseId: ${browseId}...`);
    const data = await ytmAuthenticatedFetch("browse", account, { browseId });
    const listItems = findAllRenderers(data, "musicResponsiveListItemRenderer");
    console.log(`[chordly] Found ${listItems.length} list items in playlist ${browseId}`);
    const tracks = [];

    for (const item of listItems) {
      const videoId =
        item?.playlistItemData?.videoId ||
        item?.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer
          ?.playNavigationEndpoint?.watchEndpoint?.videoId ||
        item?.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId ||
        item?.navigationEndpoint?.watchEndpoint?.videoId ||
        item?.doubleTapToLikeRenderer?.target?.videoId;

      if (!videoId) continue;

      const flexColumns = item.flexColumns || [];
      const title =
        readRunsText(flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text) ||
        "Unknown Title";

      let artistText = "YouTube Music";
      let albumText = "";

      if (flexColumns.length >= 3) {
        artistText = readRunsText(flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text) || artistText;
        albumText = readRunsText(flexColumns[2]?.musicResponsiveListItemFlexColumnRenderer?.text) || "";
      } else if (flexColumns.length === 2) {
        const col1Text = readRunsText(flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text) || "";
        const parts = col1Text.split(/\s*•\s*/);
        artistText = parts[0] || artistText;
        albumText = parts.length > 1 ? parts[1] : "";
      }

      const fixedColumns = item.fixedColumns || [];
      let durationText = readRunsText(
        fixedColumns[0]?.musicResponsiveListItemFixedColumnRenderer?.text
      );
      if (!durationText && flexColumns[1]) {
        const match = readRunsText(flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text).match(/(\d+:\d+(?::\d+)?)/);
        if (match) durationText = match[1];
      }

      const thumbs =
        item?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
        item?.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
        [];
      let coverUrl = thumbs.length > 0 ? thumbs[thumbs.length - 1].url : "";
      if (!coverUrl) {
        coverUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      }

      const setVideoId = item?.playlistItemData?.playlistSetVideoId || "";
      const durSec = parseDurationToSeconds(durationText);

      tracks.push({
        id: videoId,
        videoId,
        setVideoId,
        title,
        artist: artistText,
        artistId: `yt-art-${videoId}`,
        album: albumText,
        albumId: `yt-alb-${videoId}`,
        durationText: durationText || "3:30",
        duration: durSec,
        cover: coverUrl,
        src: `${APP_SCHEME}://${STREAM_HOST}/${videoId}`,
        plays: "YouTube Music",
        year: new Date().getFullYear(),
        genre: "YouTube",
        moods: ["YouTube"],
        quality: "High",
        remote: true,
        source: "youtube",
      });
    }

    console.log(`[chordly] Successfully parsed ${tracks.length} tracks for ${browseId}`);
    return tracks;
  } catch (error) {
    console.error(`[chordly] fetchPlaylistTracksFromYTM error for ${browseId}:`, error.message);
    return [];
  }
}

async function createYTMPlaylist(account, title, description = "", privacyStatus = "PRIVATE", videoIds = []) {
  const data = await ytmAuthenticatedFetch("playlist/create", account, {
    title,
    description,
    privacyStatus,
    ...(videoIds.length > 0 ? { videoIds } : {}),
  });
  return data.playlistId;
}

async function addTracksToYTMPlaylist(account, playlistId, videoIds) {
  const rawPlaylistId = playlistId.startsWith("VL") ? playlistId.slice(2) : playlistId;
  const ids = Array.isArray(videoIds) ? videoIds : [videoIds];

  const actions = ids.map((vid) => ({
    action: "ACTION_ADD_VIDEO",
    addedVideoId: vid,
    dedupeOption: "DEDUPE_OPTION_CHECK",
  }));

  const data = await ytmAuthenticatedFetch("browse/edit_playlist", account, {
    playlistId: rawPlaylistId,
    actions,
  });

  return data;
}

async function removeTrackFromYTMPlaylist(account, playlistId, videoId, setVideoId) {
  const rawPlaylistId = playlistId.startsWith("VL") ? playlistId.slice(2) : playlistId;
  const action = setVideoId
    ? { action: "ACTION_REMOVE_VIDEO_BY_SET_VIDEO_ID", setVideoId }
    : { action: "ACTION_REMOVE_VIDEO", removedVideoId: videoId };

  const data = await ytmAuthenticatedFetch("browse/edit_playlist", account, {
    playlistId: rawPlaylistId,
    actions: [action],
  });

  return data;
}

/* ------------------------------------------------------------------ */
/*  Bulletproof Google Login & Cookie Capture Window                 */
/* ------------------------------------------------------------------ */

// Google blocks Electron when it detects Chromium automation.
// We spoof a real Chrome UA (matching Chromium's actual version) and also disable
// the automation flag so Google doesn't detect the Electron shell.
async function openAuthWindow() {
  const partitionId = `persist:chordly_auth_${Date.now()}`;
  const authSession = session.fromPartition(partitionId);

  // Derive authentic Google Chrome User Agent matching Chromium's exact version
  const chromeVer = process.versions.chrome || "134.0.0.0";
  const chromeMajor = chromeVer.split(".")[0];
  const cleanUa = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVer} Safari/537.36`;

  authSession.setUserAgent(cleanUa);

  // Strip automation-detection headers and provide authentic Chrome client hints
  authSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const requestHeaders = { ...details.requestHeaders };
    requestHeaders["User-Agent"] = cleanUa;
    delete requestHeaders["X-Requested-With"];
    requestHeaders["sec-ch-ua"] = `"Chromium";v="${chromeMajor}", "Google Chrome";v="${chromeMajor}", "Not-A.Brand";v="24"`;
    requestHeaders["sec-ch-ua-mobile"] = "?0";
    requestHeaders["sec-ch-ua-platform"] = '"Windows"';
    callback({ cancel: false, requestHeaders });
  });

  return new Promise((resolve, reject) => {
    let resolved = false;
    let pollTimer = null;

    const authWin = new BrowserWindow({
      width: 560,
      height: 740,
      parent: mainWindow || undefined,
      title: "Sign in to YouTube Music — Chordly",
      backgroundColor: "#0f0f0f",
      autoHideMenuBar: true,
      webPreferences: {
        session: authSession,
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });

    authWin.webContents.setUserAgent(cleanUa);

    // Support popups for Google 2FA, passkey, and account recovery
    authWin.webContents.setWindowOpenHandler(({ url }) => {
      if (url.includes("support.google.com") || url.includes("policies.google.com")) {
        void shell.openExternal(url);
        return { action: "deny" };
      }
      return { action: "allow" };
    });

    // Load authentic YouTube ServiceLogin with YouTube Music referrer
    authWin.loadURL(
      "https://accounts.google.com/ServiceLogin?service=youtube&passive=true&continue=https%3A%2F%2Fmusic.youtube.com%2F&uilel=3&hl=en",
      {
        userAgent: cleanUa,
        extraHeaders: "Referer: https://music.youtube.com/\n",
      }
    );

    const checkCookiesAndVerify = async () => {
      if (resolved || authWin.isDestroyed()) return;
      const currentUrl = authWin.webContents.getURL();

      if (!currentUrl.includes("music.youtube.com")) {
        return;
      }

      try {
        const ytmCookies = await authSession.cookies.get({ url: "https://music.youtube.com" });
        const dotYtCookies = await authSession.cookies.get({ domain: ".youtube.com" });

        const cookieMap = new Map();
        for (const c of [...dotYtCookies, ...ytmCookies]) {
          cookieMap.set(c.name, c.value);
        }

        const sapisid =
          cookieMap.get("SAPISID") ||
          cookieMap.get("__Secure-3PAPISID") ||
          cookieMap.get("__Secure-1PAPISID");
        const sid =
          cookieMap.get("SID") ||
          cookieMap.get("__Secure-3PSID") ||
          cookieMap.get("LOGIN_INFO");

        if (!sapisid || !sid) {
          return;
        }

        const fullCookieString = Array.from(cookieMap.entries())
          .map(([k, v]) => `${k}=${v}`)
          .join("; ");

        const tempAccount = {
          id: `acc_${Date.now()}`,
          cookies: fullCookieString,
          rawCookies: fullCookieString,
          authUser: "0",
        };

        console.log("[chordly] Cookies captured, verifying via account_menu with WEB_REMIX...");
        const menuJson = await ytmAuthenticatedFetch("account/account_menu", tempAccount, {});
        const profileInfo = parseAccountMenuResponse(menuJson);
        console.log("[chordly] ✓ Account verified:", profileInfo.name);

        resolved = true;
        if (pollTimer) clearInterval(pollTimer);
        setTimeout(() => {
          if (!authWin.isDestroyed()) authWin.close();
        }, 300);

        let brandAccounts = [];
        try {
          const listJson = await ytmAuthenticatedFetch("account/accounts_list", tempAccount, {});
          brandAccounts = parseBrandAccountsList(listJson, profileInfo);
        } catch {
          brandAccounts = [
            {
              id: "0",
              name: profileInfo.name,
              handle: profileInfo.handle,
              avatarUrl: profileInfo.avatarUrl,
              authUser: "0",
              pageId: null,
              isSelected: true,
            },
          ];
        }

        const newAccount = {
          id: `yt-${Date.now()}`,
          name: profileInfo.name || "YouTube Music User",
          handle: profileInfo.handle || "@user",
          email: profileInfo.email || profileInfo.handle || "listener@google.com",
          avatarUrl: profileInfo.avatarUrl || "",
          initial: (profileInfo.name || "U")[0].toUpperCase(),
          color: `hsl(${Math.random() * 360}, 70%, 50%)`,
          plan: "Music Premium",
          cookies: {
            sapisid: cookieMap.get("SAPISID") || "",
            secure3papisid: cookieMap.get("__Secure-3PAPISID") || "",
            hsid: cookieMap.get("HSID") || "",
            ssid: cookieMap.get("SSID") || "",
            apisid: cookieMap.get("APISID") || "",
            loginInfo: cookieMap.get("LOGIN_INFO") || "",
          },
          rawCookies: fullCookieString,
          authUser: "0",
          pageId: null,
          brandAccounts,
          isActive: true,
          syncedAt: Date.now(),
        };

        const savedAccounts = loadAccounts().map((a) => ({ ...a, isActive: false }));
        savedAccounts.push(newAccount);
        saveAccounts(savedAccounts);

        try {
          const initialPlaylists = await fetchUserPlaylistsFromYTM(newAccount);
          const allPlaylists = loadPlaylists();
          allPlaylists[newAccount.id] = initialPlaylists;
          savePlaylists(allPlaylists);
        } catch (plErr) {
          console.warn("[chordly] Initial playlist fetch error:", plErr.message);
        }

        resolve(newAccount);
      } catch (err) {
        console.warn("[chordly] Auth poll verification retry:", err.message);
      }
    };

    pollTimer = setInterval(checkCookiesAndVerify, 600);
    authWin.webContents.on("did-navigate", checkCookiesAndVerify);
    authWin.webContents.on("did-finish-load", checkCookiesAndVerify);

    authWin.on("closed", () => {
      if (pollTimer) clearInterval(pollTimer);
      if (!resolved) {
        reject(
          new Error("Sign-in window was closed before completing YouTube Music authentication.")
        );
      }
    });
  });
}

/* ------------------------------------------------------------------ */
/*  Universal Playlist Importer (Spotify / CSV / M3U8)                */
/* ------------------------------------------------------------------ */

async function importSpotifyPlaylist(urlOrPayload, maybeSaveToYTM, maybeAccountId) {
  let targetUrl = "";
  let saveToYTM = false;
  let accountId = null;

  if (typeof urlOrPayload === "object" && urlOrPayload !== null) {
    targetUrl = String(urlOrPayload.spotifyUrl || urlOrPayload.url || "").trim();
    saveToYTM = Boolean(urlOrPayload.saveToYTM || urlOrPayload.accountId);
    accountId = urlOrPayload.accountId || null;
  } else {
    targetUrl = String(urlOrPayload || "").trim();
    saveToYTM = Boolean(maybeSaveToYTM);
    accountId = maybeAccountId || null;
  }

  if (!targetUrl) throw new Error("Please provide a valid Spotify URL");

  // If spotify.link short link, follow redirects to resolve destination
  if (targetUrl.includes("spotify.link")) {
    try {
      const headRes = await fetch(targetUrl, {
        redirect: "follow",
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
        signal: AbortSignal.timeout(6000),
      });
      if (headRes?.url) targetUrl = headRes.url;
    } catch (e) {
      console.warn("[chordly] Failed to expand spotify.link:", e.message);
    }
  }

  let type = "playlist";
  let spotifyId = "";

  const uriMatch = targetUrl.match(/spotify:(playlist|album|track):([a-zA-Z0-9]+)/i);
  if (uriMatch) {
    type = uriMatch[1].toLowerCase();
    spotifyId = uriMatch[2];
  } else {
    const urlMatch = targetUrl.match(/(playlist|album|track)\/([a-zA-Z0-9]+)/i);
    if (urlMatch) {
      type = urlMatch[1].toLowerCase();
      spotifyId = urlMatch[2];
    }
  }

  if (!spotifyId) {
    throw new Error(
      "Please provide a valid Spotify playlist, album, or track URL (e.g., https://open.spotify.com/playlist/...)"
    );
  }

  const embedUrl = `https://open.spotify.com/embed/${type}/${spotifyId}`;
  let html = "";
  try {
    const response = await fetch(embedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (response.ok) {
      html = await response.text();
    }
  } catch (fetchErr) {
    console.warn("[chordly] Embed fetch error:", fetchErr.message);
  }

  const scriptMatch = html ? html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/) : null;
  const trackQueries = [];
  let playlistTitle = type === "album" ? "Imported Spotify Album" : "Imported Spotify Playlist";
  let playlistCover = "";

  if (scriptMatch) {
    try {
      const nextData = JSON.parse(scriptMatch[1]);
      if (nextData?.props?.pageProps?.status === 404) {
        throw new Error(
          "This Spotify playlist is private or unlisted. In Spotify, click '...', select 'Make Public' or 'Add to profile', and try again."
        );
      }
      const entity = nextData?.props?.pageProps?.state?.data?.entity;
      if (entity) {
        playlistTitle = entity.title || entity.name || playlistTitle;
        if (entity.coverArt?.sources?.[0]?.url) {
          playlistCover = entity.coverArt.sources[0].url;
        } else if (entity.visualIdentity?.image?.[0]?.url) {
          playlistCover = entity.visualIdentity.image[0].url;
        }

        const trackList = entity.trackList || [];
        for (const t of trackList) {
          const title = t.title || t.name;
          const artist = t.subtitle || t.artists?.[0]?.name || "";
          const duration = Math.round((Number(t.duration) || 0) / 1000) || 210;
          if (title) {
            trackQueries.push({
              title,
              artist,
              query: `${title} ${artist}`.trim(),
              duration,
              cover: playlistCover,
            });
          }
        }

        // Single track embed handling
        if (entity.type === "track" && trackQueries.length === 0) {
          const title = entity.title || entity.name;
          const artist = entity.subtitle || entity.artists?.[0]?.name || "";
          const duration = Math.round((Number(entity.duration) || 0) / 1000) || 210;
          if (title) {
            trackQueries.push({
              title,
              artist,
              query: `${title} ${artist}`.trim(),
              duration,
              cover: playlistCover,
            });
          }
        }
      }
    } catch (e) {
      if (e.message && e.message.includes("private or unlisted")) throw e;
      console.warn("[chordly] Spotify NEXT_DATA parse error:", e.message);
    }
  }

  // Fallback regex in case of alternative SSR markup
  if (trackQueries.length === 0 && html) {
    const rowMatches = html.matchAll(/"name":"([^"]+)","artists":\[{"name":"([^"]+)"/g);
    for (const m of rowMatches) {
      trackQueries.push({ title: m[1], artist: m[2], query: `${m[1]} ${m[2]}`.trim(), duration: 210, cover: "" });
    }
  }

  // Fallback to OEmbed if still empty
  if (trackQueries.length === 0) {
    try {
      const oembedRes = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(targetUrl)}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        if (oembedData?.title) {
          playlistTitle = oembedData.title;
          if (oembedData.thumbnail_url) playlistCover = oembedData.thumbnail_url;
        }
      }
    } catch {
      /* ignore */
    }
  }

  if (trackQueries.length === 0) {
    throw new Error(
      `Could not extract any tracks from this Spotify ${type}. Make sure the playlist is set to Public in Spotify (click '...' -> 'Make Public').`
    );
  }

  console.log(`[chordly] Extracted ${trackQueries.length} tracks from Spotify ${type} "${playlistTitle}". Matching on YouTube Music...`);

  const matchedTracks = [];
  const yt = await youtubeClient();

  // Match tracks concurrently in small batches of 5
  const batchSize = 5;
  const itemsToMatch = trackQueries.slice(0, 100);

  for (let i = 0; i < itemsToMatch.length; i += batchSize) {
    const batch = itemsToMatch.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (item) => {
        try {
          const searchRes = await yt.music.search(item.query, { type: "song" });
          let first = searchRes?.songs?.contents?.[0];
          if (!first || !first.id) {
            const fallback = await yt.search(item.query);
            first = fallback?.videos?.[0];
          }
          if (first && first.id) {
            const rawThumb = first.thumbnails?.[0]?.url || item.cover || "";
            const cover = upgradeThumbnailUrl(rawThumb);
            return {
              id: first.id,
              videoId: first.id,
              title: first.title || item.title,
              artist: first.artists?.[0]?.name || first.author?.name || item.artist,
              album: first.album?.name || playlistTitle || "",
              duration: Number(first.duration?.seconds) || item.duration || 210,
              cover,
              src: `${APP_SCHEME}://${STREAM_HOST}/${first.id}`,
              source: "youtube",
              quality: "Hi-Res Lossless",
            };
          }
        } catch (err) {
          console.warn(`[chordly] Match failed for "${item.query}":`, err.message);
        }
        return null;
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value) {
        matchedTracks.push(r.value);
      }
    }
  }

  let ytmPlaylistId = null;
  if (saveToYTM && matchedTracks.length > 0) {
    const accounts = loadAccounts();
    const activeAccount = (accountId && accounts.find((a) => a.id === accountId)) || accounts.find((a) => a.isActive) || accounts[0];
    if (activeAccount) {
      try {
        ytmPlaylistId = await createYTMPlaylist(
          activeAccount,
          playlistTitle,
          `Imported via Chordly from Spotify (${matchedTracks.length} tracks)`,
          "PRIVATE",
          matchedTracks.map((t) => t.id)
        );
        console.log(`[chordly] ✓ Synced Spotify playlist to YouTube Music: ${ytmPlaylistId}`);
      } catch (syncErr) {
        console.error("[chordly] Failed to save Spotify playlist to YTM:", syncErr.message);
      }
    }
  }

  return {
    success: true,
    title: playlistTitle,
    tracks: matchedTracks,
    matchedCount: matchedTracks.length,
    totalCount: trackQueries.length,
    playlistId: ytmPlaylistId,
    ytmPlaylistId,
  };
}

/* ------------------------------------------------------------------ */
/*  YouTube Client (InnerTube via youtubei.js)                        */
/* ------------------------------------------------------------------ */

function youtubeClient() {
  if (!youtubeClientPromise) {
    youtubeClientPromise = import("youtubei.js")
      .then(({ Innertube }) => Innertube.create({ lang: "en", location: "US" }))
      .catch((error) => {
        youtubeClientPromise = null;
        throw error;
      });
  }
  return youtubeClientPromise;
}

function trimCache(map, limit) {
  while (map.size > limit) {
    const oldest = map.keys().next().value;
    if (oldest === undefined) return;
    map.delete(oldest);
  }
}

function upgradeThumbnailUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  let url = rawUrl;
  if (url.includes("googleusercontent.com")) {
    url = url.replace(/=w\d+-h\d+[^?#]*/i, "=w1200-h1200-l90-rj").replace(/=s\d+[^?#]*/i, "=s1200");
  }
  if (url.includes("ytimg.com")) {
    url = url.replace(/\/(default|hqdefault|mqdefault|sddefault)\.jpg/i, "/maxresdefault.jpg");
  }
  return url;
}

function youtubeThumbnail(item) {
  const contents = item?.thumbnail?.contents;
  let raw = "";
  if (Array.isArray(contents) && contents.length) {
    const sorted = [...contents].sort(
      (a, b) =>
        (Number(b?.width) || 0) * (Number(b?.height) || 0) -
        (Number(a?.width) || 0) * (Number(a?.height) || 0)
    );
    raw = sorted[0]?.url || "";
  } else {
    raw = item?.thumbnail?.url || item?.thumbnails?.[0]?.url || "";
  }
  return upgradeThumbnailUrl(raw);
}

function appendYouTubeItems(tracks, items, defaultKind, seen) {
  if (!Array.isArray(items)) return;
  for (const item of items) {
    const videoId = item?.id;
    if (!videoId || !YOUTUBE_VIDEO_ID.test(videoId) || seen.has(videoId)) continue;
    seen.add(videoId);

    const title = String(item?.title?.text || item?.title || "Untitled").trim();
    const artist =
      String(
        item?.artists?.[0]?.name ||
          item?.author?.name ||
          item?.artists?.[0]?.text ||
          item?.author?.text ||
          "Unknown Artist"
      ).trim();
    const album = String(item?.album?.name || item?.album?.text || "").trim();
    const duration = Number(item?.duration?.seconds) || 210;
    const cover = youtubeThumbnail(item);
    const isVideo = defaultKind === "video" || item?.type === "video";

    tracks.push({
      id: videoId,
      videoId,
      title,
      artistId: `yt-art-${videoId}`,
      artist,
      albumId: `yt-alb-${videoId}`,
      album,
      cover,
      genre: "YouTube",
      moods: ["YouTube"],
      src: `${APP_SCHEME}://${STREAM_HOST}/${videoId}`,
      duration,
      year: new Date().getFullYear(),
      plays: "YouTube",
      video: isVideo,
      quality: "High",
      remote: true,
      source: "youtube",
    });
  }
}

async function searchYouTube(query) {
  const clean = String(query ?? "").trim().slice(0, 200);
  if (!clean) return [];
  const cacheKey = clean.toLowerCase();
  const cached = youtubeSearchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.tracks;

  const yt = await youtubeClient();
  const [songsResult, videosResult] = await Promise.allSettled([
    yt.music.search(clean, { type: "song" }),
    yt.music.search(clean, { type: "video" }),
  ]);

  const tracks = [];
  const seen = new Set();
  if (songsResult.status === "fulfilled") {
    appendYouTubeItems(tracks, songsResult.value.songs?.contents, "song", seen);
  }
  if (videosResult.status === "fulfilled") {
    appendYouTubeItems(tracks, videosResult.value.videos?.contents, "video", seen);
  }

  youtubeSearchCache.set(cacheKey, { tracks, expiresAt: Date.now() + 5 * 60 * 1000 });
  trimCache(youtubeSearchCache, 50);
  return tracks;
}

// Cache resolved stream URLs per videoId for 30 minutes so Range requests never switch clients mid-song
const streamUrlCache = new Map();

async function resolveAudioStream(videoId) {
  if (!YOUTUBE_VIDEO_ID.test(videoId)) throw new Error("Invalid YouTube video id.");
  const cached = streamUrlCache.get(videoId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached;
  }

  for (const client of STREAM_CLIENTS) {
    try {
      const res = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": client.userAgent,
          "X-Goog-Api-Format-Version": "2",
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: client.clientName,
              clientVersion: client.clientVersion,
              androidSdkVersion: client.androidSdkVersion,
              osName: client.osName,
              osVersion: client.osVersion,
              deviceMake: client.deviceMake,
              deviceModel: client.deviceModel,
              hl: "en",
              gl: "US",
            },
          },
          videoId,
          contentCheckOk: true,
          racyCheckOk: true,
        }),
      });

      if (!res.ok) continue;
      const data = await res.json();
      if (data?.playabilityStatus?.status !== "OK") continue;

      const adaptiveFormats = data?.streamingData?.adaptiveFormats || [];
      const formats = data?.streamingData?.formats || [];
      const allFormats = [...adaptiveFormats, ...formats];

      // Filter strictly for audio-only formats with direct URL and contentLength (prefer itag 140 M4A 128kbps or itag 251 Opus 160kbps)
      const audioFormats = allFormats
        .filter((f) => f && f.url && f.mimeType?.startsWith("audio/") && Number(f.contentLength || (new URL(f.url).searchParams.get("clen"))) > 0)
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

      const best =
        audioFormats.find((f) => f.itag === 140) ||
        audioFormats.find((f) => f.itag === 251) ||
        audioFormats.find((f) => f.mimeType?.includes("mp4a")) ||
        audioFormats[0];

      if (best && best.url) {
        const clen = Number(best.contentLength) || Number(new URL(best.url).searchParams.get("clen")) || 0;
        const streamInfo = {
          url: best.url,
          mimeType: best.mimeType.split(";")[0] || "audio/webm",
          contentLength: clen,
          bitrate: Number(best.bitrate) || 160000,
          durationSec: Number(data?.videoDetails?.lengthSeconds || Math.round(Number(best.approxDurationMs || 0) / 1000) || 0),
          userAgent: client.userAgent,
          expiresAt: Date.now() + 30 * 60 * 1000, // 30 mins
        };
        streamUrlCache.set(videoId, streamInfo);
        trimCache(streamUrlCache, 50);
        return streamInfo;
      }
    } catch (err) {
      console.error(`[StreamResolver] Client ${client.clientName} failed for ${videoId}:`, err.message);
    }
  }

  // Innertube fallback if direct /player was blocked
  try {
    const yt = await youtubeClient();
    for (const c of ["VISIONOS", "IOS", "ANDROID_VR"]) {
      try {
        const info = await yt.getInfo(videoId, { client: c });
        if (info?.playability_status?.status === "OK" && info.streaming_data) {
          const fmts = [
            ...(info.streaming_data.adaptive_formats || []),
            ...(info.streaming_data.formats || []),
          ].filter((f) => f && f.url && String(f.mime_type || "").startsWith("audio/"));
          const chosen = fmts.find((f) => String(f.mime_type).includes("opus")) || fmts.find((f) => String(f.mime_type).includes("mp4a")) || fmts[0];
          if (chosen && chosen.url) {
            const clen = Number(chosen.content_length) || Number(new URL(chosen.url).searchParams.get("clen")) || 0;
            const sInfo = {
              url: chosen.url,
              mimeType: (chosen.mime_type || "audio/webm").split(";")[0],
              contentLength: clen,
              bitrate: Number(chosen.bitrate) || 128000,
              durationSec: Number(info.basic_info?.duration || 0),
              userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
              expiresAt: Date.now() + 30 * 60 * 1000,
            };
            streamUrlCache.set(videoId, sInfo);
            trimCache(streamUrlCache, 50);
            return sInfo;
          }
        }
      } catch {
        // continue
      }
    }
  } catch (err) {
    console.error("[StreamResolver Innertube fallback failed]:", err.message);
  }

  throw new Error(`Unable to resolve full audio stream for videoId: ${videoId}`);
}

const resolveYouTubeStream = resolveAudioStream;

async function handleYouTubeStream(request) {
  try {
    const urlObj = new URL(request.url);
    const videoId = urlObj.pathname.replace(/^\/+/, "").trim();
    if (!YOUTUBE_VIDEO_ID.test(videoId)) {
      return new Response("Invalid track id", { status: 400 });
    }

    let streamInfo = await resolveAudioStream(videoId);

    const rangeHeader = request.headers.get("range") || request.headers.get("Range");
    const fetchHeaders = {
      "User-Agent": streamInfo.userAgent,
      Accept: "*/*",
    };
    if (rangeHeader) {
      fetchHeaders["Range"] = rangeHeader;
    }

    let upstreamRes = await fetch(streamInfo.url, {
      headers: fetchHeaders,
    });

    // In case stream token expired, refresh and retry once
    if (upstreamRes.status === 403 || upstreamRes.status === 410) {
      streamUrlCache.delete(videoId);
      streamInfo = await resolveAudioStream(videoId);
      fetchHeaders["User-Agent"] = streamInfo.userAgent;
      upstreamRes = await fetch(streamInfo.url, {
        headers: fetchHeaders,
      });
    }

    const resHeaders = new Headers();
    resHeaders.set("Content-Type", streamInfo.mimeType || upstreamRes.headers.get("content-type") || "audio/mp4");
    resHeaders.set("Accept-Ranges", "bytes");
    resHeaders.set("Access-Control-Allow-Origin", "*");
    resHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    resHeaders.set("Access-Control-Allow-Headers", "*");
    resHeaders.set("Cache-Control", "no-cache");

    const contentRange = upstreamRes.headers.get("content-range");
    if (contentRange) resHeaders.set("Content-Range", contentRange);
    const contentLength = upstreamRes.headers.get("content-length");
    if (contentLength) resHeaders.set("Content-Length", contentLength);

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: resHeaders,
    });
  } catch (err) {
    console.error("[chordly://stream Error]:", err);
    return new Response(err.message, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  Lyrics Cascade Helper                                             */
/* ------------------------------------------------------------------ */

function parseLrc(lrcText) {
  if (!lrcText || typeof lrcText !== "string") return [];
  const lines = lrcText.split(/\r?\n/);
  const result = [];
  const timeRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const timestamps = [];
    let match;
    timeRegex.lastIndex = 0;
    while ((match = timeRegex.exec(trimmed)) !== null) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const fraction = match[3]
        ? match[3].length === 2
          ? parseInt(match[3], 10) / 100
          : parseInt(match[3], 10) / 1000
        : 0;
      timestamps.push(minutes * 60 + seconds + fraction);
    }

    const text = trimmed.replace(/\[\d{1,2}:\d{2}(?:\.\d{2,3})?\]/g, "").trim();
    if (!text && timestamps.length === 0) continue;

    for (const time of timestamps) {
      result.push({ time, text });
    }
  }

  result.sort((a, b) => a.time - b.time);
  return result;
}

function parsePlainText(plainText, totalDuration = 180) {
  if (!plainText || typeof plainText !== "string") return [];
  const lines = plainText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return [];
  const step = Math.max(2, totalDuration / (lines.length + 2));
  return lines.map((text, idx) => ({
    time: Math.round((idx + 1) * step * 10) / 10,
    text,
  }));
}

async function queryLrcLib(cleanTitle, cleanArtist, duration) {
  try {
    const lrcUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(
      cleanTitle
    )}&artist_name=${encodeURIComponent(cleanArtist)}${
      duration ? `&duration=${duration}` : ""
    }`;
    const res = await fetch(lrcUrl, {
      headers: { "User-Agent": "Chordly/1.0.0 (https://github.com/chordly)" },
      signal: AbortSignal.timeout(3500),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.syncedLyrics) {
        return { synced: true, text: data.syncedLyrics, lines: parseLrc(data.syncedLyrics) };
      }
      if (data.plainLyrics) {
        return { synced: false, text: data.plainLyrics, lines: parsePlainText(data.plainLyrics, duration) };
      }
    }
  } catch {}

  try {
    const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(
      `${cleanArtist} ${cleanTitle}`.trim()
    )}`;
    const searchRes = await fetch(searchUrl, {
      headers: { "User-Agent": "Chordly/1.0.0 (https://github.com/chordly)" },
      signal: AbortSignal.timeout(4000),
    });
    if (searchRes.ok) {
      const results = await searchRes.json();
      if (Array.isArray(results) && results.length) {
        const syncedItem = results.find((r) => r.syncedLyrics);
        if (syncedItem && syncedItem.syncedLyrics) {
          return { synced: true, text: syncedItem.syncedLyrics, lines: parseLrc(syncedItem.syncedLyrics) };
        }
        const plainItem = results.find((r) => r.plainLyrics);
        if (plainItem && plainItem.plainLyrics) {
          return { synced: false, text: plainItem.plainLyrics, lines: parsePlainText(plainItem.plainLyrics, duration) };
        }
      }
    }
  } catch {}
  return null;
}

async function queryKuGou(cleanTitle, cleanArtist, duration) {
  try {
    const kgRes = await fetch(
      `http://lyrics.kugou.com/search?ver=1&man=yes&client=pc&keyword=${encodeURIComponent(`${cleanArtist} - ${cleanTitle}`)}&duration=${duration * 1000}&hash=`,
      { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(3500) }
    );
    if (kgRes.ok) {
      const kgData = await kgRes.json();
      const cand = kgData.candidates?.[0];
      if (cand && cand.id && cand.accesskey) {
        const dlRes = await fetch(
          `http://lyrics.kugou.com/download?ver=1&client=pc&id=${cand.id}&accesskey=${cand.accesskey}&fmt=lrc&charset=utf8`,
          { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(3500) }
        );
        if (dlRes.ok) {
          const dlData = await dlRes.json();
          if (dlData.content) {
            const lrc = Buffer.from(dlData.content, "base64").toString("utf8");
            const lines = parseLrc(lrc);
            if (lines.length) {
              return { synced: true, text: lrc, lines };
            }
          }
        }
      }
    }
  } catch {}
  return null;
}

async function queryMusixmatch(targetVideoId, duration) {
  if (!targetVideoId) return null;
  try {
    const yt = await youtubeClient();
    const ytLyrics = await yt.music.getLyrics(targetVideoId);
    const text = ytLyrics?.description?.text;
    if (text && text.length > 20) {
      return { synced: false, text, lines: parsePlainText(text, duration) };
    }
  } catch {}
  return null;
}

async function queryGenius(cleanTitle, cleanArtist, duration) {
  try {
    const gSearchUrl = `https://genius.com/api/search/multi?per_page=5&q=${encodeURIComponent(
      `${cleanArtist} ${cleanTitle}`
    )}`;
    const gRes = await fetch(gSearchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(4000),
    });
    if (gRes.ok) {
      const gData = await gRes.json();
      const hits = gData?.response?.sections?.find((s) => s.type === "song")?.hits || [];
      if (hits.length) {
        const pageRes = await fetch(`https://genius.com${hits[0].result.path}`, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          signal: AbortSignal.timeout(4500),
        });
        if (pageRes.ok) {
          const html = await pageRes.text();
          const containers = [
            ...html.matchAll(/<div[^>]*data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/g),
          ];
          if (containers.length) {
            const rawText = containers
              .map((c) => c[1].replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, ""))
              .join("\n")
              .replace(/&#x27;/g, "'")
              .replace(/&amp;/g, "&")
              .replace(/&quot;/g, '"')
              .trim();
            if (rawText.length > 20) {
              return { synced: false, text: rawText, lines: parsePlainText(rawText, duration) };
            }
          }
        }
      }
    }
  } catch {}
  return null;
}

async function queryNetEase(rawId) {
  const neMatch = rawId.match(/ne_(\d+)/i) || rawId.match(/^(\d+)$/);
  if (!neMatch || !neMatch[1]) return null;
  try {
    const neRes = await fetch(
      `https://music.163.com/api/song/lyric?id=${neMatch[1]}&lv=1&kv=1&tv=-1`,
      { headers: { "User-Agent": "Chordly/1.0.0" }, signal: AbortSignal.timeout(3500) }
    );
    if (neRes.ok) {
      const neJson = await neRes.json();
      const lrc = neJson?.lrc?.lyric;
      if (lrc) {
        const lines = parseLrc(lrc);
        if (lines.length) return { synced: true, text: lrc, lines };
      }
    }
  } catch {}
  return null;
}

async function queryUnison(cleanTitle, cleanArtist) {
  try {
    const uniUrl = `https://unison.boidu.dev/lyrics/search?q=${encodeURIComponent(cleanTitle)}`;
    const uniRes = await fetch(uniUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(3500),
    });
    if (uniRes.ok) {
      const uniData = await uniRes.json();
      const match = (uniData?.data || []).find((item) =>
        item.artist?.toLowerCase().includes(cleanArtist.toLowerCase()) ||
        cleanArtist.toLowerCase().includes(item.artist?.toLowerCase() || "")
      ) || uniData?.data?.[0];

      if (match && match.id) {
        const itemRes = await fetch(`https://unison.boidu.dev/lyrics/${match.id}`, {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(3500),
        });
        if (itemRes.ok) {
          const itemData = await itemRes.json();
          const lyricsContent = itemData?.data?.lyrics;
          if (lyricsContent && typeof lyricsContent === "string") {
            const lines = parseLrc(lyricsContent);
            if (lines.length) return { synced: true, text: lyricsContent, lines };
          }
        }
      }
    }
  } catch {}
  return null;
}

async function fetchLyrics(track, preferredProvider) {
  if (!track || !track.title) return null;

  // Clean title and artist
  let cleanTitle = String(track.title || "");
  let cleanArtist = String(track.artist || "");
  if (
    cleanTitle.includes(" - ") &&
    (!cleanArtist ||
      cleanArtist.includes("Topic") ||
      cleanArtist.includes("Official") ||
      cleanArtist === "YouTube Artist")
  ) {
    const parts = cleanTitle.split(" - ");
    cleanArtist = parts[0].trim();
    cleanTitle = parts.slice(1).join(" - ").trim();
  }
  cleanTitle = cleanTitle
    .replace(
      /\s*[\(\[](official\s*(music\s*)?(video|audio)|lyrics?|visualizer|remaster(ed)?(\s*\d+)?|4k|hd|hq)[\)\]].*/gi,
      ""
    )
    .trim();

  const duration = Math.round(Number(track.duration) || 0);
  const targetVideoId = track.videoId || (YOUTUBE_VIDEO_ID.test(track.id) ? track.id : null);
  const rawId = String(track.rawAddonId || track.id || "");

  // Provider runners mapped by canonical name
  const providerFetchers = {
    BetterLyrics: async () => {
      const res = await queryLrcLib(cleanTitle, cleanArtist, duration);
      if (res) return { provider: "BetterLyrics", ...res };
      const kg = await queryKuGou(cleanTitle, cleanArtist, duration);
      if (kg) return { provider: "BetterLyrics", ...kg };
      return null;
    },
    LyricsPlus: async () => {
      const kg = await queryKuGou(cleanTitle, cleanArtist, duration);
      if (kg) return { provider: "LyricsPlus", ...kg };
      const res = await queryLrcLib(cleanTitle, cleanArtist, duration);
      if (res) return { provider: "LyricsPlus", ...res };
      return null;
    },
    Musixmatch: async () => {
      const res = await queryMusixmatch(targetVideoId, duration);
      if (res) return { provider: "Musixmatch", ...res };
      return null;
    },
    Genius: async () => {
      const res = await queryGenius(cleanTitle, cleanArtist, duration);
      if (res) return { provider: "Genius", ...res };
      return null;
    },
    LRCLIB: async () => {
      const res = await queryLrcLib(cleanTitle, cleanArtist, duration);
      if (res) return { provider: "LRCLIB", ...res };
      return null;
    },
    KuGou: async () => {
      const res = await queryKuGou(cleanTitle, cleanArtist, duration);
      if (res) return { provider: "KuGou", ...res };
      return null;
    },
    NetEase: async () => {
      const res = await queryNetEase(rawId);
      if (res) return { provider: "NetEase", ...res };
      return null;
    },
    Unison: async () => {
      const res = await queryUnison(cleanTitle, cleanArtist);
      if (res) return { provider: "Unison", ...res };
      return null;
    },
  };

  // If user requested a specific provider, execute that provider first
  if (preferredProvider && providerFetchers[preferredProvider]) {
    try {
      const result = await providerFetchers[preferredProvider]();
      if (result) return result;
    } catch (e) {
      console.warn(`[chordly] Preferred lyrics provider ${preferredProvider} failed:`, e.message);
    }
  }

  // NetEase shortcut if track has NetEase ID from addon
  if (track.addonId && (rawId.startsWith("ne_") || /^\d+$/.test(rawId))) {
    const neRes = await providerFetchers.NetEase();
    if (neRes) return neRes;
  }

  // Default cascade prioritized to user's 4 defaults: BetterLyrics -> LyricsPlus -> Musixmatch -> Genius
  const defaultCascade = ["BetterLyrics", "LyricsPlus", "Musixmatch", "Genius", "LRCLIB", "KuGou"];
  for (const name of defaultCascade) {
    if (name === preferredProvider) continue; // already tried
    try {
      const result = await providerFetchers[name]();
      if (result) return result;
    } catch {
      /* continue cascade */
    }
  }

  return null;
}

/* ------------------------------------------------------------------ */
/*  Local Library Scanner                                             */
/* ------------------------------------------------------------------ */

const EMPTY_LIBRARY = {
  folder: null,
  scannedAt: null,
  tracks: [],
  totalBytes: 0,
  skipped: 0,
};

function libraryFile() {
  return path.join(app.getPath("userData"), "local-library.json");
}

async function readSavedLibrary() {
  try {
    const parsed = JSON.parse(await fsp.readFile(libraryFile(), "utf8"));
    if (!parsed || !Array.isArray(parsed.tracks)) return { ...EMPTY_LIBRARY };
    return {
      folder: typeof parsed.folder === "string" ? parsed.folder : null,
      scannedAt: typeof parsed.scannedAt === "string" ? parsed.scannedAt : null,
      tracks: parsed.tracks.filter(
        (track) =>
          track &&
          typeof track.id === "string" &&
          typeof track.src === "string" &&
          typeof track.title === "string"
      ),
      totalBytes: Number(parsed.totalBytes) || 0,
      skipped: Number(parsed.skipped) || 0,
    };
  } catch {
    return { ...EMPTY_LIBRARY };
  }
}

async function saveLibrary(library) {
  const file = libraryFile();
  await fsp.mkdir(path.dirname(file), { recursive: true });
  await fsp.writeFile(file, JSON.stringify({ version: 1, ...library }), "utf8");
}

function sendScanProgress(webContents, payload) {
  if (webContents && !webContents.isDestroyed()) {
    webContents.send("library:scan-progress", payload);
  }
}

async function collectAudioFiles(root, onProgress) {
  const files = [];
  const stack = [root];
  let inspected = 0;
  while (stack.length) {
    const directory = stack.pop();
    let entries;
    try {
      entries = await fsp.readdir(directory, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (IGNORED_DIRECTORIES.has(entry.name)) continue;
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        inspected += 1;
        if (AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
          try {
            const stat = await fsp.stat(fullPath);
            files.push({ path: fullPath, size: stat.size, mtimeMs: stat.mtimeMs });
          } catch {
            /* ignore */
          }
        }
        if (inspected % 50 === 0 && onProgress) {
          onProgress({ phase: "walking", inspected, found: files.length });
        }
      }
    }
  }
  return files;
}

function mediaUrl(filePath) {
  return `${APP_SCHEME}://${MEDIA_HOST}/${Buffer.from(filePath, "utf8").toString("base64url")}`;
}

function stableId(prefix, value) {
  const hash = crypto.createHash("sha1").update(String(value)).digest("hex").slice(0, 16);
  return `${prefix}-${hash}`;
}

function losslessQuality(extension, metadata) {
  const ext = extension.toLowerCase();
  if (ext === ".flac" || ext === ".wav" || ext === ".aiff" || ext === ".alac") return "Lossless";
  const codec = String(metadata?.format?.codec || "").toLowerCase();
  return codec.includes("flac") || codec.includes("pcm") || codec.includes("alac")
    ? "Lossless"
    : "High";
}

async function artworkForTrack(filePath, picture, artworkDir) {
  if (!picture || !picture.data || !picture.data.length) {
    const hash = crypto.createHash("sha1").update(filePath).digest();
    return `/covers/cover${(hash[0] % 16) + 1}.jpg`;
  }
  const hash = crypto.createHash("sha1").update(picture.data).digest("hex");
  const ext = picture.format?.includes("png") ? ".png" : ".jpg";
  const coverPath = path.join(artworkDir, `${hash}${ext}`);
  try {
    await fsp.access(coverPath);
  } catch {
    await fsp.writeFile(coverPath, Buffer.from(picture.data));
  }
  return mediaUrl(coverPath);
}

async function parseLocalTrack(entry, artworkDir) {
  const extension = path.extname(entry.path).toLowerCase();
  if (!metadataModule) metadataModule = await import("music-metadata");
  const metadata = await metadataModule.parseFile(entry.path, {
    duration: true,
    skipCovers: false,
  });
  const common = metadata.common || {};
  const format = metadata.format || {};
  const title = (common.title || path.parse(entry.path).name).trim();
  const artist = (common.artist || common.albumartist || "Unknown Artist").trim();
  const album = (common.album || path.basename(path.dirname(entry.path)) || "Unknown Album").trim();
  const duration = Number(format.duration);
  const year = Number(common.year) || 0;
  const cover = await artworkForTrack(entry.path, common.picture?.[0], artworkDir);

  return {
    id: stableId("local", entry.path.toLowerCase()),
    title,
    artistId: stableId("local-artist", artist.toLowerCase()),
    artist,
    albumId: stableId("local-album", `${artist.toLowerCase()}::${album.toLowerCase()}`),
    album,
    cover,
    genre: common.genre?.[0] || "Local",
    moods: ["Local"],
    src: mediaUrl(entry.path),
    duration: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : 0,
    year,
    plays: "On this device",
    quality: losslessQuality(extension, metadata),
    filePath: entry.path,
    fileSize: entry.size,
    fileModified: entry.mtimeMs,
    local: true,
    sampleRate: Number(format.sampleRate) || 0,
    bitDepth: Number(format.bitsPerSample) || 0,
    bitrate: Number(format.bitrate) || 0,
    codec: format.codec || extension.replace(".", "").toUpperCase(),
  };
}

async function scanLibrary(root, options, webContents) {
  const folder = path.resolve(String(root || "").trim());
  const stat = await fsp.stat(folder).catch(() => null);
  if (!stat || !stat.isDirectory()) {
    throw new Error("That music folder could not be found.");
  }

  sendScanProgress(webContents, { phase: "walking", inspected: 0 });
  const files = await collectAudioFiles(folder, (p) => sendScanProgress(webContents, p));
  const filterNonMusic = options?.filterNonMusic !== false;
  const artworkDir = path.join(app.getPath("userData"), "local-artwork");
  await fsp.mkdir(artworkDir, { recursive: true });

  const previous = await readSavedLibrary();
  const reuse = new Map(
    (previous.folder === folder ? previous.tracks : []).map((t) => [t.filePath, t])
  );

  const tracks = [];
  let totalBytes = 0;
  let skipped = 0;
  let processed = 0;

  for (const entry of files) {
    processed += 1;
    totalBytes += entry.size;
    const cached = reuse.get(entry.path);
    if (cached && cached.fileSize === entry.size && cached.fileModified === entry.mtimeMs) {
      if (filterNonMusic && cached.duration > 0 && cached.duration < 30) {
        skipped += 1;
      } else {
        tracks.push(cached);
      }
    } else {
      try {
        const parsed = await parseLocalTrack(entry, artworkDir);
        if (filterNonMusic && parsed.duration > 0 && parsed.duration < 30) {
          skipped += 1;
        } else {
          tracks.push(parsed);
        }
      } catch {
        skipped += 1;
      }
    }
    if (processed % 20 === 0 || processed === files.length) {
      sendScanProgress(webContents, {
        phase: "reading",
        processed,
        total: files.length,
        found: tracks.length,
        skipped,
      });
    }
  }

  tracks.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
  const result = {
    folder,
    scannedAt: new Date().toISOString(),
    tracks,
    totalBytes,
    skipped,
  };
  await saveLibrary(result);
  sendScanProgress(webContents, {
    phase: "done",
    processed: files.length,
    total: files.length,
    found: tracks.length,
    skipped,
  });
  return result;
}

/* ------------------------------------------------------------------ */
/*  File Response Protocol Handlers                                   */
/* ------------------------------------------------------------------ */

function isWithin(parent, child) {
  const relative = path.relative(parent, child);
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}

async function fileResponse(filePath, request, cacheControl = "no-cache") {
  const stat = await fsp.stat(filePath);
  const mime = MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
  const headers = {
    "Content-Type": mime,
    "Accept-Ranges": "bytes",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Cache-Control": cacheControl,
  };
  const rangeHeader = request?.headers?.get("range");
  if (rangeHeader) {
    const range = parseByteRange(rangeHeader, stat.size);
    if (range) {
      const { start, end } = range;
      const stream = fs.createReadStream(filePath, { start, end });
      return new Response(Readable.toWeb(stream), {
        status: 206,
        headers: {
          ...headers,
          "Content-Length": String(end - start + 1),
          "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        },
      });
    }
  }
  const stream = fs.createReadStream(filePath);
  return new Response(Readable.toWeb(stream), {
    status: 200,
    headers: { ...headers, "Content-Length": String(stat.size) },
  });
}

async function handleAppRequest(request) {
  const url = new URL(request.url);
  let pathname = decodeURIComponent(url.pathname);
  if (!pathname || pathname === "/") pathname = "/index.html";
  const candidate = path.resolve(APP_ROOT, pathname.replace(/^\/+/, ""));
  if (!isWithin(APP_ROOT, candidate)) {
    return new Response("Not found", { status: 404 });
  }
  try {
    return await fileResponse(candidate, request);
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

async function handleAddonStreamRequest(addonId, trackId, request) {
  try {
    const addons = loadAddons();
    const cleanAddonId = decodeURIComponent(addonId);
    const cleanTrackId = decodeURIComponent(trackId);
    const addon = addons.find((a) => a.id === cleanAddonId || a.name === cleanAddonId) || addons[0];
    if (!addon) return new Response("Addon not found", { status: 404 });
    const base = addon.baseUrl.replace(/\/+$/, "");
    console.log(`[chordly] Resolving stream for "${cleanTrackId}" on ${addon.name}...`);

    let streamRes = await fetch(`${base}/stream/${encodeURIComponent(cleanTrackId)}`, {
      headers: { "User-Agent": "Chordly/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!streamRes.ok) {
      streamRes = await fetch(`${base}/stream?id=${encodeURIComponent(cleanTrackId)}`, {
        headers: { "User-Agent": "Chordly/1.0" },
        signal: AbortSignal.timeout(10000),
      });
    }

    if (!streamRes.ok) {
      return new Response(`Addon stream error: ${streamRes.status}`, { status: streamRes.status });
    }

    const contentType = streamRes.headers.get("content-type") || "";
    let audioUrl = null;
    if (contentType.includes("application/json")) {
      const json = await streamRes.json();
      audioUrl = json.url || json.streamUrl;
    } else if (streamRes.url) {
      audioUrl = streamRes.url;
    }

    if (!audioUrl) {
      return new Response("Could not find audio URL from addon stream response", { status: 502 });
    }

    console.log(`[chordly] Streaming addon audio from: ${audioUrl.slice(0, 80)}...`);
    const reqHeaders = {};
    const range = request.headers.get("range");
    if (range) reqHeaders["range"] = range;
    reqHeaders["User-Agent"] = "Chordly/1.0";

    const audioRes = await fetch(audioUrl, { headers: reqHeaders });
    const resHeaders = new Headers();
    const isFlac =
      audioUrl.toLowerCase().includes(".flac") ||
      cleanTrackId.toLowerCase().includes("flac") ||
      (addon.name || "").toLowerCase().includes("lossless") ||
      true;
    resHeaders.set("Content-Type", isFlac ? "audio/flac" : (audioRes.headers.get("content-type") || "audio/flac"));
    resHeaders.set("Accept-Ranges", "bytes");
    resHeaders.set("Access-Control-Allow-Origin", "*");
    resHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    resHeaders.set("Access-Control-Allow-Headers", "*");
    if (audioRes.headers.get("content-range")) {
      resHeaders.set("Content-Range", audioRes.headers.get("content-range"));
    }
    if (audioRes.headers.get("content-length")) {
      resHeaders.set("Content-Length", audioRes.headers.get("content-length"));
    }

    return new Response(audioRes.body, {
      status: audioRes.status,
      headers: resHeaders,
    });
  } catch (err) {
    console.error("[chordly] handleAddonStreamRequest error:", err.message);
    return new Response(err.message, { status: 500 });
  }
}

async function handleMediaRequest(request) {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/addon/")) {
    const parts = url.pathname.replace(/^\/addon\//, "").split("/");
    const addonId = parts[0];
    const trackId = parts.slice(1).join("/");
    return await handleAddonStreamRequest(addonId, trackId, request);
  }

  let filePath;
  try {
    filePath = Buffer.from(url.pathname.replace(/^\/+/, ""), "base64url").toString("utf8");
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  const extension = path.extname(filePath).toLowerCase();
  if (!AUDIO_EXTENSIONS.has(extension) && !IMAGE_EXTENSIONS.has(extension)) {
    return new Response("Forbidden", { status: 403 });
  }
  try {
    return await fileResponse(filePath, request, "private, max-age=31536000");
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

function registerProtocol() {
  protocol.handle(APP_SCHEME, async (request) => {
    const host = new URL(request.url).hostname;
    if (host === APP_HOST) return handleAppRequest(request);
    if (host === MEDIA_HOST) return handleMediaRequest(request);
    if (host === STREAM_HOST) return handleYouTubeStream(request);
    return new Response("Not found", { status: 404 });
  });
}

/* ------------------------------------------------------------------ */
/*  IPC Handlers Registration                                         */
/* ------------------------------------------------------------------ */

function registerIpc() {
  // Discord Rich Presence
  ipcMain.handle("discord:set-activity", (_event, activity) => {
    discordRpc.setActivity(activity);
    return true;
  });
  ipcMain.handle("discord:update-presence", (_event, payload) => {
    if (payload?.track) {
      discordRpc.setActivity({
        title: payload.track.title,
        artist: payload.track.artist,
        album: payload.track.album,
        cover: payload.track.cover,
        isPlaying: payload.isPlaying,
        progress: payload.currentTime,
        duration: payload.duration,
      });
    } else {
      discordRpc.setActivity(payload);
    }
    return true;
  });
  ipcMain.handle("discord:clear-activity", () => {
    discordRpc.clearActivity();
    return true;
  });
  ipcMain.handle("discord:set-enabled", (_event, enabled) => {
    const isBool = typeof enabled === "boolean" ? enabled : Boolean(enabled?.enabled);
    discordRpc.setEnabled(isBool);
    return true;
  });
  ipcMain.handle("discord:set-client-id", (_event, clientId) => {
    discordRpc.setClientId(clientId);
    return true;
  });

  // Party Mode (Listen Together)
  ipcMain.handle("party:create", async () => {
    return await partyServer.createRoom();
  });
  ipcMain.handle("party:get-info", async () => {
    return {
      ip: partyServer.getLocalIp(),
      port: partyServer.port,
      wsUrl: `ws://${partyServer.getLocalIp()}:${partyServer.port}`,
    };
  });
  ipcMain.handle("party:stop", async () => {
    partyServer.stop();
    return true;
  });

  // Factory Reset
  ipcMain.handle("app:factory-reset", async () => {
    try {
      const userData = app.getPath("userData");
      const filesToDelete = [
        "accounts.json",
        "playlists.json",
        "library.json",
        "addons.json",
        "settings.json",
      ];
      for (const file of filesToDelete) {
        const p = path.join(userData, file);
        if (fs.existsSync(p)) {
          try {
            fs.unlinkSync(p);
          } catch {}
        }
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        await mainWindow.webContents.session.clearStorageData();
        await mainWindow.webContents.session.clearCache();
      }
      return true;
    } catch (e) {
      console.warn("Factory reset error:", e);
      return false;
    }
  });

  // Window controls
  ipcMain.handle("window:minimize", (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });
  ipcMain.handle("window:toggle-maximize", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return false;
    if (win.isMaximized()) {
      win.unmaximize();
      return false;
    }
    win.maximize();
    return true;
  });
  ipcMain.handle("window:close", (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });
  ipcMain.handle("window:is-maximized", (event) => {
    return Boolean(BrowserWindow.fromWebContents(event.sender)?.isMaximized());
  });

  // Local library
  ipcMain.handle("library:get", () => readSavedLibrary());
  ipcMain.handle("library:scan", async (event, folder, options) => {
    return scanLibrary(folder, options, event.sender);
  });
  ipcMain.handle("library:choose", async (event, options) => {
    const window = BrowserWindow.fromWebContents(event.sender) ?? mainWindow;
    const choice = await dialog.showOpenDialog(window, {
      title: "Choose your music folder",
      properties: ["openDirectory"],
    });
    if (choice.canceled || !choice.filePaths.length) return null;
    return scanLibrary(choice.filePaths[0], options, event.sender);
  });
  ipcMain.handle("library:show-in-folder", async (_event, filePath) => {
    if (typeof filePath !== "string") return false;
    shell.showItemInFolder(filePath);
    return true;
  });

  // Search
  ipcMain.handle("youtube:search", async (_event, query) => {
    return searchYouTube(query);
  });
  ipcMain.handle("ytm:search", async (_event, { query }) => {
    return searchYouTube(query);
  });

  // Home & Explore Feeds
  ipcMain.handle("ytm:get-home", async () => {
    const accounts = loadAccounts();
    const activeAccount = accounts.find((a) => a.isActive) || accounts[0];
    if (activeAccount) {
      try {
        return await ytmAuthenticatedFetch("browse", activeAccount, { browseId: "FEmusic_home" });
      } catch (e) {
        console.warn("[chordly] Auth home feed error, using guest Innertube:", e.message);
      }
    }
    const yt = await youtubeClient();
    return await yt.music.getHomeFeed();
  });

  ipcMain.handle("ytm:get-explore", async () => {
    try {
      const yt = await youtubeClient();
      const exp = await yt.music.getExplore();
      const newReleases = [];
      const trending = [];

      // Section 0 is usually New albums & singles
      const sec0 = exp.sections?.[0]?.contents || [];
      for (const item of sec0.slice(0, 18)) {
        const id = item.id || item.endpoint?.payload?.browseId;
        const title = item.title?.text || item.title;
        if (!id || !title) continue;
        const artist =
          item.subtitle?.text?.split("•")?.[1]?.trim() ||
          item.subtitle?.text ||
          item.artists?.[0]?.name ||
          item.author?.name ||
          "Various Artists";
        const rawThumb = item.thumbnail?.[0]?.url || item.thumbnails?.[0]?.url;
        const cover = upgradeThumbnailUrl(rawThumb);
        newReleases.push({
          id,
          title,
          artist,
          artistId: `art-${id}`,
          cover,
          year: new Date().getFullYear(),
          type: "album",
          trackCount: 10,
        });
      }

      // Section 2 & 3 are usually Trending & New Music Videos
      const candidateTracks = [
        ...(exp.sections?.[2]?.contents || []),
        ...(exp.sections?.[3]?.contents || []),
      ];

      const seen = new Set();
      for (const item of candidateTracks) {
        const videoId = item.id || item.endpoint?.payload?.videoId;
        if (!videoId || seen.has(videoId)) continue;
        seen.add(videoId);
        const title = item.title?.text || item.title;
        if (!title) continue;
        const artist =
          item.authors?.[0]?.name ||
          item.artists?.[0]?.name ||
          item.subtitle?.text ||
          "YouTube Music";
        const rawThumb = item.thumbnails?.[0]?.url || item.thumbnail?.[0]?.url;
        const cover = upgradeThumbnailUrl(rawThumb);
        const duration = Number(item.duration?.seconds) || 210;

        trending.push({
          id: videoId,
          videoId,
          title,
          artistId: `yt-art-${videoId}`,
          artist,
          albumId: `yt-alb-${videoId}`,
          album: "Trending",
          cover,
          genre: "YouTube",
          moods: ["Trending"],
          src: `${APP_SCHEME}://${STREAM_HOST}/${videoId}`,
          duration,
          year: new Date().getFullYear(),
          plays: "YouTube",
          video: false,
          quality: "High",
          remote: true,
          source: "youtube",
        });
      }

      return { newReleases, trending };
    } catch (err) {
      console.warn("[chordly] ytm:get-explore error:", err.message);
      return { newReleases: [], trending: [] };
    }
  });

  // Accounts
  ipcMain.handle("accounts:list", () => {
    return loadAccounts();
  });

  ipcMain.handle("accounts:add", async () => {
    return await openAuthWindow();
  });

  ipcMain.handle("accounts:add-cookie", async (_event, cookieString) => {
    if (!cookieString || typeof cookieString !== "string") {
      throw new Error("Please provide a valid cookie string.");
    }
    const cleanCookie = cookieString.trim();
    const tempAccount = {
      id: `acc_${Date.now()}`,
      cookies: cleanCookie,
      rawCookies: cleanCookie,
      authUser: "0",
    };

    console.log("[chordly] Verifying pasted cookie via account_menu with WEB_REMIX...");
    const menuJson = await ytmAuthenticatedFetch("account/account_menu", tempAccount, {});
    const profileInfo = parseAccountMenuResponse(menuJson);
    console.log("[chordly] ✓ Account verified from cookie:", profileInfo.name);

    let brandAccounts = [];
    try {
      const listJson = await ytmAuthenticatedFetch("account/accounts_list", tempAccount, {});
      brandAccounts = parseBrandAccountsList(listJson, profileInfo);
    } catch {
      brandAccounts = [
        {
          id: "0",
          name: profileInfo.name,
          handle: profileInfo.handle,
          avatarUrl: profileInfo.avatarUrl,
          authUser: "0",
          pageId: null,
          isSelected: true,
        },
      ];
    }

    const newAccount = {
      id: `yt-${Date.now()}`,
      name: profileInfo.name || "YouTube Music User",
      handle: profileInfo.handle || "@user",
      email: profileInfo.email || profileInfo.handle || "listener@google.com",
      avatarUrl: profileInfo.avatarUrl || "",
      initial: (profileInfo.name || "U")[0].toUpperCase(),
      color: `hsl(${Math.random() * 360}, 70%, 50%)`,
      plan: "Music Premium",
      cookies: {
        sapisid: extractCookieValue(cleanCookie, "SAPISID") || extractCookieValue(cleanCookie, "__Secure-3PAPISID") || "",
        secure3papisid: extractCookieValue(cleanCookie, "__Secure-3PAPISID") || "",
        hsid: extractCookieValue(cleanCookie, "HSID") || "",
        ssid: extractCookieValue(cleanCookie, "SSID") || "",
        apisid: extractCookieValue(cleanCookie, "APISID") || "",
        loginInfo: extractCookieValue(cleanCookie, "LOGIN_INFO") || "",
      },
      rawCookies: cleanCookie,
      authUser: "0",
      pageId: null,
      brandAccounts,
      isActive: true,
      syncedAt: Date.now(),
    };

    const savedAccounts = loadAccounts().map((a) => ({ ...a, isActive: false }));
    savedAccounts.push(newAccount);
    saveAccounts(savedAccounts);

    try {
      const initialPlaylists = await fetchUserPlaylistsFromYTM(newAccount);
      const allPlaylists = loadPlaylists();
      allPlaylists[newAccount.id] = initialPlaylists;
      savePlaylists(allPlaylists);
    } catch (plErr) {
      console.warn("[chordly] Initial playlist fetch error:", plErr.message);
    }

    return newAccount;
  });

  ipcMain.handle("accounts:remove", (_event, accountId) => {
    let accounts = loadAccounts();
    accounts = accounts.filter((a) => a.id !== accountId);
    saveAccounts(accounts);
    const playlists = loadPlaylists();
    delete playlists[accountId];
    savePlaylists(playlists);
    return true;
  });

  ipcMain.handle("accounts:switch", (_event, accountId) => {
    const accounts = loadAccounts().map((a) => ({
      ...a,
      isActive: a.id === accountId,
    }));
    saveAccounts(accounts);
    return true;
  });

  ipcMain.handle("accounts:brand-accounts", async (_event, accountId) => {
    const accounts = loadAccounts();
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return [];
    return account.brandAccounts || [];
  });

  ipcMain.handle("accounts:switch-brand", async (_event, ...args) => {
    // Supports both (accountId, brandId) and ({ accountId, authUser, pageId })
    const accountId = typeof args[0] === "object" ? args[0].accountId : args[0];
    const brandId = typeof args[0] === "object" ? args[0].pageId || args[0].authUser : args[1];

    const accounts = loadAccounts();
    const account = accounts.find((a) => a.id === accountId);
    if (!account) throw new Error("Account not found");

    account.activeBrandId = brandId;
    saveAccounts(accounts);

    const playlists = await fetchUserPlaylistsFromYTM(account);
    const saved = loadPlaylists();
    saved[accountId] = playlists;
    savePlaylists(saved);

    return { success: true, playlists };
  });

  // Two-Way Playlists
  ipcMain.handle("playlists:fetch", async (_event, accountId) => {
    try {
      const accounts = loadAccounts();
      const account = accountId
        ? accounts.find((a) => a.id === accountId)
        : accounts.find((a) => a.isActive) || accounts[0];
      if (!account) return [];

      const playlists = await fetchUserPlaylistsFromYTM(account);
      const saved = loadPlaylists();
      saved[account.id] = playlists;
      savePlaylists(saved);

      return playlists;
    } catch (error) {
      console.error("[chordly] playlists:fetch error:", error.message);
      return [];
    }
  });

  ipcMain.handle("playlists:get", (_event, accountId) => {
    const saved = loadPlaylists();
    if (accountId) return saved[accountId] || [];
    const accounts = loadAccounts();
    const activeAccount = accounts.find((a) => a.isActive) || accounts[0];
    return activeAccount ? saved[activeAccount.id] || [] : [];
  });

  ipcMain.handle("playlists:get-tracks", async (_event, playlistId, accountId) => {
    try {
      const accounts = loadAccounts();
      const account = accountId
        ? accounts.find((a) => a.id === accountId)
        : accounts.find((a) => a.isActive) || accounts[0];
      if (!account) return [];
      const tracks = await fetchPlaylistTracksFromYTM(account, playlistId);
      if (tracks.length > 0) {
        try {
          const saved = loadPlaylists();
          const accPlaylists = saved[account.id] || [];
          const cleanId = String(playlistId).startsWith("VL") ? String(playlistId).slice(2) : String(playlistId);
          const target = accPlaylists.find(
            (p) => p.id === cleanId || p.browseId === playlistId || p.id === playlistId
          );
          if (target) {
            target.trackIds = tracks.map((t) => t.id);
            target.trackCount = tracks.length;
            savePlaylists(saved);
          }
        } catch {
          // ignore cache write error
        }
      }
      return tracks;
    } catch (err) {
      console.error("[chordly] playlists:get-tracks error:", err.message);
      return [];
    }
  });

  ipcMain.handle("playlists:create", async (_event, ...args) => {
    const accounts = loadAccounts();
    let account = null;
    let title = "";
    let description = "";

    if (typeof args[0] === "object") {
      title = args[0].title || "Untitled Playlist";
      description = args[0].description || "";
      account = accounts.find((a) => a.isActive) || accounts[0];
    } else {
      const accountId = args[0];
      title = args[1] || "Untitled Playlist";
      description = args[2] || "";
      account = accounts.find((a) => a.id === accountId) || accounts[0];
    }

    if (!account) throw new Error("No active Google account connected");
    const playlistId = await createYTMPlaylist(account, title, description);
    return { id: playlistId, name: title, description };
  });

  ipcMain.handle("playlists:add-track", async (_event, ...args) => {
    const accounts = loadAccounts();
    let account = null;
    let playlistId = "";
    let videoId = "";

    if (typeof args[0] === "object") {
      playlistId = args[0].playlistId;
      videoId = args[0].videoId;
      account = accounts.find((a) => a.isActive) || accounts[0];
    } else if (args.length === 3) {
      account = accounts.find((a) => a.id === args[0]);
      playlistId = args[1];
      videoId = args[2];
    } else {
      playlistId = args[0];
      videoId = args[1];
      account = accounts.find((a) => a.isActive) || accounts[0];
    }

    if (!account) throw new Error("No active Google account connected");
    await addTracksToYTMPlaylist(account, playlistId, videoId);
    return { success: true };
  });

  ipcMain.handle("playlists:remove-track", async (_event, ...args) => {
    const accounts = loadAccounts();
    let account = null;
    let playlistId = "";
    let videoId = "";
    let setVideoId = "";

    if (typeof args[0] === "object") {
      playlistId = args[0].playlistId;
      videoId = args[0].videoId;
      setVideoId = args[0].setVideoId;
      account = accounts.find((a) => a.isActive) || accounts[0];
    } else if (args.length >= 4) {
      account = accounts.find((a) => a.id === args[0]);
      playlistId = args[1];
      videoId = args[2];
      setVideoId = args[3];
    } else {
      playlistId = args[0];
      videoId = args[1];
      setVideoId = args[2];
      account = accounts.find((a) => a.isActive) || accounts[0];
    }

    if (!account) throw new Error("No active Google account connected");
    await removeTrackFromYTMPlaylist(account, playlistId, videoId, setVideoId);
    return { success: true };
  });

  // Universal Spotify / Link Importer
  const handleSpotifyImport = async (_event, payload) => {
    return await importSpotifyPlaylist(payload);
  };
  ipcMain.handle("playlists:import-spotify-url", handleSpotifyImport);
  ipcMain.handle("playlist:import-spotify", handleSpotifyImport);

async function fetchAddonManifest(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") {
    throw new Error("Invalid addon URL");
  }
  let clean = rawUrl.trim();
  let manifestUrl = clean;
  if (!manifestUrl.endsWith("/manifest.json")) {
    manifestUrl = manifestUrl.replace(/\/+$/, "") + "/manifest.json";
  }
  const baseUrl = manifestUrl.replace(/\/manifest\.json$/, "");

  console.log("[chordly] Fetching addon manifest from:", manifestUrl);
  const response = await fetch(manifestUrl, {
    headers: { "User-Agent": "Chordly/1.0" },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch manifest: HTTP ${response.status} ${response.statusText}`);
  }
  const json = await response.json();
  if (!json || typeof json !== "object") {
    throw new Error("Manifest response is not a valid JSON object");
  }

  const id = json.id || `addon-${Date.now()}`;
  const name = json.name || new URL(baseUrl).hostname;
  const version = json.version || "1.0.0";
  const resources = Array.isArray(json.resources) ? json.resources : ["search", "stream"];
  const isHiRes = String(json.settings?.find((s) => s.key === "quality")?.default || "").toUpperCase().includes("HI_RES");
  const quality = isHiRes ? "Hi-Res Lossless 24-bit/192kHz" : "Lossless FLAC · 16/24-bit";

  return {
    id,
    name,
    version,
    resources,
    quality,
    baseUrl,
    manifestUrl,
    enabled: true,
    icon: name.charAt(0).toUpperCase(),
    settings: json.settings || [],
    allowDownloads: Boolean(json.allowDownloads),
  };
}

async function searchAddons(query) {
  const clean = String(query || "").trim();
  if (!clean) return [];
  const addons = loadAddons().filter((a) => a.enabled);
  const allTracks = [];

  for (const addon of addons) {
    try {
      const base = addon.baseUrl.replace(/\/+$/, "");
      let res = await fetch(`${base}/search?q=${encodeURIComponent(clean)}`, {
        headers: { "User-Agent": "Chordly/1.0" },
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) {
        res = await fetch(`${base}/search?query=${encodeURIComponent(clean)}`, {
          headers: { "User-Agent": "Chordly/1.0" },
          signal: AbortSignal.timeout(6000),
        });
      }

      if (!res.ok) continue;
      const json = await res.json();
      const rawList = Array.isArray(json)
        ? json
        : Array.isArray(json.tracks)
          ? json.tracks
          : Array.isArray(json.results)
            ? json.results
            : [];

      for (const item of rawList) {
        const rawId = String(item.id || item.trackId || "");
        if (!rawId) continue;
        const trackId = `addon_${addon.id}_${rawId}`;
        const format = (item.format || "flac").toLowerCase();
        const isLossless =
          format === "flac" ||
          String(item.audioQuality).toUpperCase().includes("LOSSLESS") ||
          String(item.quality).toUpperCase().includes("LOSSLESS");
        const qualityLabel = isLossless ? "Lossless" : "High";

        allTracks.push({
          id: trackId,
          rawAddonId: rawId,
          addonId: addon.id,
          addonBaseUrl: addon.baseUrl,
          title: item.title || "Untitled",
          artist: item.artist || addon.name,
          artistId: `art-${addon.id}-${encodeURIComponent(item.artist || "addon")}`,
          album: item.album || "",
          albumId: `alb-${addon.id}-${encodeURIComponent(item.album || "addon")}`,
          duration: Math.round(Number(item.duration) || 210),
          durationText: item.duration
            ? `${Math.floor(item.duration / 60)}:${Math.floor(item.duration % 60).toString().padStart(2, "0")}`
            : "3:30",
          cover: item.cover || item.thumbnail || item.artwork || "",
          quality: qualityLabel,
          format,
          lossless: isLossless,
          codec: format,
          bitDepth: item.bitDepth || (isLossless ? 16 : undefined),
          sampleRate: item.sampleRate || (isLossless ? 44100 : undefined),
          bitrate: item.bitrate || (isLossless ? 990000 : 256000),
          plays: addon.name,
          source: addon.name,
          src: `${APP_SCHEME}://${MEDIA_HOST}/addon/${encodeURIComponent(addon.id)}/${encodeURIComponent(rawId)}`,
          remote: true,
          year: item.year || new Date().getFullYear(),
        });
      }
    } catch (err) {
      console.warn(`[chordly] Addon "${addon.name}" search error:`, err.message);
    }
  }

  return allTracks;
}

async function resolveAddonStream(addonId, trackId) {
  const addons = loadAddons();
  const cleanAddonId = decodeURIComponent(addonId);
  const cleanTrackId = decodeURIComponent(trackId);
  const addon = addons.find((a) => a.id === cleanAddonId || a.name === cleanAddonId) || addons[0];
  if (!addon) throw new Error("Addon not found");
  const base = addon.baseUrl.replace(/\/+$/, "");

  let res = await fetch(`${base}/stream/${encodeURIComponent(cleanTrackId)}`, {
    headers: { "User-Agent": "Chordly/1.0" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    res = await fetch(`${base}/stream?id=${encodeURIComponent(cleanTrackId)}`, {
      headers: { "User-Agent": "Chordly/1.0" },
      signal: AbortSignal.timeout(10000),
    });
  }

  if (!res.ok) {
    throw new Error(`Addon stream resolution failed: HTTP ${res.status}`);
  }

  const contentType = res.headers.get("content-type") || "";
  let json = {};
  if (contentType.includes("application/json")) {
    json = await res.json();
  }

  const audioUrl = json.url || json.streamUrl || res.url;
  return {
    url: audioUrl,
    format: json.format || "flac",
    quality: json.quality || "Lossless · 16-bit / 44.1 kHz",
    codec: json.codec || "flac",
    bitDepth: json.bitDepth || 16,
    sampleRate: json.sampleRate || 44100,
    bitrate: json.bitrate || 990208,
    streamHost: audioUrl ? new URL(audioUrl).hostname : new URL(base).hostname,
    source: addon.name,
  };
}

  // Addons Engine
  ipcMain.handle("addons:list", () => loadAddons());

  ipcMain.handle("addons:fetch-manifest", async (_event, url) => {
    return await fetchAddonManifest(url);
  });

  ipcMain.handle("addons:add", async (_event, urlOrObj) => {
    const addons = loadAddons();
    let newAddon;
    if (typeof urlOrObj === "string") {
      newAddon = await fetchAddonManifest(urlOrObj);
    } else if (urlOrObj && urlOrObj.baseUrl && !urlOrObj.manifestUrl) {
      newAddon = await fetchAddonManifest(urlOrObj.baseUrl);
    } else {
      newAddon = {
        id: urlOrObj.id || `addon-${Date.now()}`,
        ...urlOrObj,
        enabled: true,
      };
    }

    // Replace if existing or append
    const idx = addons.findIndex((a) => a.id === newAddon.id || a.baseUrl === newAddon.baseUrl);
    if (idx >= 0) {
      addons[idx] = newAddon;
    } else {
      addons.push(newAddon);
    }
    saveAddons(addons);
    return addons;
  });

  ipcMain.handle("addons:remove", (_event, addonId) => {
    let addons = loadAddons();
    addons = addons.filter((a) => a.id !== addonId);
    saveAddons(addons);
    return addons;
  });

  ipcMain.handle("addons:toggle", (_event, addonId) => {
    const addons = loadAddons();
    const target = addons.find((a) => a.id === addonId);
    if (target) {
      target.enabled = !target.enabled;
      saveAddons(addons);
    }
    return addons;
  });

  ipcMain.handle("addons:reorder", (_event, orderedIds) => {
    const addons = loadAddons();
    const map = new Map(addons.map((a) => [a.id, a]));
    const reordered = orderedIds.map((id) => map.get(id)).filter(Boolean);
    saveAddons(reordered);
    return reordered;
  });

  ipcMain.handle("addons:search", async (_event, query) => {
    return await searchAddons(query);
  });

  ipcMain.handle("addons:resolve-stream", async (_event, { addonId, trackId }) => {
    return await resolveAddonStream(addonId, trackId);
  });

  // Stream Resolver
  ipcMain.handle("stream:resolve", async (_event, track) => {
    if (!track) throw new Error("No track specified");
    if (track.videoId || track.id) {
      const vid = track.videoId || track.id;
      return await resolveYouTubeStream(vid);
    }
    throw new Error("Track has no videoId");
  });

  // Cache & Storage
  ipcMain.handle("storage:clear-cache", async (_event, type) => {
    if (type === "all" || type === "stream") {
      youtubeStreamCache.clear();
      youtubeSearchCache.clear();
    }
    return true;
  });

  // Lyrics
  ipcMain.handle("lyrics:get", async (_event, track, preferredProvider) => {
    return await fetchLyrics(track, preferredProvider);
  });

  // External Links
  ipcMain.handle("app:open-external", async (_event, url) => {
    if (typeof url !== "string" || !/^(https?:|mailto:)/i.test(url)) return false;
    await shell.openExternal(url);
    return true;
  });

  // Discord Bug Report Webhook
  ipcMain.handle("app:send-discord-report", async (_event, payload) => {
    const webhookUrl = "https://discord.com/api/webhooks/1566397232067121282/SPnL7O2SQuIrGNqTUd2tjbiduoBPzHnqnewFb_tNUtQYobi6_wV8Z7fUVMRqjMRR1xmI";
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return { success: res.ok, status: res.status };
    } catch (err) {
      console.warn("[chordly] Discord report webhook error:", err);
      return { success: false, error: err?.message || String(err) };
    }
  });
}

/* ------------------------------------------------------------------ */
/*  Window Management                                                 */
/* ------------------------------------------------------------------ */

function windowStateFile() {
  return path.join(app.getPath("userData"), "window-state.json");
}

function readWindowState() {
  try {
    const parsed = JSON.parse(fs.readFileSync(windowStateFile(), "utf8"));
    if (
      Number.isFinite(parsed.width) &&
      Number.isFinite(parsed.height) &&
      Number.isFinite(parsed.x) &&
      Number.isFinite(parsed.y)
    ) {
      const onScreen = screen.getAllDisplays().some((display) => {
        const area = display.workArea;
        return (
          parsed.x < area.x + area.width &&
          parsed.x + parsed.width > area.x &&
          parsed.y < area.y + area.height &&
          parsed.y + parsed.height > area.y
        );
      });
      if (onScreen) return parsed;
    }
  } catch {
    /* no saved state */
  }
  return null;
}

function saveWindowState(window) {
  try {
    if (!window || window.isDestroyed()) return;
    const bounds = window.isMaximized() ? window.getNormalBounds() : window.getBounds();
    fs.writeFileSync(
      windowStateFile(),
      JSON.stringify({ ...bounds, maximized: window.isMaximized() }),
      "utf8"
    );
  } catch {
    /* best effort */
  }
}

async function createWindow() {
  const saved = readWindowState();
  mainWindow = new BrowserWindow({
    width: saved?.width ?? 1440,
    height: saved?.height ?? 920,
    x: saved?.x,
    y: saved?.y,
    minWidth: 920,
    minHeight: 640,
    frame: false,
    show: false,
    backgroundColor: "#050505",
    icon: fs.existsSync(path.join(__dirname, "icon.ico"))
      ? path.join(__dirname, "icon.ico")
      : path.join(__dirname, "..", "public", "icon.ico"),
    autoHideMenuBar: true,
    title: "Chordly",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      devTools: true,
      backgroundThrottling: true,
    },
  });

  mainWindow.once("ready-to-show", () => {
    if (saved?.maximized) mainWindow.maximize();
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on("close", () => saveWindowState(mainWindow));
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^(https?:|mailto:)/i.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(`${APP_SCHEME}://${APP_HOST}/`)) {
      event.preventDefault();
      if (/^(https?:|mailto:)/i.test(url)) void shell.openExternal(url);
    }
  });

  const devUrl = process.env.CHORDLY_DEV_URL;
  if (devUrl) {
    await mainWindow.loadURL(devUrl);
  } else {
    const appUrl = `${APP_SCHEME}://${APP_HOST}/index.html`;
    await mainWindow.loadURL(appUrl);
  }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.setAppUserModelId("com.chordly.desktop");
  app.setName("Chordly");
  Menu.setApplicationMenu(null);

  app.whenReady().then(async () => {
    if (app.userAgentFallback) {
      app.userAgentFallback = app.userAgentFallback
        .replace(/Electron\/[0-9.]+\s*/gi, "")
        .replace(/Chordly\/[0-9.]+\s*/gi, "")
        .replace(/\s+/g, " ")
        .trim();
    }
    registerProtocol();
    registerIpc();
    discordRpc.connect();
    await createWindow();

    // Gentle memory cleanup when idle/minimized (never clear cache during playback)
    setInterval(() => {
      if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isMinimized()) {
        if (global.gc) global.gc();
      }
    }, 5 * 60 * 1000);

    if (mainWindow) {
      mainWindow.on("minimize", () => {
        if (global.gc) global.gc();
      });
    }

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) void createWindow();
    });
  });

  app.on("before-quit", () => {
    discordRpc.destroy();
    partyServer.stop();
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
