/**
 * Whether this device can reach the server now.
 * - online: the last server request was answered.
 * - offline: the browser has no network, or the last server request went unanswered
 *   (no response, or a proxy saying the server is down).
 */
export type Connectivity = 'online' | 'offline';
