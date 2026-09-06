/* 구직급여(실업급여) — 고용보험법 제45·46·50조
 * 구직급여일액 = 퇴직 전 3개월 평균임금(1일) × 60%, 상한액과 하한액(최저임금 × 80% × 8시간) 사이로 제한.
 * 하한액이 상한액보다 높아지면 상한액을 하한액으로 본다. 소정급여일수는 나이(50세)와 피보험기간에 따라 120~270일. */

import { YEAR, RATES } from '../data/rates.mjs';

export const UPPER = { 2025: 66000, 2026: 68100 };   /* 1일 상한액 — 2026년 7년 만에 인상 */

export function dailyBenefit(monthlyPay, year = YEAR) {
  const R = RATES[year] || RATES[YEAR];
  const avgDaily = monthlyPay * 3 / 91.25;
  const lower = Math.round(R.minWage * 0.8 * 8);
  const upper = Math.max(UPPER[year] || UPPER[YEAR], lower);
  const raw = avgDaily * 0.6;
  const daily = Math.floor(Math.min(Math.max(raw, lower), upper));
  return { avgDaily: Math.round(avgDaily), raw: Math.round(raw), lower, upper, daily, capped: raw > upper ? 'upper' : raw < lower ? 'lower' : null };
}

/* [피보험기간 상한(년, 미만), 50세 미만 일수, 50세 이상·장애인 일수] */
export const DAYS = [[1, 120, 120], [3, 150, 180], [5, 180, 210], [10, 210, 240], [Infinity, 240, 270]];

export function benefitDays(insuredYears, senior = false) {
  for (const [lim, a, b] of DAYS) if (insuredYears < lim) return senior ? b : a;
  return senior ? 270 : 240;
}
