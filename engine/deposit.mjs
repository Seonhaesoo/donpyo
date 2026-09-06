/* 예금 이자 — 정기예금(거치식) 단리·월복리, 이자소득세 15.4%, 월 이자 지급식 */
import { INTEREST_TAX } from '../data/rates.mjs';

const floor10 = (n) => Math.floor((n + 1e-6) / 10) * 10;

export function deposit(P, months, r, opts = {}) {
  const interest = opts.compound
    ? Math.round(P * (Math.pow(1 + r / 12, months) - 1))
    : Math.round(P * r * months / 12);
  const tax = floor10(interest * INTEREST_TAX);
  const net = interest - tax;
  const monthlyGross = Math.round(P * r / 12);
  const monthlyNet = monthlyGross - floor10(monthlyGross * INTEREST_TAX);
  return { principal: P, months, rate: r, interest, tax, net, total: P + net, monthlyGross, monthlyNet, netRate: months ? net / P * 12 / months : 0 };
}

/* 세후 목표 이자를 받으려면 필요한 원금 */
export function principalForNet(net, months, r) {
  return Math.ceil(net / (1 - INTEREST_TAX) / (r * months / 12));
}
