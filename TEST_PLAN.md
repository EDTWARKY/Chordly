# Chordly Multi-User YouTube Music: Test Plan & Integration Steps

## Phase 1: Authentication Flow (Manual Testing)

### Test 1.1: Google Login via Auth Window
**Steps**:
1. Run `npm run desktop`
2. Open app settings or accounts modal
3. Click **Add Account** → YouTube
4. Auth window opens (600x700)
5. Log in with Google account
6. Redirect to YouTube Music

**Expected**:
- ✅ Auth window closes automatically after login
- ✅ Console logs: `[chordly] auth cookies captured`
- ✅ Account appears in app with email, name, color
- ✅ `{userData}/accounts.json` contains encrypted cookies (SAPISID, HSID, SSID, etc.)

### Test 1.2: Cookie Persistence
**Steps**:
1. Close and reopen app
2. Check Settings → Accounts

**Expected**:
- ✅ Account persists across app restart
- ✅ Cookies available for API calls (no re-auth needed)

---

## Phase 2: Brand Accounts Detection

### Test 2.1: Detect Brand Accounts
**Prerequisites**: Google account with associated brand channels (e.g., YouTube creator with brand account)

**Steps**:
1. Add YouTube account (see Test 1.1)
2. Check account details or brand switcher UI

**Expected**:
- ✅ `brandAccounts` array populated with list of brand channels
- ✅ Each brand shows `{ id, name, email }`
- ✅ Console logs: `[chordly] Brand accounts fetched: N accounts`

### Test 2.2: Switch Brand Account
**Prerequisites**: Account with multiple brand accounts (from Test 2.1)

**Steps**:
1. Open account menu → **Switch to Brand Account**
2. Select a brand from dropdown
3. App re-syncs playlists for brand account

**Expected**:
- ✅ `X-Goog-AuthUser` header updated in API calls
- ✅ Playlists refreshed with brand's library
- ✅ Account object has `activeBrandId` set
- ✅ Console logs: `[chordly] Switched to brand account: ...`

---

## Phase 3: Playlist Synchronization

### Test 3.1: Sync Playlists on Account Add
**Steps**:
1. Add YouTube account (Test 1.1)
2. Wait for sync to complete

**Expected**:
- ✅ Console: `[chordly] Playlists fetched from YouTube: N playlists`
- ✅ `{userData}/playlists.json` updated with account's playlists
- ✅ Playlists display in app (Liked Songs, created playlists, etc.)
- ✅ Each playlist has: `id`, `name`, `description`, `cover`, `trackIds`, `accountId`, `syncedAt`

### Test 3.2: Manual Playlist Refresh
**Steps**:
1. Account already added (Test 3.1)
2. Click **Sync Playlists** button in account settings
3. Wait for API response

**Expected**:
- ✅ Loading spinner shows during sync
- ✅ Playlists updated (any new playlists from YouTube appear)
- ✅ Success toast: "Playlists synced"
- ✅ `syncedAt` timestamp updated in account object

### Test 3.3: Playlist Caching
**Steps**:
1. Add account (Test 3.1)
2. Close app
3. Reopen app

**Expected**:
- ✅ Playlists load instantly from cache (`playlists.json`)
- ✅ No API calls until manual refresh triggered
- ✅ Toast shows last sync time

---

## Phase 4: SAPISIDHASH Security

### Test 4.1: SAPISIDHASH Generation
**Implementation Test** (in Node):
```javascript
const crypto = require('crypto');
function generateSapisidHash(sapisid, timestamp) {
  const origin = "https://music.youtube.com";
  const hashInput = `${timestamp} ${sapisid} ${origin}`;
  const hash = crypto.createHash("sha1").update(hashInput).digest("hex");
  return `SAPISIDHASH ${timestamp}_${hash}`;
}
const header = generateSapisidHash("test-sapisid", 1234567890);
console.assert(header.startsWith("SAPISIDHASH "), "Header format invalid");
console.assert(header.includes("_"), "Hash not present");
console.log("✓ SAPISIDHASH generation works");
```

**Expected**: ✅ Hash generated correctly with timestamp prefix

### Test 4.2: API Call with SAPISIDHASH
**Steps**:
1. Account added (Test 3.1)
2. Monitor network tab (DevTools)
3. Trigger playlist sync

**Expected**:
- ✅ `Authorization` header present with `SAPISIDHASH ...`
- ✅ `Cookie` header contains all required cookies
- ✅ Response `200 OK` (not 401 Unauthorized)
- ✅ Playlist data returned in response

---

## Phase 5: Error Handling

### Test 5.1: Expired Cookies
**Steps**:
1. Add account
2. Manually delete or corrupt `{userData}/accounts.json` SAPISID value
3. Click **Sync Playlists**

**Expected**:
- ✅ API returns `401 Unauthorized`
- ✅ Error toast: "Authentication expired. Please re-add your account."
- ✅ Option to **Re-Authenticate**

