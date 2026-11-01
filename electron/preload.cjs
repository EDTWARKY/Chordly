const { contextBridge, ipcRenderer } = require("electron");

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

// Master Prompt Part 4 specification bridge: window.chordly & window.desktop
const chordlyBridge = {
  // Window Controls
  minimizeWindow: () => invoke("window:minimize"),
  maximizeWindow: () => invoke("window:toggle-maximize"),
  closeWindow: () => invoke("window:close"),

  // Google / YouTube Music Multi-Account & Brand Account Auth
  listAccounts: () => invoke("accounts:list"),
  addAccount: () => invoke("accounts:add", "youtube"),
  addAccountWithCookie: (cookieString) => invoke("accounts:add-cookie", cookieString),
  removeAccount: (accountId) => invoke("accounts:remove", accountId),
  switchActiveAccount: (accountId) => invoke("accounts:switch", accountId),
  getBrandAccounts: (accountId) => invoke("accounts:brand-accounts", accountId),
  switchBrandAccount: (accountId, authUser, pageId) =>
    invoke("accounts:switch-brand", accountId, authUser, pageId),

  // Two-Way YouTube Music Playlists
  fetchPlaylists: (accountId) => invoke("playlists:fetch", accountId),
  getPlaylists: (accountId) => invoke("playlists:get", accountId),
  getPlaylistTracks: (playlistId, accountId) => invoke("playlists:get-tracks", playlistId, accountId),
  createPlaylist: (payload) => invoke("playlists:create", payload),
  addTrackToPlaylist: (playlistId, videoId, accountId) =>
    invoke("playlists:add-track", playlistId, videoId, accountId),
  removeTrackFromPlaylist: (playlistId, videoId, setVideoId, accountId) =>
    invoke("playlists:remove-track", playlistId, videoId, setVideoId, accountId),

  // Universal Playlist Importer (Spotify Link / YouTube Link / CSV / M3U8)
  importSpotifyPlaylistUrl: (url, saveToYTM, accountId) =>
    invoke("playlist:import-spotify", { spotifyUrl: url, url, saveToYTM, accountId }),

  // YouTube Music Catalog, Home Feed, Explore & Search
  getHomeFeed: () => invoke("ytm:get-home"),
  getExploreFeed: () => invoke("ytm:get-explore"),
  searchYouTube: (query, filter) => invoke("ytm:search", { query, filter }),
  resolveStreamUrl: (track) => invoke("stream:resolve", track),

  // Custom Lossless URL Addons & Network Shares
  listAddons: () => invoke("addons:list"),
  addAddonUrl: (url) => invoke("addons:add", url),
  removeAddon: (addonId) => invoke("addons:remove", addonId),
  reorderAddons: (orderedIds) => invoke("addons:reorder", orderedIds),
  searchAddons: (query) => invoke("addons:search", query),
  fetchAddonManifest: (url) => invoke("addons:fetch-manifest", url),
  resolveAddonStream: (addonId, trackId) =>
    invoke("addons:resolve-stream", { addonId, trackId }),

  // Local Music & Cache Management
  scanLocalMusic: (folderPath, filterNonMusic) =>
    invoke("library:scan", folderPath, { filterNonMusic }),
  selectLocalFolder: (options) => invoke("library:choose", options),
  clearCache: (type) => invoke("storage:clear-cache", type),

  // Lyrics Cascade (BetterLyrics -> LyricsPlus -> Musixmatch -> Genius -> LRCLIB)
  getLyrics: (track, provider) => invoke("lyrics:get", track, provider),

  // Discord Rich Presence
  setDiscordActivity: (activity) => invoke("discord:set-activity", activity),
  updateDiscordPresence: (payload) => invoke("discord:update-presence", payload),
  clearDiscordActivity: () => invoke("discord:clear-activity"),
  setDiscordEnabled: (enabled) => invoke("discord:set-enabled", enabled),
  setDiscordClientId: (clientId) => invoke("discord:set-client-id", clientId),

  // Party Mode (Listen Together)
  createPartyRoom: () => invoke("party:create"),
  getPartyInfo: () => invoke("party:get-info"),
  stopPartyRoom: () => invoke("party:stop"),

  // Factory Reset
  factoryReset: () => invoke("app:factory-reset"),
};

