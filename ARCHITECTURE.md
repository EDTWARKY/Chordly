# Chordly Multi-User Architecture: State Diagram & Data Flow

## Account Lifecycle State Machine

```
┌─────────────┐
│   NONE      │  (no accounts)
└──────┬──────┘
       │ user clicks "Add Account"
       ▼
┌─────────────────────────────┐
│   AUTH_WINDOW_OPEN          │
│ (WebView2 at accounts.google)│
└──────┬──────────────────────┘
       │ user logs in
       ▼
┌─────────────────────────────┐
│   COOKIES_CAPTURED          │
│ (polling detected SAPISID)  │
└──────┬──────────────────────┘
       │ close auth window
       ▼
┌─────────────────────────────┐
│   BRANDS_FETCHING           │
│ (call account_menu API)     │
└──────┬──────────────────────┘
       │ brand accounts loaded
       ▼
┌─────────────────────────────┐
│   PLAYLISTS_SYNCING         │
│ (call browse API)           │
└──────┬──────────────────────┘
       │ sync complete
       ▼
┌─────────────────────────────┐
│   AUTHENTICATED (READY)      │  ◄─── user can play, search, add to playlists
│ email, playlists, brands    │       user can switch brand accounts
│ cookies stored locally      │       can manually re-sync
└──────┬──────────────────────┘
       │ user clicks "Remove"
       ▼
┌─────────────────────────────┐
│   DELETED                   │
│ (accounts.json updated)     │
└──────┬──────────────────────┘
       │ 
       ▼
    [NONE]
```

## Cookie Extraction & SAPISIDHASH Flow

```
┌─────────────────────────────┐
│  User Login (accounts.google) │
└──────────┬──────────────────┘
           │
           ▼
   ┌───────────────────────┐
   │  Google Redirects to  │
   │ youtube.com/redirect  │
   └───────────┬───────────┘
               │
               ▼
      ┌────────────────────┐
      │ Electron WebView2  │
      │ Polls for cookies  │
      │ every 500ms        │
      └────────┬───────────┘
               │
               ▼
      ┌────────────────────────────┐
      │ Finds:                     │
      │ • SAPISID                  │
      │ • __Secure-3PAPISID        │
      │ • HSID / SSID / APISID     │
      │ • LOGIN_INFO               │
      └────────┬───────────────────┘
               │
               ▼
      ┌────────────────────────────┐
      │ Store in accounts.json     │
      │ (locally, plaintext for    │
      │  now; TODO: encrypt)       │
      └────────┬───────────────────┘
               │
               ▼
    ┌──────────────────────────────┐
    │ For each API call:           │
    │                              │
    │ timestamp = now()            │
    │ hash = SHA1(                 │
    │   `${ts} ${SAPISID} ${url}`  │
    │ )                            │
    │ header = `SAPISIDHASH        │
    │   ${ts}_${hash}`             │
    │                              │
    │ POST /youtubei/v1/browse     │
    │ ├─ Authorization: SAPISIDHASH│
    │ ├─ Cookie: [all cookies]     │
    │ ├─ X-Goog-AuthUser: 0        │
    │ └─ X-Origin: youtube.com     │
    └──────────┬───────────────────┘
               │
               ▼
        ┌──────────────────┐
        │  YouTube API     │
        │  Returns 200 OK  │
        │  + Playlists     │
        └──────────────────┘
```

## Playlist Sync & Storage

