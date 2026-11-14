/* 건강보험 피부양자 자격 판정 — 국민건강보험법 제5조제2항, 시행규칙 제2조·[별표 1](부양요건)·[별표 1의2](소득 및 재산요건)
 * 원문 대조: 2026-11-14 (국민건강보험공단 건강Law의 시행규칙 조문, 공단 「피부양자 자격의 인정기준 중 소득 및 재산요건」·「피부양자 취득안내」)
 *
 * 소득요건 (별표 1의2 제1호, 모두 충족)
 *   가. 소득 합계 연 2,000만원 이하 (이자·배당·사업·근로·연금·기타소득).
 *       이자·배당은 합계 1,000만원 이하면 합산하지 않고, 넘으면 전액을 더한다(시행규칙 제44조제1항 단서와 같은 기준).
 *       근로소득은 총급여(비과세 제외), 연금은 공적연금 수령액 전액 — 보험료를 매길 때의 50% 평가는 자격 판정에 쓰지 않는다.
 *       사업·기타소득은 필요경비를 뺀 소득금액.
 *   나. 사업소득이 없을 것. 다만 사업소득 합계가 연 500만원 이하이고
 *       ① 사업자등록이 없거나(주택임대소득이 있으면 제외) ② 등록 장애인·국가유공자·보훈보상대상자 상이등급이면 없는 것으로 본다.
 *   라. 기혼자는 부부 모두 가·나를 충족해야 한다.
 * 재산요건 (별표 1의2 제2호)
 *   가. 재산세 과세표준 합 5억 4천만원 이하, 또는 5억 4천만원 초과 9억원 이하이면서 소득 합계 연 1,000만원 이하.
 *   나. 형제자매는 1억 8천만원 이하.
 * 부양요건 (별표 1) — 관계·동거 여부·혼인 상태로 인정/불인정이 갈리고, 다른 가족의 보수·소득에 달린 조건은 'check'(확인 필요)로 돌려준다.
 *
 * 미반영: 주택재건축 사업소득 예외(별표 1의2 제1호다목), 외국인·재외국민 체류 요건, 소득·재산 자료의 반영 시차,
 *   공단이 개별 서류로 판단하는 부양 사실. 결과는 참고용이며 최종 판정은 국민건강보험공단이 한다. */

export const DEP_INCOME_LIMIT = 20000000;        /* 소득 합계 연 2,000만원 이하 */
export const DEP_FINANCE_FLOOR = 10000000;       /* 이자·배당 합계 1,000만원 이하면 합산 제외 */
export const DEP_BUSINESS_LIMIT = 5000000;       /* 사업자등록 없음·장애인 등: 사업소득 연 500만원 이하 */
export const DEP_PROPERTY_LOW = 540000000;       /* 재산세 과세표준 5억 4천만원 */
export const DEP_PROPERTY_HIGH = 900000000;      /* 9억원 */
export const DEP_PROPERTY_MID_INCOME = 10000000; /* 5.4억 초과 9억 이하일 때 소득 합계 연 1,000만원 이하 */
export const DEP_PROPERTY_SIBLING = 180000000;   /* 형제자매 1억 8천만원 */
export const DEP_SIBLING_YOUNG = 30;             /* 30세 미만 */
export const DEP_SIBLING_OLD = 65;               /* 65세 이상 */
export const DEP_ASOF = '2026년 11월 기준';
export const DEP_CHECKED = '2026-11-14';

/* 관계 — 별표 1의 번호 순서 */
export const DEP_RELATIONS = {
  spouse: '배우자',
  parent: '부모',
  child: '자녀',
  grandparent: '조부모·외조부모',
  grandchild: '손자녀·외손자녀',
  childSpouse: '사위·며느리',
  spouseParent: '배우자의 부모',
  spouseGrandparent: '배우자의 조부모',
  spouseChild: '배우자의 자녀',
  sibling: '형제자매',
};

const won = (v) => Math.max(0, Math.round(Number(v) || 0));

