"use client";

import { useEffect, useRef } from "react";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Tooltip,
  Filler,
  type Plugin,
} from "chart.js";
import type { SimulationResult } from "@/lib/types";
import { fmtClock } from "@/lib/simulate.js";
import { optionColor } from "@/lib/hooks";
import styles from "@/styles/Compare.module.css";

Chart.register(LineController, LineElement, PointElement, LinearScale, Tooltip, Filler);

interface Props {
  result: SimulationResult;
}

const hex2rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

/**
 * 图 1：到达时间分布。
 * 横轴是到达时刻（分钟），每个方案一条密度曲线（按各自出门时间平移），
 * 一条红色竖线标上班时间，右侧半透明红色标迟到区域。
 */
export default function ArrivalChart({ result }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const workStart = result.settings.workStart;

    // 各方案的密度曲线：直方图 / 样本数 / bin 宽 → 每分钟概率密度
    const datasets = result.options.map((o, i) => {
      const { binStart, binWidth, counts } = o.daily.histogram;
      const total = counts.reduce((a, b) => a + b, 0);
      const pts: { x: number; y: number }[] = [];
      for (let b = 0; b < counts.length; b++) {
        const mid = binStart + (b + 0.5) * binWidth;
        pts.push({ x: o.departure + mid, y: counts[b] / total / binWidth });
      }
      // 平滑：3 点移动平均，1 分钟 bin 会有毛刺
      const color = optionColor(i);
      return {
        label: o.name,
        data: pts,
        borderColor: color,
        backgroundColor: hex2rgba(color, 0.12),
        borderWidth: 2,
        pointRadius: 0,
        fill: "origin" as const,
        tension: 0,
      };
    });

    // 横轴范围：所有方案最早到达 −5 分钟 到 最晚到达 +5 分钟，并保证包含上班时间
    let xMin = Infinity;
    let xMax = -Infinity;
    for (const d of datasets) {
      if (d.data.length) {
        xMin = Math.min(xMin, d.data[0].x);
        xMax = Math.max(xMax, d.data[d.data.length - 1].x);
      }
    }
    if (!Number.isFinite(xMin)) {
      xMin = workStart - 60;
      xMax = workStart + 30;
    }
    xMin = Math.floor(Math.min(xMin, workStart - 10) / 5) * 5;
    xMax = Math.ceil(Math.max(xMax, workStart + 10) / 5) * 5;

    const workLine: Plugin<"line"> = {
      id: "workLine",
      afterDatasetsDraw(chart) {
        const { ctx: c, chartArea, scales } = chart;
        const x = scales.x.getPixelForValue(workStart);
        if (x < chartArea.left || x > chartArea.right) return;
        c.save();
        // 迟到区域
        c.fillStyle = "rgba(192, 57, 43, 0.07)";
        c.fillRect(x, chartArea.top, chartArea.right - x, chartArea.bottom - chartArea.top);
        // 上班时间线
        c.strokeStyle = "#c0392b";
        c.lineWidth = 2;
        c.setLineDash([5, 4]);
        c.beginPath();
        c.moveTo(x, chartArea.top);
        c.lineTo(x, chartArea.bottom);
        c.stroke();
        c.setLineDash([]);
        c.fillStyle = "#c0392b";
        c.font = "12px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif";
        c.textAlign = "left";
        c.fillText(`上班 ${fmtClock(workStart)}`, x + 6, chartArea.top + 14);
        c.fillStyle = "rgba(192, 57, 43, 0.75)";
        c.fillText("→ 迟到", x + 6, chartArea.top + 30);
        c.restore();
      },
    };

    chartRef.current?.destroy();
    chartRef.current = new Chart(ctx, {
      type: "line",
      data: { datasets },
      plugins: [workLine],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: "nearest", axis: "x", intersect: false },
        scales: {
          x: {
            type: "linear",
            min: xMin,
            max: xMax,
            ticks: {
              stepSize: 10,
              callback: (v) => fmtClock(Number(v)),
              font: { size: 11 },
              color: "#78736c",
            },
            grid: { color: "#f0eeea" },
            title: { display: true, text: "到达时刻", color: "#78736c", font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            ticks: { display: false },
            grid: { color: "#f0eeea" },
            title: { display: true, text: "概率密度", color: "#78736c", font: { size: 11 } },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => `到达 ${fmtClock(items[0].parsed.x)}`,
              label: (item) => `${item.dataset.label}`,
            },
          },
        },
      },
    });

    return () => {
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
            {o.name} · {fmtClock(o.departure)} 出门
          </span>
        ))}
      </div>
    </div>
  );
}
