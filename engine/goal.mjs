/* 목돈 모으기 — 매달 m원을 연이율 r(월복리, 세후)로 모아 목표 T에 닿는 개월 수.
 * 물가상승률 i를 주면 목표가 매년 i만큼 커지는 것으로 보고 실질 가치로 맞춘다. */

export function monthsToGoal(target, monthly, annualRate = 0, inflation = 0) {
  if (monthly <= 0) return Infinity;
  const r = annualRate / 12;
  if (inflation <= 0) {
    if (r === 0) return Math.ceil(target / monthly);
    return Math.ceil(Math.log(1 + target * r / monthly) / Math.log(1 + r));
  }
  let bal = 0, n = 0;
  while (n < 1200) {
    n++;
    bal = bal * (1 + r) + monthly;
    if (bal >= target * Math.pow(1 + inflation, n / 12)) return n;
  }
  return Infinity;
}

export function balanceAfter(monthly, months, annualRate = 0) {
  const r = annualRate / 12;
  if (r === 0) return monthly * months;
  return Math.round(monthly * (Math.pow(1 + r, months) - 1) / r);
}

export const fmtMonths = (n) => !isFinite(n) ? '도달 불가' : n < 12 ? `${n}개월` : n % 12 === 0 ? `${n / 12}년` : `${Math.floor(n / 12)}년 ${n % 12}개월`;
