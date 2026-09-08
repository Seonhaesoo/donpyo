/* 양도소득세(주택) — 소득세법 제89조(1세대 1주택 비과세·12억 초과분 과세), 제95조(장기보유특별공제 표1·표2), 제103조(기본공제 250만),
 * 제104조(세율: 보유 1년 미만 70%, 2년 미만 60%, 그 외 기본세율 6~45%, 조정대상지역 2주택 +20%p·3주택 이상 +30%p), 지방소득세 10%. 2025년 기준.
 * 양도차익 = 양도가액 − 취득가액 − 필요경비.
 * 1세대 1주택(보유 2년 이상, 조정대상지역 취득분은 거주 2년 이상): 양도가액 12억 이하 전액 비과세, 초과분은 양도차익 × (양도가액 − 12억) ÷ 양도가액만 과세.
 * 장기보유특별공제 — 표2(1세대 1주택 고가주택, 거주 2년 이상): 보유 3년 이상부터 연 4%(최대 40%) + 거주 3년 이상부터 연 4%(최대 40%), 합계 최대 80%.
 *                  표1(그 밖): 보유 3년 이상부터 연 2%, 최대 30%(15년). 중과 대상 다주택은 공제 없음.
 * 다주택 중과는 2026년 5월 9일까지 한시 배제 → 기본 계산은 중과 없이(표1 공제 적용), 옵션(multi = 2 | 3)일 때만 중과.
 * 미반영: 취득가액 환산·감정, 상속·증여 취득분, 비거주자, 분양권·입주권, 일시적 2주택 특례, 거주 2년 이상 3년 미만 8% 공제, 장기임대 특례. */

export const CAP_ASOF = '2025년';
export const EXEMPT_PRICE = 1200000000;      /* 1세대 1주택 비과세 상한 (양도가액) */
export const BASIC_DEDUCTION = 2500000;      /* 양도소득 기본공제 (연 1회) */
export const SURCHARGE_UNTIL = '2026년 5월 9일';
export const SURCHARGE = { 2: 0.2, 3: 0.3 };
export const SHORT_RATES = [[1, 0.7], [2, 0.6]];   /* 보유 1년 미만 70% · 1년 이상 2년 미만 60% (주택·입주권·분양권) */
export const BRACKETS = [
  [14000000, 0.06, 0],
  [50000000, 0.15, 1260000],
  [88000000, 0.24, 5760000],
  [150000000, 0.35, 15440000],
  [300000000, 0.38, 19940000],
  [500000000, 0.40, 25940000],
  [1000000000, 0.42, 35940000],
  [Infinity, 0.45, 65940000],
];

const r3 = (x) => Math.round(x * 1000) / 1000;

export const bracketOf = (base) => { for (const [limit, rate, sub] of BRACKETS) if (base <= limit) return { limit, rate, sub }; return { limit: Infinity, rate: 0.45, sub: 65940000 }; };

/* 장기보유특별공제율 — table 2: 1세대 1주택 고가주택(거주 2년 이상) · table 1: 일반 · 0: 중과 대상(배제) */
export function longTermRate(holdYears, liveYears, table = 1) {
  const h = Math.max(0, Math.floor(holdYears || 0)), l = Math.max(0, Math.floor(liveYears || 0));
  if (table === 0 || h < 3) return { table, hold: 0, live: 0, rate: 0 };
  if (table === 2) {
    const hold = r3(Math.min(0.4, 0.04 * h)), live = l >= 3 ? r3(Math.min(0.4, 0.04 * l)) : 0;
    return { table, hold, live, rate: r3(hold + live) };
  }
  const hold = r3(Math.min(0.3, 0.02 * h));
  return { table: 1, hold, live: 0, rate: hold };
}

/* { sale, cost, expense, holdYears, liveYears, oneHouse, adjusted(조정대상지역 취득), multi: 0 | 2 | 3 (중과 포함 계산) } */
export function capitalGains(i = {}) {
  const sale = Math.max(0, i.sale || 0), cost = Math.max(0, i.cost || 0), expense = Math.max(0, i.expense || 0);
  const hold = Math.max(0, i.holdYears || 0), live = Math.max(0, i.liveYears || 0);
  const oneHouse = !!i.oneHouse, adjusted = !!i.adjusted;
  const multi = SURCHARGE[i.multi] ? i.multi : 0;
  const gain = Math.max(0, sale - cost - expense);
  const exempt = oneHouse && !multi && hold >= 2 && (!adjusted || live >= 2);
  const fullyExempt = exempt && sale <= EXEMPT_PRICE;
  const taxableGain = !exempt ? gain : fullyExempt ? 0 : Math.round(gain * (sale - EXEMPT_PRICE) / sale);
  const table = multi ? 0 : (exempt && live >= 2) ? 2 : 1;
  const lt = longTermRate(hold, live, table);
  const ltd = Math.round(taxableGain * lt.rate);
  const income = taxableGain - ltd;                                   /* 양도소득금액 */
  const basic = Math.min(income, BASIC_DEDUCTION);
  const base = Math.max(0, income - basic);                           /* 과세표준 */
  const surcharge = multi ? SURCHARGE[multi] : 0;
  const short = SHORT_RATES.find(([y]) => hold < y);
  let tax, rate, sub = 0, kind;
  const b = bracketOf(base);
  const fullRate = r3(b.rate + surcharge);
  const progressive = base > 0 ? Math.max(0, Math.round(base * fullRate) - b.sub) : 0;
  if (short) {
    const flat = Math.round(base * short[1]);
    if (multi && progressive > flat) { tax = progressive; rate = fullRate; sub = b.sub; kind = 'surcharge'; }
    else { tax = flat; rate = short[1]; kind = short[0] === 1 ? 'short1' : 'short2'; }
  } else { tax = progressive; rate = base > 0 ? fullRate : 0; sub = base > 0 ? b.sub : 0; kind = multi ? 'surcharge' : 'basic'; }
  const local = Math.floor(tax / 10);
  return {
    sale, cost, expense, holdYears: hold, liveYears: live, oneHouse, adjusted, multi,
    gain, exempt, fullyExempt, exemptGain: gain - taxableGain, taxableGain,
    ltTable: lt.table, ltHold: lt.hold, ltLive: lt.live, ltRate: lt.rate, ltd,
    income, basic, base, kind, rate, surcharge, sub, tax, local, total: tax + local,
    effective: gain ? (tax + local) / gain : 0,
  };
}
