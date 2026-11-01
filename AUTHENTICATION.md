# Chordly: Multi-User Google/YouTube Music Authentication & Sync

## Architecture Overview

Chordly uses **Browser Emulation Authentication via Electron WebView2** to extract session cookies and authenticate API calls to YouTube Music, avoiding OAuth quota limits and complexity.

## 1. Cookie Extraction Flow

### Step 1: Open Auth Window
- Create a modal BrowserWindow pointing to `https://accounts.google.com`
- User logs in with their Google account
- Poll for session cookies every 500ms after redirect

### Step 2: Capture Session Cookies
Required cookies extracted after successful Google login:
- `SAPISID` - API signing key
- `__Secure-3PAPISID` - Secure variant
- `HSID` - Session ID
- `SSID` - Secure session ID
- `APISID` - Additional API ID (optional)
- `LOGIN_INFO` - Account metadata (optional)

### Step 3: Store Account
Account object structure:
```typescript
interface Account {
  id: string;
  name: string;
  email: string;
  initial: string;
  color: string;
  plan: string;
  cookies: {
    sapisid: string;
    secure3papisid: string;
    hsid: string;
    ssid: string;
    apisid: string;
    loginInfo?: string;
  };
  brandAccounts?: Array<{ id: string; name: string; email: string }>;
  activeBrandId?: string;
  syncedAt?: number;
}
```

Accounts persisted to `{userData}/accounts.json` with cookie data.

## 2. SAPISIDHASH Generation

For authenticated API calls, generate this header dynamically:

```javascript
function generateSapisidHash(sapisid, timestamp = Math.floor(Date.now() / 1000)) {
  const origin = "https://music.youtube.com";
  const hashInput = `${timestamp} ${sapisid} ${origin}`;
  const hash = crypto.createHash("sha1").update(hashInput).digest("hex");
  return `SAPISIDHASH ${timestamp}_${hash}`;
}
```

**Why this matters**: YouTube's InnerTube API requires a fresh SAPISIDHASH header for every authenticated request, computed from the current timestamp, your SAPISID cookie, and the origin domain.

## 3. Authenticated Request Format

### Example: Fetch User's Playlists

```javascript
const response = await fetch("https://music.youtube.com/youtubei/v1/browse?prettyPrint=false", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: generateSapisidHash(account.cookies.sapisid),
    Cookie: buildCookieString(account),
    "X-Origin": "https://music.youtube.com",
    "X-Goog-AuthUser": "0", // or "1", "2" for brand accounts
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36"
  },
  body: JSON.stringify({
    context: {
      client: {
        clientName: "WEB_REMIX",
        clientVersion: "1.20240101.01.00"
      }
    },
    browseId: "FEmusic_liked_playlists"
  })
});
```

### Example: Create Playlist

```javascript
const response = await fetch("https://music.youtube.com/youtubei/v1/playlist/create?prettyPrint=false", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: generateSapisidHash(account.cookies.sapisid),
    Cookie: buildCookieString(account),
    "X-Origin": "https://music.youtube.com",
    "X-Goog-AuthUser": "0",
    "User-Agent": YOUTUBE_UA
  },
  body: JSON.stringify({
    context: { client: { clientName: "WEB_REMIX", clientVersion: "1.20240101.01.00" } },
    title: "My Playlist",
    description: "Created in Chordly"
  })
});
```

## 4. Brand Accounts (Listen As)

YouTube creators and brand managers can have multiple accounts (e.g., personal + brand channel).

### Fetch Brand Accounts
```javascript
const response = await fetch("https://music.youtube.com/youtubei/v1/account/account_menu?prettyPrint=false", {
  method: "POST",
  headers: { /* same auth headers */ },
  body: JSON.stringify({
    context: { client: { clientName: "WEB_REMIX", clientVersion: "1.20240101.01.00" } }
  })
});
```

Response contains array of associated accounts with `accountEmail` and `accountDisplayName`.

### Switch Brand Account
When switching to a brand account, update:
1. **X-Goog-AuthUser header**: e.g., "0" → "1" or "2"
2. **Account state**: Set `activeBrandId` on Account object
3. **Re-fetch playlists**: Call `accounts:switch-brand` IPC handler

## 5. IPC Endpoints (Electron Main)

### `accounts:list`
Returns all stored accounts with cookies.

### `accounts:add`
Prompts user to log in via auth window, captures cookies, detects brand accounts, syncs playlists.
- Input: `service` (currently "youtube" only)
- Output: Account object with populated cookies and brandAccounts array

### `accounts:remove`
Deletes account and associated playlists.

### `accounts:brand-accounts`
Fetches associated brand accounts for a given account.
- Input: `accountId`
- Output: Array of `{ id, name, email }`

### `accounts:switch-brand`
Switches active brand account and re-syncs playlists.
- Input: `accountId`, `brandId`
- Output: `{ success: true, playlists }`

### `playlists:fetch`
Syncs user's playlists from YouTube Music library.
- Input: `accountId`
- Output: Array of Playlist objects

### `playlists:get`
Retrieves cached playlists for account.
- Input: `accountId`
- Output: Array of Playlist objects

## 6. Storage

### Accounts File: `{userData}/accounts.json`
```json
[
  {
    "id": "yt-uuid",
    "name": "user@gmail.com",
    "email": "user@gmail.com",
    "initial": "U",
    "color": "hsl(45, 70%, 50%)",
    "plan": "Free",
    "cookies": {
      "sapisid": "...",
      "secure3papisid": "...",
      "hsid": "...",
      "ssid": "...",
      "apisid": "..."
    },
    "brandAccounts": [
      { "id": "brand@gmail.com", "name": "My Brand", "email": "brand@gmail.com" }
    ],
    "activeBrandId": null,
    "syncedAt": 1730369477909
  }
]
```

### Playlists File: `{userData}/playlists.json`
```json
{
  "yt-uuid": [
    {
      "id": "playlist-id",
      "name": "Liked Songs",
      "description": "Your liked songs",
      "cover": "https://...",
      "trackIds": [],
      "synced": true,
      "createdAt": 1730369477909,
      "accountId": "yt-uuid"
    }
  ]
}
```

## 7. Security Notes

- **Cookies stored locally** in `{userData}/accounts.json`. Encrypt at rest on production.
- **SAPISIDHASH expires** per-timestamp; generated fresh for every API call.
- **X-Goog-AuthUser** header scopes requests to the correct brand account.
- **No OAuth tokens stored**: Cookies are ephemeral; user re-authenticates if cookies expire (typically 1+ year for Google).

## 8. Sync Workflow (UI Integration)

1. User clicks **Add Account**
2. Auth window opens → user logs in
3. Cookies captured & brand accounts detected
4. Account saved; playlists synced in background
5. UI displays account card with playlist count
6. User can switch brand accounts or remove account

## 9. Debugging

Check Electron console logs:
```
[chordly] auth cookies captured
[chordly] Playlists fetch failed: 401
[chordly] Failed to fetch brand accounts: ...
```

If `401 Unauthorized`, cookies may have expired or SAPISIDHASH generation is incorrect. Re-authenticate.

---

**Status**: ✅ Multi-user authentication, SAPISIDHASH, playlist sync, brand accounts infrastructure in place. Ready for UI integration in React store.
