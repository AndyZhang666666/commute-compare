import type { CommuteOption, Preset } from "./types";

export const PRESETS: Preset[];
export const DEFAULT_PRESET_ID: string;
export function getPreset(id: string): Preset;
export function newOptionId(): string;
export function presetToOptions(preset: Preset): CommuteOption[];
