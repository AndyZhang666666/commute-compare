"use client";

import type { CommuteOption } from "@/lib/types";
import { PRESETS } from "@/lib/presets.js";
import { optionColor } from "@/lib/hooks";
import styles from "@/styles/Compare.module.css";

interface Props {
  activePresetId: string;
  onLoad: (id: string) => void;
  currentOptions: CommuteOption[];
}

export default function PresetsPanel({ activePresetId, onLoad, currentOptions }: Props) {
  return (
    <div>
      <div className="panel">
        <h2>预设案例</h2>
        <p>
          四个城市的通勤方案，一键载入「方案对比」tab 继续调。所有三点时间与花费都是
          <strong>经验估计，非实测</strong> —— 目的是演示工具怎么用，不是你所在城市的真实数据。
        </p>
        <p className="note">
          载入会替换当前 tab 里的方案（当前 {currentOptions.length} 个）。
        </p>
        <div className={styles.presetGrid} style={{ marginTop: 14 }}>
          {PRESETS.map((p) => (
            <div
              key={p.id}
              className={`${styles.presetCard} ${p.id === activePresetId ? styles.active : ""}`}
            >
              <h3>
                {p.city} · {p.route}
              </h3>
              <div className={styles.route}>{p.note}</div>
              <table>
                <thead>
                  <tr>
                    <th>方案</th>
                    <th>快</th>
                    <th>常见</th>
                    <th>慢</th>
                    <th>单程 ¥</th>
                  </tr>
                </thead>
                <tbody>
                  {p.options.map((o, i) => (
                    <tr key={o.name}>
                      <td>
                        <span className={styles.swatch} style={{ background: optionColor(i) }} />
                        {o.name}
                      </td>
                      <td>{o.min}</td>
                      <td>{o.mode}</td>
                      <td>{o.max}</td>
                      <td>{o.cost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="btn small primary" onClick={() => onLoad(p.id)}>
                {p.id === activePresetId ? "重新载入" : "载入这个案例"}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h2>算法说明</h2>
        <h3>为什么用 PERT 分布</h3>
        <p>
          通勤时间天然右偏：一切顺利时快不过物理极限，但堵一次、错过一班车、下雨，就能多花几十分钟。
          正态分布可能产生负时间。这里将 PERT 作为有上下界的估算模型，而不是已用真实交通数据证明更优的分布。
          三角分布同样是可选近似；哪种尾部更贴近真实路线，需要记录来校准。
        </p>
        <p>
          PERT 是项目管理里三点估计的标准做法，用 Beta 分布由「最快 / 常见 / 最慢」唯一确定，
          形状由三点位置决定，不必然右偏；采样严格落在 [最快, 最慢] 区间内：
        </p>
        <div className={styles.formula}>{`mean = (min + 4·mode + max) / 6
α = 1 + 4·(mode − min) / (max − min)
β = 1 + 4·(max − mode) / (max − min)
样本 = min + (max − min) · Beta(α, β)`}</div>

        <h3>迟到概率</h3>
        <p>
          迟到概率就是到达时间分布里，晚于上班时间的面积。设出门时刻为 <code>d</code>、上班时刻为{' '}
          <code>w</code>，则迟到 ⟺ 单程耗时 &gt; <code>w − d</code>。所以：
        </p>
        <div className={styles.formula}>{`迟到概率 = 1 − F(w − d)     // F 为耗时的累积分布`}</div>

        <h3>建议出门时间</h3>
        <p>
          在给定输入分布下，按阈值 <code>p</code> 取 (1−p) 分位数，再向前取整到分钟；它不保证现实中的未来准点率：
        </p>
        <div className={styles.formula}>{`建议出门 = 上班时间 − Q(1 − p)   // Q 为耗时的分位数函数`}</div>
        <p>
          阈值取 0% 时 <code>Q(1)</code> 就是最慢的一次，出门时间退化为「按最坏情况算」；
          阈值越大，出门越晚，迟到风险越高。这条权衡曲线就是「出门时间」tab 里那张图。
        </p>

        <h3>蒙特卡洛</h3>
        <p>
          每个方案独立抽 2000 个月 × 每月 22 天 × 往返 2 次 = 88,000 个单程样本，
          排序后取分位数得到月总时间的 P10/P50/P90；迟到概率用二分在排序样本上直接数，
          不用对分布形状做任何解析近似。
        </p>
        <p className="note">
          每个月时间的 P10–P90 区间反映的是「这个月整体顺不顺」，它由 22 个独立单日样本累加而成，
          所以相对波动比单日小 —— 大数定律的效果，不是 bug。
        </p>
      </div>

      <div className="panel">
        <h2>一个对地图产品的建议</h2>
        <p>
          现在的地图 App 只给一个「预计 42 分钟」。但通勤决策真正需要的是分布：
          地铁 42–65 分钟，中位 48，几乎不会超过 60；打车 28–70 分钟，中位 35，但每 10 次里有 1 次堵到 60 分钟以上。
          <strong>均值更低不代表迟到概率更低</strong> —— 打车中位快 13 分钟，但要把迟到概率压到 5%，可能反而要更早出门。
        </p>
        <p>所以路线推荐至少应该多给三样东西：</p>
        <ul>
          <li>
            <strong>到达时间分布</strong>，或者说「90% 的情况下 X 分钟以内到」——比一个点估计有用得多
          </li>
          <li>
            <strong>准点概率</strong>：「08:35 出门，95% 概率 09:30 前到」这种句式，直接对着用户的约束说话
          </li>
          <li>
            <strong>风险来源提示</strong>：这条路线的波动主要来自哪里（换乘排队？高速拥堵？找车位？），
            用户才知道该不该为「稳」多花钱
          </li>
        </ul>
        <p className="note">
          同样的均值下，方差小的方案对通勤者价值更高。给出「几点出门 95% 准点」，
          比给出「预计 42 分钟」更接近用户真正要做的决定。
        </p>
      </div>

      <div className="panel">
        <h2>已知局限</h2>
        <ul>
          <li>估算模式用三点假设；记录模式按用户记录经验重采样。两者都不接地图或验证记录真实性</li>
          <li>少量记录不覆盖尾部；Wilson 区间仅描述观测比例，且出门时刻从同一批记录选择，不能当作独立验证</li>
          <li>假设每天独立同分布，没有建模「周一更堵」「雨天更慢」「周五好走」这类系统性差异</li>
          <li>按月模拟但月内每天独立，因此没有建模「连续倒霉」的月份，月总时间的 P90 偏乐观</li>
          <li>花费不含时间价值折算 —— 省下的 3 小时要不要用 1700 块钱换，工具不给答案</li>
          <li>不接任何地图 / 路况 API，不查实时数据，全部计算在浏览器本地完成</li>
        </ul>
      </div>
    </div>
  );
}
