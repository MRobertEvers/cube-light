# Client

The client is a nextjs application using `preact`. Using `preact` with nextjs requires special configuration. See `next.config.js`. Note! Nextjs still requires React to be installed, so it is installed as a dev dependency.

## Getting Started

Get started by installing the client's dependencies; this requires `node>=12` and `npm`. `npm` is usually installed with node.

Run `npm install` inside the clients directory, then you can start the development server with `npm start`. This will start the nextjs development server on port 3000.

The backend must be running for the client to work.

## Configuration

You must specify the backend API via config.

### Service Worker

This project has a service worker which is compiled separately from the nextjs application. `npm run build` will build both the next application and the service worker.

`src/service-worker/service-worker.ts` contains the code to register the worker on the client.
`service-worker/service-worker.sw.ts` is the service worker itself.
