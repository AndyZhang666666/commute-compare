"use client";

import {useState,useContext} from "react";
import {InputValidityContext} from "@/lib/input-validity";
import DecisionPanel from "./DecisionPanel";
import type {
  CommuteOption,
  GlobalSettings,
  SimulationResult,
} from "@/lib/types";
import { fmtClock, parseClock } from "@/lib/simulate.js";
import { championSummary } from "@/lib/insights.js";
import RouteInputs from "./RouteInputs";
import { observedRisk, recordNotice } from "@/lib/observations.js";
import MetricsTable from "./MetricsTable";
import ArrivalChart from "./ArrivalChart";
import styles from "@/styles/Compare.module.css";
import NumberField from "./NumberField";

interface Props {
  options: CommuteOption[];
  setOptions: (o: CommuteOption[]) => void;
  settings: GlobalSettings;
  setSettings: (s: GlobalSettings) => void;
  result: SimulationResult;
  pending: boolean;
}

export default function ComparePanel({
  options,
  setOptions,
  settings,
  setSettings,
  result,
  pending,
}: Props) {
  const [calibration,setCalibration]=useState<{id:string;nonce:number}>();
  const reportInput=useContext(InputValidityContext);
  const suggested: Record<string, number> = {};
  for (const o of result.options) suggested[o.id] = o.suggestedDeparture;


  return (
    <div>

      <div>
        <div className="panel">
          <h2>你的到达要求</h2>
          <div className="global-fields">
            <div className={styles.field}>
              <label htmlFor="workStart">上班时间</label>
              <input
                id="workStart"
                type="text"
                inputMode="numeric"
                defaultValue={fmtClock(settings.workStart)}
                key={`ws-${settings.workStart}`}
                onChange={()=>reportInput("work-start",true)}
                onBlur={(e) => {
                  const m = parseClock(e.target.value);
                  if (!Number.isNaN(m)){setSettings({ ...settings, workStart: m });reportInput("work-start",false);}
                  else {e.target.setAttribute("aria-invalid","true");reportInput("work-start",true);}
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="days">每月通勤天数</label>
              <NumberField
                id="days"
                min={1}
                max={31}
                integer
                value={settings.daysPerMonth}
                onCommit={(v) => {
                  setSettings({ ...settings, daysPerMonth: v });
                }}
              />
            </div>
            <details className="tail-settings"><summary>尾部阈值（高级）</summary><div className={styles.field}>
              <label htmlFor="tol">目标尾部阈值 · 不是准点承诺</label>
              <div className={styles.range}>
                <input
                  id="tol"
                  type="range"
                  min={1}
                  max={20}
                  step={1}
                  value={Math.round(settings.lateTolerance * 100)}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      lateTolerance: Number(e.target.value) / 100,
                    })
                  }
                />
                <span className={styles.val}>
                  {(settings.lateTolerance * 100).toFixed(0)}%
                </span>
              </div>
            </div></details>
          </div>
        </div>

        <div className="panel">
          <h2>先比较两个方案就够了</h2>
          <RouteInputs
            options={options}
            onChange={setOptions}
            suggested={suggested}
            calibration={calibration}
          />
        </div>
      </div>

      <DecisionPanel options={options} settings={settings} result={result} pending={pending} onCalibrate={id=>{setCalibration({id,nonce:Date.now()});document.querySelector(".input-modes")?.scrollIntoView({block:"start",behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});}}/>
      <details className="detail-comparison"><summary>详细图表与逐项比较</summary>
      <div className="result-grid" id="comparison-results" aria-busy={pending}>
        <div className="panel">
          <h2>到达时间 · 当前假设下</h2>
          <div className={pending ? "pending" : undefined}>
            <ArrivalChart result={result} />
          </div>
          <p className="note">
            红线右边的面积就是迟到概率。曲线越靠左、越窄越好 ——
            但这两件事经常不在同一个方案上。
          </p>
        </div>

        <div className="panel">
          <h2>这次选择的代价</h2>
          <p role="status" className="source-note">
            {pending
              ? "正在更新或有参数待修正；以下旧结果暂不可导出。"
              : "已按当前输入更新。"}
          </p>
          <div className={pending ? "pending" : undefined}>
            <MetricsTable result={result} />
          </div>
          <div className="insight" style={{ marginTop: 14 }}>
            {championSummary(result)}
          </div>

        </div>
      </div>
      <section className="panel evidence-panel">
        <h2>这些结果有多少依据？</h2>
        {options.map((o) => {
          const metric = result.options.find((v) => v.id === o.id);
          const risk =
            o.observations?.length && metric
              ? observedRisk(
                  o.observations,
                  settings.workStart - metric.departure,
                )
              : null;
          return (
            <div className="evidence-row" key={o.id}>
              <strong>{o.name}</strong>
              <div>
                <p>
                  {o.observations?.length
                    ? recordNotice(
                        o.observations.length,
                        settings.lateTolerance,
                      )
                    : "估算输入，尚无实测记录。图中风险取决于三点假设；增加模拟次数不会让假设更准确。"}
                </p>
                {risk && (
                  <p className="source-note">
                    按当前出门时间，原始记录中迟到 {risk.late}/{risk.n}{" "}
                    次；观测比例 95% Wilson 区间 {(risk.lower * 100).toFixed(1)}
                    %–{(risk.upper * 100).toFixed(1)}
                    %。出门时间也从同一批记录选择，该区间仅供描述，不是独立验证；请用后续新记录复查。
                  </p>
                )}
              </div>
            </div>
          );
        })}
        <p className="note">
          下一步：连续记录相近出发时段的工作日耗时，并单独观察雨天或异常延误。没有观测到迟到，不等于不存在迟到风险。
        </p>

      </section></details>
    </div>
  );
}
