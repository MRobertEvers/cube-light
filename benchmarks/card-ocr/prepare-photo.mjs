import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const dir = new URL("./models/", import.meta.url);
await mkdir(dir, { recursive: true });
const decoder = new TextDecoder();
for (const [name, prefix] of [["PP-OCRv6_small_rec", "rec"]].concat(
  process.argv.includes("--english")
    ? [["en_PP-OCRv5_mobile_rec", "en-rec"]]
    : [],
  process.argv.includes("--server")
    ? [["PP-OCRv5_server_rec", "server-rec"]]
    : [],
)) {
  const url = `https://paddle-model-ecology.bj.bcebos.com/paddlex/official_inference_model/paddle3.0.0/${name}_onnx_infer.tar`;
  console.log(`Downloading ${name}…`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status}: ${url}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const found = new Set();
  for (let p = 0; p + 512 <= bytes.length; ) {
    const text = (start, len) =>
      decoder
        .decode(bytes.subarray(p + start, p + start + len))
        .replace(/\0.*$/s, "");
    const filename = text(0, 100);
    if (!filename) break;
    const size = parseInt(text(124, 12).trim(), 8) || 0;
    if (p + 512 + size > bytes.length)
      throw new Error("Truncated model archive");
    for (const ext of ["onnx", "yml"])
      if (filename.endsWith(`/inference.${ext}`)) {
        await writeFile(
          new URL(`${prefix}.${ext}`, dir),
          bytes.subarray(p + 512, p + 512 + size),
        );
        found.add(ext);
      }
    p += 512 + Math.ceil(size / 512) * 512;
  }
  if (found.size !== 2) throw new Error("Missing ONNX/config in archive");
  await writeFile(
    new URL(`${prefix}.provenance.json`, dir),
    JSON.stringify(
      {
        url,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        downloaded: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
}
const source = process.argv.find((a) => a.startsWith("--photo="))?.slice(8);
if (source)
  await copyFile(source, new URL("./res/IMG_8535.jpeg", import.meta.url));
console.log(
  "Model assets ready. Photographs are processed locally in the browser.",
);
