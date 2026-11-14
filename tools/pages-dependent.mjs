/* 건강보험 피부양자 자격 판정기 — /nhis/dependent/ 한 장.
 * 판정은 engine/dependent.mjs(브라우저 판정기와 같은 코드·같은 문장), 탈락 시 지역보험료 어림은 engine/nhis.mjs.
 * 기준·출처를 고치면 engine/dependent.mjs 의 DEP_CHECKED 와 tools/build.mjs 의 DEP_DATE 를 함께 바꾼다. */
import * as DP from '../engine/dependent.mjs';
import * as NH from '../engine/nhis.mjs';
import { num, won, manwon } from '../engine/fmt.mjs';

export const DEP_URL = '/nhis/dependent/';
/* 공식 출처 — 2026-11-14 에 직접 연 주소. 법제처(law.go.kr)는 그날 시스템 점검 중이라 조문은 공단 건강Law 사본으로 읽었다 */
export const DEP_SOURCES = {
  lawRule: 'https://www.law.go.kr/법령/국민건강보험법시행규칙',
  nhisLaw: 'https://www.nhis.or.kr/lm/lmxsrv/law/lawFullContent.do?SEQ=29',
  nhisIncome: 'https://www.nhis.or.kr/nhis/policy/wbhada07400m01.do',
  nhisGuide: 'https://www.nhis.or.kr/nhis/policy/wbhada07300m01.do',
  nhisPaper: 'https://www.nhis.or.kr/static/alim/paper/oldpaper/202309/sub/section3_3.html',
};
const ext = (href, text) => `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;
const L = {
  income: manwon(DP.DEP_INCOME_LIMIT), fin: manwon(DP.DEP_FINANCE_FLOOR), biz: manwon(DP.DEP_BUSINESS_LIMIT),
  low: manwon(DP.DEP_PROPERTY_LOW), high: manwon(DP.DEP_PROPERTY_HIGH), mid: manwon(DP.DEP_PROPERTY_MID_INCOME), sib: manwon(DP.DEP_PROPERTY_SIBLING),
};

/* 출처 목록 — 판정기 페이지와 /method/ 가 같이 쓴다 */
export const depSourceList = () => `<ul>
<li>${ext(DEP_SOURCES.lawRule, '국민건강보험법 시행규칙')} 제2조(피부양자 자격의 인정기준 등)·[별표 1] 부양요건·[별표 1의2] 소득 및 재산요건 · ${ext(DEP_SOURCES.nhisLaw, '국민건강보험공단 건강Law 조문')}</li>
<li>${ext(DEP_SOURCES.nhisIncome, '국민건강보험공단 「피부양자 자격의 인정기준 중 소득 및 재산요건」')} — 소득 ${L.income}, 사업소득 ${L.biz}, 재산 ${L.low}·${L.high}·${L.sib}, 자료 반영 시기</li>
<li>${ext(DEP_SOURCES.nhisGuide, '국민건강보험공단 「피부양자 취득안내」')} — 대상, 형제자매 조건, 신고 기한과 취득일</li>
<li>${ext(DEP_SOURCES.nhisPaper, '국민건강보험공단 소식지 2023년 9월호')} — 공적연금은 소득에 넣고 사적연금은 넣지 않음, 2022년 9월 소득 기준 3,400만원 → 2,000만원</li>
</ul>`;

/* /method/ 에 들어가는 문단 */
export const depMethod = () => `<h2>건강보험 피부양자 자격 판정</h2>
<p><a href="${DEP_URL}">피부양자 자격 판정기</a>는 국민건강보험법 시행규칙 제2조와 [별표 1](부양요건)·[별표 1의2](소득 및 재산요건)를 바탕으로 만들었습니다(${DP.DEP_ASOF} 기준 · 기준 금액은 국민건강보험공단 안내로 ${DP.DEP_CHECKED}에 확인). <b>소득요건</b>은 ① 이자·배당·사업·근로·연금·기타소득 합계가 연 ${L.income} 이하이고 ② 사업소득이 없어야 합니다. 사업자등록이 없거나(주택임대소득이 있으면 제외) 등록 장애인·국가유공·보훈 상이자이면 사업소득 연 ${L.biz} 이하까지 없는 것으로 봅니다. 기혼자는 부부 모두 충족해야 합니다. 이자·배당은 합계 ${L.fin} 이하면 더하지 않고 넘으면 전액을 더하며, 근로소득은 총급여, 연금은 공적연금 수령액 전액을 씁니다(보험료를 매길 때의 50% 평가는 자격 판정에 쓰지 않습니다). <b>재산요건</b>은 재산세 과세표준 합계가 ${L.low} 이하이거나, ${L.low} 초과 ${L.high} 이하이면서 소득 합계가 연 ${L.mid} 이하여야 하고, 형제자매는 ${L.sib} 이하입니다. 기준액은 모두 "이하"라 딱 그 금액이면 충족으로 봅니다. <b>부양요건</b>은 관계·동거 여부·혼인 상태로 가르되, "같이 사는 형제자매에게 보수·소득이 없을 것"처럼 다른 가족의 사정에 달린 조건은 판정하지 않고 "확인 필요"로 표시합니다. 탈락했을 때의 지역보험료 어림은 근로·연금소득을 50%만 반영한 소득(시행규칙 제44조제2항)을 건강보험료 계산과 같은 식에 넣은 값이라 재산 점수 근사를 그대로 안고 있습니다. 주택재건축 사업소득 예외, 외국인·재외국민 체류 요건, 소득·재산 자료의 반영 시차는 넣지 않았습니다. 이자·배당 ${L.fin} 기준은 조문상 시행규칙 제44조(소득월액 산정)에 있고 공단이 피부양자 판정에도 같은 기준을 씁니다. 법제처 국가법령정보센터가 대조일에 점검 중이어서 별표 본문은 공단 건강Law와 공단 안내 페이지로 대조했습니다. 결과는 참고용이며 최종 판정은 국민건강보험공단(1577-1000)이 합니다.</p>`;

const BADGE = (s) => `<span class="dep-badge ${s}">${DP.DEP_STATUS[s]}</span>`;
const items = (r) => DP.explain(r).map((x) => `<div class="dep-item"><div class="dep-head"><b>${x.title}</b>${BADGE(x.status)}</div>${x.margin ? `<div class="dep-margin">${x.margin}</div>` : ''}${x.lines.map((l) => `<p>${l}</p>`).join('')}</div>`).join('');

/* 빌드 때 계산하는 예시 3가지 */
const CASES = [
  { title: '국민연금 받는 아버지', who: '같이 사는 아버지 · 국민연금 월 150만원(연 1,800만원) · 이자 400만원 · 재산세 과세표준 3억원',
    input: { relation: 'parent', together: true, pension: 18000000, finance: 4000000, property: 300000000 },
    tail: (r) => `연금이 해마다 물가만큼 오르므로 남은 ${manwon(r.income.margin)}이 몇 년 안에 줄어듭니다. 이자·배당이 ${L.fin}을 넘는 해에는 전액이 더해져 한 번에 기준을 넘습니다.` },
  { title: '프리랜서로 일하는 자녀', who: '따로 사는 미혼 자녀 · 사업자등록 없음 · 3.3% 떼고 받는 일의 사업소득금액 620만원 · 재산 없음',
    input: { relation: 'child', together: false, marital: 'single', business: 6200000 },
    tail: () => `소득 합계는 ${L.income}에 한참 못 미치지만, 사업자등록이 없는 사람의 사업소득은 ${L.biz}까지만 인정됩니다. 기준이 되는 금액은 받은 돈 전체가 아니라 필요경비를 뺀 사업소득금액입니다.` },
  { title: '집이 있는 어머니', who: '따로 사는 어머니 · 공무원연금 연 1,200만원 · 재산세 과세표준 6억원',
    input: { relation: 'parent', together: false, pension: 12000000, property: 600000000 },
    tail: () => `재산이 ${L.low} 이하였다면 소득 1,200만원으로도 충족입니다. 과세표준이 ${L.low}을 넘으면서 소득 기준이 ${L.mid}으로 내려가 탈락합니다.` },
];

export function buildDependent(ctx) {
  const { write, shell, crumb, lead, section, list, ad, YEAR } = ctx;
  /* 글이 긴 표 — 숫자 표와 달리 칸 안에서 줄을 바꾼다 (좁은 화면에서 가로로 밀리지 않게) */
  const table = (head, rows) => ctx.table(head, rows).replace('class="tbl"', 'class="tbl dep-tbl"');
  const url = DEP_URL;
  const opt = Object.entries(DP.DEP_RELATIONS).map(([k, v]) => `<option value="${k}"${k === 'parent' ? ' selected' : ''}>${v}</option>`).join('');
  const inp = (id, label, value, hint) => `<label class="ye-f"><span>${label}</span><input id="${id}" type="text" inputmode="numeric" value="${value}">${hint ? `<small class="dep-hint">${hint}</small>` : ''}</label>`;

  const r0 = DP.dependent(CASES[0].input);
  const caseBlocks = CASES.map((c) => {
    const r = DP.dependent(c.input), ex = DP.explain(r);
    const loc = r.verdict === 'fail' ? NH.local({ income: DP.localIncome(r), property: r.property.value }) : null;
    return `<h3 class="dep-case">${c.title} — ${DP.DEP_VERDICT[r.verdict]}</h3>
