/* 서재 글의 계산 문맥 c — build.mjs(페이지 생성)와 tools/check-guides.mjs(글 검사)가 같이 쓴다.
 * body(c) 는 빌드 시점의 요율·예시 숫자를 받아 HTML 을 돌려준다. c.M 은 engine/*.mjs 전부(파일 이름이 키)라
 * 글 안의 예시 숫자를 엔진으로 계산해 넣을 수 있다 — 요율이 바뀌면 글도 같이 바뀐다. */
import { YEAR, RATES, INTEREST_TAX } from '../data/rates.mjs';
import * as tax from '../engine/tax.mjs';
import * as loan from '../engine/loan.mjs';
import * as retire from '../engine/retire.mjs';
import * as unemploy from '../engine/unemploy.mjs';
import * as rank from '../engine/rank.mjs';
import * as labor from '../engine/labor.mjs';
import * as age from '../engine/age.mjs';
import * as goal from '../engine/goal.mjs';
import * as gift from '../engine/gift.mjs';
import * as realty from '../engine/realty.mjs';
import * as deposit from '../engine/deposit.mjs';
import * as inherit from '../engine/inherit.mjs';
import * as income from '../engine/income.mjs';
import * as property from '../engine/property.mjs';
import * as jongbu from '../engine/jongbu.mjs';
import * as cartax from '../engine/cartax.mjs';
import * as ltv from '../engine/ltv.mjs';
import * as subscription from '../engine/subscription.mjs';
import * as parental from '../engine/parental.mjs';
import * as electric from '../engine/electric.mjs';
import * as eitc from '../engine/eitc.mjs';
import * as pension from '../engine/pension.mjs';
import * as capgain from '../engine/capgain.mjs';
import * as carcost from '../engine/carcost.mjs';
import * as annual from '../engine/annual.mjs';
import * as freelance from '../engine/freelance.mjs';
import * as nhis from '../engine/nhis.mjs';
import * as yearend from '../engine/yearend.mjs';
import { num, won, manwon, short, pct, rate as fmtRate } from '../engine/fmt.mjs';

export const ENGINE = { tax, loan, retire, unemploy, rank, labor, age, goal, gift, realty, deposit, inherit, income, property, jongbu, cartax, ltv, subscription, parental, electric, eitc, pension, capgain, carcost, annual, freelance, nhis, yearend };

/* NT: 식대 비과세(월) · table(head, rows): 표 그리기 — rows 는 { cells } 배열 */
export function guideContext({ NT, table }) {
  const PREV = YEAR - 1, R0 = RATES[YEAR];
  const { netPay } = tax, L = loan, R = retire, U = unemploy;
  const ex = netPay({ annual: 42000000, nontax: NT });
  const ex1 = netPay({ annual: 42000000, nontax: NT, dependents: 1 });
  const ex2 = netPay({ annual: 42000000, nontax: NT, dependents: 2 });
  const ex3 = netPay({ annual: 42000000, nontax: NT, dependents: 3 });
  const P = 200000000, r = 0.045, years = 30, months = 360;
  const a = L.summary(P, r, months), e = L.summary(P, r, months, 'equal'), b = L.summary(P, r, months, 'bullet'), lower = L.summary(P, r - 0.005, months);
  const sv = R.severance(3500000, 10), st = R.severanceTax(sv.amount, 10);
  const ui = U.dailyBenefit(3500000);
  const dsrA = 50000000, cap = Math.floor(dsrA * 0.4 / 12);
  return {
    YEAR, PREV, R0, R1: RATES[PREV], won, num, manwon, short, pct, rate: fmtRate, minWage: R0.minWage, NT, INTEREST_TAX,
    table: (head, rows) => table(head, rows.map((cells) => ({ cells }))),
    ex, ex1, ex2, ex3,
    loan: { P, r, years, annuity: { first: a.first, last: a.last, totalInterest: a.totalInterest }, equal: { first: e.first, last: e.last, totalInterest: e.totalInterest }, bullet: { first: b.first, last: b.last, totalInterest: b.totalInterest }, lower: { first: lower.first } },
    retire: { pay: 3500000, years: 10, avgDaily: sv.avgDaily, amount: sv.amount, svc: st.serviceDeduction, converted: st.converted, base: st.base, incomeTax: st.incomeTax, localTax: st.localTax, total: st.total },
    ui: { pay: 3500000, upper: ui.upper, lower: ui.lower, raw: ui.raw, daily: ui.daily },
    dsr: { annual: dsrA, cap, r: 0.045, principal: Math.floor(L.loanForPayment(cap, 0.045, 360) / 10000) * 10000, stressed: Math.floor(L.loanForPayment(cap, 0.06, 360) / 10000) * 10000 },
    M: ENGINE,
  };
}
