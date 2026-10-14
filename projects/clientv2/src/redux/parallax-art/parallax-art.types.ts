export type ParallaxArtState = {
	/** Whether the profile asks for card art drawn with depth; null until the profile has been read. */
	enabled: boolean | null;
	revision: number;
};
