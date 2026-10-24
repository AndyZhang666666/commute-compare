"use client";

import type { SimulationResult } from "@/lib/types";
import { fmtClock } from "@/lib/simulate.js";
import { fmtHours, fmtPct, fmtYuan } from "@/lib/hooks";
import styles from "@/styles/Compare.module.css";

interface Props {
  result: SimulationResult;
}

export default function MetricsTable({ result }: Props) {
  const { champions, settings } = result;
  const byId = (id: string) => result.options.find((o) => o.id === id);
  const f = byId(champions.fastest);
  const s = byId(champions.steadiest);
  const c = byId(champions.cheapest);

  return (
    <div>
      <div className={styles.tableWrap}>
        <table className={styles.metrics}>
          <thead>
            <tr>
              <th>方案</th>
              <th>月时间（中位）</th>
              <th>月花费</th>
              <th>模型内迟到比例</th>
              <th>出门时间</th>
              <th>稳定性</th>
            </tr>
          </thead>
          <tbody>
            {result.options.map((o) => {
              const manual = o.departure !== o.suggestedDeparture;
              const lateBad = o.lateProb > settings.lateTolerance + 1e-9;
              return (
                <tr key={o.id}>
                  <td>
                    {o.name}
                    {o.id === champions.fastest && <span className="tag fast">最省时间</span>}
                    {o.id === champions.steadiest && <span className="tag steady">最稳</span>}
                    {o.id === champions.cheapest && <span className="tag cheap">最便宜</span>}
                  </td>
                  <td>
                    {fmtHours(o.monthly.hoursP50)}
                    <span className={styles.sub}>
                      P10–P90 {fmtHours(o.monthly.hoursP10)}–{fmtHours(o.monthly.hoursP90)}
                    </span>
                  </td>
                  <td>{fmtYuan(o.monthly.cost)}</td>
                  <td className={`${styles.late} ${lateBad ? styles.bad : styles.ok}`}>{fmtPct(o.lateProb)}</td>
                  <td>
                    {fmtClock(o.departure)}
                    {manual ? (
                      <span className={styles.manual}>手动</span>
                    ) : (
                      <span className={styles.sub}>建议</span>
                    )}
                  </td>
                  <td>
                    {o.daily.spread.toFixed(0)} 分钟
                    <span className={styles.sub}>
                      P10–P90 {o.daily.p10.toFixed(0)}–{o.daily.p90.toFixed(0)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.champions}>
        {f && (
          <div className={styles.champ}>
            <div className={styles.k}>最省时间</div>
            <div className={styles.v}>{f.name}</div>
            <div className={styles.d}>月中位 {fmtHours(f.monthly.hoursP50)}</div>
          </div>
        )}
        {s && (
          <div className={styles.champ}>
            <div className={styles.k}>最稳</div>
            <div className={styles.v}>{s.name}</div>
            <div className={styles.d}>P10–P90 只差 {s.daily.spread.toFixed(0)} 分钟</div>
          </div>
        )}
        {c && (
          <div className={styles.champ}>
            <div className={styles.k}>最便宜</div>
            <div className={styles.v}>{c.name}</div>
            <div className={styles.d}>月 {fmtYuan(c.monthly.cost)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
