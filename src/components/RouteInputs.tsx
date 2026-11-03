"use client";
import { useEffect, useState } from "react";
import type { CommuteOption } from "@/lib/types";
import { quickEstimate } from "@/lib/observations.js";
import { switchToEstimate,restoreRecords } from '@/lib/record-trial.js';
import { DEFAULT_SETTINGS } from '@/lib/simulate.js';
import type {GlobalSettings} from '@/lib/types';
import RecordTrial from './RecordTrial';
import OptionTable from "./OptionTable";
import NumberField from "./NumberField";
import { newOptionId } from "@/lib/presets.js";
import { effectiveInputSource, inputSourceDescription } from '@/lib/input-source.js';

export default function RouteInputs({
  options,
  onChange,
  suggested,
  calibration,
  settings=DEFAULT_SETTINGS,
  disabled=false,
}: {
  options: CommuteOption[];
  onChange: (v: CommuteOption[]) => void;
  suggested: Record<string, number>;
  calibration?: {id:string;nonce:number};
  settings?: GlobalSettings;
  disabled?: boolean;
}) {
  const [mode, setMode] = useState("quick");
  const [confirmEstimate,setConfirmEstimate]=useState('');
  useEffect(()=>{if(calibration){setMode("records");setTimeout(()=>document.getElementById("route-"+calibration.id)?.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}),0);}},[calibration]);
  const add = () =>
    onChange([
      ...options,
      {
        id: newOptionId(),
        name: `方案 ${options.length + 1}`,
        min: 32,
        mode: 40,
        max: 72,
        cost: 6,
        source: "quick",
      },
    ]);
  const update = (id: string, patch: Partial<CommuteOption>) =>
    onChange(options.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  return (
    <>
      <div className="input-modes route-input-tools"><button type="button" className="btn" aria-pressed={mode==='quick'} onClick={()=>setMode('quick')}>路线输入</button><details><summary>记录与高级参数</summary><button type="button" className="text-action" onClick={()=>setMode('records')}>整理个人记录</button><button type="button" className="text-action" onClick={()=>setMode('advanced')}>三点参数与手动出门</button></details></div>
      <p className="note">
        {mode === "quick"
          ? "先填常见耗时和单程费用。有记录的路线需明确改回估算后才能编辑耗时，原记录会保留。"
          : mode === "records"
            ? "粘贴同一方向、相近时段的门到门耗时。应用后直接从这些记录重采样，不用回忆“最慢可能多久”。"
            : "改三点参数前会确认切回估算并保留原记录；手动出门时间不影响记录来源。"}
      </p>
      {mode === "advanced" ? (
        <OptionTable
          options={options}
          onChange={onChange}
          onAdd={add}
          suggested={suggested}
        />
      ) : (
        <>
          <div className="route-inputs">
            {options.map((o, i) => (
              <section className="route-editor" id={'route-'+o.id} key={o.id}>
                <div className="route-title">
                  <label>
                    方案名称
                    <input
                      aria-label={`方案 ${i + 1} 名称`}
                      value={o.name}
                      maxLength={36}
                      onChange={(e) => update(o.id, { name: e.target.value })}
                    />
                  </label>
                  <button
                    className="btn small"
                    disabled={options.length <= 2}
                    onClick={() =>
                      onChange(options.filter((v) => v.id !== o.id))
                    }
                    aria-label={`删除${o.name}`}
                  >
                    移除
                  </button>
                </div>
                <div className="route-fields">
                  {mode === "quick" && (
                    <label>
                      {o.observations?.length ? '记录中位 / 分钟' : '常见耗时 / 分钟'}
                      <NumberField
                        aria-label={`${o.name}${o.observations?.length ? '记录中位' : '常见耗时'}`}
                        min={1}
                        max={200}
                        value={effectiveInputSource(o).median ?? o.mode}
                        disabled={!!o.observations?.length}
                        onCommit={(v) => {
                          update(o.id, {
                            ...quickEstimate(v),
                            observations: undefined,
                            source: "quick",
                          });
                        }}
                      />
                    </label>
                  )}
                  <label>
                    单程费用 / 元
                    <NumberField
                      aria-label={`${o.name}单程费用`}
                      min={0}
                      max={2000}
                      value={o.cost}
                      onCommit={(v) => {
                        update(o.id, { cost: v });
                      }}
                    />
                  </label>
                </div>
                {!!o.observations?.length&&<div className="record-source-control">{confirmEstimate!==o.id?<button type="button" className="text-action" onClick={()=>setConfirmEstimate(o.id)}>改回估算，保留原记录</button>:<div role="group" aria-label={`${o.name}切回估算确认`}><p>将暂停使用这{o.observations.length}条记录，保留它们供恢复。三点估算尚未被个人记录验证。</p><button type="button" className="btn" onClick={()=>{onChange(options.map(v=>v.id===o.id?switchToEstimate(v):v));setConfirmEstimate('');}}>确认改回估算</button><button type="button" className="text-action" onClick={()=>setConfirmEstimate('')}>继续使用记录</button></div>}</div>}
                {!o.observations?.length&&!!o.archivedObservations?.length&&<button type="button" className="text-action" onClick={()=>{if(o.trialRecords?.length&&!window.confirm(`恢复旧记录将替换当前积累的${o.trialRecords.length}条。继续恢复上次${o.archivedObservations?.length}条记录吗？`))return;onChange(options.map(v=>v.id===o.id?restoreRecords(v):v));}}>恢复上次{o.archivedObservations.length}条记录</button>}
                {mode === "records" && (!calibration || calibration.id===o.id) && (
                  <><RecordTrial option={o} settings={settings} disabled={disabled} onApply={next=>onChange(options.map(v=>v.id===o.id?next:v))}/>{o.observations&&<details className="record-values"><summary>查看当前{o.observations.length}条记录</summary><p>{o.observations.join(', ')}</p></details>}</>
                )}
                <p className="source-note">
                  {inputSourceDescription(o)}
                  {o.source === 'quick' && !o.observations?.length && '；最快按常见 ×0.8，最慢 ×1.8'}
                </p>
              </section>
            ))}
          </div>
          <button className="btn" disabled={options.length >= 6} onClick={add}>
            添加一个方案
          </button>
          <p className="source-note">
            数字按 Enter 或离开输入框更新；Esc 取消，留空不自动变成 0。
          </p>
        </>
      )}
    </>
  );
}
