import type {OptionMetrics} from '@/lib/types';
import type {CSSProperties} from 'react';

/** A view of the existing model quantiles, not a second simulation. */
export default function TimeRanges({options,pending}:{options:OptionMetrics[];pending:boolean}){
  if(!options.length)return null;
  const ceiling=Math.max(10,Math.ceil(Math.max(...options.map(o=>o.daily.p90))/10)*10);
  const position=(minutes:number)=>`${minutes/ceiling*100}%`;
  return <figure className={'time-ranges'+(pending?' pending':'')} aria-label="各路线单程耗时区间" aria-busy={pending}>
    <figcaption><h3>每天的时间，差在波动</h3><span>同一尺度 · 单程分钟</span></figcaption>
    {options.map((o,i)=><div className="time-range-row" key={o.id} style={{'--route-color':`var(--opt-${i%6})`} as CSSProperties}>
      <div className="time-range-label"><strong>{o.name}</strong><span>P10–P90 <b>{o.daily.p10.toFixed(0)}–{o.daily.p90.toFixed(0)}</b> 分钟</span></div>
      <div className="time-range-track" role="img" aria-label={`${o.name}：P10 ${o.daily.p10.toFixed(1)}，中位 ${o.daily.p50.toFixed(1)}，P90 ${o.daily.p90.toFixed(1)} 分钟`}>
        <span className="time-range-band" style={{left:position(o.daily.p10),width:position(o.daily.p90-o.daily.p10)}}/>
        <i className="time-range-median" style={{left:position(o.daily.p50)}}/>
      </div>
    </div>)}
    <div className="time-range-axis"><span>0</span><span>{ceiling/2}</span><span>{ceiling} 分钟</span></div>
    <p>线段为模型内 P10–P90，圆点为中位数。区间来自当前估算或个人记录，不代表未来准点承诺。</p>
  </figure>;
}