/* 부양요건 — { status: 'pass' | 'fail' | 'check', rule, note } */
export function supportTest(i = {}) {
  const rel = DEP_RELATIONS[i.relation] ? i.relation : 'spouse';
  const together = i.together !== false;
  const marital = ['single', 'married', 'divorced'].includes(i.marital) ? i.marital : (rel === 'child' || rel === 'grandchild' || rel === 'sibling' || rel === 'spouseChild' ? 'single' : 'married');
  const age = Math.max(0, Math.floor(Number(i.age) || 0));
  const disabled = !!i.disabled;
  const r = (status, rule, note = '') => ({ status, rule, note, relation: rel, together, marital });
  const DIV = '이혼·사별한 경우에는 자녀가 없거나, 있어도 그 자녀에게 보수·소득이 없어야 합니다.';
  switch (rel) {
    case 'spouse':
      return r('pass', '배우자는 같이 살든 따로 살든 인정됩니다.');
    case 'parent':
      return together ? r('pass', '부모는 같이 살면 인정됩니다.')
        : r('check', '따로 사는 부모는, 부모와 같이 사는 형제자매가 없거나 있어도 그 형제자매에게 보수·소득이 없어야 인정됩니다.');
    case 'spouseParent':
      return together ? r('pass', '배우자의 부모는 같이 살면 인정됩니다.')
        : r('check', '따로 사는 배우자의 부모는, 그분들과 같이 사는 배우자의 형제자매가 없거나 있어도 보수·소득이 없어야 인정됩니다.');
    case 'grandparent':
    case 'spouseGrandparent':
      return together ? r('pass', '조부모는 같이 살면 인정됩니다.')
        : r('check', '따로 사는 조부모는, 조부모와 같이 사는 자녀·손자녀가 없거나 있어도 보수·소득이 없어야 인정됩니다.');
    case 'child':
      if (together) return r('pass', '자녀는 같이 살면 인정됩니다.');
      if (marital === 'single') return r('pass', '따로 사는 자녀는 미혼이면 인정됩니다.');
      if (marital === 'divorced') return r('check', '따로 사는 자녀가 ' + DIV);
      return r('fail', '따로 사는 자녀는 미혼(이혼·사별 포함)일 때만 인정됩니다. 결혼한 자녀는 같이 살아야 합니다.');
    case 'grandchild':
      if (together) return r('check', '같이 사는 손자녀는, 그 부모가 없거나 있어도 부모에게 보수·소득이 없어야 인정됩니다.');
      if (marital === 'married') return r('fail', '따로 사는 손자녀는 미혼(이혼·사별 포함)이고 부모가 없을 때만 인정됩니다.');
      return r('check', '따로 사는 손자녀는 미혼이고 부모가 없어야 인정됩니다.' + (marital === 'divorced' ? ' ' + DIV : ''));
    case 'childSpouse':
      return together ? r('pass', '사위·며느리는 같이 살면 인정됩니다.')
        : r('fail', '사위·며느리는 같이 살 때만 인정됩니다.');
    case 'spouseChild':
      if (!together) return r('fail', '배우자의 자녀는 같이 살 때만 인정됩니다.');
      if (marital === 'single') return r('pass', '같이 사는 배우자의 자녀는 미혼이면 인정됩니다.');
      if (marital === 'divorced') return r('check', '같이 사는 배우자의 자녀가 ' + DIV);
      return r('fail', '배우자의 자녀는 같이 살고 미혼(이혼·사별 포함)일 때만 인정됩니다.');
    case 'sibling': {
      const ageOk = age < DEP_SIBLING_YOUNG || age >= DEP_SIBLING_OLD;
      if (!ageOk && !disabled) return r('fail', `형제자매는 ${DEP_SIBLING_YOUNG}세 미만, ${DEP_SIBLING_OLD}세 이상, 등록 장애인, 국가유공·보훈 상이자 가운데 하나여야 합니다.`, `입력한 나이 ${age}세는 여기에 들지 않습니다.`);
      if (marital === 'married') return r('fail', '형제자매는 미혼(이혼·사별 포함)일 때만 인정됩니다.');
      const who = disabled && !ageOk ? '장애인·상이자' : age < DEP_SIBLING_YOUNG ? `${DEP_SIBLING_YOUNG}세 미만` : `${DEP_SIBLING_OLD}세 이상`;
      return r('check', (together
        ? '같이 사는 형제자매는 미혼이고, 부모가 없거나 있어도 부모에게 보수·소득이 없어야 인정됩니다.'
        : '따로 사는 형제자매는 미혼이고, 부모와 다른 형제자매가 없거나 있어도 그들에게 보수·소득이 없어야 인정됩니다.')
        + (marital === 'divorced' ? ' ' + DIV : ''), `나이·장애 조건은 충족합니다(${who}).`);
    }
  }
  return r('check', '');
}

/* 피부양자 자격 판정
 * i: { relation, together, marital, age, disabled,
 *      pension(공적연금 연 수령액), wage(근로소득 총급여), business(사업소득금액), bizReg(사업자등록), rental(주택임대소득 있음),
 *      finance(이자+배당), other(기타소득금액), property(재산세 과세표준 합), spouseOver(배우자가 소득요건을 넘음) } — 금액은 원 */
