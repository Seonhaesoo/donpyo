/* 국민연금 노령연금 예상 수령액 — 어림 계산 (참고용)
 * 국민연금법 제51조(기본연금액)·제63조(노령연금액)·제63조의2(조기노령연금)·제62조(연기연금)·제61조(수급 개시 연령, 부칙)
 * 기본연금액(연) = 비례상수 × (A + B) × (1 + 0.05 × (가입연수 − 20)) — 20년 미만은 법 §63②의 "50% + 10년 초과 1년마다 5%"와 같은 식
 *   A값: 전체 가입자 최근 3년 평균 소득월액 (2025년 적용 3,089,062원)
 *   B값: 본인 가입기간 평균 소득월액 (기준소득월액 하한 40만·상한 637만원, 2025.7~2026.6)
 *   비례상수: 2025년 1.26(소득대체율 42%), 2026년부터 1.29(43%로 고정 — 2025년 3월 개정)
 * 조기연금: 1년 앞당길 때마다 6% 감액(최대 5년 30%) · 연기연금: 1년 늦출 때마다 7.2% 증액(최대 5년 36%)
 * 수급 개시 연령: ~1952년생 60세, 1953~56 61세, 57~60 62세, 61~64 63세, 65~68 64세, 1969년생 이후 65세
 * 보험료율: 2025년 9% → 2026년부터 매년 0.5%p 인상, 2033년 13% (직장 가입자는 회사·본인 절반씩)
 * 미반영: 가입 시기별로 다른 비례상수(1988~98년 2.4, 1999~2007년 1.8 등), 물가 연동, 과거 소득 재평가, 부양가족연금, 소득활동에 따른 감액, 가입기간 10년 미만의 반환일시금. */

export const PENSION_ASOF = '2025년';
export const A_VALUE = 3089062;
export const B_MIN = 400000;
export const B_MAX = 6370000;
export const CONSTANT = { 2025: 1.26, 2026: 1.29 };
export const REPLACEMENT = { 2025: 0.42, 2026: 0.43 };
export const DEFAULT_CONST = 1.29;
export const EARLY_CUT = 0.06;
export const DEFER_ADD = 0.072;
export const MAX_SHIFT = 5;
export const MIN_YEARS = 10;
export const AGE_TABLE = [[1952, 60], [1956, 61], [1960, 62], [1964, 63], [1968, 64], [Infinity, 65]];
export const RATE_SCHEDULE = { 2025: 0.09, 2026: 0.095, 2027: 0.10, 2028: 0.105, 2029: 0.11, 2030: 0.115, 2031: 0.12, 2032: 0.125, 2033: 0.13 };

const floor10 = (n) => Math.floor(n / 10) * 10;

/* 출생연도 → 노령연금 수급 개시 연령 */
export const startAge = (birthYear) => AGE_TABLE.find(([y]) => (birthYear || 9999) <= y)[1];

/* 가입연수 → 기본연금액 계수 (10년 0.5 · 20년 1.0 · 40년 2.0) */
export const yearsFactor = (years) => years >= MIN_YEARS ? 1 + 0.05 * (years - 20) : 0;

/* { avgIncome: 가입기간 평균 소득월액, years: 가입연수, birthYear, startAge: 수급 개시 나이(생략하면 정상 개시), constant } */
export function pension(i = {}) {
  const income = Math.min(B_MAX, Math.max(B_MIN, Math.round(i.avgIncome || 0)));
  const years = Math.max(0, i.years || 0);
  const eligible = years >= MIN_YEARS;
  const constant = i.constant || DEFAULT_CONST;
  const mult = yearsFactor(years);
  const base = Math.round(constant * (A_VALUE + income) * mult);     /* 기본연금액 (연) */
  const normalAge = startAge(i.birthYear);
  const wanted = i.startAge == null ? normalAge : i.startAge;
  const shift = Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, Math.round(wanted - normalAge)));
  const rate = shift < 0 ? 1 - EARLY_CUT * -shift : 1 + DEFER_ADD * shift;
  const annual = Math.round(base * rate);
  const monthly = floor10(annual / 12);
  return {
    income, years, eligible, constant, A: A_VALUE, B: income, mult,
    base, baseMonthly: floor10(base / 12),
    normalAge, startAge: normalAge + shift, shift, rate, annual, monthly,
    replacement: income ? monthly / income : 0,
  };
}

/* 조기·연기별 월액 표 (정상 개시 기준 −5 ~ +5년) */
export function shiftTable(i = {}) {
  const normal = startAge(i.birthYear);
  const rows = [];
  for (let s = -MAX_SHIFT; s <= MAX_SHIFT; s++) rows.push({ shift: s, age: normal + s, ...pension({ ...i, startAge: normal + s }) });
  return rows;
}

/* 월 보험료 — income: 기준소득월액(상·하한 적용), year: 적용 연도 */
export function premium(income, year = 2026) {
  const base = Math.min(B_MAX, Math.max(B_MIN, Math.round(income || 0)));
  const r = RATE_SCHEDULE[year] == null ? (year > 2033 ? RATE_SCHEDULE[2033] : RATE_SCHEDULE[2025]) : RATE_SCHEDULE[year];
  const total = floor10(base * r);
  return { year, rate: r, base, total, employee: floor10(base * r / 2), employer: floor10(base * r / 2), self: total };
}

export const premiumTable = (income) => Object.keys(RATE_SCHEDULE).map(Number).map((y) => premium(income, y));

/* 낸 돈과 받는 돈 — years 동안 요율 9%로 냈다고 보고 회수까지 걸리는 개월 (직장: 본인 4.5% 기준) */
export function payback(i = {}) {
  const p = pension(i);
  const paidTotal = Math.round(p.income * 0.09 * 12 * p.years);
  const paidSelf = Math.round(paidTotal / 2);
  return { ...p, paidTotal, paidSelf, monthsTotal: p.monthly ? Math.ceil(paidTotal / p.monthly) : 0, monthsSelf: p.monthly ? Math.ceil(paidSelf / p.monthly) : 0 };
}