<p class="sub">${c.who}</p>
${table(['요건', '판정', '근거'], ex.map((x) => ({ cells: [x.title, BADGE(x.status), x.lines.join(' ')] })))}
<p class="sub" style="margin-top:8px">${c.tail(r)}${loc ? ` 지역가입자가 되면 건강보험료와 장기요양보험료를 합쳐 월 ${won(loc.total)}쯤입니다(${loc.approx ? '재산 점수 근사 포함 · ' : ''}혼자 한 세대일 때의 어림).` : ''}</p>`;
  }).join('\n');

  const faq = [
    ['국민연금만 받아도 피부양자에서 빠지나요?', `국민연금·공무원연금·사학연금·군인연금 같은 공적연금은 받은 금액 전액을 소득으로 봅니다. 다른 소득이 없다면 연 ${L.income}, 월로는 약 ${num(Math.floor(DP.DEP_INCOME_LIMIT / 12 / 1000) * 1000)}원을 넘는 순간 탈락합니다. 개인연금·퇴직연금 같은 사적연금은 공단 안내 기준으로 지금은 소득에 넣지 않습니다.`],
    ['예금 이자와 배당도 소득에 들어가나요?', `이자와 배당을 합쳐 연 ${L.fin} 이하면 더하지 않습니다. ${L.fin}을 1원이라도 넘으면 넘는 부분만이 아니라 전액이 더해집니다. 이자 900만원은 0원으로 치지만 1,100만원은 1,100만원으로 칩니다.`],
    ['프리랜서나 부업 소득이 있는 가족은요?', `3.3%를 떼고 받는 돈은 사업소득입니다. 사업자등록이 없으면 필요경비를 뺀 사업소득금액이 연 ${L.biz} 이하일 때만 피부양자가 될 수 있고, 사업자등록이 있으면 사업소득이 조금이라도 있으면 안 됩니다. 주택임대소득은 등록이 없어도 ${L.biz} 예외가 없습니다. 등록 장애인과 국가유공·보훈 상이자는 등록 여부와 상관없이 ${L.biz}까지입니다.`],
    ['재산 기준은 집값(시세)으로 보나요?', `시세도 공시가격도 아니고 재산세 과세표준입니다. 주택은 공시가격에 공정시장가액비율(기본 60%, 1세대 1주택은 더 낮은 특례 비율)을 곱한 값이라, 비율이 60%라면 공시가격 9억원이 과세표준 ${L.low}에 해당합니다. 토지·건물·주택을 모두 더하며, 정확한 금액은 7월·9월 재산세 고지서나 위택스에 나옵니다.`],
    ['부부 가운데 한 사람만 기준을 넘으면요?', `기혼자는 부부가 모두 소득요건을 채워야 합니다. 부모님 두 분이 자녀의 피부양자일 때 아버지의 연금이 ${L.income}을 넘으면 소득이 없는 어머니도 함께 빠집니다.`],
  ];

  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebApplication', name: '건강보험 피부양자 자격 판정기', url: `https://donpyo.com${url}`, applicationCategory: 'FinanceApplication', operatingSystem: 'Any', inLanguage: 'ko', description: `관계, 소득 종류별 금액, 사업자등록 여부, 재산세 과세표준을 넣으면 건강보험 피부양자 부양·소득·재산요건을 하나씩 판정합니다(${DP.DEP_ASOF}).`, offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, isPartOf: { '@type': 'WebSite', name: '돈표', url: 'https://donpyo.com' } },
    { '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ] };

  const body = `
${crumb([['/', '홈'], ['/nhis/', '건강보험료'], [null, '피부양자 자격']])}
<h1 class="title">건강보험 피부양자 자격 판정기 — 소득·재산·부양요건</h1>
<p class="meta">${DP.DEP_ASOF} · 국민건강보험법 시행규칙 별표 1·별표 1의2 · 참고용 · 입력값은 이 기기 밖으로 나가지 않습니다</p>
${lead(`직장가입자의 가족이 피부양자가 되려면 부양요건, 소득요건, 재산요건을 모두 채워야 합니다. 소득은 합계 연 ${L.income} 이하, 재산은 재산세 과세표준 ${L.low} 이하(${L.high}까지는 소득 ${L.mid} 이하)가 기준입니다. 아래에 피부양자가 되려는 사람의 숫자를 넣으면 요건마다 충족 여부와 기준까지 남은 금액을 보여 줍니다.`)}
<form class="quick ye-form" id="dp-form">
<div class="ye-grid">
<label class="ye-f"><span>직장가입자와의 관계</span><select id="dp-rel">${opt}</select></label>
<label class="ye-f"><span>같이 사는지</span><select id="dp-live"><option value="1" selected>같이 삶</option><option value="0">따로 삶</option></select></label>
<label class="ye-f" id="dp-marital-f" hidden><span>혼인 상태</span><select id="dp-marital"><option value="single" selected>미혼</option><option value="married">기혼</option><option value="divorced">이혼·사별</option></select></label>
<label class="ye-f" id="dp-age-f" hidden><span>나이 (만, 세)</span><input id="dp-age" type="text" inputmode="numeric" value="28"></label>
</div>
<div class="ye-grid">
${inp('dp-pension', '공적연금 연 수령액 (만원)', 1800, '국민·공무원·사학·군인연금. 월 150만원이면 1800')}
${inp('dp-wage', '근로소득 총급여 (만원)', 0, '비과세를 뺀 1년 급여')}
${inp('dp-biz', '사업소득금액 (만원)', 0, '수입에서 필요경비를 뺀 금액')}
${inp('dp-fin', '이자·배당 합계 (만원)', 400, '')}
${inp('dp-other', '기타소득금액 (만원)', 0, '강연료·원고료 등에서 필요경비를 뺀 금액')}
${inp('dp-prop', '재산세 과세표준 합계 (만원)', 30000, '시세가 아니라 고지서의 과세표준')}
</div>
<div class="ye-checks"><label><input type="checkbox" id="dp-reg"> 사업자등록 있음</label><label><input type="checkbox" id="dp-rental"> 주택임대소득 있음</label><label><input type="checkbox" id="dp-dis"> 등록 장애인·국가유공·보훈 상이자</label><label id="dp-spouse-f"><input type="checkbox" id="dp-spouse"> 기혼이고 배우자가 소득요건을 넘음</label></div>
</form>
<div class="hero dep-${r0.verdict}" id="dp-hero"><div class="hero-label">판정 결과 · 참고용</div><div class="dep-verdict" id="dp-verdict">${DP.DEP_VERDICT[r0.verdict]}</div><div class="hero-sub" id="dp-sub">최종 판정은 국민건강보험공단이 합니다</div></div>
<div class="dep-list" id="dp-items">${items(r0)}</div>
<div id="dp-next"></div>
<noscript><div class="callout">판정기는 자바스크립트가 켜져 있어야 움직입니다. 아래 기준표와 예시는 그대로 볼 수 있습니다.</div></noscript>
${section('기준 한눈에', `${DP.DEP_ASOF} · 세 요건을 모두 채워야 합니다 · 기준액은 "이하"라 딱 그 금액이면 충족`, table(['요건', '기준'], [
    { cells: ['소득 합계', `연 ${L.income} 이하 (이자·배당·사업·근로·연금·기타소득)`] },
    { cells: ['이자·배당', `합계 ${L.fin} 이하면 더하지 않음 · 넘으면 전액`] },
    { cells: ['근로·연금', '총급여와 공적연금 수령액 전액 (사적연금은 넣지 않음)'] },
    { cells: ['사업소득', `없어야 함 · 사업자등록이 없거나 장애인·상이자면 연 ${L.biz} 이하까지 · 주택임대소득은 예외 없음`] },
    { cells: ['기혼자', '부부 모두 소득요건 충족'] },
    { cells: ['재산', `재산세 과세표준 ${L.low} 이하 · ${L.low} 초과 ${L.high} 이하는 소득 연 ${L.mid} 이하일 때만 · ${L.high} 초과는 불가`] },
    { cells: ['형제자매', `${DP.DEP_SIBLING_YOUNG}세 미만·${DP.DEP_SIBLING_OLD}세 이상·장애인·상이자인 미혼 형제자매 · 재산세 과세표준 ${L.sib} 이하`] },
  ]) + `<p class="sub" style="margin-top:8px">소득 기준은 2022년 9월 건강보험료 2단계 개편 때 연 3,400만원에서 ${L.income}으로 낮아졌습니다. 재산 기준 ${L.low}·${L.high}은 그대로입니다.</p>`)}
${section('관계별 부양요건', '시행규칙 별표 1 · "보수·소득이 없을 것" 같은 조건은 공단이 가족관계와 자료로 확인합니다', table(['관계', '같이 살 때', '따로 살 때'], [
    { cells: ['배우자', '인정', '인정'] },
    { cells: ['부모 · 배우자의 부모', '인정', '부모와 같이 사는 형제자매가 없거나, 있어도 보수·소득이 없으면 인정'] },
    { cells: ['조부모 · 배우자의 조부모', '인정', '조부모와 같이 사는 자녀·손자녀가 없거나, 있어도 보수·소득이 없으면 인정'] },
    { cells: ['자녀', '인정', '미혼이면 인정 (이혼·사별은 자녀가 없거나 그 자녀에게 보수·소득이 없을 때)'] },
    { cells: ['손자녀', '부모가 없거나, 있어도 보수·소득이 없으면 인정', '미혼이고 부모가 없으면 인정'] },
    { cells: ['사위·며느리', '인정', '불인정'] },
    { cells: ['배우자의 자녀', '미혼이면 인정', '불인정'] },
    { cells: ['형제자매', '미혼이고 부모가 없거나, 있어도 보수·소득이 없으면 인정', '미혼이고 부모·다른 형제자매가 없거나, 있어도 보수·소득이 없으면 인정'] },
  ]))}
${ad()}
${section('예시로 보기', `위 판정기와 같은 계산을 빌드 때 돌린 결과 · ${DP.DEP_ASOF}`, caseBlocks)}
${section('피부양자에서 빠지면', null, `<div class="doc">
<p><b>지역가입자로 바뀝니다.</b> 공단이 요건을 채우지 못한다고 확인한 날의 다음 날 피부양자 자격을 잃고(시행규칙 제2조제3항), 그때부터 지역가입자로 보험료를 냅니다. 사업소득이나 근로소득이 새로 생겨 빠지는 경우에는 상실일이 달라질 수 있어, 정확한 날짜는 공단 통지서로 확인해야 합니다.</p>
<p><b>자료는 해마다 11월에 바뀝니다.</b> 공단 안내에 따르면 재산은 6월 1일 기준 재산세 과세자료를 그해 11월부터 다음 해 10월까지 쓰고, 소득도 11월부터 전년도 자료로 바뀝니다. 지난해 소득이 늘었거나 올해 과세표준이 올랐다면 이 무렵 자격을 다시 확인받게 됩니다.</p>
<p><b>보험료는 소득과 재산 모두에 붙습니다.</b> 지역가입자는 소득에 ${NH.HEALTH_PCT}를 매기고(근로·연금소득은 50%만 반영) 재산에는 점수를 매겨 전액을 스스로 냅니다. 얼마가 될지는 <a href="/nhis/?t=local">건강보험료 계산기</a>에서 볼 수 있습니다.</p>
<p><b>요건을 다시 채우면 돌아올 수 있습니다.</b> 소득이 줄거나 재산을 정리해 기준 안으로 들어오면 직장가입자가 피부양자 자격취득 신고를 다시 하면 됩니다. 자격이 바뀐 날부터 90일 안에 신고하면 그날로 소급되고, 넘기면 신고한 날부터 인정됩니다(시행규칙 제2조제2항).</p>
</div>`)}
${section('자주 묻는 것', null, `<div class="doc">${faq.map(([q, a]) => `<p><b>${q}</b> ${a}</p>`).join('\n')}</div>`)}
${section('출처', `원문 대조일 ${DP.DEP_CHECKED}`, `<div class="doc">${depSourceList()}
<p>확인하지 못한 것도 있습니다. 주택재건축 사업소득 예외, 외국인·재외국민의 체류 요건, 소득 자료가 실제로 반영되는 달은 이 판정기에 넣지 않았습니다. 부양요건 가운데 다른 가족의 보수·소득에 달린 조건은 "확인 필요"로만 표시합니다.</p></div>`)}
${section('이어서 계산하기', null, list([
    { href: '/nhis/?t=local', title: '지역가입자 건강보험료 계산', sub: '피부양자에서 빠지면 낼 보험료' },
    { href: '/pension/', title: '국민연금 예상 수령액', sub: `연 ${L.income}을 넘을지 미리 보기` },
    { href: '/property-tax/', title: '재산세 계산', sub: '공시가격으로 과세표준 어림' },
    { href: '/guide/health-insurance-guide/', title: '건강보험료 계산법', sub: '서재' },
  ]))}
<p class="note">국민건강보험법 제5조제2항, 같은 법 시행규칙 제2조·별표 1·별표 1의2에 따른 ${DP.DEP_ASOF} 판정입니다. 다른 가족의 보수·소득, 공단이 가진 실제 소득·재산 자료, 개별 서류 심사는 반영하지 못하므로 <b>참고용</b>입니다. 최종 판정은 국민건강보험공단이 하며, 누리집(nhis.or.kr)의 '피부양자 취득 가능 여부 조회'나 고객센터 1577-1000에서 확인할 수 있습니다.</p>`;

  write(url, shell({ url, title: `건강보험 피부양자 자격 판정기 — 소득 ${L.income}·재산 ${L.low} 기준 (${YEAR}년)`, desc: `관계, 연금·근로·사업·이자·배당 소득, 사업자등록 여부, 재산세 과세표준을 넣으면 건강보험 피부양자 부양·소득·재산요건을 하나씩 판정하고 기준까지 남은 금액을 보여 줍니다. 소득 연 ${L.income}, 사업소득 ${L.biz}, 재산 ${L.low}·${L.high} 기준과 탈락 시 지역가입자 전환까지. 참고용이며 최종 판정은 건강보험공단이 합니다.`, body, nav: 'monthly', ld, scripts: ['/js/engine.js', '/js/dependent.js'] }));
}
