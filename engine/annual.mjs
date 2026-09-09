/* 연차 유급휴가와 연차수당 — 근로기준법 제60조(연차 유급휴가)·제61조(연차 유급휴가의 사용 촉진)
 *
 * 1년 미만 근로자: 1개월 개근할 때마다 1일씩, 최대 11일 (제60조 제2항).
 * 1년 이상 근로자: 1년간 80% 이상 출근하면 15일 (제60조 제1항). 3년 이상 계속 근로한 사람은
 *   최초 1년을 넘는 계속근로 2년마다 1일을 더해 한도 25일 (제60조 제4항)
 *   → 연차 = min(25, 15 + floor((근속연수 − 1) / 2)). 근속 3년 16일, 5년 17일, 7년 18일 … 21년 이상 25일.
 *
 * 부여 기준일은 두 가지를 쓴다.
 *   - 입사일 기준(개인별): 법이 정한 원칙. 사람마다 연차 발생일이 다르다.
 *   - 회계연도 기준(1월 1일): 노무 관리 편의를 위한 관행(고용노동부 행정해석 인정).
 *     입사 첫해 12월 31일까지는 개근한 달마다 1일씩 받고, 다음 해 1월 1일에
 *     15일 × (입사일부터 12월 31일까지의 일수 ÷ 365)의 비례연차를 받는다.
 *     소수점 처리(반올림·절상)는 법에 없고 회사 규정을 따르므로 여기서는 소수 1자리로 보여 준다.
 *
 * 연차수당 = 1일 통상임금 × 미사용 일수.
 *   1일 통상임금 = 통상시급 × 8시간, 통상시급 = 월 통상임금 ÷ 209시간(주 40시간 + 주휴 8시간 = 월 소정근로 209시간).
 *   통상시급을 원 단위로 반올림한 뒤 8을 곱한다(급여대장 관행).
 *
 * 미반영: 출근율 80% 미만일 때의 비례 부여, 육아휴직·업무상 재해 기간의 출근 간주,
 *   사용 촉진(제61조)에 따른 수당 지급 의무 면제, 5인 미만 사업장 적용 제외, 회사 규정의 반올림·절상. */

export const ANNUAL_ASOF = '근로기준법 제60조·제61조';
export const ANNUAL_BASE = 15;        /* 1년 이상 기본 연차 */
export const ANNUAL_MAX = 25;         /* 가산 한도 */
export const UNDER_ONE_MAX = 11;      /* 1년 미만 최대 (1개월 개근 1일 × 11개월) */
export const ANNUAL_HOURS = 209;      /* 월 소정근로시간 — data/rates.mjs 의 MONTH_HOURS 와 같은 값 */
export const DAY_HOURS = 8;           /* 1일 소정근로시간 */
export const YEAR_DAYS = 365;
export const PRESCRIPTION = 3;        /* 연차수당 청구권 소멸시효 3년 (근로기준법 제49조) */

/* 근속연수(년) → 그해 발생하는 연차 일수. 1년 미만은 0 (underOneYear 로 계산) */
export function annualDays(years) {
  const y = Math.floor(years || 0);
  if (y < 1) return 0;
  return Math.min(ANNUAL_MAX, ANNUAL_BASE + Math.floor((y - 1) / 2));
}

/* 근속 개월 수 → 1년 미만 근로자의 연차 일수 (1개월 개근에 1일, 최대 11일) */
export function underOneYear(months) {
  const m = Math.floor(months || 0);
  return Math.max(0, Math.min(UNDER_ONE_MAX, m));
}

/* 가산이 붙는 근속연수 — 3, 5, 7 … 21년 */
export const bumpYears = () => {
  const out = [];
  for (let y = 3; y <= 21; y += 2) out.push({ years: y, days: annualDays(y) });
  return out;
};

const pad = (v) => String(v).padStart(2, '0');
const iso = (ts) => { const d = new Date(ts); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };

/* 'YYYY-MM-DD' 또는 Date → UTC 타임스탬프 (시간대 때문에 하루가 밀리지 않게 UTC 로만 다룬다) */
export function toDate(v) {
  if (v instanceof Date) return Date.UTC(v.getFullYear(), v.getMonth(), v.getDate());
  const m = String(v == null ? '' : v).match(/^(\d{4})[-.\/](\d{1,2})[-.\/](\d{1,2})$/);
  if (!m) return null;
  const y = +m[1], mo = +m[2] - 1, d = +m[3];
  const ts = Date.UTC(y, mo, d);
  const chk = new Date(ts);
  return chk.getUTCFullYear() === y && chk.getUTCMonth() === mo && chk.getUTCDate() === d ? ts : null;
}

