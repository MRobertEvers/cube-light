import { mkdir, writeFile } from "node:fs/promises";
const root = new URL("./models/fonts/", import.meta.url);
await mkdir(root, { recursive: true });
const source =
  "https://raw.githubusercontent.com/Saeris/typeface-beleren-bold/cdbe3dc354a51b620636f8effd4c4b143d8969a1/Beleren2016-Bold.woff";
const r = await fetch(source);
if (!r.ok) throw Error(`Font download: ${r.status}`);
await writeFile(
  new URL("beleren.woff", root),
  new Uint8Array(await r.arrayBuffer()),
);
console.log("Prepared Beleren title font");
