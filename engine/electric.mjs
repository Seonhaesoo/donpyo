/* 전기요금 — 한국전력 주택용 전기요금표 (2025년, 2023.5.16 개정 요금 유지)
 * 저압: 기본요금 910 / 1,600 / 7,300원, 전력량요금 120.0 / 214.6 / 307.3원/kWh, 슈퍼유저(하계·동계 1,000kWh 초과분) 736.2원/kWh
 * 고압: 기본요금 730 / 1,260 / 6,060원, 전력량요금 105.0 / 174.0 / 242.3원/kWh, 슈퍼유저 601.3원/kWh
 * 구간: 기타계절(1~6월·9~12월) 200 / 400kWh, 하계(7~8월) 300 / 450kWh. 기후환경요금 9.0원/kWh, 연료비조정요금 +5.0원/kWh.
 * 청구액 = 전기요금계 + 부가가치세 10%(반올림) + 전력산업기반기금 2.7%(2025.7.1~, 10원 미만 절사), 합계 10원 미만 절사.
 * 미반영: 필수사용량 보장공제(2024년 폐지), 복지할인·대가족할인·출산가구할인, TV수신료 2,500원(2023.7부터 분리 고지). */

export const ELECTRIC_ASOF = '2025년';
export const PLANS = {
  low: { label: '주택용 저압', short: '저압', base: [910, 1600, 7300], energy: [120.0, 214.6, 307.3], superUser: 736.2 },
  high: { label: '주택용 고압', short: '고압', base: [730, 1260, 6060], energy: [105.0, 174.0, 242.3], superUser: 601.3 },
};
export const SEASONS = {
  other: { label: '기타계절 (1~6월 · 9~12월)', short: '기타계절', limits: [200, 400], superUser: false },
  summer: { label: '하계 (7~8월)', short: '여름', limits: [300, 450], superUser: true },
  winter: { label: '동계 (12~2월)', short: '겨울', limits: [200, 400], superUser: true },
};
export const CLIMATE = 9.0;        /* 기후환경요금 원/kWh */
export const FUEL = 5.0;           /* 연료비조정요금 원/kWh (상한 +5원) */
export const VAT = 0.1;
export const FUND = 0.027;         /* 전력산업기반기금 */
export const SUPER_FROM = 1000;    /* 슈퍼유저 구간 시작 kWh */
export const TV_FEE = 2500;

const floor10 = (n) => Math.floor(n / 10) * 10;

/* kwh: 월 사용량 · o: { season: other | summer | winter, voltage: low | high } */
export function electricBill(kwh, o = {}) {
  const P = PLANS[o.voltage] || PLANS.low;
  const S = SEASONS[o.season] || SEASONS.other;
  const k = Math.max(0, Math.round(kwh || 0));
  const [l1, l2] = S.limits;
  const superKwh = S.superUser && k > SUPER_FROM ? k - SUPER_FROM : 0;
  const body = k - superKwh;
  const t1 = Math.min(body, l1), t2 = Math.min(Math.max(body - l1, 0), l2 - l1), t3 = Math.max(body - l2, 0);
  const tier = k <= l1 ? 1 : k <= l2 ? 2 : 3;
  const rows = [
    { tier: 1, label: `1단계 (0~${l1}kWh)`, kwh: t1, rate: P.energy[0], amount: Math.round(t1 * P.energy[0]) },
    { tier: 2, label: `2단계 (${l1 + 1}~${l2}kWh)`, kwh: t2, rate: P.energy[1], amount: Math.round(t2 * P.energy[1]) },
    { tier: 3, label: `3단계 (${l2 + 1}kWh~${S.superUser ? `${SUPER_FROM}kWh` : ''})`, kwh: t3, rate: P.energy[2], amount: Math.round(t3 * P.energy[2]) },
  ];
  if (superKwh) rows.push({ tier: 4, label: `슈퍼유저 (${SUPER_FROM}kWh 초과)`, kwh: superKwh, rate: P.superUser, amount: Math.round(superKwh * P.superUser) });
  const base = P.base[tier - 1];
  const energy = rows.reduce((a, r) => a + r.amount, 0);
  const climate = Math.round(k * CLIMATE);
  const fuel = Math.round(k * FUEL);
  const subtotal = base + energy + climate + fuel;
  const vat = Math.round(subtotal * VAT);
  const fund = floor10(subtotal * FUND);
  const total = floor10(subtotal + vat + fund);
  return { kwh: k, season: o.season || 'other', voltage: o.voltage || 'low', tier, superUser: superKwh > 0, limits: S.limits, base, rows: rows.filter((r) => r.kwh > 0), energy, climate, fuel, subtotal, vat, fund, total, perKwh: k ? Math.round(total / k) : 0, marginal: superKwh ? P.superUser : P.energy[tier - 1] };
}

/* 사용량이 1kWh 늘 때 청구액이 얼마나 느는지 (구간 세율 + 기후·연료 + 부가세·기금 어림) */
export const marginalPerKwh = (kwh, o = {}) => electricBill(kwh + 1, o).total - electricBill(kwh, o).total;