export function dependent(i = {}) {
  const pension = won(i.pension), wage = won(i.wage), business = won(i.business), finance = won(i.finance), other = won(i.other);
  const property = won(i.property);
  const bizReg = !!i.bizReg, rental = !!i.rental, disabled = !!i.disabled;
  const support = supportTest(i);
  /* 직장가입자의 배우자로 등재되는 사람에게 '상대 배우자'는 직장가입자 본인이므로 이 조건을 묻지 않는다 */
  const spouseOver = !!i.spouseOver && support.relation !== 'spouse';
  const sibling = support.relation === 'sibling';

  /* 소득 합계 — 이자·배당은 1,000만원을 넘을 때만 전액 */
  const financeCounted = finance > DEP_FINANCE_FLOOR ? finance : 0;
  const total = pension + wage + business + financeCounted + other;
  const totalOk = total <= DEP_INCOME_LIMIT;

  /* 사업소득 */
  let bizOk = true, bizCase = 'none';
  if (business > 0) {
    if (disabled) { bizCase = 'disabled'; bizOk = business <= DEP_BUSINESS_LIMIT; }
    else if (bizReg) { bizCase = 'registered'; bizOk = false; }
    else if (rental) { bizCase = 'rental'; bizOk = false; }
    else { bizCase = 'unregistered'; bizOk = business <= DEP_BUSINESS_LIMIT; }
  }
  const incomeOk = totalOk && bizOk && !spouseOver;

  /* 재산 */
  let propertyOk, propertyCase, propertyLimit;
  if (sibling) {
    propertyCase = 'sibling'; propertyLimit = DEP_PROPERTY_SIBLING; propertyOk = property <= DEP_PROPERTY_SIBLING;
  } else if (property <= DEP_PROPERTY_LOW) {
    propertyCase = 'low'; propertyLimit = DEP_PROPERTY_LOW; propertyOk = true;
  } else if (property <= DEP_PROPERTY_HIGH) {
    propertyCase = 'mid'; propertyLimit = DEP_PROPERTY_HIGH; propertyOk = total <= DEP_PROPERTY_MID_INCOME;
  } else {
    propertyCase = 'high'; propertyLimit = DEP_PROPERTY_HIGH; propertyOk = false;
  }

  const fails = [];
  if (support.status === 'fail') fails.push('support');
  if (!incomeOk) fails.push('income');
  if (!propertyOk) fails.push('property');
  const verdict = fails.length ? 'fail' : support.status === 'check' ? 'check' : 'pass';

  return {
    verdict, fails, support,
    income: {
      ok: incomeOk, total, totalOk, limit: DEP_INCOME_LIMIT, margin: DEP_INCOME_LIMIT - total,
      pension, wage, business, finance, financeCounted, other,
      bizOk, bizCase, bizLimit: DEP_BUSINESS_LIMIT, bizMargin: DEP_BUSINESS_LIMIT - business,
      spouseOver,
    },
    property: {
      ok: propertyOk, value: property, case: propertyCase, limit: propertyLimit, margin: propertyLimit - property,
      lowMargin: DEP_PROPERTY_LOW - property,
      midIncomeLimit: DEP_PROPERTY_MID_INCOME, midIncomeMargin: DEP_PROPERTY_MID_INCOME - total,
    },
  };
}

/* ---------- 결과 문장 — 빌드(예시)와 브라우저(판정기)가 같은 문장을 쓴다 ---------- */
const amt = (v) => {
  const a = Math.abs(Math.round(v));
  if (!a) return '0원';
  if (a % 10000) return a.toLocaleString('ko-KR') + '원';
  const m = a / 10000;
  if (m >= 10000) { const e = Math.floor(m / 10000), rest = m % 10000; return rest ? `${e}억 ${rest.toLocaleString('ko-KR')}만원` : `${e}억원`; }
  return m.toLocaleString('ko-KR') + '만원';
};
const room = (margin) => margin > 0 ? `기준까지 ${amt(margin)} 남음` : margin === 0 ? '기준액과 같음 (이하이므로 충족)' : `기준을 ${amt(margin)} 넘음`;
export const DEP_STATUS = { pass: '충족', fail: '불충족', check: '확인 필요' };
export const DEP_VERDICT = { pass: '피부양자 요건 충족', fail: '피부양자 요건 불충족', check: '소득·재산은 충족, 부양요건 확인 필요' };

