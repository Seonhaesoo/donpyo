/* 근로소득 순위 추정 — 국세청 근로소득 연말정산 통계(2023년 귀속)의 공식 요약값에 맞춘 로그정규 분포
 *   신고 인원 2,085만명 · 중위 총급여 3,302만원 · 평균 총급여 4,332만원 · 1억원 초과 139만명(6.7%)
 * 중위값을 μ로, 1억원 초과 비율로 σ를 맞추면(σ ≈ 0.739) 분포 평균이 4,339만원으로 공식 평균과 0.2% 차이 —
 * 세 요약값을 모두 재현하므로 구간 사이 보간에 쓴다. 정확한 백분위 원본이 아니라 "추정치"임을 페이지에 밝힌다. */

export const STAT = { year: 2023, workers: 20850000, median: 33020000, mean: 43320000, over100m: 0.067 };

const MU = Math.log(STAT.median);
const SIGMA = 0.739;

/* 표준정규 누적분포 (Abramowitz–Stegun 7.1.26 오차함수 근사, 오차 1.5e-7) */
function erf(x) {
  const s = x < 0 ? -1 : 1; x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}
const Phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));

/* 표준정규 역함수 (Acklam 근사) */
function PhiInv(p) {
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  const pl = 0.02425, ph = 1 - pl;
  let q, r;
  if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > ph) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  q = p - 0.5; r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/* 연간 총급여 → 그 이하 비율(below)과 상위 비율(top) */
export function rank(annual) {
  const below = Phi((Math.log(Math.max(1, annual)) - MU) / SIGMA);
  const top = 1 - below;
  return { below, top, topPct: Math.max(0.1, Math.round(top * 1000) / 10), people: Math.round(top * STAT.workers) };
}

/* 상위 top(0.1 = 10%)의 경계 연봉 */
export function incomeAt(top) {
  return Math.round(Math.exp(MU + SIGMA * PhiInv(1 - top)));
}
