"use client";

import type { GlobalSettings, SimulationResult } from "@/lib/types";
import { fmtClock } from "@/lib/simulate.js";
import { departureInsight } from "@/lib/insights.js";
import { fmtYuan } from "@/lib/hooks";
import DepartureChart from "./DepartureChart";
import styles from "@/styles/Compare.module.css";
import NumberField from "./NumberField";

interface Props {
  result: SimulationResult;
  settings: GlobalSettings;
  setSettings: (s: GlobalSettings) => void;
  pending: boolean;
}

export default function DeparturePanel({
  result,
  settings,
  setSettings,
  pending,
}: Props) {
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
        <h2>出门时间与尾部阈值</h2>
        <label className="threshold-control">
          目标尾部阈值{" "}
          <NumberField
            aria-label="出门页目标阈值"
            min={1}
            max={20}
            integer
            value={Math.round(settings.lateTolerance * 100)}
            onCommit={(v) => {
              setSettings({ ...settings, lateTolerance: v / 100 });
            }}
          />{" "}
          %
        </label>
        <div className={pending ? "pending" : undefined}>
          <DepartureChart
            result={result}
            onToleranceChange={(v) =>
              setSettings({ ...settings, lateTolerance: v })
            }
          />
        </div>
        <p className="note">
          按住红色横线上下拖动，松开后按 1%–20%
          的整百分点更新。也可用上方输入框。曲线与它的交点 =
          当前模型下的最晚出门时间。 想更稳就把线往下拖，出门时间会跟着提早。
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
                      {f == null
                        ? "—"
                        : o.id === f.id
                          ? "基准"
                          : `${delta > 0 ? "+" : ""}${delta.toFixed(0)} 分钟`}
                    </td>
                    <td>{fmtYuan(o.monthly.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="note">
            阈值 = {(settings.lateTolerance * 100).toFixed(1)}
            %，只在当前输入分布下成立。「比最快方案」为正表示可以比它晚出门，为负表示得更早。
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
                  平均耗时：「{f.name}」{f.daily.mean.toFixed(1)} 分钟，「
                  {s.name}」{s.daily.mean.toFixed(1)} 分钟
                </li>
                <li>
                  稳定性（P10–P90）：「{f.name}」{f.daily.spread.toFixed(0)}{" "}
                  分钟，「{s.name}」{s.daily.spread.toFixed(0)} 分钟
                </li>
                <li>
                  月中位时间：「{f.name}」{f.monthly.hoursP50.toFixed(1)}h，「
                  {s.name}」{s.monthly.hoursP50.toFixed(1)}h
                </li>
                <li>
                  月花费：「{f.name}」{fmtYuan(f.monthly.cost)}，「{s.name}」
                  {fmtYuan(s.monthly.cost)}
                </li>
              </ul>
              <p className="note">
                均值更快不代表尾部也更短；具体谁要更早出门，以当前表格与分布为准。少量记录不能验证目标尾部阈值。
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
