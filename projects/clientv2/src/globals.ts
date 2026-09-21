// Default to the host serving the page so LAN access via host.local reaches the backend too.
// `location`, not `window.location`: web workers import this too and have no `window`.
const BACKEND_HOST_URI =
	import.meta.env.VITE_BACKEND_HOST_URI || `http://${location.hostname}:4040`;

export { BACKEND_HOST_URI };
