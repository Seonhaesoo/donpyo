/* LTV(주택담보대출비율) 한도 — 2025년 6·27 대책(수도권·규제지역 주담대 6억원 한도, 생애최초 LTV 70%)과 10·15 대책(서울 전역·경기 12곳 규제지역 지정, LTV 40%, 15억 초과 4억·25억 초과 2억 한도) 기준
 * 실제 한도는 LTV·DSR·은행 심사 중 가장 작은 값이며, 방공제(소액임차보증금)와 기존 대출에 따라 더 줄어든다. 규제는 자주 바뀌므로 asOf 를 함께 표시한다. */

export const LTV_ASOF = '2025년 10월 15일 대책';

export const REGIONS = {
  regulated: { label: '규제지역 (서울 전역 · 경기 12곳)', short: '규제지역', ltv: 0.4, first: 0.7, caps: [[1500000000, 600000000], [2500000000, 400000000], [Infinity, 200000000]] },
  metro: { label: '수도권 비규제지역', short: '수도권 비규제', ltv: 0.7, first: 0.8, caps: [[Infinity, 600000000]] },
  other: { label: '지방 (수도권 외)', short: '지방', ltv: 0.7, first: 0.8, caps: [] },
};

/* price: 집값(시세) · region: REGIONS 키 · o: { firstHome: 생애최초 } */
export function ltvLimit(price, region = 'regulated', o = {}) {
  const R = REGIONS[region] || REGIONS.regulated;
  const ratio = o.firstHome ? R.first : R.ltv;
  const raw = Math.floor(price * ratio);
  const row = R.caps.find(([lim]) => price <= lim);
  const cap = row ? row[1] : null;
  const limit = cap == null ? raw : Math.min(raw, cap);
  return { price, region, ratio, raw, cap, limit, capped: cap != null && raw > cap, cash: price - limit };
}
