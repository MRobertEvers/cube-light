/** A value read from this device, with the local revision it was read at, so newer reads win. */
export type Versioned<T> = { value: T; revision: number };
