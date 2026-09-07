/* 엔진 검증 — node tools/test.mjs
 * 대출·퇴직소득세는 공식이 확정적이라 정확한 값을, 간이세액은 앵커값(허용 오차)과 단조성을 본다. */
import * as L from '../engine/loan.mjs';
import * as R from '../engine/retire.mjs';
import { netPay, insurance, incomeTax, grossForNet } from '../engine/tax.mjs';
import { YEAR } from '../data/rates.mjs';
import * as YE from '../engine/yearend.mjs';
import * as GT from '../engine/gift.mjs';
import * as RE from '../engine/realty.mjs';
import * as DP from '../engine/deposit.mjs';
import * as IH from '../engine/inherit.mjs';
import * as IC from '../engine/income.mjs';
import * as PT from '../engine/property.mjs';
import * as CT from '../engine/cartax.mjs';
import * as LV from '../engine/ltv.mjs';

let pass = 0, fail = 0;
function ok(cond, name, detail = '') { if (cond) pass++; else { fail++; console.log('FAIL', name, detail); } }
const near = (a, b, tol) => Math.abs(a - b) <= tol;

/* 대출 */
ok(near(L.annuityPayment(200000000, 0.045, 360), 1013370, 5), '원리금균등 2억·30년·4.5%', L.annuityPayment(200000000, 0.045, 360));
ok(near(L.annuityPayment(100000000, 0.04, 120), 1012451, 5), '원리금균등 1억·10년·4%', L.annuityPayment(100000000, 0.04, 120));
{
  const s = L.summary(200000000, 0.045, 360);
  ok(s.rows.length === 360 && s.rows[359].balance === 0, '상환표 360회·잔액 0');
  ok(near(s.totalInterest, 164813200, 20000), '총 이자 2억·30년·4.5% ≈ 1.648억', s.totalInterest);
  const e = L.summary(200000000, 0.045, 360, 'equal');
  ok(near(e.totalInterest, 135375000, 20000), '원금균등 총 이자 ≈ 1.354억', e.totalInterest);
  ok(near(e.first, 1305556, 5), '원금균등 첫 달', e.first);
  const b = L.summary(200000000, 0.045, 360, 'bullet');
  ok(b.rows[0].payment === 750000 && b.rows[359].principal === 200000000, '만기일시');
  ok(near(L.loanForPayment(1013370, 0.045, 360), 200000000, 3000), '상환액→원금 역산', L.loanForPayment(1013370, 0.045, 360));
  const rf = L.refinance(200000000, 0.045, 0.035, 360);
  ok(rf.saving > 110000 && rf.saving < 120000, '갈아타기 절약액', rf.saving);
}
ok(L.annuityPayment(12000000, 0, 12) === 1000000, '무이자');

/* 퇴직소득세 */
{
  const t = R.severanceTax(30000000, 5);           /* 퇴직금 3천만·5년 */
  ok(t.serviceDeduction === 5000000, '근속연수공제 5년');
  ok(t.converted === 60000000, '환산급여', t.converted);
  ok(t.incomeTax > 0 && t.incomeTax < 1000000, '퇴직소득세 범위', t.incomeTax);
  const s = R.severance(3500000, 5);
  ok(near(s.amount, 17260274, 1000), '퇴직금 350만·5년 = 1일 평균임금 × 30 × 5 (≈ 월급 × 0.986 × 5)', s.amount);
  {
    const t1 = R.severanceTax(10000000, 1);      /* 1,000만·1년: 환산급여 1.08억 → 공제 6,530만 → 과세표준 4,270만 → 세액 428,750 */
    ok(near(t1.incomeTax, 428750, 10), '퇴직소득세 1,000만·1년', t1.incomeTax);
    ok(R.severanceTax(1000000, 1).incomeTax === 0, '근속연수공제 이하면 0');
  }
}

/* 4대보험 */
{
  const i = insurance(3500000, YEAR);
  ok(i.pension === 166250, '국민연금 4.75%', i.pension);
  ok(near(i.health, 125820, 20), '건강보험 3.595%', i.health);
  ok(near(i.care, Math.floor(i.health * 0.1314 / 10) * 10, 10), '장기요양 13.14%', i.care);
  ok(i.employment === 31500, '고용보험 0.9%');
  ok(insurance(10000000, YEAR).pension === Math.floor(6370000 * 0.0475 / 10) * 10, '국민연금 상한');
}

