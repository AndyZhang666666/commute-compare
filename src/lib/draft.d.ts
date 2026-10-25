import type { CommuteOption, GlobalSettings } from "./types";
export function decodeDraft(raw: string): {
  options: CommuteOption[];
  settings: GlobalSettings;
};
