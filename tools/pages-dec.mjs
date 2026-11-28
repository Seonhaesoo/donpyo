/* 2026-11-28 12월용 두 장 — 한 주제 한 페이지(숫자별 페이지는 만들지 않음)
 *  /overseas-stock/  해외주식 양도소득세 계산기 — 연말 손실 정리·250만원 공제 채우기 (engine/overseas.mjs)
 *  /median-income/   2027 기준 중위소득 — 우리 집은 몇 %? (engine/median.mjs, 복지부 2026-07-28 보도자료)
 *  /wolse/           월세 세액공제 계산기 — 결정세액 한도·표준세액공제까지 반영한 '실제로 줄어드는 세금' (engine/wolse.mjs) */
import * as OS from '../engine/overseas.mjs';
import * as MD from '../engine/median.mjs';
import * as WS from '../engine/wolse.mjs';
import { num, won, manwon } from '../engine/fmt.mjs';

const ext = (href, text) => `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;
const inp = (id, label, value, ph = '') => `<label class="ye-f"><span>${label}</span><input id="${id}" type="text" inputmode="numeric" value="${value}"${ph ? ` placeholder="${ph}"` : ''}></label>`;
const LAW_INCOME = 'https://www.law.go.kr/법령/소득세법';

export function buildDec(ctx) {
  const { write, shell, crumb, lead, section, table, tiles, list, ad } = ctx;

  /* ---------- 해외주식 양도세 ---------- */
  {
    const url = '/overseas-stock/', MOD = '2026-11-28';
    const ex = OS.overseasPlan(10000000, 3000000, 0);
    const exR = OS.overseasPlan(1000000, 0, 1500000);
    const gains = [3000000, 5000000, 10000000, 20000000, 30000000, 50000000, 100000000];
    const rows = gains.map((g) => { const t = OS.overseasTax(g); return { cells: [manwon(g), num(t.base), `<b>${num(t.total)}</b>`] }; });
    const body = `
