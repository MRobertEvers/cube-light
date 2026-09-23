import type { BannerBlendConfig } from '../../domain/appearance/banner-blend';

// Thin wrapper around native/banner_blend.c (built to src/platform/wasm/banner-blend.wasm by
// `npm run build:wasm`). All numeric pixel work runs in WebAssembly, so identical inputs give
// identical bytes in every browser; this file only copies arrays in and out.

export type SubjectStage = 'segment' | 'refine' | 'decontaminate';
const STAGES: SubjectStage[] = ['segment', 'refine', 'decontaminate'];

/** Protected-subject planes in source-image coordinates. Deltas are linear RGB: F − C and B − C. */
export type SubjectLayer = {
	width: number;
	height: number;
	alpha: Float32Array;
	foregroundDelta: Float32Array;
	backgroundDelta: Float32Array;
};
/** The same planes resampled into one output frame. */
export type SubjectFrame = {
	alpha: Float32Array;
	foregroundDelta: Float32Array;
	backgroundDelta: Float32Array;
};

type Exports = {
	memory: WebAssembly.Memory;
	_initialize(): void;
	malloc(size: number): number;
	free(pointer: number): void;
	bb_subject(
		rgba: number,
		width: number,
		height: number,
		workLabels: number,
		workWidth: number,
		workHeight: number,
		fullLabels: number,
		iterations: number,
		feather: number,
		strength: number,
		alpha: number,
		foregroundDelta: number,
		backgroundDelta: number
	): number;
	bb_blend(
		rgba: number,
		w: number,
		h: number,
		method: number,
		contentAware: number,
		position: number,
		width: number,
		r: number,
		g: number,
		b: number,
		alpha: number,
		foregroundDelta: number,
		backgroundDelta: number,
		output: number,
		path: number
	): number;
	bb_grabcut(
		rgb: number,
		width: number,
		height: number,
		labels: number,
		iterations: number
	): number;
	bb_maxflow(
		nodes: number,
		edges: number,
		terminals: number,
		edgeNodes: number,
		edgeCaps: number
	): number;
	bb_push_pull(
		color: number,
		weight: number,
		width: number,
		height: number,
		result: number
	): number;
	bb_decontaminate(
		color: number,
		alpha: number,
		width: number,
		height: number,
		strength: number,
		foregroundDelta: number,
		backgroundDelta: number
	): number;
	bb_refine_mask(
		guide: number,
		binary: number,
		width: number,
		height: number,
		feather: number,
		alpha: number
	): number;
	bb_guided_filter(
		guide: number,
		input: number,
		width: number,
		height: number,
		radius: number,
		epsilon: number,
		out: number
	): number;
};

type Typed =
	Uint8Array | Uint8ClampedArray | Int32Array | Float32Array | Float64Array;
type TypedConstructor<T extends Typed> = {
	new (buffer: ArrayBuffer, offset: number, length: number): T;
	BYTES_PER_ELEMENT: number;
};

type Allocation<T extends Typed> = { pointer: number; read(): T };
type Allocator = <T extends Typed>(
	type: TypedConstructor<T>,
	length: number,
	init?: ArrayLike<number>
) => Allocation<T>;

const METHODS: Record<BannerBlendConfig['method'], number> = {
	multiband: 0,
	poisson: 1,
	fade: 2
};

export class BannerWasm {
	/** Called synchronously from inside bb_subject as each stage starts. */
	onStage: ((stage: SubjectStage) => void) | null = null;
	private readonly wasm: Exports;

	private constructor(instance: WebAssembly.Instance) {
		this.wasm = instance.exports as unknown as Exports;
		this.wasm._initialize();
	}

	static async create(bytes: BufferSource): Promise<BannerWasm> {
		let module: BannerWasm | null = null;
		const { instance } = await WebAssembly.instantiate(bytes, {
			env: {
				bb_progress: function (stage: number) {
					return module?.onStage?.(STAGES[stage]);
				},
				emscripten_notify_memory_growth: function () {}
			}
		});
		module = new BannerWasm(instance);
		return module;
	}

	/** Runs `body` with scratch allocations, freeing them afterwards even on failure. */
	private scope<R>(body: (alloc: Allocator) => R): R {
		const instance = this;

		const pointers: number[] = [];
		function memory() {
			return instance.wasm.memory.buffer;
		}
		function alloc<T extends Typed>(
			type: TypedConstructor<T>,
			length: number,
			init?: ArrayLike<number>
		): Allocation<T> {
			const pointer = instance.wasm.malloc(
				Math.max(1, length * type.BYTES_PER_ELEMENT)
			);
			if (!pointer)
				throw new Error('The banner processor ran out of memory.');
			pointers.push(pointer);
			// Views are recreated on each access: memory growth detaches earlier ArrayBuffers.
			function view() {
				return new type(memory(), pointer, length);
			}
			if (init) view().set(init);
			else view().fill(0);
			return {
				pointer,
				read: function () {
					return view().slice() as T;
				}
			};
		}
		try {
			return body(alloc);
		} finally {
			for (const pointer of pointers) this.wasm.free(pointer);
		}
	}

