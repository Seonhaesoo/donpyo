/* 상여·성과급 원천징수 — 소득세법 시행령 제146조(상여등에 대한 징수세액)
 *
 * 제1항 제1호 (지급대상기간이 있는 상여):
 *   상여 소득세 = 간이세액[(상여 + 지급대상기간의 상여 외 급여 합계) ÷ 지급대상기간 월수] × 지급대상기간 월수
 *                − 지급대상기간의 상여 외 급여에 대해 이미 원천징수한 세액
 * 제1항 제2호 (지급대상기간이 없는 상여): 그해 1월 1일부터 지급하는 달까지를 지급대상기간으로 본다.
 *   같은 해 두 번째 상여부터는 직전 상여를 받은 달의 다음 달부터 이번 지급 달까지.
 * 지급대상기간이 1년을 넘으면 1년으로 보고, 1개월 미만은 1개월로 본다 → 여기서는 1~12개월만 받는다.
 * 가정: 지급대상기간 동안 월급이 같았고 회사가 간이세액의 100%를 뗐다(80%·120%를 고른 회사는 다르다).
 *       잉여금 처분에 따른 상여(기본세율 적용)와 퇴직 후 받는 상여는 다루지 않는다.
 *
 * 4대보험:
 *   건강보험·장기요양·고용보험 — 상여도 보수라 요율대로 붙는다. 회사가 지급 달에 떼거나(당월 보수 기준) 다음 해 4월 보수총액 정산에서
 *     같은 금액을 뗀다. 여기서는 지급 달에 떼는 것으로 보여 준다.
 *   국민연금 — 보험료의 기준인 기준소득월액이 1년에 한 번(7월) 전년 소득총액으로 정해지므로 상여를 받는 달에 더 떼지 않는다.
 *     대신 다음 해 7월~그다음 해 6월의 기준소득월액이 (연 소득 + 상여) ÷ 12 만큼 오른다 — 상한(2026.7~ 659만원)에 걸리면 더 오르지 않는다.
 *     그 1년치 증가분을 따로 보여 준다. */

import { YEAR, RATES } from '../data/rates.mjs';
import { incomeTax } from './tax.mjs';

const f10 = (n) => Math.floor((n + 1e-6) / 10) * 10;   /* tax.mjs 와 같은 번들에 묶이므로 이름을 달리 둔다 */

export const BONUS_LAW = '소득세법 시행령 제146조';

/* in: { monthly(세전 월급), nontax(월 비과세), bonus(상여 금액), months(지급대상기간 1~12), dependents(본인 포함), children(8~20세), year } */
export function bonusWithholding({ monthly, nontax = 0, bonus, months = 12, dependents = 1, children = 0, year = YEAR }) {
  const R = RATES[year] || RATES[YEAR];
  const n = Math.min(12, Math.max(1, Math.round(months || 1)));
  const taxable = Math.max(0, Math.round(monthly) - nontax);
  const B = Math.max(0, Math.round(bonus));
  const regular = incomeTax(taxable, dependents, children);              /* 매달 떼던 소득세 */
  const avg = Math.floor((taxable * n + B) / n);                           /* 월평균 급여 (상여 포함) */
  const avgTax = incomeTax(avg, dependents, children);
  const tax = Math.max(0, avgTax.tax * n - regular.tax * n);               /* 상여에 대한 소득세 */
  const local = f10(tax * 0.1);
  /* 상여를 그 달 급여에 그냥 더해 간이세액표를 한 번 조회했을 때 — 월평균 방식과 비교용 */
  const lump = Math.max(0, incomeTax(taxable + B, dependents, children).tax - regular.tax);
  const health = f10(B * R.health);
  const care = f10(health * R.care);
  const employment = f10(B * R.employment);
  const insurance = health + care + employment;
  /* 국민연금 — 다음 해 기준소득월액 증가분 (천원 미만 절사, 상·하한) */
  const clamp = (v) => Math.min(Math.max(Math.floor(v / 1000) * 1000, R.pensionMin), R.pensionMax);
  const basePlain = clamp(taxable), baseWith = clamp(taxable + B / 12);
  const pensionMonthly = f10(baseWith * R.pension) - f10(basePlain * R.pension);
  const pensionCapped = basePlain >= R.pensionMax;
  const net = B - tax - local - insurance;
  return {
    bonus: B, months: n, taxable, avg, regularTax: regular.tax, avgTax: avgTax.tax,
    tax, local, taxTotal: tax + local, lump, lumpLocal: f10(lump * 0.1),
    health, care, employment, insurance,
    pensionMonthly, pensionYear: pensionMonthly * 12, pensionCapped, pensionMax: R.pensionMax,
    deductions: tax + local + insurance, net, ratio: B ? net / B : 0,
    effectiveRate: B ? (tax + local) / B : 0,
  };
}
