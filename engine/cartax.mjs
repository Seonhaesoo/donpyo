/* 자동차세 — 지방세법 §127(비영업용 승용차 cc당 세액)·§130(차령별 경감)·§128(연납 공제), 지방교육세 30%
 * cc당: 1,000cc 이하 80원, 1,600cc 이하 140원, 초과 200원. 전기차·수소차는 정액 10만원.
 * 차령: 3년차부터 해마다 5%씩 최대 50% 경감(12년차 이상). 1월 연납 공제율은 행안부 고시(2~12월분에 적용). */

export const CC_RATES = [[1000, 80], [1600, 140], [Infinity, 200]];
export const EV_TAX = 100000;
export const EDU = 0.3;
export const ANNUAL_DISCOUNT = { 2023: 0.07, 2024: 0.05, 2025: 0.05, 2026: 0.03, 2027: 0 };

export const perCc = (cc) => CC_RATES.find(([lim]) => cc <= lim)[1];
export const ageDiscount = (age) => age <= 2 ? 0 : Math.min(0.5, Math.round((age - 2) * 5) / 100);

/* cc: 배기량 · o: { age: 차령(등록 후 몇 년째, 1~), year: 납부 연도, ev: 전기·수소차 } */
export function carTax(cc, o = {}) {
  const age = o.age || 1, year = o.year || 2026, ev = !!o.ev;
  const unit = ev ? 0 : perCc(cc);
  const gross = ev ? EV_TAX : cc * unit;
  const discount = ev ? 0 : ageDiscount(age);
  const tax = Math.floor(gross * (1 - discount));
  const educ = Math.floor(tax * EDU);
  const total = tax + educ;
  const rate = ANNUAL_DISCOUNT[year] == null ? 0 : ANNUAL_DISCOUNT[year];
  const prepay = Math.floor(total * rate * 11 / 12);
  return { cc, ev, unit, gross, age, discount, tax, educ, total, half: Math.floor(total / 2), rate, prepay, prepaid: total - prepay, year };
}