contextBridge.exposeInMainWorld("chordly", chordlyBridge);
contextBridge.exposeInMainWorld("desktop", chordlyBridge);

// Full Backwards Compatibility bridge: window.chordlyDesktop
contextBridge.exposeInMainWorld("chordlyDesktop", {
  isDesktop: true,
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
  window: {
    minimize: () => invoke("window:minimize"),
    toggleMaximize: () => invoke("window:toggle-maximize"),
    close: () => invoke("window:close"),
    isMaximized: () => invoke("window:is-maximized"),
  },
  library: {
    get: () => invoke("library:get"),
    scan: (folder, options) => invoke("library:scan", folder, options),
    chooseAndScan: (options) => invoke("library:choose", options),
    showInFolder: (filePath) => invoke("library:show-in-folder", filePath),
    onScanProgress: (callback) => {
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on("library:scan-progress", listener);
      return () => ipcRenderer.removeListener("library:scan-progress", listener);
    },
  },
  youtube: {
    search: (query) => invoke("youtube:search", query),
  },
  accounts: {
    list: () => invoke("accounts:list"),
    add: (service) => invoke("accounts:add", service),
    addCookie: (cookieString) => invoke("accounts:add-cookie", cookieString),
    remove: (accountId) => invoke("accounts:remove", accountId),
    switch: (accountId) => invoke("accounts:switch", accountId),
    brandAccounts: (accountId) => invoke("accounts:brand-accounts", accountId),
    switchBrand: (accountId, brandId) => invoke("accounts:switch-brand", accountId, brandId),
  },
  playlists: {
    fetch: (accountId) => invoke("playlists:fetch", accountId),
    get: (accountId) => invoke("playlists:get", accountId),
    getTracks: (playlistId, accountId) => invoke("playlists:get-tracks", playlistId, accountId),
    addTrack: (accountId, playlistId, videoId) =>
      invoke("playlists:add-track", accountId, playlistId, videoId),
    removeTrack: (accountId, playlistId, videoId, setVideoId) =>
      invoke("playlists:remove-track", accountId, playlistId, videoId, setVideoId),
    create: (accountId, title, description) =>
      invoke("playlists:create", accountId, title, description),
    importSpotify: (url, saveToYTM, accountId) =>
      invoke("playlist:import-spotify", { spotifyUrl: url, url, saveToYTM, accountId }),
  },
  addons: {
    list: () => invoke("addons:list"),
    add: (url) => invoke("addons:add", url),
    remove: (id) => invoke("addons:remove", id),
    search: (query) => invoke("addons:search", query),
    fetchManifest: (url) => invoke("addons:fetch-manifest", url),
    resolveStream: (payload) => invoke("addons:resolve-stream", payload),
    toggle: (id) => invoke("addons:toggle", id),
  },
  lyrics: {
    get: (track, provider) => invoke("lyrics:get", track, provider),
  },
  discord: {
    setActivity: (activity) => invoke("discord:set-activity", activity),
    clearActivity: () => invoke("discord:clear-activity"),
    setEnabled: (enabled) => invoke("discord:set-enabled", enabled),
    setClientId: (clientId) => invoke("discord:set-client-id", clientId),
  },
  setDiscordActivity: (activity) => invoke("discord:set-activity", activity),
  clearDiscordActivity: () => invoke("discord:clear-activity"),
  setDiscordEnabled: (enabled) => invoke("discord:set-enabled", enabled),
  setDiscordClientId: (clientId) => invoke("discord:set-client-id", clientId),
  party: {
    create: () => invoke("party:create"),
    getInfo: () => invoke("party:get-info"),
    stop: () => invoke("party:stop"),
  },
  createPartyRoom: () => invoke("party:create"),
  getPartyInfo: () => invoke("party:get-info"),
  stopPartyRoom: () => invoke("party:stop"),
  factoryReset: () => invoke("app:factory-reset"),
  openExternal: (url) => invoke("app:open-external", url),
  sendDiscordReport: (payload) => invoke("app:send-discord-report", payload),
});
