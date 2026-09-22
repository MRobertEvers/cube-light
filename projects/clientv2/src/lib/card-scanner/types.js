/**
 * Shared interfaces for the JavaScript card scanner modules.
 *
 * @typedef {CanvasImageSource & {width: number, height: number}} ScanImage
 * @typedef {number[]} Point
 * @typedef {Point[]} Polygon
 * @typedef {{x: number, y: number, w: number, h: number}} Bounds
 * @typedef {{name: string, score: number, exact?: boolean}} NameMatch
 * @typedef {{entries: Array<{name: string, key: string}>, postings: Map<string, number[]>}} NameIndex
 * @typedef {{phase?: string, completed?: number, total?: number}} ScanProgress
 * @typedef {(progress: ScanProgress) => void} ProgressCallback
 * @typedef {() => boolean} CancellationCallback
 *
 * @typedef {Object} ScanCallbacks
 * @property {ProgressCallback} [onProgress]
 * @property {CancellationCallback} [isCancelled]
 *
 * @typedef {Object} TitleRow
 * @property {Polygon} poly
 * @property {NameMatch[]} candidates
 * @property {Polygon[]} [variants]
 * @property {boolean} [geometryVariant]
 *
 * @typedef {Object} ReferenceRow
 * @property {Polygon} poly
 * @property {string[]} seeds
 *
 * @typedef {Object} TextDetection
 * @property {string} text
 * @property {number} score
 * @property {Polygon} poly
 *
 * @typedef {Object} RecognitionRequest
 * @property {number} id
 * @property {ImageData} [pixels]
 * @property {string} model
 * @property {number} [stretch]
 * @property {boolean} [enhance]
 * @property {number} [deblur]
 * @property {boolean} [lexical]
 * @property {string[]} [candidateNames]
 */
export {};