${crumb([['/', '홈'], [null, '해외주식 양도세']])}
<h1 class="title">해외주식 양도세 계산기 — 연말에 손실 정리하면 얼마 줄까</h1>
<p class="meta">${2026}년 귀속 · 기본공제 연 250만원 · 세율 22%(양도소득세 20% + 지방소득세 2%) · 결제일 기준 · 신고 2027년 5월 1~31일</p>
${tiles([{ label: '기본공제 (1년)', value: '250만원' }, { label: '세율', value: '22%' }, { label: '1,000만원 벌면', value: won(OS.overseasTax(10000000).total) }])}
${lead(`해외주식은 1년 동안 판 종목의 <b>이익과 손실을 모두 더한 뒤</b> 250만원을 빼고 22%를 매깁니다. 그래서 연말 전에 손실 난 종목을 팔면 그만큼 세금이 줄고, 이익이 250만원에 못 미치면 남은 공제만큼 이익을 확정해 둘 수 있습니다. 손실은 다음 해로 넘어가지 않으니 <b>올해 안에(결제일 기준)</b> 정리해야 합니다. 1,000만원을 벌고 손실 300만원을 정리하면 세금이 ${won(ex.now.total)}에서 ${won(ex.afterLoss.total)}으로 ${won(ex.saveByLoss)} 줄어듭니다.`)}
<form class="quick ye-form" id="os-form">
<div class="ye-grid">
${inp('os-gain', '올해 이미 판 것의 이익 합계 (만원 · 손실은 빼고)', '1,000')}
${inp('os-loss', '지금 팔면 확정되는 손실 (만원 · 선택)', '', '300')}
${inp('os-harvest', '지금 팔면 확정되는 이익 (만원 · 선택)', '', '0')}
</div>
<p class="sub" style="margin-top:4px">증권사 앱의 '해외주식 양도소득 조회'(이름은 증권사마다 다름)에 올해 결제된 손익이 나옵니다. 수수료를 뺀 원화 금액을 넣으세요. 여러 증권사를 쓰면 모두 더합니다.</p>
</form>
<div class="hero"><div class="hero-label" id="os-label">지금 그대로면 낼 세금</div><div class="hero-num"><span class="num" id="os-result">0</span><span class="unit">원</span></div><div class="hero-sub" id="os-sub">계산 중</div></div>
<div id="os-tips"></div>
${section('이익별 세금', '손익을 더한 뒤 금액 · 원 · 지방소득세 포함 22%', table(['올해 이익', '과세표준', '세금 (22%)'], rows) + '<p class="sub">세금 = 과세표준 × 20%(양도소득세) + 2%(지방소득세).</p>')}
${section('올해분으로 치는 마지막 날', '체결일이 아니라 결제일 기준', `<div class="doc">
<p><b>결제가 12월 31일 안에 끝나야 올해 손익입니다.</b> 미국 주식은 2024년 5월부터 거래 다음 날 결제(T+1)라 체결과 결제 사이에 하루가 있고, 한국 시간·현지 휴장일이 끼면 더 벌어집니다. 2026년은 미국 주식 기준 12월 마지막 주 초(28~29일 무렵)를 마지막 매도일로 안내하는 곳이 많지만 시장과 증권사마다 다르니, <b>거래하는 증권사의 연말 공지</b>를 꼭 확인하고 여유 있게 파세요. 날짜를 넘긴 매도는 2027년 손익이 됩니다.</p>
<p><b>원화 환산은 결제일 환율로.</b> 산 날과 판 날 각각의 결제일 기준환율로 바꾸므로, 달러로는 본전이어도 환율이 올랐다면 원화 이익이 생겨 세금이 붙을 수 있습니다.</p>
</div>`)}
${ad()}
${section('연말에 할 수 있는 것', null, `<div class="doc">
<p><b>① 손실 종목 정리.</b> 평가손실이 난 종목을 올해 안에 팔면 이익에서 빠집니다. 같은 종목을 계속 갖고 싶다면 판 뒤 다시 사는 경우가 많은데, 매매·환전 비용이 들고 그사이 값이 움직일 수 있습니다.</p>
<p><b>② 250만원 공제 채우기.</b> 올해 이익이 250만원보다 적다면 남은 공제만큼 이익 종목을 팔아 확정해도 세금이 없습니다. 다시 사면 취득가가 올라가 다음에 팔 때 그만큼 세금이 줄어듭니다(예: 이익 100만원이면 150만원을 더 확정해 나중 세금 ${won(exR.nextYearSave)}을 아낌). 공제는 해마다 새로 생기고 쓰지 않으면 사라집니다.</p>
<p><b>③ 국내 과세 대상 주식과 합산.</b> 대주주 지분이나 비상장주식처럼 국내에서도 양도세를 내는 주식이 있으면 해외주식과 손익을 합쳐 계산합니다. 일반 개인의 상장주식 장내 매매는 양도세 대상이 아니라 합산하지 않습니다.</p>
</div>`)}
${section('신고와 납부', '2027년 5월 1~31일', `<div class="doc">
<p>해외주식 양도세는 원천징수가 없어 <b>다음 해 5월에 직접 신고·납부</b>합니다. 홈택스에서 할 수 있고, 여러 증권사가 무료 신고 대행을 받습니다(보통 3~4월에 신청). 이익이 250만원 이하면 낼 세금이 없지만, 손익이 있었다면 신고해 두는 편이 안전합니다.</p>
<p>기한 안에 신고하지 않으면 무신고 가산세(일반적으로 산출세액의 20%)와 납부지연 가산세가 붙습니다. 세금이 1,000만원을 넘으면 일부를 나눠 낼 수 있습니다.</p>
</div>`)}
${section('이어서 계산하기', null, list([
  { href: '/capgain/', title: '부동산 양도세 계산기', sub: '1세대 1주택 비과세·장기보유특별공제' },
  { href: '/income-tax/', title: '종합소득세 계산기', sub: '5월 신고 때 함께 보는 세율표' },
  { href: '/nhis/dependent/', title: '건강보험 피부양자 판정', sub: '주식 소득과 피부양자 기준' },
]))}
<p class="note">${ext(LAW_INCOME, '소득세법')}의 국외주식 양도소득(기본공제 연 250만원, 세율 20%)과 지방소득세 2%로 계산한 추정입니다. 손익은 증권사가 결제일 환율로 계산한 원화 금액을 넣는 것을 전제로 하며, 파생상품·ETF 분배금·배당은 넣지 않았습니다. 연말 마지막 매도일은 증권사 공지가 기준입니다. <a href="/method/">계산 기준 보기</a></p>`;
    const title = '해외주식 양도세 계산기 — 250만원 공제·22%, 연말 손실 정리하면 얼마 줄까 (2026년 귀속)';
    const desc = `해외주식 양도소득세를 바로 계산합니다. 올해 이익에서 250만원을 빼고 22%(지방소득세 포함). 손실 종목을 연말에 정리하면 줄어드는 세금, 남은 공제로 이익을 확정하는 법, 결제일 기준 마감과 5월 신고까지. 1,000만원 벌면 ${won(OS.overseasTax(10000000).total)}.`;
    write(url, shell({ url, modified: MOD, title, desc, body, nav: 'salary', scripts: ['/js/engine.js', '/js/overseas.js'] }));
  }

  /* ---------- 2027 기준 중위소득 ---------- */
  {
    const url = '/median-income/', MOD = '2026-11-28', Y = 2027;
    const N = [1, 2, 3, 4, 5, 6];
    const medRows = N.map((n) => { const a = MD.medianOf(2026, n), b = MD.medianOf(Y, n); return { cells: [`${n}인`, `<b>${num(b)}</b>`, num(a), `+${num(b - a)}`] }; });
    /* 휴대폰 폭에 맞게 가구원 1~3인 · 4~6인 두 표로 나눈다(열 4개) */
    const half = (rowsOf) => [[1, 2, 3], [4, 5, 6]].map((ns) => table([''].concat(ns.map((n) => `${n}인`)), rowsOf(ns))).join('');
    const benTable = half((ns) => MD.BENEFITS.map((b) => ({ cells: [`${b.label.replace("급여", "")} ${b.pct}%`].concat(ns.map((n) => num(MD.pctAmount(Y, n, b.pct)))) })));
    const pctTable = half((ns) => MD.COMMON_PCTS.map((p) => ({ cells: [`${p}%`].concat(ns.map((n) => num(MD.pctAmount(Y, n, p)))) })));
    const body = `
