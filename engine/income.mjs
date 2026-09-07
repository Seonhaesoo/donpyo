/* 종합소득세 — 소득세법 기본세율(6~45%), 기본공제 본인 150만원, 표준세액공제 7만원(사업소득자), 지방소득세 10%
 * 단순화: 다른 소득공제·세액공제 없음. 프리랜서 3.3% 기납부와의 정산도 계산. */
import { basicTax, BRACKETS } from './retire.mjs';

export const BASIC_DEDUCTION = 1500000;
export const STANDARD_CREDIT = 70000;
export const WITHHOLD = 0.03;            /* 사업소득 원천징수 소득세 3% (지방소득세 0.3% 별도) */

const floor10 = (n) => Math.floor((n + 1e-6) / 10) * 10;

export function bracketOf(base) {
  for (const [limit, rate, sub] of BRACKETS) if (base <= limit) return { limit, rate, sub };
  return { limit: Infinity, rate: 0.45, sub: 65940000 };
}

/* income: 종합소득금액(수입 − 필요경비) · o: { deductions: 추가 소득공제, credits: 추가 세액공제 } */
export function incomeTax(income, o = {}) {
  const base = Math.max(0, income - BASIC_DEDUCTION - (o.deductions || 0));
  const calc = basicTax(base);
  const credit = Math.min(calc, STANDARD_CREDIT + (o.credits || 0));
  const tax = Math.max(0, calc - credit);
  const local = floor10(tax * 0.1);
  const b = bracketOf(base);
  return { income, base, calc, credit, tax, local, total: tax + local, rate: b.rate, progressiveDeduct: b.sub, effective: income ? (tax + local) / income : 0 };
}

/* 프리랜서 정산: 수입(revenue)에서 경비율(expenseRate)만큼 뺀 소득으로 계산해 3.3% 기납부와 비교 */
export function settle(revenue, expenseRate, o = {}) {
  const income = Math.round(revenue * (1 - expenseRate));
  const t = incomeTax(income, o);
  const withheld = Math.floor(revenue * WITHHOLD);
  const withheldLocal = floor10(withheld * 0.1);
  const prepaid = withheld + withheldLocal;
  return { revenue, expenseRate, income, ...t, prepaid, refund: prepaid - t.total };
}