/* 간이세액 — 국세청 표 원본 값과 일치해야 하고, 표 밖 구간은 별표 2 계산식 */
{
  let prev = -1, mono = true;
  for (let m = 500000; m <= 30000000; m += 50000) { const t = incomeTax(m, 1).tax; if (t < prev) mono = false; prev = t; }
  ok(mono, '소득세 단조 증가');
  ok(incomeTax(760000, 1).tax === 0, '월 76만원 소득세 0');
  ok(incomeTax(3500000, 1).tax === 127220, '표 원본: 월 350만 1인 127,220', incomeTax(3500000, 1).tax);
  ok(incomeTax(3500000, 2).tax === 102220, '표 원본: 월 350만 2인 102,220', incomeTax(3500000, 2).tax);
  ok(incomeTax(3510000, 1).tax === 127220, '구간 내 동일 (3,500~3,520천원)');
  ok(incomeTax(9990000, 1).tax === 1503990, '표 마지막 구간', incomeTax(9990000, 1).tax);
  ok(incomeTax(10000000, 1).tax === 1507400, '정확히 1,000만원', incomeTax(10000000, 1).tax);
  ok(incomeTax(10100000, 1).tax === 1566700, '1,000만 초과 계산식', incomeTax(10100000, 1).tax);
  ok(incomeTax(3000000, 3).tax < incomeTax(3000000, 1).tax, '부양가족 많으면 세금 감소');
  ok(incomeTax(3500000, 1, 1).tax === 127220 - 12500, '자녀 1명 공제');
  ok(incomeTax(3500000, 1).local === 12720, '지방소득세 10% 절사');
}

/* 실수령·역산 */
{
  const n = netPay({ annual: 42000000, dependents: 1 });
  ok(n.gross === 3500000 && n.net > 2900000 && n.net < 3150000, '연봉 4,200 실수령 범위', n.net);
  const g = grossForNet(3000000, { dependents: 1 });
  ok(near(netPay({ monthly: g }).net, 3000000, 12000), '역산 300만', g);
  ok(netPay({ monthly: 3500000, nontax: 200000 }).net > n.net, '비과세 식대면 실수령 증가');
}

/* 실업급여 */
{
  const { dailyBenefit, benefitDays } = await import('../engine/unemploy.mjs');
  const a = dailyBenefit(3500000);
  ok(a.upper === 68100 && a.lower === 66048, '2026 상·하한액', `${a.upper}/${a.lower}`);
  ok(a.daily === 68100 && a.capped === 'upper', '월 350만 → 상한액', a.daily);
  ok(dailyBenefit(2000000).daily === 66048, '월 200만 → 하한액');
  ok(benefitDays(0.5) === 120 && benefitDays(3) === 180 && benefitDays(10) === 240 && benefitDays(10, true) === 270, '소정급여일수');
}

/* 연봉 순위 */
{
  const { rank, incomeAt, STAT } = await import('../engine/rank.mjs');
  ok(near(rank(STAT.median).top, 0.5, 0.002), '중위 = 상위 50%', rank(STAT.median).top);
  ok(near(rank(100000000).top, STAT.over100m, 0.004), '1억 초과 ≈ 6.7%', rank(100000000).top);
  ok(near(incomeAt(0.5), STAT.median, 20000), '상위 50% 경계 = 중위', incomeAt(0.5));
  ok(rank(30000000).top > rank(60000000).top, '단조');
}

/* 노동·프리랜서·최저임금 */
{
  const LB = await import('../engine/labor.mjs');
  const { MIN_WAGE_HISTORY, MONTH_HOURS } = await import('../data/rates.mjs');
  const f = LB.freelance(3000000);
  ok(f.tax === 90000 && f.local === 9000 && f.net === 2901000, '프리랜서 3.3%', f.net);
  ok(LB.ordinaryHourly(3500000) === 16746, '통상시급 350만 → 16,746', LB.ordinaryHourly(3500000));
  ok(LB.overtime(3500000).ext === Math.round(3500000 / 209 * 1.5), '연장 1.5배');
  ok(LB.leaveDays(0.5) === 6 && LB.leaveDays(1) === 15 && LB.leaveDays(3) === 16 && LB.leaveDays(21) === 25 && LB.leaveDays(30) === 25, '연차 발생 일수');
  ok(LB.leavePay(3500000, 5) === Math.round(3500000 / 209 * 8) * 5, '연차수당 5일');
  ok(MIN_WAGE_HISTORY[YEAR] * MONTH_HOURS === 2156880, '2026 최저임금 월급 2,156,880', MIN_WAGE_HISTORY[YEAR] * MONTH_HOURS);
  const s = LB.freelanceSettlement(36000000, 0.6, 1188000);   /* 월 300만 × 12, 경비율 60% */
  ok(s.base === 36000000 * 0.4 - 1500000 && s.due < 0, '종소세 정산 예시(환급)', s.due);
  ok(near(L.annuityPayment(30000000, 0.05, 60), 566137, 5), '자동차 할부 3천만·60개월·5%', L.annuityPayment(30000000, 0.05, 60));
}

