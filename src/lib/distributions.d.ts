export function mulberry32(seed: number): () => number;
export function sampleGamma(shape: number, rng: () => number): number;
export function sampleBeta(a: number, b: number, rng: () => number): number;
export function pertParams(
  min: number,
  mode: number,
  max: number,
  lambda?: number,
): { alpha: number; beta: number; range: number };
export function samplePERT(min: number, mode: number, max: number, rng: () => number, lambda?: number): number;
export function pertMean(min: number, mode: number, max: number, lambda?: number): number;
export function quantileSorted(sorted: ArrayLike<number>, p: number): number;
export function quantile(values: number[], p: number): number;
export function mean(values: ArrayLike<number>): number;
