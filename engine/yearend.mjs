/* 연말정산 미리보기 — 총급여와 주요 공제 몇 가지로 결정세액을 추정해 기납부(간이세액)와 비교한다.
 * 반영: 근로소득공제, 기본공제, 국민연금·건강·고용보험료 소득공제, 신용카드 소득공제(25% 초과분 15%/30%, 한도 300·250·200만),
 *       산출세액(기본세율), 근로소득세액공제, 자녀세액공제(2025년 귀속~ 25·30·40만), 보장성보험료 12%(100만 한도), 의료비 15%(3% 초과분),
 *       교육비 15%, 월세 세액공제 17%/15%(총급여 5,500·8,000만 이하, 1,000만 한도), 연금계좌 15%/12%(900만 한도), 표준세액공제 13만.
 * 미반영: 주택청약·주택자금·기부금·전통시장/대중교통 추가한도·경로우대·장애인·한부모 등. 결과는 "예상"으로만 쓴다. */

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

/* 신용카드 등 소득공제 — 최저사용금액(총급여 25%)은 신용카드 사용분부터 차감 */
export function cardDeduction(g, credit, check) {
  const th = g * 0.25;
  let ded;
  if (credit >= th) ded = (credit - th) * 0.15 + check * 0.3;
  else ded = Math.max(0, check - (th - credit)) * 0.3;
  const cap = g <= 70000000 ? 3000000 : g <= 120000000 ? 2500000 : 2000000;
  return Math.round(Math.min(ded, cap));
}

export function childCredit(children) {
  if (children <= 0) return 0;
  if (children === 1) return 250000;
  if (children === 2) return 550000;
  return 550000 + (children - 2) * 400000;
}

/* in: { gross(총급여, 비과세 제외), dependents(본인 포함), children(8~20세), pension·health·employment(연간 근로자 보험료),
 *       creditCard, checkCard, medical, insurance, education, rent, renter(boolean), pensionAccount, prepaid(연간 기납부 소득세, 지방세 제외) } */
export function yearEnd(i) {
  const g = i.gross;
  const income = g - earnedIncomeDeduction(g);
  const basic = 1500000 * Math.max(1, i.dependents || 1);
  const card = cardDeduction(g, i.creditCard || 0, i.checkCard || 0);
  const special = (i.health || 0) + (i.employment || 0);
  const run = (useStandard) => {
    const base = Math.max(0, income - basic - (i.pension || 0) - (useStandard ? 0 : special) - card);
    const calc = basicTax(base);
    const earned = earnedIncomeTaxCredit(calc, g);
    const child = childCredit(i.children || 0);
    const pa = Math.round(Math.min(i.pensionAccount || 0, 9000000) * (g <= 55000000 ? 0.15 : 0.12));
    const ins = Math.round(Math.min(i.insurance || 0, 1000000) * 0.12);
    const med = Math.round(Math.max(0, (i.medical || 0) - g * 0.03) * 0.15);
    const edu = Math.round((i.education || 0) * 0.15);
    const rent = (i.renter && g <= 80000000) ? Math.round(Math.min(i.rent || 0, 10000000) * (g <= 55000000 ? 0.17 : 0.15)) : 0;
    const itemized = ins + med + edu + rent;
    const credits = earned + child + pa + (useStandard ? 130000 : itemized);
    const determined = Math.max(0, calc - credits);
    return { base, calc, earned, child, pa, ins, med, edu, rent, itemized, standard: useStandard ? 130000 : 0, credits, determined };
  };
  const a = run(false), b = run(true);
  const r = a.determined <= b.determined ? a : b;
  const determined = Math.floor(r.determined);
  const local = floor10(determined * 0.1);
  const prepaid = i.prepaid || 0;
  const prepaidLocal = floor10(prepaid * 0.1);
  return { gross: g, income, basic, card, special: r.standard ? 0 : special, ...r, determined, local, total: determined + local, prepaid, prepaidLocal, prepaidTotal: prepaid + prepaidLocal, refund: prepaid + prepaidLocal - determined - local, usedStandard: !!r.standard };
}
