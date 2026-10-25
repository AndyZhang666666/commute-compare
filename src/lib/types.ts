/** 一个通勤方案的输入。时间单位全部是分钟，花费是元。 */
export interface CommuteOption {
  id: string;
  name: string;
  /** 一切顺利时的耗时 */
  min: number;
  /** 最可能的耗时（众数） */
  mode: number;
  /** 倒霉时的耗时 */
  max: number;
  /** 单程花费 */
  cost: number;
  /** 实际门到门单程耗时；有记录时按经验分布重采样，不拟合三点估计。 */
  observations?: number[];
  source?: "preset" | "quick" | "estimate" | "observed";
  /**
   * 手动指定的出门时刻（距 00:00 的分钟数）。
   * 为空则用「建议出门时间」——即把迟到概率刚好压到阈值的最晚出门时刻。
   */
  departureOverride?: number | null;
}

export interface GlobalSettings {
  /** 上班时刻，距 00:00 的分钟数。09:30 = 570 */
  workStart: number;
  /** 每月通勤天数 */
  daysPerMonth: number;
  /** 可接受的迟到概率，0.05 = 5% */
  lateTolerance: number;
}

export interface SimulateOptions {
  /** 模拟多少个月 */
  months?: number;
  seed?: number;
  /** 建议出门时间对齐到多少分钟（默认 1，取整分钟） */
  roundTo?: number;
}

export interface OptionMetrics {
  id: string;
  name: string;
  /** 单日耗时分布（分钟） */
  daily: {
    mean: number;
    p10: number;
    p50: number;
    p90: number;
    /** 稳定性 = p90 − p10，越小越稳 */
    spread: number;
    /** 直方图：用来画到达时间分布曲线 */
    histogram: { binStart: number; binWidth: number; counts: number[] };
    /** 采样的分位数函数（0..1 → 分钟），步长 0.001 */
    quantiles: number[];
  };
  /** 月总时间（小时） */
  monthly: {
    hoursP10: number;
    hoursP50: number;
    hoursP90: number;
    cost: number;
  };
  /** 建议出门时刻（距 00:00 的分钟数）：把迟到概率压到阈值 */
  suggestedDeparture: number;
  /** 实际用于计算迟到概率的出门时刻（override 或 suggested） */
  departure: number;
  /** 在 `departure` 出门时的迟到概率 */
  lateProb: number;
  /** 在 suggestedDeparture 出门时的迟到概率（应 ≤ 阈值） */
  lateProbAtSuggested: number;
}

export interface Champions {
  fastest: string;
  steadiest: string;
  cheapest: string;
}

export interface SimulationResult {
  modelVersion: string;
  settings: GlobalSettings;
  months: number;
  seed: number;
  options: OptionMetrics[];
  champions: Champions;
}

export interface Preset {
  id: string;
  city: string;
  route: string;
  note: string;
  options: Omit<CommuteOption, "id">[];
}
