import type { CommuteOption, GlobalSettings, PersonalConstraints } from "./types";
export function decodeDraft(raw: string): {
  options: CommuteOption[];
  settings: GlobalSettings;
  constraints?: PersonalConstraints;
};
