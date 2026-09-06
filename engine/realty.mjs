/* 부동산 — 중개보수(복비)와 주택 취득세
 * 복비: 공인중개사법 시행규칙 별표 1 (2021.10.19 개정, 주택). 요율은 '상한'이고 그 안에서 협의. 부가세 10% 별도(일반과세 중개사).
 * 취득세: 지방세법 §11 (주택 유상취득 1~3%, 6~9억 구간은 사잇값), §13의2 (다주택 중과 8%·12%), 지방교육세 §151, 농어촌특별세(85㎡ 초과). */

export const BROKER_SALE = [           /* 매매·교환: [거래금액 미만, 상한요율, 한도액] */
  [50000000, 0.006, 250000],
  [200000000, 0.005, 800000],
  [900000000, 0.004, null],
  [1200000000, 0.005, null],
  [1500000000, 0.006, null],
  [Infinity, 0.007, null],
];
export const BROKER_RENT = [           /* 임대차 */
  [50000000, 0.005, 200000],
  [100000000, 0.004, 300000],
  [600000000, 0.003, null],
  [1200000000, 0.004, null],
  [1500000000, 0.005, null],
  [Infinity, 0.006, null],
];
export const OFFICETEL = { sale: 0.005, rent: 0.004 };   /* 주거용 오피스텔(85㎡ 이하, 부엌·화장실 구비) */
export const OTHER_RATE = 0.009;                          /* 상가·토지·그 외: 0.9% 이내 협의 */
export const VAT = 0.1;

function pick(table, price) { for (const row of table) if (price < row[0]) return row; return table[table.length - 1]; }

/* 월세 거래금액 환산: 보증금 + 월세 × 100, 그 값이 5천만원 미만이면 보증금 + 월세 × 70 */
export function rentBase(deposit, monthly = 0) {
  const b = deposit + monthly * 100;
  return b < 50000000 ? deposit + monthly * 70 : b;
}

/* kind: 'sale' | 'rent' → { price, rate, cap, fee(상한 복비), vat, total } */
export function brokerage(price, kind = 'sale') {
  const [, rate, cap] = pick(kind === 'rent' ? BROKER_RENT : BROKER_SALE, price);
  let fee = Math.floor(price * rate);
  if (cap != null && fee > cap) fee = cap;
  const vat = Math.floor(fee * VAT);
  return { price, kind, rate, cap, fee, vat, total: fee + vat };
}

/* 1주택(또는 비조정 2주택) 표준세율: 6억 이하 1%, 6~9억 (가액 × 2/3억 − 3)% (소수점 넷째 자리까지), 9억 초과 3% */
export function homeRate(price) {
  if (price <= 600000000) return 0.01;
  if (price <= 900000000) return Math.round((price * 2 / 300000000 - 3) * 1e4) / 1e6;   /* 세율(%)을 소수점 넷째 자리까지 */
  return 0.03;
}

/* opts: { homes: 취득 후 보유 주택 수(1~), regulated: 조정대상지역, large: 전용 85㎡ 초과, firstHome: 생애최초 감면 } */
export function acquisitionTax(price, opts = {}) {
  const homes = opts.homes || 1, reg = !!opts.regulated, large = !!opts.large;
  let rate, heavy = 0;
  if (homes <= 1 || (homes === 2 && !reg)) rate = homeRate(price);
  else if (homes === 2 || (homes === 3 && !reg)) { rate = 0.08; heavy = 8; }
  else { rate = 0.12; heavy = 12; }
  const tax = Math.floor(price * rate);
  const educRate = heavy ? 0.004 : rate * 0.1;
  const ruralRate = !large ? 0 : heavy === 12 ? 0.01 : heavy === 8 ? 0.006 : 0.002;
  const educ = Math.floor(price * educRate);
  const rural = Math.floor(price * ruralRate);
  let cut = 0;
  if (opts.firstHome && !heavy && price <= 1200000000) cut = Math.min(tax, 2000000);
  const total = tax - cut + educ + rural;
  return { price, homes, regulated: reg, large, rate, heavy, tax, educRate, educ, ruralRate, rural, cut, total, totalRate: total / price };
}
