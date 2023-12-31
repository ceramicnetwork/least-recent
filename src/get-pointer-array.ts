const MAX_8BIT_INTEGER = Math.pow(2, 8) - 1;
const MAX_16BIT_INTEGER = Math.pow(2, 16) - 1;
const MAX_32BIT_INTEGER = Math.pow(2, 32) - 1;

const MAX_SIGNED_8BIT_INTEGER = Math.pow(2, 7) - 1;
const MAX_SIGNED_16BIT_INTEGER = Math.pow(2, 15) - 1;
const MAX_SIGNED_32BIT_INTEGER = Math.pow(2, 31) - 1;

export type PointerArray = ArrayLike<number> & {
  [index: number]: number;
};

export function getPointerArray(size: number): { new (size: number): PointerArray } {
  const maxIndex = size - 1;

  if (maxIndex <= MAX_8BIT_INTEGER) return Uint8Array;

  if (maxIndex <= MAX_16BIT_INTEGER) return Uint16Array;

  if (maxIndex <= MAX_32BIT_INTEGER) return Uint32Array;

  throw new Error("mnemonist: Pointer Array of size > 4294967295 is not supported.");
}
