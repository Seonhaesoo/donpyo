/* 급여 공제 엔진 — 4대보험 근로자 부담분 + 근로소득 간이세액(소득세·지방소득세)
 *
 * 소득세는 국세청 근로소득 간이세액표(소득세법 시행령 별표 2)를 그대로 조회한다.
 *   - 표 구간: 월급여 770천원 ~ 10,000천원, 공제대상가족 1~11명 (data/ganyi.json)
 *     본표 수치는 2024.2.29 개정(대통령령 제34265호)과 2026.2.27 개정(제36129호, 2026.3.1 이후 원천징수분)이 같다 —
 *     법제처 별표 PDF(flSeq=164357181)와 646구간 × 11열 전부 대조(2026-10-24). 36129호 개정문은 별표 2 제3호(자녀 공제액)만 고쳤다.
 *   - 10,000천원 초과: 별표 2가 정한 계산식 (10,000천원 세액 + 초과분 × 세율)
 *   - 8세 이상 20세 이하 자녀: 1명 20,830원, 2명 45,830원, 3명부터 1명당 33,330원 추가 공제 (2026.3.1 이후; 그 전은 12,500·29,160·25,000원)
 * 회사는 100%·80%·120% 중 고를 수 있는데 여기서는 기본인 100%를 쓴다. */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { YEAR, RATES } from '../data/rates.mjs';

const TABLE = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'ganyi.json'), 'utf8')).rows;
/* 월급여가 정확히 10,000천원일 때의 세액 (가족 1~11명) — 초과 구간 계산식의 기준값 */
const T10000 = [1507400, 1431570, 1200840, 1170840, 1140840, 1110840, 1080840, 1050840, 1020840, 990840, 960840];

const floor10 = (n) => Math.floor((n + 1e-6) / 10) * 10;   /* 부동소수점 오차(31499.9999…) 방지 */

/* 4대보험 근로자 부담 — 과세 급여(월) 기준. 국민연금은 기준소득월액(천원 미만 절사) 상·하한 적용, 각 10원 미만 절사 */
export function insurance(taxable, year = YEAR) {
  const R = RATES[year] || RATES[YEAR];
  const base = Math.floor(taxable / 1000) * 1000;
  const pensionBase = Math.min(Math.max(base, R.pensionMin), R.pensionMax);
  const pension = taxable > 0 ? floor10(pensionBase * R.pension) : 0;
  const health = floor10(taxable * R.health);
  const care = floor10(health * R.care);
  const employment = floor10(taxable * R.employment);
  return { pension, health, care, employment, total: pension + health + care + employment };
}

/* 간이세액표 조회 — taxable: 과세 월급여(원), dependents: 본인 포함 공제대상가족 수 */
export function tableTax(taxable, dependents = 1) {
  const d = Math.min(Math.max(1, dependents), 11);
  const col = d + 1;                                   /* rows: [from, to, d1..d11] */
  const k = taxable / 1000;                            /* 천원 */
  if (k < 770) return 0;
  if (k >= 10000) {
    const base = T10000[d - 1];
    const over = taxable - 10000000;
    let extra;
    if (over <= 0) extra = 0;
    else if (k <= 14000) extra = over * 0.98 * 0.35 + 25000;
    else if (k <= 28000) extra = 1397000 + (taxable - 14000000) * 0.98 * 0.38;
    else if (k <= 30000) extra = 6610600 + (taxable - 28000000) * 0.98 * 0.40;
    else if (k <= 45000) extra = 7394600 + (taxable - 30000000) * 0.40;
    else if (k <= 87000) extra = 13394600 + (taxable - 45000000) * 0.42;
    else extra = 31034600 + (taxable - 87000000) * 0.45;
    let t = base + extra;
    if (dependents > 11) t -= (T10000[9] - T10000[10]) * (dependents - 11);
    return floor10(Math.max(0, t));
  }
  /* 이분탐색 */
  let lo = 0, hi = TABLE.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (TABLE[mid][1] <= k) lo = mid + 1; else hi = mid;
  }
  const row = TABLE[lo];
  let t = row[col];
  if (dependents > 11) t -= (row[11] - row[12]) * (dependents - 11);
  return Math.max(0, t);
}

/* 8세 이상 20세 이하 자녀 공제 — 별표 2 제3호 (2026.2.27 개정, 2026.3.1 이후 원천징수분부터). 연말정산 자녀세액공제(25·30·40만원)의 12분의 1 */
export function childCredit(children) {
  if (children <= 0) return 0;
  if (children === 1) return 20830;
  if (children === 2) return 45830;
  return 45830 + (children - 2) * 33330;
}

/* 월 소득세·지방소득세 */
export function incomeTax(taxable, dependents = 1, children = 0) {
  const tax = Math.max(0, tableTax(taxable, dependents) - childCredit(children));
  const local = floor10(tax * 0.1);
  return { tax, local, total: tax + local };
}

/* 실수령액 — annual(연봉) 또는 monthly(월급) 중 하나. nontax: 비과세 식대 등 월 금액 */
export function netPay({ annual, monthly, dependents = 1, children = 0, nontax = 0, year = YEAR }) {
  const gross = monthly != null ? monthly : Math.round(annual / 12);
  const taxable = Math.max(0, gross - nontax);
  const ins = insurance(taxable, year);
  const t = incomeTax(taxable, dependents, children);
  const deductions = ins.total + t.total;
  const net = gross - deductions;
  return { gross, taxable, nontax, ...ins, tax: t.tax, local: t.local, insurance: ins.total, taxTotal: t.total, deductions, net, annualGross: gross * 12, annualNet: net * 12, annualDeductions: deductions * 12, ratio: gross ? net / gross : 0 };
}

/* 실수령 목표액을 만드는 세전 월급 (1,000원 단위 이분탐색) */
export function grossForNet(targetNet, opts = {}) {
  let lo = targetNet, hi = Math.round(targetNet * 2.2);
  while (hi - lo > 1000) {
    const mid = Math.round((lo + hi) / 2 / 1000) * 1000;
    if (netPay({ monthly: mid, ...opts }).net >= targetNet) hi = mid; else lo = mid;
  }
  return hi;
}
