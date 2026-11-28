/* 기준 중위소득 — /median-income/ (2026-11-28)
 * 보건복지부 보도자료 「내년 기준 중위소득 6.70% 역대 최대 인상」(2026-07-28, 제80차 중앙생활보장위원회 의결) 본문 표에서 옮김. 1~6인만 공개 표에 있다.
 * 급여별 선정기준 = 기준 중위소득 × 비율(생계 32 · 의료 40 · 주거 48 · 교육 50%), 원 단위 반올림 — 보도자료 금액과 1~6인 모두 일치(test.mjs).
 * 기초생활보장은 월급이 아니라 '소득인정액'(소득평가액 + 재산의 소득환산액)으로 판정한다 — 페이지에 늘 적는다 */

export const MEDIAN = {
  2026: [2564238, 4199292, 5359036, 6494738, 7556719, 8555952],
  2027: [2736042, 4480645, 5718091, 6929885, 8063019, 9129201],
};
export const MEDIAN_SOURCE = 'https://mohw.go.kr/board.es?act=view&bid=0027&list_no=1491453&mid=a10503010100';
export const BENEFITS = [
  { key: 'living', label: '생계급여', pct: 32 },
  { key: 'medical', label: '의료급여', pct: 40 },
  { key: 'housing', label: '주거급여', pct: 48 },
  { key: 'edu', label: '교육급여', pct: 50 },
];
/* 사업 공고에 자주 나오는 비율 — 어느 사업이 몇 %인지는 공고마다 달라 표에는 비율만 */
export const COMMON_PCTS = [50, 60, 75, 100, 120, 150, 180];

export const medianOf = (year, n) => { const t = MEDIAN[year] || MEDIAN[2027]; return t[Math.max(1, Math.min(6, n)) - 1]; };
export const pctAmount = (year, n, pct) => Math.round(medianOf(year, n) * pct / 100);

/* income: 월 소득(원) → 중위소득 몇 %, 어느 급여 선정기준 아래인지 */
export function medianCheck(income, n, year = 2027) {
  const m = medianOf(year, n), v = Math.max(0, Number(income) || 0);
  const pct = m ? Math.round(v / m * 1000) / 10 : 0;
  const under = BENEFITS.filter((b) => v <= pctAmount(year, n, b.pct)).map((b) => b.key);
  return { year, n, median: m, income: v, pct, under };
}
