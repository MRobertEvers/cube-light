/**
 * Card art drawn with depth: the art and its height map (the server's `/images/depth/<id>.png`,
 * one byte per pixel, 105 farthest to 223 nearest, as mtg-ai's torimtgd makes them) through a
 * WebGL 2 parallax march. The view tilts, near parts of the art move less than far ones, and what
 * a near part hides is hidden. Without WebGL 2 the art is drawn flat, as before.
 */

const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
	v_uv = vec2(a_position.x * 0.5 + 0.5, 0.5 - a_position.y * 0.5);
	gl_Position = vec4(a_position, 0.0, 1.0);
}`;

// The ray enters at the nearest depth (0) and steps toward the farthest (1) across u_shift; the
// first sample whose depth it has passed is refined between it and the step before (a secant).
// u_pivot is the depth that stays put as the view tilts. textureLod: the march samples inside a
// loop that ends at a different step for each pixel, where implicit derivatives are undefined.
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 o_color;
uniform sampler2D u_art;
uniform sampler2D u_depth;
uniform vec2 u_shift;
uniform float u_pivot;
uniform vec4 u_crop;
uniform vec2 u_range;
const int STEPS = 48;

float depthAt(vec2 uv) {
	return clamp((u_range.y - textureLod(u_depth, uv, 0.0).r) / (u_range.y - u_range.x), 0.0, 1.0);
}

void main() {
	vec2 uv = v_uv * u_crop.xy + u_crop.zw + u_shift * u_pivot;
	vec2 delta = u_shift / float(STEPS);
	float stepDepth = 1.0 / float(STEPS);
	vec2 current = uv;
	float layer = 0.0;
	float depth = depthAt(current);
	vec2 previous = current;
	float previousLayer = 0.0;
	float previousDepth = depth;
	for (int i = 0; i < STEPS && layer < depth; i++) {
		previous = current;
		previousLayer = layer;
		previousDepth = depth;
		current -= delta;
		layer += stepDepth;
		depth = depthAt(current);
	}
	float after = depth - layer;
	float before = previousDepth - previousLayer;
	float weight = abs(after - before) > 1e-5 ? after / (after - before) : 0.0;
	vec2 hit = mix(current, previous, clamp(weight, 0.0, 1.0));
	o_color = vec4(textureLod(u_art, clamp(hit, 0.0, 1.0), 0.0).rgb, 1.0);
}`;

/** The height map's bytes: farthest and nearest (Arena's range, which the server's maps span). */
const DEPTH_RANGE = [105 / 255, 223 / 255];
/** The largest shift, at full tilt, as a fraction of the art's longer side. */
const MAX_SHIFT = 0.035;
const PIVOT = 0.5;

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
	const shader = gl.createShader(type);
	if (!shader) return null;
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		gl.deleteShader(shader);
		return null;
	}
	return shader;
}

function texture(
	gl: WebGL2RenderingContext,
	unit: number,
	source: TexImageSource,
	internalFormat: number,
	format: number
): WebGLTexture | null {
	const made = gl.createTexture();
	if (!made) return null;
	gl.activeTexture(gl.TEXTURE0 + unit);
	gl.bindTexture(gl.TEXTURE_2D, made);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, format, gl.UNSIGNED_BYTE, source);
	return made;
}

/** Whether this browser can draw parallax art at all (WebGL 2). */
export function parallaxSupported(): boolean {
	try {
		const canvas = document.createElement('canvas');
		const gl = canvas.getContext('webgl2');
		const ok = !!gl;
		gl?.getExtension('WEBGL_lose_context')?.loseContext();
		return ok;
	} catch {
		return false;
	}
}

export class ParallaxRenderer {
	private readonly gl: WebGL2RenderingContext;
	private readonly program: WebGLProgram;
	private readonly vertices: WebGLVertexArrayObject | null;
	private readonly uniforms: Record<'shift' | 'pivot' | 'crop' | 'range' | 'art' | 'depth', WebGLUniformLocation | null>;
	private textures: WebGLTexture[] = [];
	private artWidth = 1;
	private artHeight = 1;