/* 나이대 비교 */
{
  const AG = await import('../engine/age.mjs');
  const { AGE_INCOME } = await import('../data/age-income.mjs');
  for (const k of Object.keys(AGE_INCOME.dist)) { const s = AGE_INCOME.dist[k].reduce((a, b) => a + b, 0); ok(near(s, 100, 0.3), `분포 합계 100 (${k})`, s); }
  ok(near(AG.medianOf('all'), AGE_INCOME.overall.median, 250000), '구간 보간 중위 ≈ 공식 중위 288만', AG.medianOf('all'));
  ok(AG.ageRank(4690000, '40s').top < 0.5 && AG.ageRank(2710000, '20s').top < 0.6, '평균 월소득은 중위보다 위');
  ok(AG.ageRank(10000000, 'all').topPct === 4.3, '1,000만원 = 상위 4.3%', AG.ageRank(10000000, 'all').topPct);
  ok(AG.ageRank(0, 'all').top === 1, '0원 = 상위 100%');
}

/* 목돈 모으기 */
{
  const GO = await import('../engine/goal.mjs');
  ok(GO.monthsToGoal(100000000, 1000000, 0) === 100, '1억 ÷ 월 100만 = 100개월');
  const n = GO.monthsToGoal(100000000, 1000000, 0.03);
  ok(n > 85 && n < 92, '연 3%면 7년 남짓', n);
  ok(GO.monthsToGoal(100000000, 1000000, 0.03, 0.02) > n, '물가 반영하면 더 오래');
  ok(GO.fmtMonths(88) === '7년 4개월' && GO.fmtMonths(24) === '2년' && GO.fmtMonths(5) === '5개월', '기간 표기');
  ok(GO.balanceAfter(1000000, 12, 0) === 12000000, '이자 없는 잔액');
}

/* 연말정산 */
ok(YE.earnedIncomeDeduction(40000000) === 11250000, '근로소득공제 4,000만', YE.earnedIncomeDeduction(40000000));
ok(YE.earnedIncomeDeduction(200000000) === 16750000, '근로소득공제 2억 (한도 전)', YE.earnedIncomeDeduction(200000000));
ok(YE.earnedIncomeDeduction(500000000) === 20000000, '근로소득공제 한도 2,000만', YE.earnedIncomeDeduction(500000000));
ok(YE.cardDeduction(40000000, 20000000, 5000000) === 3000000, '카드공제 한도 300만', YE.cardDeduction(40000000, 20000000, 5000000));
ok(YE.cardDeduction(40000000, 5000000, 0) === 0, '카드공제 문턱 미달');
ok(YE.cardDeduction(40000000, 12000000, 2000000) === 900000, '카드공제 신용 200만×15% + 체크 200만×30%', YE.cardDeduction(40000000, 12000000, 2000000));
ok(YE.cardDeduction(40000000, 8000000, 4000000) === 600000, '카드공제 문턱을 체크카드로 넘김 (200만×30%)', YE.cardDeduction(40000000, 8000000, 4000000));
ok(YE.childCredit(1) === 250000 && YE.childCredit(2) === 550000 && YE.childCredit(3) === 950000, '자녀세액공제 25·55·95만');
ok(YE.earnedIncomeTaxCredit(2377500, 40000000) === 684000, '근로소득세액공제 한도 68.4만', YE.earnedIncomeTaxCredit(2377500, 40000000));
ok(YE.earnedIncomeTaxCredit(1000000, 30000000) === 550000, '근로소득세액공제 55%');
{
  const r = YE.yearEnd({ gross: 40000000, dependents: 1, creditCard: 20000000, checkCard: 5000000, prepaid: 0 });
  ok(r.income === 28750000 && r.card === 3000000 && r.base === 24250000, '연말정산 과세표준', JSON.stringify([r.income, r.card, r.base]));
  ok(r.calc === 2377500, '산출세액 2,377,500', r.calc);
  ok(r.usedStandard === true && r.determined === 1563500 && r.local === 156350, '표준세액공제 적용 결정세액', JSON.stringify([r.usedStandard, r.determined, r.local]));
  const q = YE.yearEnd({ gross: 50000000, dependents: 1, renter: true, rent: 12000000, pensionAccount: 9000000, medical: 3000000, prepaid: 2000000 });
  ok(q.rent === 1700000 && q.pa === 1350000 && q.med === 225000 && q.usedStandard === false, '월세 17%·연금계좌 15%·의료비 3% 초과 15%', JSON.stringify([q.rent, q.pa, q.med]));
  ok(q.refund === q.prepaidTotal - q.total, '환급 = 기납부 − 결정세액');
  const z = YE.yearEnd({ gross: 90000000, dependents: 1, renter: true, rent: 12000000, pensionAccount: 9000000 });
  ok(z.rent === 0 && z.pa === 1080000, '총급여 8천만 초과 월세 공제 없음 · 연금 12%', JSON.stringify([z.rent, z.pa]));
}

