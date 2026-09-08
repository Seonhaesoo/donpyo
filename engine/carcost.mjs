/* 자동차 유지비 어림 — 유류비 + 자동차세(engine/cartax.mjs) + 보험료 + 정비·소모품 + 주차·통행료 + 감가상각 (월·연)
 * 유류비 = 연 주행거리 ÷ 연비 × 연료 단가. 자동차세는 지방세법 §127(배기량)·§130(차령 경감), 전기·수소차는 정액 13만원(교육세 포함).
 * 감가상각(단순 정액 어림): 차량가 × 첫해 20%, 2~3년차 15%, 4년차부터 10%.
 * 기본 단가(2025년 하반기 전국 평균 어림): 휘발유 1,650원/L, 경유 1,550원/L, LPG 1,000원/L, 전기 350원/kWh(공용 충전 평균).
 * 기본값: 연 15,000km, 보험료 연 80만원, 정비·소모품 연 50만원, 주차·통행료 월 5만원, 배기량 1,999cc. 취득세·공채·검사비·세차·과태료는 미반영. */
import { carTax } from './cartax.mjs';

export const CARCOST_ASOF = '2025년';
export const FUELS = {
  gasoline: { key: 'gasoline', label: '휘발유', unit: 'L', price: 1650, eff: 12, effUnit: 'km/L' },
  diesel: { key: 'diesel', label: '경유', unit: 'L', price: 1550, eff: 14, effUnit: 'km/L' },
  lpg: { key: 'lpg', label: 'LPG', unit: 'L', price: 1000, eff: 9, effUnit: 'km/L' },
  ev: { key: 'ev', label: '전기', unit: 'kWh', price: 350, eff: 5, effUnit: 'km/kWh' },
};
export const DEFAULTS = { km: 15000, insurance: 800000, maintenance: 500000, parking: 50000, cc: 1999, age: 1 };
export const DEP_RATES = [[1, 0.2], [3, 0.15], [Infinity, 0.1]];

export const depreciationRate = (age) => DEP_RATES.find(([lim]) => age <= lim)[1];

/* { price: 차량가(원), age: 구입 후 몇 년째(1~), fuel, efficiency, km: 연 주행거리, fuelPrice, cc, insurance(연), maintenance(연), parking(월), year } */
export function carCost(i = {}) {
  const price = Math.max(0, i.price || 0);
  const age = Math.max(1, Math.floor(i.age || DEFAULTS.age));
  const fuel = FUELS[i.fuel] ? i.fuel : 'gasoline';
  const F = FUELS[fuel];
  const eff = i.efficiency > 0 ? i.efficiency : F.eff;
  const km = i.km == null ? DEFAULTS.km : Math.max(0, i.km);
  const fuelPrice = i.fuelPrice == null ? F.price : Math.max(0, i.fuelPrice);
  const cc = i.cc == null ? DEFAULTS.cc : Math.max(0, i.cc);
  const units = km / eff;
  const fuelCost = Math.round(units * fuelPrice);
  const t = carTax(fuel === 'ev' ? 0 : cc, { age, year: i.year || 2026, ev: fuel === 'ev' });
  const insurance = i.insurance == null ? DEFAULTS.insurance : Math.max(0, i.insurance);
  const maintenance = i.maintenance == null ? DEFAULTS.maintenance : Math.max(0, i.maintenance);
  const parkingMonthly = i.parking == null ? DEFAULTS.parking : Math.max(0, i.parking);
  const depRate = depreciationRate(age);
  const depreciation = Math.round(price * depRate);
  const items = [
    { key: 'fuel', label: '유류비', annual: fuelCost, note: `${km.toLocaleString('ko-KR')}km ÷ ${eff}${F.effUnit} × ${fuelPrice.toLocaleString('ko-KR')}원` },
    { key: 'tax', label: '자동차세', annual: t.total, note: fuel === 'ev' ? '전기차 정액 · 교육세 포함' : `${cc.toLocaleString('ko-KR')}cc · ${age}년차 · 교육세 포함` },
    { key: 'insurance', label: '보험료', annual: insurance, note: '연 납입' },
    { key: 'maintenance', label: '정비·소모품', annual: maintenance, note: '엔진오일·타이어·검사 등' },
    { key: 'parking', label: '주차·통행료', annual: parkingMonthly * 12, note: '주차장 · 통행료 · 세차 제외' },
    { key: 'depreciation', label: '감가상각', annual: depreciation, note: `차량가의 ${Math.round(depRate * 100)}% (${age}년차)` },
  ];
  const annual = items.reduce((a, r) => a + r.annual, 0);
  for (const r of items) { r.monthly = Math.round(r.annual / 12); r.share = annual ? r.annual / annual : 0; }
  const cash = annual - depreciation;
  return {
    price, age, fuel, fuelLabel: F.label, eff, effUnit: F.effUnit, km, fuelPrice, cc, units: Math.round(units),
    items, fuelCost, tax: t.total, insurance, maintenance, parking: parkingMonthly * 12, depreciation, depRate,
    annual, monthly: Math.round(annual / 12), cash, cashMonthly: Math.round(cash / 12), perKm: km ? Math.round(annual / km) : 0,
  };
}
