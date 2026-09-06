/* 퇴직금과 퇴직소득세
 * 퇴직금 = 1일 평균임금 × 30 × (재직일수 / 365). 평균임금은 퇴직 전 3개월 급여 ÷ 그 기간 일수.
 * 상여·연차수당 없이 월급이 일정하다고 가정하면 평균임금(월) ≈ 월급이라 퇴직금 ≈ 월급 × 근속연수.
 * 퇴직소득세는 2023년 이후 근속연수공제·환산급여 방식. */

export const BRACKETS = [
  [14000000, 0.06, 0],
  [50000000, 0.15, 1260000],
  [88000000, 0.24, 5760000],
  [150000000, 0.35, 15440000],
  [300000000, 0.38, 19940000],
  [500000000, 0.40, 25940000],
  [1000000000, 0.42, 35940000],
  [Infinity, 0.45, 65940000],
];

export function basicTax(base) {
  if (base <= 0) return 0;
  for (const [limit, r, sub] of BRACKETS) if (base <= limit) return Math.round(base * r - sub);
  return 0;
}

export function severance(monthlyPay, years, extraMonths = 0) {
  const days = Math.round(years * 365 + extraMonths * 30.4);
  const avgDaily = monthlyPay * 3 / 91.25;           /* 3개월 급여 ÷ 3개월 평균 일수 */
  const amount = Math.round(avgDaily * 30 * days / 365);
  return { amount, days, avgDaily: Math.round(avgDaily) };
}

export function serviceYearsDeduction(y) {
  if (y <= 5) return 1000000 * y;
  if (y <= 10) return 5000000 + 2000000 * (y - 5);
  if (y <= 20) return 15000000 + 2500000 * (y - 10);
  return 40000000 + 3000000 * (y - 20);
}

export function convertedDeduction(g) {
  if (g <= 8000000) return g;
  if (g <= 70000000) return 8000000 + (g - 8000000) * 0.6;
  if (g <= 100000000) return 45200000 + (g - 70000000) * 0.55;
  if (g <= 300000000) return 61700000 + (g - 100000000) * 0.45;
  return 151700000 + (g - 300000000) * 0.35;
}

/* amount: 퇴직금(세전), years: 근속연수 (1년 미만 올림) */
export function severanceTax(amount, years) {
  const y = Math.max(1, Math.ceil(years));
  const svc = serviceYearsDeduction(y);
  const converted = Math.max(0, (amount - svc) * 12 / y);
  const base = Math.max(0, converted - convertedDeduction(converted));
  const convertedTax = basicTax(base);
  const incomeTax = Math.floor(convertedTax / 12 * y / 10) * 10;
  const localTax = Math.floor(incomeTax * 0.1 / 10) * 10;
  return { years: y, serviceDeduction: svc, converted: Math.round(converted), base: Math.round(base), incomeTax, localTax, total: incomeTax + localTax, net: amount - incomeTax - localTax };
}