### Test 5.2: Network Error
**Steps**:
1. Disable internet / go offline
2. Click **Sync Playlists**

**Expected**:
- ✅ Error message: "Network error. Check your connection."
- ✅ Retry button available
- ✅ No app crash

### Test 5.3: Rate Limit (429)
**Steps**:
1. Add account
2. Rapidly click **Sync Playlists** 10+ times

**Expected**:
- ✅ First few succeed
- ✅ YouTube returns `429 Too Many Requests`
- ✅ Error toast with backoff message
- ✅ App recovers after 1 minute

---

## Phase 6: UI Integration

### Test 6.1: Account Card Display
**Steps**:
1. Add 1-2 accounts
2. Navigate to Settings / Accounts

**Expected**:
- ✅ Card shows: email, account avatar (initial), color
- ✅ Playlist count badge (e.g., "3 playlists")
- ✅ Last synced timestamp
- ✅ Brand account indicator if applicable
- ✅ Actions: Sync, Switch Brand (if available), Remove

### Test 6.2: Multi-Account Playlist Mixing
**Steps**:
1. Add 2+ accounts
2. Search for a song
3. View results and playlists

**Expected**:
- ✅ Playlists from all accounts visible
- ✅ Account badge on each playlist (color-coded)
- ✅ Can add YouTube results to any account's playlist
- ✅ "Add to Playlist" modal shows playlists grouped by account

### Test 6.3: Account Removal
**Steps**:
1. Account added (Test 3.1)
2. Click **Remove Account** on account card
3. Confirm

**Expected**:
- ✅ Account deleted from `accounts.json`
- ✅ Playlists deleted from `playlists.json`
- ✅ Account card removed from UI
- ✅ No residual files in `{userData}`

---

## Phase 7: End-to-End Workflow

### Test 7.1: Add Account → Search → Play → Add to Playlist
**Steps**:
1. Add YouTube account
2. Search for "bill evans waltz for debby"
3. Click result to play
4. While playing, click **Add to Playlist**
5. Select a synced playlist from YouTube Music library
6. Confirm

**Expected**:
- ✅ Auth window opens & closes on account add
- ✅ Playlists synced instantly
- ✅ Search returns YouTube results with album art
- ✅ Audio plays via MSE (WebM/Opus stream)
- ✅ Playlist modal shows only user's playlists (not demo playlists)
- ✅ Track added to YouTube Music library (visible in web player)
- ✅ Success toast: "Added to Playlist"

### Test 7.2: Multi-Account Same Search
**Steps**:
1. Add 2 accounts (personal + brand)
2. Search for same song
3. Results show playlist options for both accounts

**Expected**:
- ✅ Can play same track via either account's auth
- ✅ "Add to Playlist" shows separate playlists per account
- ✅ Adding to brand account's playlist works correctly

---

## Phase 8: Performance & Stress Tests

### Test 8.1: Large Playlist Sync (1000+ playlists)
**Prerequisites**: Create test account with 1000+ playlists via API

**Steps**:
1. Add account
2. Monitor memory & CPU

**Expected**:
- ✅ Sync completes in < 30 seconds
- ✅ Memory footprint < 100 MB
- ✅ No UI freezing during sync
- ✅ Pagination handled correctly (if API supports it)

### Test 8.2: Concurrent Playlist Operations
**Steps**:
1. Add 3 accounts
2. Trigger sync on all accounts simultaneously
3. Meanwhile, add track to playlist in UI

**Expected**:
- ✅ All syncs complete without race conditions
- ✅ Track addition queued and processes after syncs
- ✅ No data corruption in `playlists.json`

---

## Integration Checklist

- [ ] **Authentication**: Google login via WebView2, cookie capture, persistence
- [ ] **SAPISIDHASH**: Generated correctly per request, 401 handling
- [ ] **Brand Accounts**: Detected, listed, switchable
- [ ] **Playlist Sync**: Fetches, caches, refreshes on demand
- [ ] **Error Handling**: 401, 429, network, expired cookies
- [ ] **UI**: Account cards, brand switcher, playlist modal, synced badges
- [ ] **Multi-Account**: Independent auth/playlists per account
- [ ] **Performance**: Sync < 30s, memory < 100 MB, no UI freeze
- [ ] **End-to-End**: Add account → sync → search → play → add to playlist

---

## Deployment Checklist

Before shipping:
1. **Encrypt cookies at rest** (use node-crypto or native modules)
2. **Set OAuth Client ID** in auth window URL (production credentials)
3. **Test with multiple Google accounts** (personal + brand)
4. **Monitor API quotas** (YouTube Music API limits)
5. **Set up error reporting** (Sentry, LogRocket)
6. **Document re-auth flow** for users
7. **Create privacy policy** (cookies stored locally)
8. **Test on Windows, macOS, Linux**

---

**Status**: Ready for Phase 1 manual testing. Authentication infrastructure complete.
