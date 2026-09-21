# Client v2

This is a React single-page app built with Vite.

## Development

Use Node.js 20.19+ or 22.12+ and npm. From this directory:

```sh
npm install
npm run dev
```

The development server runs on port 3000 on all interfaces, so it is reachable at `http://localhost:3000` and from the LAN at `http://<hostname>.local:3000`. Start the backend separately. API requests go to port 4040 on whichever host served the page; set `VITE_BACKEND_HOST_URI` before starting Vite to use another backend URL.

## Import cards from a photo

Use **Create a deck from image** on the deck list, or **Add cards in image** while editing a deck. Deck creation opens the deck immediately; image scans run one at a time in a client-side queue that continues across in-app navigation while the tab remains open. The small scan card in the deck's left column opens the photo, progress bar, and active-region highlight. OCR and card-name matching run in Web Workers. Exact card-name matches are added to the deck as regions finish; less certain candidates can be added from the expanded scan card, along with missed cards entered manually. The image stays in the browser. The OCR model is downloaded on first use and its worker is reused for later queued images.

## Checks and production build

```sh
npm run typecheck
npm run build
npm run preview
```

The production build is written to `dist`.
