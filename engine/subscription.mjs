/* 청약 가점 — 주택공급에 관한 규칙 제28조·별표 1 (가점제, 84점 만점)
 * 무주택기간 32점 + 부양가족 35점 + 청약통장 가입기간 17점.
 * 무주택기간은 만 30세가 되는 날(그 전에 혼인했으면 혼인신고일)부터, 유주택자와 만 30세 미만 미혼 무주택자는 0점.
 * 통장 가입기간은 최초 가입일 기준(미성년 기간은 최대 2년 → 2024년부터 5년 인정). */

export const SUB_MAX = { homeless: 32, family: 35, account: 17, total: 84 };

/* 무주택기간: 1년 미만 2점, 1년마다 2점씩, 15년 이상 32점 */
export const HOMELESS_TABLE = [{ years: null, label: '유주택자 · 만 30세 미만 미혼', score: 0 }].concat(
  Array.from({ length: 16 }, (_, y) => ({ years: y, label: y === 0 ? '1년 미만' : y === 15 ? '15년 이상' : `${y}년 이상 ${y + 1}년 미만`, score: Math.min(SUB_MAX.homeless, 2 + 2 * y) })),
);

/* 부양가족: 0명 5점, 1명마다 5점씩, 6명 이상 35점 */
export const FAMILY_TABLE = Array.from({ length: 7 }, (_, n) => ({ count: n, label: n === 6 ? '6명 이상' : `${n}명`, score: 5 + 5 * n }));

/* 청약통장 가입기간: 6개월 미만 1점, 6개월~1년 2점, 1년마다 1점씩, 15년 이상 17점 */
export const ACCOUNT_TABLE = [{ months: 0, label: '6개월 미만', score: 1 }, { months: 6, label: '6개월 이상 1년 미만', score: 2 }].concat(
  Array.from({ length: 15 }, (_, i) => { const y = i + 1; return { months: y * 12, label: y === 15 ? '15년 이상' : `${y}년 이상 ${y + 1}년 미만`, score: Math.min(SUB_MAX.account, 2 + y) }; }),
);

/* years: 무주택 기간(년, 소수 가능) · o: { under30Single: 만 30세 미만 미혼, owner: 유주택자 } */
export function homelessScore(years, o = {}) {
  if (o.owner || o.under30Single) return 0;
  const y = Math.max(0, Math.floor(years || 0));
  return Math.min(SUB_MAX.homeless, 2 + 2 * y);
}

export function familyScore(n) {
  const c = Math.max(0, Math.min(6, Math.floor(n || 0)));
  return 5 + 5 * c;
}

export function accountScore(months) {
  const m = Math.max(0, Math.floor(months || 0));
  if (m < 6) return 1;
  if (m < 12) return 2;
  return Math.min(SUB_MAX.account, 2 + Math.floor(m / 12));
}

/* { homelessYears, under30Single, owner, family, accountMonths } → 세 항목 점수와 합계 */
export function subscriptionScore(i = {}) {
  const homeless = homelessScore(i.homelessYears, { under30Single: i.under30Single, owner: i.owner });
  const family = familyScore(i.family);
  const account = accountScore(i.accountMonths);
  return { homeless, family, account, total: homeless + family + account };
}

/* 가구원 수별 최대 가점 — 4인 가족(부양가족 3명) 69점, 3인 64점, 2인 59점, 1인 54점 */
export const maxForFamily = (n) => SUB_MAX.homeless + familyScore(n) + SUB_MAX.account;

/* 합계 점수를 보는 눈 — 커트라인은 단지·지역·시기마다 달라 일반적인 감각만 적는다 */
export function subGrade(total) {
  if (total >= 70) return { key: 'top', label: '최상위권', text: '70점을 넘는 가점은 부양가족 3명 이상에 무주택·통장 기간을 모두 채워야 나오는 점수입니다. 수도권 인기 단지에서도 당첨권에 듭니다.' };
  if (total >= 60) return { key: 'high', label: '수도권 인기 단지 도전권', text: '수도권 인기 단지의 당첨 커트라인은 60점대 후반이 흔합니다. 단지에 따라 되기도 안 되기도 하는 구간이니 경쟁률이 낮은 단지나 특별공급을 함께 봅니다.' };
  if (total >= 50) return { key: 'mid', label: '중간', text: '지방 광역시나 수도권 외곽 단지, 대형 면적(추첨제 비율이 높은 곳)에서 가능성이 있습니다. 부양가족 1명이 5점, 무주택 1년이 2점이니 몇 년 더 기다리면 점수가 올라갑니다.' };
  return { key: 'low', label: '추첨제를 노릴 점수', text: '가점제로는 당첨이 어려운 점수입니다. 추첨제 물량(85㎡ 초과, 비규제지역 60%)이나 생애최초·신혼부부 특별공급을 노리는 편이 현실적입니다.' };
}
