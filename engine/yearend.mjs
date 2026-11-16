/* 연말정산 미리보기 — 총급여와 주요 공제 몇 가지로 결정세액을 추정해 기납부(간이세액)와 비교한다.
 * 반영: 근로소득공제, 기본공제, 국민연금·건강·고용보험료 소득공제, 신용카드 소득공제(25% 초과분 15%/30%, 한도 총급여 7,000만원 이하 300만·초과 250만 — 2023년 사용분부터,
 *       2026년 사용분부터 20세 이하 자녀등 1명 350만/275만·2명 이상 400만/300만 — 조특법 제126조의2제10항, 시행령 제121조의2제18항),
 *       주택청약종합저축 소득공제(총급여 7,000만원 이하 무주택 세대주·배우자, 납입 연 300만원 한도의 40% — 조특법 제87조제2항),
 *       산출세액(기본세율), 근로소득세액공제, 자녀세액공제(2025년 귀속~ 25·30·40만), 보장성보험료 12%(100만 한도), 의료비 15%(3% 초과분),
 *       교육비 15%, 월세 세액공제 17%/15%(총급여 5,500·8,000만 이하, 1,000만 한도), 연금계좌 15%/12%(900만 한도),
 *       기부금 15%(1,000만원 초과분 30% — 소득세법 제59조의4제4항, 소득금액 한도는 미반영), 표준세액공제 13만.
 * 미반영: 주택자금·고향사랑 기부금(조특법 제58조 별도 공제율)·전통시장/대중교통/문화체육 공제율과 추가한도·경로우대·장애인·한부모 등. 결과는 "예상"으로만 쓴다. */

import { basicTax } from './retire.mjs';

const floor10 = (n) => Math.floor((n + 1e-6) / 10) * 10;

export function earnedIncomeDeduction(g) {
  let d;
  if (g <= 5000000) d = g * 0.7;
  else if (g <= 15000000) d = 3500000 + (g - 5000000) * 0.4;
  else if (g <= 45000000) d = 7500000 + (g - 15000000) * 0.15;
  else if (g <= 100000000) d = 12000000 + (g - 45000000) * 0.05;
  else d = 14750000 + (g - 100000000) * 0.02;
  return Math.min(Math.round(d), 20000000);
}

export function earnedIncomeTaxCredit(calc, g) {
  const credit = calc <= 1300000 ? calc * 0.55 : 715000 + (calc - 1300000) * 0.3;
  let cap;
  if (g <= 33000000) cap = 740000;
  else if (g <= 70000000) cap = Math.max(660000, 740000 - (g - 33000000) * 0.008);
  else if (g <= 120000000) cap = Math.max(500000, 660000 - (g - 70000000) * 0.5);
  else cap = Math.max(200000, 500000 - (g - 120000000) * 0.5);
  return Math.round(Math.min(credit, cap));
}

/* 신용카드 등 소득공제 한도 — 조특법 제126조의2제10항: 총급여 7,000만원 이하 300만·초과 250만(2023년 사용분부터 1억 2천만원 초과 200만원 구간 폐지).
 * 2026년 사용분부터 20세 이하 기본공제대상 자녀·손자녀(시행령 제121조의2제18항)가 1명이면 350만/275만, 2명 이상이면 400만/300만 */
export function cardCap(g, kids = 0) {
  if (g <= 70000000) return kids >= 2 ? 4000000 : kids === 1 ? 3500000 : 3000000;
  return kids >= 2 ? 3000000 : kids === 1 ? 2750000 : 2500000;
}

/* 신용카드 등 소득공제 — 최저사용금액(총급여 25%)은 신용카드 사용분부터 차감. kids = 20세 이하 자녀 수(한도 상향용) */
export function cardDeduction(g, credit, check, kids = 0) {
  const th = g * 0.25;
  let ded;
  if (credit >= th) ded = (credit - th) * 0.15 + check * 0.3;
  else ded = Math.max(0, check - (th - credit)) * 0.3;
  return Math.round(Math.min(ded, cardCap(g, kids)));
}

