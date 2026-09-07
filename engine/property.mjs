/* 주택 재산세 — 지방세법 §110(과세표준 = 공시가격 × 공정시장가액비율)·§111(세율)·§111의2(1세대 1주택 특례세율)·§112(도시지역분 0.14%)·지방교육세 20%
 * 공정시장가액비율: 주택 60%. 1세대 1주택 특례 43%(3억 이하)·44%(6억 이하)·45%(6억 초과) — 해마다 시행령으로 정함(2023~2025 적용).
 * 특례세율: 1세대 1주택 공시가격 9억원 이하는 구간별 0.05%p 낮음. 세부담상한(전년 대비 105~130%)·지역자원시설세는 반영하지 않음. */

export const FAIR_RATIO = 0.6;
export const oneHomeRatio = (price) => price <= 300000000 ? 0.43 : price <= 600000000 ? 0.44 : 0.45;
export const STD = [[60000000, 0.001, 0], [150000000, 0.0015, 60000], [300000000, 0.0025, 195000], [Infinity, 0.004, 570000]];
export const SPECIAL = [[60000000, 0.0005, 0], [150000000, 0.001, 30000], [300000000, 0.002, 120000], [Infinity, 0.0035, 420000]];
export const URBAN = 0.0014;
export const EDU = 0.2;
export const SPECIAL_LIMIT = 900000000;

export function progressive(base, table) {
  let prev = 0;
  for (const [lim, r, acc] of table) { if (base <= lim) return Math.floor(acc + (base - prev) * r); prev = lim; }
  return 0;
}

/* price: 공시가격 · o: { oneHome: 1세대 1주택(기본 true) } */
export function propertyTax(price, o = {}) {
  const oneHome = o.oneHome !== false;
  const ratio = oneHome ? oneHomeRatio(price) : FAIR_RATIO;
  const base = Math.floor(price * ratio);
  const special = oneHome && price <= SPECIAL_LIMIT;
  const tax = progressive(base, special ? SPECIAL : STD);
  const urban = Math.floor(base * URBAN);
  const educ = Math.floor(tax * EDU);
  const total = tax + urban + educ;
  const july = total <= 200000 ? total : Math.ceil(total / 2 / 10) * 10;   /* 20만원 이하는 7월 한 번에, 아니면 7월·9월 절반씩 */
  return { price, oneHome, ratio, base, special, tax, urban, educ, total, july, september: total - july, effective: price ? total / price : 0 };
}
