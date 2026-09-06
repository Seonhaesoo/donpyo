/* 돈표 페이지 생성기 — node tools/build.mjs → dist/
 * 연봉·월급·실수령 역산·대출·퇴직금·알바 페이지를 금액 격자로 찍어낸다. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { YEAR, RATES, PENSION_SCHEDULE, MONTH_HOURS, WEEKS_PER_MONTH, PERCENTILE } from '../data/rates.mjs';
import { netPay, insurance, incomeTax, grossForNet } from '../engine/tax.mjs';
import * as L from '../engine/loan.mjs';
import * as R from '../engine/retire.mjs';
import { num, won, manwon, short, pct, rate as fmtRate, rateSlug } from '../engine/fmt.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'dist');
const SITE = 'https://donpyo.com';
const GA_ID = '';                                   /* GA4 측정 ID — 발급 후 넣기 */
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
  <nav class="nav"><a href="/salary/"${on('salary')}>연봉</a><a href="/monthly/"${on('monthly')}>월급</a><a href="/loan/"${on('loan')}>대출</a><a href="/retire/"${on('retire')}>퇴직금</a><a href="/hourly/"${on('hourly')}>알바</a></nav>
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
const cells = (items, cols = 3) => `<div class="grid${cols === 2 ? ' grid-2' : ''}">${items.map((c) => c.on ? `<span class="cell on"><small>${c.label}</small>${n(c.value)}</span>` : `<a class="cell" href="${c.href}"><small>${c.label}</small>${n(c.value)}</a>`).join('')}</div>`;
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
  const raises = [100, 300, 500, 1000].map((r) => { const q = netPay({ annual: annual + r * 10000, nontax: NT }); const diff = q.net - p.net; return { cells: [`+${manwon(r * 10000)}`, num(q.net), num(diff), pct(diff * 12 / (r * 10000))] }; });
  const hourly = p.gross / MONTH_HOURS;
  const dsr = L.dsrLimit(annual, 0.045, 360);
  const loanAmt = nearest(LOAN_AMOUNTS, Math.round(dsr.principal / 10000));
  const body = `
${crumb([['/salary/', '연봉 실수령액'], [null, `${Math.floor(m / 1000)}천만원대`]])}
<h1 class="title">연봉 ${manwon(annual)} 실수령액</h1>
<p class="meta">${YEAR}년 1월 요율 · 국세청 간이세액표 · 부양가족 본인 1인 · 식대 비과세 20만원 포함 기준 — 아래에서 바꿔 보세요</p>
${payVariants(annual)}
${section('이웃 연봉', null, chips(nb.map((v) => ({ label: short(v * 10000), value: netPay({ annual: v * 10000, nontax: NT }).net, href: salaryUrl(v), on: v === m }))))}
${section('연봉이 오르면 손에 오는 돈', '인상액의 상당 부분은 4대보험과 세금으로 빠집니다', table(['인상', '월 실수령', '월 증가', '인상액 대비'], raises))}
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
${section('계산 사전', null, `<div class="dict">
<a href="/salary/"><b>연봉 실수령액</b><span>4,200만원 → 월 <span class="num">${num(s42.net)}</span>원</span></a>
<a href="/loan/"><b>대출 상환금</b><span>2억·30년·4.5% → 월 <span class="num">${num(L.annuityPayment(200000000, 0.045, 360))}</span>원</span></a>
<a href="/net/"><b>실수령으로 연봉 찾기</b><span>월 300만원 받으려면 연봉 <span class="num">${num(grossForNet(3000000, { nontax: NT }) * 12)}</span>원</span></a>
<a href="/retire/"><b>퇴직금 세후</b><span>월급 350만·5년 → <span class="num">${num(R.severanceTax(R.severance(3500000, 5).amount, 5).net)}</span>원</span></a>
<a href="/hourly/"><b>알바 월급</b><span>시급 ${num(R0.minWage)}원·주 40시간 → 주휴 <span class="num">${num(R0.minWage * 8)}</span>원</span></a>
<a href="/monthly/"><b>월급 실수령액</b><span>세전 350만원 → <span class="num">${num(netPay({ monthly: 3500000, nontax: NT }).net)}</span>원</span></a>
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
<h2>출처</h2>
<ul><li>국세청 근로소득 간이세액표 (소득세법 시행령 별표 2)</li><li>국민연금공단·국민건강보험공단 보험료율 고시</li><li>고용노동부 최저임금 고시, 근로기준법 시행령(주휴·퇴직금)</li></ul>
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
docs();

const indexable = urls.filter((u) => !['/terms/', '/privacy/'].includes(u));
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexable.map((u) => `<url><loc>${SITE}${u}</loc><lastmod>${BUILD_ISO}</lastmod></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
/* 커스텀 도메인은 DNS 연결 후 Pages 설정(API)으로 붙인다. CNAME 파일은 그때 다시 켠다: fs.writeFileSync(path.join(OUT, 'CNAME'), 'donpyo.com\n'); */
console.log(`돈표 빌드 완료: 페이지 ${urls.length}장, ${((Date.now() - t0) / 1000).toFixed(1)}s`);