/* dependent() 결과 → [{ key, title, status, margin, lines[] }] (부양·소득·재산 순) */
export function explain(r) {
  const I = r.income, P = r.property, S = r.support;
  const sup = { key: 'support', title: '부양요건', status: S.status, margin: '', lines: [S.rule].concat(S.note ? [S.note] : []) };
  if (S.status === 'check') sup.lines.push('다른 가족의 보수·소득은 이 판정기가 알 수 없어, 위 조건에 맞는지 직접 확인해야 합니다.');

  const inc = { key: 'income', title: '소득요건', status: I.ok ? 'pass' : 'fail', margin: room(I.margin), lines: [] };
  inc.lines.push(`소득 합계 ${amt(I.total)} · 기준은 연 ${amt(I.limit)} 이하 → ${room(I.margin)}.`);
  if (I.finance > 0) inc.lines.push(I.financeCounted
    ? `이자·배당 ${amt(I.finance)}은 ${amt(DEP_FINANCE_FLOOR)}을 넘어 전액을 더했습니다.`
    : `이자·배당 ${amt(I.finance)}은 ${amt(DEP_FINANCE_FLOOR)} 이하라 더하지 않았습니다. ${I.finance === DEP_FINANCE_FLOOR ? '지금이 한도이고' : `한도까지 ${amt(DEP_FINANCE_FLOOR - I.finance)} 남았고`}, 넘으면 전액이 더해집니다.`);
  if (I.bizCase === 'registered') inc.lines.push(`사업자등록이 있으면 사업소득이 없어야 합니다. 사업소득 ${amt(I.business)}이 있어 불충족입니다.`);
  else if (I.bizCase === 'rental') inc.lines.push(`주택임대소득이 있으면 사업자등록이 없어도 ${amt(I.bizLimit)} 예외를 받지 못합니다. 사업소득 ${amt(I.business)}이 있어 불충족입니다.`);
  else if (I.bizCase === 'unregistered') inc.lines.push(`사업자등록이 없으면 사업소득 연 ${amt(I.bizLimit)} 이하까지 인정됩니다. 사업소득 ${amt(I.business)} → ${room(I.bizMargin)}.`);
  else if (I.bizCase === 'disabled') inc.lines.push(`등록 장애인·국가유공·보훈 상이자는 사업자등록과 상관없이 사업소득 연 ${amt(I.bizLimit)} 이하까지 인정됩니다. 사업소득 ${amt(I.business)} → ${room(I.bizMargin)}.`);
  if (I.spouseOver) inc.lines.push('기혼자는 부부 모두 소득요건을 채워야 합니다. 배우자가 기준을 넘어 불충족입니다.');
  if (!I.ok && I.totalOk && I.bizOk === false) inc.margin = I.bizCase === 'unregistered' || I.bizCase === 'disabled' ? `사업소득 ${room(I.bizMargin)}` : '사업소득이 있음';
  else if (!I.ok && I.totalOk && I.spouseOver) inc.margin = '배우자 소득 초과';

  const prop = { key: 'property', title: '재산요건', status: P.ok ? 'pass' : 'fail', margin: '', lines: [] };
  if (P.case === 'sibling') {
    prop.margin = room(P.margin);
    prop.lines.push(`재산세 과세표준 ${amt(P.value)} · 형제자매 기준은 ${amt(DEP_PROPERTY_SIBLING)} 이하 → ${room(P.margin)}.`);
  } else if (P.case === 'low') {
    prop.margin = room(P.margin);
    prop.lines.push(`재산세 과세표준 ${amt(P.value)} · 기준은 ${amt(DEP_PROPERTY_LOW)} 이하 → ${room(P.margin)}.`);
  } else if (P.case === 'mid') {
    prop.margin = `소득 ${room(P.midIncomeMargin)}`;
    prop.lines.push(`재산세 과세표준 ${amt(P.value)}은 ${amt(DEP_PROPERTY_LOW)} 초과 ${amt(DEP_PROPERTY_HIGH)} 이하 구간입니다(${amt(DEP_PROPERTY_HIGH)}까지 ${amt(P.margin)} 남음).`);
    prop.lines.push(`이 구간은 소득 합계가 연 ${amt(P.midIncomeLimit)} 이하여야 합니다. 소득 합계 ${amt(r.income.total)} → ${room(P.midIncomeMargin)}.`);
  } else {
    prop.margin = room(P.margin);
    prop.lines.push(`재산세 과세표준 ${amt(P.value)} · ${amt(DEP_PROPERTY_HIGH)}을 넘으면 소득과 상관없이 불충족입니다 → ${room(P.margin)}.`);
  }
  return [sup, inc, prop];
}

/* 탈락했을 때 지역가입자 보험료를 어림할 소득 — 보험료를 매길 때는 근로·연금소득을 50%만 반영한다(시행규칙 제44조제2항) */
export const localIncome = (r) => Math.round((r.income.pension + r.income.wage) * 0.5) + r.income.business + r.income.financeCounted + r.income.other;
