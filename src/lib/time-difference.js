// Presentation only; keep the underlying monthly simulation and ratios unchanged.
export function formatTimeDifference(hours){
 const n=Math.abs(hours);
 if(n>0&&n<5/60)return {value:n*60<.1?'不足0.1':(n*60).toFixed(1),unit:'分钟'};
 return {value:n.toFixed(1),unit:'小时'};
}
export const isTinyDifference=hours=>Math.abs(hours)>0&&Math.abs(hours)<5/60;
