/* 노동 관련 계산 — 통상시급, 연장·야간·휴일 가산수당, 연차, 프리랜서 3.3% 원천징수
 * 통상시급 = 월 통상임금 ÷ 209시간(주 40시간 + 주휴 8시간 × 4.345주). 월급 전체가 통상임금이라고 가정한다. */

import { MONTH_HOURS } from '../data/rates.mjs';
import { basicTax } from './retire.mjs';

export const ordinaryHourly = (monthly) => Math.round(monthly / MONTH_HOURS);

/* 근로기준법 제56조: 연장 50% 가산, 야간(22~06시) 50% 가산, 휴일 8시간 이내 50%·초과 100% 가산 */
export function overtime(monthly) {
  const h = monthly / MONTH_HOURS;
  return {
    hourly: Math.round(h),
    ext: Math.round(h * 1.5),          /* 연장근로 1시간 */
    night: Math.round(h * 0.5),        /* 야간 가산분만 (소정근로 안의 야간) */
    extNight: Math.round(h * 2.0),     /* 연장 + 야간 */
    holiday8: Math.round(h * 1.5),     /* 휴일 8시간 이내 */
    holidayOver: Math.round(h * 2.0),  /* 휴일 8시간 초과분 */
  };
}

/* 연차 발생 일수 — 1년 미만: 개근한 달마다 1일(최대 11), 1년 이상: 15일, 3년차부터 2년마다 +1일(최대 25) */
export function leaveDays(years) {
  if (years < 1) return Math.min(11, Math.floor(years * 12));
  return Math.min(25, 15 + Math.floor((years - 1) / 2));
}
export const leaveDaily = (monthly) => Math.round(monthly / MONTH_HOURS * 8);
export const leavePay = (monthly, days) => leaveDaily(monthly) * days;

/* 사업소득 원천징수 3.3% = 소득세 3% + 지방소득세 0.3%, 각 10원 미만 절사 */
export function freelance(gross) {
  const tax = Math.floor(gross * 0.03 / 10) * 10;
  const local = Math.floor(tax * 0.1 / 10) * 10;
  return { gross, tax, local, withheld: tax + local, net: gross - tax - local };
}

/* 5월 종합소득세 정산 예시 — 필요경비율 가정, 기본공제 150만원, 표준세액공제 7만원, 다른 소득·공제 없음 */
export function freelanceSettlement(annualGross, expenseRate, prepaid) {
  const base = Math.max(0, Math.round(annualGross * (1 - expenseRate)) - 1500000);
  const calc = basicTax(base);
  const determined = Math.max(0, calc - 70000);
  const local = Math.floor(determined * 0.1 / 10) * 10;
  return { base, calc, determined, local, total: determined + local, due: determined + local - prepaid };
}