```
┌─────────────────────────────┐
│  accounts:add (YouTube)     │
└──────────┬──────────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ openAuthWindow()     │
    │ • WebView2 login     │
    │ • Cookie polling     │
    │ • Close on complete  │
    └──────────┬───────────┘
               │
               ▼
    ┌──────────────────────┐
    │ fetchBrandAccounts() │
    │ • Call account_menu  │
    │ • Parse response     │
    │ • Return [ {...} ]   │
    └──────────┬───────────┘
               │
               ▼
    ┌──────────────────────┐
    │ fetchYouTubePlaylists│
    │ • Call /browse API   │
    │ • browseId: library  │
    │ • Extract playlists  │
    └──────────┬───────────┘
               │
               ▼
    ┌──────────────────────────────────┐
    │  Save to playlists.json:         │
    │  {                               │
    │    "yt-uuid": [                  │
    │      {                           │
    │        "id": "playlist-id",      │
    │        "name": "Liked Songs",    │
    │        "cover": "https://...",   │
    │        "accountId": "yt-uuid",   │
    │        "synced": true,           │
    │        "createdAt": 1730...      │
    │      },                          │
    │      ...                         │
    │    ]                             │
    │  }                               │
    └──────────┬───────────────────────┘
               │
               ▼
    ┌──────────────────────┐
    │  UI Updated          │
    │  • Account card      │
    │  • Playlist list     │
    │  • Success toast     │
    └──────────────────────┘
```

## Brand Account Switching

```
┌─────────────────────────────────────┐
│  accounts:switch-brand              │
│  (accountId, brandId)               │
└──────────┬────────────────────────┘
           │
           ▼
    ┌──────────────────────────┐
    │ Find account in JSON     │
    │ Check brandId in array   │
    └──────────┬───────────────┘
               │
               ▼
    ┌──────────────────────────┐
    │ Set activeBrandId        │
    │ Save to accounts.json    │
    └──────────┬───────────────┘
               │
               ▼
    ┌──────────────────────────────┐
    │ fetchYouTubePlaylists()      │
    │ with X-Goog-AuthUser="1"     │
    │ (or "2", "3", etc.)          │
    └──────────┬───────────────────┘
               │
               ▼
    ┌──────────────────────────┐
    │ YouTube API returns      │
    │ brand's playlists        │
    └──────────┬───────────────┘
               │
               ▼
    ┌──────────────────────────────┐
    │ Update playlists.json        │
    │ with brand's library         │
    └──────────┬────────────────────┘
               │
               ▼
    ┌──────────────────────────┐
    │ UI shows brand's         │
    │ playlists & tracks       │
    └──────────────────────────┘
```

## Multi-Account Data Layout

```
{userData}/
├─ accounts.json
│  └─ [
│     {
│       id: "yt-uuid-1",
│       email: "user@gmail.com",
│       cookies: { sapisid, hsid, ssid, ... },
│       brandAccounts: [
│         { id: "brand1@gmail.com", name: "Brand 1" },
│         { id: "brand2@gmail.com", name: "Brand 2" }
│       ],
│       activeBrandId: null,
│       syncedAt: 1730369477909
│     },
│     {
│       id: "yt-uuid-2",
│       email: "another@gmail.com",
│       cookies: { ... },
│       brandAccounts: [],
│       syncedAt: 1730369477909
│     }
│   ]
│
├─ playlists.json
│  └─ {
│     "yt-uuid-1": [
│       { id: "playlist-1", name: "Liked Songs", accountId: "yt-uuid-1" },
│       { id: "playlist-2", name: "My Playlist", accountId: "yt-uuid-1" }
│     ],
│     "yt-uuid-2": [
│       { id: "playlist-3", name: "Favorites", accountId: "yt-uuid-2" }
│     ]
│   }
│
└─ local-library.json (local audio tracks)
```

## API Request Sequence

### Scenario: User plays YouTube track & adds to playlist