/* 증여세 */
ok(GT.giftTax(100000000, 'child').tax === 4850000, '자녀 1억 증여세 485만', GT.giftTax(100000000, 'child').tax);
ok(GT.giftTax(500000000, 'child').tax === 77600000, '자녀 5억 7,760만', GT.giftTax(500000000, 'child').tax);
ok(GT.giftTax(1000000000, 'spouse').tax === 67900000, '배우자 10억 6,790만', GT.giftTax(1000000000, 'spouse').tax);
ok(GT.giftTax(600000000, 'spouse').tax === 0, '배우자 6억 면세');
ok(GT.giftTax(100000000, 'minor').tax === 7760000, '미성년 1억 776만', GT.giftTax(100000000, 'minor').tax);
ok(GT.giftTax(100000000, 'grandchild').tax === 6305000, '손자녀 1억 세대생략 할증 630.5만', GT.giftTax(100000000, 'grandchild').tax);
ok(GT.giftTax(150000000, 'child', { marriage: true }).tax === 0, '혼인·출산 공제 1.5억 면세');
ok(GT.giftTax(100000000, 'child', { prior: 100000000 }).tax === 14550000, '10년 내 1억 합산 후 1억 추가', GT.giftTax(100000000, 'child', { prior: 100000000 }).tax);
ok(GT.giftTax(100000000, 'other').tax === 9700000, '타인 1억 970만');
ok(GT.giftTax(5000000000, 'child').tax === 1954550000, '50억 50% 구간', GT.giftTax(5000000000, 'child').tax);
ok(GT.giftTax(50400000, 'child').tax === 0, '과세표준 50만 미만 면제');
ok(GT.freeLimit('child', true) === 150000000 && GT.freeLimit('spouse', true) === 600000000, '무세 한도');

/* 복비·취득세 */
ok(RE.brokerage(30000000).fee === 180000 && RE.brokerage(45000000).fee === 250000, '매매 5천만 미만 0.6% · 한도 25만');
ok(RE.brokerage(500000000).fee === 2000000 && RE.brokerage(950000000).fee === 4750000 && RE.brokerage(2000000000).fee === 14000000, '매매 0.4 · 0.5 · 0.7%');
ok(RE.brokerage(200000000, 'rent').fee === 600000 && RE.brokerage(80000000, 'rent').fee === 300000, '임대차 0.3% · 한도 30만');
ok(RE.brokerage(500000000).total === 2200000, '부가세 10% 포함');
ok(RE.rentBase(10000000, 500000) === 60000000 && RE.rentBase(20000000, 200000) === 34000000, '월세 환산 ×100 / 5천만 미만 ×70');
ok(RE.acquisitionTax(500000000).total === 5500000, '5억 1주택 취득세+교육세 550만', RE.acquisitionTax(500000000).total);
ok(RE.acquisitionTax(700000000).tax === 11666900 && RE.acquisitionTax(700000000).rate === 0.016667, '7억 사잇값 1.6667%', RE.acquisitionTax(700000000).tax);
ok(RE.acquisitionTax(750000000).rate === 0.02 && RE.acquisitionTax(900000000).rate === 0.03, '7.5억 2% · 9억 3%');
ok(RE.acquisitionTax(1000000000, { large: true }).total === 35000000, '10억 85㎡ 초과 3.5%', RE.acquisitionTax(1000000000, { large: true }).total);
ok(RE.acquisitionTax(500000000, { firstHome: true }).total === 3500000, '생애최초 200만 감면');
ok(RE.acquisitionTax(800000000, { homes: 2, regulated: true, large: true }).total === 72000000, '조정대상지역 2주택 9.0%');
ok(RE.acquisitionTax(800000000, { homes: 3, regulated: true }).total === 99200000, '3주택 12.4%');
ok(RE.acquisitionTax(800000000, { homes: 2 }).rate === RE.homeRate(800000000), '비조정 2주택은 표준세율');

