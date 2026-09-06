/* 돈표 페이지 생성기 — node tools/build.mjs → dist/
 * 연봉·월급·실수령 역산·대출·퇴직금·알바 페이지를 금액 격자로 찍어낸다. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { YEAR, RATES, PENSION_SCHEDULE, MONTH_HOURS, WEEKS_PER_MONTH, CONVERSION_CAP, INTEREST_TAX, MIN_WAGE_HISTORY } from '../data/rates.mjs';
import { netPay, insurance, incomeTax, grossForNet } from '../engine/tax.mjs';
import * as L from '../engine/loan.mjs';
import * as R from '../engine/retire.mjs';
import * as U from '../engine/unemploy.mjs';
import * as RK from '../engine/rank.mjs';
import * as LB from '../engine/labor.mjs';
import * as AG from '../engine/age.mjs';
import { AGE_INCOME as AGE } from '../data/age-income.mjs';
import { num, won, manwon, short, pct, rate as fmtRate, rateSlug } from '../engine/fmt.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'dist');
const SITE = 'https://donpyo.com';
const GA_ID = 'G-4M37GXENV1';                       /* GA4 측정 ID — 속성 '돈표' 웹 스트림 (2026-09-06) */
const ADSENSE = 'ca-pub-9924140539322407';
const SAJU = 'https://sajucheop.com';
const R0 = RATES[YEAR];
const PREV = YEAR - 1;
const kst = new Date(Date.now() + 9 * 3600 * 1000);
const BUILD_ISO = kst.toISOString().slice(0, 10);
const t0 = Date.now();
const urls = [];

/* 국민연금 인상 일정용 가상 연도 요율 (다른 요율은 올해 그대로) */
for (const [y, r] of Object.entries(PENSION_SCHEDULE)) if (!RATES[y]) RATES[y] = { ...R0, pension: r };

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n = (v) => `<span class="num">${num(v)}</span>`;
const CHEV = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 3.5L10.5 8 6 12.5" stroke="#8A948E" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
const LOGO = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="2.5" y="2.5" width="19" height="19" rx="4" stroke="#1E5C46" stroke-width="1.6"></rect><path d="M7 9h10M7 12.5h10M7 16h6" stroke="#1E5C46" stroke-width="1.6" stroke-linecap="round"></path></svg>';

function write(url, html) {
  const dir = path.join(OUT, url);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  urls.push(url);
}

function shell(o) {
  const GA = GA_ID ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA_ID}');</script>\n` : '';
  const ADS = ADSENSE ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE}" crossorigin="anonymous"></script>\n` : '';
  const ld = { '@context': 'https://schema.org', '@type': 'WebPage', name: o.title, description: o.desc, url: SITE + o.url, inLanguage: 'ko', isPartOf: { '@type': 'WebSite', name: '돈표', url: SITE } };
  const on = (k) => o.nav === k ? ' class="on"' : '';
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
${GA}${ADS}<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.desc)}">
<link rel="canonical" href="${SITE}${o.url}">
${o.noindex ? '<meta name="robots" content="noindex">\n' : ''}<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=IBM+Plex+Mono:wght@400;500;600&family=Noto+Sans+KR:wght@400;500;700&display=swap">
<link rel="stylesheet" href="/css/style.css">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<meta property="og:title" content="${esc(o.title)}">
<meta property="og:description" content="${esc(o.desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${SITE}${o.url}">
</head>
<body>
<div class="app">
<header class="hdr">
  <a class="brand" href="/">${LOGO}<span class="brand-name">돈표</span></a>
  <nav class="nav"><a href="/salary/"${on('salary')}>연봉</a><a href="/monthly/"${on('monthly')}>월급</a><a href="/loan/"${on('loan')}>대출</a><a href="/retire/"${on('retire')}>퇴직금</a><a href="/unemployment/"${on('unemployment')}>실업급여</a><a href="/hourly/"${on('hourly')}>알바</a></nav>
  <span class="year-pill">${YEAR} 요율</span>
</header>
${o.body}
<footer class="foot">
  <div class="frow"><span>© 돈표 · ${YEAR}년 1월 요율 · 갱신 ${BUILD_ISO}</span><nav><a href="/method/">계산 기준</a><a href="/about/">소개</a><a href="/terms/">이용약관</a><a href="/privacy/">개인정보</a></nav></div>
  <p class="fnote">계산 결과는 참고용입니다. 회사의 비과세 항목·상여·연말정산, 은행별 계산 방식에 따라 실제 금액과 다를 수 있습니다.</p>
