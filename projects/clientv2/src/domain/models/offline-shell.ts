/**
 * Whether the service worker that lets the app start with no network is installed here.
 * - installed: it is active; the app can start offline.
 * - installing: it is downloading the app and will be active shortly.
 * - not-installed: it could not register (an untrusted certificate, private browsing).
 * - insecure: the origin is not a secure context, so browsers do not allow one.
 * - unsupported: this browser has no service workers.
 */
export type OfflineShellStatus = 'installed' | 'installing' | 'not-installed' | 'insecure' | 'unsupported';
