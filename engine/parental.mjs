/* 육아휴직 급여 — 고용보험법 제70조, 고용보험법 시행령 제95조·제95조의3 (2025년 1월 1일 시행)
 * 일반: 1~3개월 통상임금 100%(상한 250만), 4~6개월 100%(상한 200만), 7개월부터 80%(상한 160만). 하한 70만원.
 * 6+6 부모육아휴직제: 생후 18개월 이내 자녀를 부모가 모두 쓰면 각자 첫 6개월 100%, 상한 250·250·300·350·400·450만원.
 * 한부모: 1~3개월 100%(상한 300만), 이후 일반과 같음. 사후지급금(25% 복직 후 지급)은 2025년 폐지되어 휴직 중 전액 지급.
 * 기간: 자녀당 부모 각각 최대 12개월, 부모 모두 3개월 이상 쓰면 각각 18개월(2025.2.23~).
 * 출산·양육 지원금은 2025년 기준 고정 데이터(BENEFITS). 지역 출산장려금은 지자체별로 달라 넣지 않았다. */

export const LEAVE_MIN = 700000;
export const LEAVE_MAX_MONTHS = 18;
export const NORMAL_CAPS = [{ from: 1, to: 3, rate: 1, cap: 2500000 }, { from: 4, to: 6, rate: 1, cap: 2000000 }, { from: 7, to: 18, rate: 0.8, cap: 1600000 }];
export const BOTH_CAPS = [2500000, 2500000, 3000000, 3500000, 4000000, 4500000];
export const SINGLE_CAP = 3000000;
export const MODES = {
  normal: { label: '일반 육아휴직', short: '일반' },
  both: { label: '6+6 부모육아휴직제', short: '6+6 부모 함께' },
  single: { label: '한부모 육아휴직', short: '한부모' },
};

function ruleFor(month, mode) {
  if (mode === 'both' && month <= 6) return { rate: 1, cap: BOTH_CAPS[month - 1] };
  if (mode === 'single' && month <= 3) return { rate: 1, cap: SINGLE_CAP };
  const r = NORMAL_CAPS.find((x) => month >= x.from && month <= x.to) || NORMAL_CAPS[NORMAL_CAPS.length - 1];
  return { rate: r.rate, cap: r.cap };
}

/* wage: 월 통상임금 · month: 몇 개월째(1~) · mode: normal | both | single */
export function monthPay(wage, month, mode = 'normal') {
  const { rate, cap } = ruleFor(month, mode);
  const raw = Math.round(wage * rate);
  const pay = Math.max(LEAVE_MIN, Math.min(raw, cap));
  return { month, rate, cap, raw, pay, capped: raw > cap, floored: raw < LEAVE_MIN };
}

/* { wage, months(1~18), mode } → 월별 배열과 총액 */
export function parentalLeave(i = {}) {
  const wage = Math.max(0, i.wage || 0);
  const months = Math.max(1, Math.min(LEAVE_MAX_MONTHS, Math.floor(i.months || 12)));
  const mode = MODES[i.mode] ? i.mode : 'normal';
  const rows = [];
  for (let m = 1; m <= months; m++) rows.push(monthPay(wage, m, mode));
  const total = rows.reduce((a, r) => a + r.pay, 0);
  return { wage, months, mode, rows, total, average: Math.round(total / months) };
}

/* 6+6: 부모가 각자 6개월씩 쓸 때 두 사람 합계 (통상임금이 다르면 각각 넣는다) */
export function bothTotal(wageA, wageB = wageA) {
  const a = parentalLeave({ wage: wageA, months: 6, mode: 'both' }).total;
  const b = parentalLeave({ wage: wageB, months: 6, mode: 'both' }).total;
  return { a, b, total: a + b };
}

/* ---------- 출산·양육 지원금 (2025년, 전국 공통) ---------- */
export const FIRST_MEETING = { first: 2000000, second: 3000000 };          /* 첫만남이용권: 첫째 200만, 둘째부터 300만 (바우처, 출생 후 1년 안에 사용) */
export const PARENT_PAY = { age0: 1000000, age1: 500000 };                 /* 부모급여: 0~11개월 월 100만, 12~23개월 월 50만 */
export const CHILD_ALLOWANCE = { monthly: 100000, untilMonths: 96 };       /* 아동수당: 만 8세 미만(0~95개월) 월 10만 */
export const HOME_CARE = { monthly: 100000, fromMonths: 24, untilMonths: 87 }; /* 양육수당: 가정양육 24~86개월 월 10만 */
export const PREGNANCY_VOUCHER = { single: 1000000, perTwin: 1000000 };   /* 임신·출산 진료비: 단태아 100만, 다태아 태아당 100만 */

