/* 해외주식 양도소득세 — /overseas-stock/ (2026-11-28)
 * 소득세법: 국외주식 양도소득 기본공제 연 250만원(국내 과세대상 주식과 합쳐 한 번), 세율 20% + 지방소득세 2% = 22%.
 * 한 해(1/1~12/31 결제분) 안의 이익과 손실은 서로 뺀다(손익통산). 남은 손실은 다음 해로 넘어가지 않는다.
 * 양도가액·취득가액은 각 결제일의 기준환율로 원화 환산, 매매 수수료는 필요경비. 신고는 다음 해 5월 1~31일. */

export const OS_DEDUCTION = 2500000;
export const OS_RATE = 0.20;
export const OS_LOCAL = 0.02;

/* gain: 올해 이미 결제된 양도차익 합계(이익 − 손실 − 수수료, 원). 음수면 손실이 더 큰 것 */
export function overseasTax(gain) {
  const g = Math.round(Number(gain) || 0);
  const base = Math.max(0, g - OS_DEDUCTION);
  const tax = Math.floor(base * OS_RATE);
  const local = Math.floor(base * OS_LOCAL);
  return { gain: g, base, tax, local, total: tax + local, room: Math.max(0, OS_DEDUCTION - Math.max(0, g)) };
}

/* 연말 정리: loss = 지금 팔면 확정되는 평가손실(양수로), harvest = 공제가 남았을 때 지금 팔아 확정할 수 있는 평가이익(양수로) */
export function overseasPlan(gain, loss = 0, harvest = 0) {
  const now = overseasTax(gain);
  const L = Math.max(0, Number(loss) || 0), H = Math.max(0, Number(harvest) || 0);
  const afterLoss = overseasTax(now.gain - L);
  const needLoss = now.base;                                       /* 세금을 0으로 만드는 데 필요한 손실 */
  const useRoom = Math.min(now.room, H);                           /* 공제 안에서 세금 없이 확정할 수 있는 이익 */
  const afterHarvest = overseasTax(now.gain + H);
  return { now, afterLoss, saveByLoss: now.total - afterLoss.total, needLoss, useRoom, harvestTax: afterHarvest.total - now.total, nextYearSave: Math.floor(useRoom * (OS_RATE + OS_LOCAL)) };
}