${crumb([['/', '홈'], [null, `${Y} 기준 중위소득`]])}
<h1 class="title">${Y}년 기준 중위소득 — 우리 집은 몇 %?</h1>
<p class="meta">보건복지부 고시 금액 · ${Y}년 1월부터 · 4인 가구 ${num(MD.medianOf(Y, 4))}원(6.70% 인상) · 원/월</p>
${tiles([{ label: '1인 가구', value: num(MD.medianOf(Y, 1)) }, { label: '3인 가구', value: num(MD.medianOf(Y, 3)) }, { label: '4인 가구', value: num(MD.medianOf(Y, 4)) }])}
${lead(`기준 중위소득은 기초생활보장 급여와 여러 복지·청년 지원 사업이 "중위소득 몇 % 이하" 식으로 대상을 정할 때 쓰는 기준선입니다. ${Y}년 4인 가구는 월 ${won(MD.medianOf(Y, 4))}으로 2026년보다 6.70% 올랐습니다. 아래에 가구원 수와 한 달 소득을 넣으면 몇 %인지 바로 나옵니다. 다만 기초생활보장은 월급이 아니라 재산까지 소득으로 바꿔 더한 <b>소득인정액</b>으로 따지고, 다른 사업들은 건강보험료 등으로 따로 판정하니 결과는 어림으로 보세요.`)}
<form class="quick ye-form" id="md-form">
<div class="ye-grid">
<label class="ye-f"><span>가구원 수</span><select id="md-n">${N.map((n) => `<option value="${n}"${n === 4 ? ' selected' : ''}>${n}인</option>`).join('')}</select></label>
${inp('md-income', '가구의 한 달 소득 (만원 · 세전)', '400')}
</div>
</form>
<div class="hero"><div class="hero-label" id="md-label">${Y}년 기준 중위소득 대비</div><div class="hero-num"><span class="num" id="md-result">0</span><span class="unit">%</span></div><div class="hero-sub" id="md-sub">계산 중</div></div>
<div id="md-tips"></div>
${section(`${Y}년 기준 중위소득`, '원/월 · 보건복지부 2026년 7월 28일 발표', table(['가구원', `${Y}년`, '2026년', '오른 금액'], medRows) + '<p class="sub">7인 이상 가구는 복지부 고시를 확인하세요.</p>')}
${section(`${Y}년 기초생활보장 급여 선정기준`, '원/월 · 소득인정액이 이 금액 이하이면 해당 급여 대상(다른 요건도 함께 봄)', benTable + `<p class="sub">생계급여는 이 선정기준 금액에서 소득인정액을 뺀 만큼 받습니다(예: 1인 가구 최대 ${won(MD.pctAmount(Y, 1, 32))}). 비율은 2026년과 같습니다.</p>`)}
${ad()}
${section('중위소득 몇 %면 얼마', `${Y}년 · 원/월 · 사업 공고에 자주 나오는 비율`, pctTable + '<p class="sub">어느 사업이 몇 %를 쓰는지, 소득을 무엇으로 보는지(건강보험료·소득인정액 등)는 사업 공고마다 다릅니다. 신청 전 해당 공고를 확인하세요.</p>')}
${section('알아두면 좋은 것', null, `<div class="doc">
<p><b>"중위소득"은 평균이 아닙니다.</b> 우리나라 가구를 소득 순서로 줄 세웠을 때 가운데 가구의 소득을 바탕으로 정부가 해마다 정하는 값입니다. ${Y}년부터는 가계금융복지조사 중위소득의 최근 3년 평균 증가율을 반영하는 방식으로 정합니다.</p>
<p><b>소득인정액은 월급과 다릅니다.</b> 기초생활보장에서는 근로소득에서 일부를 공제한 소득평가액에, 집·예금·자동차 같은 재산을 정해진 비율로 소득으로 바꾼 금액을 더합니다. 월급이 기준보다 낮아도 재산이 있으면 대상이 안 될 수 있습니다. 정확한 판정은 주민센터나 복지로(bokjiro.go.kr) 모의계산으로 하세요.</p>
<p><b>건강보험료로 판정하는 사업이 많습니다.</b> 청년·출산·주거 지원 사업 가운데 상당수는 가구의 건강보험료 합계가 중위소득 몇 %에 해당하는지로 봅니다. 건강보험료 계산은 <a href="/nhis/">건강보험료 계산기</a>에서 볼 수 있습니다.</p>
</div>`)}
${section('이어서 계산하기', null, list([
  { href: '/eitc/', title: '근로장려금 계산기', sub: '가구 유형·총급여로 예상액' },
  { href: '/baby-benefit/', title: '출산·양육 지원금', sub: '부모급여·아동수당 등' },
  { href: '/nhis/', title: '건강보험료 계산기', sub: '직장·지역 보험료' },
  { href: '/monthly/', title: '월급 실수령액표', sub: '세전 월급에서 손에 쥐는 돈' },
]))}
<p class="note">출처: ${ext(MD.MEDIAN_SOURCE, '보건복지부 보도자료 「내년 기준 중위소득 6.70% 역대 최대 인상」')}(2026.7.28, 제80차 중앙생활보장위원회 의결). 급여별 선정기준은 기준 중위소득에 비율을 곱해 원 단위로 반올림한 값으로, 보도자료의 1~6인 금액과 같습니다. 이 페이지의 % 계산은 입력한 월 소득을 그대로 나눈 어림이며, 실제 대상 여부는 각 제도의 소득·재산 산정 방식으로 판정합니다. <a href="/method/">계산 기준 보기</a></p>`;
    const title = `${Y} 기준 중위소득표 — 1~6인 가구 금액과 우리 집 몇 % 계산 · 생계·의료·주거·교육급여 기준`;
    const desc = `${Y}년 기준 중위소득 4인 가구 ${num(MD.medianOf(Y, 4))}원(6.70% 인상), 1인 ${num(MD.medianOf(Y, 1))}원. 가구원 수와 월 소득을 넣으면 중위소득 몇 %인지, 생계(32%)·의료(40%)·주거(48%)·교육급여(50%) 선정기준과 50~180% 금액표까지 보건복지부 발표로 정리했습니다.`;
    write(url, shell({ url, modified: MOD, title, desc, body, nav: 'salary', scripts: ['/js/engine.js', '/js/median.js'] }));
  }

  /* ---------- 월세 세액공제 ---------- */
  {
    const url = '/wolse/', MOD = '2026-11-28';
    const SAL = [2800, 3500, 4000, 4500, 5000, 6000, 7000, 8000];
    const cell = (a, r) => { const x = WS.wolseCredit({ annual: a * 10000, rent: r }); return x.eligible ? num(x.save) : '대상 아님'; };
    const rows = SAL.map((a) => ({ cells: [`${num(a)}만`, cell(a, 500000), cell(a, 700000), cell(a, 900000)] }));
    const e45 = WS.wolseCredit({ annual: 45000000, rent: 600000 }), e28 = WS.wolseCredit({ annual: 28000000, rent: 600000 });
    const body = `
