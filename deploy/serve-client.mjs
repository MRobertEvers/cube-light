#!/usr/bin/env node
// Small production static server for the built client. Use HTTPS at a reverse
// proxy for LAN access. Retained hashed assets keep in-flight tabs compatible.
import http from "node:http";
import https from "node:https";
import { createReadStream, readFileSync } from "node:fs";
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
  ".webmanifest": "application/manifest+json",
  ".wasm": "application/wasm",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};
const handler = async function (req, res) {
  try {
    if (req.url === '/api' || req.url.startsWith('/api/')) {
      const upstream = new URL(process.env.API_ORIGIN || 'http://127.0.0.1:4040');
      const transport = upstream.protocol === 'https:' ? https : http;
      const forwarded = transport.request(upstream, {
        method: req.method, path: req.url.slice(4) || '/',
        headers: { ...req.headers, 'x-forwarded-prefix': '/api' }
      }, function (response) {
        res.writeHead(response.statusCode, response.headers); response.pipe(res);
      });
      forwarded.on('error', function () { if (!res.headersSent) res.writeHead(502); res.end('API unavailable'); });
      req.pipe(forwarded);
      return;
    }
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
};

// Serving other devices needs HTTPS. A phone cannot register a service worker,
// and so cannot start up offline, on a plain HTTP origin that is not localhost.
// Set TLS_CERT and TLS_KEY to a publicly trusted certificate so that every
// device trusts the origin without installing anything. Falls back to HTTP.
const credentials =
  process.env.TLS_CERT && process.env.TLS_KEY
    ? {
        cert: readFileSync(process.env.TLS_CERT),
        key: readFileSync(process.env.TLS_KEY),
      }
    : null;
const server = credentials
  ? https.createServer(credentials, handler)
  : http.createServer(handler);
const scheme = credentials ? "https" : "http";
server.listen(port, host, () =>
  console.log(`Client v2 production server: ${scheme}://${host}:${server.address().port}`),
);

// A convenience for devices that will be typed a bare hostname.
if (credentials && process.env.REDIRECT_HTTP_PORT) {
  http
    .createServer((req, res) => {
      const name = (req.headers.host || host).split(":")[0];
      const suffix = port === 443 ? "" : `:${port}`;
      res.writeHead(308, { Location: `https://${name}${suffix}${req.url}` });
      res.end();
    })
    .listen(Number(process.env.REDIRECT_HTTP_PORT), host);
}
