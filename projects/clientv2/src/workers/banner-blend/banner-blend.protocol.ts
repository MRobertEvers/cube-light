import type {
	BannerBlendJob,
	BannerBlendVariant,
	BannerProtection
} from '../../domain/appearance/banner-blend';

/** Messages from BannerBlendWorkerClient to BannerBlendWorker. */
export type BannerWorkerRequest =
	| { kind: 'generate'; id: number; job: BannerBlendJob }
	| {
			kind: 'mask';
			id: number;
			src: string;
			protection: BannerProtection;
			feather: number;
	  };
/** Messages from BannerBlendWorker back to its client. Every reply carries the request's id. */
export type BannerWorkerResponse =
	| { id: number; progress: { message: string; fraction: number } }
	| {
			id: number;
			images: Record<BannerBlendVariant, string>;
			timings: Record<string, number>;
	  }
	| {
			id: number;
			mask: { width: number; height: number; alpha: Uint8ClampedArray };
			timings: Record<string, number>;
	  }
	| { id: number; error: string };