${crumb([['/', '홈'], ['/yearend/', '연말정산'], [null, '월세 세액공제']])}
<h1 class="title">월세 세액공제 계산기 — 연말정산에서 얼마 돌려받나</h1>
<p class="meta">2026년 귀속 · 총급여 8,000만원 이하 무주택 세대주 · 연 1,000만원 한도 · 총급여 5,500만원 이하 17% · 그 초과 15% · 지방소득세 10% 별도</p>
${tiles([{ label: '공제율 (총급여 5,500만 이하)', value: '17%' }, { label: '공제율 (5,500만~8,000만)', value: '15%' }, { label: '1년 한도', value: '1,000만원' }])}
${lead(`월세 세액공제는 낸 월세의 15~17%를 세금에서 바로 빼 줍니다. 다만 <b>내가 낼 세금(결정세액)보다 많이 돌려받을 수는 없고</b>, 월세를 받으면 표준세액공제 13만원 대신이라 실제로 줄어드는 금액은 계산해 봐야 압니다. 연봉 4,500만원에 월세 60만원이면 계산상 최대 ${won(e45.maxWithLocal)}(지방소득세 포함)이고 실제로도 ${won(e45.save)} 줄지만, 연봉 2,800만원이면 낼 세금이 적어 ${won(e28.save)}만 줄어듭니다.`)}
<form class="quick ye-form" id="ws-form">
<div class="ye-grid">
${inp('ws-annual', '연봉 (세전 · 만원)', '4,500')}
${inp('ws-rent', '월세 (한 달 · 만원)', '60')}
${inp('ws-months', '올해 낸 달 수', '12')}
${inp('ws-dep', '부양가족 수 (본인 포함)', '1')}
</div>
<div class="ye-checks"><label><input type="checkbox" id="ws-ok" checked> 무주택 세대주(또는 요건을 갖춘 세대원·배우자)이고, 계약서 주소로 전입신고를 했다</label></div>
<p class="sub" style="margin-top:4px">식대 비과세 월 20만원, 카드를 연봉의 40% 쓴 것으로 보고 결정세액을 어림합니다. 정확한 금액은 연말정산 미리보기의 내 숫자로 보세요.</p>
</form>
<div class="hero"><div class="hero-label" id="ws-label">실제로 줄어드는 세금 (지방소득세 포함)</div><div class="hero-num"><span class="num" id="ws-result">0</span><span class="unit">원</span></div><div class="hero-sub" id="ws-sub">계산 중</div></div>
<div id="ws-tips"></div>
${section('연봉·월세별로 줄어드는 세금', '원 · 1년 12개월 · 본인 1인 · 카드 연봉의 40% · 지방소득세 포함 · 결정세액과 표준세액공제를 반영한 실제 차이', table(['연봉', '월세 50만', '월세 70만', '월세 90만'], rows) + '<p class="sub">연봉이 낮을수록 낼 세금 자체가 적어 공제를 다 받지 못합니다. 월세 90만원은 1년 1,080만원이라 1,000만원까지만 셉니다.</p>')}
${section('받을 수 있는 사람', '조세특례제한법 제95조의2', `<div class="doc">
<p><b>① 무주택 세대주</b>: 12월 31일 기준으로 세대원 모두 집이 없어야 합니다. 세대주가 주택 관련 공제를 받지 않았다면 요건을 갖춘 세대원도 받을 수 있고, 2026년 지급분부터는 다른 시·군·구에 따로 사는 배우자도 요건을 갖추면 공제받습니다(부부 합쳐 1,000만원 한도).</p>
<p><b>② 소득</b>: 총급여 8,000만원 이하(종합소득이 있으면 종합소득금액 7,000만원 이하).</p>
<p><b>③ 집</b>: 국민주택규모(전용 85㎡) 이하이거나 기준시가 4억원 이하인 주택. 주거용 오피스텔과 고시원도 됩니다.</p>
<p><b>④ 전입신고</b>: 임대차계약서의 주소와 주민등록 주소가 같아야 합니다. 확정일자는 필수가 아닙니다.</p>
</div>`)}
${ad()}
${section('신청하는 법', null, `<div class="doc">
<p><b>연말정산 때 회사에</b> 임대차계약서 사본과 월세를 낸 증빙(계좌이체 내역 등)을 냅니다. 집주인 동의는 필요 없습니다.</p>
<p><b>회사에 못 냈다면</b> 5월 종합소득세 신고 때 넣거나, 5년 안에 홈택스에서 경정청구로 돌려받을 수 있습니다.</p>
<p><b>요건이 안 되면 현금영수증</b>: 세액공제 요건을 못 채우는 경우에도 홈택스에서 '주택임차료 현금영수증'을 신청하면 월세가 신용카드 등 사용액(30%)에 들어가 소득공제를 받을 수 있습니다. 두 가지를 겹쳐 받지는 않습니다.</p>
</div>`)}
${section('이어서 계산하기', null, list([
  { href: '/yearend/', title: '연말정산 환급 계산기', sub: '월세·카드·연금저축을 함께 넣어서' },
  { href: '/jeonse/', title: '전세 vs 월세', sub: '전세대출 이자와 월세 비교' },
  { href: '/yearend/result/', title: '연말정산 결과 보는 법', sub: '2월 원천징수영수증 읽기' },
]))}
<p class="note">${ext('https://www.law.go.kr/법령/조세특례제한법', '조세특례제한법')} 제95조의2(월세액에 대한 세액공제)와 이 사이트의 연말정산 계산(근로소득공제·기본공제·보험료 특별소득공제·카드 공제·근로소득세액공제·표준세액공제)으로 어림한 값입니다. 다른 세액공제(자녀·연금계좌·의료비 등)가 많으면 결정세액이 줄어 월세 공제를 다 받지 못할 수 있습니다. <a href="/method/">계산 기준 보기</a></p>`;
    const title = '월세 세액공제 계산기 — 연봉·월세별 실제 환급액, 17%·15%·1,000만원 한도 (2026년 귀속)';
    const desc = `월세 세액공제를 바로 계산합니다. 총급여 5,500만원 이하 17%, 8,000만원 이하 15%, 연 1,000만원 한도에 내 결정세액과 표준세액공제까지 반영한 실제로 줄어드는 세금. 연봉 4,500만원·월세 60만원이면 ${won(e45.save)}. 받을 수 있는 사람과 신청법.`;
    write(url, shell({ url, modified: MOD, title, desc, body, nav: 'yearend', scripts: ['/js/engine.js', '/js/wolse.js'] }));
  }
}
