import { parseFile } from "music-metadata";
import { readdir } from "node:fs/promises";
const dir = "./public/audio";
for (const f of await readdir(dir)) {
  const m = await parseFile(dir + "/" + f);
  console.log(f, Math.round(m.format.duration), m.format.sampleRate, m.format.bitrate, m.format.codec);
}
