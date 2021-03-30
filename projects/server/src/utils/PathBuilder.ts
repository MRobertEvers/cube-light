export class PathBuilder {
	private currentPath: string = '';
	constructor(startPath: string = '') {
		this.currentPath = startPath;
	}

	routes(path: string): PathBuilder {
		return new PathBuilder(`${this.currentPath}${path}`);
	}

	pathAt(path: string): string {
		return `${this.currentPath}${path}`;
	}

	rootPath(): string {
		return this.currentPath;
	}
}