</footer>
</div>
<script src="/js/app.js" defer></script>
</body>
</html>`;
}

/* ---------- 조각 ---------- */
const crumb = (items) => `<div class="crumb">${items.map(([h, t]) => h ? `<a href="${h}">${t}</a>` : `<span>${t}</span>`).join('<span>›</span>')}</div>`;
const hero = (o) => `<div class="hero"><div class="hero-label">${o.label}</div><div class="hero-num"><span class="num">${num(o.value)}</span><span class="unit">원</span></div><div class="hero-sub">${o.sub}</div>${o.bars ? `<div class="bar">${o.bars.map((w) => `<i style="width:${(w * 100).toFixed(1)}%"></i>`).join('')}</div><div class="bar-legend"><span>${o.legendL}</span><span>${o.legendR}</span></div>` : ''}</div>`;
const ledger = (title, unit, rows, total) => `<div class="ledger"><div class="lg-head"><h2>${title}</h2><span>${unit}</span></div>${rows.map((r) => `<div class="lg-row"><div class="lbl"><span>${r.label}</span>${r.note ? `<small>${r.note}</small>` : ''}</div>${n(r.value)}</div>`).join('')}${total ? `<div class="lg-total"><span>${total.label}</span>${n(total.value)}</div>` : ''}</div>`;
const tiles = (items) => `<div class="tiles">${items.map((t) => `<div class="tile"><small>${t.label}</small>${n(t.value)}</div>`).join('')}</div>`;
const chips = (items) => `<div class="chips">${items.map((c) => c.on ? `<span class="chip on"><small>${c.label}</small>${n(c.value)}</span>` : `<a class="chip" href="${c.href}"><small>${c.label}</small>${n(c.value)}</a>`).join('')}</div>`;
const cells = (items, cols = 3) => `<div class="grid${cols === 2 ? ' grid-2' : cols === 4 ? ' grid-4' : ''}">${items.map((c) => c.on ? `<span class="cell on"><small>${c.label}</small>${n(c.value)}</span>` : `<a class="cell" href="${c.href}"><small>${c.label}</small>${n(c.value)}</a>`).join('')}</div>`;
const list = (items) => `<div class="list">${items.map((i) => `<a href="${i.href}"><span class="t"><b>${i.title}</b>${i.sub ? `<small>${i.sub}</small>` : ''}</span>${i.value != null ? n(i.value) : CHEV}</a>`).join('')}</div>`;
const section = (title, sub, inner) => `<section class="section"><h2>${title}</h2>${sub ? `<p class="sub">${sub}</p>` : ''}${inner}</section>`;
const ad = () => `<div class="adslot" aria-hidden="true"></div>`;
const table = (head, rows, opts = {}) => `<div class="tbl"><table><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr${r.cls ? ` class="${r.cls}"` : ''}>${r.cells.map((c, i) => `<td${i === 0 ? '' : ''}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

/* ---------- 격자 ---------- */
const SALARIES = [];
for (let m = 2000; m <= 10000; m += 100) SALARIES.push(m);
for (let m = 11000; m <= 20000; m += 1000) SALARIES.push(m);
SALARIES.push(25000, 30000);
const MONTHLIES = []; for (let m = 150; m <= 1000; m += 10) MONTHLIES.push(m);
const NETS = []; for (let m = 150; m <= 800; m += 10) NETS.push(m);
const LOAN_AMOUNTS = [3000, 5000, 7000, 10000, 15000, 20000, 25000, 30000, 40000, 50000, 60000, 70000, 80000, 100000];
const LOAN_YEARS = [10, 15, 20, 25, 30, 35, 40];
const LOAN_RATES = []; for (let r = 2.5; r <= 7.01; r += 0.5) LOAN_RATES.push(Math.round(r * 10) / 1000);
const RETIRE_PAYS = []; for (let m = 200; m <= 1000; m += 50) RETIRE_PAYS.push(m);
const RETIRE_YEARS = [1, 2, 3, 4, 5, 7, 10, 15, 20, 25, 30];
const HOURLY_WAGES = [R0.minWage, 10500, 11000, 12000, 13000, 14000, 15000, 18000, 20000];
const HOURLY_HOURS = [10, 12, 14, 15, 16, 18, 20, 24, 25, 30, 35, 40];
const DEPS = [1, 2, 3, 4];
const NONTAX = [200000, 0];                        /* 기본(식대 20만원 포함)이 앞 — DOM 첫 블록이 기본값이 되게 */
const NT = 200000;                                  /* 기본 비과세 식대 — 사람인·잡코리아 계산기와 같은 기준 */

const nearest = (arr, v) => arr.reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a);
const salaryUrl = (m) => `/salary/${m}/`;
const monthlyUrl = (m) => `/monthly/${m}/`;
const netUrl = (m) => `/net/${m}/`;
const loanUrl = (a, y, r) => `/loan/${a}/${y}/${rateSlug(r)}/`;
const retireUrl = (p, y) => `/retire/${p}/${y}/`;
const hourlyUrl = (w, h) => `/hourly/${w}/${h}/`;
const neighbors = (arr, v, k = 2) => { const i = arr.indexOf(v); return arr.slice(Math.max(0, i - k), i + k + 1); };

/* ---------- 급여 공제 블록 (부양가족 × 비과세 변형) ---------- */
function payVariants(annual) {
  const blocks = [];
  for (const d of DEPS) for (const nt of NONTAX) {
    const p = netPay({ annual, dependents: d, nontax: nt });
    const key = `${d}-${nt}`;
    const rows = [
      { label: '국민연금', note: `${pct(R0.pension, 2)}`, value: p.pension },
      { label: '건강보험', note: `${pct(R0.health, 3)}`, value: p.health },
      { label: '장기요양', note: `건강보험의 ${pct(R0.care, 2)}`, value: p.care },
      { label: '고용보험', note: `${pct(R0.employment, 1)}`, value: p.employment },
      { label: '소득세', note: `간이세액표 · 가족 ${d}인`, value: p.tax },
      { label: '지방소득세', note: '소득세의 10%', value: p.local },
    ];
    blocks.push(`<div data-variant="${key}"${key === `1-${NT}` ? '' : ' hidden'}>
${hero({ label: '월 실수령액', value: p.net, sub: `세전 월급 ${won(p.gross)}에서 ${won(p.deductions)}을 뗀 금액${nt ? ` · 비과세 식대 ${won(nt)} 포함` : ''}`, bars: [p.ratio], legendL: `실수령 ${pct(p.ratio)}`, legendR: `공제 ${pct(1 - p.ratio)}` })}
${ledger('공제 내역', '월 기준 · 원', rows, { label: '공제 합계', value: p.deductions })}
${tiles([{ label: '연 실수령', value: p.annualNet }, { label: '연 공제', value: p.annualDeductions }, { label: '세전 월급', value: p.gross }])}
</div>`);
  }
  return `<div data-variants>
<div class="segrow"><span class="seglabel">부양가족</span><div class="seg" data-dim="d" data-default="1">${DEPS.map((d) => `<button type="button" data-value="${d}">${d === 1 ? '본인' : d + '인'}</button>`).join('')}</div></div>
<div class="segrow"><span class="seglabel">비과세 식대</span><div class="seg" data-dim="n" data-default="${NT}">${NONTAX.map((v) => `<button type="button" data-value="${v}">${v ? '월 20만원' : '없음'}</button>`).join('')}</div></div>
${blocks.join('\n')}
</div>`;
}

function pensionSchedule(annual) {
  const rows = Object.keys(PENSION_SCHEDULE).map(Number).filter((y) => y >= YEAR).map((y) => {
    const p = netPay({ annual, year: y, nontax: NT });
    return { cls: y === YEAR ? 'on' : '', cells: [`${y}년`, pct(PENSION_SCHEDULE[y], 2), num(p.pension), num(p.net)] };
  });
  return table(['연도', '근로자 부담률', '국민연금', '월 실수령'], rows);
}

/* ---------- 연봉 페이지 ---------- */
function salaryPage(m) {
  const annual = m * 10000;
  const p = netPay({ annual, nontax: NT });
  const prev = netPay({ annual, year: PREV, nontax: NT });
  const url = salaryUrl(m);
  const title = `연봉 ${manwon(annual)} 실수령액 — 월 ${won(p.net)} (${YEAR}년)`;
  const desc = `${YEAR}년 연봉 ${manwon(annual)} 실수령액은 월 ${won(p.net)}입니다. 세전 월급 ${won(p.gross)}에서 국민연금·건강보험·장기요양·고용보험·소득세를 뺀 금액이며, 부양가족·비과세 식대별 표와 연봉 인상 시 변화, 대출 한도까지 정리했습니다.`;
  const nb = neighbors(SALARIES, m, 3);
  const rk = RK.rank(annual);
  const raises = [100, 300, 500, 1000].map((r) => { const q = netPay({ annual: annual + r * 10000, nontax: NT }); const diff = q.net - p.net; return { cells: [`+${manwon(r * 10000)}`, num(q.net), num(diff), pct(diff * 12 / (r * 10000))] }; });
  const hourly = p.gross / MONTH_HOURS;
  const dsr = L.dsrLimit(annual, 0.045, 360);
  const loanAmt = nearest(LOAN_AMOUNTS, Math.round(dsr.principal / 10000));
  const body = `
${crumb([['/salary/', '연봉 실수령액'], [null, `${Math.floor(m / 1000)}천만원대`]])}
<h1 class="title">연봉 ${manwon(annual)} 실수령액</h1>
<p class="meta">${YEAR}년 1월 요율 · 국세청 간이세액표 · 부양가족 본인 1인 · 식대 비과세 20만원 포함 기준 — 아래에서 바꿔 보세요</p>
${payVariants(annual)}
<button class="btn btn-share" type="button" data-share-card data-l1="연봉 ${manwon(annual)}" data-l2="${num(p.net)}" data-l3="월 실수령액 · ${YEAR}년 · 식대 20만원 포함" data-l4="근로소득자 중 상위 ${rk.topPct}%">실수령액 카드 저장</button>
${section('근로소득자 중 어디쯤', `국세청 ${RK.STAT.year}년 귀속 연말정산 통계(신고 ${short(RK.STAT.workers)}명 · 중위 ${manwon(RK.STAT.median)} · 평균 ${manwon(RK.STAT.mean)})에 맞춘 추정`, `<div class="tiles"><div class="tile"><small>근로소득자 중</small><span class="num">상위 ${rk.topPct}%</span></div><div class="tile"><small>중위 연봉</small>${n(RK.STAT.median)}</div><div class="tile"><small>평균 연봉</small>${n(RK.STAT.mean)}</div></div>` + list([{ href: '/rank/', title: '연봉 순위표', sub: '상위 1%·10%·30%의 연봉 경계와 계산 방법' }]))}
${section('내 나이대와 비교', `통계청 ${AGE.year}년 임금근로일자리 소득 — 월평균 보수(세전) 기준, 연봉 ÷ 12 = ${won(p.gross)}으로 비교`, table(['나이대', '평균 월소득', '나와 차이', '그 나이대에서 내 위치'], AGE.groups.filter((g) => !['10s', '70s'].includes(g.key)).map((g) => { const r = AG.ageRank(p.gross, g.key); const diff = p.gross - g.mean; return { cells: [g.label, num(g.mean), (diff >= 0 ? '+' : '−') + num(Math.abs(diff)), `상위 ${r.topPct}%`] }; })) + list([{ href: '/age/', title: '나이대별 평균 월급표', sub: `20대 ${manwon(AGE.groups[1].mean)} · 30대 ${manwon(AGE.groups[2].mean)} · 40대 ${manwon(AGE.groups[3].mean)} · 성별 평균과 소득 분포` }]))}
${section('이웃 연봉', null, chips(nb.map((v) => ({ label: short(v * 10000), value: netPay({ annual: v * 10000, nontax: NT }).net, href: salaryUrl(v), on: v === m }))))}
${section('연봉이 오르면 손에 오는 돈', '인상액의 상당 부분은 4대보험과 세금으로 빠집니다', table(['인상', '월 실수령', '월 증가', '인상액 대비'], raises))}
${section('인상률로 보면', '연봉 협상에서 %로 이야기할 때 — 새 연봉은 만원 단위로 반올림', table(['인상률', '새 연봉', '월 실수령', '월 증가'], [3, 5, 7, 10, 15, 20].map((r) => { const a2 = Math.round(annual * (1 + r / 100) / 10000) * 10000; const q = netPay({ annual: a2, nontax: NT }); return { cells: [`+${r}%`, num(a2), num(q.net), num(q.net - p.net)] }; })))}
${section('국민연금 인상 일정에 따른 변화', `연금개혁으로 근로자 부담률이 매년 0.5%p씩 올라 ${Math.max(...Object.keys(PENSION_SCHEDULE).map(Number))}년 6.5%가 됩니다. 다른 요율과 세금이 그대로라고 가정한 값입니다`, pensionSchedule(annual))}
${section(`${PREV}년과 비교`, null, tiles([{ label: `${PREV}년 월 실수령`, value: prev.net }, { label: `${YEAR}년 월 실수령`, value: p.net }, { label: '차이', value: p.net - prev.net }]))}
${section('시급·일급으로 보면', `월 ${MONTH_HOURS}시간(주 40시간 + 주휴) 기준`, tiles([{ label: '시급', value: Math.round(hourly) }, { label: '일급 (8시간)', value: Math.round(hourly * 8) }, { label: `최저임금 ${num(R0.minWage)}원 대비`, value: Math.round(hourly / R0.minWage * 100) / 100 }]).replace(/<span class="num">(\d+\.?\d*)<\/span><\/div>$/, '<span class="num">$1배</span></div>'))}
${ad()}
${section('이 연봉의 대출 한도', `DSR 40% 기준 — 연간 원리금 상환액이 연봉의 40%를 넘지 않는 선. 다른 대출이 없다고 가정`, tiles([{ label: '월 상환 여력', value: dsr.monthlyCap }, { label: '연 4.5%·30년 원리금균등', value: dsr.principal }, { label: '연 3.5%·30년', value: L.dsrLimit(annual, 0.035, 360).principal }]) + list([{ href: loanUrl(loanAmt, 30, 0.045), title: `대출 ${manwon(loanAmt * 10000)} 30년 4.5% 상환표`, sub: `월 ${won(L.annuityPayment(loanAmt * 10000, 0.045, 360))} · 실수령의 ${pct(L.annuityPayment(loanAmt * 10000, 0.045, 360) / p.net, 0)}` }]))}
${section('이어서 계산하기', null, list([
  { href: monthlyUrl(nearest(MONTHLIES, Math.round(p.gross / 100000))), title: `월급 ${manwon(nearest(MONTHLIES, Math.round(p.gross / 100000)) * 100000)} 실수령액`, sub: '월급 기준으로 다시 보기' },
  { href: netUrl(nearest(NETS, Math.round(p.net / 100000))), title: `월 ${manwon(nearest(NETS, Math.round(p.net / 100000)) * 100000)} 실수령하려면`, sub: '필요한 연봉 역산' },
  { href: retireUrl(nearest(RETIRE_PAYS, Math.round(p.gross / 500000) * 50), 10), title: `월급 ${manwon(nearest(RETIRE_PAYS, Math.round(p.gross / 500000) * 50) * 10000)} 퇴직금`, sub: '10년 근속 세전·세후' },
]))}
<p class="note">국세청 근로소득 간이세액표(100% 기준)와 ${YEAR}년 1월 4대보험 요율로 계산했습니다. 회사의 비과세 항목·상여·연말정산에 따라 실제 급여명세서와 차이가 날 수 있습니다. <a href="/method/">계산 기준 보기</a></p>`;
  write(url, shell({ url, title, desc, body, nav: 'salary' }));
}

function salaryIndex() {
  const rows = SALARIES.map((m) => { const p = netPay({ annual: m * 10000, nontax: NT }); return { cells: [`<a href="${salaryUrl(m)}">연봉 ${manwon(m * 10000)}</a>`, num(p.gross), num(p.deductions), num(p.net)] }; });
  const body = `
${crumb([['/', '홈'], [null, '연봉 실수령액']])}
<h1 class="title">${YEAR}년 연봉 실수령액표</h1>
<p class="meta">연봉 2,000만원부터 3억원까지 · 부양가족 본인 1인 · 식대 비과세 20만원 포함 · 국세청 간이세액표 기준</p>
<form class="quick" data-quick="salary" data-step="100" data-min="2000" data-max="30000"><label for="q-salary">연봉으로 바로 찾기</label><div class="quick-row"><div class="quick-in"><input id="q-salary" type="text" inputmode="numeric" placeholder="4200"><span>만원</span></div><button class="btn" type="submit">실수령액 보기</button></div></form>
${section('연봉별 월 실수령액', '연봉을 누르면 부양가족·비과세별 표, 인상 시 변화, 대출 한도까지 볼 수 있습니다', table(['연봉', '세전 월급', '월 공제', '월 실수령'], rows))}
<p class="note">1억원 초과 구간은 1,000만원 단위로 실었습니다. 간이세액표는 월 1,000만원 초과분에 별도 계산식을 적용합니다.</p>`;
  write('/salary/', shell({ url: '/salary/', title: `${YEAR}년 연봉 실수령액표 — 2,000만원부터 3억원까지`, desc: `${YEAR}년 연봉별 월 실수령액을 한 표로 정리했습니다. 4대보험과 간이세액표 소득세를 뺀 실제 손에 쥐는 돈, 연봉을 누르면 부양가족·비과세별 상세 표가 나옵니다.`, body, nav: 'salary' }));
}

/* ---------- 월급 페이지 ---------- */
function monthlyPage(m) {
  const gross = m * 100000;
  const p = netPay({ monthly: gross, nontax: NT });
  const url = monthlyUrl(m);
  const title = `월급 ${manwon(gross)} 실수령액 — ${won(p.net)} (${YEAR}년)`;
  const desc = `${YEAR}년 세전 월급 ${manwon(gross)}의 실수령액은 ${won(p.net)}입니다. 국민연금·건강보험·장기요양·고용보험·소득세 공제 내역과 부양가족·비과세 식대별 표, 연봉 환산을 정리했습니다.`;
  const nb = neighbors(MONTHLIES, m, 3);
  const annualNear = nearest(SALARIES, Math.round(gross * 12 / 10000));
  const body = `
${crumb([['/monthly/', '월급 실수령액'], [null, `${Math.floor(m / 100)}00만원대`]])}
<h1 class="title">월급 ${manwon(gross)} 실수령액</h1>
<p class="meta">세전 월급 기준 · ${YEAR}년 1월 요율 · 식대 비과세 20만원 포함 · 연봉으로는 ${manwon(gross * 12)}</p>
${payVariants(gross * 12)}
${section('이웃 월급', null, chips(nb.map((v) => ({ label: short(v * 100000), value: netPay({ monthly: v * 100000, nontax: NT }).net, href: monthlyUrl(v), on: v === m }))))}
${section('국민연금 인상 일정에 따른 변화', '근로자 부담률이 매년 0.5%p씩 오를 때의 월 실수령액', pensionSchedule(gross * 12))}
${ad()}
${section('이어서 계산하기', null, list([
  { href: salaryUrl(annualNear), title: `연봉 ${manwon(annualNear * 10000)} 실수령액`, sub: '연봉 기준 상세 표 · 인상 시 변화 · 대출 한도' },
  { href: netUrl(nearest(NETS, Math.round(p.net / 100000))), title: `월 ${manwon(nearest(NETS, Math.round(p.net / 100000)) * 100000)} 실수령하려면`, sub: '필요한 세전 월급 역산' },
  { href: retireUrl(nearest(RETIRE_PAYS, Math.round(gross / 500000) * 50), 5), title: `월급 ${manwon(nearest(RETIRE_PAYS, Math.round(gross / 500000) * 50) * 10000)} 퇴직금`, sub: '5년 근속 세전·세후' },
]))}
<p class="note">국세청 근로소득 간이세액표(100% 기준)와 ${YEAR}년 1월 4대보험 요율로 계산했습니다. <a href="/method/">계산 기준 보기</a></p>`;
  write(url, shell({ url, title, desc, body, nav: 'monthly' }));
}

function monthlyIndex() {
  const rows = MONTHLIES.map((m) => { const p = netPay({ monthly: m * 100000, nontax: NT }); return { cells: [`<a href="${monthlyUrl(m)}">월급 ${manwon(m * 100000)}</a>`, num(p.deductions), num(p.net), num(p.annualGross)] }; });
  const body = `
${crumb([['/', '홈'], [null, '월급 실수령액']])}
<h1 class="title">${YEAR}년 월급 실수령액표</h1>
<p class="meta">세전 월급 150만원부터 1,000만원까지 10만원 단위 · 부양가족 본인 1인 · 식대 비과세 20만원 포함</p>
<form class="quick" data-quick="monthly" data-step="10" data-min="150" data-max="1000"><label for="q-monthly">월급으로 바로 찾기</label><div class="quick-row"><div class="quick-in"><input id="q-monthly" type="text" inputmode="numeric" placeholder="350"><span>만원</span></div><button class="btn" type="submit">실수령액 보기</button></div></form>
${section('월급별 실수령액', null, table(['세전 월급', '월 공제', '월 실수령', '연봉 환산'], rows))}`;
  write('/monthly/', shell({ url: '/monthly/', title: `${YEAR}년 월급 실수령액표 — 150만원부터 1,000만원까지`, desc: `${YEAR}년 세전 월급별 실수령액을 10만원 단위로 정리했습니다. 4대보험과 소득세를 뺀 실제 입금액과 연봉 환산.`, body, nav: 'monthly' }));
}

/* ---------- 실수령 역산 페이지 ---------- */
function netPage(m) {
  const target = m * 100000;
  const g1 = grossForNet(target, { dependents: 1, nontax: NT });
  const url = netUrl(m);
  const p = netPay({ monthly: g1, nontax: NT });
  const rows = DEPS.map((d) => { const g = grossForNet(target, { dependents: d, nontax: NT }); return { cells: [d === 1 ? '본인' : `${d}인`, num(g), num(g * 12), num(netPay({ monthly: g, dependents: d, nontax: NT }).net)] }; });
  const rowsNt = [{ cells: ['비과세 없음 (본인)', num(grossForNet(target, { nontax: 0 })), num(grossForNet(target, { nontax: 0 }) * 12), num(netPay({ monthly: grossForNet(target, { nontax: 0 }) }).net)] }];
  const title = `월 실수령 ${manwon(target)} 받으려면 연봉 얼마? — 세전 ${manwon(g1 * 12)} (${YEAR}년)`;
  const desc = `월 실수령액 ${manwon(target)}을 받으려면 세전 월급 약 ${won(g1)}, 연봉 약 ${won(g1 * 12)}이 필요합니다(${YEAR}년 요율, 본인 1인 기준). 부양가족·비과세 식대별 필요 연봉을 함께 정리했습니다.`;
  const nb = neighbors(NETS, m, 3);
  const body = `
${crumb([['/net/', '실수령 역산'], [null, `${manwon(target)}`]])}
<h1 class="title">월 ${manwon(target)} 실수령하려면</h1>
<p class="meta">${YEAR}년 1월 요율 · 국세청 간이세액표 · 실수령액에서 세전 급여를 거꾸로 계산</p>
${hero({ label: '필요한 세전 월급', value: g1, sub: `연봉으로 ${won(g1 * 12)} · 부양가족 본인 1인 · 식대 비과세 20만원 포함일 때 실수령 ${won(p.net)}` })}
${ledger('이때의 공제 내역', '월 기준 · 원', [
  { label: '국민연금', value: p.pension }, { label: '건강보험', value: p.health }, { label: '장기요양', value: p.care }, { label: '고용보험', value: p.employment }, { label: '소득세', value: p.tax }, { label: '지방소득세', value: p.local },
], { label: '공제 합계', value: p.deductions })}
${section('부양가족·비과세에 따라', '가족이 많으면 같은 실수령액에 필요한 연봉이 줄고, 비과세 식대가 없으면 늘어납니다', table(['조건', '세전 월급', '연봉', '실수령'], rows.concat(rowsNt)))}
${section('이웃 실수령액', null, chips(nb.map((v) => ({ label: short(v * 100000), value: grossForNet(v * 100000, { nontax: NT }) * 12, href: netUrl(v), on: v === m }))))}
${ad()}
${section('이어서 계산하기', null, list([
  { href: salaryUrl(nearest(SALARIES, Math.round(g1 * 12 / 10000))), title: `연봉 ${manwon(nearest(SALARIES, Math.round(g1 * 12 / 10000)) * 10000)} 실수령액`, sub: '가장 가까운 연봉 페이지' },
  { href: monthlyUrl(nearest(MONTHLIES, Math.round(g1 / 100000))), title: `월급 ${manwon(nearest(MONTHLIES, Math.round(g1 / 100000)) * 100000)} 실수령액`, sub: '가장 가까운 월급 페이지' },
]))}
<p class="note">1,000원 단위로 맞춘 근사값입니다. 연봉 협상 때 "실수령 얼마"를 세전으로 옮길 때 참고하세요. <a href="/method/">계산 기준 보기</a></p>`;
  write(url, shell({ url, title, desc, body, nav: 'monthly' }));
}

function netIndex() {
  const rows = NETS.map((m) => { const g = grossForNet(m * 100000, { nontax: NT }); return { cells: [`<a href="${netUrl(m)}">월 ${manwon(m * 100000)}</a>`, num(g), num(g * 12)] }; });
  const body = `
${crumb([['/', '홈'], [null, '실수령 역산']])}
<h1 class="title">실수령액으로 연봉 찾기</h1>
<p class="meta">"월 300만원은 받고 싶다"를 세전 연봉으로 옮기는 표 · ${YEAR}년 요율 · 본인 1인 · 식대 비과세 20만원 포함</p>
<form class="quick" data-quick="net" data-step="10" data-min="150" data-max="800"><label for="q-net">원하는 월 실수령액</label><div class="quick-row"><div class="quick-in"><input id="q-net" type="text" inputmode="numeric" placeholder="300"><span>만원</span></div><button class="btn" type="submit">필요 연봉 보기</button></div></form>
${section('실수령액별 필요 연봉', null, table(['월 실수령', '세전 월급', '연봉'], rows))}`;
  write('/net/', shell({ url: '/net/', title: `실수령액으로 연봉 찾기 — 월 150만원부터 800만원까지 (${YEAR}년)`, desc: `원하는 월 실수령액을 받으려면 연봉이 얼마여야 하는지 10만원 단위로 역산한 표입니다.`, body, nav: 'monthly' }));
}

/* ---------- 대출 페이지 ---------- */
function loanPage(a, y, r) {
  const P = a * 10000, months = y * 12;
  const s = L.summary(P, r, months);
  const e = L.summary(P, r, months, 'equal');
  const b = L.summary(P, r, months, 'bullet');
  const url = loanUrl(a, y, r);
  const title = `대출 ${manwon(P)} ${y}년 ${fmtRate(r)} 월 상환액 ${won(s.monthly)} — 상환표·총이자`;
  const desc = `${manwon(P)}을 연 ${fmtRate(r)}로 ${y}년간 원리금균등 상환하면 매달 ${won(s.monthly)}, 총 이자 ${won(s.totalInterest)}입니다. 원금균등·만기일시 비교, 회차별 상환표, 금리·기간별 월 상환액, 갈아타기 손익을 정리했습니다.`;
  const showRows = s.rows.slice(0, 12).map((row) => ({ cells: [String(row.n), num(row.principal), num(row.interest), num(row.balance)] }));
  const yearRows = [];
  for (let k = 24; k < months; k += 12 * (y >= 30 ? 5 : y >= 20 ? 3 : 2)) { const row = s.rows[k - 1]; yearRows.push({ cells: [`${k / 12}년 뒤 (${k}회)`, num(row.principal), num(row.interest), num(row.balance)], cls: '' }); }
  yearRows.push({ cells: [String(months), num(s.rows[months - 1].principal), num(s.rows[months - 1].interest), '0'] });
  const refi = LOAN_RATES.filter((x) => x < r).slice(-3).reverse().map((x) => { const f = L.refinance(P, r, x, months); return { cells: [`<a href="${loanUrl(a, y, x)}">${fmtRate(x)}</a>`, num(f.newPay), num(f.saving), f.breakEvenMonths ? `${f.breakEvenMonths}개월` : '-'] }; });
  const extra = [100000, 300000, 500000].map((x) => { const q = L.extraPayment(P, r, months, x); return { cells: [`+${manwon(x)}`, `${Math.floor(q.months / 12)}년 ${q.months % 12}개월`, `${Math.floor(q.monthsSaved / 12)}년 ${q.monthsSaved % 12}개월`, num(q.interestSaved)] }; });
  const needIncome = Math.ceil(s.monthly * 12 / 0.4 / 1000000) * 1000000;
  const salaryNear = nearest(SALARIES, Math.round(needIncome / 10000));
  const body = `
${crumb([['/loan/', '대출 상환'], [`/loan/${a}/`, manwon(P)]])}
<h1 class="title">대출 ${manwon(P)} ${y}년 상환 · 연 ${fmtRate(r)}</h1>
<p class="meta">원리금균등 · 거치 없음 · 고정금리 가정 · 매달 말 상환</p>
${hero({ label: '매달 갚는 돈', value: s.monthly, sub: `${months}회 · 총 이자 ${won(s.totalInterest)} · 총 상환 ${won(s.totalPayment)}`, bars: [P / s.totalPayment, s.totalInterest / s.totalPayment], legendL: `원금 ${pct(P / s.totalPayment)}`, legendR: `이자 ${pct(s.totalInterest / s.totalPayment)}` })}
${section('상환 방식 비교', '원리금균등은 매달 같은 금액, 원금균등은 첫 달이 많고 점점 줄어듦, 만기일시는 이자만 내다 만기에 원금', table(['방식', '월 상환액', '총 이자'], [
  { cls: 'on', cells: ['원리금균등', num(s.monthly), num(s.totalInterest)] },
  { cells: ['원금균등', `${num(e.first)} → ${num(e.last)}`, num(e.totalInterest)] },
  { cells: ['만기일시', `${num(b.rows[0].payment)} + 만기 ${short(P)}`, num(b.totalInterest)] },
]))}
${section('상환표', `처음 12회와 해마다 남는 원금 · 원리금균등`, table(['회차', '원금', '이자', '남은 원금'], showRows.concat([{ cls: 'gap', cells: ['···', '', '', ''] }], yearRows)))}
${section('금리가 바뀌면', `${manwon(P)} · ${y}년`, cells(LOAN_RATES.map((x) => ({ label: fmtRate(x), value: L.annuityPayment(P, x, months), href: loanUrl(a, y, x), on: x === r })), 3))}
${section('기간이 바뀌면', `${manwon(P)} · 연 ${fmtRate(r)}`, cells(LOAN_YEARS.map((x) => ({ label: `${x}년`, value: L.annuityPayment(P, r, x * 12), href: loanUrl(a, x, r), on: x === y })), 3))}
${ad()}
${refi.length ? section('낮은 금리로 갈아타면', '같은 원금·기간, 중도상환수수료 1.2% 가정 — 수수료를 절약액으로 나눈 회수 기간', table(['새 금리', '월 상환액', '월 절약', '수수료 회수'], refi)) : ''}
${section('매달 더 갚으면', '원리금균등 상환액에 얹어 갚을 때 줄어드는 기간과 이자', table(['추가 상환', '총 기간', '단축', '절약 이자'], extra))}
${section('이 대출을 감당하려면', `DSR 40% 기준 — 월 상환액 ${won(s.monthly)}이 연소득의 40%를 넘지 않으려면`, tiles([{ label: '필요 연소득', value: needIncome }, { label: '월 상환액', value: s.monthly }, { label: `연봉 ${short(salaryNear * 10000)} 실수령 대비`, value: Math.round(s.monthly / netPay({ annual: salaryNear * 10000, nontax: NT }).net * 100) }]).replace(/<span class="num">(\d+)<\/span><\/div><\/div>$/, '<span class="num">$1%</span></div></div>') + list([{ href: salaryUrl(salaryNear), title: `연봉 ${manwon(salaryNear * 10000)} 실수령액`, sub: `월 ${won(netPay({ annual: salaryNear * 10000, nontax: NT }).net)}` }]))}
${section('금액이 바뀌면', `${y}년 · 연 ${fmtRate(r)}`, chips(neighbors(LOAN_AMOUNTS, a, 3).map((x) => ({ label: short(x * 10000), value: L.annuityPayment(x * 10000, r, months), href: loanUrl(x, y, r), on: x === a }))))}
<p class="note">이자는 매달 남은 원금에 연이율의 12분의 1을 곱해 원 단위로 반올림했습니다. 실제 대출은 금리 변동, 거치기간, 중도상환수수료, 은행의 일할 계산 방식에 따라 달라집니다. <a href="/method/">계산 기준 보기</a></p>`;
  write(url, shell({ url, title, desc, body, nav: 'loan' }));
}

function loanAmountIndex(a) {
  const P = a * 10000;
  const rows = LOAN_YEARS.map((y) => ({ cells: [`${y}년`].concat(LOAN_RATES.map((r) => `<a href="${loanUrl(a, y, r)}">${num(L.annuityPayment(P, r, y * 12))}</a>`)) }));
  const body = `
${crumb([['/loan/', '대출 상환'], [null, manwon(P)]])}
<h1 class="title">대출 ${manwon(P)} 월 상환액표</h1>
<p class="meta">원리금균등 · 기간 × 금리별 매달 갚는 돈 · 칸을 누르면 상환표와 총 이자</p>
${section('기간 × 금리', null, table(['기간'].concat(LOAN_RATES.map(fmtRate)), rows))}
${ad()}
${section('다른 금액', null, chips(LOAN_AMOUNTS.map((x) => ({ label: short(x * 10000), value: L.annuityPayment(x * 10000, 0.045, 360), href: `/loan/${x}/`, on: x === a }))))}
<p class="note">위 칩의 숫자는 30년·연 4.5% 기준 월 상환액입니다.</p>`;
  write(`/loan/${a}/`, shell({ url: `/loan/${a}/`, title: `대출 ${manwon(P)} 월 상환액표 — 10년~40년 · 2.5%~7%`, desc: `${manwon(P)} 대출의 기간별·금리별 월 상환액(원리금균등)을 한 표로 정리했습니다.`, body, nav: 'loan' }));
}

function loanIndex() {
  const body = `
${crumb([['/', '홈'], [null, '대출 상환']])}
<h1 class="title">대출 상환액 사전</h1>
<p class="meta">금액·기간·금리를 고르면 매달 갚는 돈, 총 이자, 회차별 상환표, 갈아타기 손익까지</p>
${section('대출 금액', '30년 · 연 4.5% 기준 월 상환액 · 금액을 누르면 기간×금리 표', cells(LOAN_AMOUNTS.map((x) => ({ label: manwon(x * 10000), value: L.annuityPayment(x * 10000, 0.045, 360), href: `/loan/${x}/` })), 2))}
${ad()}
${section('자주 보는 조합', null, list([
  { href: loanUrl(20000, 30, 0.045), title: '2억 · 30년 · 4.5%', value: L.annuityPayment(200000000, 0.045, 360) },
  { href: loanUrl(30000, 30, 0.045), title: '3억 · 30년 · 4.5%', value: L.annuityPayment(300000000, 0.045, 360) },
  { href: loanUrl(10000, 20, 0.04), title: '1억 · 20년 · 4.0%', value: L.annuityPayment(100000000, 0.04, 240) },
  { href: loanUrl(50000, 40, 0.045), title: '5억 · 40년 · 4.5%', value: L.annuityPayment(500000000, 0.045, 480) },
]))}`;
  write('/loan/', shell({ url: '/loan/', title: '대출 상환액 사전 — 금액·기간·금리별 월 상환액과 총 이자', desc: '3천만원부터 10억원까지, 10년부터 40년까지, 연 2.5%부터 7%까지 원리금균등 월 상환액과 총 이자, 상환표를 미리 계산했습니다.', body, nav: 'loan' }));
}

/* ---------- 퇴직금 페이지 ---------- */
function retirePage(pm, y) {
  const pay = pm * 10000;
  const s = R.severance(pay, y);
  const t = R.severanceTax(s.amount, y);
  const url = retireUrl(pm, y);
  const title = `월급 ${manwon(pay)} ${y}년 근속 퇴직금 — 세전 ${won(s.amount)} · 세후 ${won(t.net)}`;
  const desc = `월급 ${manwon(pay)}으로 ${y}년 일하고 퇴직하면 퇴직금은 세전 ${won(s.amount)}, 퇴직소득세를 뺀 실수령은 ${won(t.net)}입니다. 근속연수공제·환산급여 계산 과정과 근속연수별·월급별 표를 정리했습니다.`;
  const yearRows = RETIRE_YEARS.map((yy) => { const ss = R.severance(pay, yy), tt = R.severanceTax(ss.amount, yy); return { cls: yy === y ? 'on' : '', cells: [`<a href="${retireUrl(pm, yy)}">${yy}년</a>`, num(ss.amount), num(tt.total), num(tt.net)] }; });
  const payRows = neighbors(RETIRE_PAYS, pm, 3).map((pp) => { const ss = R.severance(pp * 10000, y), tt = R.severanceTax(ss.amount, y); return { cls: pp === pm ? 'on' : '', cells: [`<a href="${retireUrl(pp, y)}">${manwon(pp * 10000)}</a>`, num(ss.amount), num(tt.total), num(tt.net)] }; });
  const body = `
${crumb([['/retire/', '퇴직금'], [null, `월급 ${manwon(pay)}`]])}
<h1 class="title">월급 ${manwon(pay)} · ${y}년 근속 퇴직금</h1>
<p class="meta">평균임금 = 월급(상여·수당 없음 가정) · 퇴직소득세는 ${YEAR}년 기준 근속연수공제·환산급여 방식</p>
${hero({ label: '세후 퇴직금', value: t.net, sub: `세전 ${won(s.amount)}에서 퇴직소득세 ${won(t.incomeTax)}과 지방소득세 ${won(t.localTax)}을 뺀 금액`, bars: [t.net / s.amount], legendL: `실수령 ${pct(t.net / s.amount)}`, legendR: `세금 ${pct(t.total / s.amount)}` })}
${ledger('퇴직소득세 계산', '원', [
  { label: '퇴직금 (세전)', note: `1일 평균임금 ${won(s.avgDaily)} × 30 × ${s.days}일 ÷ 365`, value: s.amount },
  { label: '근속연수공제', note: `${t.years}년`, value: t.serviceDeduction },
  { label: '환산급여', note: '(퇴직금 − 근속연수공제) ÷ 근속연수 × 12', value: t.converted },
  { label: '환산급여공제', value: t.converted - t.base },
  { label: '과세표준', value: t.base },
  { label: '퇴직소득세', note: '환산산출세액 ÷ 12 × 근속연수', value: t.incomeTax },
  { label: '지방소득세', note: '10%', value: t.localTax },
], { label: '세후 퇴직금', value: t.net })}
${section('근속연수가 바뀌면', `월급 ${manwon(pay)}`, table(['근속', '세전', '세금', '세후'], yearRows))}
${ad()}
${section('월급이 바뀌면', `${y}년 근속`, table(['월급', '세전', '세금', '세후'], payRows))}
${section('이어서 계산하기', null, list([
  { href: salaryUrl(nearest(SALARIES, pm * 12)), title: `연봉 ${manwon(nearest(SALARIES, pm * 12) * 10000)} 실수령액`, sub: '이 월급의 연봉 기준 실수령' },
  { href: monthlyUrl(nearest(MONTHLIES, pm / 10)), title: `월급 ${manwon(nearest(MONTHLIES, pm / 10) * 100000)} 실수령액`, sub: '매달 손에 쥐는 돈' },
]))}
<p class="note">퇴직 전 3개월 평균임금이 월급과 같다고 가정했습니다. 상여·연차수당이 있으면 평균임금이 올라 퇴직금이 늘고, 확정기여형(DC)·IRP로 받으면 세금 시점이 달라집니다. <a href="/method/">계산 기준 보기</a></p>`;
  write(url, shell({ url, title, desc, body, nav: 'retire' }));
}

function retireIndex() {
  const rows = RETIRE_PAYS.map((pm) => ({ cells: [`${manwon(pm * 10000)}`].concat(RETIRE_YEARS.map((y) => `<a href="${retireUrl(pm, y)}">${num(R.severanceTax(R.severance(pm * 10000, y).amount, y).net)}</a>`)) }));
  const body = `
${crumb([['/', '홈'], [null, '퇴직금']])}
<h1 class="title">퇴직금 세후 실수령표</h1>
<p class="meta">월급 × 근속연수별 세후 퇴직금 · 칸을 누르면 세전·퇴직소득세 계산 과정</p>
${section('월급 × 근속연수', '세후 금액(원)', table(['월급'].concat(RETIRE_YEARS.map((y) => `${y}년`)), rows))}
<p class="note">평균임금이 월급과 같다는 가정입니다. 1년 미만 근속은 퇴직금이 없고, 근속연수는 1년 미만을 올림해 세금을 계산합니다.</p>`;
  write('/retire/', shell({ url: '/retire/', title: '퇴직금 계산표 — 월급·근속연수별 세전·세후 (퇴직소득세 반영)', desc: '월급 200만원부터 1,000만원, 근속 1년부터 30년까지 퇴직금과 퇴직소득세, 세후 실수령을 표로 정리했습니다.', body, nav: 'retire' }));
}

/* ---------- 알바 페이지 ---------- */
function hourlyPage(w, h) {
  const eligible = h >= 15;
  const holidayHours = eligible ? Math.min(h, 40) / 40 * 8 : 0;
  const weeklyBase = w * h, weeklyHoliday = Math.round(w * holidayHours);
  const weekly = weeklyBase + weeklyHoliday;
  const monthly = Math.round(weekly * WEEKS_PER_MONTH);
  const monthHours = h * WEEKS_PER_MONTH;
  const insured = monthHours >= 60;
  const p = insured ? netPay({ monthly }) : null;
  const url = hourlyUrl(w, h);
  const isMin = w === R0.minWage;
  const title = `시급 ${num(w)}원 주 ${h}시간 알바 월급 — ${won(monthly)}${eligible ? ' (주휴수당 포함)' : ''}`;
  const desc = `시급 ${num(w)}원${isMin ? `(${YEAR}년 최저임금)` : ''}으로 주 ${h}시간 일하면 주휴수당 ${eligible ? won(weeklyHoliday) : '없음(주 15시간 미만)'}, 주급 ${won(weekly)}, 월급 약 ${won(monthly)}입니다. 4대보험 가입 여부와 실수령까지 정리했습니다.`;
  const body = `
${crumb([['/hourly/', '알바 월급'], [null, `시급 ${num(w)}원`]])}
<h1 class="title">시급 ${num(w)}원 · 주 ${h}시간 알바 월급</h1>
<p class="meta">${isMin ? `${YEAR}년 최저임금 · ` : ''}한 달 = ${WEEKS_PER_MONTH.toFixed(3)}주 · 주휴수당은 주 15시간 이상·개근 조건</p>
${hero({ label: '월급 (세전)', value: monthly, sub: `주급 ${won(weekly)} × ${WEEKS_PER_MONTH.toFixed(3)}주 · ${eligible ? `주휴수당 주 ${won(weeklyHoliday)} 포함` : '주 15시간 미만이라 주휴수당 없음'}`, bars: eligible ? [weeklyBase / weekly, weeklyHoliday / weekly] : null, legendL: `기본급 ${pct(weeklyBase / weekly)}`, legendR: `주휴수당 ${pct(weeklyHoliday / weekly)}` })}
${ledger('한 주 계산', '원', [
  { label: '기본급', note: `${num(w)}원 × ${h}시간`, value: weeklyBase },
  { label: '주휴수당', note: eligible ? `${num(w)}원 × ${holidayHours.toFixed(1)}시간 (주 ${Math.min(h, 40)}시간 ÷ 40 × 8)` : '주 15시간 미만은 해당 없음', value: weeklyHoliday },
], { label: '주급', value: weekly })}
${section('4대보험과 실수령', insured ? `월 ${monthHours.toFixed(0)}시간이면 4대보험 가입 대상(월 60시간 이상) — 근로자 부담분을 뺀 금액` : `월 ${monthHours.toFixed(0)}시간이라 4대보험 의무가입 대상이 아닙니다(월 60시간 미만). 고용보험은 3개월 이상 근무 시 가입`, insured ? tiles([{ label: '4대보험 공제', value: p.insurance }, { label: '소득세', value: p.taxTotal }, { label: '월 실수령', value: p.net }]) : tiles([{ label: '월급', value: monthly }, { label: '공제', value: 0 }, { label: '실수령', value: monthly }]))}
${section('시간이 바뀌면', `시급 ${num(w)}원`, cells(HOURLY_HOURS.map((x) => { const el = x >= 15; const wk = w * x + (el ? Math.round(w * Math.min(x, 40) / 40 * 8) : 0); return { label: `주 ${x}시간`, value: Math.round(wk * WEEKS_PER_MONTH), href: hourlyUrl(w, x), on: x === h }; }), 3))}
${ad()}
${section('시급이 바뀌면', `주 ${h}시간`, cells(HOURLY_WAGES.map((x) => { const wk = x * h + (eligible ? Math.round(x * Math.min(h, 40) / 40 * 8) : 0); return { label: `${num(x)}원${x === R0.minWage ? ' (최저)' : ''}`, value: Math.round(wk * WEEKS_PER_MONTH), href: hourlyUrl(x, h), on: x === w }; }), 3))}
<p class="note">주휴수당은 1주 소정근로시간 15시간 이상이고 그 주를 개근했을 때 하루치(주 40시간 기준 8시간) 임금을 더 받는 제도입니다. 연장·야간·휴일 근로수당(1.5배)은 포함하지 않았습니다. <a href="/method/">계산 기준 보기</a></p>`;
  write(url, shell({ url, title, desc, body, nav: 'hourly' }));
}

function hourlyIndex() {
  const rows = HOURLY_WAGES.map((w) => ({ cells: [`${num(w)}원${w === R0.minWage ? ' (최저)' : ''}`].concat(HOURLY_HOURS.map((h) => { const el = h >= 15; const wk = w * h + (el ? Math.round(w * Math.min(h, 40) / 40 * 8) : 0); return `<a href="${hourlyUrl(w, h)}">${num(Math.round(wk * WEEKS_PER_MONTH))}</a>`; })) }));
  const body = `
${crumb([['/', '홈'], [null, '알바 월급']])}
<h1 class="title">알바 월급표 — 시급 × 주 근무시간</h1>
<p class="meta">${YEAR}년 최저임금 시급 ${num(R0.minWage)}원 · 주휴수당 포함(주 15시간 이상) · 한 달 ${WEEKS_PER_MONTH.toFixed(3)}주</p>
${section('시급 × 주 시간', '월급(세전, 원) · 칸을 누르면 주휴수당·4대보험·실수령', table(['시급'].concat(HOURLY_HOURS.map((h) => `주 ${h}h`)), rows))}
<p class="note">주 15시간 미만은 주휴수당이 없어 월급이 단순히 시급 × 시간 × 4.345입니다.</p>`;
  write('/hourly/', shell({ url: '/hourly/', title: `알바 월급표 ${YEAR} — 시급·주 근무시간별 주휴수당 포함 월급`, desc: `${YEAR}년 최저임금 ${num(R0.minWage)}원부터 시급 2만원까지, 주 10시간부터 40시간까지 주휴수당을 포함한 알바 월급을 표로 정리했습니다.`, body, nav: 'hourly' }));
}

/* ---------- 홈·문서 ---------- */
function home() {
  const s42 = netPay({ annual: 42000000, nontax: NT });
  const popular = [3000, 3600, 4200, 5000, 6000].map((m) => ({ href: salaryUrl(m), title: `연봉 ${manwon(m * 10000)}`, value: netPay({ annual: m * 10000, nontax: NT }).net }));
  const body = `
<div class="home-hero">
  <div class="overline">돈 계산 사전</div>
  <h1>연봉 4,200만원이면<br>손에 얼마가 남을까</h1>
  <p>연봉·월급·대출·퇴직금·알바 월급을 금액별로 미리 계산해 표로 묶어 두었습니다. 숫자만 고르면 바로 나옵니다.</p>
</div>
<form class="quick" data-quick="salary" data-step="100" data-min="2000" data-max="30000"><label for="q-home">연봉으로 바로 찾기</label><div class="quick-row"><div class="quick-in"><input id="q-home" type="text" inputmode="numeric" placeholder="4200"><span>만원</span></div><button class="btn" type="submit">실수령액 보기</button></div><div class="quick-links"><a href="/monthly/">월급으로 찾기</a><a href="/net/">실수령액으로 연봉 찾기</a><a href="/hourly/">시급으로 찾기</a></div></form>
${section('급여와 일', null, `<div class="dict">
<a href="/salary/"><b>연봉 실수령액</b><span>4,200만원 → 월 <span class="num">${num(s42.net)}</span>원</span></a>
<a href="/monthly/"><b>월급 실수령액</b><span>세전 350만원 → <span class="num">${num(netPay({ monthly: 3500000, nontax: NT }).net)}</span>원</span></a>
<a href="/net/"><b>실수령으로 연봉 찾기</b><span>월 300만원 받으려면 연봉 <span class="num">${num(grossForNet(3000000, { nontax: NT }) * 12)}</span>원</span></a>
<a href="/minimum-wage/"><b>${YEAR}년 최저임금</b><span>시급 ${num(R0.minWage)}원 → 월급 <span class="num">${num(R0.minWage * MONTH_HOURS)}</span>원</span></a>
<a href="/freelance/"><b>프리랜서 3.3%</b><span>월 300만원 → 실수령 <span class="num">${num(LB.freelance(3000000).net)}</span>원</span></a>
<a href="/overtime/"><b>연장·야간·휴일수당</b><span>월급 350만 → 연장 1시간 <span class="num">${num(LB.overtime(3500000).ext)}</span>원</span></a>
<a href="/leave/"><b>연차수당</b><span>월급 350만 → 하루 <span class="num">${num(LB.leaveDaily(3500000))}</span>원</span></a>
<a href="/hourly/"><b>알바 월급</b><span>시급 ${num(R0.minWage)}원·주 40시간 → 주휴 <span class="num">${num(R0.minWage * 8)}</span>원</span></a>
<a href="/rank/"><b>연봉 순위</b><span>연봉 6,000만원은 근로소득자 상위 <span class="num">${RK.rank(60000000).topPct}</span>%</span></a>
<a href="/age/"><b>나이대별 평균 월급</b><span>30대 <span class="num">${num(AGE.groups[2].mean)}</span>원 · 40대 <span class="num">${num(AGE.groups[3].mean)}</span>원</span></a>
</div>`)}
${section('대출·저축·제도', null, `<div class="dict">
<a href="/loan/"><b>대출 상환금</b><span>2억·30년·4.5% → 월 <span class="num">${num(L.annuityPayment(200000000, 0.045, 360))}</span>원</span></a>
<a href="/dsr/"><b>대출 한도 (DSR)</b><span>연봉 5,000만 → 최대 <span class="num">${num(L.dsrLimit(50000000, 0.045, 360).principal)}</span>원</span></a>
<a href="/jeonse/"><b>전세 vs 월세</b><span>전세 2억 대출 4% → 월 이자 <span class="num">${num(Math.round(200000000 * 0.04 / 12))}</span>원</span></a>
<a href="/savings/"><b>적금 세후 이자</b><span>월 50만·3년·4% → <span class="num">${num(savings(500000, 36, 0.04).net)}</span>원</span></a>
<a href="/car-loan/"><b>자동차 할부</b><span>3,000만·60개월·5% → 월 <span class="num">${num(L.annuityPayment(30000000, 0.05, 60))}</span>원</span></a>
<a href="/retire/"><b>퇴직금 세후</b><span>월급 350만·5년 → <span class="num">${num(R.severanceTax(R.severance(3500000, 5).amount, 5).net)}</span>원</span></a>
<a href="/unemployment/"><b>실업급여</b><span>월급 350만·5년 → 하루 <span class="num">${num(U.dailyBenefit(3500000).daily)}</span>원 × ${U.benefitDays(5)}일</span></a>
<a href="/rates/"><b>${YEAR}년 4대보험 요율표</b><span>국민연금 <span class="num">${pct(R0.pension, 2)}</span> · 건강보험 <span class="num">${pct(R0.health * 2, 2)}</span></span></a>
</div>`)}
${section('많이 보는 연봉표', null, list(popular))}
${section(`${YEAR}년에 달라진 것`, null, `<div class="callout"><b>국민연금 근로자 부담 ${pct(RATES[PREV].pension, 2)} → ${pct(R0.pension, 2)}</b>, 건강보험 ${pct(RATES[PREV].health * 2, 2)} → ${pct(R0.health * 2, 2)}, 최저임금 ${num(RATES[PREV].minWage)}원 → ${num(R0.minWage)}원. 같은 연봉이라도 실수령액이 작년보다 조금 줄었습니다. 각 연봉 페이지에서 ${PREV}년과 비교할 수 있습니다.</div>`)}`;
  write('/', shell({ url: '/', title: `돈표 — 연봉 실수령액·대출 상환·퇴직금·알바 월급 계산 사전 (${YEAR}년)`, desc: `${YEAR}년 요율로 연봉별 실수령액, 대출 월 상환액과 총 이자, 퇴직금 세후, 알바 주휴수당까지 금액별로 미리 계산한 돈 계산 사전.`, body }));
}

function docs() {
  const R1 = RATES[PREV];
  const method = `
${crumb([['/', '홈'], [null, '계산 기준']])}
<h1 class="title">계산 기준과 요율</h1>
<div class="doc">
<h2>실수령액</h2>
<p>실수령액 = 세전 월급 − 비과세 − (국민연금 + 건강보험 + 장기요양보험 + 고용보험 + 소득세 + 지방소득세). 연봉 페이지는 연봉 ÷ 12를 세전 월급으로 봅니다.</p>
${table(['항목', `${PREV}년`, `${YEAR}년`, '비고'], [
  { cells: ['국민연금 (근로자)', pct(R1.pension, 2), pct(R0.pension, 2), `기준소득월액 ${num(R0.pensionMin)}~${num(R0.pensionMax)}원`] },
  { cells: ['건강보험 (근로자)', pct(R1.health, 3), pct(R0.health, 3), '보험료율의 절반'] },
  { cells: ['장기요양', pct(R1.care, 2), pct(R0.care, 2), '건강보험료에 곱함'] },
  { cells: ['고용보험 (근로자)', pct(R1.employment, 1), pct(R0.employment, 1), ''] },
  { cells: ['최저임금 (시급)', num(R1.minWage), num(R0.minWage), '고용노동부 고시'] },
])}
<p>소득세는 국세청 <b>근로소득 간이세액표</b>(소득세법 시행령 별표 2, 2024년 2월 개정)를 그대로 조회합니다. 월급여 1,000만원 초과 구간은 별표가 정한 계산식을 적용하고, 8세 이상 20세 이하 자녀가 있으면 자녀 수별 금액을 뺍니다. 회사는 간이세액의 80%·100%·120% 중 하나를 원천징수할 수 있는데 여기서는 기본인 100%를 씁니다. 지방소득세는 소득세의 10%입니다.</p>
<p>공제대상가족 수에는 본인이 들어갑니다. "2인"은 본인 + 배우자(또는 부양가족 1명)입니다. 기본값은 식대 비과세 월 20만원을 포함한 값이며(대부분의 회사가 적용하는 한도), 식대가 없으면 각 페이지에서 "없음"을 고르세요.</p>
<h2>국민연금 인상 일정</h2>
<p>2025년 3월 개정된 국민연금법에 따라 보험료율이 9%에서 매년 0.5%p씩 올라 2033년 13%가 됩니다. 근로자 부담은 그 절반입니다. 연봉 페이지의 "인상 일정" 표는 다른 요율과 세금이 올해 그대로라고 가정한 값입니다.</p>
<h2>대출</h2>
<p>이자 = 매달 남은 원금 × 연이율 ÷ 12, 원 단위 반올림. 원리금균등은 매달 같은 금액, 원금균등은 원금을 균등 분할해 이자가 줄어드는 방식, 만기일시는 이자만 내다 만기에 원금을 갚는 방식입니다. 고정금리·거치 없음·매달 말 상환을 가정했고, 갈아타기 표의 중도상환수수료는 1.2%로 두었습니다. DSR 한도는 연간 원리금 상환액이 연소득의 40%를 넘지 않는 원금이며 기존 대출은 없다고 봅니다.</p>
<h2>퇴직금</h2>
<p>퇴직금 = 1일 평균임금 × 30 × 재직일수 ÷ 365. 평균임금은 퇴직 전 3개월 급여 ÷ 그 기간 일수인데, 상여·수당 없이 월급이 일정하다고 가정했습니다. 퇴직소득세는 (퇴직금 − 근속연수공제) ÷ 근속연수 × 12 = 환산급여 → 환산급여공제 → 과세표준 × 기본세율 ÷ 12 × 근속연수 순서로 계산하며 근속연수는 1년 미만을 올림합니다.</p>
<h2>알바</h2>
<p>주휴수당은 1주 소정근로시간이 15시간 이상이고 개근했을 때 발생하며, 주 40시간 기준 8시간(그 미만이면 비례)의 시급을 더 받습니다. 한 달은 365 ÷ 7 ÷ 12 = 4.345주로 환산했습니다. 월 60시간 이상이면 4대보험 가입 대상으로 보고 근로자 부담분을 뺐습니다.</p>
<h2>실업급여</h2>
<p>구직급여일액 = 퇴직 전 3개월 평균임금(1일) × 60%. ${YEAR}년 상한액 ${won(U.UPPER[YEAR])}, 하한액은 최저시급 × 80% × 8시간 = ${won(Math.round(R0.minWage * 0.8 * 8))}. 소정급여일수는 피보험기간(1년 미만·1~3년·3~5년·5~10년·10년 이상)과 퇴직 당시 나이(50세 기준)로 120~270일. 한 달 수령액은 30일 기준 근사값입니다.</p>
<h2>전세 vs 월세</h2>
<p>전세대출 월 이자 = 대출금 × 연이율 ÷ 12(만기일시, 이자만 납부). 월세 전환액 = 줄이는 보증금 × 전환율 ÷ 12이며 법정 전환율 상한은 기준금리(${fmtRate(R0.baseRate)}) + 2%p = ${fmtRate(CONVERSION_CAP)}입니다(갱신 계약에 적용, 신규 계약은 시장 전환율).</p>
<h2>적금·예금</h2>
<p>적금 이자는 단리로 매달 납입금이 남은 개월 수만큼 이자를 받는 방식: 월납입 × 연이율 ÷ 12 × n(n+1) ÷ 2. 예금은 원금 × 연이율 × 개월 ÷ 12. 이자소득세 14%와 지방소득세 1.4%(합계 ${pct(INTEREST_TAX)})를 뺀 세후 금액을 씁니다. 실질 이득은 만기 수령액을 연 2% 물가상승률로 오늘 가치로 되돌린 뒤 원금을 뺀 값입니다.</p>
<h2>대출 한도 (DSR)</h2>
<p>DSR 40% = 모든 대출의 연간 원리금 상환액 ÷ 연소득 ≤ 40%. 월 상환 여력 = 연소득 × 40% ÷ 12이고, 그 여력으로 갚을 수 있는 원리금균등 원금을 한도로 봅니다. 스트레스 DSR은 실제 금리에 가산금리(수도권 주담대 1.5%p)를 더해 계산합니다.</p>
<h2>연봉 순위</h2>
<p>국세청 ${RK.STAT.year}년 귀속 근로소득 연말정산 통계의 공식 요약값(신고 ${num(RK.STAT.workers)}명, 중위 ${won(RK.STAT.median)}, 평균 ${won(RK.STAT.mean)}, 1억원 초과 ${pct(RK.STAT.over100m)})에 맞춘 로그정규 분포로 상위 비율을 추정합니다. 세 값을 모두 재현하는 분포이지만 백분위 원자료 그대로는 아니므로 ±몇 %p의 오차가 있을 수 있습니다. 근로소득 연말정산 대상자 기준이라 자영업자·일용직은 포함되지 않습니다.</p>
<h2>최저임금</h2>
<p>월급 = 시급 × 209시간(주 40시간 + 주휴 8시간, 한 달 4.345주). 주 15시간 이상 일하면 주휴수당이 붙고, 1년 이상 계약의 수습 3개월은 90%까지 줄일 수 있습니다. 5인 미만 사업장도 최저임금은 똑같이 적용됩니다.</p>
<h2>프리랜서 3.3%</h2>
<p>사업소득 원천징수 = 소득세 3% + 지방소득세 0.3%. 다음 해 5월 종합소득세 신고에서 수입 − 필요경비(업종별 단순경비율 또는 실제 경비) − 인적공제로 과세표준을 구해 정산하며, 미리 낸 3.3%보다 결정세액이 적으면 환급됩니다. 이 사이트의 정산 예시는 필요경비율 60·70·80%, 기본공제 150만원, 표준세액공제 7만원만 반영한 값입니다.</p>
<h2>연장·야간·휴일수당과 연차</h2>
<p>통상시급 = 월 통상임금 ÷ 209시간(월급 전체가 통상임금이라고 가정). 연장근로는 통상시급의 1.5배, 야간(22~06시)은 0.5배 가산, 휴일근로는 8시간 이내 1.5배·초과분 2배입니다. 5인 미만 사업장은 가산 의무가 없습니다. 연차수당 = 통상시급 × 8시간 × 미사용 일수. 연차는 1년 미만 개근한 달마다 1일(최대 11일), 1년 이상 80% 출근 시 15일, 3년차부터 2년마다 1일씩 늘어 최대 25일입니다.</p>
<h2>자동차 할부</h2>
<p>차값 − 선수금을 원리금균등으로 나눈 월 납입액입니다. 취득세(약 7%)·보험료·등록비와 잔가 유예 할부는 반영하지 않았습니다.</p>
<h2>나이대 비교</h2>
<p>통계청 「${AGE.year}년 임금근로일자리 소득(보수) 결과」의 연령대별 월평균 소득과 소득구간 분포(10구간)를 씁니다. ${AGE.year}년 12월 한 달 동안 사회보험에 신고된 임금근로일자리의 세전 보수라서 연말정산 연봉 통계(연봉 순위)와 대상·기준이 다릅니다. "그 나이대에서 내 위치"는 연봉 ÷ 12를 소득구간 안에서 선형 보간해 구하고, 1,000만원 이상 구간은 3,000만원까지 고르게 퍼져 있다고 가정합니다.</p>
<h2>출처</h2>
<ul><li>통계청 ${AGE.year}년 임금근로일자리 소득(보수) 결과 (연령대별·성별 평균소득, 소득구간 분포)</li><li>국세청 근로소득 간이세액표 (소득세법 시행령 별표 2), 국세통계 근로소득 연말정산 신고 현황</li><li>국민연금공단·국민건강보험공단 보험료율 고시</li><li>고용노동부 최저임금 고시, 근로기준법 시행령(주휴·퇴직금), 고용보험법(구직급여)</li><li>주택임대차보호법(전월세전환율), 소득세법(이자소득세)</li></ul>
</div>`;
  write('/method/', shell({ url: '/method/', title: '계산 기준과 요율 — 돈표', desc: '돈표의 실수령액·대출·퇴직금·알바 월급 계산 방식과 연도별 4대보험 요율, 출처를 정리했습니다.', body: method }));

  const about = `
${crumb([['/', '홈'], [null, '소개']])}
<h1 class="title">돈표는</h1>
<div class="doc">
<p>돈표(돈 계산 사전)는 "연봉 4,200이면 얼마 받지?", "2억 빌리면 한 달에 얼마 갚지?" 같은 질문에 계산기 없이 바로 답하려고 만든 사이트입니다. 금액별 페이지를 미리 계산해 두어 검색에서 바로 표로 들어옵니다.</p>
<p>모든 계산은 공개된 요율과 법령 산식으로만 하며, 입력값을 서버로 보내거나 저장하지 않습니다. 요율은 매년 1월과 7월에 갱신하고 페이지마다 기준일을 적어 둡니다.</p>
<p>돈표는 <a href="${SAJU}">사주첩</a>을 만든 팀이 운영합니다. 문의는 사주첩 페이지 하단의 연락처를 이용해 주세요.</p>
</div>`;
  write('/about/', shell({ url: '/about/', title: '소개 — 돈표', desc: '돈표는 연봉·대출·퇴직금·알바 월급을 금액별로 미리 계산해 둔 돈 계산 사전입니다.', body: about }));

  const terms = `
${crumb([['/', '홈'], [null, '이용약관']])}
<h1 class="title">이용약관</h1>
<div class="doc">
<p>돈표의 모든 계산 결과는 공개된 요율과 산식에 따른 참고용 정보이며, 급여·세무·금융에 관한 전문 상담이나 법적 판단을 대신하지 않습니다. 실제 급여명세서, 대출 계약, 퇴직금 정산은 회사·은행·관계 기관의 계산이 우선합니다.</p>
<p>이용자는 계산 결과를 근거로 한 결정에 대해 스스로 책임지며, 돈표는 결과의 오류나 지연 갱신으로 생긴 손해에 대해 책임지지 않습니다. 사이트의 글과 표는 출처를 밝히고 인용할 수 있습니다.</p>
</div>`;
  write('/terms/', shell({ url: '/terms/', title: '이용약관 — 돈표', desc: '돈표 이용약관', body: terms, noindex: true }));

  const privacy = `
${crumb([['/', '홈'], [null, '개인정보처리방침']])}
<h1 class="title">개인정보처리방침</h1>
<div class="doc">
<h2>1. 수집하는 정보</h2><p>돈표는 회원 가입이나 개인정보 입력을 요구하지 않습니다. 검색창에 넣는 금액은 페이지 이동에만 쓰이고 서버로 전송되거나 저장되지 않습니다.</p>
<h2>2. 쿠키와 분석</h2><p>Google Analytics로 방문 통계(페이지 조회, 기기 종류 등)를 익명으로 수집하며, Google AdSense가 광고 게재를 위해 쿠키를 사용할 수 있습니다. 브라우저 설정에서 쿠키를 차단할 수 있습니다.</p>
<h2>3. 제3자 제공</h2><p>수집한 정보를 제3자에게 판매·제공하지 않습니다.</p>
<h2>4. 문의</h2><p>개인정보 관련 문의는 <a href="${SAJU}">사주첩</a>의 연락처로 보내 주세요.</p>
</div>`;
  write('/privacy/', shell({ url: '/privacy/', title: '개인정보처리방침 — 돈표', desc: '돈표 개인정보처리방침', body: privacy, noindex: true }));

  fs.writeFileSync(path.join(OUT, '404.html'), shell({ url: '/404.html', title: '페이지를 찾을 수 없어요 — 돈표', desc: '없는 페이지', noindex: true, body: `<h1 class="title" style="margin-top:40px">그런 페이지가 없어요</h1><p class="meta">주소가 바뀌었거나 아직 계산해 두지 않은 금액입니다.</p>${section('바로 가기', null, list([{ href: '/salary/', title: '연봉 실수령액표' }, { href: '/loan/', title: '대출 상환액 사전' }, { href: '/retire/', title: '퇴직금 세후표' }, { href: '/hourly/', title: '알바 월급표' }]))}` }));
}

/* ---------- 실업급여 ---------- */
const UI_PAYS = []; for (let m = 200; m <= 600; m += 50) UI_PAYS.push(m);
const UI_YEARS = [0, 1, 3, 5, 10];   /* 0 = 1년 미만 */
const uiLabel = (y) => y === 0 ? '1년 미만' : y === 10 ? '10년 이상' : `${y}년 이상`;
const uiUrl = (p, y) => `/unemployment/${p}/${y}/`;
const uiDays = (y, senior) => U.benefitDays(y === 0 ? 0.5 : y, senior);

function unemploymentPage(pm, y) {
  const pay = pm * 10000;
  const d = U.dailyBenefit(pay);
  const days = uiDays(y, false), daysS = uiDays(y, true);
  const url = uiUrl(pm, y);
  const monthly = d.daily * 30;
  const title = `월급 ${manwon(pay)} 실업급여 얼마? — 하루 ${won(d.daily)}, ${days}일 총 ${won(d.daily * days)} (피보험 ${uiLabel(y)}, ${YEAR}년)`;
  const desc = `월급 ${manwon(pay)}으로 고용보험 ${uiLabel(y)} 가입 뒤 비자발적으로 퇴직하면 ${YEAR}년 구직급여는 하루 ${won(d.daily)}, 한 달 약 ${won(monthly)}입니다. 50세 미만은 ${days}일(총 ${won(d.daily * days)}), 50세 이상은 ${daysS}일(총 ${won(d.daily * daysS)}).`;
  const capNote = d.capped === 'upper' ? `평균임금의 60%인 ${won(d.raw)}이 상한액 ${won(d.upper)}을 넘어 상한액을 받습니다` : d.capped === 'lower' ? `평균임금의 60%인 ${won(d.raw)}이 하한액 ${won(d.lower)}에 못 미쳐 하한액을 받습니다` : `평균임금의 60%인 ${won(d.raw)}을 그대로 받습니다`;
  const yearRows = UI_YEARS.map((yy) => ({ cls: yy === y ? 'on' : '', cells: [`<a href="${uiUrl(pm, yy)}">${uiLabel(yy)}</a>`, `${uiDays(yy)}일`, num(d.daily * uiDays(yy)), `${uiDays(yy, true)}일`, num(d.daily * uiDays(yy, true))] }));
  const payRows = neighbors(UI_PAYS, pm, 3).map((pp) => { const dd = U.dailyBenefit(pp * 10000); return { cls: pp === pm ? 'on' : '', cells: [`<a href="${uiUrl(pp, y)}">${manwon(pp * 10000)}</a>`, num(dd.daily), num(dd.daily * 30), num(dd.daily * days)] }; });
  const body = `
${crumb([['/unemployment/', '실업급여'], [null, `월급 ${manwon(pay)}`]])}
<h1 class="title">월급 ${manwon(pay)} · 피보험 ${uiLabel(y)} 실업급여</h1>
<p class="meta">${YEAR}년 구직급여 · 상한 ${won(d.upper)} · 하한 ${won(d.lower)} · 비자발적 퇴직 기준</p>
${hero({ label: '한 달 수령액 (30일)', value: monthly, sub: `하루 ${won(d.daily)} × 30일 · 50세 미만 ${days}일이면 총 ${won(d.daily * days)}`, bars: [d.daily / d.upper], legendL: `상한액 대비 ${pct(d.daily / d.upper, 0)}`, legendR: `상한 ${won(d.upper)}` })}
${ledger('구직급여일액 계산', '원', [
  { label: '1일 평균임금', note: `퇴직 전 3개월 급여 ${won(pay * 3)} ÷ 91.25일`, value: d.avgDaily },
  { label: '× 60%', value: d.raw },
  { label: '하한액', note: `최저시급 ${num(R0.minWage)}원 × 80% × 8시간`, value: d.lower },
  { label: '상한액', note: `${YEAR}년`, value: d.upper },
], { label: '적용 구직급여일액', value: d.daily })}
<div class="callout">${capNote}. ${YEAR}년은 상한액과 하한액 차이가 하루 ${won(d.upper - d.lower)}뿐이라 월급이 아주 적지 않은 한 대부분 상한액 근처를 받습니다.</div>
${section('지급일수와 총액', '피보험기간(고용보험 가입 기간)과 퇴직 당시 나이로 정해집니다', table(['피보험기간', '50세 미만', '총액', '50세 이상·장애인', '총액'], yearRows))}
${section('월급이 바뀌면', `피보험 ${uiLabel(y)} · 50세 미만 ${days}일`, table(['월급', '하루', '한 달', '총액'], payRows))}
${ad()}
${section('받을 수 있는 조건', null, `<div class="callout"><b>① 비자발적 퇴직</b> — 권고사직·계약만료·폐업 등. 자발적 퇴사는 원칙적으로 제외되지만 임금체불·직장 내 괴롭힘 같은 정당한 사유는 인정됩니다.<br><b>② 피보험단위기간 180일 이상</b> — 퇴직 전 18개월 안에 유급 근무일이 180일 이상.<br><b>③ 재취업 활동</b> — 워크넷 구직 등록과 정기 실업인정.<br><b>④ 퇴직 후 12개월 안에 신청</b> — 늦게 신청하면 받을 수 있는 일수가 줄어듭니다.</div>`)}
${section('이어서 계산하기', null, list([
  { href: retireUrl(nearest(RETIRE_PAYS, pm), y === 0 ? 1 : y), title: `월급 ${manwon(pay)} 퇴직금`, sub: `${y === 0 ? 1 : y}년 근속 세전·세후` },
  { href: salaryUrl(nearest(SALARIES, pm * 12)), title: `연봉 ${manwon(nearest(SALARIES, pm * 12) * 10000)} 실수령액`, sub: '다니던 회사 기준 월 실수령' },
]))}
<p class="note">구직급여일액은 평균임금의 60%이며 ${YEAR}년 상한액 ${won(d.upper)}·하한액 ${won(d.lower)}을 적용했습니다. 한 달 수령액은 30일 기준 근사값이고 실제로는 실업인정일마다 그 기간의 일수만큼 지급됩니다. 연장급여·조기재취업수당은 포함하지 않았습니다. <a href="/method/">계산 기준 보기</a></p>`;
  write(url, shell({ url, title, desc, body, nav: 'unemployment' }));
}

function unemploymentIndex() {
  const rows = UI_PAYS.map((pm) => { const d = U.dailyBenefit(pm * 10000); return { cells: [`${manwon(pm * 10000)}`, num(d.daily)].concat(UI_YEARS.map((y) => `<a href="${uiUrl(pm, y)}">${num(d.daily * uiDays(y))}</a>`)) }; });
  const up = U.dailyBenefit(9000000).upper, lo = U.dailyBenefit(1000000).lower;
  const body = `
${crumb([['/', '홈'], [null, '실업급여']])}
<h1 class="title">${YEAR}년 실업급여 계산표</h1>
<p class="meta">월급 × 피보험기간별 구직급여 총액(50세 미만) · 상한 ${won(up)} · 하한 ${won(lo)}</p>
${section('월급 × 피보험기간', '총 수령액(원) · 칸을 누르면 하루·한 달 금액과 50세 이상 일수', table(['월급', '하루'].concat(UI_YEARS.map(uiLabel)), rows))}
<p class="note">${YEAR}년은 상한액 ${won(up)}과 하한액 ${won(lo)} 차이가 작아 월급 차이가 거의 반영되지 않습니다. 피보험기간이 길수록, 50세 이상이면 더 오래 받습니다.</p>`;
  write('/unemployment/', shell({ url: '/unemployment/', title: `${YEAR}년 실업급여 계산표 — 월급·가입기간별 하루·한 달·총액`, desc: `${YEAR}년 구직급여 상한액·하한액을 반영해 월급과 고용보험 가입기간별로 하루 수령액, 한 달 수령액, 총액을 표로 정리했습니다.`, body, nav: 'unemployment' }));
}

/* ---------- 전세 vs 월세 ---------- */
const JEONSE = [5000, 7000, 10000, 15000, 20000, 25000, 30000, 40000, 50000, 70000, 100000];
const J_RATES = [0.03, 0.035, 0.04, 0.045, 0.05];
const J_SHARE = [1, 0.8, 0.6];
const CONV = [0.035, 0.04, 0.045, 0.05, 0.06];
const jeonseUrl = (d) => `/jeonse/${d}/`;

function jeonsePage(dm) {
  const D = dm * 10000;
  const url = jeonseUrl(dm);
  const mi = (r, s = 1) => Math.round(D * s * r / 12);
  const rent = (c, dep = 0) => Math.round((D - dep) * c / 12);
  const title = `전세 ${manwon(D)} 대출 이자 vs 월세 — 월 ${won(mi(0.04))} (연 4%) · 월세 전환 ${won(rent(CONVERSION_CAP))}`;
  const desc = `전세 보증금 ${manwon(D)}을 전세대출로 채우면 연 4%에서 월 이자 ${won(mi(0.04))}, 80%만 빌리면 ${won(mi(0.04, 0.8))}입니다. 같은 보증금을 월세로 돌리면 전환율 ${fmtRate(CONVERSION_CAP)} 기준 월 ${won(rent(CONVERSION_CAP))}. 금리별·전환율별 표와 반전세 환산을 정리했습니다.`;
  const rateRows = J_RATES.map((r) => ({ cls: r === 0.04 ? 'on' : '', cells: [fmtRate(r)].concat(J_SHARE.map((s) => num(mi(r, s)))) }));
  const convRows = CONV.map((c) => ({ cls: Math.abs(c - CONVERSION_CAP) < 1e-9 ? 'on' : '', cells: [fmtRate(c) + (Math.abs(c - CONVERSION_CAP) < 1e-9 ? ' (법정 상한)' : ''), num(rent(c)), num(rent(c, D / 2)), num(rent(c, D * 0.8))] }));
  const cuts = [10000000, 30000000, 50000000, 100000000].filter((x) => x <= D / 2).map((x) => ({ cells: [`보증금 −${manwon(x)}`, num(D - x), `+${num(Math.round(x * CONVERSION_CAP / 12))}`] }));
  const verdict = J_RATES.map((r) => ({ cells: [fmtRate(r), num(mi(r)), num(mi(r, 0.8))] }));
  const body = `
${crumb([['/jeonse/', '전세 vs 월세'], [null, manwon(D)]])}
<h1 class="title">전세 ${manwon(D)} — 대출 이자와 월세 비교</h1>
<p class="meta">전세대출 이자(만기일시, 이자만 납부) vs 월세 전환 · 전월세전환율 법정 상한 ${fmtRate(CONVERSION_CAP)} (기준금리 ${fmtRate(R0.baseRate)} + 2%p)</p>
${hero({ label: '전세대출 월 이자 (보증금 전액 · 연 4%)', value: mi(0.04), sub: `80%만 빌리면 ${won(mi(0.04, 0.8))} · 60%면 ${won(mi(0.04, 0.6))} · 1년 이자 ${won(mi(0.04) * 12)}` })}
${section('금리 × 대출 비율', '월 이자(원) · 전세대출은 보통 보증금의 80%까지', table(['금리', '전액', '80%', '60%'], rateRows))}
${section('월세로 돌리면', '보증금 일부를 월세로 바꿀 때 — 줄이는 보증금 × 전환율 ÷ 12', table(['전환율', '전액 월세', '보증금 절반', '보증금 20%만'], convRows))}
${cuts.length ? section('반전세 환산', `전환율 ${fmtRate(CONVERSION_CAP)} 기준 — 보증금을 줄인 만큼 월세가 붙습니다`, table(['조건', '남는 보증금', '월세'], cuts)) : ''}
${ad()}
${section('어느 쪽이 유리한가', '집주인이 부르는 월세가 이 표의 이자보다 낮으면 월세, 높으면 전세대출이 유리합니다 (보증료·세액공제 제외)', table(['대출 금리', '전액 대출 시 월 이자', '80% 대출 시'], verdict))}
${section('보증금이 바뀌면', '연 4% · 전액 대출 월 이자', chips(neighbors(JEONSE, dm, 3).map((x) => ({ label: short(x * 10000), value: Math.round(x * 10000 * 0.04 / 12), href: jeonseUrl(x), on: x === dm }))))}
<p class="note">전세대출 보증료(연 0.1~0.3%), 월세 세액공제(총급여 5,500만원 이하 17%·8,000만원 이하 15%, 연 1,000만원 한도), 전세보증보험료는 반영하지 않았습니다. 전월세전환율 상한은 계약 갱신 때 적용되며 신규 계약은 시장 전환율을 따릅니다. <a href="/method/">계산 기준 보기</a></p>`;
  write(url, shell({ url, title, desc, body, nav: 'loan' }));
}

function jeonseIndex() {
  const rows = JEONSE.map((dm) => ({ cells: [`<a href="${jeonseUrl(dm)}">${manwon(dm * 10000)}</a>`, num(Math.round(dm * 10000 * 0.035 / 12)), num(Math.round(dm * 10000 * 0.04 / 12)), num(Math.round(dm * 10000 * 0.045 / 12)), num(Math.round(dm * 10000 * CONVERSION_CAP / 12))] }));
  const body = `
${crumb([['/', '홈'], [null, '전세 vs 월세']])}
<h1 class="title">전세 보증금별 대출 이자와 월세 환산</h1>
<p class="meta">보증금 전액을 전세대출로 채울 때 월 이자와, 같은 보증금을 월세로 돌릴 때(전환율 ${fmtRate(CONVERSION_CAP)}) 금액</p>
${section('보증금별 비교', '월 금액(원) · 보증금을 누르면 금리·비율별 표와 반전세 환산', table(['보증금', '이자 3.5%', '이자 4.0%', '이자 4.5%', `월세 전환 ${fmtRate(CONVERSION_CAP)}`], rows))}`;
  write('/jeonse/', shell({ url: '/jeonse/', title: '전세 vs 월세 계산표 — 보증금별 전세대출 이자와 월세 전환액', desc: '전세 보증금 5천만원부터 10억원까지 전세대출 월 이자와 월세 전환액을 비교했습니다.', body, nav: 'loan' }));
}

/* ---------- 적금 ---------- */
const SAV_M = [10, 20, 30, 50, 70, 100, 150, 200];
const SAV_N = [12, 24, 36, 60];
const SAV_R = [0.025, 0.03, 0.035, 0.04, 0.045, 0.05];
const savUrl = (m, n) => `/savings/${m}/${n}/`;

function savings(monthly, months, r) {
  const principal = monthly * months;
  const interest = Math.round(monthly * r / 12 * months * (months + 1) / 2);
  const tax = Math.floor(interest * INTEREST_TAX / 10) * 10;
  const net = interest - tax;
  const total = principal + net;
  const real = Math.round(total / Math.pow(1.02, months / 12) - principal);
  return { principal, interest, tax, net, total, real };
}
function depositInterest(P, months, r) { const interest = Math.round(P * r * months / 12); const tax = Math.floor(interest * INTEREST_TAX / 10) * 10; return { interest, tax, net: interest - tax }; }

function savingsPage(mm, nMonths) {
  const monthly = mm * 10000;
  const s4 = savings(monthly, nMonths, 0.04);
  const url = savUrl(mm, nMonths);
  const yrs = nMonths / 12;
  const title = `월 ${manwon(monthly)} ${yrs}년 적금 이자 — 세후 ${won(s4.net)} (연 4%) · 만기 ${won(s4.total)}`;
  const desc = `매달 ${manwon(monthly)}씩 ${yrs}년 적금(연 4%, 단리)이면 세전 이자 ${won(s4.interest)}, 이자소득세 15.4%를 뺀 세후 ${won(s4.net)}, 만기 수령 ${won(s4.total)}입니다. 금리별 표와 물가를 감안한 실질 이득, 같은 돈 예금 비교를 정리했습니다.`;
  const rows = SAV_R.map((r) => { const s = savings(monthly, nMonths, r); return { cls: r === 0.04 ? 'on' : '', cells: [fmtRate(r), num(s.interest), num(s.tax), num(s.net), num(s.total)] }; });
  const dep = SAV_R.map((r) => { const d = depositInterest(s4.principal, nMonths, r); return { cells: [fmtRate(r), num(d.net), num(savings(monthly, nMonths, r).net)] }; });
  const body = `
${crumb([['/savings/', '적금'], [null, `월 ${manwon(monthly)}`]])}
<h1 class="title">월 ${manwon(monthly)} · ${yrs}년 적금 이자</h1>
<p class="meta">원금 ${won(s4.principal)} · 단리 · 이자소득세 ${pct(INTEREST_TAX)} · 매달 같은 날 납입 가정</p>
${hero({ label: '세후 이자 (연 4%)', value: s4.net, sub: `세전 ${won(s4.interest)} − 세금 ${won(s4.tax)} · 만기 수령 ${won(s4.total)}`, bars: [s4.principal / s4.total, s4.net / s4.total], legendL: `원금 ${pct(s4.principal / s4.total)}`, legendR: `이자 ${pct(s4.net / s4.total)}` })}
${section('금리별', `월 ${manwon(monthly)} × ${nMonths}개월`, table(['금리', '세전 이자', '세금', '세후 이자', '만기 수령'], rows))}
${section('물가를 감안하면', '만기 수령액을 연 2% 물가상승률로 나눈 오늘 가치에서 원금을 뺀 실질 이득 (연 4% 기준)', tiles([{ label: '세후 이자', value: s4.net }, { label: '실질 이득', value: s4.real }, { label: '만기 수령 (오늘 가치)', value: s4.principal + s4.real }]))}
${ad()}
${section('같은 돈을 예금에 넣으면', `${won(s4.principal)}을 한 번에 ${nMonths}개월 예치할 때의 세후 이자 — 적금은 뒤에 넣는 돈일수록 붙는 기간이 짧아 예금의 절반 정도`, table(['금리', '예금 세후 이자', '적금 세후 이자'], dep))}
${section('금액·기간이 바뀌면', '연 4% 세후 이자', cells(SAV_N.map((x) => ({ label: `${x / 12}년`, value: savings(monthly, x, 0.04).net, href: savUrl(mm, x), on: x === nMonths })), 4) + chips(SAV_M.map((x) => ({ label: `월 ${short(x * 10000)}`, value: savings(x * 10000, nMonths, 0.04).net, href: savUrl(x, nMonths), on: x === mm }))))}
<p class="note">비과세종합저축(만 65세 이상 등)이나 ISA 안에서 넣으면 이자소득세가 없거나 줄어듭니다. 우대금리 조건, 중도해지 이율, 월복리 상품은 반영하지 않았습니다. <a href="/method/">계산 기준 보기</a></p>`;
  write(url, shell({ url, title, desc, body, nav: 'loan' }));
}

function savingsIndex() {
  const rows = SAV_M.map((mm) => ({ cells: [`월 ${manwon(mm * 10000)}`].concat(SAV_N.map((nm) => `<a href="${savUrl(mm, nm)}">${num(savings(mm * 10000, nm, 0.04).net)}</a>`)) }));
  const body = `
${crumb([['/', '홈'], [null, '적금']])}
<h1 class="title">적금 이자 계산표</h1>
<p class="meta">월 납입액 × 기간별 세후 이자(연 4% 단리) · 칸을 누르면 금리별 표와 예금 비교</p>
${section('월 납입 × 기간', '세후 이자(원)', table(['월 납입'].concat(SAV_N.map((nm) => `${nm / 12}년`)), rows))}
<p class="note">이자소득세 ${pct(INTEREST_TAX)}를 뺀 금액입니다. 적금은 납입한 돈이 만기까지 남은 기간만큼만 이자를 받아, 같은 금리의 예금보다 이자가 절반 정도입니다.</p>`;
  write('/savings/', shell({ url: '/savings/', title: '적금 이자 계산표 — 월 납입액·기간·금리별 세후 이자', desc: '월 10만원부터 200만원까지, 1년부터 5년까지 적금 세후 이자와 만기 수령액, 예금과의 비교를 표로 정리했습니다.', body, nav: 'loan' }));
}

/* ---------- 대출 한도 (DSR) ---------- */
const DSR_RATES = [0.03, 0.035, 0.04, 0.045, 0.05, 0.055, 0.06];
const DSR_TERMS = [10, 20, 30, 40];
const dsrUrl = (m) => `/dsr/${m}/`;

function dsrPage(m) {
  const annual = m * 10000;
  const cap = Math.floor(annual * 0.4 / 12);
  const base = L.dsrLimit(annual, 0.045, 360);
  const url = dsrUrl(m);
  const title = `연봉 ${manwon(annual)} 대출 한도 — DSR 40%면 최대 ${manwon(base.principal)} (30년·4.5%)`;
  const desc = `연봉 ${manwon(annual)}의 DSR 40% 한도는 월 상환 여력 ${won(cap)}, 30년·연 4.5% 원리금균등이면 약 ${manwon(base.principal)}입니다. 금리·기간별 한도, 스트레스 금리 가산, 부부 합산, 기존 대출이 있을 때를 정리했습니다.`;
  const rows = DSR_TERMS.map((y) => ({ cls: y === 30 ? 'on' : '', cells: [`${y}년`].concat(DSR_RATES.map((r) => num(L.loanForPayment(cap, r, y * 12)))) }));
  const stressed = L.loanForPayment(cap, 0.06, 360);
  const spouse = [2000, 3000, 4000, 5000, 6000, 8000].map((s) => { const t = nearest(SALARIES, m + s); return { label: `+배우자 ${short(s * 10000)}`, value: L.dsrLimit(t * 10000, 0.045, 360).principal, href: dsrUrl(t) }; });
  const existing = [300000, 500000, 1000000].filter((x) => x < cap).map((x) => ({ cells: [`월 ${manwon(x)} 상환 중`, num(cap - x), num(L.loanForPayment(cap - x, 0.045, 360))] }));
  const p = netPay({ annual, nontax: NT });
  const loanNear = nearest(LOAN_AMOUNTS, Math.round(base.principal / 10000));
  const body = `
${crumb([['/dsr/', '대출 한도'], [null, `연봉 ${manwon(annual)}`]])}
<h1 class="title">연봉 ${manwon(annual)} 대출 한도 (DSR 40%)</h1>
<p class="meta">연간 원리금 상환액이 연봉의 40%를 넘지 않는 원금 · 다른 대출이 없다고 가정</p>
${hero({ label: '최대 대출 (30년 · 연 4.5% · 원리금균등)', value: base.principal, sub: `월 상환 여력 ${won(cap)} = 연봉 × 40% ÷ 12 · 월 실수령 ${won(p.net)}의 ${pct(cap / p.net, 0)}` })}
${section('기간 × 금리', '원리금균등 최대 원금(원)', table(['기간'].concat(DSR_RATES.map(fmtRate)), rows))}
${section('스트레스 금리를 얹으면', '수도권 주택담보대출은 실제 금리에 1.5%p를 더해 DSR을 계산합니다(2025년 7월 3단계). 4.5% 대출이면 6%로 계산해 한도가 줄어듭니다', `<div class="tiles"><div class="tile"><small>4.5% 기준 한도</small><span class="num">${manwon(Math.floor(base.principal / 10000) * 10000)}</span></div><div class="tile"><small>6.0%로 계산한 한도</small><span class="num">${manwon(Math.floor(stressed / 10000) * 10000)}</span></div><div class="tile"><small>줄어드는 금액</small><span class="num">${manwon(Math.floor((base.principal - stressed) / 10000) * 10000)}</span></div></div>`)}
${ad()}
${section('부부 합산이면', '두 사람 연봉을 더한 소득으로 계산 (30년 · 4.5%)', chips(spouse))}
${existing.length ? section('이미 갚는 대출이 있으면', '기존 원리금을 뺀 여력으로 계산', table(['기존 대출', '남는 월 여력', '추가 한도 (30년·4.5%)'], existing)) : ''}
${section('이어서 계산하기', null, list([
  { href: loanUrl(loanNear, 30, 0.045), title: `대출 ${manwon(loanNear * 10000)} 30년 4.5% 상환표`, sub: '한도만큼 빌리면 매달 얼마' },
  { href: salaryUrl(m), title: `연봉 ${manwon(annual)} 실수령액`, sub: `월 ${won(p.net)}` },
]))}
<p class="note">DSR 40%는 은행권 기준이며 2금융권은 50%입니다. 신용대출·카드론·자동차 할부의 원리금도 DSR에 들어가고, 스트레스 DSR 가산금리는 지역·시기에 따라 다릅니다. 실제 한도는 은행 심사와 LTV, 담보 가치에 따라 더 낮을 수 있습니다. <a href="/method/">계산 기준 보기</a></p>`;
  write(url, shell({ url, title, desc, body, nav: 'loan' }));
}

function dsrIndex() {
  const rows = SALARIES.map((m) => { const a = m * 10000; return { cells: [`<a href="${dsrUrl(m)}">연봉 ${manwon(a)}</a>`, num(Math.floor(a * 0.4 / 12)), num(L.dsrLimit(a, 0.035, 360).principal), num(L.dsrLimit(a, 0.045, 360).principal), num(L.dsrLimit(a, 0.055, 360).principal)] }; });
  const body = `
${crumb([['/', '홈'], [null, '대출 한도']])}
<h1 class="title">연봉별 대출 한도표 (DSR 40%)</h1>
<p class="meta">30년 원리금균등 기준 최대 원금 · 다른 대출이 없을 때 · 연봉을 누르면 기간·금리별 표와 부부 합산</p>
${section('연봉 × 금리', '원', table(['연봉', '월 상환 여력', '3.5%', '4.5%', '5.5%'], rows))}`;
  write('/dsr/', shell({ url: '/dsr/', title: '연봉별 대출 한도표 — DSR 40% 기준 최대 대출 원금', desc: '연봉 2,000만원부터 3억원까지 DSR 40% 기준 월 상환 여력과 30년 원리금균등 최대 대출 원금을 금리별로 정리했습니다.', body, nav: 'loan' }));
}

/* ---------- 연봉 순위 ---------- */
function rankPage() {
  const tops = [0.001, 0.01, 0.03, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
  const rows = tops.map((t) => ({ cells: [`상위 ${t * 100 < 1 ? (t * 100).toFixed(1) : Math.round(t * 100)}%`, num(RK.incomeAt(t)), num(Math.round(t * RK.STAT.workers))] }));
  const rows2 = SALARIES.filter((m) => m % 500 === 0 || m > 10000).map((m) => { const r = RK.rank(m * 10000); return { cells: [`<a href="${salaryUrl(m)}">연봉 ${manwon(m * 10000)}</a>`, `상위 ${r.topPct}%`, num(r.people)] }; });
  const body = `
${crumb([['/', '홈'], [null, '연봉 순위']])}
<h1 class="title">연봉 순위표 — 내 연봉은 상위 몇 %</h1>
<p class="meta">국세청 ${RK.STAT.year}년 귀속 근로소득 연말정산 통계 기준 · 신고 ${num(RK.STAT.workers)}명 · 중위 ${manwon(RK.STAT.median)} · 평균 ${manwon(RK.STAT.mean)}</p>
${hero({ label: '근로소득자 중위 연봉', value: RK.STAT.median, sub: `절반은 이보다 적게, 절반은 이보다 많이 받습니다 · 평균은 ${manwon(RK.STAT.mean)}, 1억원 초과는 ${pct(RK.STAT.over100m)}` })}
${section('상위 몇 %의 연봉 경계', '이 연봉 이상이면 해당 상위 비율에 듭니다', table(['상위', '연봉 경계', '해당 인원'], rows))}
${section('연봉별 상위 비율', '연봉 페이지에서 실수령액과 함께 볼 수 있습니다', table(['연봉', '상위', '이보다 많이 받는 사람'], rows2))}
${ad()}
<div class="callout"><b>어떻게 계산했나</b> — 국세청이 공개한 세 요약값(중위 ${manwon(RK.STAT.median)}, 평균 ${manwon(RK.STAT.mean)}, 1억원 초과 ${pct(RK.STAT.over100m)})을 모두 재현하는 로그정규 분포로 그 사이를 채웠습니다. 백분위 원자료 그대로는 아니라 몇 %p 오차가 있을 수 있고, 연말정산을 한 근로소득자만 대상이라 자영업자·일용직·무직은 들어 있지 않습니다. 연령·성별·지역 구분 없는 전체 기준입니다.</div>
${section('나이대·성별로 보면', null, list([{ href: '/age/', title: '나이대별 평균 월급표', sub: `통계청 ${AGE.year}년 임금근로일자리 소득 — 20대 ${manwon(AGE.groups[1].mean)}, 30대 ${manwon(AGE.groups[2].mean)}, 40대 ${manwon(AGE.groups[3].mean)}` }]))}
<p class="note">국세청 국세통계(근로소득 연말정산 신고 현황) · <a href="/method/">계산 기준 보기</a></p>`;
  write('/rank/', shell({ url: '/rank/', title: `연봉 순위표 — 내 연봉은 근로소득자 상위 몇 %? (국세청 ${RK.STAT.year}년 귀속)`, desc: `국세청 근로소득 통계로 연봉별 상위 비율과 상위 1%·10%·30%의 연봉 경계를 정리했습니다. 중위 ${manwon(RK.STAT.median)}, 평균 ${manwon(RK.STAT.mean)}.`, body, nav: 'salary' }));
}

/* ---------- 최저임금 ---------- */
function minWagePage(year) {
  const w = MIN_WAGE_HISTORY[year];
  const prev = MIN_WAGE_HISTORY[year - 1];
  const monthly = w * MONTH_HOURS, daily = w * 8, weekly = w * 48, annual = monthly * 12;
  const url = year === YEAR ? '/minimum-wage/' : `/minimum-wage/${year}/`;
  const p = netPay({ monthly, nontax: NT });
  const isCur = w === R0.minWage;
  const hist = Object.keys(MIN_WAGE_HISTORY).map(Number).sort((a, b) => b - a).map((y) => ({ cls: y === year ? 'on' : '', cells: [y === YEAR ? `<a href="/minimum-wage/">${y}년</a>` : (y === YEAR - 1 ? `<a href="/minimum-wage/${y}/">${y}년</a>` : `${y}년`), num(MIN_WAGE_HISTORY[y]), num(MIN_WAGE_HISTORY[y] * MONTH_HOURS), MIN_WAGE_HISTORY[y - 1] ? pct(MIN_WAGE_HISTORY[y] / MIN_WAGE_HISTORY[y - 1] - 1) : '-'] }));
  const hoursRows = [15, 20, 25, 30, 35, 40].map((h) => { const hol = Math.round(w * Math.min(h, 40) / 40 * 8); const wk = w * h + hol; const label = isCur ? `<a href="${hourlyUrl(w, h)}">주 ${h}시간</a>` : `주 ${h}시간`; return { cells: [label, num(hol), num(wk), num(Math.round(wk * WEEKS_PER_MONTH))] }; });
  const title = `${year}년 최저임금 — 시급 ${num(w)}원, 월급 ${won(monthly)}, 연봉 ${manwon(annual)}`;
  const desc = `${year}년 최저임금은 시급 ${num(w)}원입니다. 일급 ${won(daily)}, 주급 ${won(weekly)}(주휴 포함), 월급 ${won(monthly)}(209시간), 연봉 ${won(annual)}이고 4대보험과 세금을 뺀 월 실수령은 약 ${won(p.net)}입니다. 주 근무시간별 월급과 연도별 인상 내역을 정리했습니다.`;
  const body = `
${crumb([['/', '홈'], [null, `${year}년 최저임금`]])}
<h1 class="title">${year}년 최저임금 — 시급 ${num(w)}원</h1>
<p class="meta">${prev ? `${year - 1}년 ${num(prev)}원에서 ${pct(w / prev - 1)} 인상 · ` : ''}월급은 주 40시간 + 주휴 8시간 = 209시간 기준</p>
${hero({ label: '최저임금 월급 (세전)', value: monthly, sub: `시급 ${num(w)}원 × 209시간 · 연봉 ${won(annual)} · 4대보험·세금 빼면 약 ${won(p.net)}` })}
${tiles([{ label: '시급', value: w }, { label: '일급 (8시간)', value: daily }, { label: '주급 (40시간 + 주휴)', value: weekly }])}
${section('실수령액', `월급 ${won(monthly)}에서 4대보험과 소득세를 뺀 금액 — 부양가족·식대는 아래에서`, payVariants(annual))}
${section('주 근무시간별 월급', '주 15시간 이상이면 주휴수당이 붙습니다 · 한 달 4.345주', table(['근무시간', '주휴수당(주)', '주급', '월급'], hoursRows))}
${ad()}
${section('연도별 최저임금', null, table(['연도', '시급', '월급(209시간)', '인상률'], hist))}
<div class="callout"><b>알아둘 것</b> — 최저임금은 5인 미만 사업장·수습·아르바이트에도 똑같이 적용됩니다. 다만 1년 이상 근로계약을 맺은 수습 3개월은 90%(시급 ${num(Math.floor(w * 0.9))}원)까지 줄일 수 있습니다. 다음 해 최저임금은 매년 7~8월 최저임금위원회에서 정해 고시하며, 정해지면 이 페이지를 갱신합니다.</div>
${section('이어서 계산하기', null, list([
  { href: '/hourly/', title: '알바 월급표', sub: '시급 × 주 시간별 주휴수당·월급' },
  { href: salaryUrl(nearest(SALARIES, Math.round(annual / 10000))), title: `연봉 ${manwon(nearest(SALARIES, Math.round(annual / 10000)) * 10000)} 실수령액`, sub: '최저임금 연봉 근처의 실수령' },
  { href: '/rates/', title: `${YEAR}년 4대보험 요율표`, sub: '국민연금·건강보험·고용보험' },
]))}
<p class="note">고용노동부 최저임금 고시 기준. 주휴수당·월 209시간 환산은 근로기준법과 고용노동부 행정해석을 따랐습니다. <a href="/method/">계산 기준 보기</a></p>`;
  write(url, shell({ url, title, desc, body, nav: 'hourly' }));
}

/* ---------- 프리랜서 3.3% ---------- */
const FREE = []; for (let m = 100; m <= 1000; m += 50) FREE.push(m);
const freeUrl = (m) => `/freelance/${m}/`;

function freelancePage(mm) {
  const gross = mm * 10000;
  const f = LB.freelance(gross);
  const url = freeUrl(mm);
  const annual = gross * 12, prepaid = f.withheld * 12;
  const settle = [0.6, 0.7, 0.8].map((e) => { const s = LB.freelanceSettlement(annual, e, prepaid); return { cells: [pct(e, 0), num(s.base), num(s.total), s.due > 0 ? `납부 ${num(s.due)}` : `환급 ${num(-s.due)}`] }; });
  const emp = netPay({ monthly: gross, nontax: NT });
  const title = `프리랜서 월 ${manwon(gross)} 3.3% 떼면 실수령 ${won(f.net)} — 원천징수 ${won(f.withheld)}`;
  const desc = `프리랜서(사업소득) 월 ${manwon(gross)}에서 3.3%(소득세 3% + 지방소득세 0.3%) ${won(f.withheld)}을 떼면 실수령 ${won(f.net)}입니다. 연간 원천징수액과 5월 종합소득세 정산 예시, 같은 금액 직장인 실수령과 비교했습니다.`;
  const body = `
${crumb([['/freelance/', '프리랜서 3.3%'], [null, `월 ${manwon(gross)}`]])}
<h1 class="title">프리랜서 월 ${manwon(gross)} — 3.3% 떼면</h1>
<p class="meta">사업소득 원천징수 · 소득세 3% + 지방소득세 0.3% · 4대보험 직장가입 없음</p>
${hero({ label: '실수령액', value: f.net, sub: `${won(gross)}에서 ${won(f.withheld)} 원천징수 · 연 ${won(f.net * 12)}`, bars: [f.net / gross], legendL: `실수령 ${pct(f.net / gross)}`, legendR: `원천징수 3.3%` })}
${ledger('공제 내역', '월 기준 · 원', [{ label: '소득세', note: '3%', value: f.tax }, { label: '지방소득세', note: '소득세의 10%', value: f.local }], { label: '원천징수 합계', value: f.withheld })}
${tiles([{ label: '연 수입', value: annual }, { label: '연 원천징수', value: prepaid }, { label: '연 실수령', value: f.net * 12 }])}
${section('5월 종합소득세 정산 예시', '수입에서 필요경비를 뺀 소득으로 다시 계산해 미리 낸 3.3%와 정산합니다. 필요경비율은 업종별 단순경비율(국세청 고시)이나 실제 경비 — 여기서는 60·70·80% 가정, 본인 기본공제만 반영', table(['필요경비율', '과세표준', '결정세액(지방 포함)', '정산'], settle))}
<div class="callout"><b>4대보험은 따로</b> — 프리랜서는 직장가입자가 아니라 건강보험·국민연금을 지역가입자로 직접 냅니다(소득·재산 기준). 고용보험은 예술인·노무제공자 등 일부만 적용됩니다. 위 실수령에는 이 비용이 빠져 있습니다.</div>
${ad()}
${section('같은 돈을 직장인이 받으면', `세전 월급 ${won(gross)} 근로자의 실수령(식대 20만원 포함 기준)`, tiles([{ label: '직장인 실수령', value: emp.net }, { label: '프리랜서 실수령', value: f.net }, { label: '차이', value: f.net - emp.net }]) + `<p class="sub" style="margin-top:8px;font-size:12.5px;color:var(--muted)">직장인은 4대보험(회사가 절반 부담)과 소득세를 떼고, 프리랜서는 3.3%만 떼지만 보험료를 스스로 내고 퇴직금·실업급여가 없습니다.</p>`)}
${section('수입이 바뀌면', null, chips(neighbors(FREE, mm, 3).map((x) => ({ label: short(x * 10000), value: LB.freelance(x * 10000).net, href: freeUrl(x), on: x === mm }))))}
${section('이어서 계산하기', null, list([
  { href: monthlyUrl(nearest(MONTHLIES, Math.round(gross / 100000))), title: `월급 ${manwon(nearest(MONTHLIES, Math.round(gross / 100000)) * 100000)} 직장인 실수령액`, sub: '4대보험·소득세 공제 내역' },
  { href: '/rates/', title: `${YEAR}년 4대보험 요율표`, sub: '지역가입자 부담 참고' },
]))}
<p class="note">3.3% 원천징수는 사업소득(인적용역)에 적용됩니다. 기타소득으로 신고되는 강연료·원고료 등은 8.8%(필요경비 60% 인정 후 22%)로 다릅니다. 종합소득세 정산 예시는 단순화한 값이며 실제는 업종별 경비율, 다른 소득, 각종 공제에 따라 달라집니다. <a href="/method/">계산 기준 보기</a></p>`;
  write(url, shell({ url, title, desc, body, nav: 'monthly' }));
}

function freelanceIndex() {
  const rows = FREE.map((mm) => { const f = LB.freelance(mm * 10000); return { cells: [`<a href="${freeUrl(mm)}">월 ${manwon(mm * 10000)}</a>`, num(f.withheld), num(f.net), num(f.withheld * 12)] }; });
  const body = `
${crumb([['/', '홈'], [null, '프리랜서 3.3%']])}
<h1 class="title">프리랜서 3.3% 실수령액표</h1>
<p class="meta">사업소득 원천징수(소득세 3% + 지방소득세 0.3%) 후 실수령 · 월 100만원부터 1,000만원까지</p>
<form class="quick" data-quick="freelance" data-step="50" data-min="100" data-max="1000"><label for="q-free">월 수입으로 바로 찾기</label><div class="quick-row"><div class="quick-in"><input id="q-free" type="text" inputmode="numeric" placeholder="300"><span>만원</span></div><button class="btn" type="submit">실수령 보기</button></div></form>
${section('월 수입별', null, table(['월 수입', '원천징수 3.3%', '실수령', '연 원천징수'], rows))}
<p class="note">3.3%는 미리 내는 세금이고 다음 해 5월 종합소득세 신고로 정산됩니다. 각 페이지에 정산 예시와 직장인 비교가 있습니다.</p>`;
  write('/freelance/', shell({ url: '/freelance/', title: '프리랜서 3.3% 실수령액표 — 월 수입별 원천징수와 실수령', desc: '프리랜서 사업소득 3.3% 원천징수 후 실수령액을 월 수입별로 정리했습니다. 종합소득세 정산 예시와 직장인 비교 포함.', body, nav: 'monthly' }));
}

/* ---------- 연장·야간·휴일수당 ---------- */
const OT_PAYS = []; for (let m = 200; m <= 800; m += 50) OT_PAYS.push(m);
const otUrl = (m) => `/overtime/${m}/`;
const leaveUrl = (m) => `/leave/${m}/`;

function overtimePage(pm) {
  const pay = pm * 10000;
  const o = LB.overtime(pay);
  const url = otUrl(pm);
  const title = `월급 ${manwon(pay)} 야근·연장수당 — 통상시급 ${won(o.hourly)}, 연장 1시간 ${won(o.ext)}`;
  const desc = `월급 ${manwon(pay)}의 통상시급은 ${won(o.hourly)}(÷209시간)이고 연장근로 1시간은 1.5배 ${won(o.ext)}, 야간은 0.5배 ${won(o.night)} 가산, 휴일근로는 ${won(o.holiday8)}입니다. 월 연장 시간별 추가 수당과 실수령을 정리했습니다.`;
  const hoursRows = [5, 10, 20, 30, 40, 52].map((h) => { const extra = o.ext * h; const q = netPay({ monthly: pay + extra, nontax: NT }); return { cells: [`${h}시간`, num(extra), num(pay + extra), num(q.net)] }; });
  const ex = [
    { cells: ['야간 8시간 (소정근로 안, 22~06시)', num((o.hourly + o.night) * 8), '1.5배'] },
    { cells: ['연장 + 야간 4시간', num(o.extNight * 4), '2.0배'] },
    { cells: ['휴일 8시간', num(o.holiday8 * 8), '1.5배'] },
    { cells: ['휴일 10시간', num(o.holiday8 * 8 + o.holidayOver * 2), '8시간 1.5배 + 초과 2배'] },
  ];
  const body = `
${crumb([['/overtime/', '연장·야간·휴일수당'], [null, `월급 ${manwon(pay)}`]])}
<h1 class="title">월급 ${manwon(pay)} · 연장·야간·휴일수당</h1>
<p class="meta">통상시급 = 월급 ÷ 209시간 · 월급 전체가 통상임금이라고 가정 · 5인 이상 사업장 기준</p>
${hero({ label: '통상시급', value: o.hourly, sub: `연장 1시간 ${won(o.ext)} · 야간 가산 ${won(o.night)} · 휴일 1시간 ${won(o.holiday8)}` })}
${ledger('시간당 수당', '원', [
  { label: '연장근로', note: '1.5배 · 주 12시간 한도', value: o.ext },
  { label: '야간 가산', note: '22시~06시 · 0.5배 추가', value: o.night },
  { label: '연장 + 야간', note: '2.0배', value: o.extNight },
  { label: '휴일근로 8시간 이내', note: '1.5배', value: o.holiday8 },
  { label: '휴일근로 8시간 초과', note: '2.0배', value: o.holidayOver },
])}
${section('월 연장근로 시간별', '추가 수당과 그달 실수령(식대 20만원 포함 기준) · 주 12시간 한도라 월 최대 약 52시간', table(['월 연장', '추가 수당', '세전 합계', '실수령'], hoursRows))}
${section('야간·휴일 예시', null, table(['상황', '수당', '배율'], ex))}
${ad()}
<div class="callout"><b>5인 미만 사업장</b>은 연장·야간·휴일 가산수당 의무가 없어 1배(통상시급)만 받습니다. <b>포괄임금제</b>라도 계약에 정한 시간을 넘긴 연장근로는 추가로 청구할 수 있습니다. 상여·고정수당이 있으면 통상임금이 월급보다 커져 수당도 늘어납니다.</div>
${section('월급이 바뀌면', '연장 1시간 수당', chips(neighbors(OT_PAYS, pm, 3).map((x) => ({ label: short(x * 10000), value: LB.overtime(x * 10000).ext, href: otUrl(x), on: x === pm }))))}
${section('이어서 계산하기', null, list([
  { href: leaveUrl(pm), title: `월급 ${manwon(pay)} 연차수당`, sub: `하루 ${won(LB.leaveDaily(pay))}` },
  { href: monthlyUrl(nearest(MONTHLIES, Math.round(pay / 100000))), title: `월급 ${manwon(pay)} 실수령액`, sub: '연장 없이 받을 때' },
]))}
<p class="note">근로기준법 제56조 기준. 통상임금에 들어가는 수당 범위는 2024년 12월 대법원 판결 이후 넓어졌으니 고정 상여가 있으면 통상시급이 더 높을 수 있습니다. <a href="/method/">계산 기준 보기</a></p>`;
  write(url, shell({ url, title, desc, body, nav: 'monthly' }));
}

function overtimeIndex() {
  const rows = OT_PAYS.map((pm) => { const o = LB.overtime(pm * 10000); return { cells: [`<a href="${otUrl(pm)}">${manwon(pm * 10000)}</a>`, num(o.hourly), num(o.ext), num(o.extNight), num(o.ext * 20)] }; });
  const body = `
${crumb([['/', '홈'], [null, '연장·야간·휴일수당']])}
<h1 class="title">월급별 연장·야간·휴일수당표</h1>
<p class="meta">통상시급(÷209시간)과 1.5배·2배 수당 · 월급을 누르면 월 연장 시간별 실수령</p>
${section('월급별', '원', table(['월급', '통상시급', '연장 1시간', '연장+야간', '월 20시간 연장'], rows))}`;
  write('/overtime/', shell({ url: '/overtime/', title: '연장·야간·휴일수당 계산표 — 월급별 통상시급과 1.5배·2배 수당', desc: '월급 200만원부터 800만원까지 통상시급과 연장·야간·휴일근로 수당, 월 연장 시간별 추가 수당을 표로 정리했습니다.', body, nav: 'monthly' }));
}

/* ---------- 연차수당 ---------- */
function leavePage(pm) {
  const pay = pm * 10000;
  const daily = LB.leaveDaily(pay);
  const url = leaveUrl(pm);
  const title = `월급 ${manwon(pay)} 연차수당 — 하루 ${won(daily)}, 15일이면 ${won(daily * 15)}`;
  const desc = `월급 ${manwon(pay)}의 연차수당은 하루 ${won(daily)}(통상시급 × 8시간)입니다. 미사용 연차 일수별 수당과 근속연수별 연차 발생 일수를 정리했습니다.`;
  const dayRows = [1, 2, 3, 5, 7, 10, 15, 20, 25].map((d) => ({ cells: [`${d}일`, num(daily * d)] }));
  const yrRows = [[0.5, '6개월'], [1, '1년'], [2, '2년'], [3, '3년'], [5, '5년'], [7, '7년'], [10, '10년'], [15, '15년'], [21, '21년 이상']].map(([y, l]) => { const d = LB.leaveDays(y); return { cells: [l, `${d}일`, num(daily * d)] }; });
  const body = `
${crumb([['/leave/', '연차수당'], [null, `월급 ${manwon(pay)}`]])}
<h1 class="title">월급 ${manwon(pay)} 연차수당</h1>
<p class="meta">1일 통상임금 = 월급 ÷ 209시간 × 8시간 · 월급 전체가 통상임금이라고 가정</p>
${hero({ label: '연차 하루 수당', value: daily, sub: `통상시급 ${won(LB.ordinaryHourly(pay))} × 8시간 · 15일이면 ${won(daily * 15)}` })}
${section('미사용 연차별 수당', null, table(['미사용 연차', '수당'], dayRows))}
${section('근속연수별 연차 일수', '1년 미만은 개근한 달마다 1일(최대 11일), 1년 이상은 15일, 3년차부터 2년마다 1일 추가(최대 25일)', table(['근속', '연차', '전부 안 쓰면'], yrRows))}
${ad()}
<div class="callout"><b>언제 받나</b> — 연차가 소멸한 다음 달 임금 지급일에 미사용 일수만큼 받습니다. 회사가 연차 사용을 서면으로 촉진했는데 쓰지 않았다면 수당을 안 줄 수 있습니다. 연차수당은 근로소득이라 그달 세금이 조금 늘어납니다.</div>
${section('월급이 바뀌면', '하루 수당', chips(neighbors(OT_PAYS, pm, 3).map((x) => ({ label: short(x * 10000), value: LB.leaveDaily(x * 10000), href: leaveUrl(x), on: x === pm }))))}
${section('이어서 계산하기', null, list([
  { href: otUrl(pm), title: `월급 ${manwon(pay)} 연장·야간수당`, sub: `연장 1시간 ${won(LB.overtime(pay).ext)}` },
  { href: retireUrl(nearest(RETIRE_PAYS, pm), 5), title: `월급 ${manwon(pay)} 퇴직금`, sub: '5년 근속 세전·세후' },
]))}
<p class="note">근로기준법 제60조 기준. 5인 미만 사업장은 연차휴가 규정이 적용되지 않습니다. <a href="/method/">계산 기준 보기</a></p>`;
  write(url, shell({ url, title, desc, body, nav: 'monthly' }));
}

function leaveIndex() {
  const rows = OT_PAYS.map((pm) => { const d = LB.leaveDaily(pm * 10000); return { cells: [`<a href="${leaveUrl(pm)}">${manwon(pm * 10000)}</a>`, num(d), num(d * 5), num(d * 15)] }; });
  const body = `
${crumb([['/', '홈'], [null, '연차수당']])}
<h1 class="title">월급별 연차수당표</h1>
<p class="meta">하루 수당 = 월급 ÷ 209시간 × 8시간 · 월급을 누르면 일수별·근속별 표</p>
${section('월급별', '원', table(['월급', '하루', '5일', '15일'], rows))}`;
  write('/leave/', shell({ url: '/leave/', title: '연차수당 계산표 — 월급별 하루 수당과 미사용 일수별 금액', desc: '월급 200만원부터 800만원까지 연차수당 하루 금액과 미사용 연차 일수별 수당, 근속연수별 연차 발생 일수를 정리했습니다.', body, nav: 'monthly' }));
}

/* ---------- 자동차 할부 ---------- */
const CAR_PRICES = [1500, 2000, 2500, 3000, 3500, 4000, 5000, 6000, 8000, 10000];
const CAR_MONTHS = [12, 24, 36, 48, 60];
const CAR_RATES = [0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.10];
const CAR_DOWN = [0, 0.2, 0.3];
const carUrl = (p, n) => `/car-loan/${p}/${n}/`;

function carLoanPage(pm, n) {
  const P = pm * 10000;
  const url = carUrl(pm, n);
  const s = L.summary(P, 0.05, n);
  const title = `자동차 ${manwon(P)} ${n}개월 할부 — 월 ${won(s.monthly)} (연 5%), 총 이자 ${won(s.totalInterest)}`;
  const desc = `차값 ${manwon(P)}을 ${n}개월 할부(연 5%, 선수금 없음)로 사면 매달 ${won(s.monthly)}, 총 이자 ${won(s.totalInterest)}입니다. 금리·선수금별 월 납입액과 기간별 비교를 정리했습니다.`;
  const rows = CAR_RATES.map((r) => ({ cls: r === 0.05 ? 'on' : '', cells: [fmtRate(r)].concat(CAR_DOWN.map((d) => num(L.annuityPayment(Math.round(P * (1 - d)), r, n)))) }));
  const body = `
${crumb([['/car-loan/', '자동차 할부'], [null, manwon(P)]])}
<h1 class="title">자동차 ${manwon(P)} · ${n}개월 할부</h1>
<p class="meta">원리금균등 · 선수금 없음 · 연 5% 기준 · 취득세·보험 별도</p>
${hero({ label: '월 납입액 (연 5%)', value: s.monthly, sub: `${n}회 · 총 이자 ${won(s.totalInterest)} · 총 납입 ${won(s.totalPayment)}`, bars: [P / s.totalPayment, s.totalInterest / s.totalPayment], legendL: `차값 ${pct(P / s.totalPayment)}`, legendR: `이자 ${pct(s.totalInterest / s.totalPayment)}` })}
${section('금리 × 선수금', '월 납입액(원) · 선수금을 내면 그만큼 뺀 금액으로 계산', table(['금리', '선수금 0', '20%', '30%'], rows))}
${section('기간이 바뀌면', `${manwon(P)} · 연 5%`, cells(CAR_MONTHS.map((x) => ({ label: `${x}개월`, value: L.annuityPayment(P, 0.05, x), href: carUrl(pm, x), on: x === n })), 3))}
${ad()}
${tiles([{ label: '총 이자 (5%)', value: s.totalInterest }, { label: '총 납입', value: s.totalPayment }, { label: '취득세 약 7%', value: Math.round(P * 0.07) }])}
<div class="callout"><b>할부 vs 오토론</b> — 캐피탈 할부는 승인이 쉽지만 금리가 높고, 은행 오토론은 신용에 따라 금리가 낮습니다. 잔가 유예 할부는 월 납입이 적은 대신 만기에 목돈이 남습니다. 취득세(약 7%)·등록비·보험료는 별도이고 현금 구매 할인이 있으면 할부 이자와 비교해 보세요.</div>
${section('차값이 바뀌면', `${n}개월 · 연 5%`, chips(neighbors(CAR_PRICES, pm, 3).map((x) => ({ label: short(x * 10000), value: L.annuityPayment(x * 10000, 0.05, n), href: carUrl(x, n), on: x === pm }))))}
<p class="note">이자는 매달 남은 원금 × 연이율 ÷ 12로 계산했습니다. 실제 할부는 취급수수료, 보증보험료, 선수금 조건에 따라 달라집니다. <a href="/method/">계산 기준 보기</a></p>`;
  write(url, shell({ url, title, desc, body, nav: 'loan' }));
}

function carLoanIndex() {
  const rows = CAR_PRICES.map((pm) => ({ cells: [`${manwon(pm * 10000)}`].concat(CAR_MONTHS.map((n) => `<a href="${carUrl(pm, n)}">${num(L.annuityPayment(pm * 10000, 0.05, n))}</a>`)) }));
  const body = `
${crumb([['/', '홈'], [null, '자동차 할부']])}
<h1 class="title">자동차 할부 월 납입액표</h1>
<p class="meta">차값 × 기간 · 연 5% · 선수금 없음 · 칸을 누르면 금리·선수금별 표</p>
${section('차값 × 기간', '월 납입액(원)', table(['차값'].concat(CAR_MONTHS.map((n) => `${n}개월`)), rows))}`;
  write('/car-loan/', shell({ url: '/car-loan/', title: '자동차 할부 계산표 — 차값·기간·금리·선수금별 월 납입액', desc: '1,500만원부터 1억원까지 자동차 할부 월 납입액과 총 이자를 기간·금리·선수금별로 정리했습니다.', body, nav: 'loan' }));
}

/* ---------- 요율표 ---------- */
function ratesPage() {
  const R1 = RATES[PREV];
  const rows = [
    { cells: ['국민연금 (근로자)', pct(R1.pension, 2), pct(R0.pension, 2), `사업주도 같은 비율 · 합계 ${pct(R0.pension * 2, 1)}`] },
    { cells: ['건강보험 (근로자)', pct(R1.health, 3), pct(R0.health, 3), `보험료율 ${pct(R0.health * 2, 2)}의 절반`] },
    { cells: ['장기요양', pct(R1.care, 2), pct(R0.care, 2), '건강보험료에 곱함'] },
    { cells: ['고용보험 (근로자)', pct(R1.employment, 1), pct(R0.employment, 1), '사업주는 0.9% + 고용안정 0.25~0.85%'] },
    { cells: ['산재보험', '-', '-', '사업주 전액, 업종별 요율'] },
    { cells: ['국민연금 기준소득 상한', num(R1.pensionMax), num(R0.pensionMax), '하한 ' + num(R0.pensionMin) + '원 · 매년 7월 조정'] },
    { cells: ['최저임금 (시급)', num(R1.minWage), num(R0.minWage), `월급 ${num(R0.minWage * MONTH_HOURS)}원`] },
    { cells: ['구직급여 상한 (1일)', num(U.UPPER[PREV]), num(U.UPPER[YEAR]), `하한 ${num(Math.round(R0.minWage * 0.8 * 8))}원`] },
  ];
  const sched = Object.keys(PENSION_SCHEDULE).map(Number).sort().map((y) => ({ cls: y === YEAR ? 'on' : '', cells: [`${y}년`, pct(PENSION_SCHEDULE[y], 2), pct(PENSION_SCHEDULE[y] * 2, 1), num(Math.floor(3000000 * PENSION_SCHEDULE[y] / 10) * 10)] }));
  const ex = netPay({ monthly: 3000000 });
  const body = `
${crumb([['/', '홈'], [null, `${YEAR}년 4대보험 요율표`]])}
<h1 class="title">${YEAR}년 4대보험 요율표</h1>
<p class="meta">근로자 부담 기준 · ${PREV}년과 비교 · 매년 1월(요율)·7월(국민연금 상하한) 갱신</p>
${section(`${PREV}년 → ${YEAR}년`, null, table(['항목', `${PREV}년`, `${YEAR}년`, '비고'], rows))}
${section('국민연금 인상 일정', '2025년 3월 개정 국민연금법 — 보험료율 9% → 13%, 매년 0.5%p', table(['연도', '근로자', '합계', '월급 300만원이면'], sched))}
${ad()}
${section('월급 300만원의 공제 예시', `비과세 없음 · 본인 1인 · ${YEAR}년`, ledger('공제 내역', '월 기준 · 원', [
  { label: '국민연금', note: pct(R0.pension, 2), value: ex.pension },
  { label: '건강보험', note: pct(R0.health, 3), value: ex.health },
  { label: '장기요양', note: `건강보험의 ${pct(R0.care, 2)}`, value: ex.care },
  { label: '고용보험', note: pct(R0.employment, 1), value: ex.employment },
  { label: '소득세', note: '간이세액표', value: ex.tax },
  { label: '지방소득세', note: '10%', value: ex.local },
], { label: '실수령', value: ex.net }))}
${section('이어서 계산하기', null, list([
  { href: '/salary/', title: '연봉 실수령액표', sub: '연봉별 월 실수령' },
  { href: '/monthly/', title: '월급 실수령액표', sub: '세전 월급별 공제' },
  { href: '/minimum-wage/', title: `${YEAR}년 최저임금`, sub: `시급 ${num(R0.minWage)}원 · 월급 ${num(R0.minWage * MONTH_HOURS)}원` },
]))}
<p class="note">국민연금공단·국민건강보험공단·고용노동부 고시 기준. 건강보험 보수월액 상한, 국민연금 기준소득월액 상하한은 매년 바뀝니다. <a href="/method/">계산 기준 보기</a></p>`;
  write('/rates/', shell({ url: '/rates/', title: `${YEAR}년 4대보험 요율표 — 국민연금·건강보험·고용보험 근로자 부담과 인상 일정`, desc: `${YEAR}년 국민연금 ${pct(R0.pension, 2)}, 건강보험 ${pct(R0.health * 2, 2)}, 장기요양 ${pct(R0.care, 2)}, 고용보험 ${pct(R0.employment, 1)}. ${PREV}년과 비교하고 2033년까지 국민연금 인상 일정을 정리했습니다.`, body, nav: 'salary' }));
}

/* ---------- 나이대별 평균 월급 ---------- */
function agePage() {
  const G = AGE.groups;
  const rows = G.map((g) => ({ cells: [g.label, num(g.mean), num(g.male), num(g.female), pct(g.mean / g.prev - 1), num(AG.medianOf(g.key))] }));
  const bracketLabels = AGE.brackets.map((b, i) => i + 1 < AGE.brackets.length ? `${short(b)}~${short(AGE.brackets[i + 1])}` : `${short(b)} 이상`).map((s) => s.replace(/^0만~/, ''));
  const keys = ['20s', '30s', '40s', '50s', '60s'];
  const distRows = AGE.brackets.map((b, i) => ({ cells: [bracketLabels[i]].concat(keys.map((k) => AGE.dist[k][i].toFixed(1) + '%'), [AGE.dist.all[i].toFixed(1) + '%']) }));
  const sal = [2400, 3000, 3600, 4200, 5000, 6000, 8000, 10000];
  const posRows = sal.map((m) => ({ cells: [`<a href="${salaryUrl(m)}">연봉 ${manwon(m * 10000)}</a>`].concat(keys.map((k) => `상위 ${AG.ageRank(m * 10000 / 12, k).topPct}%`)) }));
  const body = `
${crumb([['/', '홈'], [null, '나이대별 평균 월급']])}
<h1 class="title">나이대별 평균 월급 — 20대부터 60대까지</h1>
<p class="meta">통계청 ${AGE.year}년 임금근로일자리 소득(보수) 결과 · ${AGE.year}년 12월 월평균 세전 보수 · ${AGE.year + 2}년 2월 발표</p>
${hero({ label: '임금근로자 평균 월소득', value: AGE.overall.mean, sub: `중위 ${won(AGE.overall.median)} · 남자 ${won(AGE.gender.male)} · 여자 ${won(AGE.gender.female)} · 전년 대비 ${pct(AGE.overall.mean / AGE.overall.prevMean - 1)} 증가` })}
${section('나이대별 평균과 중위', '중위는 소득구간 분포로 추정한 값', table(['나이대', '평균', '남자', '여자', '전년 대비', '중위(추정)'], rows))}
${section('나이대별 소득 분포', '월소득 구간에 드는 근로자 비율', table(['월소득'].concat(keys.map((k) => G.find((g) => g.key === k).label), ['전체']), distRows))}
${ad()}
${section('연봉별 나이대 위치', '연봉 ÷ 12를 그 나이대 분포에 놓았을 때 상위 몇 %인지 · 연봉을 누르면 실수령액과 함께', table(['연봉'].concat(keys.map((k) => G.find((g) => g.key === k).label)), posRows))}
<div class="callout"><b>읽을 때 주의</b> — 12월 한 달의 보수라 상여가 몰리는 달의 영향이 있고, 사회보험에 신고된 일자리만 대상이라 단시간·비공식 일자리는 빠집니다. 연봉 순위 페이지의 국세청 통계는 1년 총급여 기준이라 두 수치는 직접 비교하지 않는 게 좋습니다. 40대·50대 평균이 높은 것은 대기업·장기근속 비중 때문이며 같은 나이대 안의 편차가 큽니다.</div>
${section('이어서 보기', null, list([
  { href: '/rank/', title: '연봉 순위표', sub: '국세청 통계로 본 상위 몇 %' },
  { href: '/salary/', title: '연봉 실수령액표', sub: '연봉별 월 실수령' },
  { href: '/minimum-wage/', title: `${YEAR}년 최저임금`, sub: `월급 ${num(R0.minWage * MONTH_HOURS)}원` },
]))}
<p class="note">${AGE.source} · <a href="/method/">계산 기준 보기</a></p>`;
  write('/age/', shell({ url: '/age/', title: `나이대별 평균 월급 ${AGE.year} — 20대 ${manwon(G[1].mean)}, 30대 ${manwon(G[2].mean)}, 40대 ${manwon(G[3].mean)} (통계청)`, desc: `통계청 임금근로일자리 소득 결과로 본 20대·30대·40대·50대·60대 평균 월급과 남녀 차이, 소득 분포, 연봉별로 내 나이대에서 상위 몇 %인지 정리했습니다.`, body, nav: 'salary' }));
}

/* ---------- 빌드 ---------- */
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.cpSync(SRC, OUT, { recursive: true });

home();
salaryIndex(); SALARIES.forEach(salaryPage);
monthlyIndex(); MONTHLIES.forEach(monthlyPage);
netIndex(); NETS.forEach(netPage);
loanIndex(); LOAN_AMOUNTS.forEach((a) => { loanAmountIndex(a); LOAN_YEARS.forEach((y) => LOAN_RATES.forEach((r) => loanPage(a, y, r))); });
retireIndex(); RETIRE_PAYS.forEach((p) => RETIRE_YEARS.forEach((y) => retirePage(p, y)));
hourlyIndex(); HOURLY_WAGES.forEach((w) => HOURLY_HOURS.forEach((h) => hourlyPage(w, h)));
unemploymentIndex(); UI_PAYS.forEach((p) => UI_YEARS.forEach((y) => unemploymentPage(p, y)));
jeonseIndex(); JEONSE.forEach(jeonsePage);
savingsIndex(); SAV_M.forEach((m) => SAV_N.forEach((nm) => savingsPage(m, nm)));
dsrIndex(); SALARIES.forEach(dsrPage);
rankPage(); agePage();
minWagePage(YEAR); minWagePage(YEAR - 1);
freelanceIndex(); FREE.forEach(freelancePage);
overtimeIndex(); OT_PAYS.forEach(overtimePage);
leaveIndex(); OT_PAYS.forEach(leavePage);
carLoanIndex(); CAR_PRICES.forEach((pm) => CAR_MONTHS.forEach((n) => carLoanPage(pm, n)));
ratesPage();
docs();

const indexable = urls.filter((u) => !['/terms/', '/privacy/'].includes(u));
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexable.map((u) => `<url><loc>${SITE}${u}</loc><lastmod>${BUILD_ISO}</lastmod></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
fs.writeFileSync(path.join(OUT, 'CNAME'), 'donpyo.com\n');   /* 스킴 없이 도메인만 — 생일첩에서 'http://'가 섞여 인증서가 멈췄던 전례 */
console.log(`돈표 빌드 완료: 페이지 ${urls.length}장, ${((Date.now() - t0) / 1000).toFixed(1)}s`);
