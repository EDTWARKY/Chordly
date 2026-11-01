const fs = require("fs");
const path = require("path");
const os = require("os");

const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
const chordlyDir = path.join(appData, "chordly");

console.log("[Chordly Clean Reset] Target directory:", chordlyDir);

if (fs.existsSync(chordlyDir)) {
  const filesToDelete = [
    "accounts.json",
    "playlists.json",
    "library.json",
    "addons.json",
    "window-state.json",
  ];

  for (const file of filesToDelete) {
    const p = path.join(chordlyDir, file);
    if (fs.existsSync(p)) {
      try {
        fs.unlinkSync(p);
        console.log(`- Deleted: ${file}`);
      } catch (err) {
        console.warn(`- Could not delete ${file}:`, err.message);
      }
    }
  }

  // Clear cache directories
  const cacheDirs = ["Cache", "Code Cache", "GPUCache", "ShaderCache"];
  for (const dir of cacheDirs) {
    const p = path.join(chordlyDir, dir);
    if (fs.existsSync(p)) {
      try {
        fs.rmSync(p, { recursive: true, force: true });
        console.log(`- Cleared cache: ${dir}`);
      } catch {}
    }
  }
}

console.log("[Chordly Clean Reset] Clean reset complete! Run 'npm run desktop' for a fresh session.");
