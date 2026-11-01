// Personal constraints are a user's boundary, never a weighted recommendation score.
export function normalizeConstraints(value = {}) {
  const monthlyBudget = value.monthlyBudget ?? null;
  const earliestDeparture = value.earliestDeparture ?? null;
  if (monthlyBudget !== null && (!Number.isFinite(monthlyBudget) || monthlyBudget < 0 || monthlyBudget > 10000000)) throw Error('月预算须为0–10000000元，或留空');
  if (earliestDeparture !== null && (!Number.isInteger(earliestDeparture) || earliestDeparture < 0 || earliestDeparture > 1439)) throw Error('最早出门时间须为有效的HH:MM，或留空');
  return { monthlyBudget, earliestDeparture };
}
export function constraintAssessment(metric, value = {}) {
  const c = normalizeConstraints(value);
  const extraBudget = c.monthlyBudget === null ? 0 : Math.max(0, metric.monthly.cost - c.monthlyBudget);
  const earlierMinutes = c.earliestDeparture === null ? 0 : Math.max(0, c.earliestDeparture - metric.suggestedDeparture);
  return { id: metric.id, hasConstraints: c.monthlyBudget !== null || c.earliestDeparture !== null,
    budgetSet: c.monthlyBudget !== null, departureSet: c.earliestDeparture !== null,
    extraBudget, earlierMinutes, meets: extraBudget === 0 && earlierMinutes === 0 };
}
