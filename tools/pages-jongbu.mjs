/* 종합부동산세 페이지 — /jongbu/ (계산기 + 공시가격별 표 + 세율·세액공제) · /jongbu/<만원>/ 공시가격별 25장.
 * 계산은 engine/jongbu.mjs(브라우저 계산기와 같은 코드), 보유세는 engine/property.mjs 의 재산세를 더한다. */
import * as JB from '../engine/jongbu.mjs';
import * as PT from '../engine/property.mjs';
import { num, won, manwon, short } from '../engine/fmt.mjs';

export const JONGBU = [90000, 100000, 110000, 120000, 130000, 140000, 150000, 160000, 170000, 180000, 190000, 200000, 220000, 250000, 270000, 300000, 330000, 350000, 400000, 450000, 500000, 600000, 700000, 800000, 1000000];
const jbUrl = (m) => `/jongbu/${m}/`;
const nearestIn = (arr, v) => arr.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));
const Y = JB.JB_ASOF;
const CREDIT_ROWS = [[0, '해당 없음', { age: 0, years: 0 }], [20, '만 60세 이상 또는 5년 이상 보유', { age: 60, years: 0 }], [40, '만 70세 이상, 10년 이상 보유, 또는 60세 + 5년', { age: 70, years: 0 }], [60, '60세 + 10년, 70세 + 5년 등', { age: 60, years: 10 }], [80, '70세 + 10년, 65세 + 15년 등 (한도)', { age: 70, years: 10 }]];
const NOTE = `<p class="note">${Y}년 귀속 주택분 종합부동산세 기준입니다(종합부동산세법 제8~10조, 같은 법 시행령 제2조의4·제4조의3, 국세청 「${Y}년 종합부동산세 요약표」). 재산세는 표준세율대로 부과됐다고 보고 공제했고, 세부담상한(전년 보유세의 150%)·합산배제 주택·부부 공동명의 특례는 반영하지 않았습니다. 공시가격은 사람별 합계입니다. 실제 세액은 고지서를 기준으로 하세요. <a href="/method/">계산 기준 보기</a></p>`;

function flow(r, P) {
  const rows = [['공시가격 합계', num(P)], ['공제', '−' + num(r.deduct), r.type === 'one' ? '1세대 1주택 12억원' : '그 밖의 개인 9억원'], ['과세표준', num(r.base), '(공시가격 − 공제) × 60%'], ['산출세액', num(r.calc), r.three ? '3주택 이상 — 12억 초과분 2.0~5.0%' : '0.5~2.7% 누진'], ['재산세 공제', '−' + num(r.propDeduct), `과세표준 × ${r.propPct}% × 0.4%`]];
  if (r.creditPct) rows.push([`세액공제 ${r.creditPct}%`, '−' + num(r.credit), '나이·보유 기간']);
  rows.push(['종합부동산세', num(r.tax)], ['농어촌특별세 20%', '+' + num(r.rural)], ['합계', num(r.total)]);
  return rows;
}

