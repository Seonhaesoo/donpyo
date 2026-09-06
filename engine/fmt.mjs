/* 숫자 표기 — 원·만원·억 단위, 퍼센트, 절사 */

export const num = (n) => Math.round(n).toLocaleString('ko-KR');
export const won = (n) => num(n) + '원';
export const pct = (x, d = 1) => (x * 100).toFixed(d) + '%';
export const floor10 = (n) => Math.floor(n / 10) * 10;
export const floor1000 = (n) => Math.floor(n / 1000) * 1000;

/* 원 → "4,200만원" / "1억 2,000만원" / "2억원" */
export function manwon(n) {
  const m = Math.round(n / 10000);
  if (m >= 10000) {
    const eok = Math.floor(m / 10000), rest = m % 10000;
    return rest ? `${eok}억 ${rest.toLocaleString('ko-KR')}만원` : `${eok}억원`;
  }
  return m.toLocaleString('ko-KR') + '만원';
}

/* 원 → 짧은 표기 "4,200만" / "2억" / "1.5억" (칩·표 머리용) */
export function short(n) {
  const m = Math.round(n / 10000);
  if (m >= 10000) {
    const eok = m / 10000;
    return (Number.isInteger(eok) ? eok : eok.toFixed(1).replace(/\.0$/, '')) + '억';
  }
  return m.toLocaleString('ko-KR') + '만';
}

/* 금리 0.045 → "4.5%" */
export const rate = (r) => (r * 100).toFixed(2).replace(/0$/, '').replace(/\.0$/, '') + '%';

/* URL 조각: 금액(만원)·금리·기간 */
export const rateSlug = (r) => (r * 100).toFixed(1);
