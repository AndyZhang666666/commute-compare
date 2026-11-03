import type {OptionMetrics,CommuteOption,GlobalSettings} from '@/lib/types';
import type {CSSProperties} from 'react';
import {routeEvidence} from '@/lib/evidence-view.js';

export default function TimeRanges({options,inputs,settings,pending}:{options:OptionMetrics[];inputs:CommuteOption[];settings:GlobalSettings;pending:boolean}){
  const rows=options.flatMap(metric=>{const input=inputs.find(o=>o.id===metric.id);return input?[{metric,evidence:routeEvidence(input,metric,settings)}]:[];});
  if(!rows.length)return null;
  const ceiling=Math.max(10,Math.ceil(Math.max(...rows.map(r=>r.evidence.high))/10)*10);
  const position=(minutes:number)=>`${minutes/ceiling*100}%`;
  return <figure className={'time-ranges'+(pending?' pending':'')} aria-label="各路线单程耗时区间" aria-busy={pending}>
    <figcaption><h3>每天的时间，差在波动</h3><span>同一尺度 · 单程分钟</span></figcaption>
    {rows.map(({metric:o,evidence:e},i)=><div className="time-range-row" key={o.id} style={{'--route-color':`var(--opt-${i%6})`} as CSSProperties}>
      <div className="time-range-label"><strong>{o.name}</strong><span>{e.rangeLabel} <b>{e.low.toFixed(0)}–{e.high.toFixed(0)}</b> 分钟</span></div>
      <div className="time-range-track" role="img" aria-label={`${o.name}：${e.sourceLabel}，${e.rangeLabel}${e.low.toFixed(1)}至${e.high.toFixed(1)}，${e.observed?'记录':'模型'}中位${e.median.toFixed(1)}分钟`}>
        <span className="time-range-band" style={{left:position(e.low),width:position(e.high-e.low)}}/>
        <i className="time-range-median" style={{left:position(e.median)}}/>
      </div><p className="range-source">{e.sourceLabel} · {e.observed?'范围只包含已发生记录，未覆盖未来异常；不作为经验 P90。':'范围由估算分布产生，不是观测。'}</p>
    </div>)}
    <div className="time-range-axis"><span>0</span><span>{ceiling/2}</span><span>{ceiling} 分钟</span></div>
    <p>圆点为中位数，不是均值。记录路线显示原始记录的最小–最大范围，估算路线显示模型区间；不同来源均不构成未来准点承诺。</p>
  </figure>;
}