	subject(
		rgba: Uint8ClampedArray,
		width: number,
		height: number,
		workLabels: Uint8Array,
		workWidth: number,
		workHeight: number,
		fullLabels: Uint8Array | null,
		iterations: number,
		feather: number,
		strength: number
	): SubjectLayer {
		const n = width * height;
		return this.scope((alloc) => {
			const input = alloc(Uint8Array, rgba.length, rgba),
				work = alloc(Uint8Array, workLabels.length, workLabels);
			const full = fullLabels
				? alloc(Uint8Array, fullLabels.length, fullLabels)
				: null;
			const alpha = alloc(Float32Array, n),
				fg = alloc(Float32Array, n * 3),
				bg = alloc(Float32Array, n * 3);
			if (
				!this.wasm.bb_subject(
					input.pointer,
					width,
					height,
					work.pointer,
					workWidth,
					workHeight,
					full?.pointer ?? 0,
					iterations,
					feather,
					strength,
					alpha.pointer,
					fg.pointer,
					bg.pointer
				)
			)
				throw new Error(
					'The banner processor ran out of memory while finding the subject.'
				);
			return {
				width,
				height,
				alpha: alpha.read(),
				foregroundDelta: fg.read(),
				backgroundDelta: bg.read()
			};
		});
	}

	blend(
		rgba: Uint8ClampedArray,
		w: number,
		h: number,
		config: BannerBlendConfig,
		subjectArg?: SubjectFrame | null,
		diagnostics?: { path: Float32Array }
	): Uint8ClampedArray {
		const subject = subjectArg === undefined ? null : subjectArg;

		const [r, g, b] = [1, 3, 5].map((i) =>
			parseInt(config.surface.slice(i, i + 2), 16)
		);
		return this.scope((alloc) => {
			const input = alloc(Uint8Array, rgba.length, rgba),
				output = alloc(Uint8ClampedArray, rgba.length),
				path = alloc(Float32Array, h);
			const alpha = subject
				? alloc(Float32Array, subject.alpha.length, subject.alpha)
				: null;
			const fg = subject
				? alloc(
						Float32Array,
						subject.foregroundDelta.length,
						subject.foregroundDelta
					)
				: null;
			const bg = subject
				? alloc(
						Float32Array,
						subject.backgroundDelta.length,
						subject.backgroundDelta
					)
				: null;
			if (
				!this.wasm.bb_blend(
					input.pointer,
					w,
					h,
					METHODS[config.method],
					config.contentAware ? 1 : 0,
					config.position,
					config.width,
					r,
					g,
					b,
					alpha?.pointer ?? 0,
					fg?.pointer ?? 0,
					bg?.pointer ?? 0,
					output.pointer,
					path.pointer
				)
			)
				throw new Error(
					'The banner processor ran out of memory while blending.'
				);
			if (diagnostics) diagnostics.path = path.read();
			return output.read();
		});
	}

	// Lower-level entry points, exposed for tests.
	grabCut(
		rgb: Float64Array,
		width: number,
		height: number,
		labels: Uint8Array,
		iterations: number
	): Uint8Array {
		return this.scope((alloc) => {
			const input = alloc(Float64Array, rgb.length, rgb),
				out = alloc(Uint8Array, labels.length, labels);
			if (
				!this.wasm.bb_grabcut(
					input.pointer,
					width,
					height,
					out.pointer,
					iterations
				)
			)
				throw new Error('grabcut failed');
			return out.read();
		});
	}
	maxflow(
		nodes: number,
		terminals: number[],
		edgeNodes: number[],
		edgeCaps: number[]
	): number {
		return this.scope((alloc) =>
			this.wasm.bb_maxflow(
				nodes,
				edgeNodes.length / 2,
				alloc(Float64Array, terminals.length, terminals).pointer,
				alloc(Int32Array, edgeNodes.length, edgeNodes).pointer,
				alloc(Float64Array, edgeCaps.length, edgeCaps).pointer
			)
		);
	}
	pushPull(
		color: Float32Array,
		weight: Float32Array,
		width: number,
		height: number
	): Float32Array {
		return this.scope((alloc) => {
			const out = alloc(Float32Array, color.length);
			this.wasm.bb_push_pull(
				alloc(Float32Array, color.length, color).pointer,
				alloc(Float32Array, weight.length, weight).pointer,
				width,
				height,
				out.pointer
			);
			return out.read();
		});
	}
	decontaminate(
		color: Float32Array,
		alpha: Float32Array,
		width: number,
		height: number,
		strength: number
	) {
		return this.scope((alloc) => {
			const fg = alloc(Float32Array, color.length),
				bg = alloc(Float32Array, color.length);
			this.wasm.bb_decontaminate(
				alloc(Float32Array, color.length, color).pointer,
				alloc(Float32Array, alpha.length, alpha).pointer,
				width,
				height,
				strength,
				fg.pointer,
				bg.pointer
			);
			return { foregroundDelta: fg.read(), backgroundDelta: bg.read() };
		});
	}
	refineMask(
		guide: Float32Array,
		binary: Float32Array,
		width: number,
		height: number,
		feather: number
	): Float32Array {
		return this.scope((alloc) => {
			const out = alloc(Float32Array, binary.length);
			this.wasm.bb_refine_mask(
				alloc(Float32Array, guide.length, guide).pointer,
				alloc(Float32Array, binary.length, binary).pointer,
				width,
				height,
				feather,
				out.pointer
			);
			return out.read();
		});
	}
	guidedFilter(
		guide: Float32Array,
		input: Float32Array,
		width: number,
		height: number,
		radius: number,
		epsilon: number
	): Float32Array {
		return this.scope((alloc) => {
			const out = alloc(Float32Array, input.length);
			this.wasm.bb_guided_filter(
				alloc(Float32Array, guide.length, guide).pointer,
				alloc(Float32Array, input.length, input).pointer,
				width,
				height,
				radius,
				epsilon,
				out.pointer
			);
			return out.read();
		});
	}
}
