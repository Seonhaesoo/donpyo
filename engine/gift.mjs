/* 증여세 — 상속세 및 증여세법 §53(증여재산공제)·§53의2(혼인·출산 공제, 2024.1.1~)·§56(세율)·§57(세대생략 할증)·§69(신고세액공제 3%)
 * 공제는 10년 합산 한도. 이전 증여(prior)가 있으면 합산해 세율을 매기고 이전분 세액을 뺀다(기납부세액 공제의 단순화). */

export const GIFT_BRACKETS = [
  [100000000, 0.10, 0],
  [500000000, 0.20, 10000000],
  [1000000000, 0.30, 60000000],
  [3000000000, 0.40, 160000000],
  [Infinity, 0.50, 460000000],
];

export const RELATIONS = {
  spouse: { label: '배우자', short: '배우자', deduction: 600000000, lineal: false },
  child: { label: '성년 자녀', short: '자녀', deduction: 50000000, lineal: true },
  minor: { label: '미성년 자녀', short: '미성년 자녀', deduction: 20000000, lineal: true },
  grandchild: { label: '손자녀 (세대생략)', short: '손자녀', deduction: 50000000, lineal: true, surcharge: 0.3 },
  parent: { label: '부모 (직계존속)', short: '부모', deduction: 50000000, lineal: false },
  relative: { label: '형제·친족', short: '친족', deduction: 10000000, lineal: false },
  other: { label: '타인', short: '타인', deduction: 0, lineal: false },
};

export const MARRIAGE_DEDUCTION = 100000000;   /* 혼인·출산 증여재산공제 — 직계존속→직계비속, 혼인신고 전후 2년·출생 후 2년, 통합 한도 1억 */
export const MIN_BASE = 500000;                /* 과세표준 50만원 미만은 과세하지 않음 */
export const REPORT_CREDIT = 0.03;

export function progressive(base) {
  if (base < MIN_BASE) return { rate: 0, calc: 0, deduct: 0 };
  for (const [limit, rate, deduct] of GIFT_BRACKETS) if (base <= limit) return { rate, calc: Math.floor(base * rate - deduct), deduct };
  return { rate: 0, calc: 0, deduct: 0 };
}

/* amount: 이번 증여액(원) · rel: RELATIONS 키 · opts: { marriage: 혼인·출산 공제, prior: 10년 내 같은 사람에게서 받은 증여 합계, priorDeductionUsed: 그때 쓴 공제 } */
export function giftTax(amount, rel = 'child', opts = {}) {
  const R = RELATIONS[rel] || RELATIONS.other;
  const marriage = (opts.marriage && R.lineal) ? MARRIAGE_DEDUCTION : 0;
  const limit = R.deduction + marriage;
  const prior = opts.prior || 0;
  const total = amount + prior;
  const deduction = Math.min(total, limit);
  const base = Math.max(0, total - deduction);
  const p = progressive(base);
  let calc = p.calc;
  if (prior > 0) {
    const priorBase = Math.max(0, prior - Math.min(prior, limit));
    calc = Math.max(0, calc - progressive(priorBase).calc);
  }
  const surcharge = R.surcharge ? Math.floor(calc * R.surcharge) : 0;
  const gross = calc + surcharge;
  const credit = Math.floor(gross * REPORT_CREDIT);
  const tax = gross - credit;
  return { amount, rel, label: R.label, deduction: Math.min(amount, Math.max(0, limit - Math.min(prior, limit))), marriage, base, rate: p.rate, progressiveDeduct: p.deduct, calc, surcharge, credit, tax, net: amount - tax, effective: amount ? tax / amount : 0 };
}

/* 세금 없이 줄 수 있는 최대 금액 (10년 기준) */
export function freeLimit(rel, marriage = false) {
  const R = RELATIONS[rel] || RELATIONS.other;
  return R.deduction + ((marriage && R.lineal) ? MARRIAGE_DEDUCTION : 0);
}
