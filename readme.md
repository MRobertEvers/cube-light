# Cube Project

A Magic the Gathering deck building application on the web.

## Getting Started

The application is broken into two parts; client and server. See the projects folder.

## Local development

Run `npm run dev` in `projects/server` for the API on port 4040, and in
`projects/clientv2` for the client on port 3000. Both listen on the local network;
open `http://<computer-name>.local:3000` or the computer's LAN IP address. Client
edits appear through Vite hot reload, and server TypeScript edits compile and
restart the API automatically. The client refuses to start if port 3000 is
occupied, so it cannot silently move to a different URL.

On this workstation, macOS LaunchAgents already run both development processes
at login: `local.cube-light.client` and `local.cube-light.server-dev`. They use
this checkout directly. Logs are in `~/Library/Logs/CubeLight/client-dev*.log`
and `server-dev*.log`. Open `http://matthew-mbp-m4.local:3000` from the LAN.
There is no need to launch another copy or build/deploy for source edits.

`scripts/deploy-local.mjs` switches the client to a saved production build;
use it only when intentionally leaving development mode.
