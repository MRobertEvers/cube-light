#!/usr/bin/env node
// Small production static server for the built client. Use HTTPS at a reverse
// proxy for LAN access. Retained hashed assets keep in-flight tabs compatible.
import http from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(
    process.env.CLIENT_DIST_ROOT ||
      fileURLToPath(new URL("../projects/clientv2/dist/", import.meta.url)),
  ),
  retainedAssets = process.env.CLIENT_ASSET_ROOT
    ? path.resolve(process.env.CLIENT_ASSET_ROOT) : null,
  port = Number(process.env.PORT ?? 3000),
  host = process.env.HOST || "127.0.0.1";
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".wasm": "application/wasm",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};
const server = http.createServer(async (req, res) => {
  try {
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405);
      res.end();
      return;
    }
    const pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    let file = path.resolve(root, "." + pathname);
    if (!file.startsWith(root + path.sep) && file !== root) {
      res.writeHead(403);
      res.end();
      return;
    }
    let info;
    try {
      info = await stat(file);
      if (!info.isFile()) throw Error("directory");
    } catch {
      info = undefined;
      // Only immutable build assets may outlive their release. Never resurrect
      // removed model files or serve stale HTML from this fallback directory.
      if (retainedAssets && pathname.startsWith("/assets/")) {
        const retainedFile = path.resolve(retainedAssets, pathname.slice("/assets/".length));
        if (retainedFile.startsWith(retainedAssets + path.sep)) {
          try {
            const retainedInfo = await stat(retainedFile);
            if (retainedInfo.isFile()) {
              file = retainedFile;
              info = retainedInfo;
            }
          } catch {}
        }
      }
      if (!info && (
        pathname.startsWith("/ocr/") ||
        pathname.startsWith("/assets/") ||
        path.extname(pathname)
      )) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      if (!info) {
        file = path.join(root, "index.html");
        info = await stat(file);
      }
    }
    const headers = {
      "Content-Type": types[path.extname(file)] || "application/octet-stream",
      "Content-Length": info.size,
      "Accept-Ranges": "bytes",
      "Cache-Control": pathname.startsWith("/assets/")
        ? "public, max-age=31536000, immutable"
        : "no-cache",
      "X-Content-Type-Options": "nosniff",
    };
    if (req.headers.range) {
      const match = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
      const start = match ? Number(match[1]) : -1,
        end = match && match[2] ? Number(match[2]) : info.size - 1;
      if (start < 0 || start > end || end >= info.size) {
        res.writeHead(416, { "Content-Range": `bytes */${info.size}` });
        res.end();
        return;
      }
      res.writeHead(206, {
        ...headers,
        "Content-Length": end - start + 1,
        "Content-Range": `bytes ${start}-${end}/${info.size}`,
      });
      if (req.method === "HEAD") res.end();
      else createReadStream(file, { start, end }).pipe(res);
    } else {
      res.writeHead(200, headers);
      if (req.method === "HEAD") res.end();
      else createReadStream(file).pipe(res);
    }
  } catch {
    if (!res.headersSent) res.writeHead(500);
    res.end("Server error");
  }
});
server.listen(port, host, () =>
  console.log(`Client v2 production server: http://${host}:${server.address().port}`),
);
