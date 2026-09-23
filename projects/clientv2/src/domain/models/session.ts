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