export function buildJongbu(ctx) {
  const { write, shell, crumb, lead, hero, section, table, tiles, chips, list, ad, led, neighbors, propUrl, PROP } = ctx;

  function page(m) {
    const P = m * 10000, url = jbUrl(m);
    const a = JB.jongbu(P), b = JB.jongbu(P, { type: 'multi' }), c = JB.jongbu(P, { type: 'multi', three: true });
    const pr = PT.propertyTax(P);
    const title = `공시가격 ${manwon(P)} 종부세 — 1주택 ${won(a.total)} · 다주택 ${won(b.total)} (${Y}년)`;
    const desc = a.total
      ? `공시가격 ${manwon(P)}을 1세대 1주택으로 가지면 종부세는 과세표준 ${manwon(a.base)}에 산출세액 ${won(a.calc)}, 재산세 공제 ${won(a.propDeduct)}를 빼고 농어촌특별세를 더해 ${won(a.total)}입니다. 나이·보유 기간 세액공제(최대 80%), 2주택·3주택 이상 비교, 재산세를 더한 보유세까지.`
      : `공시가격 ${manwon(P)}은 1세대 1주택이면 공제 12억원 이하라 종부세가 없고, 여러 채를 합산한 금액이면 ${won(b.total)}입니다. 2주택·3주택 이상 비교와 계산 흐름.`;
    const body = `
${crumb([['/jongbu/', '종부세'], [null, `공시가 ${manwon(P)}`]])}
<h1 class="title">공시가격 ${manwon(P)} 종합부동산세</h1>
<p class="meta">${Y}년 귀속 · 과세기준일 6월 1일 · 12월 1~15일 납부 · 농어촌특별세 포함</p>
${lead(a.total
  ? `공시가격 ${manwon(P)}인 집 한 채를 1세대 1주택으로 가지면 12억원을 뺀 ${manwon(P - a.deduct)}의 60%인 ${manwon(a.base)}이 과세표준입니다. 세율을 곱한 ${won(a.calc)}에서 재산세로 이미 낸 몫 ${won(a.propDeduct)}를 빼면 종부세 ${won(a.tax)}, 농어촌특별세 ${won(a.rural)}을 더해 ${won(a.total)}입니다. 재산세 ${won(pr.total)}까지 합친 보유세는 1년에 ${won(pr.total + a.total)}입니다.`
  : `공시가격 ${manwon(P)}인 집 한 채를 1세대 1주택으로 가지면 공제 12억원을 넘지 않아 종부세가 없습니다. 다만 두 채 이상을 합산한 공시가격이 ${manwon(P)}이면 공제가 9억원이라 ${won(b.total)}을 냅니다.`)}
${hero({ label: '1세대 1주택 종부세 (농어촌특별세 포함 · 세액공제 전)', value: a.total, sub: a.total ? `재산세까지 보유세 ${won(pr.total + a.total)} · 12월에 한 번${a.installment ? ' · 250만원이 넘어 분납 가능' : ''}` : '공제 12억원 이하라 종부세 없음' })}
${a.total ? led('계산 흐름 (1세대 1주택)', '원', flow(a, P)) : led('계산 흐름 (다주택 합산)', '원', flow(b, P))}
${a.calc ? section('나이·보유 기간 세액공제를 받으면', '1세대 1주택 · 농어촌특별세 포함', table(['세액공제', '해당', '종부세 합계'], CREDIT_ROWS.map(([p, label, o]) => ({ cls: p === 0 ? 'on' : '', cells: [`${p}%`, label, num(JB.jongbu(P, o).total)] })))) : ''}
${section('1주택 · 2주택 이하 · 3주택 이상', `공시가격 합계 ${manwon(P)}`, table(['구분', '1세대 1주택', '2주택 이하', '3주택 이상'], [
  { cells: ['공제', num(a.deduct), num(b.deduct), num(c.deduct)] }, { cells: ['과세표준', num(a.base), num(b.base), num(c.base)] }, { cells: ['산출세액', num(a.calc), num(b.calc), num(c.calc)] },
  { cells: ['재산세 공제', num(a.propDeduct), num(b.propDeduct), num(c.propDeduct)] }, { cells: ['종부세', num(a.tax), num(b.tax), num(c.tax)] }, { cells: ['농어촌특별세', num(a.rural), num(b.rural), num(c.rural)] },
  { cls: 'on', cells: ['합계', num(a.total), num(b.total), num(c.total)] },
]))}
${a.total ? section('보유세 합계 (1세대 1주택)', '재산세는 7월·9월, 종부세는 12월', tiles([{ label: '재산세 (도시지역분·교육세 포함)', value: pr.total }, { label: '종부세 (농특세 포함)', value: a.total }, { label: '1년 보유세', value: pr.total + a.total }])) : ''}
${section('공시가격이 바뀌면', '1세대 1주택 · 세액공제 전', chips(neighbors(JONGBU, m, 3).map((x) => ({ label: short(x * 10000), value: JB.jongbu(x * 10000).total, href: jbUrl(x), on: x === m }))))}
${ad()}
${section('알아두면 좋은 것', null, `<div class="doc">
<p><b>공시가격 합계로 봅니다.</b> 종부세는 사람마다 6월 1일 현재 가진 주택의 공시가격을 모두 더해 매깁니다. 여러 채라면 이 페이지의 금액을 합계로 읽으세요.</p>
<p><b>부부 공동명의 한 채라면</b> 각자 9억원씩 공제받거나, 9월 16~30일에 신청해 1세대 1주택처럼 12억원 공제와 세액공제를 받을 수 있습니다. 둘 중 세금이 적은 쪽을 고르면 됩니다.</p>
${a.total && a.total >= b.total ? `<p><b>세액공제 전 금액은 1주택이 2주택 이하${a.total === b.total ? '와 같습니다' : '보다 많습니다'}.</b> 1세대 1주택은 재산세 공제에 쓰는 공정시장가액비율이 45%로 다주택(60%)보다 낮아서, 공시가격이 100억원에 이르면 12억원 공제로 얻는 이점이 재산세 공제 차이로 모두 상쇄됩니다. 나이·보유 기간 세액공제를 받으면 다시 1주택 쪽이 적어집니다.</p>` : ''}
<p><b>250만원이 넘으면 나눠 낼 수 있습니다.</b> 12월 1~15일 납부기한 뒤 6개월 안에, 500만원 이하는 250만원을 넘는 부분을, 그보다 많으면 절반까지 나중에 냅니다.${a.installment ? ` 세액공제가 없으면 ${won(a.installment)}(농특세는 같은 비율)을 나눠 낼 수 있습니다.` : ''}</p>
<p><b>내년에는 바뀔 수 있습니다.</b> 정부가 ${Y}년 8월 발표한 세제개편안(2027년 귀속부터, 국회 통과 전)은 공제·공정시장가액비율·세율을 바꾸는 내용이라, 확정되면 다시 반영합니다.</p>
</div>`)}
${section('이어서 계산하기', null, list([{ href: propUrl(nearestIn(PROP, m)), title: '주택 재산세', sub: '7월·9월에 따로 내는 지방세' }, { href: '/capgain/', title: '양도소득세', sub: '팔 때 · 1주택 12억까지 비과세' }, { href: '/jongbu/', title: '종부세 계산기', sub: '나이·보유 기간을 넣고 바로' }]))}
${NOTE}`;
    write(url, shell({ url, title, desc, body, nav: 'loan' }));
  }

  function index() {
    const inp = (id, label, value) => `<label class="ye-f"><span>${label}</span><input id="${id}" type="text" inputmode="decimal" value="${value}"></label>`;
    const row = (id, label, small) => `<div class="lg-row"><div class="lbl"><span>${label}</span><small id="${id}-l">${small}</small></div><span class="num" id="${id}">0</span></div>`;
    const ex = JB.jongbu(2000000000);
    const rows = JONGBU.map((m) => { const P = m * 10000; return { cells: [`<a href="${jbUrl(m)}">${manwon(P)}</a>`, num(JB.jongbu(P).total), num(JB.jongbu(P, { age: 70, years: 10 }).total), num(JB.jongbu(P, { type: 'multi' }).total), num(JB.jongbu(P, { type: 'multi', three: true }).total)] }; });
    const body = `
${crumb([['/', '홈'], [null, '종합부동산세']])}
<h1 class="title">종합부동산세 계산기</h1>
<p class="meta">${Y}년 귀속 주택분 · 과세기준일 6월 1일 · 12월 1~15일 납부 · 농어촌특별세 포함</p>
<form class="quick ye-form" id="jb-form">
<div class="ye-grid">
${inp('jb-price', '공시가격 합계 (억원)', '20')}
${inp('jb-age', '만 나이', '55')}
${inp('jb-years', '보유 기간 (년)', '5')}
</div>
<div class="ye-checks"><label><input type="radio" name="jb-type" value="one" checked> 1세대 1주택</label><label><input type="radio" name="jb-type" value="multi"> 2주택 이하</label><label><input type="radio" name="jb-type" value="three"> 3주택 이상</label></div>
</form>
<div class="hero"><div class="hero-label">종합부동산세 (농어촌특별세 포함)</div><div class="hero-num"><span class="num" id="jb-total">${num(ex.total)}</span><span class="unit">원</span></div><div class="hero-sub" id="jb-sub"></div></div>
<div class="ledger"><div class="lg-head"><h2>계산 흐름</h2><span>원</span></div>
${row('jb-deduct', '공제', '1세대 1주택 12억원')}
${row('jb-base', '과세표준', '(공시가격 − 공제) × 60%')}
${row('jb-calc', '산출세액', '0.5~2.7% 누진')}
${row('jb-prop', '재산세 공제', '과세표준 × 45% × 0.4%')}
${row('jb-credit', '세액공제', '나이·보유 기간')}
${row('jb-tax', '종합부동산세', '')}
${row('jb-rural', '농어촌특별세 20%', '종부세의 20%')}
<div class="lg-total"><span>합계</span><span class="num" id="jb-total2">0</span></div></div>
<div id="jb-extra"></div>
${lead(`종합부동산세는 6월 1일에 가진 주택의 공시가격을 사람마다 더해, 1세대 1주택은 12억원·그 밖에는 9억원을 넘는 부분에 매기는 국세입니다. 넘는 금액의 60%(공정시장가액비율)가 과세표준이고, 세율을 곱한 뒤 재산세로 이미 낸 몫을 빼고 농어촌특별세 20%를 더합니다. 공시가 20억원 한 채를 1세대 1주택으로 가졌다면 ${won(ex.total)}입니다.`)}
${section('공시가격별 종부세', '원 · 농어촌특별세 포함 · 금액을 누르면 계산 흐름', table(['공시가격 (합계)', '1주택 공제 없음', '1주택 세액공제 80%', '2주택 이하', '3주택 이상'], rows))}
${ad()}
${section('세율', '과세표준 기준 · 세액 = 과세표준 × 세율 − 누진공제', table(['과세표준', '2주택 이하', '3주택 이상'], [
  { cells: ['3억원 이하', '0.5%', '0.5%'] }, { cells: ['6억원 이하', '0.7% (60만원)', '0.7% (60만원)'] }, { cells: ['12억원 이하', '1.0% (240만원)', '1.0% (240만원)'] }, { cells: ['25억원 이하', '1.3% (600만원)', '2.0% (1,440만원)'] },
  { cells: ['50억원 이하', '1.5% (1,100만원)', '3.0% (3,940만원)'] }, { cells: ['94억원 이하', '2.0% (3,600만원)', '4.0% (8,940만원)'] }, { cells: ['94억원 초과', '2.7% (1억 180만원)', '5.0% (1억 8,340만원)'] },
]))}
${section('1세대 1주택 세액공제', '둘을 더해 80%까지', table(['나이 (만)', '공제율', '보유 기간', '공제율'], [
  { cells: ['60세 이상', '20%', '5년 이상', '20%'] }, { cells: ['65세 이상', '30%', '10년 이상', '40%'] }, { cells: ['70세 이상', '40%', '15년 이상', '50%'] },
]))}
${section('계산 순서', null, `<div class="doc">
<p><b>1. 공제.</b> 사람별 공시가격 합계에서 1세대 1주택은 12억원, 그 밖의 개인은 9억원을 뺍니다. 법인은 공제가 없습니다.</p>
<p><b>2. 과세표준.</b> 남은 금액에 공정시장가액비율 60%를 곱합니다.</p>
<p><b>3. 세율.</b> 2주택 이하는 0.5~2.7% 누진세율, 3주택 이상은 과세표준 12억원을 넘는 부분부터 2.0~5.0%를 씁니다. 법인은 2.7%·5.0% 단일세율입니다.</p>
<p><b>4. 재산세 공제.</b> 같은 부분에 이미 매겨진 재산세를 뺍니다. 과세표준 × 재산세 공정시장가액비율(1세대 1주택 45%, 그 밖 60%) × 0.4%입니다.</p>
<p><b>5. 세액공제와 농특세.</b> 1세대 1주택이면 나이·보유 기간 공제를 빼고, 남은 종부세의 20%를 농어촌특별세로 더합니다.</p>
</div>`)}
${section('자주 묻는 것', null, `<div class="doc">
<p><b>언제 내나요?</b> 12월 1일부터 15일까지 냅니다. 고지서는 보통 11월 말에 나오고, 250만원이 넘으면 6개월 안에 나눠 낼 수 있습니다.</p>
<p><b>공시가 12억원 한 채는요?</b> 1세대 1주택이면 12억원까지 공제라 종부세가 없습니다. 재산세만 7월과 9월에 냅니다.</p>
<p><b>부부 공동명의는 어떻게 되나요?</b> 각자 9억원씩(합계 18억원) 공제받거나, 9월 16~30일에 신청해 1세대 1주택처럼 12억원 공제와 세액공제를 받을 수 있습니다.</p>
<p><b>2027년에도 같나요?</b> 정부가 ${Y}년 8월 발표한 세제개편안이 국회를 통과하면 2027년 귀속부터 공제·공정시장가액비율·세율이 바뀝니다. 확정되면 이 계산기도 바꿉니다.</p>
</div>`)}
<script>window.JB_PAGES=${JSON.stringify(JONGBU)}</script>
${NOTE}`;
    write('/jongbu/', shell({ url: '/jongbu/', title: `종합부동산세 계산기 — 공시가격별 1주택·다주택 종부세와 세액공제 (${Y}년 귀속)`, desc: `공시가격 합계와 나이·보유 기간을 넣으면 ${Y}년 종합부동산세를 바로 계산합니다. 1세대 1주택 12억·다주택 9억 공제, 공정시장가액비율 60%, 재산세 공제와 세액공제(최대 80%), 농어촌특별세까지. 공시가격별 표 포함.`, body, nav: 'loan', scripts: ['/js/engine.js', '/js/jongbu.js'] }));
  }

  index();
  JONGBU.forEach(page);
}