/* 예금 */
{
  const d = DP.deposit(100000000, 12, 0.03);
  ok(d.interest === 3000000 && d.tax === 462000 && d.net === 2538000 && d.monthlyNet === 211500, '1억 1년 3% 세후 253.8만 · 월 21.15만', JSON.stringify(d));
  ok(DP.deposit(10000000, 6, 0.04).interest === 200000, '1천만 6개월 4% 세전 20만');
  ok(DP.deposit(100000000, 12, 0.03, { compound: true }).interest === 3041596, '월복리 1억 1년 3%', DP.deposit(100000000, 12, 0.03, { compound: true }).interest);
  ok(DP.deposit(DP.principalForNet(1000000, 12, 0.03), 12, 0.03).net >= 1000000, '세후 100만 받는 원금 역산');
}

/* 상속세 */
ok(IH.inheritTax(1000000000, { spouse: false, children: 1 }).tax === 87300000, '10억 자녀 1명 — 일괄공제 5억, 8,730만', IH.inheritTax(1000000000, { spouse: false, children: 1 }).tax);
ok(IH.inheritTax(1000000000, { spouse: true, children: 1 }).tax === 0, '10억 배우자+자녀 1 — 배우자공제 6억 + 일괄 5억 = 면세');
{
  const r = IH.inheritTax(2000000000, { spouse: true, children: 2 });
  ok(r.spouseDed === Math.floor(2000000000 * 1.5 / 3.5) && r.base === 2000000000 - 500000000 - r.spouseDed, '20억 배우자+자녀 2 — 배우자 법정지분 3/7', JSON.stringify([r.spouseDed, r.base]));
  ok(r.calc === Math.floor(r.base * 0.3 - 60000000) && r.tax === r.calc - Math.floor(r.calc * 0.03), '과표 6.4억 → 30% 구간 · 신고공제 3%', r.tax);
  const s = IH.inheritTax(5000000000, { spouse: true, children: 1 });
  ok(s.spouseDed === 3000000000, '배우자공제 상한 30억');
  const f = IH.inheritTax(1000000000, { spouse: false, children: 1, financial: 300000000 });
  ok(f.fin === 60000000 && f.tax < 87300000, '금융재산공제 20%');
  ok(IH.inheritTax(1000000000, { spouse: false, children: 7 }).lump === 550000000, '자녀 7명이면 기초+인적 5.5억 > 일괄 5억');
  ok(IH.freeEstate('child1') === 500000000 && IH.freeEstate('spouse1') === 1250000000 && IH.freeEstate('spouse2') === 1000000000, '면세 한도 5억 / 12.5억(법정지분) / 10억', JSON.stringify([IH.freeEstate('child1'), IH.freeEstate('spouse1'), IH.freeEstate('spouse2')]));
  ok(IH.inheritTax(1250000000, { spouse: true, children: 1 }).tax === 0 && IH.inheritTax(1260000000, { spouse: true, children: 1 }).tax > 0, '12.5억 경계');
}

/* 종합소득세 */
{
  const t = IC.incomeTax(31500000);
  ok(t.base === 30000000 && t.calc === 3240000 && t.tax === 3170000 && t.local === 317000, '소득 3,150만 → 과표 3,000만 → 324만 − 표준 7만', JSON.stringify(t));
  ok(IC.incomeTax(1000000).tax === 0, '기본공제 이하 0');
  const s = IC.settle(60000000, 0.6);
  ok(s.income === 24000000 && s.prepaid === 1980000 && s.refund === s.prepaid - s.total, '수입 6,000만·경비 60% 정산', JSON.stringify(s));
}

