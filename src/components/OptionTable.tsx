"use client";

import type { CommuteOption } from "@/lib/types";
import { fmtClock, parseClock } from "@/lib/simulate.js";
import { optionColor } from "@/lib/hooks";
import styles from "@/styles/Compare.module.css";
import NumberField from "./NumberField";

interface Props {
  options: CommuteOption[];
  onChange: (options: CommuteOption[]) => void;
  onAdd: () => void;
  /** 每个方案的建议出门时间（分钟），用来做 placeholder */
  suggested: Record<string, number>;
}

export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;

/** min ≤ mode ≤ max 且都 > 0 才算合法；不合法的行标红但不阻塞其它行 */
export function optionValid(o: CommuteOption) {
  return o.min > 0 && o.mode >= o.min && o.max >= o.mode && o.cost >= 0;
}

export default function OptionTable({
  options,
  onChange,
  onAdd,
  suggested,
}: Props) {
  const update = (id: string, patch: Partial<CommuteOption>) =>
    onChange(options.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  const remove = (id: string) => onChange(options.filter((o) => o.id !== id));

  const num =
    (id: string, key: "min" | "mode" | "max" | "cost") => (v: number) => {
      update(id, {
        [key]: v,
        ...(key !== "cost"
          ? { observations: undefined, source: "estimate" as const }
          : {}),
      });
    };

  return (
    <div>
      <div className={styles.tableWrap}>
        <table className={styles.optTable}>
          <thead>
            <tr>
              <th>方案</th>
              <th>最快</th>
              <th>常见</th>
              <th>最慢</th>
              <th>单程 ¥</th>
              <th>出门</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {options.map((o, i) => {
              const bad = !optionValid(o);
              const depText =
                o.departureOverride == null
                  ? ""
                  : fmtClock(o.departureOverride);
              return (
                <tr key={o.id}>
                  <td>
                    <span
                      className={styles.swatch}
                      style={{ background: optionColor(i) }}
                    />
                    <input
                      className={styles.name}
                      type="text"
                      value={o.name}
                      onChange={(e) => update(o.id, { name: e.target.value })}
                      aria-label="方案名称"
                    />
                  </td>
                  <td>
                    <NumberField
                      min={1}
                      max={360}
                      value={o.min}
                      onCommit={num(o.id, "min")}
                      className={bad ? styles.invalid : ""}
                      aria-label="最快（分钟）"
                    />
                  </td>
                  <td>
                    <NumberField
                      min={1}
                      max={360}
                      value={o.mode}
                      onCommit={num(o.id, "mode")}
                      className={bad ? styles.invalid : ""}
                      aria-label="常见（分钟）"
                    />
                  </td>
                  <td>
                    <NumberField
                      min={1}
                      max={360}
                      value={o.max}
                      onCommit={num(o.id, "max")}
                      className={bad ? styles.invalid : ""}
                      aria-label="最慢（分钟）"
                    />
                  </td>
                  <td>
                    <NumberField
                      min={0}
                      max={2000}
                      value={o.cost}
                      onCommit={num(o.id, "cost")}
                      aria-label="单程花费（元）"
                    />
                  </td>
                  <td>
                    <input
                      className={styles.dep}
                      type="text"
                      inputMode="numeric"
                      placeholder={
                        suggested[o.id] != null
                          ? fmtClock(suggested[o.id])
                          : "自动"
                      }
                      defaultValue={depText}
                      key={`${o.id}-${depText}`}
                      onBlur={(e) => {
                        const s = e.target.value.trim();
                        if (!s)
                          return update(o.id, { departureOverride: null });
                        const m = parseClock(s);
                        if (Number.isNaN(m)) {
                          e.target.value = depText;
                          return;
                        }
                        update(o.id, { departureOverride: m });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          (e.target as HTMLInputElement).blur();
                      }}
                      aria-label="出门时间（留空则自动反推）"
                      title="留空 = 由工具反推；填 HH:MM 手动覆盖"
                    />
                  </td>
                  <td>
                    <button
                      className={styles.rm}
                      onClick={() => remove(o.id)}
                      disabled={options.length <= MIN_OPTIONS}
                      title={
                        options.length <= MIN_OPTIONS
                          ? `至少保留 ${MIN_OPTIONS} 个方案`
                          : "删除"
                      }
                      aria-label="删除方案"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className={styles.addRow}>
        <button
          className="btn small"
          onClick={onAdd}
          disabled={options.length >= MAX_OPTIONS}
        >
          + 添加方案
        </button>
        <span className={styles.hint}>
          {options.length}/{MAX_OPTIONS} · 时间单位分钟 · 出门列留空则自动反推
        </span>
      </div>
    </div>
  );
}
