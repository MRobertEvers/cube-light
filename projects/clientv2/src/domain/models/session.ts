export type ProfileCrop = { x: number; y: number; zoom: number };
export type UserProfile = {
	cardName: string;
	cardUuid: string;
	art: string;
	crop: ProfileCrop;
};
export type AuthUser = {
	id: number;
	username: string;
	profile: UserProfile | null;
};

export type SessionInfo = {
	user: AuthUser | null;
	/** No account exists yet, so the first sign-in creates one. */
	setupRequired: boolean;
};

/** How printing pickers list printings: a grid of card images, or compact rows. */
export type PrintingView = 'grid' | 'compact';

const CARD_IMAGE_PATH =
	/^(?:\/api)?\/images\/(small|normal|large|art_crop)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jpg$/i;

/**
 * The server's card image URL in the form every synced record uses: relative to the
 * app's own /api proxy. Profiles saved by the old client carry the server's own
 * address instead (http://host:4040/images/...), which HTTPS pages and other devices
 * cannot load. Anything that is not a server card image is returned unchanged.
 */
export function portableCardImageUrl(url: string): string {
	let path: string;
	try {
		path = new URL(url, 'http://relative.invalid').pathname;
	} catch {
		return url;
	}
	const match = CARD_IMAGE_PATH.exec(path);
	return match ? `/api/images/${match[1]}/${match[2].toLowerCase()}.jpg` : url;
}

/** The profile with its artwork URL in portable form. */
export function portableProfile(profile: UserProfile): UserProfile {
	return {
		cardName: profile.cardName,
		cardUuid: profile.cardUuid,
		art: portableCardImageUrl(profile.art),
		crop: profile.crop
	};
}

/** The user with their profile artwork URL in portable form. */
export function portableUser(user: AuthUser): AuthUser {
	return { id: user.id, username: user.username, profile: user.profile ? portableProfile(user.profile) : null };
}