/* 재산세 */
{
  const p = PT.propertyTax(500000000);
  ok(p.base === 220000000 && p.tax === 260000 && p.urban === 308000 && p.educ === 52000 && p.total === 620000, '공시 5억 1주택 — 44% · 특례세율 · 62만', JSON.stringify(p));
  const q = PT.propertyTax(500000000, { oneHome: false });
  ok(q.base === 300000000 && q.tax === 570000 && q.total === 1104000, '공시 5억 다주택 — 60% · 표준세율 · 110.4만', JSON.stringify(q));
  ok(PT.propertyTax(1000000000).special === false && PT.propertyTax(900000000).special === true, '특례세율은 9억 이하');
  ok(p.july + p.september === p.total && PT.propertyTax(100000000).september === 0, '7·9월 분납 / 20만 이하 7월 일괄');
}

/* 자동차세 */
ok(CT.carTax(1598).total === 290836 && CT.carTax(1598).tax === 223720, '1,598cc 신차 29만 836원', CT.carTax(1598).total);
ok(CT.carTax(1999).total === 519740, '1,999cc 51만 9,740원', CT.carTax(1999).total);
ok(CT.carTax(998).tax === 79840 && CT.carTax(1000).unit === 80 && CT.carTax(1001).unit === 140, 'cc 구간 경계');
ok(CT.carTax(1598, { age: 5 }).discount === 0.15 && CT.carTax(1598, { age: 12 }).discount === 0.5 && CT.carTax(1598, { age: 20 }).discount === 0.5, '차령 경감 5년차 15% · 12년차 이상 50%');
ok(CT.carTax(0, { ev: true }).total === 130000, '전기차 13만');
ok(CT.carTax(1598, { year: 2026 }).prepay === Math.floor(290836 * 0.03 * 11 / 12), '2026년 연납 3% × 11/12');

/* LTV */
ok(LV.ltvLimit(1000000000, 'regulated').limit === 400000000, '10억 규제지역 40%');
ok(LV.ltvLimit(2000000000, 'regulated').limit === 400000000 && LV.ltvLimit(2000000000, 'regulated').capped, '20억 규제지역 — 4억 한도');
ok(LV.ltvLimit(3000000000, 'regulated').limit === 200000000, '30억 규제지역 — 2억 한도');
ok(LV.ltvLimit(1000000000, 'metro').limit === 600000000, '10억 수도권 비규제 — 70%지만 6억 한도');
ok(LV.ltvLimit(500000000, 'other', { firstHome: true }).limit === 400000000, '5억 지방 생애최초 80%');
ok(LV.ltvLimit(1000000000, 'regulated', { firstHome: true }).limit === 600000000, '10억 규제지역 생애최초 70% → 6억 한도');

/* 브라우저 엔진 묶음 = 서버 엔진 (같은 소스에서 생성되는지 확인) */
{
  const vm = await import('node:vm');
  const { makeBundle } = await import('./bundle.mjs');
  const ctx = { window: {} };
  vm.runInNewContext(makeBundle(200000), ctx);
  const B = ctx.window.Donpyo;
  ok(typeof B.netPay === 'function' && typeof B.annuityPayment === 'function' && typeof B.rank === 'function', '번들 함수 존재');
  let same = true;
  for (const a of [24000000, 42000000, 60000000, 130000000]) for (const d of [1, 3]) {
    if (B.netPay({ annual: a, dependents: d, nontax: 200000 }).net !== netPay({ annual: a, dependents: d, nontax: 200000 }).net) same = false;
  }
  ok(same, '번들 netPay = 서버 netPay');
  ok(B.annuityPayment(200000000, 0.045, 360) === L.annuityPayment(200000000, 0.045, 360), '번들 annuityPayment');
  ok(B.dsrLimit(50000000, 0.045, 360).principal === L.dsrLimit(50000000, 0.045, 360).principal, '번들 dsrLimit');
  ok(B.manwon(42000000) === '4,200만원', '번들 fmt');
  ok(B.yearEnd({ gross: 40000000, dependents: 1, creditCard: 20000000, checkCard: 5000000 }).determined === YE.yearEnd({ gross: 40000000, dependents: 1, creditCard: 20000000, checkCard: 5000000 }).determined, '번들 yearEnd = 서버 yearEnd');
  ok(B.severance(3500000, 5).amount === R.severance(3500000, 5).amount, '번들 severance');
}

console.log(`test: ${pass} pass, ${fail} fail`);
if (fail) process.exit(1);
