"use client";

import type { CommuteOption, GlobalSettings, SimulationResult } from "@/lib/types";
import { fmtClock, parseClock } from "@/lib/simulate.js";
import { championSummary, priceInsights } from "@/lib/insights.js";
import OptionTable from "./OptionTable";
import MetricsTable from "./MetricsTable";
import ArrivalChart from "./ArrivalChart";
import styles from "@/styles/Compare.module.css";

interface Props {
  options: CommuteOption[];
  setOptions: (o: CommuteOption[]) => void;
  settings: GlobalSettings;
  setSettings: (s: GlobalSettings) => void;
  result: SimulationResult;
  pending: boolean;
}

export default function ComparePanel({ options, setOptions, settings, setSettings, result, pending }: Props) {
  const suggested: Record<string, number> = {};
  for (const o of result.options) suggested[o.id] = o.suggestedDeparture;

  const addOption = () =>
    setOptions([
      ...options,
      {
        id: `opt-${Date.now().toString(36)}`,
        name: `方案 ${options.length + 1}`,
        min: 30,
        mode: 40,
        max: 60,
        cost: 10,
        departureOverride: null,
      },
    ]);

  const price = priceInsights(result);

  return (
    <div className="layout">
      <div>
        <div className="panel">
          <h2>全局设置</h2>
          <div className={styles.field}>
            <label htmlFor="workStart">上班时间</label>
            <input
              id="workStart"
              type="text"
              inputMode="numeric"
              defaultValue={fmtClock(settings.workStart)}
              key={`ws-${settings.workStart}`}
              onBlur={(e) => {
                const m = parseClock(e.target.value);
                if (!Number.isNaN(m)) setSettings({ ...settings, workStart: m });
                else e.target.value = fmtClock(settings.workStart);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="days">每月通勤天数</label>
            <input
              id="days"
              type="number"
              min={1}
              max={31}
              value={settings.daysPerMonth}
              onChange={(e) => {
                const v = e.target.valueAsNumber;
                if (!Number.isNaN(v)) setSettings({ ...settings, daysPerMonth: Math.max(1, Math.min(31, v)) });
              }}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="tol">可接受的迟到概率（拖动或输入）</label>
            <div className={styles.range}>
              <input
                id="tol"
                type="range"
                min={1}
                max={20}
                step={1}
                value={Math.round(settings.lateTolerance * 100)}
                onChange={(e) => setSettings({ ...settings, lateTolerance: Number(e.target.value) / 100 })}
              />
              <span className={styles.val}>{(settings.lateTolerance * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        <div className="panel">
          <h2>方案</h2>
          <OptionTable options={options} onChange={setOptions} onAdd={addOption} suggested={suggested} />
        </div>
      </div>

      <div>
        <div className="panel">
          <h2>到达时间分布</h2>
          <div className={pending ? "pending" : undefined}>
            <ArrivalChart result={result} />
          </div>
          <p className="note">
            红线右边的面积就是迟到概率。曲线越靠左、越窄越好 —— 但这两件事经常不在同一个方案上。
          </p>
        </div>

        <div className="panel">
          <h2>指标</h2>
          <div className={pending ? "pending" : undefined}>
            <MetricsTable result={result} />
          </div>
          <div className="insight" style={{ marginTop: 14 }}>
            {championSummary(result)}
          </div>
          {price.length > 0 && (
            <>
              <h3>多花的钱买了多少时间</h3>
              <ul>
                {price.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