export const BENEFITS = [
  { key: 'pregnancy', name: '임신·출산 진료비 바우처', amount: '단태아 100만원 · 다태아 태아당 100만원', when: '임신 확인 후 ~ 출산 후 2년', where: '국민행복카드 (카드사·병원·건강보험공단)', note: '진료비·약제비, 2세 미만 자녀 진료비에 사용' },
  { key: 'first', name: '첫만남이용권', amount: '첫째 200만원 · 둘째부터 300만원', when: '출생 후 1년 안에 사용', where: '정부24 · 복지로 · 주민센터', note: '국민행복카드 바우처, 유흥·사행업종 외 대부분 사용 가능' },
  { key: 'parent', name: '부모급여', amount: '0세 월 100만원 · 1세 월 50만원', when: '0~23개월', where: '복지로 · 주민센터 (출생 60일 안에 신청하면 출생월부터)', note: '어린이집 이용 시 보육료 바우처를 빼고 차액을 현금으로' },
  { key: 'child', name: '아동수당', amount: '월 10만원', when: '0~95개월 (만 8세 미만)', where: '복지로 · 주민센터', note: '소득과 관계없이 전원 지급' },
  { key: 'home', name: '양육수당', amount: '월 10만원', when: '24~86개월', where: '복지로 · 주민센터', note: '어린이집·유치원을 다니지 않는 가정양육 아동' },
  { key: 'local', name: '지역 출산장려금', amount: '지자체별 (수십만~수천만원)', when: '지자체 기준', where: '정부24 "출산지원금" 검색 · 복지로 · 주민센터', note: '거주 기간 조건이 있는 곳이 많음' },
];

const parseDate = (d) => {
  if (d instanceof Date) return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
  const [y, m, dd] = String(d).split('-').map((x) => parseInt(x, 10));
  return { y, m, d: dd || 1 };
};
const pad = (n) => String(n).padStart(2, '0');
export const ymText = (y, m) => `${y}년 ${m}월`;

/* 생년월일 → 기준일의 만 개월 수 */
export function ageMonths(birth, today) {
  const b = parseDate(birth), t = parseDate(today);
  let n = (t.y - b.y) * 12 + (t.m - b.m);
  if (t.d < b.d) n -= 1;
  return n;
}

/* 생년월일에서 k개월 뒤의 연·월 */
function addMonths(birth, k) {
  const b = parseDate(birth);
  const total = b.y * 12 + (b.m - 1) + k;
  return { y: Math.floor(total / 12), m: (total % 12) + 1 };
}

export const parentPayAt = (m) => m < 0 ? 0 : m < 12 ? PARENT_PAY.age0 : m < 24 ? PARENT_PAY.age1 : 0;
export const childAllowanceAt = (m) => m >= 0 && m < CHILD_ALLOWANCE.untilMonths ? CHILD_ALLOWANCE.monthly : 0;
export const homeCareAt = (m) => m >= HOME_CARE.fromMonths && m < HOME_CARE.untilMonths ? HOME_CARE.monthly : 0;

/* birth: 'YYYY-MM-DD' · order: 1(첫째) 또는 2 이상 · today: 'YYYY-MM-DD' */
export function babyBenefits(birth, order = 1, today) {
  const m = ageMonths(birth, today || new Date());
  const firstMeeting = order >= 2 ? FIRST_MEETING.second : FIRST_MEETING.first;
  const parent = parentPayAt(m), child = childAllowanceAt(m), home = homeCareAt(m);
  const sumRange = (from, to, f) => { let s = 0; for (let k = from; k < to; k++) s += f(k); return s; };
  const parentTotal = sumRange(0, 24, parentPayAt);                       /* 1,800만 */
  const childTo24 = sumRange(0, 24, childAllowanceAt);                     /* 240만 */
  const childTotal = sumRange(0, CHILD_ALLOWANCE.untilMonths, childAllowanceAt);   /* 960만 */
  const remaining24 = m >= 24 ? 0 : sumRange(Math.max(0, m), 24, (k) => parentPayAt(k) + childAllowanceAt(k));
  return {
    ageMonths: m, born: m >= 0, order, firstMeeting,
    parent, child, home, monthly: parent + child, monthlyHome: parent + child + home,
    parentTotal, childTo24, childTotal,
    total24: firstMeeting + parentTotal + childTo24,                       /* 출생 ~ 만 2세 (첫만남 + 부모급여 + 아동수당) */
    remaining24,                                                            /* 이번 달부터 만 2세까지 남은 월 지급분 */
    total96: firstMeeting + parentTotal + childTotal,                       /* 만 8세까지 (양육수당 제외) */
  };
}

/* 시기별 월 지급액 — 출생부터 만 8세까지 4구간 */
export function benefitTimeline(birth) {
  const phases = [
    { from: 0, to: 12, label: '0세 (0~11개월)', items: ['부모급여 100만', '아동수당 10만'] },
    { from: 12, to: 24, label: '1세 (12~23개월)', items: ['부모급여 50만', '아동수당 10만'] },
    { from: 24, to: 87, label: '2세 ~ 7세 3개월 (24~86개월)', items: ['아동수당 10만', '가정양육 시 양육수당 10만'] },
    { from: 87, to: 96, label: '~ 만 8세 전 (87~95개월)', items: ['아동수당 10만'] },
  ];
  return phases.map((p) => {
    const s = addMonths(birth, p.from), e = addMonths(birth, p.to - 1);
    const monthly = parentPayAt(p.from) + childAllowanceAt(p.from);
    return { ...p, months: p.to - p.from, monthly, homeMonthly: monthly + homeCareAt(p.from), sum: monthly * (p.to - p.from), start: `${s.y}-${pad(s.m)}`, end: `${e.y}-${pad(e.m)}`, startText: ymText(s.y, s.m), endText: ymText(e.y, e.m) };
  });
}
