export function parseObservations(text: string): { values: number[]; error: string };
export function quickEstimate(typical: number, variability?: string): { min: number; mode: number; max: number };
export function observedRisk(values: number[], budget: number): { n: number; late: number; proportion: number; lower: number; upper: number } | null;
export function recordNotice(n: number, tolerance: number): string;
