/* 주택분 종합부동산세 — 종합부동산세법 §8(과세표준)·§9(세율·재산세 공제·1세대 1주택 세액공제)·§10(세부담상한)·농어촌특별세법 §5
 * 2026년 귀속(과세기준일 6월 1일, 12월 1~15일 납부): 공제 1세대 1주택 12억·그 밖의 개인 9억·법인 0원,
 * 공정시장가액비율 60%(시행령 §2의4), 세율 2주택 이하 0.5~2.7%·3주택 이상은 과세표준 12억 초과분부터 2.0~5.0%, 법인 2.7%·5.0% 단일.
 * 재산세 공제(시행령 §4의3) = 종부세 과세표준 × 재산세 공정시장가액비율(1세대 1주택 43~45%·그 밖 60%) × 0.4% — 재산세가 표준세율대로 부과됐다고 봄.
 * 세액공제(1세대 1주택): 만 60세 20%·65세 30%·70세 40% + 보유 5년 20%·10년 40%·15년 50%, 합계 80% 한도. 농어촌특별세 20%.
 * 재정경제부 2026 세제개편안 문답자료의 현행 기준 사례(공시 15·20·35·50억, 30억·80%)와 원 단위까지 같다(tools/test.mjs).
 * 세부담상한(전년 보유세의 150%)·합산배제·부부 공동명의 1주택 특례·재산세 세부담상한은 반영하지 않는다.
 * 부동소수 오차를 피하려고 세율은 만분율(bp), 비율은 정수 퍼센트로 계산한다. */
import { oneHomeRatio, FAIR_RATIO } from './property.mjs';

export const JB_ASOF = 2026;
export const JB_DEDUCT = { one: 1200000000, multi: 900000000, corp: 0 };
export const JB_FAIR_PCT = 60;
/* [과세표준 상한, 세율(bp), 누진공제] — 세액 = 과세표준 × 세율 − 누진공제 */
export const JB_TWO = [[300000000, 50, 0], [600000000, 70, 600000], [1200000000, 100, 2400000], [2500000000, 130, 6000000], [5000000000, 150, 11000000], [9400000000, 200, 36000000], [Infinity, 270, 101800000]];
export const JB_THREE = [[300000000, 50, 0], [600000000, 70, 600000], [1200000000, 100, 2400000], [2500000000, 200, 14400000], [5000000000, 300, 39400000], [9400000000, 400, 89400000], [Infinity, 500, 183400000]];
export const JB_CORP_BP = { two: 270, three: 500 };
export const RURAL_PCT = 20;
export const AGE_CREDIT = [[70, 40], [65, 30], [60, 20]];
export const HOLD_CREDIT = [[15, 50], [10, 40], [5, 20]];
export const CREDIT_MAX = 80;
export const INSTALL_MIN = 2500000;

const byTable = (base, table) => { for (const [lim, bp, d] of table) if (base <= lim) return Math.max(0, Math.floor(base * bp / 10000) - d); return 0; };
const pick = (list, v) => { for (const [min, p] of list) if (v >= min) return p; return 0; };

/* price: 공시가격 합계(사람별) · o: { type: 'one' 1세대 1주택 | 'multi' 그 밖의 개인 | 'corp' 법인, three: 3주택 이상, age: 만 나이, years: 보유 연수 } */
export function jongbu(price, o = {}) {
  const type = o.type === 'multi' || o.type === 'corp' ? o.type : 'one';
  const three = type !== 'one' && !!o.three;
  const deduct = JB_DEDUCT[type];
  const base = Math.max(0, Math.floor((price - deduct) * JB_FAIR_PCT / 100));
  const calc = type === 'corp' ? Math.floor(base * (three ? JB_CORP_BP.three : JB_CORP_BP.two) / 10000) : byTable(base, three ? JB_THREE : JB_TWO);
  const propPct = type === 'one' ? Math.round(oneHomeRatio(price) * 100) : Math.round(FAIR_RATIO * 100);
  const propDeduct = Math.min(calc, Math.floor(base * propPct * 4 / 100000));
  const afterProp = calc - propDeduct;
  const agePct = type === 'one' ? pick(AGE_CREDIT, o.age || 0) : 0;
  const holdPct = type === 'one' ? pick(HOLD_CREDIT, o.years || 0) : 0;
  const creditPct = Math.min(CREDIT_MAX, agePct + holdPct);
  const credit = Math.floor(afterProp * creditPct / 100);
  const tax = afterProp - credit;
  const rural = Math.floor(tax * RURAL_PCT / 100);
  const total = tax + rural;
  /* 분납: 종부세 250만원 초과면 납부기한 뒤 6개월 안에 — 500만원 이하는 250만원 초과분, 넘으면 절반까지(농특세도 같은 비율) */
  const installment = tax > INSTALL_MIN ? (tax <= 5000000 ? tax - INSTALL_MIN : Math.floor(tax / 2)) : 0;
  return { price, type, three, deduct, base, calc, propPct, propDeduct, afterProp, agePct, holdPct, creditPct, credit, tax, rural, total, installment, effective: price ? total / price : 0 };
}
