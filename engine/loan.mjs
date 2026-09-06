/* 대출 계산 — 원리금균등 / 원금균등 / 만기일시, 상환표, 갈아타기, 상환액→대출액 역산
 * 금리는 연이율(0.045), 기간은 개월. 이자는 매달 잔액 × 월이율(연이율/12), 원 단위 반올림. */

export function annuityPayment(P, annual, n) {
  const r = annual / 12;
  if (r === 0) return Math.round(P / n);
  const f = Math.pow(1 + r, n);
  return Math.round(P * r * f / (f - 1));
}

/* mode: 'annuity'(원리금균등) | 'equal'(원금균등) | 'bullet'(만기일시) */
export function schedule(P, annual, n, mode = 'annuity') {
  const r = annual / 12;
  const rows = [];
  let bal = P;
  const pay = mode === 'annuity' ? annuityPayment(P, annual, n) : 0;
  const princEq = mode === 'equal' ? Math.round(P / n) : 0;
  for (let k = 1; k <= n; k++) {
    const interest = Math.round(bal * r);
    let principal;
    if (k === n) principal = bal;
    else if (mode === 'annuity') principal = pay - interest;
    else if (mode === 'equal') principal = princEq;
    else principal = 0;
    bal -= principal;
    rows.push({ n: k, principal, interest, payment: principal + interest, balance: bal });
  }
  return rows;
}

export function summary(P, annual, n, mode = 'annuity') {
  const rows = schedule(P, annual, n, mode);
  const totalInterest = rows.reduce((s, r) => s + r.interest, 0);
  return { rows, totalInterest, totalPayment: P + totalInterest, first: rows[0].payment, last: rows[n - 1].payment, monthly: mode === 'annuity' ? rows[0].payment : null };
}

/* k회 납입 후 남은 원금 */
export function balanceAfter(rows, k) {
  if (k <= 0) return rows[0].balance + rows[0].principal;
  return rows[Math.min(k, rows.length) - 1].balance;
}

/* 월 상환액으로 받을 수 있는 원리금균등 대출 원금 */
export function loanForPayment(payment, annual, n) {
  const r = annual / 12;
  if (r === 0) return Math.round(payment * n);
  const f = Math.pow(1 + r, n);
  return Math.round(payment * (f - 1) / (r * f));
}

/* DSR 한도 — 연소득 × dsr 이 연간 원리금 상환액 상한. 다른 대출이 없다는 가정 */
export function dsrLimit(annualIncome, annual, n, dsr = 0.4) {
  const monthlyCap = Math.floor(annualIncome * dsr / 12);
  return { monthlyCap, principal: loanForPayment(monthlyCap, annual, n) };
}

/* 갈아타기 — 같은 원금·기간에서 금리만 바뀔 때. feeRate 는 중도상환수수료율(잔여기간 무시한 단순 상한) */
export function refinance(P, rateOld, rateNew, n, feeRate = 0.006) {
  const oldPay = annuityPayment(P, rateOld, n), newPay = annuityPayment(P, rateNew, n);
  const saving = oldPay - newPay;
  const fee = Math.round(P * feeRate);
  return { oldPay, newPay, saving, fee, breakEvenMonths: saving > 0 ? Math.ceil(fee / saving) : null, totalSaving: saving * n - fee };
}

/* 매달 extra 원을 더 갚을 때 단축되는 기간과 절약 이자 (원리금균등) */
export function extraPayment(P, annual, n, extra) {
  const r = annual / 12;
  const pay = annuityPayment(P, annual, n) + extra;
  let bal = P, k = 0, interest = 0;
  while (bal > 0 && k < n) {
    const i = Math.round(bal * r);
    interest += i;
    bal -= Math.min(bal, pay - i);
    k++;
  }
  const base = summary(P, annual, n).totalInterest;
  return { months: k, monthsSaved: n - k, interestSaved: base - interest };
}
