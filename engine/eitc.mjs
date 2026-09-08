/* 근로장려금·자녀장려금 — 조세특례제한법 제100조의2~제100조의13, 2024년 귀속(2025년 5월 정기 신청) 기준
 * 근로장려금: 가구 유형별 '총급여액 등'에 따라 점증(비례) → 평탄(최대) → 점감. 최대 단독 165만, 홑벌이 285만, 맞벌이 330만.
 *   단독  400만 미만 × 165/400 · 400~900만 165만 · 900~2,200만 165만 − (총급여 − 900만) × 165/1,300
 *   홑벌이 700만 미만 × 285/700 · 700~1,400만 285만 · 1,400~3,200만 285만 − (총급여 − 1,400만) × 285/1,800
 *   맞벌이 800만 미만 × 330/800 · 800~1,700만 330만 · 1,700~3,800만 330만 − (총급여 − 1,700만) × 330/2,100
 * 자녀장려금: 18세 미만 부양자녀 1인당 총급여 2,100만 미만 100만, 2,100~7,000만 100만 − (총급여 − 2,100만) × 50/4,900 (최소 50만), 7,000만 이상 0.
 * 재산: 전년 6월 1일 기준 가구원 재산 합계 2.4억 이상이면 제외, 1.7억 이상 2.4억 미만이면 산정액의 50%. 10원 미만 절사.
 * 미반영: 산정액 1만 5천원 미만 미지급·3만원 미만 3만원 규정, 기한 후 신청 감액, 사업소득의 업종별 조정률, 총소득 기준금액(부부 합산) 판정. */

export const EITC_ASOF = '2024년 귀속 · 2025년 신청';
export const PROPERTY_LIMIT = 240000000;     /* 이상이면 지급 제외 */
export const PROPERTY_HALF = 170000000;      /* 이상이면 50% 감액 */

export const TYPES = {
  single: { key: 'single', label: '단독 가구', short: '단독', max: 1650000, phaseIn: 4000000, flatTo: 9000000, limit: 22000000, who: '배우자, 18세 미만 부양자녀, 70세 이상 직계존속이 모두 없는 가구' },
  one: { key: 'one', label: '홑벌이 가구', short: '홑벌이', max: 2850000, phaseIn: 7000000, flatTo: 14000000, limit: 32000000, who: '배우자(총급여액 등 300만원 미만)나 18세 미만 부양자녀, 70세 이상 직계존속(연 소득 100만원 이하)이 있는 가구' },
  dual: { key: 'dual', label: '맞벌이 가구', short: '맞벌이', max: 3300000, phaseIn: 8000000, flatTo: 17000000, limit: 38000000, who: '본인과 배우자 각각의 총급여액 등이 300만원 이상인 가구' },
};
export const CTC = { max: 1000000, min: 500000, flatTo: 21000000, limit: 70000000 };   /* 자녀장려금 · 부양자녀 1인당 */

const floor10 = (n) => Math.floor(n / 10) * 10;

/* 총급여액 등 → 근로장려금 산정액(재산 감액 전) */
export function workCredit(wage, type = 'single') {
  const T = TYPES[type] || TYPES.single;
  const w = Math.max(0, wage || 0);
  let raw, phase;
  if (w < T.phaseIn) { raw = w * T.max / T.phaseIn; phase = 'in'; }
  else if (w < T.flatTo) { raw = T.max; phase = 'flat'; }
  else if (w < T.limit) { raw = T.max - (w - T.flatTo) * T.max / (T.limit - T.flatTo); phase = 'out'; }
  else { raw = 0; phase = 'over'; }
  return { raw: floor10(raw), phase, max: T.max };
}

/* 총급여액 등 → 자녀장려금 산정액(부양자녀 1인당, 재산 감액 전). 단독 가구는 부양자녀가 없으므로 0 */
export function childCredit(wage, type = 'one') {
  if (type === 'single') return { raw: 0, phase: 'none' };
  const w = Math.max(0, wage || 0);
  if (w < CTC.flatTo) return { raw: CTC.max, phase: 'flat' };
  if (w < CTC.limit) return { raw: floor10(Math.max(CTC.min, CTC.max - (w - CTC.flatTo) * (CTC.max - CTC.min) / (CTC.limit - CTC.flatTo))), phase: 'out' };
  return { raw: 0, phase: 'over' };
}

/* 재산 합계 → 지급 비율 (1 · 0.5 · 0) */
export const propertyFactor = (property) => (property || 0) >= PROPERTY_LIMIT ? 0 : (property || 0) >= PROPERTY_HALF ? 0.5 : 1;

/* { type: single | one | dual, wage: 총급여액 등(원), property: 가구 재산 합계(원), children: 18세 미만 부양자녀 수 } */
export function eitc(i = {}) {
  const type = TYPES[i.type] ? i.type : 'single';
  const wage = Math.max(0, i.wage || 0);
  const property = Math.max(0, i.property || 0);
  const children = type === 'single' ? 0 : Math.max(0, Math.floor(i.children || 0));
  const factor = propertyFactor(property);
  const w = workCredit(wage, type), c = childCredit(wage, type);
  const work = floor10(w.raw * factor);
  const perChild = floor10(c.raw * factor);
  const child = perChild * children;
  return {
    type, label: TYPES[type].label, wage, property, children, factor,
    workRaw: w.raw, phase: w.phase, work, max: TYPES[type].max, limit: TYPES[type].limit,
    childRaw: c.raw, childPhase: c.phase, perChild, child,
    total: work + child, eligible: factor > 0 && (work > 0 || child > 0),
  };
}

/* 구간 설명 — 페이지 문장용 */
export function phaseText(wage, type = 'single') {
  const T = TYPES[type] || TYPES.single, w = workCredit(wage, type);
  if (w.phase === 'in') return `${Math.round(T.phaseIn / 10000).toLocaleString('ko-KR')}만원 미만 점증 구간이라 총급여에 비례해 늘어나는 구간`;
  if (w.phase === 'flat') return `${Math.round(T.phaseIn / 10000).toLocaleString('ko-KR')}만~${Math.round(T.flatTo / 10000).toLocaleString('ko-KR')}만원 평탄 구간이라 최대 ${Math.round(T.max / 10000)}만원을 다 받는 구간`;
  if (w.phase === 'out') return `${Math.round(T.flatTo / 10000).toLocaleString('ko-KR')}만원을 넘어 총급여가 늘수록 줄어드는 점감 구간`;
  return `총급여 ${Math.round(T.limit / 10000).toLocaleString('ko-KR')}만원 이상이라 근로장려금 대상이 아닌 구간`;
}
