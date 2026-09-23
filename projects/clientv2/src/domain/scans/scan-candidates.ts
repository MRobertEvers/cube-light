/** Where on a photo a card name was read. */
export type ImageRegion = {
	x: number;
	y: number;
	width: number;
	height: number;
};
export type CardImageCandidate = {
	name: string;
	text: string;
	score: number;
	box: ImageRegion;
};
