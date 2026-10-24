"use client";

import { useEffect, useRef } from "react";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Tooltip,
  type Plugin,
} from "chart.js";
import type { SimulationResult } from "@/lib/types";
import { fmtClock, lateProbAtDeparture } from "@/lib/simulate.js";
import { optionColor } from "@/lib/hooks";
import styles from "@/styles/Compare.module.css";

Chart.register(LineController, LineElement, PointElement, LinearScale, Tooltip);

interface Props {
  result: SimulationResult;
  /** 拖动横线时回调，值域 [0.005, 0.5] */
  onToleranceChange: (v: number) => void;
}

const Y_MAX = 0.6; // 迟到概率纵轴上限 60%

/**
 * 图 2：出门时间 vs 迟到概率。
 * 横轴 08:00–09:20，每方案一条曲线；一条可拖动的红色横线表示可接受迟到概率，
 * 曲线与横线的交点就是各方案的最晚出门时间。
 */
export default function DepartureChart({ result, onToleranceChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const dragRef = useRef(false);
  const cbRef = useRef(onToleranceChange);
  cbRef.current = onToleranceChange;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const workStart = result.settings.workStart;
    const tol = result.settings.lateTolerance;
    const anchor = result.options.map(o => o.suggestedDeparture);
    const X_MIN = Math.floor(Math.min(workStart - 80, ...anchor.map(v => v - 20)) / 10) * 10;
    const X_MAX = Math.ceil(Math.max(workStart - 10, ...anchor.map(v => v + 20)) / 10) * 10;

    const datasets = result.options.map((o, i) => {
      const pts: { x: number; y: number }[] = [];
      for (let t = X_MIN; t <= X_MAX; t += 2) {
        pts.push({ x: t, y: lateProbAtDeparture(o, workStart, t) });
      }
      return {
        label: o.name,
        data: pts,
        borderColor: optionColor(i),
        backgroundColor: optionColor(i),
        borderWidth: 2,
        pointRadius: 0,
        tension: 0,
      };
    });

    const tolLine: Plugin<"line"> = {
      id: "tolLine",
      afterDatasetsDraw(chart) {
        const { ctx: c, chartArea, scales } = chart;
        const y = scales.y.getPixelForValue(tol);
        if (y < chartArea.top || y > chartArea.bottom) return;
        c.save();
        c.strokeStyle = "#c0392b";
        c.lineWidth = 2;
        c.setLineDash([5, 4]);
        c.beginPath();
        c.moveTo(chartArea.left, y);
        c.lineTo(chartArea.right, y);
        c.stroke();
        c.setLineDash([]);
        c.fillStyle = "#c0392b";
        c.font = "12px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif";
        c.textAlign = "right";
        const label = `可接受迟到 ${(tol * 100).toFixed(1)}% ← 拖我`;
        c.fillText(label, chartArea.right - 4, y - 6);
        c.restore();

        // 每个方案与横线的交点画一个小圆点，位置就是最晚出门时间
        c.save();
        for (let i = 0; i < datasets.length; i++) {
          const ds = datasets[i];
          // 从右往左找第一个 y ≤ tol 的点：它右边就是迟到概率超阈值的地方
          let hit: { x: number; y: number } | null = null;
          for (let k = ds.data.length - 1; k >= 0; k--) {
            if (ds.data[k].y <= tol) {
              hit = ds.data[k];
              break;
            }
          }
          if (!hit) continue;
          const px = scales.x.getPixelForValue(hit.x);
          const py = scales.y.getPixelForValue(hit.y);
          c.fillStyle = ds.borderColor as string;
          c.beginPath();
          c.arc(px, py, 4, 0, Math.PI * 2);
          c.fill();
          c.strokeStyle = "#fff";
          c.lineWidth = 1.5;
          c.stroke();
        }
        c.restore();
      },
    };

    chartRef.current?.destroy();
    chartRef.current = new Chart(ctx, {
      type: "line",
      data: { datasets },
      plugins: [tolLine],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: "nearest", axis: "x", intersect: false },
        scales: {
          x: {
            type: "linear",
            min: X_MIN,
            max: X_MAX,
            ticks: {
              stepSize: 15,
              callback: (v) => fmtClock(Number(v)),
              font: { size: 11 },
              color: "#78736c",
            },
            grid: { color: "#f0eeea" },
            title: { display: true, text: "出门时刻", color: "#78736c", font: { size: 11 } },
          },
          y: {
            min: 0,
            max: Y_MAX,
            ticks: {
              stepSize: 0.1,
              callback: (v) => `${Math.round(Number(v) * 100)}%`,
              font: { size: 11 },
              color: "#78736c",
            },
            grid: { color: "#f0eeea" },
            title: { display: true, text: "迟到概率", color: "#78736c", font: { size: 11 } },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => `${fmtClock(items[0].parsed.x)} 出门`,
              label: (item) => `${item.dataset.label}：迟到 ${(item.parsed.y * 100).toFixed(1)}%`,
            },
          },
        },
      },
    });

    // 拖动横线：把鼠标/手指的 y 像素换算成概率值
    const valueFromEvent = (clientY: number) => {
      const chart = chartRef.current;
      if (!chart) return null;
      const rect = canvas.getBoundingClientRect();
      const v = chart.scales.y.getValueForPixel(clientY - rect.top);
      if (v == null || !Number.isFinite(v)) return null;
      return Math.max(0.005, Math.min(0.5, v));
    };

    const onDown = (e: PointerEvent) => {
      const v = valueFromEvent(e.clientY);
      if (v == null) return;
      dragRef.current = true;
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = "ns-resize";
      cbRef.current(v);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragRef.current) return;
      const v = valueFromEvent(e.clientY);
      if (v != null) cbRef.current(v);
    };
    const onUp = (e: PointerEvent) => {
      if (!dragRef.current) return;
      dragRef.current = false;
      canvas.style.cursor = "";
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* 已经释放 */
      }
    };
    const onHover = (e: PointerEvent) => {
      if (dragRef.current) return;
      canvas.style.cursor = valueFromEvent(e.clientY) != null ? "ns-resize" : "";
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("pointermove", onHover);

    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("pointermove", onHover);
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [result]);

  return (
    <div>
      <div className={styles.chartBox}>
        <canvas ref={canvasRef} />
      </div>
      <div className={styles.chartLegend}>
        {result.options.map((o, i) => (
          <span key={o.id} className={styles.item}>
            <span className={styles.line} style={{ background: optionColor(i) }} />
            {o.name} · 最晚 {fmtClock(o.suggestedDeparture)} 出门
          </span>
        ))}
      </div>
    </div>
  );
}
