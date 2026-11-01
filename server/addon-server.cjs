const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const musicDir = path.join(__dirname, "music");
if (!fs.existsSync(musicDir)) {
  fs.mkdirSync(musicDir, { recursive: true });
}

const MIME_TYPES = {
  ".flac": "audio/flac",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
};

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  if (pathname === "/manifest.json") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        id: "chordly-hires-lossless-vault",
        name: "Chordly Hi-Res Lossless Server",
        version: "1.0.0",
        capabilities: ["HI_RES_LOSSLESS", "LOSSLESS", "DOWNLOAD"],
        formats: ["FLAC_24_192", "FLAC_16_44"],
        description: "Custom URL source for 24-bit/192kHz Hi-Res Lossless & 16-bit FLAC streaming.",
      })
    );
    return;
  }

  if (pathname === "/search") {
    const query = String(parsedUrl.query.query || "").toLowerCase();
    const duration = Number(parsedUrl.query.duration) || 210;

    const files = fs.readdirSync(musicDir).filter((f) => /\.(flac|wav|alac|mp3)$/i.test(f));
    const host = req.headers.host || "localhost:4000";
    const protocol = req.headers["x-forwarded-proto"] || "http";

    const matches = files
      .filter((f) => !query || f.toLowerCase().includes(query) || query.includes(path.parse(f).name.toLowerCase()))
      .map((file) => ({
        id: encodeURIComponent(file),
        title: path.parse(file).name,
        artist: "Hi-Res Lossless Vault",
        duration,
        quality: "HI_RES_LOSSLESS",
        codec: "FLAC",
        bitDepth: 24,
        sampleRate: 192000,
        bitrate: 4608,
        streamUrl: `${protocol}://${host}/stream/${encodeURIComponent(file)}`,
      }));

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ results: matches }));
    return;
  }

  if (pathname.startsWith("/stream/")) {
    const rawId = pathname.replace(/^\/stream\//, "");
    const fileName = path.basename(decodeURIComponent(rawId));
    const filePath = path.join(musicDir, fileName);

    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Audio file not found" }));
      return;
    }

    const stat = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "audio/flac";
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": end - start + 1,
        "Content-Type": contentType,
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": stat.size,
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
      });
      fs.createReadStream(filePath).pipe(res);
    }
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Chordly Hi-Res Addon Server running at http://localhost:${PORT}/manifest.json`);
});