/* 두 날짜 사이의 만 개월 수 (일자가 아직 안 됐으면 한 달 뺀다) */
export function monthsBetween(from, to) {
  const a = new Date(from), b = new Date(to);
  let m = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  if (b.getUTCDate() < a.getUTCDate()) m -= 1;
  return Math.max(0, m);
}

/* 회계연도(1월 1일) 기준 첫해 비례연차 — 15일 × (입사일부터 그해 12월 31일까지의 일수 ÷ 365)
 * year 는 이 비례연차를 받는 해(입사연도 + 1)이며 생략하면 자동으로 채운다. */
export function prorated(hireDate, year) {
  const ts = toDate(hireDate);
  if (ts == null) return { hire: null, hireYear: null, year: year || null, days: 0, ratio: 0, raw: 0, days1: 0, ceil: 0, round: 0 };
  const d = new Date(ts), hy = d.getUTCFullYear();
  const worked = Math.round((Date.UTC(hy, 11, 31) - ts) / 86400000) + 1;   /* 입사일 포함 */
  const ratio = worked / YEAR_DAYS;
  const raw = Math.min(ANNUAL_BASE, ANNUAL_BASE * ratio);   /* 윤년(366일)이라도 첫해 비례연차는 15일을 넘지 않는다 */
  return {
    hire: iso(ts), hireYear: hy, year: Number(year) || hy + 1,
    days: worked, ratio, raw,
    days1: Math.round(raw * 10) / 10,     /* 소수 1자리 — 회사 규정에 따라 반올림/절상 */
    ceil: Math.ceil(raw), round: Math.round(raw),
  };
}

/* 입사일 기준(개인별) — asOf 시점의 근속과 그 시점에 쌓인 연차 */
export function byHire(hireDate, asOf) {
  const h = toDate(hireDate), a = toDate(asOf) || Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());
  if (h == null) return { months: 0, years: 0, days: 0, under: true, hire: null };
  const months = monthsBetween(h, a);
  const years = Math.floor(months / 12);
  const under = years < 1;
  return { hire: iso(h), asOf: iso(a), months, years, under, days: under ? underOneYear(months) : annualDays(years), next: under ? ANNUAL_BASE : annualDays(years + 1) };
}

/* 회계연도(1월 1일) 기준 — year 년 1월 1일에 발생하는 연차
 *  입사연도: 개근한 달마다 1일(최대 11일) · 입사 다음 해: 비례연차 · 그다음부터: 근속연수로 */
export function byFiscal(hireDate, year) {
  const h = toDate(hireDate);
  if (h == null) return { kind: 'none', days: 0, year: year || null };
  const hy = new Date(h).getUTCFullYear();
  const y = Number(year) || hy + 1;
  if (y <= hy) return { kind: 'monthly', year: y, days: UNDER_ONE_MAX, hireYear: hy, note: '입사한 해에는 개근한 달마다 1일씩 (최대 11일)' };
  if (y === hy + 1) { const p = prorated(hireDate, y); return { kind: 'prorated', year: y, days: p.days1, raw: p.raw, ceil: p.ceil, round: p.round, worked: p.days, hireYear: hy, note: `15일 × ${p.days}일 ÷ 365일` }; }
  const n = y - hy - 1;
  return { kind: 'full', year: y, days: annualDays(n), years: n, hireYear: hy, note: `1월 1일 기준 근속 ${n}년차` };
}

/* 연차수당 — 월 통상임금과 미사용 일수 → 1일 통상임금과 총액
 *  통상시급 = 월 통상임금 ÷ 209 (원 단위 반올림), 1일 통상임금 = 통상시급 × 8 */
export function annualPay(monthlyWage, unusedDays) {
  const w = Math.max(0, Math.round(monthlyWage || 0));
  const days = Math.max(0, unusedDays || 0);
  const hourly = Math.round(w / ANNUAL_HOURS);
  const daily = hourly * DAY_HOURS;
  return { monthly: w, hourly, daily, days, total: Math.round(daily * days) };
}
