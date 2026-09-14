"use client";

import type { GlobalSettings, SimulationResult } from "@/lib/types";
import { fmtClock } from "@/lib/simulate.js";
import { departureInsight } from "@/lib/insights.js";
import { fmtYuan } from "@/lib/hooks";
import DepartureChart from "./DepartureChart";
import styles from "@/styles/Compare.module.css";

interface Props {
  result: SimulationResult;
  settings: GlobalSettings;
  setSettings: (s: GlobalSettings) => void;
  pending: boolean;
}

export default function DeparturePanel({ result, settings, setSettings, pending }: Props) {
  const byId = (id: string) => result.options.find((o) => o.id === id);
  const f = byId(result.champions.fastest);
  const s = byId(result.champions.steadiest);

  const rows = result.options.map((o) => ({
    o,
    delta: f ? o.suggestedDeparture - f.suggestedDeparture : 0,
  }));

  return (
    <div>
      <div className="panel">
        <h2>出门时间 vs 迟到概率</h2>
        <div className={pending ? "pending" : undefined}>
          <DepartureChart
            result={result}
            onToleranceChange={(v) => setSettings({ ...settings, lateTolerance: v })}
          />
        </div>
        <p className="note">
          红色横线可以拖动（在图上按住上下拖），它就是「可接受迟到概率」。曲线与它的交点 = 该方案的最晚出门时间。
          想更稳就把线往下拖，出门时间会跟着提早。
        </p>
      </div>

      <div className={styles.twoCol}>
        <div className="panel">
          <h2>按你的阈值算出的出门时间</h2>
          <div className={styles.tableWrap}>
            <table className={styles.metrics}>
              <thead>
                <tr>
                  <th>方案</th>
                  <th>最晚出门</th>
                  <th>比最快方案</th>
                  <th>月花费</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ o, delta }) => (
                  <tr key={o.id}>
                    <td>{o.name}</td>
                    <td>{fmtClock(o.suggestedDeparture)}</td>
                    <td>
                      {f == null ? "—" : o.id === f.id ? "基准" : `${delta > 0 ? "+" : ""}${delta.toFixed(0)} 分钟`}
                    </td>
                    <td>{fmtYuan(o.monthly.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="note">
            阈值 = {(settings.lateTolerance * 100).toFixed(1)}%。「比最快方案」为正表示可以比它晚出门，为负表示得更早。
          </p>
        </div>

        <div className="panel">
          <h2>结论</h2>
          <div className="insight">{departureInsight(result)}</div>
          {f && s && (
            <>
              <h3>这两个方案差在哪</h3>
              <ul>
                <li>
                  平均耗时：「{f.name}」{f.daily.mean.toFixed(1)} 分钟，「{s.name}」{s.daily.mean.toFixed(1)} 分钟
                </li>
                <li>
                  稳定性（P10–P90）：「{f.name}」{f.daily.spread.toFixed(0)} 分钟，「{s.name}」{s.daily.spread.toFixed(0)} 分钟
                </li>
                <li>
                  月中位时间：「{f.name}」{f.monthly.hoursP50.toFixed(1)}h，「{s.name}」{s.monthly.hoursP50.toFixed(1)}h
                </li>
                <li>
                  月花费：「{f.name}」{fmtYuan(f.monthly.cost)}，「{s.name}」{fmtYuan(s.monthly.cost)}
                </li>
              </ul>
              <p className="note">
                均值快的方案 P90 往往更差 —— 长尾把它在准点率上的优势吃掉了，这就是要早出门的原因。
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
