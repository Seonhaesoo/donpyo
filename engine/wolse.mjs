/* 월세 세액공제 — /wolse/ (2026-11-28)
 * 조세특례제한법 제95조의2: 총급여 8,000만원 이하(종합소득금액 7,000만원 이하) 무주택 세대주(요건을 갖춘 세대원·배우자 포함),
 * 국민주택규모(85㎡) 이하 또는 기준시가 4억원 이하 주택(오피스텔·고시원 포함), 연 1,000만원 한도, 공제율 총급여 5,500만원 이하 17% · 그 초과 15%.
 * 실제로 줄어드는 세금은 결정세액 안에서만 생기고, 월세(특별세액공제)를 받으면 표준세액공제 13만원 대신이라 yearEnd 로 전후를 비교해 구한다. */
import { yearEnd } from './yearend.mjs';
import { insurance } from './tax.mjs';

export const WOLSE_LIMIT = 10000000;
export const WOLSE_GROSS_MAX = 80000000;
export const WOLSE_HIGH_UNDER = 55000000;
export const wolseRate = (gross) => (gross <= WOLSE_HIGH_UNDER ? 0.17 : 0.15);

/* annual: 연봉(원) · rent: 월세(원/월) · months: 올해 낸 달 수 · nontax: 연간 비과세(식대 월 20만 = 240만) · cardRatio: 카드 사용을 총급여의 몇 배로 볼지 */
export function wolseCredit({ annual, rent, months = 12, nontax = 2400000, dependents = 1, cardRatio = 0.4 }) {
  const gross = Math.max(0, (Number(annual) || 0) - nontax);
  const paid = Math.max(0, Number(rent) || 0) * Math.max(0, Math.min(12, Number(months) || 0));
  const eligible = gross > 0 && gross <= WOLSE_GROSS_MAX;
  const rate = wolseRate(gross);
  const counted = Math.min(paid, WOLSE_LIMIT);
  const max = eligible ? Math.round(counted * rate) : 0;
  const month = Math.round(gross / 12), ins = insurance(month);
  const base = { gross, dependents, pension: ins.pension * 12, health: (ins.health + ins.care) * 12, employment: ins.employment * 12, creditCard: Math.round(gross * cardRatio * 0.6), checkCard: Math.round(gross * cardRatio * 0.4) };
  const before = yearEnd({ ...base });
  const after = yearEnd({ ...base, renter: eligible, rent: paid });
  const save = Math.max(0, before.total - after.total);           /* 지방소득세 포함, 결정세액·표준세액공제를 반영한 실제 차이 */
  return { gross, paid, counted, eligible, rate, max, maxWithLocal: Math.floor(max * 1.1), save, before: before.total, after: after.total, capped: save + 10 < Math.floor(max * 1.1) };
}
