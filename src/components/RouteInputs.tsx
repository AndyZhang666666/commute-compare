"use client";
import { useEffect, useState } from "react";
import type { CommuteOption } from "@/lib/types";
import { parseObservations, quickEstimate } from "@/lib/observations.js";
import OptionTable from "./OptionTable";
import NumberField from "./NumberField";
import { newOptionId } from "@/lib/presets.js";

export default function RouteInputs({
  options,
  onChange,
  suggested,
  calibration,
}: {
  options: CommuteOption[];
  onChange: (v: CommuteOption[]) => void;
  suggested: Record<string, number>;
  calibration?: {id:string;nonce:number};
}) {
  const [mode, setMode] = useState("quick");
  useEffect(()=>{if(calibration){setMode("records");setTimeout(()=>document.getElementById("records-"+calibration.id)?.focus(),0);}},[calibration]);
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
      <div className="input-modes" role="group" aria-label="录入方式">
        {[
          ["quick", "快速估算"],
          ["records", "记录校准"],
          ["advanced", "高级参数"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={mode === id}
            onClick={() => setMode(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="note">
        {mode === "quick"
          ? "只改常见耗时与费用即可开始。修改耗时会按公开比例生成三点假设，并替换该路线的旧记录；未修改的路线保留原数据。"
          : mode === "records"
            ? "粘贴同一方向、相近时段的门到门耗时。应用后直接从这些记录重采样，不用回忆“最慢可能多久”。"
            : "修改三点参数会将该路线切回估算；出门时间可手动覆盖。"}
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
              <section className="route-editor" key={o.id}>
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
                      常见耗时 / 分钟
                      <NumberField
                        aria-label={`${o.name}常见耗时`}
                        min={1}
                        max={200}
                        value={o.mode}
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
                {mode === "records" && (!calibration || calibration.id===o.id) && (
                  <RecordEditor
                    key={`${o.id}-${o.observations?.join(",") || ""}`}
                    option={o}
                    onApply={(values) =>
                      update(o.id, { observations: values, source: "observed" })
                    }
                  />
                )}
                <p className="source-note">
                  {o.observations?.length
                    ? `实际记录 · ${o.observations.length} 次`
                    : o.source === "quick"
                      ? `快速估算 · ${o.min} / ${o.mode} / ${o.max} 分钟；最快按常见 ×0.8，最慢 ×1.8`
                      : `三点估算 · ${o.min} / ${o.mode} / ${o.max} 分钟 · 非实测`}
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

function RecordEditor({
  option,
  onApply,
}: {
  option: CommuteOption;
  onApply: (v: number[]) => void;
}) {
  const [text, setText] = useState(option.observations?.join(", ") || "");
  const [error, setError] = useState("");
  const [applied, setApplied] = useState(false);
  return (
    <div className="record-editor">
      <label>
        实际单程耗时 / 分钟
        <textarea
          id={"records-"+option.id}
          rows={2}
          value={text}
          aria-label={`${option.name}实际耗时记录`}
          placeholder="例如：42, 46, 40, 55, 43（请填写自己的记录）"
          onChange={(e) => {
            setText(e.target.value);
            setApplied(false);
            setError("");
          }}
        />
      </label>
      <button
        className="btn"
        onClick={() => {
          const p = parseObservations(text);
          setError(p.error);
          if (!p.error) {
            onApply(p.values);
            setApplied(true);
          }
        }}
      >
        应用这些记录
      </button>
      <span role="status">
        {error ||
          (applied
            ? "已应用；结论会按新记录重新计算。"
            : "逗号、空格或换行分隔，3–300 条；只填数字。")}
      </span>
    </div>
  );
}