/* 주택청약종합저축 소득공제 — 조특법 제87조제2항: 총급여 7,000만원 이하, 과세기간 중 무주택 세대의 세대주(또는 배우자), 납입액 연 300만원 한도의 40% */
export function housingSavingDeduction(g, paid, eligible) {
  if (!eligible || g > 70000000) return 0;
  return Math.round(Math.min(paid || 0, 3000000) * 0.4);
}

/* 기부금 세액공제 — 소득세법 제59조의4제4항: 15%, 1,000만원 초과분 30% (2024년 한정 3,000만원 초과 +10%는 끝남) */
export function donationCredit(d) {
  d = Math.max(0, d || 0);
  return Math.round(Math.min(d, 10000000) * 0.15 + Math.max(0, d - 10000000) * 0.3);
}

export function childCredit(children) {
  if (children <= 0) return 0;
  if (children === 1) return 250000;
  if (children === 2) return 550000;
  return 550000 + (children - 2) * 400000;
}

/* in: { gross(총급여, 비과세 제외), dependents(본인 포함), children(8~20세), pension·health·employment(연간 근로자 보험료),
 *       creditCard, checkCard, medical, insurance, education, rent, renter(boolean), pensionAccount, prepaid(연간 기납부 소득세, 지방세 제외),
 *       cardKids(20세 이하 자녀 수 — 카드 한도, 없으면 children), housingSaving(주택청약 납입액), homeless(무주택 세대주·배우자, 없으면 renter), donation(기부금) } */
export function yearEnd(i) {
  const g = i.gross;
  const income = g - earnedIncomeDeduction(g);
  const basic = 1500000 * Math.max(1, i.dependents || 1);
  const card = cardDeduction(g, i.creditCard || 0, i.checkCard || 0, i.cardKids ?? (i.children || 0));
  const housing = housingSavingDeduction(g, i.housingSaving || 0, i.homeless ?? i.renter);
  const special = (i.health || 0) + (i.employment || 0);
  const run = (useStandard) => {
    const base = Math.max(0, income - basic - (i.pension || 0) - (useStandard ? 0 : special) - card - housing);
    const calc = basicTax(base);
    const earned = earnedIncomeTaxCredit(calc, g);
    const child = childCredit(i.children || 0);
    const pa = Math.round(Math.min(i.pensionAccount || 0, 9000000) * (g <= 55000000 ? 0.15 : 0.12));
    const ins = Math.round(Math.min(i.insurance || 0, 1000000) * 0.12);
    const med = Math.round(Math.max(0, (i.medical || 0) - g * 0.03) * 0.15);
    const edu = Math.round((i.education || 0) * 0.15);
    const rent = (i.renter && g <= 80000000) ? Math.round(Math.min(i.rent || 0, 10000000) * (g <= 55000000 ? 0.17 : 0.15)) : 0;
    const don = donationCredit(i.donation);
    const itemized = ins + med + edu + rent + don;
    const credits = earned + child + pa + (useStandard ? 130000 : itemized);
    const determined = Math.max(0, calc - credits);
    return { base, calc, earned, child, pa, ins, med, edu, rent, don, itemized, standard: useStandard ? 130000 : 0, credits, determined };
  };
  const a = run(false), b = run(true);
  const r = a.determined <= b.determined ? a : b;
  const determined = Math.floor(r.determined);
  const local = floor10(determined * 0.1);
  const prepaid = i.prepaid || 0;
  const prepaidLocal = floor10(prepaid * 0.1);
  return { gross: g, income, basic, card, housing, special: r.standard ? 0 : special, ...r, determined, local, total: determined + local, prepaid, prepaidLocal, prepaidTotal: prepaid + prepaidLocal, refund: prepaid + prepaidLocal - determined - local, usedStandard: !!r.standard };
}
