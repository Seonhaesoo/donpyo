/* 과거 요율 (근로자 부담) — '같은 연봉의 실수령 변화' 용.
 * 건강보험료율: 2020 6.67% · 2021 6.86% · 2022 6.99% · 2023~2025 7.09% (근로자는 절반)
 * 장기요양(건보료 대비): 2020 10.25% · 2021 11.52% · 2022 12.27% · 2023 12.81% · 2024~2025 12.95%
 * 고용보험 근로자: 2020~2022.6 0.8%, 2022.7부터 0.9%
 * 국민연금 근로자 4.5% (2025까지), 기준소득월액 상한은 매년 7월 조정(연도는 7월 이후 값)
 * ※ 소득세는 현재 간이세액표를 모든 해에 적용한 근사(표는 2020·2023·2024년에 개정됨) */

export const HISTORY = {
  2020: { pension: 0.045, pensionMin: 320000, pensionMax: 5030000, health: 0.03335, care: 0.1025, employment: 0.008, minWage: 8590 },
  2021: { pension: 0.045, pensionMin: 330000, pensionMax: 5240000, health: 0.0343, care: 0.1152, employment: 0.008, minWage: 8720 },
  2022: { pension: 0.045, pensionMin: 350000, pensionMax: 5530000, health: 0.03495, care: 0.1227, employment: 0.009, minWage: 9160 },
  2023: { pension: 0.045, pensionMin: 370000, pensionMax: 5900000, health: 0.03545, care: 0.1281, employment: 0.009, minWage: 9620 },
  2024: { pension: 0.045, pensionMin: 390000, pensionMax: 6170000, health: 0.03545, care: 0.1295, employment: 0.009, minWage: 9860 },
};

/* 소비자물가 상승률(연간, 통계청) — 협상 근거·실질가치 계산용. 확인 필요 항목은 check */
export const CPI = { 2022: 0.051, 2023: 0.036, 2024: 0.023, 2025: 0.021 };
export const CPI_CHECK = [2025];
