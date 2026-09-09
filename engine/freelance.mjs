/* 프리랜서 원천징수 — 소득세법 제127조(원천징수의무)·제129조(원천징수세율)·제84조(과세최저한),
 * 소득세법 시행령 제87조(기타소득 필요경비), 지방세법 제103조의13(특별징수)
 *
 * 사업소득(인적용역): 소득세 3% + 지방소득세 0.3%(소득세의 10%) = 3.3%.
 *   실지급액 = 계약금액 × 0.967. 세전 = 실수령 ÷ 0.967.
 *
 * 기타소득(강연료·원고료·자문료 등 일시적인 용역): 필요경비 60%를 인정하므로
 *   기타소득금액(과세표준) = 총액 × 40%, 소득세 20% + 지방소득세 2%(소득세의 10%) = 총액의 8.8%.
 *   건당 지급액 12만 5천원 이하(= 기타소득금액 5만원 이하)는 과세최저한이라 원천징수하지 않는다.
 *
 * 사업소득이냐 기타소득이냐는 계속·반복성으로 가른다. 같은 일을 계속·반복해서 하고 그것이
 * 생계 수단이면 사업소득(3.3%), 일시적·우발적으로 한 번 한 일이면 기타소득(8.8%)이다.
 *
 * 3.3%·8.8%는 미리 낸 세금이다. 다음 해 5월 종합소득세 신고에서 수입 − 필요경비 − 각종 공제로
 * 다시 계산해 정산하며, 미리 낸 세금이 결정세액보다 많으면 돌려받고 적으면 더 낸다.
 * 기타소득은 연간 기타소득금액(총액 × 40%)이 300만원 이하면 분리과세로 끝낼 수도 있다.
 *
 * 각 세액은 10원 미만 절사(국고금관리법 제47조·지방세기본법 제49조).
 * 미반영: 봉사료·상금·복권 등 다른 원천징수율, 사업자등록을 낸 프리랜서의 세금계산서 발행,
 *   원천징수세액 1,000원 미만 소액부징수(사업소득에는 적용하지 않는다), 4대보험(지역가입자로 따로 낸다). */

export const FREELANCE_ASOF = '소득세법 제127조·제129조';
export const BUSINESS_RATE = 0.03;        /* 사업소득 소득세 */
export const LOCAL_RATE = 0.1;            /* 지방소득세 = 소득세의 10% */
export const OTHER_RATE = 0.2;            /* 기타소득 소득세 */
export const OTHER_EXPENSE = 0.6;         /* 기타소득 필요경비 인정률 */
export const OTHER_MIN = 125000;          /* 과세최저한 — 건당 12만 5천원 이하 (기타소득금액 5만원 이하) */
export const OTHER_SEPARATE = 3000000;    /* 연 기타소득금액 300만원 이하면 분리과세 선택 가능 */

export const TYPES = {
  business: {
    key: 'business', label: '사업소득 (인적용역)', short: '사업소득',
    total: 0.033, netRate: 0.967, taxRate: BUSINESS_RATE, localRate: 0.003, expense: 0,
    who: '계속·반복해서 용역을 제공하는 프리랜서 — 디자이너·개발자·강사·번역가·배달·보험모집인 등',
    code: '거주자의 사업소득 (원천징수 3.3%)',
  },
  other: {
    key: 'other', label: '기타소득 (강연료·원고료 등)', short: '기타소득',
    total: 0.088, netRate: 0.912, taxRate: OTHER_RATE, localRate: 0.02, expense: OTHER_EXPENSE,
    who: '일시적·우발적인 용역 — 한 번 나간 특강, 기고한 원고, 자문, 상금·사례금 등',
    code: '기타소득 (필요경비 60% 인정 후 22% → 총액의 8.8%)',
  },
};

const floor10 = (n) => Math.floor((n + 1e-6) / 10) * 10;
const typeOf = (t) => (TYPES[t] ? t : 'business');

/* 계약금액(지급총액) → 원천징수 세액과 실지급액.
 * { type, amount, base(과세표준), expense(필요경비), tax(소득세), local(지방소득세), total, net, rate, exempt } */
export function withholding(amount, type = 'business') {
  const t = typeOf(type), T = TYPES[t];
  const a = Math.max(0, Math.round(amount || 0));
  if (t === 'other') {
    const expense = Math.round(a * OTHER_EXPENSE);
    const base = a - expense;
    if (a <= OTHER_MIN) return { type: t, label: T.label, amount: a, expense, base, tax: 0, local: 0, total: 0, net: a, rate: 0, exempt: true };
    const tax = floor10(base * OTHER_RATE);
    const local = floor10(tax * LOCAL_RATE);
    return { type: t, label: T.label, amount: a, expense, base, tax, local, total: tax + local, net: a - tax - local, rate: a ? (tax + local) / a : 0, exempt: false };
  }
  const tax = floor10(a * BUSINESS_RATE);
  const local = floor10(tax * LOCAL_RATE);
  return { type: t, label: T.label, amount: a, expense: 0, base: a, tax, local, total: tax + local, net: a - tax - local, rate: a ? (tax + local) / a : 0, exempt: false };
}

/* 실수령액 → 세전 계약금액 역산. 세전 = 실수령 ÷ 0.967 (기타소득은 ÷ 0.912) 에서 10원 절사 오차를 맞춘다. */
export function grossUp(net, type = 'business') {
  const t = typeOf(type);
  const n = Math.max(0, Math.round(net || 0));
  let gross = Math.round(n / TYPES[t].netRate);
  for (let i = 0; i < 6; i++) {
    const w = withholding(gross, t);
    const diff = n - w.net;
    if (!diff) break;
    gross += diff;
  }
  return Object.assign({ target: n, gross }, withholding(gross, t));
}

/* 월 계약금액 → 연 환산 (12개월 같은 금액을 받는다고 볼 때) */
export function yearly(monthly, type = 'business') {
  const m = withholding(monthly, type);
  return {
    type: m.type, monthly: m.amount, monthlyNet: m.net, monthlyTax: m.total,
    gross: m.amount * 12, tax: m.tax * 12, local: m.local * 12, total: m.total * 12, net: m.net * 12,
  };
}
