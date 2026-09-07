/* 상속세 — 상속세 및 증여세법 §18(기초공제 2억)·§20(자녀공제 5천만)·§21(일괄공제 5억)·§19(배우자상속공제 5억~30억, 법정상속분 한도)·§22(금융재산상속공제)·§26(세율)·§69(신고세액공제 3%)
 * 단순화: 자녀는 성년, 직계존속 없음, 사전증여·채무·장례비 없음, 동거주택공제 없음. 배우자는 법정상속분만큼 실제 상속받는다고 가정. */
import { progressive, REPORT_CREDIT } from './gift.mjs';

export const LUMP = 500000000;          /* 일괄공제 */
export const BASIC = 200000000;         /* 기초공제 */
export const CHILD_DED = 50000000;      /* 자녀 1인당 */
export const SPOUSE_MIN = 500000000;    /* 배우자상속공제 최소 */
export const SPOUSE_MAX = 3000000000;   /* 배우자상속공제 최대 */
export const FIN_MAX = 200000000;       /* 금융재산상속공제 최대 */

export const CASES = {
  spouse1: { label: '배우자 + 자녀 1명', spouse: true, children: 1 },
  spouse2: { label: '배우자 + 자녀 2명', spouse: true, children: 2 },
  spouse3: { label: '배우자 + 자녀 3명', spouse: true, children: 3 },
  child1: { label: '자녀 1명 (배우자 없음)', spouse: false, children: 1 },
  child2: { label: '자녀 2명 (배우자 없음)', spouse: false, children: 2 },
};

/* 배우자 법정상속분 — 배우자 1.5 : 자녀 1 */
export const spouseShare = (children) => children > 0 ? 1.5 / (1.5 + children) : 1;

/* 순금융재산 공제: 2천만원 이하 전액, 초과분은 20%(최소 2천만원, 최대 2억) */
export function financialDeduction(fin) {
  if (fin <= 0) return 0;
  if (fin <= 20000000) return fin;
  return Math.min(FIN_MAX, Math.max(20000000, Math.floor(fin * 0.2)));
}

export function inheritTax(estate, o = {}) {
  const spouse = !!o.spouse, children = o.children == null ? 1 : o.children;
  const taxable = Math.max(0, estate - (o.debts || 0));
  const personal = BASIC + CHILD_DED * children;
  const lump = Math.max(LUMP, personal);
  let spouseDed = 0, share = 0;
  if (spouse) {
    share = spouseShare(children);
    const legal = Math.floor(taxable * share);
    const actual = o.spouseActual == null ? legal : o.spouseActual;
    spouseDed = Math.max(SPOUSE_MIN, Math.min(actual, legal, SPOUSE_MAX));
  }
  const fin = financialDeduction(o.financial || 0);
  const deductions = Math.min(taxable, lump + spouseDed + fin);
  const base = Math.max(0, taxable - deductions);
  const p = progressive(base);
  const credit = Math.floor(p.calc * REPORT_CREDIT);
  const tax = p.calc - credit;
  return { estate, taxable, personal, lump, lumpType: personal > LUMP ? 'personal' : 'lump', spouse, children, share, spouseDed, fin, deductions, base, rate: p.rate, progressiveDeduct: p.deduct, calc: p.calc, credit, tax, net: estate - tax, effective: estate ? tax / estate : 0 };
}

/* 세금 없이 물려줄 수 있는 최대 재산 (배우자 법정상속분 가정) — 공제 합계가 재산을 넘는 지점 */
export function freeEstate(c) {
  const C = CASES[c];
  const lump = Math.max(LUMP, BASIC + CHILD_DED * C.children);
  if (!C.spouse) return lump;
  /* 배우자공제 = max(5억, 재산 × 지분) → 재산 E가 lump + max(5억, E×s) 이하이면 세금 없음 */
  const s = spouseShare(C.children);
  const withMin = lump + SPOUSE_MIN;                 /* E ≤ 10억(자녀 1명) 구간 */
  const withShare = lump / (1 - s);                  /* E × (1 − s) = lump */
  return Math.floor(Math.max(withMin, Math.min(withShare, lump + SPOUSE_MAX)));
}
