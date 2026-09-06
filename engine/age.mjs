/* 나이대 안에서 내 월소득의 위치 — 통계청 소득구간 분포(10구간)를 구간 안에서 선형 보간
 * 마지막 구간(1,000만원 이상)은 3,000만원까지 고르게 퍼져 있다고 가정한다. */

import { AGE_INCOME } from '../data/age-income.mjs';

const TOP_END = 30000000;

/* monthly 원 이하인 근로자 비율(0~1) */
export function shareBelow(monthly, key = 'all') {
  const d = AGE_INCOME.dist[key];
  const b = AGE_INCOME.brackets;
  let acc = 0;
  for (let i = 0; i < d.length; i++) {
    const lo = b[i], hi = i + 1 < b.length ? b[i + 1] : TOP_END;
    if (monthly >= hi) { acc += d[i]; continue; }
    if (monthly > lo) acc += d[i] * (monthly - lo) / (hi - lo);
    break;
  }
  return Math.min(1, acc / 100);
}

export function ageRank(monthly, key = 'all') {
  const below = shareBelow(monthly, key);
  const top = Math.max(0.001, 1 - below);
  return { below, top, topPct: Math.round(top * 1000) / 10 };
}

/* 구간 분포로 추정한 중위소득 (상위 50% 경계) */
export function medianOf(key = 'all') {
  const d = AGE_INCOME.dist[key], b = AGE_INCOME.brackets;
  let acc = 0;
  for (let i = 0; i < d.length; i++) {
    const lo = b[i], hi = i + 1 < b.length ? b[i + 1] : TOP_END;
    if (acc + d[i] >= 50) return Math.round(lo + (hi - lo) * (50 - acc) / d[i]);
    acc += d[i];
  }
  return TOP_END;
}

export const groups = () => AGE_INCOME.groups;