```
1. User clicks YouTube search result
   └─ Track data: { id: "yt-videoId", youtubeId: "...", remote: true }

2. App requests stream
   └─ GET chordly://stream/videoId
   └─ Electron responds with 206 Partial Content
   └─ youtubeRangeStream() fetches chunks from googlevideo URL

3. MSE buffers stream
   └─ SourceBuffer.appendBuffer() with WebM/Opus data
   └─ readyState → 4 (HAVE_ENOUGH_DATA)

4. Audio plays via <audio element>
   └─ currentTime advancing
   └─ networkState: 2 (NETWORK_LOADING → NETWORK_IDLE)

5. User clicks "Add to Playlist" while playing
   └─ Modal shows all synced playlists (all accounts)
   └─ User selects "Liked Songs" from account 1

6. App sends to YouTube Music API
   └─ POST /youtubei/v1/playlist/add_playlist_item
   └─ Headers:
      ├─ Authorization: generateSapisidHash(account.cookies.sapisid)
      ├─ Cookie: [all account cookies]
      ├─ X-Goog-AuthUser: "0"
      └─ X-Origin: https://music.youtube.com
   └─ Body:
      ├─ playlistId: "playlist-1"
      └─ videoId: "yt-videoId"

7. YouTube API returns 200 OK
   └─ Track added to user's Liked Songs

8. App shows success toast
   └─ "Added to Liked Songs"
```

## Error Handling Paths

```
┌──────────────────────┐
│  API Request         │
│  (401 response)      │
└──────────┬───────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Cookies expired?     │
    │ SAPISIDHASH invalid? │
    └──────────┬───────────┘
               │
               ▼
    ┌──────────────────────────────┐
    │ Show error toast:            │
    │ "Authentication expired"     │
    │ [Re-Authenticate] button     │
    └──────────┬───────────────────┘
               │
               ▼
    ┌──────────────────────┐
    │ User clicks button   │
    │ calls accounts:add   │
    │ (re-login)           │
    └──────────────────────┘

┌──────────────────────┐
│  API Request         │
│  (429 response)      │
└──────────┬───────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Rate limited         │
    │ YouTube backoff      │
    └──────────┬───────────┘
               │
               ▼
    ┌──────────────────────────┐
    │ Show error toast:        │
    │ "Too many requests,      │
    │  try again in 1 min"     │
    │ [Retry] button (disabled)│
    └──────────┬───────────────┘
               │
               ▼ (after 60s)
    ┌──────────────────────┐
    │ [Retry] enabled      │
    │ User can retry       │
    └──────────────────────┘

┌──────────────────────┐
│  Network Error       │
│  (fetch() throws)    │
└──────────┬───────────┘
           │
           ▼
    ┌──────────────────────────┐
    │ Show error toast:        │
    │ "Network error"          │
    │ [Retry] button (enabled) │
    └──────────┬───────────────┘
               │
               ▼
    ┌──────────────────────┐
    │ User clicks Retry    │
    │ Repeat API call      │
    └──────────────────────┘
```

## Summary of Key Components

| Component | File | Responsibility |
|-----------|------|-----------------|
| **Cookie Extraction** | `electron/main.cjs` | `openAuthWindow()` - polls for SAPISID, HSID, SSID, etc. |
| **SAPISIDHASH Gen** | `electron/main.cjs` | `generateSapisidHash()` - creates auth header per request |
| **Brand Fetching** | `electron/main.cjs` | `fetchBrandAccounts()` - calls account_menu API |
| **Playlist Sync** | `electron/main.cjs` | `fetchYouTubePlaylists()` - calls browse API |
| **Cookie Storage** | `electron/main.cjs` | `saveAccounts()` / `loadAccounts()` - persists to JSON |
| **IPC Handlers** | `electron/main.cjs` | `accounts:add/remove`, `playlists:fetch`, `accounts:switch-brand` |
| **Bridge** | `src/desktop.ts` | TypeScript types for IPC calls |
| **Preload** | `electron/preload.cjs` | Exposes window.chordlyDesktop.accounts / playlists |
| **UI Integration** | `src/components/modals/AccountPartyModals.tsx` | Account cards, playlist modal, brand switcher |
| **State Management** | `src/store.tsx` | Holds accounts, current account, playlists in React context |

---

**Next Steps**:
1. Wire up React `AccountPartyModals` to use real `accounts:add` IPC
2. Add account management UI (list, remove, brand switcher)
3. Update playlist modal to group by account
4. Add re-sync button and sync status indicators
5. Implement cookie encryption at rest
6. End-to-end test with real Google account

---

**Status**: ✅ All infrastructure complete. Ready for UI integration.
