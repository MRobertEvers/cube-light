/**
 * How a phone is held, for parallax art to follow: the browser's deviceorientation events,
 * shared by every banner on the page. iOS (13 and later) sends them only after the page asks
 * (DeviceOrientationEvent.requestPermission), and only from a tap; elsewhere they need no asking.
 * Every browser sends them only to a secure (HTTPS) page.
 */

export type MotionAccess = 'unneeded' | 'ask' | 'granted' | 'denied';

type Orientation = { beta: number; gamma: number };
type Listener = (orientation: Orientation) => void;

type PermissionRequester = { requestPermission?: () => Promise<'granted' | 'denied' | 'default'> };

let decided: 'granted' | 'denied' | null = null;
const listeners = new Set<Listener>();
const accessListeners = new Set<() => void>();

function requester(): PermissionRequester | null {
	if (typeof window === 'undefined' || typeof DeviceOrientationEvent === 'undefined') return null;
	return DeviceOrientationEvent as unknown as PermissionRequester;
}

/** Whether the page may listen to how the phone is held: without asking, after asking, or not. */
export function motionAccess(): MotionAccess {
	const events = requester();
	if (!events) return 'denied';
	if (typeof events.requestPermission !== 'function') return 'unneeded';
	return decided ?? 'ask';
}

/** Asks for the phone's motion (iOS shows its prompt). Call it from a tap. */
export async function requestMotionAccess(): Promise<boolean> {
	const events = requester();
	if (!events || typeof events.requestPermission !== 'function') return motionAccess() === 'unneeded';
	try {
		decided = (await events.requestPermission()) === 'granted' ? 'granted' : 'denied';
	} catch {
		decided = 'denied';
	}
	for (const listener of accessListeners) listener();
	return decided === 'granted';
}

/** Calls back whenever the access changes (a banner asked; every banner then listens). */
export function subscribeMotionAccess(listener: () => void): () => void {
	accessListeners.add(listener);
	return function () {
		accessListeners.delete(listener);
	};
}

function onOrientation(event: DeviceOrientationEvent) {
	if (event.beta === null || event.gamma === null) return;
	const orientation = { beta: event.beta, gamma: event.gamma };
	for (const listener of listeners) listener(orientation);
}

/** Calls back with each reading (degrees: beta tips forward and back, gamma side to side). */
export function subscribeOrientation(listener: Listener): () => void {
	if (listeners.size === 0) window.addEventListener('deviceorientation', onOrientation);
	listeners.add(listener);
	return function () {
		listeners.delete(listener);
		if (listeners.size === 0) window.removeEventListener('deviceorientation', onOrientation);
	};
}

/** How far a tilt reaches full parallax, in degrees from where the phone was being held. */
const FULL_TILT_DEGREES = 18;
/** How quickly "where the phone was being held" follows the phone, per second: a held phone recentres. */
const RECENTRE = 0.4;

/**
 * Turns readings into a tilt (-1..1 each way) relative to how the phone has lately been held,
 * in the screen's axes (a phone turned sideways swaps them).
 */
export class OrientationTilt {
	private base: Orientation | null = null;
	private at = 0;
	tilt: { x: number; y: number } | null = null;
	/** When the last reading came (performance.now()), so a silent sensor is not followed. */
	lastReading = 0;

	read(orientation: Orientation, nowMs: number): void {
		const angle = typeof screen !== 'undefined' && screen.orientation ? screen.orientation.angle : 0;
		// Side to side and forward and back, in the screen's axes.
		let across = orientation.gamma;
		let along = orientation.beta;
		if (angle === 90) {
			across = orientation.beta;
			along = -orientation.gamma;
		} else if (angle === 270 || angle === -90) {
			across = -orientation.beta;
			along = orientation.gamma;
		} else if (angle === 180) {
			across = -orientation.gamma;
			along = -orientation.beta;
		}
		const step = this.at ? Math.min((nowMs - this.at) / 1000, 0.5) : 0;
		this.at = nowMs;
		if (!this.base) this.base = { beta: along, gamma: across };
		const follow = Math.min(1, step * RECENTRE);
		this.base = {
			beta: this.base.beta + (along - this.base.beta) * follow,
			gamma: this.base.gamma + (across - this.base.gamma) * follow
		};
		this.tilt = {
			x: Math.max(-1, Math.min(1, (across - this.base.gamma) / FULL_TILT_DEGREES)),
			y: Math.max(-1, Math.min(1, (along - this.base.beta) / FULL_TILT_DEGREES))
		};
		this.lastReading = nowMs;
	}
}