	/** A renderer on canvas, or null when the browser has no WebGL 2 (or it fails). */
	static create(canvas: HTMLCanvasElement): ParallaxRenderer | null {
		let gl: WebGL2RenderingContext | null = null;
		try {
			gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, premultipliedAlpha: false });
		} catch {
			return null;
		}
		if (!gl) return null;
		const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
		const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
		const program = gl.createProgram();
		if (!vertex || !fragment || !program) return null;
		gl.attachShader(program, vertex);
		gl.attachShader(program, fragment);
		gl.linkProgram(program);
		gl.deleteShader(vertex);
		gl.deleteShader(fragment);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
		return new ParallaxRenderer(gl, program);
	}

	private constructor(gl: WebGL2RenderingContext, program: WebGLProgram) {
		this.gl = gl;
		this.program = program;
		gl.useProgram(program);
		this.vertices = gl.createVertexArray();
		gl.bindVertexArray(this.vertices);
		const buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
		const position = gl.getAttribLocation(program, 'a_position');
		gl.enableVertexAttribArray(position);
		gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
		this.uniforms = {
			shift: gl.getUniformLocation(program, 'u_shift'),
			pivot: gl.getUniformLocation(program, 'u_pivot'),
			crop: gl.getUniformLocation(program, 'u_crop'),
			range: gl.getUniformLocation(program, 'u_range'),
			art: gl.getUniformLocation(program, 'u_art'),
			depth: gl.getUniformLocation(program, 'u_depth')
		};
	}

	/** The art and its height map; false when they cannot be made into textures. */
	setImages(art: TexImageSource, depth: TexImageSource, artWidth: number, artHeight: number): boolean {
		const gl = this.gl;
		for (const old of this.textures) gl.deleteTexture(old);
		this.textures = [];
		// The bytes as they are: no colour management, no premultiplying.
		gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
		gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
		const artTexture = texture(gl, 0, art, gl.RGBA8, gl.RGBA);
		// The map's one channel: a grey PNG decodes with it in red, green and blue alike.
		const depthTexture = texture(gl, 1, depth, gl.R8, gl.RED);
		if (!artTexture || !depthTexture || gl.getError() !== gl.NO_ERROR) return false;
		this.textures = [artTexture, depthTexture];
		this.artWidth = artWidth;
		this.artHeight = artHeight;
		return true;
	}

	/** Draws the art seen from `tiltX`, `tiltY` (each -1..1) at the canvas's size. */
	draw(tiltX: number, tiltY: number): void {
		const gl = this.gl;
		gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
		gl.useProgram(this.program);
		gl.bindVertexArray(this.vertices);
		const longer = Math.max(this.artWidth, this.artHeight);
		const reachX = (MAX_SHIFT * longer) / this.artWidth;
		const reachY = (MAX_SHIFT * longer) / this.artHeight;
		// Every sample stays within reach * max(pivot, 1 - pivot) of the pixel: crop that much away.
		const marginX = reachX * Math.max(PIVOT, 1 - PIVOT);
		const marginY = reachY * Math.max(PIVOT, 1 - PIVOT);
		gl.uniform2f(this.uniforms.shift, -tiltX * reachX, -tiltY * reachY);
		gl.uniform1f(this.uniforms.pivot, PIVOT);
		gl.uniform4f(this.uniforms.crop, 1 - 2 * marginX, 1 - 2 * marginY, marginX, marginY);
		gl.uniform2f(this.uniforms.range, DEPTH_RANGE[0], DEPTH_RANGE[1]);
		gl.uniform1i(this.uniforms.art, 0);
		gl.uniform1i(this.uniforms.depth, 1);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	}

	/** Whether the context has been lost (the browser took the GPU back). */
	lost(): boolean {
		return this.gl.isContextLost();
	}

	dispose(): void {
		const gl = this.gl;
		for (const old of this.textures) gl.deleteTexture(old);
		this.textures = [];
		gl.deleteProgram(this.program);
		gl.getExtension('WEBGL_lose_context')?.loseContext();
	}
}
