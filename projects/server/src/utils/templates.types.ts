export interface Mapped<T> {
	[x: string]: T;
	[y: number]: T;
}
