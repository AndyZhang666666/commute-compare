import {effectiveInputSource} from './input-source.js';
import {fmtClock} from './simulate.js';
export const EVIDENCE_POLICY='source-and-tail-v1-20261103';

export const evidenceClock = n => `${n<0?'前一天 ':''}${fmtClock(((n%1440)+1440)%1440)}`;

/** Presentation policy only. It does not alter simulation or empirical records. */
export function routeEvidence(input, metric, settings) {
  const source=effectiveInputSource(input), observed=source.kind==='observed';
  const validArrival=Number.isInteger(settings.workStart)&&settings.workStart>=0&&settings.workStart<1440;
  const tolerance=settings.lateTolerance;
  const requiredForResolution=tolerance>0?Math.ceil(1/tolerance):Infinity;
  // One-record resolution is necessary, not proof of tail reliability.
  const timingKnown=validArrival&&Number.isFinite(metric.suggestedDeparture)&&(!observed||source.count>=requiredForResolution);
  const referenceDeparture=validArrival&&observed?settings.workStart-source.max:null;
  return {
    observed,count:source.count,sourceLabel:observed?`个人记录 N=${source.count}`:'估算输入 · N=0',
    median:observed?Number(source.median):metric.daily.p50,
    low:observed?source.min:metric.daily.p10,high:observed?source.max:metric.daily.p90,
    rangeLabel:observed?'已记录范围':'估算模型 P10–P90',
    timingKnown,referenceDeparture,requiredForResolution,
    timingNote:!validArrival?'请先填写有效的到达时间。':observed&&!timingKnown
      ?`${source.count}条记录中，一条占${(100/source.count).toFixed(1)}%；不足以分辨${(tolerance*100).toFixed(0)}%尾部，暂不展示目标阈值出门时刻。`
      :observed?'仅是当前记录重采样下的阈值时刻。达到分辨率门槛不代表样本具有代表性，也不证明未来准点率。'
      :'按三点估算分布反推，未由实际记录验证，不是准点承诺。',
  };
}
