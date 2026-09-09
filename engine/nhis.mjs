import { RATES, YEAR } from '../data/rates.mjs';
/* 건강보험료 — 국민건강보험법 제69조~제73조·시행령 제32조·제42조, 노인장기요양보험법 제9조 (2025년 기준)
 *
 * 직장가입자
 *   건강보험료 = 보수월액 × 7.09% (근로자 3.545% + 사업주 3.545%).
 *   보수월액 상한 12,720,000원 · 하한 279,300원.
 *   장기요양보험료 = 건강보험료 × 12.95%, 역시 절반씩 나눠 낸다.
 *
 * 지역가입자 (2022년 9월 2단계 개편 이후)
 *   소득: 정률제. 연소득 336만원 이하는 최저보험료 19,780원, 그보다 많으면 직장가입자와 같은
 *     7.09%를 적용해 월 보험료 = 연소득 × 7.09% ÷ 12.
 *   재산: 재산과세표준(시가가 아니라 지방세 과세표준)에서 기본공제 1억원을 뺀 금액을
 *     재산등급표로 점수화하고, 부과점수당 금액 208.4원(2025년)을 곱한다.
 *     ※ 공단의 재산등급표는 60등급이지만 이 사이트는 이를 6단계로 줄인 근사식을 쓴다.
 *        구간 경계에서 실제 보험료와 차이가 날 수 있으므로 정확한 금액은
 *        국민건강보험공단 모의계산(https://www.nhis.or.kr)에서 확인해야 한다.
 *   자동차는 2024년 2월 부과분부터 보험료 산정에서 빠졌다.
 *   장기요양보험료는 직장과 같이 건강보험료 × 12.95%.
 *
 * 각 보험료는 10원 미만 절사.
 * 미반영: 소득월액보험료(보수 외 소득 연 2,000만원 초과 직장가입자), 피부양자 자격,
 *   임의계속가입, 섬·벽지·농어촌·저소득 경감, 연말정산 정산분, 지역가입자 보험료 상한. */

export const NHIS_URL = 'https://www.nhis.or.kr';
/* 요율은 사이트 공통 data/rates.mjs 를 따른다 — 연봉·월급 페이지와 같은 값이어야 한다 */
export const HALF_RATE = RATES[YEAR].health;                 /* 직장가입자 근로자·사업주 각각 */
export const HEALTH_RATE = Math.round(HALF_RATE * 2 * 100000) / 100000;   /* 직장·지역 공통 */
export const CARE_RATE = RATES[YEAR].care;                   /* 장기요양보험료 = 건강보험료 × 이 비율 */
export const WAGE_MAX = 12720000;              /* 보수월액 상한 */
export const WAGE_MIN = 279300;                /* 보수월액 하한 */
export const POINT_VALUE = 208.4;              /* 지역가입자 부과점수당 금액 (2025년) */
export const LOCAL_MIN = 19780;                /* 지역가입자 최저보험료 */
export const LOCAL_MIN_INCOME = 3360000;       /* 연소득 336만원 이하 → 최저보험료 */
export const PROPERTY_DEDUCTION = 100000000;   /* 재산 기본공제 1억원 */

/* 재산 점수 근사표 — 공단 60등급표를 6단계로 줄인 값이라 정확한 금액은 공단 모의계산으로 확인해야 한다.
 * max 는 기본공제 1억원을 뺀 뒤의 금액 상한. */
export const PROPERTY_TABLE = [
  { max: 0, points: 0, from: 0, to: 100000000 },
  { max: 50000000, points: 22, from: 100000000, to: 150000000 },
  { max: 150000000, points: 60, from: 150000000, to: 250000000 },
  { max: 300000000, points: 100, from: 250000000, to: 400000000 },
  { max: 500000000, points: 150, from: 400000000, to: 600000000 },
  { max: 800000000, points: 200, from: 600000000, to: 900000000 },
  { max: Infinity, points: 250, from: 900000000, to: Infinity },
];

const floor10 = (n) => Math.floor((n + 1e-6) / 10) * 10;

/* 재산과세표준 → 부과점수 (근사) */
export function propertyPoints(property) {
  const net = Math.max(0, Math.round(property || 0) - PROPERTY_DEDUCTION);
  for (const row of PROPERTY_TABLE) if (net <= row.max) return row.points;
  return PROPERTY_TABLE[PROPERTY_TABLE.length - 1].points;
}

/* 건강보험료 → 장기요양보험료 */
export const longTerm = (health) => floor10(Math.max(0, health || 0) * CARE_RATE);

/* 직장가입자 — 보수월액(월 과세 급여) 기준 */
export function employee(wage) {
  const raw = Math.max(0, Math.round(wage || 0));
  const base = Math.min(Math.max(raw, WAGE_MIN), WAGE_MAX);
  const health = floor10(base * HEALTH_RATE);
  const healthHalf = floor10(health / 2);
  const care = longTerm(health);
  const careHalf = floor10(care / 2);
  return {
    wage: raw, base, capped: raw > WAGE_MAX, floored: raw > 0 && raw < WAGE_MIN,
    health, healthEmployee: healthHalf, healthEmployer: health - healthHalf,
    care, careEmployee: careHalf, careEmployer: care - careHalf,
    total: health + care,
    employee: healthHalf + careHalf,
    employer: (health - healthHalf) + (care - careHalf),
    annualEmployee: (healthHalf + careHalf) * 12,
  };
}

/* 지역가입자 — { income: 연소득(원), property: 재산과세표준(원) } */
export function local(i = {}) {
  const income = Math.max(0, Math.round(i.income || 0));
  const property = Math.max(0, Math.round(i.property || 0));
  const incomeRaw = income * HEALTH_RATE / 12;
  const minimum = income <= LOCAL_MIN_INCOME;
  const incomePart = minimum ? LOCAL_MIN : Math.max(LOCAL_MIN, floor10(incomeRaw));
  const points = propertyPoints(property);
  const propertyPart = floor10(points * POINT_VALUE);
  const propertyNet = Math.max(0, property - PROPERTY_DEDUCTION);
  const health = incomePart + propertyPart;
  const care = longTerm(health);
  return {
    income, property, propertyNet, points, minimum,
    incomePart, propertyPart, health, care,
    total: health + care, annual: (health + care) * 12,
    approx: points > 0,        /* 재산 점수를 쓴 계산은 근사 */
  };
}

/* 표기용 — 실제 적용 요율에서 만든다 */
export const NHIS_ASOF = `${YEAR}년 요율 기준 (지역가입자 부과점수 단가·최저보험료는 2025년 고시값)`;
export const HEALTH_PCT = `${(HEALTH_RATE * 100).toFixed(2)}%`;      /* 예: 7.19% */
export const HALF_PCT = `${(HALF_RATE * 100).toFixed(3)}%`;          /* 예: 3.595% */
export const CARE_PCT = `${(CARE_RATE * 100).toFixed(2)}%`;          /* 예: 13.14% */
