/* 엔진 검증 — node tools/test.mjs
 * 대출·퇴직소득세는 공식이 확정적이라 정확한 값을, 간이세액은 앵커값(허용 오차)과 단조성을 본다. */
import * as L from '../engine/loan.mjs';
import * as R from '../engine/retire.mjs';
import { netPay, insurance, incomeTax, grossForNet } from '../engine/tax.mjs';
import { YEAR } from '../data/rates.mjs';

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

console.log(`test: ${pass} pass, ${fail} fail`);
if (fail) process.exit(1);
