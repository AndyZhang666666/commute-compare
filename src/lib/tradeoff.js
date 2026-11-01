export function compareTradeoff(base,other){
 const extraCost=other.monthly.cost-base.monthly.cost,savedHours=base.monthly.hoursP50-other.monthly.hoursP50;
 return {extraCost,savedHours,pricePerHour:savedHours>1e-9&&extraCost>0?extraCost/savedHours:null,
   kind:Math.abs(savedHours)<1e-9?'same-time':savedHours<0?'slower':extraCost<=0?'no-premium':'pay-for-time'};
}
