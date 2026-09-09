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
import { GUIDES } from '../data/guides.mjs';
import { PRICES, PRICES_ASOF } from '../data/prices.mjs';
import { HISTORY, CPI } from '../data/rates-history.mjs';
import * as GO from '../engine/goal.mjs';
import * as GT from '../engine/gift.mjs';
import * as RE from '../engine/realty.mjs';
import * as DP from '../engine/deposit.mjs';
import * as IH from '../engine/inherit.mjs';
import * as IC from '../engine/income.mjs';
import * as PT from '../engine/property.mjs';
import * as CT from '../engine/cartax.mjs';
import * as LV from '../engine/ltv.mjs';
import * as SB from '../engine/subscription.mjs';
import * as PL from '../engine/parental.mjs';
import * as EL from '../engine/electric.mjs';
import * as EI from '../engine/eitc.mjs';
import * as NP from '../engine/pension.mjs';
import * as CG from '../engine/capgain.mjs';
import * as CC from '../engine/carcost.mjs';
import * as AN from '../engine/annual.mjs';
import * as FR from '../engine/freelance.mjs';
import * as NH from '../engine/nhis.mjs';
import { makeBundle } from './bundle.mjs';
import { num, won, manwon, short, pct, rate as fmtRate, rateSlug } from '../engine/fmt.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'dist');
const SITE = 'https://donpyo.com';
const GA_ID = 'G-4M37GXENV1';                       /* GA4 측정 ID — 속성 '돈표' 웹 스트림 (2026-09-06) */
const ADSENSE = 'ca-pub-9924140539322407';
const SAJU = 'https://sajucheop.com';
const R0 = RATES[YEAR];
const CHICKEN = PRICES.find((x) => x.key === 'chicken').price;   /* 치킨 한 마리 — data/prices.mjs 와 같은 값 */
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
  const GA = GA_ID ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script><script>if(location.hostname.indexOf('localhost')<0&&location.hostname.indexOf('127.0.0.1')<0&&location.protocol!=='file:'){window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA_ID}');}</script>\n` : '';
  const ADS = ADSENSE && !o.bare ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE}" crossorigin="anonymous"></script>\n` : '';
  const ld = o.ld || { '@context': 'https://schema.org', '@type': 'WebPage', name: o.title, description: o.desc, url: SITE + o.url, inLanguage: 'ko', isPartOf: { '@type': 'WebSite', name: '돈표', url: SITE } };
  const on = (k) => o.nav === k ? ' class="on"' : '';
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
${GA}${ADS}<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.desc)}">
<link rel="canonical" href="${SITE}${o.url}">
<meta name="naver-site-verification" content="4b97280869fc76ad09530d1871a862771b9c1bdf">
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
<body${o.bare ? ' class="bare"' : ''}>
${o.bare ? o.body : `<div class="app">
<header class="hdr">
  <a class="brand" href="/">${LOGO}<span class="brand-name">돈표</span></a>
  <nav class="nav"><a href="/salary/"${on('salary')}>연봉</a><a href="/monthly/"${on('monthly')}>월급</a><a href="/loan/"${on('loan')}>대출</a><a href="/retire/"${on('retire')}>퇴직금</a><a href="/unemployment/"${on('unemployment')}>실업급여</a><a href="/hourly/"${on('hourly')}>알바</a></nav>
  <span class="year-pill">${YEAR} 요율</span>
</header>
${o.body}
<footer class="foot">
  <div class="frow"><span>© 돈표 · ${YEAR}년 1월 요율 · 갱신 ${BUILD_ISO}</span><nav><a href="/guide/">서재</a><a href="/method/">계산 기준</a><a href="/about/">소개</a><a href="/embed/">위젯</a><a href="/terms/">이용약관</a><a href="/privacy/">개인정보</a><a href="https://bodyzip.com/">바디집</a></nav></div>
  <p class="fnote">계산 결과는 참고용입니다. 회사의 비과세 항목·상여·연말정산, 은행별 계산 방식에 따라 실제 금액과 다를 수 있습니다.</p>
</footer>
</div>`}
<script src="/js/app.js" defer></script>
${(o.scripts || []).map((s) => `<script src="${s}" defer></script>`).join('\n')}
</body>
</html>`;
}

/* ---------- 조각 ---------- */
const crumb = (items) => `<div class="crumb">${items.map(([h, t]) => h ? `<a href="${h}">${t}</a>` : `<span>${t}</span>`).join('<span>›</span>')}</div>`;
const hero = (o) => `<div class="hero"><div class="hero-label">${o.label}</div><div class="hero-num"><span class="num">${num(o.value)}</span><span class="unit">${o.unit || '원'}</span></div><div class="hero-sub">${o.sub}</div>${o.bars ? `<div class="bar">${o.bars.map((w) => `<i style="width:${(w * 100).toFixed(1)}%"></i>`).join('')}</div><div class="bar-legend"><span>${o.legendL}</span><span>${o.legendR}</span></div>` : ''}</div>`;
const ledger = (title, unit, rows, total) => `<div class="ledger"><div class="lg-head"><h2>${title}</h2><span>${unit}</span></div>${rows.map((r) => `<div class="lg-row"><div class="lbl"><span>${r.label}</span>${r.note ? `<small>${r.note}</small>` : ''}</div>${n(r.value)}</div>`).join('')}${total ? `<div class="lg-total"><span>${total.label}</span>${n(total.value)}</div>` : ''}</div>`;
/* 값이 11자(1억 이상) 넘는 타일이 있으면 좁은 화면에서 2열로 — 숫자가 두 줄로 꺾이지 않게 */
const tiles = (items) => `<div class="tiles${items.some((t) => (typeof t.value === 'number' ? num(t.value) : String(t.value)).length >= 11) ? ' tiles-wide' : ''}">${items.map((t) => `<div class="tile"><small>${t.label}</small>${typeof t.value === 'number' ? n(t.value) : `<span class="num">${t.value}</span>`}</div>`).join('')}</div>`;
const chips = (items) => `<div class="chips">${items.map((c) => c.on ? `<span class="chip on"><small>${c.label}</small>${n(c.value)}</span>` : `<a class="chip" href="${c.href}"><small>${c.label}</small>${n(c.value)}</a>`).join('')}</div>`;
const cells = (items, cols = 3) => `<div class="grid${cols === 2 ? ' grid-2' : cols === 4 ? ' grid-4' : ''}">${items.map((c) => c.on ? `<span class="cell on"><small>${c.label}</small>${n(c.value)}</span>` : `<a class="cell" href="${c.href}"><small>${c.label}</small>${n(c.value)}</a>`).join('')}</div>`;
const list = (items) => `<div class="list">${items.map((i) => `<a href="${i.href}"><span class="t"><b>${i.title}</b>${i.sub ? `<small>${i.sub}</small>` : ''}</span>${i.value != null ? n(i.value) : CHEV}</a>`).join('')}</div>`;
const section = (title, sub, inner) => `<section class="section"><h2>${title}</h2>${sub ? `<p class="sub">${sub}</p>` : ''}${inner}</section>`;
const ad = () => `<div class="adslot" aria-hidden="true"></div>`;
const lead = (s) => `<p class="lead">${s}</p>`;
const gtitle = (g) => g.title.replace(/\$\{YEAR\}/g, YEAR);
const guideUrl = (slug) => `/guide/${slug}/`;
const liveSalary = (m) => `<div class="live" data-live="salary">
<div class="live-head"><b>직접 조정</b><span>끌어서 바로 계산</span></div>
<label><span>연봉 <output data-out="a"></output></span><input type="range" data-k="a" min="2000" max="30000" step="100" value="${m}"></label>
<label><span>부양가족 <output data-out="d"></output></span><input type="range" data-k="d" min="1" max="6" step="1" value="1"></label>
<label><span>비과세 식대 <output data-out="n"></output></span><input type="range" data-k="n" min="0" max="200000" step="200000" value="${NT}"></label>
<div class="tiles"><div class="tile"><small>월 실수령</small><span class="num" data-out="net"></span></div><div class="tile"><small>4대보험</small><span class="num" data-out="ins"></span></div><div class="tile"><small>세금</small><span class="num" data-out="tax"></span></div></div>
<div class="live-foot"><span>연 실수령 <b class="num" data-out="year"></b>원</span><a data-out="link" href="#"></a></div>
</div>`;
const liveLoan = (a, y, r) => `<div class="live" data-live="loan">
<div class="live-head"><b>직접 조정</b><span>끌어서 바로 계산</span></div>
<label><span>금액 <output data-out="p"></output></span><input type="range" data-k="p" min="1000" max="100000" step="1000" value="${a}"></label>
<label><span>기간 <output data-out="y"></output></span><input type="range" data-k="y" min="1" max="40" step="1" value="${y}"></label>
<label><span>금리 <output data-out="r"></output></span><input type="range" data-k="r" min="10" max="100" step="1" value="${Math.round(r * 1000)}"></label>
<div class="tiles"><div class="tile"><small>월 상환액</small><span class="num" data-out="pay"></span></div><div class="tile"><small>총 이자</small><span class="num" data-out="interest"></span></div><div class="tile"><small>총 상환</small><span class="num" data-out="total"></span></div></div>
<div class="live-foot"><span>원리금균등 · 거치 없음</span><a data-out="link" href="#"></a></div>
</div>`;
const hoursText = (h) => h < 1 ? `${Math.max(1, Math.round(h * 60))}분` : h < 8 ? `${(Math.round(h * 10) / 10).toString().replace(/\.0$/, '')}시간` : h < MONTH_HOURS ? `${(Math.round(h / 8 * 10) / 10).toString().replace(/\.0$/, '')}일` : h < MONTH_HOURS * 12 ? `${(Math.round(h / MONTH_HOURS * 10) / 10).toString().replace(/\.0$/, '')}개월` : `${(Math.round(h / MONTH_HOURS / 12 * 10) / 10).toString().replace(/\.0$/, '')}년`;
const guideLinks = (slugs) => section('더 읽기', null, list(slugs.map((s) => GUIDES.find((g) => g.slug === s)).filter(Boolean).map((g) => ({ href: guideUrl(g.slug), title: gtitle(g), sub: '서재' }))));
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
${crumb([['/salary/', '연봉 실수령액'], [null, m >= 10000 ? `${Math.floor(m / 10000)}억원대` : `${Math.floor(m / 1000)}천만원대`]])}
<h1 class="title">연봉 ${manwon(annual)} 실수령액</h1>
<p class="meta">${YEAR}년 1월 요율 · 국세청 간이세액표 · 부양가족 본인 1인 · 식대 비과세 20만원 포함 기준 — 아래에서 바꿔 보세요</p>
${lead(`연봉 ${manwon(annual)}은 세전 월급 ${won(p.gross)}이고, 4대보험 ${won(p.insurance)}과 소득세·지방소득세 ${won(p.taxTotal)}을 빼면 매달 ${won(p.net)}을 받습니다. 연말정산 근로소득자 가운데 상위 ${rk.topPct}%에 해당하고, 30대 평균 월소득 ${manwon(AGE.groups[2].mean)}보다 ${p.gross >= AGE.groups[2].mean ? won(p.gross - AGE.groups[2].mean) + ' 많습니다' : won(AGE.groups[2].mean - p.gross) + ' 적습니다'}. 연봉이 300만원 오르면 손에 오는 돈은 월 ${won(netPay({ annual: annual + 3000000, nontax: NT }).net - p.net)} 늘어납니다.`)}
${payVariants(annual)}
<button class="btn btn-share" type="button" data-share-card data-l1="연봉 ${manwon(annual)}" data-l2="${num(p.net)}" data-l3="월 실수령액 · ${YEAR}년 · 식대 20만원 포함" data-l4="근로소득자 중 상위 ${rk.topPct}%">실수령액 카드 저장</button>
${section('근로소득자 중 어디쯤', `국세청 ${RK.STAT.year}년 귀속 연말정산 통계(신고 ${short(RK.STAT.workers)}명 · 중위 ${manwon(RK.STAT.median)} · 평균 ${manwon(RK.STAT.mean)})에 맞춘 추정`, `<div class="tiles"><div class="tile"><small>근로소득자 중</small><span class="num">상위 ${rk.topPct}%</span></div><div class="tile"><small>중위 연봉</small>${n(RK.STAT.median)}</div><div class="tile"><small>평균 연봉</small>${n(RK.STAT.mean)}</div></div>` + list([{ href: '/rank/', title: '연봉 순위표', sub: '상위 1%·10%·30%의 연봉 경계와 계산 방법' }]))}
${section('내 나이대와 비교', `통계청 ${AGE.year}년 임금근로일자리 소득 — 월평균 보수(세전) 기준, 연봉 ÷ 12 = ${won(p.gross)}으로 비교`, table(['나이대', '평균 월소득', '나와 차이', '그 나이대에서 내 위치'], AGE.groups.filter((g) => !['10s', '70s'].includes(g.key)).map((g) => { const r = AG.ageRank(p.gross, g.key); const diff = p.gross - g.mean; return { cells: [g.label, num(g.mean), (diff >= 0 ? '+' : '−') + num(Math.abs(diff)), `상위 ${r.topPct}%`] }; })) + list([{ href: '/age/', title: '나이대별 평균 월급표', sub: `20대 ${manwon(AGE.groups[1].mean)} · 30대 ${manwon(AGE.groups[2].mean)} · 40대 ${manwon(AGE.groups[3].mean)} · 성별 평균과 소득 분포` }]))}
${section('이웃 연봉', null, chips(nb.map((v) => ({ label: short(v * 10000), value: netPay({ annual: v * 10000, nontax: NT }).net, href: salaryUrl(v), on: v === m }))))}
${liveSalary(m)}
${section('이 연봉으로 할 수 있는 것', null, (() => { const hn = p.net / MONTH_HOURS; const g30 = Math.round(p.net * 0.3); return `<div class="tiles"><div class="tile"><small>세후 시급</small>${n(Math.round(hn))}</div><div class="tile"><small>치킨 한 마리는</small><span class="num">${hoursText(CHICKEN / hn)}</span></div><div class="tile"><small>실수령 30% 저축 → 1억까지</small><span class="num">${GO.fmtMonths(GO.monthsToGoal(100000000, g30, 0.03))}</span></div></div>`; })() + list([
  { href: `/time/${m}/`, title: '내 시간으로 사는 물건', sub: `아메리카노부터 아파트까지, 세후 시급 ${won(Math.round(p.net / MONTH_HOURS))}으로 환산` },
  { href: `/goal/10000/${nearest(SAVE_M, Math.round(p.net * 0.3 / 10000))}/`, title: '1억 모으기 시계', sub: '저축액·금리별 도달 기간, 물가 반영' },
  { href: `/negotiate/${m}/`, title: '연봉 협상 근거 만들기', sub: '상위 %, 나이대 평균, 물가·최저임금 인상률을 한 장으로' },
  { href: `/tax-receipt/${m}/`, title: '내 세금 영수증', sub: '1년에 나와 회사가 내는 돈, 어디로 가나' },
  { href: `/history/${m}/`, title: '2020년부터의 실수령 변화', sub: '같은 연봉이 요율 인상으로 얼마나 줄었나' },
  { href: `/yearend/?a=${m}`, title: '연말정산 미리보기', sub: '카드·의료비·연금저축을 넣으면 환급인지 추가 납부인지' },
  { href: '/couple/', title: '둘이 합쳐 얼마까지 빌릴까', sub: '링크 하나로 상대 연봉 받아 합산 한도 계산' },
]))}
${section('연봉이 오르면 손에 오는 돈', '인상액 가운데 4대보험과 세금을 뺀 몫만 손에 옵니다 — 마지막 열이 그 비율', table(['인상', '월 실수령', '월 증가', '인상액 대비'], raises))}
${section('인상률로 보면', '연봉 협상에서 %로 이야기할 때 — 새 연봉은 만원 단위로 반올림', table(['인상률', '새 연봉', '월 실수령', '월 증가'], [3, 5, 7, 10, 15, 20].map((r) => { const a2 = Math.round(annual * (1 + r / 100) / 10000) * 10000; const q = netPay({ annual: a2, nontax: NT }); return { cells: [`+${r}%`, num(a2), num(q.net), num(q.net - p.net)] }; })))}
${section('국민연금 인상 일정에 따른 변화', `연금개혁으로 보험료율이 매년 0.5%p씩(근로자 부담은 0.25%p씩) 올라 ${Math.max(...Object.keys(PENSION_SCHEDULE).map(Number))}년 근로자 부담 6.5%가 됩니다. 다른 요율과 세금이 그대로라고 가정한 값입니다`, pensionSchedule(annual))}
${section(`${PREV}년과 비교`, null, tiles([{ label: `${PREV}년 월 실수령`, value: prev.net }, { label: `${YEAR}년 월 실수령`, value: p.net }, { label: '차이', value: p.net - prev.net }]))}
${section('시급·일급으로 보면', `월 ${MONTH_HOURS}시간(주 40시간 + 주휴) 기준`, `<div class="tiles"><div class="tile"><small>시급</small>${n(Math.round(hourly))}</div><div class="tile"><small>일급 (8시간)</small>${n(Math.round(hourly * 8))}</div><div class="tile"><small>최저임금 ${num(R0.minWage)}원 대비</small><span class="num">${(hourly / R0.minWage).toFixed(2)}배</span></div></div>`)}
${ad()}
${section('이 연봉의 대출 한도', `DSR 40% 기준 — 연간 원리금 상환액이 연봉의 40%를 넘지 않는 선. 다른 대출이 없다고 가정`, tiles([{ label: '월 상환 여력', value: dsr.monthlyCap }, { label: '연 4.5%·30년 원리금균등', value: dsr.principal }, { label: '연 3.5%·30년', value: L.dsrLimit(annual, 0.035, 360).principal }]) + list([{ href: loanUrl(loanAmt, 30, 0.045), title: `대출 ${manwon(loanAmt * 10000)} 30년 4.5% 상환표`, sub: `월 ${won(L.annuityPayment(loanAmt * 10000, 0.045, 360))} · 실수령의 ${pct(L.annuityPayment(loanAmt * 10000, 0.045, 360) / p.net, 0)}` }]))}
${section('이어서 계산하기', null, list([
  { href: monthlyUrl(nearest(MONTHLIES, Math.round(p.gross / 10000))), title: `월급 ${manwon(nearest(MONTHLIES, Math.round(p.gross / 10000)) * 10000)} 실수령액`, sub: '월급 기준으로 다시 보기' },
  { href: netUrl(nearest(NETS, Math.round(p.net / 10000))), title: `월 ${manwon(nearest(NETS, Math.round(p.net / 10000)) * 10000)} 실수령하려면`, sub: '필요한 연봉 역산' },
  { href: retireUrl(nearest(RETIRE_PAYS, Math.round(p.gross / 500000) * 50), 10), title: `월급 ${manwon(nearest(RETIRE_PAYS, Math.round(p.gross / 500000) * 50) * 10000)} 퇴직금`, sub: '10년 근속 세전·세후' },
]))}
${guideLinks(['net-pay-steps', 'withholding-table', 'dependents'])}
<p class="note">국세청 근로소득 간이세액표(100% 기준)와 ${YEAR}년 1월 4대보험 요율로 계산했습니다. 회사의 비과세 항목·상여·연말정산에 따라 실제 급여명세서와 차이가 날 수 있습니다. <a href="/method/">계산 기준 보기</a></p>`;
  write(url, shell({ url, title, desc, body, nav: 'salary', scripts: ['/js/engine.js', '/js/live.js'] }));
}

function salaryIndex() {
  const rows = SALARIES.map((m) => { const p = netPay({ annual: m * 10000, nontax: NT }); return { cells: [`<a href="${salaryUrl(m)}">연봉 ${manwon(m * 10000)}</a>`, num(p.gross), num(p.deductions), num(p.net)] }; });
  const body = `
${crumb([['/', '홈'], [null, '연봉 실수령액']])}
<h1 class="title">${YEAR}년 연봉 실수령액표</h1>
<p class="meta">연봉 2,000만원부터 3억원까지 · 부양가족 본인 1인 · 식대 비과세 20만원 포함 · 국세청 간이세액표 기준</p>
<form class="quick" data-quick="salary" data-step="100" data-min="2000" data-max="30000"><label for="q-salary">연봉으로 바로 찾기</label><div class="quick-row"><div class="quick-in"><input id="q-salary" type="text" inputmode="numeric" placeholder="4200"><span>만원</span></div><button class="btn" type="submit">실수령액 보기</button></div></form>
${section('연봉별 월 실수령액', '연봉을 누르면 부양가족·비과세별 표, 인상 시 변화, 대출 한도까지 볼 수 있습니다', table(['연봉', '세전 월급', '월 공제', '월 실수령'], rows))}
<p class="note">1억원 초과는 1,000만원, 2억원 초과는 5,000만원 단위로 실었습니다. 간이세액표는 월 1,000만원 초과분에 별도 계산식을 적용합니다.</p>`;
  write('/salary/', shell({ url: '/salary/', title: `${YEAR}년 연봉 실수령액표 — 2,000만원부터 3억원까지`, desc: `${YEAR}년 연봉별 월 실수령액을 한 표로 정리했습니다. 4대보험과 간이세액표 소득세를 뺀 실제 손에 쥐는 돈, 연봉을 누르면 부양가족·비과세별 상세 표가 나옵니다.`, body, nav: 'salary' }));
}

/* ---------- 월급 페이지 ---------- */
function monthlyPage(m) {
  const gross = m * 10000;
  const p = netPay({ monthly: gross, nontax: NT });
  const url = monthlyUrl(m);
  const title = `월급 ${manwon(gross)} 실수령액 — ${won(p.net)} (${YEAR}년)`;
  const desc = `${YEAR}년 세전 월급 ${manwon(gross)}의 실수령액은 ${won(p.net)}입니다. 국민연금·건강보험·장기요양·고용보험·소득세 공제 내역과 부양가족·비과세 식대별 표, 연봉 환산을 정리했습니다.`;
  const nb = neighbors(MONTHLIES, m, 3);
  const annualNear = nearest(SALARIES, Math.round(gross * 12 / 10000));
  const body = `
${crumb([['/monthly/', '월급 실수령액'], [null, `${num(Math.floor(m / 100) * 100)}만원대`]])}
<h1 class="title">월급 ${manwon(gross)} 실수령액</h1>
<p class="meta">세전 월급 기준 · ${YEAR}년 1월 요율 · 식대 비과세 20만원 포함 · 연봉으로는 ${manwon(gross * 12)}</p>
${lead(`월급 ${manwon(gross)}은 4대보험 ${won(p.insurance)}과 소득세·지방소득세 ${won(p.taxTotal)}을 빼면 ${won(p.net)}이 통장에 들어옵니다. 연봉으로는 ${manwon(gross * 12)}이고 연말정산 근로소득자 가운데 상위 ${RK.rank(gross * 12).topPct}% 수준입니다. 부양가족이 많으면 실수령이 늘고, 식대 비과세가 없으면 줄어듭니다 — 아래에서 바꿔 보세요.`)}
${payVariants(gross * 12)}
${section('이웃 월급', null, chips(nb.map((v) => ({ label: short(v * 10000), value: netPay({ monthly: v * 10000, nontax: NT }).net, href: monthlyUrl(v), on: v === m }))))}
${section('국민연금 인상 일정에 따른 변화', '국민연금 근로자 부담이 매년 0.25%p씩 오를 때의 월 실수령액', pensionSchedule(gross * 12))}
${ad()}
${section('이어서 계산하기', null, list([
  { href: salaryUrl(annualNear), title: `연봉 ${manwon(annualNear * 10000)} 실수령액`, sub: '연봉 기준 상세 표 · 인상 시 변화 · 대출 한도' },
  { href: netUrl(nearest(NETS, Math.round(p.net / 10000))), title: `월 ${manwon(nearest(NETS, Math.round(p.net / 10000)) * 10000)} 실수령하려면`, sub: '필요한 세전 월급 역산' },
  { href: retireUrl(nearest(RETIRE_PAYS, Math.round(gross / 500000) * 50), 5), title: `월급 ${manwon(nearest(RETIRE_PAYS, Math.round(gross / 500000) * 50) * 10000)} 퇴직금`, sub: '5년 근속 세전·세후' },
]))}
${guideLinks(['net-pay-steps', 'insurance-rates'])}
<p class="note">국세청 근로소득 간이세액표(100% 기준)와 ${YEAR}년 1월 4대보험 요율로 계산했습니다. <a href="/method/">계산 기준 보기</a></p>`;
  write(url, shell({ url, title, desc, body, nav: 'monthly' }));
}

function monthlyIndex() {
  const rows = MONTHLIES.map((m) => { const p = netPay({ monthly: m * 10000, nontax: NT }); return { cells: [`<a href="${monthlyUrl(m)}">월급 ${manwon(m * 10000)}</a>`, num(p.deductions), num(p.net), num(p.annualGross)] }; });
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
  const target = m * 10000;
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
${lead(`월 ${manwon(target)}을 손에 쥐려면 세전 월급 ${won(g1)}, 연봉 ${won(g1 * 12)}이 필요합니다. 그 사이 ${won(g1 - target)}이 4대보험과 세금으로 빠지고, 부양가족이 2인이면 필요 연봉이 ${won(grossForNet(target, { dependents: 2, nontax: NT }) * 12)}으로 줄어듭니다.`)}
${hero({ label: '필요한 세전 월급', value: g1, sub: `연봉으로 ${won(g1 * 12)} · 부양가족 본인 1인 · 식대 비과세 20만원 포함일 때 실수령 ${won(p.net)}` })}
${ledger('이때의 공제 내역', '월 기준 · 원', [
  { label: '국민연금', value: p.pension }, { label: '건강보험', value: p.health }, { label: '장기요양', value: p.care }, { label: '고용보험', value: p.employment }, { label: '소득세', value: p.tax }, { label: '지방소득세', value: p.local },
], { label: '공제 합계', value: p.deductions })}
${section('부양가족·비과세에 따라', '가족이 많으면 같은 실수령액에 필요한 연봉이 줄고, 비과세 식대가 없으면 늘어납니다', table(['조건', '세전 월급', '연봉', '실수령'], rows.concat(rowsNt)))}
${section('이웃 실수령액', '칩의 숫자는 필요한 연봉(원)', chips(nb.map((v) => ({ label: short(v * 10000), value: grossForNet(v * 10000, { nontax: NT }) * 12, href: netUrl(v), on: v === m }))))}
${ad()}
${section('이어서 계산하기', null, list([
  { href: salaryUrl(nearest(SALARIES, Math.round(g1 * 12 / 10000))), title: `연봉 ${manwon(nearest(SALARIES, Math.round(g1 * 12 / 10000)) * 10000)} 실수령액`, sub: '가장 가까운 연봉 페이지' },
  { href: monthlyUrl(nearest(MONTHLIES, Math.round(g1 / 10000))), title: `월급 ${manwon(nearest(MONTHLIES, Math.round(g1 / 10000)) * 10000)} 실수령액`, sub: '가장 가까운 월급 페이지' },
]))}
<p class="note">1,000원 단위로 맞춘 근사값입니다. 연봉 협상 때 "실수령 얼마"를 세전으로 옮길 때 참고하세요. <a href="/method/">계산 기준 보기</a></p>`;
  write(url, shell({ url, title, desc, body, nav: 'monthly' }));
}

function netIndex() {
  const rows = NETS.map((m) => { const g = grossForNet(m * 10000, { nontax: NT }); return { cells: [`<a href="${netUrl(m)}">월 ${manwon(m * 10000)}</a>`, num(g), num(g * 12)] }; });
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
${lead(`${manwon(P)}을 연 ${fmtRate(r)}로 ${y}년 동안 원리금균등으로 갚으면 매달 ${won(s.monthly)}이고, ${months}번 갚는 동안 이자만 ${won(s.totalInterest)}으로 원금의 ${pct(s.totalInterest / P, 0)}입니다. 원금균등을 고르면 첫 달 ${won(e.first)}부터 시작해 총 이자가 ${won(s.totalInterest - e.totalInterest)} 줄고, 금리가 0.5%p 낮아지면 월 ${won(s.monthly - L.annuityPayment(P, r - 0.005, months))} 절약됩니다.`)}
${hero({ label: '매달 갚는 돈', value: s.monthly, sub: `${months}회 · 총 이자 ${won(s.totalInterest)} · 총 상환 ${won(s.totalPayment)}`, bars: [P / s.totalPayment, s.totalInterest / s.totalPayment], legendL: `원금 ${pct(P / s.totalPayment)}`, legendR: `이자 ${pct(s.totalInterest / s.totalPayment)}` })}
${section('상환 방식 비교', '원리금균등은 매달 같은 금액, 원금균등은 첫 달이 많고 점점 줄어듦, 만기일시는 이자만 내다 만기에 원금', table(['방식', '월 상환액', '총 이자'], [
  { cls: 'on', cells: ['원리금균등', num(s.monthly), num(s.totalInterest)] },
  { cells: ['원금균등', `${num(e.first)} → ${num(e.last)}`, num(e.totalInterest)] },
  { cells: ['만기일시', `${num(b.rows[0].payment)} + 만기 ${short(P)}`, num(b.totalInterest)] },
]))}
${section('상환표', `처음 12회 · 그 뒤는 몇 년 단위로 남은 원금 · 원리금균등`, table(['회차', '원금', '이자', '남은 원금'], showRows.concat([{ cls: 'gap', cells: ['···', '', '', ''] }], yearRows)))}
${section('금리가 바뀌면', `${manwon(P)} · ${y}년`, cells(LOAN_RATES.map((x) => ({ label: fmtRate(x), value: L.annuityPayment(P, x, months), href: loanUrl(a, y, x), on: x === r })), 3))}
${section('기간이 바뀌면', `${manwon(P)} · 연 ${fmtRate(r)}`, cells(LOAN_YEARS.map((x) => ({ label: `${x}년`, value: L.annuityPayment(P, r, x * 12), href: loanUrl(a, x, r), on: x === y })), 3))}
${ad()}
${refi.length ? section('낮은 금리로 갈아타면', '같은 원금·기간, 중도상환수수료 0.6% 가정(2025년 이후 은행권 주택담보대출 수준) — 수수료를 절약액으로 나눈 회수 기간', table(['새 금리', '월 상환액', '월 절약', '수수료 회수'], refi)) : ''}
${section('매달 더 갚으면', '원리금균등 상환액에 얹어 갚을 때 줄어드는 기간과 이자', table(['추가 상환', '총 기간', '단축', '절약 이자'], extra))}
${section('이 대출을 감당하려면', `DSR 40% 기준 — 월 상환액 ${won(s.monthly)}이 연소득의 40%를 넘지 않으려면`, tiles([{ label: '필요 연소득', value: needIncome }, { label: '월 상환액', value: s.monthly }, { label: `연봉 ${short(salaryNear * 10000)} 실수령 대비`, value: Math.round(s.monthly / netPay({ annual: salaryNear * 10000, nontax: NT }).net * 100) }]).replace(/<span class="num">(\d+)<\/span><\/div><\/div>$/, '<span class="num">$1%</span></div></div>') + list([{ href: salaryUrl(salaryNear), title: `연봉 ${manwon(salaryNear * 10000)} 실수령액`, sub: `월 ${won(netPay({ annual: salaryNear * 10000, nontax: NT }).net)}` }]))}
${section('금액이 바뀌면', `${y}년 · 연 ${fmtRate(r)}`, chips(neighbors(LOAN_AMOUNTS, a, 3).map((x) => ({ label: short(x * 10000), value: L.annuityPayment(x * 10000, r, months), href: loanUrl(x, y, r), on: x === a }))))}
${liveLoan(a, y, r)}
${guideLinks(['loan-types', 'dsr'])}
<p class="note">이자는 매달 남은 원금에 연이율의 12분의 1을 곱해 원 단위로 반올림했습니다. 실제 대출은 금리 변동, 거치기간, 중도상환수수료, 은행의 일할 계산 방식에 따라 달라집니다. <a href="/method/">계산 기준 보기</a></p>`;
  write(url, shell({ url, title, desc, body, nav: 'loan', scripts: ['/js/engine.js', '/js/live.js'] }));
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
${lead(`월급 ${manwon(pay)}으로 ${y}년을 채우고 퇴직하면 퇴직금은 세전 ${won(s.amount)}, 퇴직소득세와 지방소득세 ${won(t.total)}을 뺀 ${won(t.net)}을 받습니다. 세금은 퇴직금의 ${pct(t.total / s.amount)}로, 근속연수공제와 환산급여 방식 덕분에 같은 금액의 월급보다 훨씬 가볍습니다.`)}
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
  { href: monthlyUrl(nearest(MONTHLIES, pm)), title: `월급 ${manwon(nearest(MONTHLIES, pm) * 10000)} 실수령액`, sub: '매달 손에 쥐는 돈' },
]))}
${guideLinks(['severance-tax'])}
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
${lead(`시급 ${num(w)}원으로 주 ${h}시간 일하면 ${eligible ? `주휴수당 ${won(weeklyHoliday)}을 더해 주급 ${won(weekly)}` : `주 15시간 미만이라 주휴수당 없이 주급 ${won(weekly)}`}, 한 달이면 약 ${won(monthly)}입니다. ${insured ? `월 ${monthHours.toFixed(0)}시간이라 4대보험에 들어가 실수령은 ${won(p.net)}입니다.` : '월 60시간 미만이라 4대보험 의무가입 대상은 아닙니다.'}`)}
${hero({ label: '월급 (세전)', value: monthly, sub: `주급 ${won(weekly)} × ${WEEKS_PER_MONTH.toFixed(3)}주 · ${eligible ? `주휴수당 주 ${won(weeklyHoliday)} 포함` : '주 15시간 미만이라 주휴수당 없음'}`, bars: eligible ? [weeklyBase / weekly, weeklyHoliday / weekly] : null, legendL: `기본급 ${pct(weeklyBase / weekly)}`, legendR: `주휴수당 ${pct(weeklyHoliday / weekly)}` })}
${ledger('한 주 계산', '원', [
  { label: '기본급', note: `${num(w)}원 × ${h}시간`, value: weeklyBase },
  { label: '주휴수당', note: eligible ? `${num(w)}원 × ${holidayHours.toFixed(1)}시간 (주 ${Math.min(h, 40)}시간 ÷ 40 × 8)` : '주 15시간 미만은 해당 없음', value: weeklyHoliday },
], { label: '주급', value: weekly })}
${section('4대보험과 실수령', insured ? `월 ${monthHours.toFixed(0)}시간이면 4대보험 가입 대상(월 60시간 이상) — 근로자 부담분을 뺀 금액` : `월 ${monthHours.toFixed(0)}시간이라 4대보험 의무가입 대상이 아닙니다(월 60시간 미만). 고용보험은 3개월 이상 근무 시 가입`, insured ? tiles([{ label: '4대보험 공제', value: p.insurance }, { label: '소득세·지방세', value: p.taxTotal }, { label: '월 실수령', value: p.net }]) : tiles([{ label: '월급', value: monthly }, { label: '공제', value: 0 }, { label: '실수령', value: monthly }]))}
${section('시간이 바뀌면', `시급 ${num(w)}원`, cells(HOURLY_HOURS.map((x) => { const el = x >= 15; const wk = w * x + (el ? Math.round(w * Math.min(x, 40) / 40 * 8) : 0); return { label: `주 ${x}시간`, value: Math.round(wk * WEEKS_PER_MONTH), href: hourlyUrl(w, x), on: x === h }; }), 3))}
${ad()}
${section('시급이 바뀌면', `주 ${h}시간`, cells(HOURLY_WAGES.map((x) => { const wk = x * h + (eligible ? Math.round(x * Math.min(h, 40) / 40 * 8) : 0); return { label: `${num(x)}원${x === R0.minWage ? ' (최저)' : ''}`, value: Math.round(wk * WEEKS_PER_MONTH), href: hourlyUrl(x, h), on: x === w }; }), 3))}
${guideLinks(['weekly-holiday-pay'])}
<p class="note">주휴수당은 1주 소정근로시간 15시간 이상이고 그 주를 개근했을 때 하루치(주 40시간 기준 8시간) 임금을 더 받는 제도입니다. 연장·야간·휴일 근로수당(1.5배)은 포함하지 않았습니다. <a href="/method/">계산 기준 보기</a></p>`;
  write(url, shell({ url, title, desc, body, nav: 'hourly' }));
}

function hourlyIndex() {
  const rows = HOURLY_WAGES.map((w) => ({ cells: [`${num(w)}원${w === R0.minWage ? ' (최저)' : ''}`].concat(HOURLY_HOURS.map((h) => { const el = h >= 15; const wk = w * h + (el ? Math.round(w * Math.min(h, 40) / 40 * 8) : 0); return `<a href="${hourlyUrl(w, h)}">${num(Math.round(wk * WEEKS_PER_MONTH))}</a>`; })) }));
  const body = `
${crumb([['/', '홈'], [null, '알바 월급']])}
<h1 class="title">알바 월급표 — 시급 × 주 근무시간</h1>
<p class="meta">${YEAR}년 최저임금 시급 ${num(R0.minWage)}원 · 주휴수당 포함(주 15시간 이상) · 한 달 ${WEEKS_PER_MONTH.toFixed(3)}주</p>
${section('시급 × 주 시간', '월급(세전, 원) · 칸을 누르면 주휴수당·4대보험·실수령', table(['시급'].concat(HOURLY_HOURS.map((h) => `주 ${h}시간`)), rows))}
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
<form class="quick quick-smart" data-quick="smart"><label for="q-home">숫자로 바로 찾기 — 연봉·월급·대출·시급·퇴직금 무엇이든</label><div class="quick-row"><div class="quick-in"><input id="q-home" type="text" placeholder="연봉 4200 / 2억 30년 4.5% / 시급 12000 주20" autocomplete="off" autocapitalize="off"></div><button class="btn" type="submit">찾기</button></div><div class="quick-hint" data-hint aria-live="polite">예시를 누르거나 직접 적어 보세요</div><div class="quick-ex"><button type="button">연봉 4200</button><button type="button">월급 350</button><button type="button">실수령 300</button><button type="button">2억 30년 4.5%</button><button type="button">시급 12000 주 20시간</button><button type="button">퇴직금 350 5년</button><button type="button">전세 2억</button><button type="button">적금 50 3년</button><button type="button">증여 1억</button><button type="button">복비 5억</button><button type="button">예금 1억 1년</button><button type="button">상속 10억</button><button type="button">재산세 5억</button><button type="button">자동차세 1598cc</button><button type="button">전기요금 300kwh</button><button type="button">육아휴직 300만</button><button type="button">무주택 10년 부양가족 2명</button><button type="button">근로장려금 1500 홑벌이</button><button type="button">국민연금 300 20년</button><button type="button">양도세 15억 9억</button><button type="button">차 유지비 3000</button><button type="button">연차 5년</button><button type="button">프리랜서 300만</button><button type="button">보수월액 300만원 건강보험료</button></div><div class="quick-links"><a href="/salary/">연봉표</a><a href="/monthly/">월급표</a><a href="/net/">실수령으로 연봉 찾기</a><a href="/loan/">대출표</a></div></form>
<script>window.DONPYO_GRID=${JSON.stringify({ salary: SALARIES, monthly: MONTHLIES, net: NETS, loanA: LOAN_AMOUNTS, loanY: LOAN_YEARS, loanR: LOAN_RATES.map(rateSlug), retireP: RETIRE_PAYS, retireY: RETIRE_YEARS, hourlyW: HOURLY_WAGES, hourlyH: HOURLY_HOURS, uiP: UI_PAYS, uiY: UI_YEARS, jeonse: JEONSE, savM: SAV_M, savN: SAV_N, free: FREE, ot: OT_PAYS, carP: CAR_PRICES, carN: CAR_MONTHS, goals: GOALS, saveM: SAVE_M, gift: GIFT_AMOUNTS, bokbi: BOKBI, acq: ACQ, depP: DEP_P, depN: DEP_N, inh: INH_AMOUNTS, inc: INC, prop: PROP, cars: CARS, ltv: LTV_P, subH: SUB_H, subF: SUB_F, leave: PL_WAGES, elec: EL_KWH, eitc: EITC_WAGES, penI: PEN_I, penY: PEN_Y, capS: CAP_SALES, carcost: CARCOST_P, annualY: ANNUAL_YEARS, annualP: ANNUAL_PAYS, nhisE: NHIS_E, nhisL: NHIS_L })}</script>
<a class="feature" href="/yearend/"><span class="feature-mark">13</span><span class="feature-text"><b>연말정산, 돌려받을까 더 낼까</b><span>연봉·카드·의료비·연금저축만 넣으면 결정세액과 환급 예상액이 바로</span></span><svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 3.5L10.5 8 6 12.5" stroke="#8A948E" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path></svg></a>
<a class="feature" href="/couple/"><span class="feature-mark">둘</span><span class="feature-text"><b>둘이 합쳐 얼마까지 빌릴 수 있을까</b><span>링크 하나 보내면 상대가 연봉만 넣고 끝 — 합산 대출 한도·전세 여력</span></span><svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 3.5L10.5 8 6 12.5" stroke="#8A948E" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path></svg></a>
${section('급여와 일', null, `<div class="dict">
<a href="/salary/"><b>연봉 실수령액</b><span>4,200만원 → 월 <span class="num">${num(s42.net)}</span>원</span></a>
<a href="/monthly/"><b>월급 실수령액</b><span>세전 350만원 → <span class="num">${num(netPay({ monthly: 3500000, nontax: NT }).net)}</span>원</span></a>
<a href="/net/"><b>실수령으로 연봉 찾기</b><span>월 300만원 받으려면 연봉 <span class="num">${num(grossForNet(3000000, { nontax: NT }) * 12)}</span>원</span></a>
<a href="/minimum-wage/"><b>${YEAR}년 최저임금</b><span>시급 ${num(R0.minWage)}원 → 월급 <span class="num">${num(R0.minWage * MONTH_HOURS)}</span>원</span></a>
<a href="/freelance/"><b>프리랜서 3.3%</b><span>300만원 → 실수령 <span class="num">${num(FR.withholding(3000000).net)}</span>원 · 기타소득 8.8%면 <span class="num">${num(FR.withholding(3000000, 'other').net)}</span>원</span></a>
<a href="/overtime/"><b>연장·야간·휴일수당</b><span>월급 350만 → 연장 1시간 <span class="num">${num(LB.overtime(3500000).ext)}</span>원</span></a>
<a href="/leave/"><b>연차수당</b><span>월급 350만 → 하루 <span class="num">${num(LB.leaveDaily(3500000))}</span>원</span></a>
<a href="/annual/"><b>연차휴가·연차수당</b><span>근속 5년 <span class="num">${AN.annualDays(5)}</span>일 · 월 통상임금 300만이면 하루 <span class="num">${num(AN.annualPay(3000000, 1).daily)}</span>원</span></a>
<a href="/hourly/"><b>알바 월급</b><span>시급 ${num(R0.minWage)}원·주 40시간 → 주휴 <span class="num">${num(R0.minWage * 8)}</span>원</span></a>
<a href="/rank/"><b>연봉 순위</b><span>연봉 6,000만원은 근로소득자 상위 <span class="num">${RK.rank(60000000).topPct}</span>%</span></a>
<a href="/age/"><b>나이대별 평균 월급</b><span>30대 <span class="num">${num(AGE.groups[2].mean)}</span>원 · 40대 <span class="num">${num(AGE.groups[3].mean)}</span>원</span></a>
<a href="/time/"><b>내 시간으로 사는 물건</b><span>연봉 4,200만 세후 시급 <span class="num">${num(Math.round(s42.net / MONTH_HOURS))}</span>원 → 치킨 ${hoursText(CHICKEN / (s42.net / MONTH_HOURS))}</span></a>
<a href="/negotiate/"><b>연봉 협상 근거</b><span>상위 %·나이대 평균·물가·최저임금으로 <span class="num">한 장</span> 정리</span></a>
<a href="/tax-receipt/"><b>내 세금 영수증</b><span>연봉 4,200만 → 1년 <span class="num">${num(s42.annualDeductions)}</span>원, 회사 부담까지 더 있음</span></a>
<a href="/yearend/"><b>연말정산 미리보기</b><span>카드·의료비·연금저축 넣으면 <span class="num">환급 · 추가 납부</span> 예상액</span></a>
<a href="/history/"><b>실수령 6년 변화</b><span>2020년 → ${YEAR}년, 같은 연봉의 실수령이 얼마나 줄었나</span></a>
<a href="/goal/"><b>1억 모으기 시계</b><span>월 100만·연 3% → <span class="num">${GO.fmtMonths(GO.monthsToGoal(100000000, 1000000, 0.03))}</span></span></a>
</div>`)}
${section('대출·저축·제도', null, `<div class="dict">
<a href="/loan/"><b>대출 상환금</b><span>2억·30년·4.5% → 월 <span class="num">${num(L.annuityPayment(200000000, 0.045, 360))}</span>원</span></a>
<a href="/dsr/"><b>대출 한도 (DSR)</b><span>연봉 5,000만 → 최대 <span class="num">${num(L.dsrLimit(50000000, 0.045, 360).principal)}</span>원</span></a>
<a href="/jeonse/"><b>전세 vs 월세</b><span>전세 2억 대출 4% → 월 이자 <span class="num">${num(Math.round(200000000 * 0.04 / 12))}</span>원</span></a>
<a href="/savings/"><b>적금 세후 이자</b><span>월 50만·3년·4% → <span class="num">${num(savings(500000, 36, 0.04).net)}</span>원</span></a>
<a href="/car-loan/"><b>자동차 할부</b><span>3,000만·60개월·5% → 월 <span class="num">${num(L.annuityPayment(30000000, 0.05, 60))}</span>원</span></a>
<a href="/carcost/"><b>자동차 유지비</b><span>3,000만 휘발유차 · 연 15,000km → 월 <span class="num">${num(carcostCalc(3000).monthly)}</span>원 (감가 포함) · 현금만 <span class="num">${num(carcostCalc(3000).cashMonthly)}</span>원</span></a>
<a href="/retire/"><b>퇴직금 세후</b><span>월급 350만·5년 → <span class="num">${num(R.severanceTax(R.severance(3500000, 5).amount, 5).net)}</span>원</span></a>
<a href="/unemployment/"><b>실업급여</b><span>월급 350만·5년 → 하루 <span class="num">${num(U.dailyBenefit(3500000).daily)}</span>원 × ${U.benefitDays(5)}일</span></a>
<a href="/nhis/"><b>건강보험료 (직장·지역)</b><span>보수월액 300만 → 근로자 <span class="num">${num(NH.employee(3000000).employee)}</span>원 · 지역가입자 연소득 3,000만 <span class="num">${num(NH.local({ income: 30000000 }).total)}</span>원</span></a>
<a href="/rates/"><b>${YEAR}년 4대보험 요율표</b><span>근로자 부담 국민연금 <span class="num">${pct(R0.pension, 2)}</span> · 건강보험 <span class="num">${pct(R0.health, 3)}</span></span></a>
</div>`)}
${section('세금·부동산', null, `<div class="dict">
<a href="/gift-tax/"><b>증여세</b><span>자녀에게 1억 → <span class="num">${num(GT.giftTax(100000000, 'child').tax)}</span>원 · 배우자는 6억까지 0원</span></a>
<a href="/bokbi/"><b>부동산 복비</b><span>5억 매매 → 최대 <span class="num">${num(RE.brokerage(500000000).fee)}</span>원 · 전세 2억 <span class="num">${num(RE.brokerage(200000000, 'rent').fee)}</span>원</span></a>
<a href="/acquisition-tax/"><b>주택 취득세</b><span>5억 1주택 → <span class="num">${num(RE.acquisitionTax(500000000).total)}</span>원 · 생애최초는 200만원 감면</span></a>
<a href="/inheritance-tax/"><b>상속세</b><span>10억 → 배우자·자녀 있으면 <span class="num">0</span>원 · 자녀만이면 <span class="num">${num(IH.inheritTax(1000000000, { spouse: false, children: 1 }).tax)}</span>원</span></a>
<a href="/income-tax/"><b>종합소득세</b><span>소득금액 5,000만 → <span class="num">${num(IC.incomeTax(50000000).total)}</span>원 · 3.3% 정산은 얼마</span></a>
<a href="/property-tax/"><b>주택 재산세</b><span>공시가 5억 1주택 → 연 <span class="num">${num(PT.propertyTax(500000000).total)}</span>원 (7월·9월 반씩)</span></a>
<a href="/car-tax/"><b>자동차세</b><span>1,598cc → 연 <span class="num">${num(CT.carTax(1598).total)}</span>원 · 1월 연납 ${pct(CT.ANNUAL_DISCOUNT[YEAR] || 0, 0)} 할인</span></a>
<a href="/ltv/"><b>LTV 대출 한도</b><span>10억 집 규제지역 → <span class="num">${num(LV.ltvLimit(1000000000).limit)}</span>원 · 비규제 <span class="num">${num(LV.ltvLimit(1000000000, 'metro').limit)}</span>원</span></a>
<a href="/deposit/"><b>예금 이자</b><span>1억 1년 3% → 세후 <span class="num">${num(DP.deposit(100000000, 12, 0.03).net)}</span>원 · 매달 받으면 <span class="num">${num(DP.deposit(100000000, 12, 0.03).monthlyNet)}</span>원</span></a>
<a href="/subscription/"><b>청약 가점</b><span>무주택 10년·부양가족 2명·통장 15년 → <span class="num">${SB.subscriptionScore({ homelessYears: 10, family: 2, accountMonths: 180 }).total}</span>점 (84점 만점)</span></a>
<a href="/capgain/"><b>양도소득세</b><span>9억에 산 집 15억에 팔면 (1주택·5년) <span class="num">${num(capThree(1500000000, 900000000).one.total)}</span>원 · 12억 이하는 비과세</span></a>
<a href="/eitc/"><b>근로장려금</b><span>총급여 1,500만 홑벌이 → <span class="num">${num(EI.eitc({ type: 'one', wage: 15000000 }).work)}</span>원 · 자녀 1명당 +<span class="num">${num(EI.eitc({ type: 'one', wage: 15000000, children: 1 }).perChild)}</span>원</span></a>
</div>`)}
${section('가족·생활', null, `<div class="dict">
<a href="/parental-leave/"><b>육아휴직 급여</b><span>통상임금 300만 → 12개월 <span class="num">${num(PL.parentalLeave({ wage: 3000000, months: 12 }).total)}</span>원 · 6+6은 둘이 <span class="num">${num(PL.bothTotal(3000000).total)}</span>원</span></a>
<a href="/baby-benefit/"><b>출산·양육 지원금</b><span>첫째 만 2세까지 <span class="num">${num(PL.babyBenefits('2025-01-01', 1, '2025-01-01').total24)}</span>원 · 0세는 월 <span class="num">${num(PL.PARENT_PAY.age0 + PL.CHILD_ALLOWANCE.monthly)}</span>원</span></a>
<a href="/electric/"><b>전기요금 누진제</b><span>한 달 300kWh → <span class="num">${num(EL.electricBill(300).total)}</span>원 · 여름 <span class="num">${num(EL.electricBill(300, { season: 'summer' }).total)}</span>원</span></a>
<a href="/pension/"><b>국민연금 예상 수령액</b><span>월 300만·20년 가입 → 65세부터 월 <span class="num">${num(NP.pension({ avgIncome: 3000000, years: 20 }).monthly)}</span>원 · 40년이면 <span class="num">${num(NP.pension({ avgIncome: 3000000, years: 40 }).monthly)}</span>원 (어림)</span></a>
</div>`)}
${section('많이 보는 연봉표', null, list(popular))}
${section('읽을거리', '계산 뒤에 있는 규칙을 풀어 쓴 글', list(GUIDES.slice(0, 6).map((g) => ({ href: guideUrl(g.slug), title: gtitle(g) }))) + `<p class="sub" style="margin-top:8px"><a href="/guide/">서재 전체 보기 →</a></p>`)}
${section(`${YEAR}년에 달라진 것`, null, `<div class="callout"><b>국민연금 근로자 부담 ${pct(RATES[PREV].pension, 2)} → ${pct(R0.pension, 2)}</b>, 건강보험 근로자 부담 ${pct(RATES[PREV].health, 3)} → ${pct(R0.health, 3)}, 최저임금 ${num(RATES[PREV].minWage)}원 → ${num(R0.minWage)}원. 같은 연봉이라도 실수령액이 작년보다 조금 줄었습니다. 각 연봉 페이지에서 ${PREV}년과 비교할 수 있습니다.</div>`)}`;
  write('/', shell({ url: '/', title: `돈표 — 연봉 실수령액·대출 상환·퇴직금·알바 월급 계산 사전 (${YEAR}년)`, desc: `${YEAR}년 요율로 연봉별 실수령액, 대출 월 상환액과 총 이자, 퇴직금 세후, 알바 주휴수당까지 금액별로 미리 계산한 돈 계산 사전.`, body }));
}

function docs() {
  const R1 = RATES[PREV];
  const method = `
${crumb([['/', '홈'], [null, '계산 기준']])}
<h1 class="title">계산 기준과 요율</h1>
<div class="doc">
<h2>실수령액</h2>
<p>실수령액 = 세전 월급 − (국민연금 + 건강보험 + 장기요양보험 + 고용보험 + 소득세 + 지방소득세). 보험료와 세금은 세전 월급에서 비과세(식대 등)를 뺀 과세 급여를 기준으로 계산합니다. 연봉 페이지는 연봉 ÷ 12를 세전 월급으로 봅니다.</p>
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
<h2>연말정산 미리보기</h2>
<p>총급여(연봉 − 비과세)에서 근로소득공제·기본공제(1인 150만원)·국민연금·건강·고용보험료·신용카드 등 소득공제를 뺀 과세표준에 기본세율(6~45%)을 적용해 산출세액을 구하고, 근로소득세액공제·자녀세액공제(첫째 25만·둘째 30만·셋째부터 40만원)·연금계좌(연 900만원 한도, 총급여 5,500만원 이하 15%·초과 12%)·보장성보험료(100만원 한도 12%)·의료비(총급여 3% 초과분 15%)·교육비(15%)·월세(총급여 5,500만원 이하 17%·8,000만원 이하 15%, 연 1,000만원 한도)를 뺀 값이 결정세액입니다. 항목별 공제가 표준세액공제 13만원보다 적으면 13만원을 씁니다. 미리 낸 세금은 간이세액표 기준 12개월분으로 보고, 둘의 차이를 환급 또는 추가 납부 예상액으로 보여줍니다. 신용카드 공제는 총급여의 25%를 신용카드 사용분부터 차감한 뒤 신용카드 15%·체크카드/현금영수증 30%로 계산하며 한도는 총급여 7,000만원 이하 300만원·1억 2,000만원 이하 250만원·초과 200만원입니다. 주택청약·주택자금·기부금·전통시장/대중교통 추가 한도·경로우대·장애인·한부모 공제는 반영하지 않으므로 실제와 다를 수 있습니다.</p>
<h2>대출</h2>
<p>이자 = 매달 남은 원금 × 연이율 ÷ 12, 원 단위 반올림. 원리금균등은 매달 같은 금액, 원금균등은 원금을 균등 분할해 이자가 줄어드는 방식, 만기일시는 이자만 내다 만기에 원금을 갚는 방식입니다. 고정금리·거치 없음·매달 말 상환을 가정했고, 갈아타기 표의 중도상환수수료는 0.6%(2025년 1월 이후 은행권 주택담보대출 수준)로 두었습니다. DSR 한도는 연간 원리금 상환액이 연소득의 40%를 넘지 않는 원금이며 기존 대출은 없다고 봅니다.</p>
<h2>퇴직금</h2>
<p>퇴직금 = 1일 평균임금 × 30 × 재직일수 ÷ 365. 평균임금은 퇴직 전 3개월 급여 ÷ 그 기간 일수인데, 상여·수당 없이 월급이 일정하다고 가정했습니다. 퇴직소득세는 (퇴직금 − 근속연수공제) ÷ 근속연수 × 12 = 환산급여 → 환산급여공제 → 과세표준 × 기본세율 ÷ 12 × 근속연수 순서로 계산하며 근속연수는 1년 미만을 올림합니다.</p>
<h2>알바</h2>
<p>주휴수당은 1주 소정근로시간이 15시간 이상이고 개근했을 때 발생하며, 주 40시간 기준 8시간(그 미만이면 비례)의 시급을 더 받습니다. 한 달은 365 ÷ 7 ÷ 12 = 4.345주로 환산했습니다. 월 60시간 이상이면 4대보험 가입 대상으로 보고 근로자 부담분을 뺐습니다.</p>
<h2>실업급여</h2>
<p>구직급여일액 = 퇴직 전 3개월 평균임금(1일) × 60%. ${YEAR}년 상한액 ${won(U.UPPER[YEAR])}, 하한액은 최저시급 × 80% × 8시간 = ${won(Math.round(R0.minWage * 0.8 * 8))}. 소정급여일수는 피보험기간(1년 미만·1~3년·3~5년·5~10년·10년 이상)과 퇴직 당시 나이(50세 기준)로 120~270일. 한 달 수령액은 30일 기준 근사값입니다.</p>
<h2>전세 vs 월세</h2>
<p>전세대출 월 이자 = 대출금 × 연이율 ÷ 12(만기일시, 이자만 납부). 월세 전환액 = 줄이는 보증금 × 전환율 ÷ 12이며 법정 전환율 상한은 기준금리(${fmtRate(R0.baseRate)}) + 2%p = ${fmtRate(CONVERSION_CAP)}입니다(갱신 계약에 적용, 신규 계약은 시장 전환율).</p>
<h2>적금</h2>
<p>적금 이자는 단리로 매달 납입금이 남은 개월 수만큼 이자를 받는 방식: 월납입 × 연이율 ÷ 12 × n(n+1) ÷ 2. 이자소득세 14%와 지방소득세 1.4%(합계 ${pct(INTEREST_TAX)})를 뺀 세후 금액을 씁니다. 실질 이득은 만기 수령액을 연 2% 물가상승률로 오늘 가치로 되돌린 뒤 원금을 뺀 값입니다.</p>
<h2>증여세</h2>
<p>증여세 = (증여액 − 증여재산공제) × 세율 − 누진공제, 여기서 신고세액공제 3%를 뺀 값입니다. 증여재산공제는 10년 합산으로 배우자 6억원, 직계존속→직계비속 5,000만원(미성년자 2,000만원), 직계비속→직계존속 5,000만원, 6촌 이내 혈족·4촌 이내 인척 1,000만원이고, 2024년부터 혼인신고 전후 2년·자녀 출생 후 2년 안의 직계존속 증여는 1억원을 더 공제합니다(통합 한도 1억원). 세율은 과세표준 1억원 이하 10%, 5억원 이하 20%(누진공제 1,000만원), 10억원 이하 30%(6,000만원), 30억원 이하 40%(1억 6,000만원), 30억원 초과 50%(4억 6,000만원)이며, 조부모가 손자녀에게 주면 30% 할증(미성년자에게 20억원 초과 시 40%)됩니다. 과세표준 50만원 미만은 과세하지 않습니다. 10년 안에 같은 사람(직계존속은 그 배우자 포함)에게 받은 증여는 합산해 세율을 매기고 이미 낸 세액을 뺍니다. 증여재산가액은 시가(아파트는 유사 매매사례가액)이고 부담부증여의 채무는 뺍니다. 상속세 및 증여세법 제53조·제53조의2·제56조·제57조·제69조.</p>
<h2>복비 (중개보수)</h2>
<p>공인중개사법 시행규칙 별표 1(2021년 10월 19일 개정)의 주택 상한요율입니다. 매매·교환은 5,000만원 미만 0.6%(한도 25만원), 2억원 미만 0.5%(한도 80만원), 9억원 미만 0.4%, 12억원 미만 0.5%, 15억원 미만 0.6%, 15억원 이상 0.7%. 임대차는 5,000만원 미만 0.5%(한도 20만원), 1억원 미만 0.4%(한도 30만원), 6억원 미만 0.3%, 12억원 미만 0.4%, 15억원 미만 0.5%, 15억원 이상 0.6%. 월세는 보증금 + 월세 × 100을 거래금액으로 보고, 그 값이 5,000만원 미만이면 보증금 + 월세 × 70으로 다시 계산합니다. 주거용 오피스텔(85㎡ 이하)은 매매 0.5%·임대차 0.4%, 그 밖의 부동산은 0.9% 이내 협의입니다. 요율은 상한이라 그 안에서 협의할 수 있고, 부가가치세 10%는 별도입니다(간이과세 중개사는 다름). 시·도 조례가 정하지만 대부분 국토교통부 기준과 같습니다.</p>
<h2>주택 취득세</h2>
<p>지방세법 제11조의 주택 유상취득 세율입니다. 1주택(비조정대상지역 2주택 포함)은 6억원 이하 1%, 6억원 초과 9억원 이하는 (취득가액 × 2/3억 − 3)%로 소수점 넷째 자리까지 계산한 사잇값, 9억원 초과 3%. 조정대상지역 2주택·비조정 3주택은 8%, 조정대상지역 3주택 이상·비조정 4주택 이상은 12%(2020년 8월 12일 이후 기준, 완화 개정안은 확정되면 갱신). 지방교육세는 표준세율의 10분의 1(1~3% 구간에서 0.1~0.3%), 중과 구간은 0.4%. 농어촌특별세는 전용면적 85㎡ 초과일 때만 0.2%(중과 8%는 0.6%, 12%는 1.0%). 생애최초 주택 감면은 취득가액 12억원 이하일 때 취득세에서 최대 200만원을 뺍니다(지방세특례제한법 제36조의3). 취득일부터 60일 안에 신고·납부하며, 등기 비용(국민주택채권·법무사·수수료)은 별도입니다.</p>
<h2>예금</h2>
<p>정기예금 이자 = 원금 × 연이율 × 개월 ÷ 12(단리). 월복리 상품은 원금 × ((1 + 연이율 ÷ 12)<sup>개월</sup> − 1). 이자소득세 14% + 지방소득세 1.4% = 15.4%를 10원 단위 절사로 뺍니다. 월 이자 지급식은 매달 원금 × 연이율 ÷ 12에서 같은 세금을 뺀 금액을 받습니다. 예금자보호 한도는 2025년 9월 1일부터 금융회사별 원금과 이자를 합쳐 1억원입니다.</p>
<h2>상속세</h2>
<p>상속세 = (상속재산 − 공제) × 세율 − 누진공제에서 신고세액공제 3%를 뺀 값입니다. 공제는 일괄공제 5억원(기초공제 2억 + 자녀 1인당 5,000만원 등 인적공제가 더 크면 그 금액)과 배우자상속공제(배우자가 실제 상속받은 금액, 최소 5억원, 최대 30억원, 법정상속분이 한도)를 더한 값이고, 여기서는 배우자가 법정상속분(배우자 1.5 : 자녀 1)만큼 받는다고 가정했습니다. 금융재산상속공제(순금융재산 2,000만원 이하 전액, 초과분 20%, 최대 2억원)는 예시로만 보여줍니다. 세율은 증여세와 같은 10~50%이며 과세표준 50만원 미만은 과세하지 않습니다. 사전증여(10년, 상속인 외 5년)·채무·장례비·동거주택상속공제·세대생략 할증·자녀가 미성년인 경우는 반영하지 않았습니다. 상속세 및 증여세법 제18~22조·제26조·제69조.</p>
<h2>종합소득세</h2>
<p>과세표준 = 종합소득금액(수입 − 필요경비) − 기본공제 150만원(본인). 산출세액은 기본세율(1,400만원 이하 6%, 5,000만원 이하 15%, 8,800만원 이하 24%, 1억 5,000만원 이하 35%, 3억원 이하 38%, 5억원 이하 40%, 10억원 이하 42%, 초과 45%)로 계산하고 표준세액공제 7만원을 뺍니다. 지방소득세는 소득세의 10%. 프리랜서 정산은 수입의 3%(소득세)와 0.3%(지방소득세)를 기납부로 보고 차이를 환급·추가 납부로 표시합니다. 다른 소득공제·세액공제, 근로소득 합산, 성실신고확인 대상 여부는 반영하지 않았습니다.</p>
<h2>주택 재산세</h2>
<p>과세표준 = 공시가격 × 공정시장가액비율(주택 60%, 1세대 1주택은 3억 이하 43%·6억 이하 44%·6억 초과 45% 특례). 세율은 과세표준 6,000만원 이하 0.1%, 1억 5,000만원 이하 0.15%, 3억원 이하 0.25%, 초과 0.4%의 누진세율이고, 1세대 1주택 공시가격 9억원 이하는 구간마다 0.05%p 낮은 특례세율을 씁니다. 여기에 도시지역분(과세표준 × 0.14%)과 지방교육세(재산세의 20%)를 더했습니다. 7월과 9월에 절반씩 내며 본세 20만원 이하면 7월에 한 번에 냅니다. 세부담상한(전년 대비 105~130%)·지역자원시설세·종합부동산세는 반영하지 않았습니다. 지방세법 제110~112조.</p>
<h2>자동차세</h2>
<p>비영업용 승용차 연세액 = 배기량 × cc당 세액(1,000cc 이하 80원, 1,600cc 이하 140원, 초과 200원), 전기·수소차는 10만원 정액. 지방교육세 30%를 더합니다. 차령 3년차부터 해마다 5%씩 최대 50%까지 경감하고, 6월과 12월에 절반씩 냅니다. 1월 연납 공제율은 행정안전부 고시(2024·2025년 5%, ${YEAR}년 ${pct(CT.ANNUAL_DISCOUNT[YEAR] || 0, 0)})이며 2~12월분(11/12)에 적용합니다. 지방세법 제127조·제128조·제130조.</p>
<h2>LTV 대출 한도</h2>
<p>LTV 한도 = 집값(시세) × 담보인정비율. ${LV.LTV_ASOF} 기준으로 규제지역(서울 전역과 경기 과천·광명·성남 분당·수정·중원·수원 영통·장안·팔달·안양 동안·용인 수지·의왕·하남)은 40%(생애최초 70%), 수도권 비규제지역은 70%(생애최초 80%), 지방은 70%(생애최초 80%)이고, 수도권·규제지역 주택담보대출은 6억원(규제지역 15억 초과 4억원, 25억 초과 2억원)을 넘지 못합니다. 실제 대출은 LTV·DSR·은행 심사 가운데 가장 작은 값이며 방공제(소액임차보증금)와 기존 대출에 따라 줄어듭니다. 규제는 자주 바뀌므로 대출 전 은행에 확인하세요.</p>
<h2>청약 가점</h2>
<p>주택공급에 관한 규칙 제28조·별표 1의 가점제(84점 만점)입니다. 무주택기간은 1년 미만 2점에서 1년마다 2점씩 15년 이상 32점(만 30세부터, 그 전에 혼인했으면 혼인신고일부터 세고 유주택자와 만 30세 미만 미혼 무주택자는 0점), 부양가족은 0명 5점에서 1명마다 5점씩 6명 이상 35점, 청약통장 가입기간은 6개월 미만 1점·6개월 이상 2점·1년 이상 3점에서 1년마다 1점씩 15년 이상 17점입니다. 페이지의 합계는 세 점수를 더한 값이고, 부양가족 인정(배우자, 3년 이상 같은 등본의 직계존속, 만 30세 미만 미혼 직계비속 등)과 무주택 판정은 청약홈 기준을 따릅니다. 가점제·추첨제 적용 비율은 지역과 면적별로 다릅니다.</p>
<h2>육아휴직 급여</h2>
<p>고용보험법 시행령(2025년 1월 1일 시행) 기준입니다. 일반 육아휴직은 1~3개월 통상임금의 100%(월 상한 250만원), 4~6개월 100%(상한 200만원), 7개월부터 80%(상한 160만원), 하한 월 70만원이며 2025년부터 사후지급금 없이 휴직 중 전액 지급합니다. 6+6 부모육아휴직제(생후 18개월 이내 자녀, 부모 모두 사용)는 각자 첫 6개월 100%에 상한 250·250·300·350·400·450만원, 7개월째부터 일반 규정입니다. 한부모는 1~3개월 100%(상한 300만원), 이후 일반과 같습니다. 통상임금은 기본급과 고정수당을 더한 월액(성과급·연장수당 제외)이고 급여는 비과세입니다. 기간은 자녀당 부모 각각 12개월, 부모 모두 3개월 이상 쓰면 각각 18개월(2025년 2월 23일부터)입니다.</p>
<h2>출산·양육 지원금</h2>
<p>2025년 전국 공통 지원만 넣었습니다. 첫만남이용권 첫째 200만원·둘째부터 300만원(바우처, 출생 후 1년 안에 사용), 부모급여 0~11개월 월 100만원·12~23개월 월 50만원(어린이집 이용 시 보육료를 뺀 차액), 아동수당 0~95개월 월 10만원, 양육수당 가정양육 24~86개월 월 10만원, 임신·출산 진료비 바우처 단태아 100만원·다태아 태아당 100만원입니다. "만 2세까지 총액"은 첫만남이용권 + 부모급여 24개월 + 아동수당 24개월이고, 개월 수는 생년월일 기준 만 개월입니다. 지역 출산장려금은 지자체별로 달라 넣지 않았습니다.</p>
<h2>전기요금</h2>
<p>한국전력 주택용 전기요금표(${EL.ELECTRIC_ASOF}) 기준입니다. 저압은 기본요금 910·1,600·7,300원, 전력량요금 kWh당 120.0·214.6·307.3원, 고압은 730·1,260·6,060원과 105.0·174.0·242.3원이고, 구간은 기타계절(1~6월·9~12월) 200·400kWh, 하계(7~8월) 300·450kWh입니다. 하계와 동계(12~2월)에 1,000kWh를 넘는 사용량은 슈퍼유저 요금(저압 736.2원·고압 601.3원)입니다. 전기요금계 = 기본요금 + 전력량요금 + 기후환경요금(9원/kWh) + 연료비조정요금(+5원/kWh)이고, 청구액은 여기에 부가가치세 10%(원 단위 반올림)와 전력산업기반기금 2.7%(2025년 7월부터, 10원 미만 절사)를 더해 10원 미만을 절사한 값입니다. 필수사용량 보장공제(2024년 폐지), 복지할인·대가족할인, TV수신료 2,500원(2023년 7월부터 분리 고지)은 넣지 않았습니다.</p>
<h2>근로장려금·자녀장려금</h2>
<p>조세특례제한법 제100조의2~제100조의13, ${EI.EITC_ASOF} 기준입니다. 근로장려금은 가구 유형별 '총급여액 등'(근로소득 총급여 + 사업소득 수입금액 × 업종별 조정률 + 종교인소득)에 따라 단독 가구 400만원 미만 총급여 × 165/400, 400만~900만원 165만원, 900만~2,200만원 165만원 − (총급여 − 900만원) × 165/1,300, 홑벌이 700만원 미만 × 285/700, 700만~1,400만원 285만원, 1,400만~3,200만원 285만원 − (총급여 − 1,400만원) × 285/1,800, 맞벌이 800만원 미만 × 330/800, 800만~1,700만원 330만원, 1,700만~3,800만원 330만원 − (총급여 − 1,700만원) × 330/2,100입니다. 자녀장려금은 18세 미만 부양자녀 1인당 총급여 2,100만원 미만 100만원, 2,100만~7,000만원 100만원 − (총급여 − 2,100만원) × 50/4,900(최소 50만원)입니다. 전년 6월 1일 기준 가구원 재산 합계가 2.4억원 이상이면 받지 못하고 1.7억원 이상이면 산정액의 50%를 받으며, 10원 미만은 절사합니다. 부부 합산 총소득 기준금액 판정, 기한 후 신청 감액(5%), 최소 지급액 규정은 넣지 않았습니다.</p>
<h2>국민연금 예상 수령액</h2>
<p>국민연금법 제51조·제63조의 기본연금액 산식을 단순화한 어림입니다. 기본연금액(연) = 비례상수 × (A값 + B값) × (1 + 0.05 × (가입연수 − 20)). A값은 전체 가입자의 최근 3년 평균 소득월액(${NP.PENSION_ASOF} 적용 ${won(NP.A_VALUE)}), B값은 본인 가입기간 평균 소득월액(기준소득월액 하한 ${manwon(NP.B_MIN)}·상한 ${manwon(NP.B_MAX)})이고, 비례상수는 2025년 1.26(소득대체율 42%), 2026년부터 1.29(43%, 2025년 3월 개정)로 여기서는 1.29를 전 기간에 씁니다. 가입기간 10년 이상 20년 미만은 법 제63조의 "기본연금액의 50% + 10년 초과 1년마다 5%"와 같은 식으로 계산하며 10년 미만은 노령연금이 없습니다. 조기연금은 1년당 6%(최대 5년 30%) 감액, 연기연금은 1년당 7.2%(최대 5년 36%) 증액하고, 수급 개시 연령은 1953~56년생 61세, 57~60년생 62세, 61~64년생 63세, 65~68년생 64세, 1969년생 이후 65세입니다. 월액은 연액 ÷ 12를 10원 미만 절사한 값입니다. 가입 시기별로 다른 비례상수(1988~98년 2.4, 1999~2007년 1.8 등), 물가 연동, 과거 소득 재평가, 부양가족연금, 소득활동에 따른 감액은 반영하지 않았습니다. 보험료율은 2025년 9%에서 2026년부터 매년 0.5%p 올라 2033년 13%가 되고 직장 가입자는 회사가 절반을 냅니다.</p>
<h2>양도소득세</h2>
<p>소득세법 제89조·제95조·제103조·제104조(${CG.CAP_ASOF}) 기준입니다. 양도차익 = 양도가액 − 취득가액 − 필요경비. 1세대 1주택을 2년 이상 보유(2017년 8월 3일 이후 조정대상지역 취득분은 2년 이상 거주)하고 양도가액 12억원 이하에 팔면 전액 비과세, 12억원을 넘으면 양도차익 × (양도가액 − 12억원) ÷ 양도가액만 과세합니다. 장기보유특별공제는 1세대 1주택(12억 초과분, 거주 2년 이상)이면 보유기간 3년 이상부터 연 4%(최대 40%)와 거주기간 3년 이상부터 연 4%(최대 40%)를 더해 최대 80%, 그 밖에는 보유 3년 이상부터 연 2%로 최대 30%(15년)입니다. 과세표준 = 과세 양도차익 − 장기보유특별공제 − 기본공제 250만원(연 1회). 세율은 보유 1년 미만 70%, 2년 미만 60%(주택·입주권·분양권), 2년 이상은 기본 누진세율(1,400만원 이하 6%, 5,000만원 15%(누진공제 126만), 8,800만원 24%(576만), 1억 5,000만원 35%(1,544만), 3억원 38%(1,994만), 5억원 40%(2,594만), 10억원 42%(3,594만), 초과 45%(6,594만))이고 지방소득세는 양도소득세의 10%입니다. 조정대상지역 2주택 +20%p·3주택 이상 +30%p 중과와 장기보유특별공제 배제는 ${CG.SURCHARGE_UNTIL}까지 한시 배제되어 기본 계산에 넣지 않고 옵션으로만 계산합니다. 거주 2년 이상 3년 미만의 8% 공제, 취득가액 환산, 상속·증여 취득분, 일시적 2주택 등 특례는 반영하지 않았습니다.</p>
<h2>자동차 유지비</h2>
<p>연 유지비 = 유류비 + 자동차세 + 보험료 + 정비·소모품 + 주차·통행료 + 감가상각. 유류비 = 연 주행거리 ÷ 연비 × 연료 단가(기본값 휘발유 1,650원·경유 1,550원·LPG 1,000원/L, 전기 350원/kWh, 연비 12·14·9km/L·5km/kWh), 자동차세는 위 자동차세 산식(배기량·차령 경감, 전기차 정액 13만원), 감가상각은 차량가 × 첫해 20%·2~3년차 15%·4년차부터 10%의 단순 정액 어림입니다. 보험료(연 80만원)·정비비(연 50만원)·주차·통행료(월 5만원)는 평균적인 기본값이며, 차량가별 페이지의 배기량은 2,500만원 이하 1,598cc, 4,000만원 이하 1,999cc, 5,500만원 이하 2,497cc, 그 이상 3,470cc로 가정했습니다. 월 유지비 = 연 합계 ÷ 12, 현금 지출은 감가상각을 뺀 값, km당 비용은 연 합계 ÷ 연 주행거리입니다. 취득세·공채·대출 이자·세차·과태료는 넣지 않았습니다.</p>
<h2>대출 한도 (DSR)</h2>
<p>DSR 40% = 모든 대출의 연간 원리금 상환액 ÷ 연소득 ≤ 40%. 월 상환 여력 = 연소득 × 40% ÷ 12이고, 그 여력으로 갚을 수 있는 원리금균등 원금을 한도로 봅니다. 스트레스 DSR은 실제 금리에 가산금리(수도권 주담대 1.5%p)를 더해 계산합니다.</p>
<h2>연봉 순위</h2>
<p>국세청 ${RK.STAT.year}년 귀속 근로소득 연말정산 통계의 공식 요약값(신고 ${num(RK.STAT.workers)}명, 중위 ${won(RK.STAT.median)}, 평균 ${won(RK.STAT.mean)}, 1억원 초과 ${pct(RK.STAT.over100m)})에 맞춘 로그정규 분포로 상위 비율을 추정합니다. 세 값을 모두 재현하는 분포이지만 백분위 원자료 그대로는 아니므로 ±몇 %p의 오차가 있을 수 있습니다. 근로소득 연말정산 대상자 기준이라 자영업자·일용직은 포함되지 않습니다.</p>
<h2>최저임금</h2>
<p>월급 = 시급 × 209시간(주 40시간 + 주휴 8시간, 한 달 4.345주). 주 15시간 이상 일하면 주휴수당이 붙고, 1년 이상 계약의 수습 3개월은 90%까지 줄일 수 있습니다. 5인 미만 사업장도 최저임금은 똑같이 적용됩니다.</p>
<h2>연장·야간·휴일수당과 연차</h2>
<p>통상시급 = 월 통상임금 ÷ 209시간(월급 전체가 통상임금이라고 가정). 연장근로는 통상시급의 1.5배, 야간(22~06시)은 0.5배 가산, 휴일근로는 8시간 이내 1.5배·초과분 2배입니다. 5인 미만 사업장은 가산 의무가 없습니다. 연차수당 = 통상시급 × 8시간 × 미사용 일수. 연차는 1년 미만 개근한 달마다 1일(최대 11일), 1년 이상 80% 출근 시 15일, 3년차부터 2년마다 1일씩 늘어 최대 25일입니다.</p>
<h2>연차휴가·연차수당</h2>
<p>근로기준법 제60조·제61조 기준입니다. 입사 1년 미만은 1개월 개근할 때마다 1일씩 최대 11일(제60조 제2항), 1년 이상 80% 출근하면 15일(제1항), 3년 이상 계속 근로하면 최초 1년을 넘는 계속근로 2년마다 1일을 더해 한도 25일(제4항)입니다. 곧 연차 = min(25, 15 + (근속연수 − 1) ÷ 2의 몫)이라 근속 3년 16일, 5년 17일, 7년 18일, 21년 이상 25일입니다. 부여 기준일은 법의 원칙인 <b>입사일 기준</b>과 관리 편의로 쓰는 <b>회계연도(1월 1일) 기준</b>을 함께 계산합니다. 회계연도 기준 첫해 비례연차는 15일 × (입사일부터 그해 12월 31일까지의 일수 ÷ 365)로 구하며, 소수점 처리(반올림·절상)는 법에 정한 것이 없어 회사 규정을 따르므로 소수 1자리로 보여 주고 절상한 값을 함께 적습니다. 연차수당 = 1일 통상임금 × 미사용 일수이고, 1일 통상임금 = 통상시급(월 통상임금 ÷ 209시간, 원 단위 반올림) × 8시간입니다. 월급 전부가 통상임금이라고 가정하므로 고정 상여·수당이 있으면 실제 통상임금이 더 큽니다. 연차 사용 촉진(제61조)의 절차를 회사가 모두 지켰으면 미사용 수당 지급 의무가 없고, 연차수당 청구권의 소멸시효는 3년(제49조)입니다. 출근율 80% 미만일 때의 비례 부여, 육아휴직·산재 기간의 출근 간주, 상시 5인 미만 사업장 적용 제외는 계산에 넣지 않았습니다.</p>
<h2>프리랜서 3.3%·기타소득 8.8%</h2>
<p>소득세법 제127조·제129조와 지방세법 제103조의13 기준입니다. 사업소득(인적용역) 원천징수는 소득세 3% + 지방소득세 0.3%(소득세의 10%) = 3.3%이고 실지급액은 계약금액 × 0.967, 세전 역산은 실수령 ÷ 0.967입니다. 기타소득(강연료·원고료·자문료 등 일시적인 용역)은 소득세법 시행령 제87조에 따라 필요경비 60%를 인정하므로 과세표준 = 총액 × 40%, 여기에 소득세 20% + 지방소득세 2%가 붙어 총액의 8.8%가 됩니다(역산은 ÷ 0.912). 건당 지급액 12만 5천원 이하(기타소득금액 5만원 이하)는 과세최저한이라 원천징수하지 않습니다(제84조). 각 세액은 10원 미만을 절사합니다. 사업소득이냐 기타소득이냐는 계속·반복성으로 가르며, 같은 일을 반복해 생계 수단으로 삼으면 사업소득, 일시적·우발적이면 기타소득입니다. 3.3%·8.8%는 미리 내는 세금이라 다음 해 5월 종합소득세 신고에서 수입 − 필요경비(업종별 단순경비율 또는 기준경비율, 아니면 실제 경비) − 공제로 다시 계산해 환급받거나 더 냅니다. 연 기타소득금액 300만원(총액 750만원) 이하는 분리과세를 고를 수 있습니다. 프리랜서는 직장가입자가 아니라 건강보험·국민연금을 지역가입자로 따로 내며 그 금액은 위 실수령에 들어 있지 않습니다. 정산 예시는 필요경비율 60·70·80%, 기본공제 150만원, 표준세액공제 7만원만 반영한 값입니다.</p>
<h2>건강보험료 (직장가입자·지역가입자)</h2>
<p>국민건강보험법 제69조~제73조·시행령과 노인장기요양보험법 제9조에 따릅니다. 요율은 이 사이트의 연봉·월급 계산과 같은 <b>${YEAR}년 값</b>을 쓰고, 지역가입자의 부과점수 단가와 최저보험료만 2025년 고시값입니다(${YEAR}년 단가는 고시 뒤 갱신). 직장가입자 건강보험료 = 보수월액 × ${NH.HEALTH_PCT}이고 근로자와 사업주가 각 ${NH.HALF_PCT}씩 냅니다. 보수월액 상한은 12,720,000원, 하한은 279,300원입니다. 지역가입자는 2022년 9월 2단계 개편 이후 소득 정률제라 연소득 336만원 이하면 최저보험료 19,780원, 그보다 많으면 직장가입자와 같은 ${NH.HEALTH_PCT}를 적용해 월 보험료 = 연소득 × ${NH.HEALTH_PCT} ÷ 12로 계산합니다. 재산은 재산세 과세표준에서 기본공제 1억원을 뺀 금액을 재산등급표로 점수화하고 부과점수당 208.4원(2025년)을 곱합니다. <b>공단의 재산등급표는 60등급이지만 이 사이트는 이를 0·22·60·100·150·200·250점의 6단계로 줄인 근사표를 씁니다.</b> 구간 경계에서 실제 보험료와 차이가 나므로 <a href="https://www.nhis.or.kr" target="_blank" rel="noopener">국민건강보험공단 모의계산</a>이 정확합니다(고객센터 1577-1000). 자동차는 2024년 2월 부과분부터 제외됐습니다. 장기요양보험료는 직장·지역 모두 건강보험료 × ${NH.CARE_PCT}이고 각 보험료는 10원 미만을 절사합니다. 소득월액보험료(보수 외 소득 연 2,000만원 초과), 피부양자 자격 판정, 임의계속가입, 섬·벽지·농어촌 경감, 4월 보수 정산은 반영하지 않았습니다.</p>
<h2>자동차 할부</h2>
<p>차값 − 선수금을 원리금균등으로 나눈 월 납입액입니다. 취득세(약 7%)·보험료·등록비와 잔가 유예 할부는 반영하지 않았습니다.</p>
<h2>나이대 비교</h2>
<p>통계청 「${AGE.year}년 임금근로일자리 소득(보수) 결과」의 연령대별 월평균 소득과 소득구간 분포(10구간)를 씁니다. ${AGE.year}년 12월 한 달 동안 사회보험에 신고된 임금근로일자리의 세전 보수라서 연말정산 연봉 통계(연봉 순위)와 대상·기준이 다릅니다. "그 나이대에서 내 위치"는 연봉 ÷ 12를 소득구간 안에서 선형 보간해 구하고, 1,000만원 이상 구간은 3,000만원까지 고르게 퍼져 있다고 가정합니다.</p>
<h2>출처</h2>
<ul><li>통계청 ${AGE.year}년 임금근로일자리 소득(보수) 결과 (연령대별·성별 평균소득, 소득구간 분포)</li><li>국세청 근로소득 간이세액표 (소득세법 시행령 별표 2), 국세통계 근로소득 연말정산 신고 현황</li><li>국민연금공단·국민건강보험공단 보험료율 고시</li><li>고용노동부 최저임금 고시, 근로기준법 시행령(주휴·퇴직금), 고용보험법(구직급여)</li><li>주택임대차보호법(전월세전환율), 소득세법(이자소득세)</li><li>주택공급에 관한 규칙 별표 1(청약 가점), 고용보험법 시행령(육아휴직 급여, 2025.1.1 시행), 보건복지부 부모급여·아동수당·첫만남이용권 안내, 한국전력 전기요금표(주택용 저압·고압)</li><li>조세특례제한법 제100조의2~제100조의13·국세청 근로장려금 안내(2025년 신청), 국민연금법 제51조·제63조·국민연금공단 A값 고시(2025년), 소득세법 제89조·제95조·제103조·제104조(양도소득세), 한국석유공사 오피넷 평균 유가(자동차 유지비 기본 단가)</li>
<li>근로기준법 제49조·제60조·제61조(연차 유급휴가·사용 촉진·소멸시효), 소득세법 제84조·제127조·제129조·시행령 제87조(사업소득 3.3%·기타소득 8.8%), 국민건강보험법 제69조~제73조·시행령·노인장기요양보험법 제9조와 국민건강보험공단 2025년 보험료 부과 기준(부과점수당 208.4원, 지역가입자 최저보험료 19,780원)</li></ul>
</div>`;
  write('/method/', shell({ url: '/method/', title: '계산 기준과 요율 — 돈표', desc: '돈표의 실수령액·대출·퇴직금·알바 월급 계산 방식과 연도별 4대보험 요율, 출처를 정리했습니다.', body: method }));

  const about = `
${crumb([['/', '홈'], [null, '소개']])}
<h1 class="title">돈표는</h1>
<div class="doc">
<p>돈표(돈 계산 사전)는 "연봉 4,200이면 얼마 받지?", "2억 빌리면 한 달에 얼마 갚지?" 같은 질문에 계산기 없이 바로 답하려고 만든 사이트입니다. 금액별 페이지를 미리 계산해 두어 검색에서 바로 표로 들어옵니다.</p>
<p>모든 계산은 공개된 요율과 법령 산식으로만 하며, 입력값을 서버로 보내거나 저장하지 않습니다. 요율은 매년 1월과 7월에 갱신하고 페이지마다 기준일을 적어 둡니다.</p>
<p>돈표는 <a href="${SAJU}">사주첩</a>을 만든 팀이 운영합니다.</p>
<h2>문의</h2>
<p>오류 제보, 요율 갱신 요청, 제휴 문의는 인스타그램 <a href="https://www.instagram.com/sajucheop/" target="_blank" rel="noopener">@sajucheop</a> 다이렉트 메시지로 보내 주세요. 계산 오류는 페이지 주소와 함께 알려주시면 확인 후 바로 고칩니다.</p>
</div>`;
  write('/about/', shell({ url: '/about/', title: '소개 — 돈표', desc: '돈표는 연봉·대출·퇴직금·알바 월급을 금액별로 미리 계산해 둔 돈 계산 사전입니다.', body: about }));

  const terms = `
${crumb([['/', '홈'], [null, '이용약관']])}
<h1 class="title">이용약관</h1>
<div class="doc">
<p>돈표의 모든 계산 결과는 공개된 요율과 산식에 따른 참고용 정보이며, 급여·세무·금융에 관한 전문 상담이나 법적 판단을 대신하지 않습니다. 실제 급여명세서, 대출 계약, 퇴직금 정산은 회사·은행·관계 기관의 계산이 우선합니다.</p>
<p>계산 결과를 보고 내린 결정은 이용자 본인의 책임이며, 돈표는 결과가 틀리거나 요율 갱신이 늦어 생긴 손해를 책임지지 않습니다. 사이트의 글과 표는 출처를 밝히고 인용할 수 있습니다.</p>
</div>`;
  write('/terms/', shell({ url: '/terms/', title: '이용약관 — 돈표', desc: '돈표 이용약관', body: terms, noindex: true }));

  const privacy = `
${crumb([['/', '홈'], [null, '개인정보처리방침']])}
<h1 class="title">개인정보처리방침</h1>
<div class="doc">
<h2>1. 수집하는 정보</h2><p>돈표는 회원 가입이나 개인정보 입력을 요구하지 않습니다. 검색창에 넣는 금액은 페이지를 옮기는 데만 쓰고 서버로 보내거나 저장하지 않습니다.</p>
<h2>2. 쿠키와 분석</h2><p>Google Analytics로 방문 통계(페이지 조회, 기기 종류 등)를 익명으로 수집하며, Google AdSense는 광고를 띄우려고 쿠키를 쓸 수 있습니다. 브라우저 설정에서 쿠키를 차단할 수 있습니다.</p>
<h2>3. 제3자 제공</h2><p>수집한 정보를 제3자에게 판매·제공하지 않습니다.</p>
<h2>4. 문의</h2><p>개인정보 관련 문의는 인스타그램 <a href="https://www.instagram.com/sajucheop/" target="_blank" rel="noopener">@sajucheop</a> 다이렉트 메시지로 보내 주세요.</p>
</div>`;
  write('/privacy/', shell({ url: '/privacy/', title: '개인정보처리방침 — 돈표', desc: '돈표 개인정보처리방침', body: privacy, noindex: true }));

  fs.writeFileSync(path.join(OUT, '404.html'), shell({ url: '/404.html', title: '페이지를 찾을 수 없어요 — 돈표', desc: '없는 페이지', noindex: true, body: `<h1 class="title" style="margin-top:40px">그런 페이지가 없어요</h1><p class="meta">주소가 바뀌었거나 아직 계산해 두지 않은 금액입니다.</p>${section('바로 가기', null, list([{ href: '/salary/', title: '연봉 실수령액표' }, { href: '/loan/', title: '대출 상환액 사전' }, { href: '/retire/', title: '퇴직금 계산표' }, { href: '/hourly/', title: '알바 월급표' }]))}` }));
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
${lead(`월급 ${manwon(pay)}을 받다가 비자발적으로 그만두면 구직급여는 하루 ${won(d.daily)}, 한 달 약 ${won(monthly)}입니다. 고용보험 ${uiLabel(y)} 가입이면 50세 미만은 ${days}일 동안 총 ${won(d.daily * days)}, 50세 이상은 ${daysS}일 동안 ${won(d.daily * daysS)}을 받습니다.`)}
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
${guideLinks(['unemployment-benefit', 'severance-tax'])}
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
  const verdict = J_RATES.map((r) => { const d = rent(CONVERSION_CAP) - mi(r); return { cells: [fmtRate(r), num(mi(r)), num(rent(CONVERSION_CAP)), (d >= 0 ? '월세가 +' : '월세가 −') + num(Math.abs(d))] }; });
  const body = `
${crumb([['/jeonse/', '전세 vs 월세'], [null, manwon(D)]])}
<h1 class="title">전세 ${manwon(D)} — 대출 이자와 월세 비교</h1>
<p class="meta">전세대출 이자(만기일시, 이자만 납부) vs 월세 전환 · 전월세전환율 법정 상한 ${fmtRate(CONVERSION_CAP)} (기준금리 ${fmtRate(R0.baseRate)} + 2%p)</p>
${lead(`보증금 ${manwon(D)}을 전세대출로 채우면 연 4% 기준 매달 이자 ${won(mi(0.04))}이 나가고, 같은 보증금을 법정 전환율 ${fmtRate(CONVERSION_CAP)}로 월세로 돌리면 ${won(rent(CONVERSION_CAP))}입니다. 집주인이 부르는 월세가 대출 이자보다 낮으면 월세가, 높으면 전세대출이 유리합니다.`)}
${hero({ label: '전세대출 월 이자 (보증금 전액 · 연 4%)', value: mi(0.04), sub: `80%만 빌리면 ${won(mi(0.04, 0.8))} · 60%면 ${won(mi(0.04, 0.6))} · 1년 이자 ${won(mi(0.04) * 12)}` })}
${section('금리 × 대출 비율', '월 이자(원) · 전세대출은 보통 보증금의 80%까지', table(['금리', '전액', '80%', '60%'], rateRows))}
${section('월세로 돌리면', '보증금 일부를 월세로 바꿀 때 — 줄이는 보증금 × 전환율 ÷ 12', table(['전환율', '전액 월세로', '절반만 월세로', '20%만 월세로'], convRows))}
${cuts.length ? section('반전세 환산', `전환율 ${fmtRate(CONVERSION_CAP)} 기준 — 보증금을 줄인 만큼 월세가 붙습니다`, table(['조건', '남는 보증금', '월세'], cuts)) : ''}
${ad()}
${section('어느 쪽이 유리한가', `같은 보증금을 법정 상한 전환율 ${fmtRate(CONVERSION_CAP)}로 월세로 돌렸을 때와 비교 — 실제 부르는 월세가 이자보다 낮으면 월세가 유리 (보증료·세액공제 제외)`, table(['대출 금리', '전액 대출 월 이자', `전환율 ${fmtRate(CONVERSION_CAP)} 월세`, '차이'], verdict))}
${section('보증금이 바뀌면', '연 4% · 전액 대출 월 이자', chips(neighbors(JEONSE, dm, 3).map((x) => ({ label: short(x * 10000), value: Math.round(x * 10000 * 0.04 / 12), href: jeonseUrl(x), on: x === dm }))))}
${guideLinks(['jeonse-conversion', 'loan-types'])}
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
${lead(`매달 ${manwon(monthly)}씩 ${yrs}년을 부으면 원금 ${won(s4.principal)}에 연 4% 세후 이자 ${won(s4.net)}이 붙어 ${won(s4.total)}을 받습니다. 물가가 연 2% 오른다고 보면 실질 이득은 ${won(s4.real)} 정도이고, 같은 돈을 처음부터 예금에 넣으면 이자가 ${won(depositInterest(s4.principal, nMonths, 0.04).net)}으로 더 많습니다.`)}
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
  const spouse = [2000, 3000, 4000, 5000, 6000, 8000].filter((s) => SALARIES.includes(m + s)).map((s) => { const t = m + s; return { label: `+배우자 ${short(s * 10000)}`, value: L.dsrLimit(t * 10000, 0.045, 360).principal, href: dsrUrl(t) }; });
  const existing = [300000, 500000, 1000000].filter((x) => x < cap).map((x) => ({ cells: [`월 ${manwon(x)} 상환 중`, num(cap - x), num(L.loanForPayment(cap - x, 0.045, 360))] }));
  const p = netPay({ annual, nontax: NT });
  const loanNear = nearest(LOAN_AMOUNTS, Math.round(base.principal / 10000));
  const body = `
${crumb([['/dsr/', '대출 한도'], [null, `연봉 ${manwon(annual)}`]])}
<h1 class="title">연봉 ${manwon(annual)} 대출 한도 (DSR 40%)</h1>
<p class="meta">연간 원리금 상환액이 연봉의 40%를 넘지 않는 원금 · 다른 대출이 없다고 가정</p>
${lead(`연봉 ${manwon(annual)}이면 DSR 40% 기준 매달 ${won(cap)}까지 갚을 수 있고, 30년·연 4.5% 원리금균등으로 ${manwon(Math.floor(base.principal / 10000) * 10000)}까지 빌릴 수 있습니다. 스트레스 금리 1.5%p를 얹어 6%로 계산하면 ${manwon(Math.floor(stressed / 10000) * 10000)}으로 줄고, 배우자 연봉을 합치면 그만큼 늘어납니다.`)}
${hero({ label: '최대 대출 (30년 · 연 4.5% · 원리금균등)', value: base.principal, sub: `월 상환 여력 ${won(cap)} = 연봉 × 40% ÷ 12 · 월 실수령 ${won(p.net)}의 ${pct(cap / p.net, 0)}` })}
${section('기간 × 금리', '원리금균등 최대 원금(원)', table(['기간'].concat(DSR_RATES.map(fmtRate)), rows))}
${section('스트레스 금리를 얹으면', '수도권 주택담보대출은 실제 금리에 1.5%p를 더해 DSR을 계산합니다(2025년 7월 3단계). 4.5% 대출이면 6%로 계산해 한도가 줄어듭니다', `<div class="tiles"><div class="tile"><small>4.5% 기준 한도</small><span class="num">${manwon(Math.floor(base.principal / 10000) * 10000)}</span></div><div class="tile"><small>6.0%로 계산한 한도</small><span class="num">${manwon(Math.floor(stressed / 10000) * 10000)}</span></div><div class="tile"><small>줄어드는 금액</small><span class="num">${manwon(Math.floor((base.principal - stressed) / 10000) * 10000)}</span></div></div>`)}
${ad()}
${spouse.length ? section('부부 합산이면', '두 사람 연봉을 더한 소득으로 계산 (30년 · 4.5%)', chips(spouse)) : ''}
${existing.length ? section('이미 갚는 대출이 있으면', '기존 원리금을 뺀 여력으로 계산', table(['기존 대출', '남는 월 여력', '추가 한도 (30년·4.5%)'], existing)) : ''}
${section('이어서 계산하기', null, list([
  { href: loanUrl(loanNear, 30, 0.045), title: `대출 ${manwon(loanNear * 10000)} 30년 4.5% 상환표`, sub: '한도만큼 빌리면 매달 얼마' },
  { href: salaryUrl(m), title: `연봉 ${manwon(annual)} 실수령액`, sub: `월 ${won(p.net)}` },
]))}
${guideLinks(['dsr', 'loan-types'])}
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
  const desc = `${year}년 최저임금은 시급 ${num(w)}원입니다. 월급 ${won(monthly)}(209시간), 연봉 ${won(annual)}이고 4대보험과 세금을 뺀 월 실수령은 약 ${won(p.net)}입니다. 주 근무시간별 월급과 연도별 인상 내역을 정리했습니다.`;
  const body = `
${crumb([['/', '홈'], [null, `${year}년 최저임금`]])}
<h1 class="title">${year}년 최저임금 — 시급 ${num(w)}원</h1>
<p class="meta">${prev ? `${year - 1}년 ${num(prev)}원에서 ${pct(w / prev - 1)} 인상 · ` : ''}월급은 주 40시간 + 주휴 8시간 = 209시간 기준${year !== YEAR ? ` · 실수령은 ${YEAR}년 요율로 계산` : ''}</p>
${lead(`${year}년 최저임금 시급 ${num(w)}원으로 주 40시간 일하면 주휴수당을 포함해 월급 ${won(monthly)}, 연봉 ${won(annual)}입니다. 4대보험과 소득세를 빼면 손에 ${won(p.net)} 정도가 남고, 주 15시간 미만 근무는 주휴수당이 없어 그만큼 적습니다.`)}
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
${guideLinks(['weekly-holiday-pay', 'net-pay-steps'])}
<p class="note">고용노동부 최저임금 고시 기준. 주휴수당·월 209시간 환산은 근로기준법과 고용노동부 행정해석을 따랐습니다. <a href="/method/">계산 기준 보기</a></p>`;
  write(url, shell({ url, title, desc, body, nav: 'hourly' }));
}

/* ---------- 프리랜서 3.3% 원천징수 ---------- */
const FREE = [50]; for (let m = 100; m <= 1000; m += 50) FREE.push(m);
const freeUrl = (m) => `/freelance/${m}/`;
const FREE_NOTE = `<p class="note">소득세법 제127조·제129조(원천징수세율), 시행령 제87조(기타소득 필요경비), 제84조(과세최저한)와 지방세법 제103조의13(특별징수)의 기준으로 계산했습니다. 사업소득 3.3%와 기타소득 8.8%는 미리 내는 세금이라 다음 해 5월 종합소득세 신고로 정산합니다. 정산 예시는 필요경비율을 가정하고 기본공제 150만원·표준세액공제 7만원만 반영한 값이라 실제와 다릅니다. 참고용이며 정확한 금액은 홈택스(hometax.go.kr)와 국세청 상담센터(126)에서 확인하세요. <a href="/method/">계산 기준 보기</a></p>`;
const FREE_TIPS = `<div class="doc">
<p><b>3.3%는 세금을 다 낸 것이 아닙니다.</b> 사업소득 원천징수 3.3%(소득세 3% + 지방소득세 0.3%)는 국세청이 미리 걷어 두는 돈입니다. 다음 해 5월 종합소득세 신고에서 1년 수입 − 필요경비 − 각종 공제로 다시 계산해, 미리 낸 돈이 많으면 6~7월에 환급받고 적으면 더 냅니다. 수입이 적고 경비가 많은 해에는 대부분 돌려받습니다.</p>
<p><b>사업소득이냐 기타소득이냐는 계속·반복성으로 가릅니다.</b> 같은 일을 계속·반복해서 하고 그것이 생계 수단이면 사업소득(3.3%), 어쩌다 한 번 한 특강·기고·자문이면 기타소득(8.8%)입니다. 지급하는 쪽이 정해서 신고하지만 실제로 하는 일의 성격이 기준이며, 잘못 신고되면 5월 신고 때 바로잡을 수 있습니다.</p>
<p><b>기타소득은 필요경비 60%를 빼 줍니다.</b> 강연료·원고료 같은 인적용역 기타소득은 총액의 60%를 경비로 인정해 40%만 과세합니다. 여기에 소득세 20% + 지방소득세 2%가 붙어 총액의 8.8%가 됩니다. 겉보기 세율은 사업소득보다 높지만 실제 소득 대비로는 22%짜리 세금을 40%에만 매기는 구조입니다.</p>
<p><b>건당 12만 5천원 이하 기타소득은 세금이 없습니다.</b> 기타소득금액(총액 × 40%)이 5만원 이하이면 과세최저한이라 원천징수하지 않습니다(소득세법 제84조). 총액으로는 125,000원까지입니다.</p>
<p><b>연 기타소득금액 300만원 이하는 분리과세를 고를 수 있습니다.</b> 총액 750만원까지는 기타소득금액이 300만원 이하라 8.8%를 내고 끝낼지, 종합소득에 합산해 정산할지 고를 수 있습니다. 다른 소득이 적으면 합산 신고가 유리한 경우가 많습니다.</p>
<p><b>4대보험은 따로 냅니다.</b> 프리랜서는 직장가입자가 아니라 건강보험과 국민연금을 지역가입자로 스스로 냅니다. 위 실수령에는 이 돈이 빠져 있어 실제로 손에 남는 금액은 더 적습니다. 고용보험은 예술인·노무제공자 등 일부 직종만 가입합니다. 지역가입자 보험료는 <a href="/nhis/">건강보험료 계산기</a>에서 계산할 수 있습니다.</p>
<p><b>경비율은 업종과 수입 규모로 달라집니다.</b> 장부를 쓰지 않으면 국세청이 정한 단순경비율(수입이 적을 때)이나 기준경비율(클 때)로 경비를 인정합니다. 단순경비율은 업종에 따라 60~75% 수준이라 대체로 유리하고, 직전 연도 수입이 기준(인적용역 2,400만원)을 넘으면 기준경비율이 적용돼 실제 증빙이 필요합니다.</p>
</div>`;
const freeSettleRows = (annualGross, prepaid) => [0.6, 0.7, 0.8].map((e) => {
  const s = LB.freelanceSettlement(annualGross, e, prepaid);
  return { cells: [pct(e, 0), num(s.base), num(s.total), s.due > 0 ? `납부 ${num(s.due)}` : `환급 ${num(-s.due)}`] };
});

function freelancePage(mm) {
  const gross = mm * 10000;
  const b = FR.withholding(gross), o = FR.withholding(gross, 'other');
  const y = FR.yearly(gross);
  const url = freeUrl(mm);
  const emp = netPay({ monthly: gross, nontax: NT });
  const title = `프리랜서 ${manwon(gross)} 3.3% 공제 — 실수령 ${won(b.net)} (소득세 ${num(b.tax)}·지방세 ${num(b.local)}원)`;
  const desc = `프리랜서 사업소득 ${manwon(gross)}에서 3.3%(소득세 3% ${won(b.tax)} + 지방소득세 0.3% ${won(b.local)})를 떼면 실수령은 ${won(b.net)}입니다. 같은 금액이 기타소득(8.8%)이면 ${won(o.net)}이고, 매달 받을 때의 연 환산과 5월 종합소득세 정산 예시, 직장인 실수령 비교까지 정리했습니다.`;
  const typeRows = [
    { cls: 'on', cells: ['사업소득 (3.3%)', num(gross), '없음', num(b.tax), num(b.local), num(b.net)] },
    { cells: ['기타소득 (8.8%)', num(gross), num(o.expense), num(o.tax), num(o.local), num(o.net)] },
  ];
  const backRows = ['business', 'other'].map((t) => {
    const g = FR.grossUp(gross, t);
    return { cells: [t === 'business' ? '사업소득 3.3%' : '기타소득 8.8%', num(gross), num(g.gross), num(g.total)] };
  });
  const body = `
${crumb([['/freelance/', '프리랜서 3.3%'], [null, manwon(gross)]])}
<h1 class="title">프리랜서 ${manwon(gross)}, 3.3% 떼면</h1>
<p class="meta">사업소득 원천징수 · 소득세 3% + 지방소득세 0.3% · 4대보험은 지역가입자로 따로</p>
${lead(`${manwon(gross)}을 받기로 한 프리랜서는 3.3%인 ${won(b.total)}(소득세 ${won(b.tax)} + 지방소득세 ${won(b.local)})을 떼고 ${won(b.net)}을 받습니다. 매달 이 금액을 받으면 1년에 ${won(y.total)}을 미리 내는 셈이고, 5월 종합소득세 신고에서 필요경비율에 따라 일부를 돌려받거나 더 냅니다. 같은 돈이 ${o.exempt ? '기타소득이면 과세최저한(건당 12만 5천원 이하)이라 세금이 없고' : `기타소득(강연료·원고료)으로 신고되면 8.8%인 ${won(o.total)}을 떼어 ${won(o.net)}`}, 직장인이 세전 월급으로 받으면 4대보험까지 떼고 ${won(emp.net)}입니다.`)}
${hero({ label: '실수령액 (사업소득 3.3%)', value: b.net, sub: `${won(gross)}에서 ${won(b.total)} 원천징수 · 매달이면 연 ${won(y.net)}`, bars: [b.net / gross], legendL: `실수령 ${pct(b.net / gross)}`, legendR: '원천징수 3.3%' })}
${ledger('원천징수 내역', '원', [
  { label: '소득세', note: '지급액의 3%', value: b.tax },
  { label: '지방소득세', note: '소득세의 10% (지급액의 0.3%)', value: b.local },
], { label: '원천징수 합계', value: b.total })}
${tiles([{ label: '매달이면 연 수입', value: y.gross }, { label: '연 원천징수', value: y.total }, { label: '연 실수령', value: y.net }])}
${section('기타소득이면 얼마', '강연료·원고료·자문료처럼 일시적인 용역은 필요경비 60%를 인정해 40%에 22%(소득세 20% + 지방소득세 2%)를 매깁니다 — 지급액의 8.8% · 원', table(['소득 구분', '지급액', '필요경비', '소득세', '지방소득세', '실수령'], typeRows))}
${section('실수령을 맞추려면 세전 얼마', `${won(gross)}을 손에 쥐려면 계약금액을 얼마로 써야 하는지 — 세전 = 실수령 ÷ 0.967 (기타소득은 ÷ 0.912) · 원`, table(['소득 구분', '받고 싶은 실수령', '필요한 세전 금액', '원천징수'], backRows))}
${ad()}
${section('5월 종합소득세 정산 예시', '수입에서 필요경비를 뺀 소득으로 다시 계산해 미리 낸 3.3%와 정산합니다. 필요경비율은 업종별 단순경비율(국세청 고시)이나 실제 경비 — 여기서는 60·70·80% 가정, 본인 기본공제만 반영', table(['필요경비율', '과세표준', '결정세액(지방 포함)', '정산'], freeSettleRows(y.gross, y.total)))}
<div class="callout"><b>4대보험은 따로</b> — 프리랜서는 직장가입자가 아니라 건강보험·국민연금을 지역가입자로 직접 냅니다(소득·재산 기준). 위 실수령에는 이 비용이 빠져 있습니다. 얼마인지는 <a href="/nhis/">건강보험료 계산기</a>에서 연소득으로 계산해 보세요.</div>
${section('같은 돈을 직장인이 받으면', `세전 월급 ${won(gross)} 근로자의 실수령(식대 20만원 포함 기준)`, tiles([{ label: '직장인 실수령', value: emp.net }, { label: '프리랜서 실수령', value: b.net }, { label: '차이', value: b.net - emp.net }]) + `<p class="sub" style="margin-top:8px;font-size:12.5px;color:var(--muted)">직장인은 4대보험(회사가 절반 부담)과 소득세를 떼고, 프리랜서는 3.3%만 떼지만 보험료를 스스로 내고 퇴직금·연차·실업급여가 없습니다.</p>`)}
${section('금액이 바뀌면', '사업소득 3.3% 실수령', chips(neighbors(FREE, mm, 3).map((x) => ({ label: short(x * 10000), value: FR.withholding(x * 10000).net, href: freeUrl(x), on: x === mm }))))}
${section('알아두면 좋은 것', null, FREE_TIPS)}
${section('이어서 계산하기', null, list([
  { href: '/freelance/', title: '프리랜서 3.3% 계산기', sub: '사업소득·기타소득과 세전↔실수령 역산' },
  { href: '/nhis/', title: '건강보험료 계산기', sub: '지역가입자 보험료가 얼마인지' },
  { href: incUrl(nearest(INC, Math.round(y.gross * 0.4 / 10000))), title: '종합소득세 계산', sub: '5월 신고 때 낼 세금' },
  { href: monthlyUrl(nearest(MONTHLIES, Math.round(gross / 10000))), title: `월급 ${manwon(nearest(MONTHLIES, Math.round(gross / 10000)) * 10000)} 직장인 실수령액`, sub: '4대보험·소득세 공제 내역' },
]))}
${FREE_NOTE}`;
  write(url, shell({ url, title, desc, body, nav: 'monthly' }));
}

function freelanceIndex() {
  const url = '/freelance/';
  const rows = FREE.map((mm) => {
    const g = mm * 10000, b = FR.withholding(g), o = FR.withholding(g, 'other');
    return { cells: [`<a href="${freeUrl(mm)}">${manwon(g)}</a>`, num(b.total), num(b.net), num(o.total), num(o.net), num(b.total * 12)] };
  });
  const ex = FR.withholding(3000000);
  const compareRows = [
    { cells: ['원천징수율', '3.3% (소득세 3% + 지방 0.3%)', '8.8% (필요경비 60% 인정 후 22%)'] },
    { cells: ['어떤 일', FR.TYPES.business.who, FR.TYPES.other.who] },
    { cells: ['필요경비', '원천징수 단계에서는 인정 없음', '총액의 60%를 인정'] },
    { cells: ['300만원 받으면', `${won(FR.withholding(3000000).net)} 실수령`, `${won(FR.withholding(3000000, 'other').net)} 실수령`] },
    { cells: ['세금이 없는 구간', '없음 (금액과 무관하게 3.3%)', `건당 ${won(FR.OTHER_MIN)} 이하 (기타소득금액 5만원 이하)`] },
    { cells: ['5월 신고', '종합소득에 합산해 정산', `연 기타소득금액 ${manwon(FR.OTHER_SEPARATE)} 이하면 분리과세 선택 가능`] },
  ];
  const body = `
${crumb([['/', '홈'], [null, '프리랜서 3.3%']])}
<h1 class="title">프리랜서 3.3% 원천징수 계산기 — 실수령과 세전 역산</h1>
<p class="meta">사업소득 3.3% · 기타소득 8.8% · 세전↔실수령 양방향 · 입력값은 이 기기 밖으로 나가지 않습니다</p>
${lead(`프리랜서가 받는 사업소득은 소득세 3%와 지방소득세 0.3%를 합한 3.3%를 떼고 지급합니다. 300만원이면 ${won(ex.total)}을 떼고 ${won(ex.net)}을 받습니다. 강연료·원고료처럼 일시적인 일은 기타소득이라 필요경비 60%를 인정한 뒤 22%를 매겨 총액의 8.8%를 뗍니다. 어느 쪽이든 미리 내는 세금이라 다음 해 5월 종합소득세 신고로 정산합니다. 금액을 넣으면 실수령을, 실수령을 넣으면 계약금액을 거꾸로 계산합니다.`)}
<form class="quick ye-form" id="fr-form">
<div class="ye-grid">
<label class="ye-f"><span>소득 구분</span><select id="fr-type"><option value="business" selected>사업소득 — 원천징수 3.3%</option><option value="other">기타소득 — 원천징수 8.8%</option></select></label>
<label class="ye-f"><span>계산 방향</span><select id="fr-mode"><option value="gross" selected>세전 금액 → 실수령</option><option value="net">실수령 → 세전 금액</option></select></label>
<label class="ye-f"><span id="fr-label">세전 금액 (만원)</span><input id="fr-amount" type="text" inputmode="numeric" value="300"></label>
</div>
</form>
<div class="hero"><div class="hero-label" id="fr-hero-label">실수령액</div><div class="hero-num"><span class="num" id="fr-out">0</span><span class="unit">원</span></div><div class="hero-sub" id="fr-sub">계산 중</div></div>
<div class="tiles"><div class="tile"><small>소득세</small><span class="num" id="fr-tax">0</span></div><div class="tile"><small>지방소득세</small><span class="num" id="fr-local">0</span></div><div class="tile"><small>원천징수 합계</small><span class="num" id="fr-total">0</span></div></div>
<div id="fr-tips"></div>
<div class="ledger"><div class="lg-head"><h2>계산 흐름</h2><span>원</span></div><div id="fr-rows"></div></div>
<p class="sub" style="margin-top:8px"><a id="fr-link" href="${freeUrl(300)}">300만원 표로 →</a></p>
${section('사업소득과 기타소득', '계속·반복해서 하는 일이면 사업소득, 일시적·우발적인 일이면 기타소득입니다', table(['구분', '사업소득 (3.3%)', '기타소득 (8.8%)'], compareRows))}
${ad()}
${section('금액별 원천징수와 실수령', '원 · 금액을 누르면 정산 예시와 직장인 비교', table(['지급액', '3.3% 공제', '사업소득 실수령', '8.8% 공제', '기타소득 실수령', '매달이면 연 공제'], rows))}
${section('세전 금액 역산', '손에 쥐고 싶은 금액에서 계약금액을 거꾸로 구하면 (세전 = 실수령 ÷ 0.967, 기타소득은 ÷ 0.912) · 원', table(['받고 싶은 실수령', '사업소득 세전', '기타소득 세전'], [100, 200, 300, 500, 1000].map((mm) => { const t = mm * 10000; return { cells: [manwon(t), num(FR.grossUp(t).gross), num(FR.grossUp(t, 'other').gross)] }; })))}
${section('자주 묻는 것', null, `<div class="doc">
<p><b>3.3%를 떼고 받았는데 5월에 또 내나요?</b> 다시 내는 것이 아니라 정산합니다. 1년 수입에서 경비와 공제를 뺀 소득으로 계산한 세금이 미리 낸 3.3%보다 적으면 차액을 돌려받고, 많으면 그만큼만 더 냅니다. 수입이 연 2,000만원 안팎이고 경비율이 높으면 대부분 환급입니다.</p>
<p><b>사업자등록을 해야 하나요?</b> 계속·반복적으로 용역을 제공하면 원칙적으로 사업자등록 대상입니다. 다만 3.3% 원천징수만 받는 인적용역 프리랜서는 등록 없이도 5월 종합소득세 신고로 정리할 수 있습니다. 등록하면 세금계산서를 발행하고 부가가치세 신고 의무가 생깁니다(인적용역은 면세인 경우가 많습니다).</p>
<p><b>지급명세서는 어디서 보나요?</b> 홈택스 '지급명세서 등 제출내역'에서 나에게 지급된 사업소득·기타소득과 원천징수 세액을 확인할 수 있습니다. 5월 신고 때 자동으로 채워지지만 누락이 있으면 직접 더해야 합니다.</p>
<p><b>기타소득으로 신고됐는데 사업소득이 맞다면?</b> 5월 종합소득세 신고에서 실제 성격대로 사업소득으로 신고할 수 있습니다. 필요경비를 실제 경비나 경비율로 계산해 세금이 달라집니다.</p>
<p><b>세금을 안 떼고 전액 받았습니다.</b> 원천징수를 하지 않았어도 소득은 그대로 남습니다. 5월에 신고해 세금을 내야 하고, 지급한 쪽이 지급명세서를 제출했다면 국세청도 알고 있습니다.</p>
</div>`)}
${section('알아두면 좋은 것', null, FREE_TIPS)}
${section('이어서 계산하기', null, list([
  { href: '/nhis/', title: '건강보험료 계산기', sub: '프리랜서는 지역가입자로 따로 냅니다' },
  { href: '/income-tax/', title: '종합소득세 계산', sub: '5월 신고로 정산하는 세금' },
  { href: '/monthly/', title: '월급 실수령액표', sub: '직장인이면 얼마를 떼는지' },
  { href: '/rates/', title: `${YEAR}년 4대보험 요율표`, sub: '직장가입자 요율' },
]))}
${FREE_NOTE}`;
  write(url, shell({ url, title: '프리랜서 3.3% 계산기 — 사업소득·기타소득 원천징수와 실수령 역산', desc: '프리랜서 사업소득 3.3%(소득세 3% + 지방소득세 0.3%)와 기타소득 8.8%(필요경비 60% 인정 후 22%)를 떼면 실수령이 얼마인지, 원하는 실수령을 받으려면 계약금액을 얼마로 써야 하는지 계산합니다. 금액별 표와 5월 종합소득세 정산 예시, 직장인 실수령 비교.', body, nav: 'monthly', scripts: ['/js/engine.js', '/js/freelance.js'] }));
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
  const desc = `월급 ${manwon(pay)}의 통상시급은 ${won(o.hourly)}(÷209시간)이고 연장근로 1시간은 1.5배 ${won(o.ext)}, 야간은 0.5배 ${won(o.night)} 가산, 휴일근로 1시간은 1.5배 ${won(o.holiday8)}입니다. 월 연장 시간별 추가 수당과 실수령을 정리했습니다.`;
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
${lead(`월급 ${manwon(pay)}의 통상시급은 ${won(o.hourly)}이라 연장근로 1시간에 ${won(o.ext)}, 야간이 겹치면 ${won(o.extNight)}을 받아야 합니다. 한 달에 20시간 연장하면 ${won(o.ext * 20)}이 더해지고, 5인 미만 사업장은 가산 없이 통상시급만 적용됩니다.`)}
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
  { href: monthlyUrl(nearest(MONTHLIES, Math.round(pay / 10000))), title: `월급 ${manwon(pay)} 실수령액`, sub: '연장 없이 받을 때' },
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
${lead(`월급 ${manwon(pay)}이면 연차 하루 수당은 ${won(daily)}입니다. 1년 이상 근속의 기본 연차 15일을 하나도 쓰지 않으면 ${won(daily * 15)}을 받고, 근속이 길어져 연차가 25일이 되면 ${won(daily * 25)}까지 늘어납니다.`)}
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
${lead(`차값 ${manwon(P)}을 ${n}개월 할부(연 5%)로 사면 매달 ${won(s.monthly)}, 이자만 ${won(s.totalInterest)}입니다. 선수금 30%를 내면 월 ${won(L.annuityPayment(Math.round(P * 0.7), 0.05, n))}으로 줄고, 기간을 줄이면 이자는 줄지만 월 부담은 커집니다.`)}
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
  write('/rates/', shell({ url: '/rates/', title: `${YEAR}년 4대보험 요율표 — 국민연금·건강보험·고용보험 근로자 부담과 인상 일정`, desc: `${YEAR}년 국민연금 ${pct(R0.pension, 2)}(근로자), 건강보험 ${pct(R0.health * 2, 2)}(총 보험료율, 근로자는 절반), 장기요양 ${pct(R0.care, 2)}, 고용보험 ${pct(R0.employment, 1)}. ${PREV}년과 비교하고 2033년까지 국민연금 인상 일정을 정리했습니다.`, body, nav: 'salary' }));
}

/* ---------- 나이대별 평균 월급 ---------- */
function agePage() {
  const G = AGE.groups;
  const rows = G.map((g) => ({ cells: [g.label, num(g.mean), num(g.male), num(g.female), pct(g.mean / g.prev - 1), num(AG.medianOf(g.key))] }));
  const bracketLabels = AGE.brackets.map((b, i) => i + 1 < AGE.brackets.length ? `${short(b)}~${short(AGE.brackets[i + 1])}` : `${short(b)} 이상`).map((s) => s.replace(/^0만~(.+)$/, '$1 미만'));
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

/* ---------- 서재 ---------- */
function guideContext() {
  const ex = netPay({ annual: 42000000, nontax: NT });
  const ex1 = netPay({ annual: 42000000, nontax: NT, dependents: 1 });
  const ex2 = netPay({ annual: 42000000, nontax: NT, dependents: 2 });
  const ex3 = netPay({ annual: 42000000, nontax: NT, dependents: 3 });
  const P = 200000000, r = 0.045, years = 30, months = 360;
  const a = L.summary(P, r, months), e = L.summary(P, r, months, 'equal'), b = L.summary(P, r, months, 'bullet'), lower = L.summary(P, r - 0.005, months);
  const sv = R.severance(3500000, 10), st = R.severanceTax(sv.amount, 10);
  const ui = U.dailyBenefit(3500000);
  const dsrA = 50000000, cap = Math.floor(dsrA * 0.4 / 12);
  return {
    YEAR, PREV, R0, R1: RATES[PREV], won, num, manwon, pct, rate: fmtRate, minWage: R0.minWage,
    table: (head, rows) => table(head, rows.map((cells) => ({ cells }))),
    ex, ex1, ex2, ex3,
    loan: { P, r, years, annuity: { first: a.first, last: a.last, totalInterest: a.totalInterest }, equal: { first: e.first, last: e.last, totalInterest: e.totalInterest }, bullet: { first: b.first, last: b.last, totalInterest: b.totalInterest }, lower: { first: lower.first } },
    retire: { pay: 3500000, years: 10, avgDaily: sv.avgDaily, amount: sv.amount, svc: st.serviceDeduction, converted: st.converted, base: st.base, incomeTax: st.incomeTax, localTax: st.localTax, total: st.total },
    ui: { pay: 3500000, upper: ui.upper, lower: ui.lower, raw: ui.raw, daily: ui.daily },
    dsr: { annual: dsrA, cap, r: 0.045, principal: Math.floor(L.loanForPayment(cap, 0.045, 360) / 10000) * 10000, stressed: Math.floor(L.loanForPayment(cap, 0.06, 360) / 10000) * 10000 },
  };
}

const KIND_LINKS = {
  salary: [{ href: '/salary/', title: '연봉 실수령액표' }, { href: '/monthly/', title: '월급 실수령액표' }, { href: '/rates/', title: '4대보험 요율표' }],
  loan: [{ href: '/loan/', title: '대출 상환액 사전' }, { href: '/dsr/', title: 'DSR 대출 한도표' }],
  retire: [{ href: '/retire/', title: '퇴직금 계산표' }],
  unemployment: [{ href: '/unemployment/', title: '실업급여 계산표' }],
  hourly: [{ href: '/hourly/', title: '알바 월급표' }, { href: '/minimum-wage/', title: '최저임금' }],
  jeonse: [{ href: '/jeonse/', title: '전세 vs 월세 계산표' }],
};

function guidePages() {
  const c = guideContext();
  GUIDES.forEach((g, i) => {
    const url = guideUrl(g.slug);
    const title = gtitle(g);
    const others = GUIDES.filter((x) => x.slug !== g.slug).slice(0, 4);
    const ld = { '@context': 'https://schema.org', '@type': 'Article', headline: title, description: g.desc, url: SITE + url, datePublished: '2026-09-06', dateModified: BUILD_ISO, inLanguage: 'ko', author: { '@type': 'Organization', name: '돈표' }, publisher: { '@type': 'Organization', name: '돈표', url: SITE }, isPartOf: { '@type': 'WebSite', name: '돈표', url: SITE } };
    const body = `
${crumb([['/guide/', '서재'], [null, title]])}
<h1 class="title">${title}</h1>
<p class="meta">${YEAR}년 요율 기준 · 예시 숫자는 빌드 때마다 다시 계산 · 갱신 ${BUILD_ISO}</p>
<div class="doc">${g.body(c)}</div>
${ad()}
${section('계산해 보기', null, list((KIND_LINKS[g.kind] || []).map((k) => ({ href: k.href, title: k.title }))))}
${section('다른 글', null, list(others.map((x) => ({ href: guideUrl(x.slug), title: gtitle(x) }))))}`;
    write(url, shell({ url, title: `${title} — 돈표 서재`, desc: g.desc, body, nav: 'guide', ld }));
  });
  const body = `
${crumb([['/', '홈'], [null, '서재']])}
<h1 class="title">서재 — 숫자 뒤의 규칙</h1>
<p class="meta">실수령액·대출·퇴직금·실업급여·주휴수당·전월세를 계산하는 규칙을 예시와 함께 풀어 쓴 글 ${GUIDES.length}편</p>
${section('급여', null, list(GUIDES.filter((g) => g.kind === 'salary').map((g) => ({ href: guideUrl(g.slug), title: gtitle(g), sub: g.desc }))))}
${section('대출·주거', null, list(GUIDES.filter((g) => ['loan', 'jeonse'].includes(g.kind)).map((g) => ({ href: guideUrl(g.slug), title: gtitle(g), sub: g.desc }))))}
${section('퇴직·실업·알바', null, list(GUIDES.filter((g) => ['retire', 'unemployment', 'hourly'].includes(g.kind)).map((g) => ({ href: guideUrl(g.slug), title: gtitle(g), sub: g.desc }))))}
<p class="note">글에 나오는 예시 숫자는 이 사이트의 계산 엔진이 빌드할 때마다 다시 계산하므로 요율이 바뀌면 함께 바뀝니다. <a href="/method/">계산 기준 보기</a></p>`;
  write('/guide/', shell({ url: '/guide/', title: '돈표 서재 — 실수령액·대출·퇴직금·실업급여 계산 규칙 설명', desc: `연봉 실수령액이 정해지는 순서, 간이세액표 읽는 법, 4대보험 요율, 대출 상환 방식과 DSR, 퇴직소득세, 실업급여, 주휴수당, 전월세전환율을 예시와 함께 설명한 글 ${GUIDES.length}편.`, body, nav: 'guide' }));
}

/* ---------- 커플 합산 대출 링크 ---------- */
function couplePage() {
  const url = '/couple/';
  const body = `
${crumb([['/', '홈'], [null, '둘이 합쳐 얼마까지']])}
<h1 class="title">둘이 합쳐 얼마까지 빌릴 수 있을까</h1>
<p class="meta">링크 하나로 상대 연봉을 받아 합산 DSR 한도·전세 여력을 계산 · 입력값은 링크 주소에만 담기고 서버로 가지 않습니다</p>
<div id="cp-start">
<form class="quick" id="cp-start-form"><label for="cp-a">내 연봉</label><div class="quick-row"><div class="quick-in"><input id="cp-a" type="text" inputmode="numeric" placeholder="4200"><span>만원</span></div><button class="btn" type="submit">링크 만들기</button></div><div class="quick-row" style="margin-top:4px"><div class="quick-in" style="border-bottom-color:var(--line)"><input id="cp-ad" type="text" inputmode="numeric" placeholder="0"><span>만원 · 이미 갚는 월 상환액(선택)</span></div></div></form>
<div id="cp-link-box" hidden style="margin-top:14px">
<p class="lead" id="cp-mine"></p>
<div class="ledger" style="margin-top:12px"><div class="lg-head"><h2>상대에게 보낼 링크</h2><span>연봉만 넣으면 결과</span></div><input id="cp-link" class="copybox" readonly onclick="this.select()"><div class="btn-row"><button class="btn" type="button" id="cp-share">공유하기</button><button class="btn btn-share" type="button" id="cp-copy">링크 복사</button></div></div>
</div>
${section('어떻게 되나', null, `<div class="callout">① 내 연봉을 넣고 링크를 만듭니다. ② 링크를 받은 사람이 자기 연봉을 넣습니다. ③ 두 사람 연봉을 합친 DSR 40% 한도, 30년·4.5% 최대 대출, 스트레스 금리 적용 한도, 한도만큼 전세대출 시 월 이자가 나옵니다. 결과 링크를 다시 보내면 둘이 같은 화면을 봅니다.</div>`)}
</div>
<div id="cp-invite" hidden>
<p class="lead">상대가 연봉 <b id="cp-invite-a"></b>을 넣고 링크를 보냈어요. 내 연봉을 넣으면 둘이 합쳐 얼마까지 빌릴 수 있는지 바로 나옵니다.</p>
<form class="quick" id="cp-invite-form"><label for="cp-b">내 연봉</label><div class="quick-row"><div class="quick-in"><input id="cp-b" type="text" inputmode="numeric" placeholder="3800"><span>만원</span></div><button class="btn" type="submit">합산 한도 보기</button></div><div class="quick-row" style="margin-top:4px"><div class="quick-in" style="border-bottom-color:var(--line)"><input id="cp-bd" type="text" inputmode="numeric" placeholder="0"><span>만원 · 이미 갚는 월 상환액(선택)</span></div></div></form>
<p class="note">입력한 연봉은 링크 주소에만 담기고 어디에도 저장되지 않습니다.</p>
</div>
<div id="cp-result" hidden>
<div id="cp-result-body"></div>
<div class="ledger" style="margin-top:16px"><div class="lg-head"><h2>이 결과를 상대에게 보내기</h2><span>둘이 같은 화면</span></div><input id="cp-result-link" class="copybox" readonly onclick="this.select()"><div class="btn-row"><button class="btn" type="button" id="cp-result-share">공유하기</button><button class="btn btn-share" type="button" id="cp-result-copy">링크 복사</button></div></div>
${section('이어서 계산하기', null, list([{ href: '/dsr/', title: '연봉별 대출 한도표', sub: '혼자일 때 기간·금리별 한도' }, { href: '/loan/', title: '대출 상환액 사전', sub: '한도만큼 빌리면 매달 얼마' }, { href: '/jeonse/', title: '전세 vs 월세', sub: '보증금별 전세대출 이자와 월세' }]))}
<p style="margin-top:14px"><a href="/couple/" onclick="location.hash='';location.reload();return false;">내 정보로 새 링크 만들기 →</a></p>
</div>
<div class="toast" id="cp-toast" hidden>링크를 복사했어요</div>
<p class="note">DSR 40%는 은행권 기준이며 실제 심사는 LTV·신용대출·스트레스 금리에 따라 다릅니다. 부부 합산 심사는 혼인신고를 한 부부 기준입니다. <a href="/guide/dsr/">DSR 설명 글</a></p>`;
  write(url, shell({ url, title: '둘이 합쳐 얼마까지 빌릴 수 있을까 — 커플 합산 대출 한도 링크', desc: '내 연봉으로 링크를 만들어 보내면 상대가 연봉만 넣고 두 사람 합산 DSR 40% 대출 한도, 30년 원리금균등 최대 원금, 전세대출 시 월 이자가 나옵니다. 서버 저장 없음.', body, nav: 'loan', scripts: ['/js/engine.js', '/js/couple.js'] }));
}

/* ---------- 내 시간으로 사는 물건 ---------- */
const timeUrl = (m) => `/time/${m}/`;
function timePage(m) {
  const annual = m * 10000;
  const p = netPay({ annual, nontax: NT });
  const hn = p.net / MONTH_HOURS, hg = p.gross / MONTH_HOURS;
  const url = timeUrl(m);
  const rows = PRICES.map((it) => ({ cells: [`${it.label}${it.note ? ` <small style="color:var(--faint)">${it.note}</small>` : ''}`, num(it.price), hoursText(it.price / hn), hoursText(it.price / hg)] }));
  const chicken = PRICES.find((x) => x.key === 'chicken'), phone = PRICES.find((x) => x.key === 'phone'), apt = PRICES.find((x) => x.key === 'apt');
  const title = `연봉 ${manwon(annual)}의 세후 시급 ${won(Math.round(hn))} — 치킨은 ${hoursText(chicken.price / hn)}, 아이폰은 ${hoursText(phone.price / hn)} 일해야`;
  const desc = `연봉 ${manwon(annual)}은 세후 시급 ${won(Math.round(hn))}. 아메리카노·치킨·아이폰·여행·자동차·아파트를 사려면 몇 시간, 며칠, 몇 달을 일해야 하는지 내 시간으로 환산했습니다.`;
  const body = `
${crumb([['/time/', '내 시간으로 사는 물건'], [null, `연봉 ${manwon(annual)}`]])}
<h1 class="title">연봉 ${manwon(annual)} — 내 한 시간은 ${won(Math.round(hn))}</h1>
<p class="meta">세후 시급 = 월 실수령 ${won(p.net)} ÷ ${MONTH_HOURS}시간 · 세전 시급 ${won(Math.round(hg))} · 물건값은 ${PRICES_ASOF} 어림 시세</p>
${lead(`연봉 ${manwon(annual)}이면 세금과 4대보험을 뺀 한 시간 값이 ${won(Math.round(hn))}입니다. 치킨 한 마리는 ${hoursText(chicken.price / hn)}, 아이폰 한 대는 ${hoursText(phone.price / hn)}, 서울 아파트 한 채는 한 푼도 안 쓰고 ${hoursText(apt.price / hn)}을 일해야 합니다.`)}
${hero({ label: '세후 시급', value: Math.round(hn), sub: `하루 8시간이면 ${won(Math.round(hn * 8))} · 한 달 ${MONTH_HOURS}시간이면 ${won(p.net)}` })}
<button class="btn btn-share" type="button" data-share-card data-l1="연봉 ${manwon(annual)}의 한 시간" data-l2="${num(Math.round(hn))}" data-l3="세후 시급 · ${YEAR}년" data-l4="치킨 ${hoursText(chicken.price / hn)} · 아이폰 ${hoursText(phone.price / hn)} · 아파트 ${hoursText(apt.price / hn)}">시급 카드 저장</button>
${section('물건을 시간으로 바꾸면', '세후 시급 기준이 진짜 체감값, 세전은 참고', table(['물건', '가격', '세후 시간', '세전 시간'], rows))}
${ad()}
${section('연봉이 바뀌면', '세후 시급', chips(neighbors(SALARIES, m, 3).map((v) => ({ label: short(v * 10000), value: Math.round(netPay({ annual: v * 10000, nontax: NT }).net / MONTH_HOURS), href: timeUrl(v), on: v === m }))))}
${section('이어서 보기', null, list([{ href: salaryUrl(m), title: `연봉 ${manwon(annual)} 실수령액`, sub: '공제 내역과 부양가족별 표' }, { href: `/goal/10000/${nearest(SAVE_M, Math.round(p.net * 0.3 / 10000))}/`, title: '1억 모으기 시계', sub: '실수령의 30%를 저축하면' }]))}
<p class="note">가격은 규모를 가늠해 보라고 넣은 어림값이라 지역·브랜드에 따라 다릅니다. 시간은 월 ${MONTH_HOURS}시간(주 40시간 + 주휴) 기준입니다.</p>`;
  write(url, shell({ url, title, desc, body, nav: 'salary' }));
}
function timeIndex() {
  const picks = ['coffee', 'chicken', 'phone', 'car', 'apt'].map((k) => PRICES.find((x) => x.key === k));
  const rows = SALARIES.filter((m) => m % 500 === 0 || m > 10000).map((m) => { const hn = netPay({ annual: m * 10000, nontax: NT }).net / MONTH_HOURS; return { cells: [`<a href="${timeUrl(m)}">연봉 ${manwon(m * 10000)}</a>`, num(Math.round(hn))].concat(picks.map((it) => hoursText(it.price / hn))) }; });
  const body = `
${crumb([['/', '홈'], [null, '내 시간으로 사는 물건']])}
<h1 class="title">내 시간으로 사는 물건</h1>
<p class="meta">연봉을 세후 시급으로 바꾸고, 물건값을 "몇 시간 일해야 하나"로 환산 · 물건값은 ${PRICES_ASOF} 어림 시세</p>
<form class="quick" data-quick="time" data-step="100" data-min="2000" data-max="30000"><label for="q-time">연봉</label><div class="quick-row"><div class="quick-in"><input id="q-time" type="text" inputmode="numeric" placeholder="4200"><span>만원</span></div><button class="btn" type="submit">내 시간으로 보기</button></div></form>
${section('연봉별', null, table(['연봉', '세후 시급'].concat(picks.map((it) => it.label.replace(/ 한 \S+$/, ''))), rows))}`;
  write('/time/', shell({ url: '/time/', title: '내 시간으로 사는 물건 — 연봉별 세후 시급으로 환산한 물건값', desc: '연봉별 세후 시급을 구해 아메리카노·치킨·아이폰·자동차·아파트를 사려면 몇 시간을 일해야 하는지 환산했습니다.', body, nav: 'salary' }));
}

/* ---------- 세금 영수증 ---------- */
const receiptUrl = (m) => `/tax-receipt/${m}/`;
function taxReceiptPage(m) {
  const annual = m * 10000;
  const p = netPay({ annual, nontax: NT });
  const url = receiptUrl(m);
  const emp = { pension: p.pension, health: p.health, care: p.care, employment: Math.floor(p.taxable * (R0.employment + 0.0025) / 10) * 10 };
  const empTotal = emp.pension + emp.health + emp.care + emp.employment;
  const mine = p.deductions, both = mine + empTotal;
  const rows = [
    { cells: ['국민연금', num(p.pension * 12), num(emp.pension * 12), '국민연금기금 — 내 노후연금 적립'] },
    { cells: ['건강보험', num(p.health * 12), num(emp.health * 12), '건강보험공단 — 진료비 보장'] },
    { cells: ['장기요양보험', num(p.care * 12), num(emp.care * 12), '노인 요양 서비스'] },
    { cells: ['고용보험', num(p.employment * 12), num(emp.employment * 12), '고용보험기금 — 실업급여·육아휴직급여·직업훈련'] },
    { cells: ['소득세', num(p.tax * 12), '-', '국가 일반회계 — 국방·복지·교육·행정'] },
    { cells: ['지방소득세', num(p.local * 12), '-', '사는 시·군·구'] },
    { cls: 'sum', cells: ['합계', num(mine * 12), num(empTotal * 12), `둘을 더하면 연 ${manwon(both * 12)}`] },
  ];
  const title = `연봉 ${manwon(annual)} 세금 영수증 — 1년에 나는 ${manwon(mine * 12)}, 회사는 ${manwon(empTotal * 12)}을 낸다`;
  const desc = `연봉 ${manwon(annual)}이면 1년 동안 내 월급에서 ${won(mine * 12)}이 4대보험과 세금으로 나가고, 회사도 나 때문에 ${won(empTotal * 12)}을 따로 냅니다. 항목별 금액과 그 돈이 어디로 가는지 정리했습니다.`;
  const body = `
${crumb([['/tax-receipt/', '세금 영수증'], [null, `연봉 ${manwon(annual)}`]])}
<h1 class="title">연봉 ${manwon(annual)} — 내 세금 영수증</h1>
<p class="meta">${YEAR}년 요율 · 본인 1인 · 식대 20만원 포함 · 회사 부담은 국민연금·건강보험·장기요양 같은 비율 + 고용보험 1.15%(150인 미만 기준), 산재보험 제외</p>
${lead(`연봉 ${manwon(annual)}을 받는 1년 동안 내 월급에서 ${won(mine * 12)}이 빠져나가고, 회사는 나를 고용한 대가로 ${won(empTotal * 12)}을 따로 냅니다. 둘을 합치면 ${won(both * 12)}으로 연봉의 ${pct(both * 12 / annual)}이고, 이 가운데 국민연금 ${won((p.pension + emp.pension) * 12)}은 내 이름으로 쌓이는 돈입니다.`)}
${hero({ label: '1년에 내 월급에서 나가는 돈', value: mine * 12, sub: `4대보험 ${won(p.insurance * 12)} + 소득세·지방소득세 ${won(p.taxTotal * 12)} · 월 ${won(mine)}`, bars: [p.insurance / mine, p.taxTotal / mine], legendL: `4대보험 ${pct(p.insurance / mine, 0)}`, legendR: `세금 ${pct(p.taxTotal / mine, 0)}` })}
${section('항목별 · 연간', '나와 회사가 각각 내는 돈과 그 돈의 행선지', table(['항목', '나', '회사', '어디로'], rows))}
${section('회사가 나에게 쓰는 돈', null, tiles([{ label: '연봉', value: annual }, { label: '회사 부담 보험료', value: empTotal * 12 }, { label: '총 인건비 (퇴직금 적립 별도)', value: annual + empTotal * 12 }]))}
${ad()}
<div class="callout"><b>돌아오는 돈</b> — 국민연금은 62~65세부터 연금으로, 건강보험은 아플 때 진료비의 60~90%로, 고용보험은 실직 시 <a href="/unemployment/">구직급여</a>와 육아휴직급여로 돌아옵니다. 소득세는 <a href="/guide/withholding-table/">간이세액표</a>로 미리 낸 뒤 연말정산에서 정산되고, 지방소득세는 사는 지역의 도로·복지·교육에 쓰입니다. 회사 부담분 중 국민연금은 내 연금 계좌에 함께 적립되어, 실제로는 내가 낸 것의 두 배가 쌓입니다.</div>
${section('연봉이 바뀌면', '1년에 내 월급에서 나가는 돈', chips(neighbors(SALARIES, m, 3).map((v) => ({ label: short(v * 10000), value: netPay({ annual: v * 10000, nontax: NT }).deductions * 12, href: receiptUrl(v), on: v === m }))))}
${section('이어서 보기', null, list([{ href: salaryUrl(m), title: `연봉 ${manwon(annual)} 실수령액`, sub: '월별 공제 내역' }, { href: '/rates/', title: `${YEAR}년 4대보험 요율표`, sub: '근로자·사업주 부담' }, { href: '/guide/insurance-rates/', title: '4대보험 요율 총정리', sub: '서재' }]))}
<p class="note">회사 부담 고용보험은 근로자 0.9%에 고용안정·직업능력개발 0.25%(150인 미만)를 더한 값이며, 규모가 크면 최대 0.85%입니다. 산재보험은 업종별 요율이 달라 뺐습니다.</p>`;
  write(url, shell({ url, title, desc, body, nav: 'salary' }));
}
function taxReceiptIndex() {
  const rows = SALARIES.filter((m) => m % 500 === 0 || m > 10000).map((m) => { const p = netPay({ annual: m * 10000, nontax: NT }); const emp = (p.pension + p.health + p.care + Math.floor(p.taxable * (R0.employment + 0.0025) / 10) * 10) * 12; return { cells: [`<a href="${receiptUrl(m)}">연봉 ${manwon(m * 10000)}</a>`, num(p.insurance * 12), num(p.taxTotal * 12), num(emp), pct((p.deductions * 12 + emp) / (m * 10000), 0)] }; });
  const body = `
${crumb([['/', '홈'], [null, '세금 영수증']])}
<h1 class="title">내 세금 영수증 — 1년에 나와 회사가 내는 돈</h1>
<p class="meta">연봉별 4대보험·세금 연간 합계와 회사 부담분 · 그 돈이 어디로 가는지</p>
${section('연봉별 · 연간', '원', table(['연봉', '내 4대보험', '내 세금', '회사 부담', '연봉 대비 합계'], rows))}`;
  write('/tax-receipt/', shell({ url: '/tax-receipt/', title: '내 세금 영수증 — 연봉별 1년 4대보험·세금과 회사 부담분', desc: '연봉별로 1년 동안 내 월급에서 나가는 4대보험과 세금, 회사가 따로 내는 보험료, 그 돈의 행선지를 정리했습니다.', body, nav: 'salary' }));
}

/* ---------- 1억 모으기 시계 ---------- */
const GOALS = [5000, 10000, 30000, 50000];
const SAVE_M = [30, 50, 70, 100, 150, 200, 300];
const GOAL_RATES = [0, 0.02, 0.03, 0.04, 0.05];
const goalUrl = (g, m) => `/goal/${g}/${m}/`;
function goalPage(g, mm) {
  const target = g * 10000, monthly = mm * 10000;
  const url = goalUrl(g, mm);
  const n3 = GO.monthsToGoal(target, monthly, 0.03);
  const rows = GOAL_RATES.map((r) => { const n = GO.monthsToGoal(target, monthly, r); const ni = GO.monthsToGoal(target, monthly, r, 0.02); return { cls: r === 0.03 ? 'on' : '', cells: [r === 0 ? '이자 없이' : fmtRate(r), GO.fmtMonths(n), num(monthly * n), num(GO.balanceAfter(monthly, n, r) - monthly * n), GO.fmtMonths(ni)] }; });
  const needNet = monthly / 0.3, needGross = grossForNet(needNet, { nontax: NT });
  const salNear = nearest(SALARIES, Math.round(needGross * 12 / 10000));
  const title = `월 ${manwon(monthly)} 저축으로 ${manwon(target)} 모으려면 — ${GO.fmtMonths(n3)} (연 3%)`;
  const desc = `매달 ${manwon(monthly)}씩 모으면 ${manwon(target)}까지 연 3% 기준 ${GO.fmtMonths(n3)} 걸립니다. 금리별 기간과 이자, 물가 2%를 감안한 실질 도달 기간, 이 저축액이 실수령의 30%가 되는 연봉을 정리했습니다.`;
  const body = `
${crumb([['/goal/', '1억 모으기 시계'], [null, `${manwon(target)} · 월 ${manwon(monthly)}`]])}
<h1 class="title">월 ${manwon(monthly)}씩 모아 ${manwon(target)}</h1>
<p class="meta">매달 같은 금액을 세후 이율로 굴리는 가정 · 물가 2%면 목표 금액도 해마다 커진다고 보고 계산</p>
${lead(`매달 ${manwon(monthly)}을 저축하면 ${manwon(target)}까지 이자 없이 ${GO.fmtMonths(GO.monthsToGoal(target, monthly, 0))}, 연 3%면 ${GO.fmtMonths(n3)} 걸립니다. 물가가 연 2% 오르는 것을 감안하면 같은 값어치의 돈을 모으는 데 ${GO.fmtMonths(GO.monthsToGoal(target, monthly, 0.03, 0.02))}이 필요합니다.`)}
${hero({ label: `${manwon(target)}까지 (연 3%)`, value: n3, sub: `원금 ${won(monthly * n3)} + 이자 ${won(GO.balanceAfter(monthly, n3, 0.03) - monthly * n3)}`, bars: null }).replace(/<span class="num">[\d,]+<\/span><span class="unit">원<\/span>/, `<span class="num">${GO.fmtMonths(n3)}</span>`)}
${section('금리에 따라', null, table(['세후 이율', '기간', '원금', '이자', '물가 2% 감안'], rows))}
${section('이 저축액이 실수령의 30%가 되려면', '실수령의 30%를 저축한다는 흔한 목표를 거꾸로 계산', tiles([{ label: '필요한 월 실수령', value: Math.round(needNet) }, { label: '세전 월급', value: needGross }, { label: '연봉', value: needGross * 12 }]) + list([{ href: salaryUrl(salNear), title: `연봉 ${manwon(salNear * 10000)} 실수령액`, sub: '가장 가까운 연봉 페이지' }]))}
${ad()}
${section('저축액·목표가 바뀌면', '연 3% 기준 도달 기간', `<div class="grid grid-4">${SAVE_M.map((x) => { const t = GO.fmtMonths(GO.monthsToGoal(target, x * 10000, 0.03)); return x === mm ? `<span class="cell on"><small>월 ${short(x * 10000)}</small><span class="num">${t}</span></span>` : `<a class="cell" href="${goalUrl(g, x)}"><small>월 ${short(x * 10000)}</small><span class="num">${t}</span></a>`; }).join('')}</div><div class="chips">${GOALS.map((x) => { const t = GO.fmtMonths(GO.monthsToGoal(x * 10000, monthly, 0.03)); return x === g ? `<span class="chip on"><small>${manwon(x * 10000)}</small><span class="num">${t}</span></span>` : `<a class="chip" href="${goalUrl(x, mm)}"><small>${manwon(x * 10000)}</small><span class="num">${t}</span></a>`; }).join('')}</div>`)}
<p class="note">적금은 실제로 납입 시점마다 이자가 다르게 붙고 이자소득세 15.4%가 있어 "세후 이율"로 넣어야 맞습니다. 연 3.5% 적금이면 세후 약 3%입니다. <a href="/savings/">적금 세후 이자표</a></p>`;
  write(url, shell({ url, title, desc, body, nav: 'loan' }));
}
function goalIndex() {
  const rows = SAVE_M.map((mm) => ({ cells: [`월 ${manwon(mm * 10000)}`].concat(GOALS.map((g) => `<a href="${goalUrl(g, mm)}">${GO.fmtMonths(GO.monthsToGoal(g * 10000, mm * 10000, 0.03))}</a>`)) }));
  const body = `
${crumb([['/', '홈'], [null, '1억 모으기 시계']])}
<h1 class="title">1억 모으기 시계</h1>
<p class="meta">월 저축액 × 목표 금액별 도달 기간 · 연 3% 세후 기준 · 칸을 누르면 금리별·물가 감안 기간</p>
${section('저축액 × 목표', null, table(['월 저축'].concat(GOALS.map((g) => manwon(g * 10000))), rows))}
<p class="note">1억을 모으는 데 월 100만원이면 7년이 조금 넘게 걸립니다. 각 페이지에서 이 저축액이 실수령의 30%가 되는 연봉도 볼 수 있습니다.</p>`;
  write('/goal/', shell({ url: '/goal/', title: '1억 모으기 시계 — 월 저축액별 5천만·1억·3억·5억 도달 기간', desc: '매달 30만원부터 300만원까지 저축할 때 5천만원·1억·3억·5억을 모으는 데 걸리는 기간을 금리별로 정리했습니다.', body, nav: 'loan' }));
}

/* ---------- 연봉 협상 근거 ---------- */
const negoUrl = (m) => `/negotiate/${m}/`;
function negotiatePage(m) {
  const annual = m * 10000;
  const p = netPay({ annual, nontax: NT });
  const rk = RK.rank(annual);
  const url = negoUrl(m);
  const cpiY = Math.max(...Object.keys(CPI).map(Number)), cpi = CPI[cpiY];
  const mwUp = R0.minWage / RATES[PREV].minWage - 1;
  const keep = Math.round(annual * (1 + cpi) / 10000) * 10000;
  const pensionLoss = netPay({ annual, nontax: NT, year: PREV }).net - p.net;
  const g30 = AGE.groups[2], g40 = AGE.groups[3];
  const scen = [3, 5, 7, 10].map((r) => { const a2 = Math.round(annual * (1 + r / 100) / 10000) * 10000; const q = netPay({ annual: a2, nontax: NT }); return { cells: [`+${r}%`, num(a2), num(q.net), num(q.net - p.net)] }; });
  const text = `현재 연봉 ${manwon(annual)}은 국세청 통계 기준 근로소득자 상위 ${rk.topPct}%이고, 30대 평균 월소득(${manwon(g30.mean)})과 비교하면 월 ${p.gross >= g30.mean ? won(p.gross - g30.mean) + ' 많은' : won(g30.mean - p.gross) + ' 적은'} 수준입니다. ${cpiY}년 물가상승률 ${pct(cpi)}와 ${YEAR}년 최저임금 인상률 ${pct(mwUp)}를 감안하면 실질 가치를 유지하는 연봉은 ${manwon(keep)}이며, 올해 국민연금·건강보험 요율 인상으로 같은 연봉의 실수령이 월 ${won(pensionLoss)} 줄었습니다. 이를 근거로 ${scen[2].cells[1]}원(7% 인상)을 요청드립니다.`;
  const title = `연봉 ${manwon(annual)} 협상 근거 — 상위 ${rk.topPct}%, 물가 ${pct(cpi)}, 실질 유지선 ${manwon(keep)}`;
  const desc = `연봉 ${manwon(annual)}의 위치(상위 ${rk.topPct}%), 나이대 평균과의 차이, 물가상승률과 최저임금 인상률로 본 실질 유지선, 인상률별 실수령 변화를 한 장으로 정리하고 협상에 쓸 문장을 만들었습니다.`;
  const body = `
${crumb([['/negotiate/', '연봉 협상 근거'], [null, `연봉 ${manwon(annual)}`]])}
<h1 class="title">연봉 ${manwon(annual)} — 협상 근거 한 장</h1>
<p class="meta">국세청·통계청 통계와 ${YEAR}년 요율로 만든 숫자 · 회사 내부 기준이나 업계 시세는 따로 확인</p>
${lead(`연봉 ${manwon(annual)}은 근로소득자 상위 ${rk.topPct}%, 30대 평균 월소득보다 ${p.gross >= g30.mean ? won(p.gross - g30.mean) + ' 많고' : won(g30.mean - p.gross) + ' 적고'} 40대 평균보다 ${p.gross >= g40.mean ? won(p.gross - g40.mean) + ' 많습니다' : won(g40.mean - p.gross) + ' 적습니다'}. 물가 ${pct(cpi)}만큼만 올려도 ${manwon(keep)}이 되어야 작년과 같은 값어치이고, 요율 인상으로 실수령은 이미 월 ${won(pensionLoss)} 줄었습니다.`)}
${section('근거 네 가지', null, `<div class="tiles"><div class="tile"><small>근로소득자 중</small><span class="num">상위 ${rk.topPct}%</span></div><div class="tile"><small>실질 유지선 (물가 ${pct(cpi)})</small><span class="num">${manwon(keep)}</span></div><div class="tile"><small>요율 인상으로 준 실수령 (월)</small><span class="num">${num(pensionLoss)}</span></div></div>` + table(['비교 대상', '월 금액', '내 세전 월급과 차이'], [
  { cells: ['30대 평균 월소득 (통계청)', num(g30.mean), (p.gross - g30.mean >= 0 ? '+' : '−') + num(Math.abs(p.gross - g30.mean))] },
  { cells: ['40대 평균 월소득 (통계청)', num(g40.mean), (p.gross - g40.mean >= 0 ? '+' : '−') + num(Math.abs(p.gross - g40.mean))] },
  { cells: ['근로소득자 중위 연봉 ÷ 12 (국세청)', num(Math.round(RK.STAT.median / 12)), (p.gross - RK.STAT.median / 12 >= 0 ? '+' : '−') + num(Math.abs(Math.round(p.gross - RK.STAT.median / 12)))] },
  { cells: [`최저임금 월급 (${YEAR}년, +${pct(mwUp)})`, num(R0.minWage * MONTH_HOURS), (p.gross - R0.minWage * MONTH_HOURS >= 0 ? '+' : '−') + num(Math.abs(p.gross - R0.minWage * MONTH_HOURS))] },
]))}
${section('인상률별 실수령', '요청할 숫자를 고를 때', table(['인상률', '새 연봉', '월 실수령', '월 증가'], scen))}
${section('복사해서 쓰는 문장', '숫자만 사실이고 말투는 바꾸세요', `<textarea class="copybox" id="nego-text" rows="6" readonly>${esc(text)}</textarea><div class="btn-row"><button class="btn btn-share" type="button" data-copy="#nego-text">문장 복사</button></div>`)}
${ad()}
<div class="callout"><b>협상에서 통하는 순서</b> — ① 회사에 기여한 결과를 숫자로(매출·절감·프로젝트) ② 시장 위치(위 통계) ③ 물가·요율로 줄어든 실질 소득 ④ 원하는 숫자 하나와 근거. 상위 %와 나이대 평균은 "내가 어디쯤인지"를 보여 주는 보조 자료이고, 결정적 근거는 ①입니다.</div>
${section('연봉이 바뀌면', null, chips(neighbors(SALARIES, m, 3).map((v) => ({ label: short(v * 10000), value: netPay({ annual: v * 10000, nontax: NT }).net, href: negoUrl(v), on: v === m }))))}
${section('이어서 보기', null, list([{ href: salaryUrl(m), title: `연봉 ${manwon(annual)} 실수령액`, sub: '인상액별 실수령 표' }, { href: '/rank/', title: '연봉 순위표', sub: '상위 %의 연봉 경계' }, { href: '/age/', title: '나이대별 평균 월급', sub: '통계청 자료' }]))}
<p class="note">물가상승률은 통계청 소비자물가지수 ${cpiY}년 연간 값, 최저임금 인상률은 고용노동부 고시 기준입니다. 상위 %는 국세청 요약값에 맞춘 추정입니다. <a href="/method/">계산 기준 보기</a></p>`;
  write(url, shell({ url, title, desc, body, nav: 'salary' }));
}
function negotiateIndex() {
  const cpiY = Math.max(...Object.keys(CPI).map(Number)), cpi = CPI[cpiY];
  const rows = SALARIES.filter((m) => m % 500 === 0 || m > 10000).map((m) => { const a = m * 10000; return { cells: [`<a href="${negoUrl(m)}">연봉 ${manwon(a)}</a>`, `상위 ${RK.rank(a).topPct}%`, num(Math.round(a * (1 + cpi) / 10000) * 10000), num(Math.round(a * 1.07 / 10000) * 10000)] }; });
  const body = `
${crumb([['/', '홈'], [null, '연봉 협상 근거']])}
<h1 class="title">연봉 협상 근거 만들기</h1>
<p class="meta">내 연봉의 위치, 물가·최저임금 인상률, 요율 인상으로 줄어든 실수령을 숫자로 정리하고 복사해 쓰는 문장까지</p>
<form class="quick" data-quick="negotiate" data-step="100" data-min="2000" data-max="30000"><label for="q-nego">현재 연봉</label><div class="quick-row"><div class="quick-in"><input id="q-nego" type="text" inputmode="numeric" placeholder="4200"><span>만원</span></div><button class="btn" type="submit">근거 만들기</button></div></form>
${section('연봉별', `물가 ${pct(cpi)} 유지선과 7% 인상 시 연봉`, table(['연봉', '상위', `물가 유지선`, '7% 인상'], rows))}`;
  write('/negotiate/', shell({ url: '/negotiate/', title: '연봉 협상 근거 만들기 — 상위 %·나이대 평균·물가·최저임금으로 한 장 정리', desc: '현재 연봉의 통계적 위치와 물가상승률, 최저임금 인상률, 요율 인상으로 줄어든 실수령을 근거로 정리하고 협상에 쓸 문장을 만들어 줍니다.', body, nav: 'salary' }));
}

/* ---------- 같은 연봉의 실수령 변화 ---------- */
const histUrl = (m) => `/history/${m}/`;
function histRates(y) { return HISTORY[y] || RATES[y]; }
function historyPage(m) {
  const annual = m * 10000;
  const url = histUrl(m);
  const years = Object.keys(HISTORY).map(Number).concat([PREV, YEAR]).concat(Object.keys(PENSION_SCHEDULE).map(Number).filter((y) => y > YEAR));
  for (const y of Object.keys(HISTORY)) if (!RATES[y]) RATES[y] = HISTORY[y];
  const base = netPay({ annual, nontax: NT, year: 2020 });
  const rows = years.map((y) => { const q = netPay({ annual, nontax: NT, year: y }); return { y, q, cls: y === YEAR ? 'on' : '', cells: [`${y}년${y > YEAR ? ' (예정)' : ''}`, num(q.insurance), num(q.taxTotal), num(q.net), (q.net - base.net >= 0 ? '+' : '−') + num(Math.abs(q.net - base.net))] }; });
  const cur = rows.find((r) => r.y === YEAR).q, last = rows[rows.length - 1].q;
  const maxNet = Math.max(...rows.map((r) => r.q.net));
  const bars = rows.map((r) => `<div class="hbar"><span>${r.y}</span><i style="width:${(r.q.net / maxNet * 100).toFixed(1)}%${r.y > YEAR ? ';opacity:.45' : ''}"></i><b class="num">${num(r.q.net)}</b></div>`).join('');
  const title = `연봉 ${manwon(annual)} 실수령 변화 2020→${YEAR} — ${won(base.net)}에서 ${won(cur.net)}으로`;
  const desc = `같은 연봉 ${manwon(annual)}의 월 실수령이 2020년 ${won(base.net)}에서 ${YEAR}년 ${won(cur.net)}으로 ${won(Math.abs(cur.net - base.net))} ${cur.net >= base.net ? '늘었고' : '줄었고'}, 국민연금 인상이 끝나는 2033년에는 ${won(last.net)}이 됩니다. 연도별 4대보험·세금·실수령을 정리했습니다.`;
  const body = `
${crumb([['/history/', '실수령 변화'], [null, `연봉 ${manwon(annual)}`]])}
<h1 class="title">연봉 ${manwon(annual)} — 2020년부터 실수령 변화</h1>
<p class="meta">연도별 4대보험 요율 적용 · 소득세는 현재 간이세액표를 모든 해에 적용한 근사 · ${YEAR}년 이후는 국민연금 인상 일정만 반영한 예정치</p>
${lead(`연봉이 ${manwon(annual)}으로 똑같아도 2020년에는 월 ${won(base.net)}을 받았는데 ${YEAR}년에는 ${won(cur.net)}을 받습니다. 6년 동안 건강보험·장기요양 요율이 오르고 올해 국민연금까지 오르면서 월 ${won(Math.abs(cur.net - base.net))}이 ${cur.net >= base.net ? '늘었습니다' : '줄었습니다'}. 국민연금 인상이 끝나는 2033년에는 ${won(last.net)}으로 2020년보다 ${won(base.net - last.net)} 적습니다.`)}
${hero({ label: `2020년 → ${YEAR}년 월 실수령`, value: cur.net, sub: `2020년 ${won(base.net)} · 차이 ${cur.net >= base.net ? '+' : '−'}${won(Math.abs(cur.net - base.net))} · 1년이면 ${cur.net >= base.net ? '+' : '−'}${won(Math.abs(cur.net - base.net) * 12)}`, bars: [cur.net / base.net], legendL: `${YEAR}년은 2020년의 ${pct(cur.net / base.net)}`, legendR: `2033년 ${won(last.net)}` })}
${section('연도별 실수령', null, `<div class="hbars">${bars}</div>`)}
${section('연도별 공제 내역', '월 기준 · 원 · 2020년 대비 실수령 차이', table(['연도', '4대보험', '세금', '실수령', '2020 대비'], rows.map((r) => ({ cls: r.cls, cells: r.cells }))))}
${ad()}
<div class="callout"><b>무엇이 올랐나</b> — 건강보험료율 6.67%(2020) → ${pct(R0.health * 2, 2)}(${YEAR}), 장기요양 10.25% → ${pct(R0.care, 2)}, 고용보험 근로자 0.8% → 0.9%(2022년 7월), 국민연금 4.5% → ${pct(R0.pension, 2)}(${YEAR})에서 2033년 6.5%까지. 같은 연봉이면 손에 쥐는 돈은 해마다 조금씩 줄어드니, 연봉 협상에서 "동결"은 실질 삭감입니다. <a href="/negotiate/${m}/">협상 근거 보기</a></div>
${section('연봉이 바뀌면', `${YEAR}년 실수령`, chips(neighbors(SALARIES, m, 3).map((v) => ({ label: short(v * 10000), value: netPay({ annual: v * 10000, nontax: NT }).net, href: histUrl(v), on: v === m }))))}
<p class="note">과거 요율은 건강보험공단·국민연금공단·고용노동부 고시 기준이고, 소득세는 간이세액표 개정(2020·2023·2024년)을 반영하지 않은 근사입니다. 예정치는 국민연금 인상 일정만 넣고 다른 요율과 세금은 ${YEAR}년 그대로라고 가정했습니다. <a href="/method/">계산 기준 보기</a></p>`;
  write(url, shell({ url, title, desc, body, nav: 'salary' }));
}
function historyIndex() {
  for (const y of Object.keys(HISTORY)) if (!RATES[y]) RATES[y] = HISTORY[y];
  const rows = SALARIES.filter((m) => m % 500 === 0 || m > 10000).map((m) => { const a = m * 10000; const b = netPay({ annual: a, nontax: NT, year: 2020 }).net, c = netPay({ annual: a, nontax: NT }).net, l = netPay({ annual: a, nontax: NT, year: 2033 }).net; return { cells: [`<a href="${histUrl(m)}">연봉 ${manwon(a)}</a>`, num(b), num(c), num(l), (c - b >= 0 ? '+' : '−') + num(Math.abs(c - b))] }; });
  const body = `
${crumb([['/', '홈'], [null, '실수령 변화']])}
<h1 class="title">같은 연봉의 실수령 변화 — 2020년부터 2033년까지</h1>
<p class="meta">4대보험 요율 인상으로 같은 연봉의 손에 쥐는 돈이 어떻게 바뀌었고 바뀔지 · 월 기준</p>
${section('연봉별', '원', table(['연봉', '2020년', `${YEAR}년`, '2033년 (예정)', `${YEAR} − 2020`], rows))}
<p class="note">국민연금 근로자 부담률이 2033년 6.5%까지 오르는 일정만 반영한 예정치입니다.</p>`;
  write('/history/', shell({ url: '/history/', title: '같은 연봉의 실수령 변화 2020→2033 — 요율 인상으로 얼마나 줄었나', desc: `연봉별로 2020년과 ${YEAR}년, 국민연금 인상이 끝나는 2033년의 월 실수령을 비교했습니다.`, body, nav: 'salary' }));
}

/* ---------- 연말정산 미리보기 ---------- */
function yearendPage() {
  const url = '/yearend/';
  const inp = (id, label, value, extra = '') => `<label class="ye-f"><span>${label}</span><input id="${id}" type="text" inputmode="numeric" value="${value}"${extra}></label>`;
  const body = `
${crumb([['/', '홈'], [null, '연말정산 미리보기']])}
<h1 class="title">연말정산 미리보기 — 돌려받을까, 더 낼까</h1>
<p class="meta">연봉과 카드·의료비·연금저축 몇 가지만 넣으면 결정세액을 추정해 1년 동안 미리 낸 세금과 비교합니다 · ${YEAR}년 귀속 규정 · 입력값은 이 기기 밖으로 나가지 않습니다</p>
<form class="quick ye-form" id="ye-form">
<div class="ye-grid">
${inp('ye-annual', '연봉 (세전 · 만원)', 4200)}
${inp('ye-dep', '부양가족 수 (본인 포함)', 1)}
${inp('ye-kids', '8~20세 자녀 수', 0)}
${inp('ye-credit', '신용카드 1년 사용액 (만원)', 1500)}
${inp('ye-check', '체크카드·현금영수증 (만원)', 500)}
${inp('ye-med', '의료비 (만원)', 0)}
${inp('ye-ins', '보장성 보험료 (만원)', 0)}
${inp('ye-edu', '교육비 (만원)', 0)}
${inp('ye-rent', '월세 1년 합계 (만원)', 0)}
${inp('ye-pa', '연금저축·IRP 납입 (만원)', 0)}
</div>
<div class="ye-checks"><label><input type="checkbox" id="ye-meal" checked> 식대 비과세 월 20만원 포함</label><label><input type="checkbox" id="ye-renter"> 무주택 세대주 (월세 세액공제 대상)</label></div>
</form>
<div class="hero"><div class="hero-label" id="ye-result-label">환급 예상</div><div class="hero-num"><span class="num" id="ye-result">0</span><span class="unit">원</span></div><div class="hero-sub" id="ye-result-sub">계산 중</div></div>
<div id="ye-tips"></div>
<div class="ledger"><div class="lg-head"><h2>계산 흐름</h2><span>원 · 1년</span></div><div id="ye-rows"></div></div>
${section('어떻게 계산하나', '국세청 연말정산 규정을 단순화한 추정입니다', `<div class="doc">
<p><b>① 근로소득금액</b> — 총급여(연봉 − 비과세 식대)에서 근로소득공제를 뺍니다. 근로소득공제는 총급여 500만원까지 70%, 1,500만원까지 40%, 4,500만원까지 15%, 1억원까지 5%, 그 초과 2%(한도 2,000만원)입니다.</p>
<p><b>② 과세표준</b> — 기본공제(본인·부양가족 1인당 150만원), 국민연금·건강·고용보험료(근로자 부담 전액), 신용카드 등 소득공제(총급여 25% 초과분 × 신용카드 15%·체크카드/현금영수증 30%, 한도 300만원)를 뺍니다.</p>
<p><b>③ 산출세액</b> — 과세표준 1,400만원까지 6%, 5,000만원까지 15%, 8,800만원까지 24%, 1억 5,000만원까지 35%, 3억원까지 38%, 5억원까지 40%, 10억원까지 42%, 초과 45%.</p>
<p><b>④ 결정세액</b> — 산출세액에서 근로소득세액공제(산출세액 130만원까지 55%, 초과분 30%, 총급여별 한도 74만·66만·50만·20만원), 자녀세액공제(첫째 25만·둘째 30만·셋째부터 40만원), 연금계좌 세액공제(연 900만원 한도의 15%, 총급여 5,500만원 초과는 12%), 보험료 12%, 의료비 15%, 교육비 15%, 월세 17%/15%를 뺍니다. 항목별 공제가 13만원에 못 미치면 표준세액공제 13만원을 대신 씁니다.</p>
<p><b>⑤ 환급·추가 납부</b> — 회사가 매달 간이세액표로 뗀 소득세 12개월분(지방소득세 포함)과 결정세액의 차이입니다. 차이가 플러스면 돌려받고, 마이너스면 2월 급여에서 더 뗍니다.</p>
</div>`)}
${section('세액공제율 한눈에', `${YEAR}년 귀속`, table(['항목', '공제율', '한도·조건'], [
  { cells: ['연금저축 · IRP', '15% (총급여 5,500만원 초과 12%)', '연금저축 600만원, IRP 합산 900만원'] },
  { cells: ['보장성 보험료', '12%', '납입액 100만원까지'] },
  { cells: ['의료비', '15%', '총급여 3% 초과분 · 본인·65세 이상·장애인은 한도 없음'] },
  { cells: ['교육비', '15%', '본인 전액 · 자녀 초중고 300만원·대학 900만원'] },
  { cells: ['월세', '17% (총급여 5,500만원 초과 8,000만원 이하 15%)', '무주택 세대주 · 연 1,000만원까지'] },
  { cells: ['자녀', '25만 · 30만 · 40만원', '8세 이상 20세 이하'] },
  { cells: ['신용카드 등 (소득공제)', '15% · 30%', '총급여 25% 초과분 · 한도 300만원(7천만원 이하)'] },
]))}
${section('자주 묻는 것', null, `<div class="doc">
<p><b>미리 낸 세금이 왜 결정세액보다 많은가요?</b> 간이세액표는 공제를 넉넉히 보지 않고 매달 떼기 때문에, 카드·보험·연금저축 같은 공제를 챙긴 사람은 대개 돌려받습니다. 반대로 부양가족을 실제보다 많이 신고해 두었거나 중도 입사·상여가 많으면 더 낼 수 있습니다.</p>
<p><b>체크카드가 유리하다는데 왜 공제가 0원인가요?</b> 총급여의 25%까지는 어떤 카드를 써도 공제가 없습니다. 그 문턱을 넘긴 뒤부터 체크카드·현금영수증이 30%, 신용카드가 15%입니다. 문턱 아래에서는 혜택 좋은 신용카드를 쓰고, 넘긴 뒤에 체크카드로 바꾸는 것이 정석입니다.</p>
<p><b>연금저축을 얼마나 넣으면 되나요?</b> 연 900만원(연금저축 600만원 + IRP 300만원)까지 15%를 세액공제받아 최대 135만원(총급여 5,500만원 초과는 108만원)입니다. 다만 55세 전에 깨면 16.5%를 물어내니 묶어둘 수 있는 돈만 넣으세요.</p>
<p><b>맞벌이면 의료비·카드는 누구 앞으로?</b> 의료비는 총급여 3% 문턱이 있으니 소득이 적은 쪽으로 몰고, 카드도 문턱을 넘기기 쉬운 쪽에 몰아주는 것이 보통 유리합니다. 부양가족 기본공제는 소득세율이 높은 쪽이 받는 게 낫습니다.</p>
</div>`)}
${section('이어서 계산하기', null, list([
  { href: '/salary/', title: '연봉 실수령액표', sub: '매달 손에 쥐는 돈은 얼마인지' },
  { href: '/tax-receipt/', title: '내 세금 영수증', sub: '1년에 나와 회사가 내는 돈' },
  { href: '/rates/', title: `${YEAR}년 4대보험 요율표`, sub: '소득공제에 들어가는 보험료율' },
]))}
${guideLinks(['withholding-table', 'dependents', 'net-pay-steps'])}
<p class="note">${YEAR}년 귀속 연말정산 규정을 단순화한 추정치입니다. 주택청약·주택자금·기부금·전통시장·대중교통 추가 한도·경로우대·장애인·한부모 공제, 중도 입사·퇴사, 상여 원천징수 방식은 반영하지 않았습니다. 정확한 값은 국세청 홈택스 '연말정산 미리보기'에서 확인하세요. <a href="/method/">계산 기준 보기</a></p>`;
  write(url, shell({ url, title: `연말정산 미리보기 — 환급·추가 납부 예상 계산기 (${YEAR}년 귀속)`, desc: '연봉과 신용카드·의료비·보험료·월세·연금저축 납입액을 넣으면 근로소득공제부터 세액공제까지 계산해 결정세액과 미리 낸 세금을 비교하고 환급 예상액을 보여줍니다.', body, nav: 'salary', scripts: ['/js/engine.js', '/js/yearend.js'] }));
}

/* ---------- 임베드 위젯 ---------- */
function embedPages() {
  const brandRow = (title) => `<div class="em-head"><a class="em-brand" href="https://donpyo.com/?utm_source=embed" target="_top" rel="noopener">${LOGO}<b>돈표</b></a><span>${title} · ${YEAR}년 요율</span></div>`;
  const salary = `<form class="em" data-embed="salary">
${brandRow('연봉 실수령액')}
<div class="em-row"><label><span>연봉 (만원)</span><input type="text" inputmode="numeric" data-k="a" value="4200"></label><label><span>부양가족</span><select data-k="d"><option value="1">1인 (본인)</option><option value="2">2인</option><option value="3">3인</option><option value="4">4인</option></select></label></div>
<div class="tiles"><div class="tile"><small>월 실수령</small><span class="num" data-out="net"></span></div><div class="tile"><small>4대보험</small><span class="num" data-out="ins"></span></div><div class="tile"><small>세금</small><span class="num" data-out="tax"></span></div></div>
<div class="em-foot"><span>식대 비과세 20만원 포함 · 간이세액표 100%</span><a data-out="link" href="https://donpyo.com/salary/" target="_top" rel="noopener">자세히 보기 →</a></div>
</form>`;
  const loan = `<form class="em" data-embed="loan">
${brandRow('대출 월 상환액')}
<div class="em-row"><label><span>금액 (만원)</span><input type="text" inputmode="numeric" data-k="p" value="20000"></label><label><span>기간 (년)</span><input type="text" inputmode="numeric" data-k="y" value="30"></label><label><span>금리 (%)</span><input type="text" inputmode="decimal" data-k="r" value="4.5"></label></div>
<div class="tiles"><div class="tile"><small>월 상환액</small><span class="num" data-out="pay"></span></div><div class="tile"><small>총 이자</small><span class="num" data-out="interest"></span></div><div class="tile"><small>총 상환</small><span class="num" data-out="total"></span></div></div>
<div class="em-foot"><span>원리금균등 · 거치 없음</span><a data-out="link" href="https://donpyo.com/loan/" target="_top" rel="noopener">상환표 보기 →</a></div>
</form>`;
  write('/embed/salary/', shell({ url: '/embed/salary/', title: '연봉 실수령액 계산기 위젯 — 돈표', desc: '블로그·카페에 붙이는 연봉 실수령액 계산기 위젯.', body: salary, bare: true, noindex: true, scripts: ['/js/engine.js', '/js/embed.js'] }));
  write('/embed/loan/', shell({ url: '/embed/loan/', title: '대출 월 상환액 계산기 위젯 — 돈표', desc: '블로그·카페에 붙이는 대출 상환액 계산기 위젯.', body: loan, bare: true, noindex: true, scripts: ['/js/engine.js', '/js/embed.js'] }));
  const snip = (kind, h) => `&lt;iframe src="https://donpyo.com/embed/${kind}/" width="100%" height="${h}" style="border:0;max-width:640px" loading="lazy" title="돈표 ${kind === 'salary' ? '연봉 실수령액' : '대출 상환액'} 계산기"&gt;&lt;/iframe&gt;`;
  const body = `
${crumb([['/', '홈'], [null, '위젯']])}
<h1 class="title">블로그·카페에 붙이는 계산기 위젯</h1>
<p class="meta">코드 한 줄을 글에 붙여 넣으면 방문자가 그 자리에서 연봉 실수령액·대출 상환액을 계산합니다 · 무료 · 회원가입 없음</p>
${section('연봉 실수령액 위젯', '연봉과 부양가족을 넣으면 월 실수령·4대보험·세금', `<iframe class="em-preview" src="/embed/salary/" width="100%" height="300" style="border:0" title="연봉 실수령액 계산기 미리보기"></iframe>
<textarea class="copybox" id="em-code-salary" rows="3" readonly onclick="this.select()">${snip('salary', 300)}</textarea><div class="btn-row"><button class="btn btn-share" type="button" data-copy="#em-code-salary">코드 복사</button></div>`)}
${section('대출 월 상환액 위젯', '금액·기간·금리를 넣으면 월 상환액·총 이자', `<iframe class="em-preview" src="/embed/loan/" width="100%" height="300" style="border:0" title="대출 상환액 계산기 미리보기"></iframe>
<textarea class="copybox" id="em-code-loan" rows="3" readonly onclick="this.select()">${snip('loan', 300)}</textarea><div class="btn-row"><button class="btn btn-share" type="button" data-copy="#em-code-loan">코드 복사</button></div>`)}
${section('붙이는 방법', null, `<div class="doc">
<p><b>티스토리·워드프레스·자체 사이트</b> — 글 편집기를 HTML 모드로 바꾸고 원하는 자리에 위 코드를 붙여 넣으면 끝입니다. 폭은 글 영역에 맞춰 늘어나고, 높이가 잘리면 <code>height</code> 값을 키우세요.</p>
<p><b>네이버 블로그·카페, 브런치</b> — iframe을 허용하지 않아 붙일 수 없습니다. 대신 계산 결과 페이지 링크(예: <a href="/salary/4200/">donpyo.com/salary/4200/</a>)를 넣어 주세요.</p>
<p><b>조건</b> — 위젯 안의 '돈표' 표시와 링크는 지우지 말아 주세요. 광고는 위젯 안에 나오지 않습니다. 계산 기준은 <a href="/method/">계산 기준</a> 페이지와 같고, 요율이 바뀌면 위젯도 함께 갱신됩니다.</p>
</div>`)}
<p class="note">위젯은 방문자의 브라우저 안에서만 계산하며 입력값을 서버로 보내지 않습니다. 결과는 참고용입니다.</p>`;
  write('/embed/', shell({ url: '/embed/', title: '블로그에 붙이는 연봉 실수령액·대출 계산기 위젯 — 돈표', desc: '코드 한 줄로 블로그·카페·홈페이지에 연봉 실수령액 계산기와 대출 월 상환액 계산기를 붙이세요. 무료, 회원가입 없음, 요율 자동 갱신.', body }));
}

/* ---------- 증여세 ---------- */
const GIFT_AMOUNTS = [1000, 2000, 3000, 5000, 7000, 10000, 15000, 20000, 30000, 50000, 70000, 100000, 200000, 300000, 500000];
const GIFT_RELS = ['child', 'minor', 'grandchild', 'spouse', 'parent', 'relative', 'other'];
const giftUrl = (rel, m) => m ? `/gift-tax/${rel}/${m}/` : `/gift-tax/${rel}/`;
const REL_TO = { child: '자녀에게', minor: '미성년 자녀에게', grandchild: '손자녀에게', spouse: '배우자에게', parent: '부모에게', relative: '형제·친족에게', other: '타인에게' };
const REL_FROM = { child: '부모가 성년 자녀에게', minor: '부모가 미성년 자녀에게', grandchild: '조부모가 손자녀에게', spouse: '배우자가 배우자에게', parent: '자녀가 부모에게', relative: '형제나 6촌 이내 친족이', other: '가족이 아닌 사람이' };
const REL_RULE = {
  child: '부모·조부모 등 직계존속 전체를 합쳐 10년에 5,000만원까지 공제됩니다. 혼인·출산 시기라면 1억원이 더 붙어 1억 5,000만원까지 세금이 없습니다.',
  minor: '미성년자(만 19세 미만)는 10년에 2,000만원까지 공제됩니다. 성년이 된 뒤 새 10년이 시작되면 5,000만원 공제를 다시 받습니다.',
  grandchild: '조부모가 손자녀에게 바로 주면 공제는 자녀와 같은 5,000만원이지만 산출세액에 30%가 할증됩니다(미성년 손자녀에게 20억원 초과 시 40%). 부모가 먼저 사망한 대습상속 관계면 할증이 없습니다.',
  spouse: '배우자 사이는 10년에 6억원까지 공제됩니다. 혼인신고가 된 법률혼만 해당하며 사실혼은 타인으로 봅니다.',
  parent: '자녀가 부모에게 드리는 돈도 증여이며 10년에 5,000만원까지 공제됩니다. 생활비·병원비를 실제로 그 용도로 쓰면 증여로 보지 않습니다.',
  relative: '형제자매, 6촌 이내 혈족, 4촌 이내 인척(사위·며느리·처남·시누이 등)은 10년에 1,000만원까지 공제됩니다.',
  other: '가족이 아닌 사람에게 받는 돈은 공제가 없어 전액이 과세표준입니다. 다만 사회 통념상 인정되는 축의금·부의금·선물은 비과세입니다.',
};
const led = (title, unit, rows) => `<div class="ledger"><div class="lg-head"><h2>${title}</h2><span>${unit}</span></div>${rows.map((r) => `<div class="lg-row"><div class="lbl"><span>${r[0]}</span>${r[2] ? `<small>${r[2]}</small>` : ''}</div><span class="num">${r[1]}</span></div>`).join('')}</div>`;
const neg = (v) => v ? '−' + num(v) : '0';
const GIFT_NOTE = `<p class="note">상속세 및 증여세법 기준의 추정입니다. 증여재산가액은 시가(아파트는 유사 매매사례가액, 없으면 공시가격 등)로 평가하고, 부담부증여의 채무·감정평가수수료·기납부세액은 반영하지 않았습니다. 금액이 크면 세무사 상담을 권합니다. <a href="/method/">계산 기준 보기</a></p>`;

function giftPage(rel, m) {
  const A = m * 10000, url = giftUrl(rel, m), R = GT.RELATIONS[rel];
  const g = GT.giftTax(A, rel);
  const mg = R.lineal ? GT.giftTax(A, rel, { marriage: true }) : null;
  const title = `${REL_TO[rel]} ${manwon(A)} 증여 — 증여세 ${g.tax ? won(g.tax) : '0원'} (${YEAR}년)`;
  const desc = `${REL_FROM[rel]} ${manwon(A)}을 증여하면 증여재산공제 ${manwon(g.deduction)} 후 과세표준 ${manwon(g.base)}, 세율 ${pct(g.rate, 0)}, 신고세액공제 3%를 반영한 증여세는 ${won(g.tax)}입니다.${mg && mg.tax < g.tax ? ` 혼인·출산 공제 1억원을 받으면 ${won(mg.tax)}.` : ''}`;
  const rows = [['증여액', num(A)], [`증여재산공제`, neg(g.deduction), `${R.label} · 10년 합산 ${manwon(R.deduction)} 한도`], ['과세표준', num(g.base)], [`산출세액`, num(g.calc), g.rate ? `${pct(g.rate, 0)}${g.progressiveDeduct ? ` − 누진공제 ${manwon(g.progressiveDeduct)}` : ''}` : '과세표준 없음']];
  if (R.surcharge) rows.push(['세대생략 할증 30%', '+' + num(g.surcharge)]);
  rows.push(['신고세액공제 3%', neg(g.credit), '기한 내 자진 신고'], ['납부할 증여세', num(g.tax)], ['받는 사람 손에', num(g.net)]);
  const body = `
${crumb([['/gift-tax/', '증여세'], [giftUrl(rel), R.label], [null, manwon(A)]])}
<h1 class="title">${REL_TO[rel]} ${manwon(A)} 증여하면 증여세는</h1>
<p class="meta">${REL_FROM[rel]} 주는 경우 · 10년 안에 다른 증여가 없다고 가정 · 신고세액공제 3% 반영</p>
${lead(g.base === 0 ? `${manwon(A)}은 ${R.label} 공제 ${manwon(GT.freeLimit(rel))} 안에 들어 과세표준이 없고 증여세도 없습니다. 세금이 없어도 신고는 해 두는 편이 나중에 자금 출처를 밝힐 때 편합니다.` : `${g.deduction ? `${manwon(A)} 중 ${manwon(g.deduction)}은 공제되어 과세표준은 ${manwon(g.base)}` : `${manwon(A)}은 공제 없이 전액인 ${manwon(g.base)}이 과세표준`}, 여기에 ${pct(g.rate, 0)} 세율${g.progressiveDeduct ? `(누진공제 ${manwon(g.progressiveDeduct)})` : ''}을 적용한 ${won(g.calc)}${g.surcharge ? `에 세대생략 할증 30%를 더하고` : '에서'} 신고세액공제 3%를 빼면 ${won(g.tax)}입니다. 증여액의 ${pct(g.effective, 1)}입니다.`)}
${hero({ label: '납부할 증여세', value: g.tax, sub: g.tax ? `증여액의 ${pct(g.effective, 1)} · 받는 사람 손에 ${won(g.net)}` : `${R.label} 공제 ${manwon(R.deduction)} 안이라 세금 없음` })}
${led('계산 흐름', '원', rows)}
${mg ? section('혼인·출산 공제를 받으면', '혼인신고 전후 2년 또는 자녀 출생 후 2년 안에 직계존속에게 받는 증여는 1억원을 더 공제 (기본 공제와 합쳐 최대 1억 5,000만원)', tiles([{ label: '공제 합계', value: mg.deduction }, { label: '과세표준', value: mg.base }, { label: '증여세', value: mg.tax }])) : ''}
${section('같은 금액, 다른 관계', `${manwon(A)}을 누구에게 주느냐에 따라`, table(['관계', '공제', '과세표준', '증여세'], GIFT_RELS.map((r) => { const x = GT.giftTax(A, r); return { cls: r === rel ? 'on' : '', cells: [r === rel ? GT.RELATIONS[r].label : `<a href="${giftUrl(r, m)}">${GT.RELATIONS[r].label}</a>`, num(x.deduction), num(x.base), num(x.tax)] }; })))}
${section('금액이 바뀌면', `${R.label} 기준 증여세`, chips(neighbors(GIFT_AMOUNTS, m, 3).map((x) => ({ label: short(x * 10000), value: GT.giftTax(x * 10000, rel).tax, href: giftUrl(rel, x), on: x === m }))))}
${ad()}
${section('세금을 줄이는 방법', null, `<div class="doc">
<p><b>10년마다 공제가 새로 생깁니다.</b> ${R.label} 공제 ${manwon(R.deduction)}은 10년 합산 한도라, 10년 간격으로 나눠 주면 그때마다 공제를 다시 받습니다. ${rel === 'child' || rel === 'minor' ? '자녀가 태어나서 30세가 될 때까지 2,000만 + 2,000만 + 5,000만 + 5,000만 = 1억 4,000만원을 세금 없이 넘길 수 있습니다.' : ''}</p>
<p><b>여러 사람에게서 받으면 공제도 따로.</b> 공제는 받는 사람 기준으로 주는 사람 그룹마다 따로 셉니다. 배우자 6억, 직계존속(부모·조부모 합산) 5,000만, 기타 친족 1,000만원이 각각입니다. 다만 부모와 조부모는 한 묶음이라 부모 5,000만 + 조부모 5,000만이 되지 않습니다.</p>
<p><b>낮은 구간에서 나눠 주기.</b> 1억원까지 10%, 5억원까지 20%로 올라가므로 한 번에 큰돈을 주는 것보다 여러 해에 걸쳐 나누면 낮은 세율 구간을 여러 번 씁니다. 단, 10년 안의 증여는 합산됩니다.</p>
<p><b>신고하면 3%가 깎입니다.</b> 증여일이 속한 달의 말일부터 3개월 안에 홈택스로 신고하면 산출세액의 3%를 빼 줍니다. 신고하지 않으면 무신고 가산세 20%와 납부지연 가산세가 붙습니다.</p>
</div>`)}
${section('신고와 납부', null, `<div class="doc"><p>증여일이 속한 달의 말일부터 <b>3개월 안</b>에 받는 사람이 주소지 세무서(홈택스)에 신고·납부합니다. 세액이 1,000만원을 넘으면 2개월 뒤까지 나눠 낼 수 있고(분납), 2,000만원을 넘으면 5년에 걸친 연부연납을 신청할 수 있습니다. 세금이 0원이어도 신고해 두면 나중에 주택 구입 자금 출처 조사 때 근거가 됩니다.</p></div>`)}
${section('이어서 계산하기', null, list([{ href: '/acquisition-tax/', title: '주택 취득세', sub: '증여받은 돈으로 집을 사면 내는 세금' }, { href: '/deposit/', title: '예금 이자', sub: '증여받은 목돈을 예금에 넣으면' }, { href: '/loan/', title: '대출 상환액', sub: '부족한 만큼 빌리면 매달 얼마' }]))}
${GIFT_NOTE}`;
  write(url, shell({ url, title, desc, body }));
}

function giftRelIndex(rel) {
  const R = GT.RELATIONS[rel], url = giftUrl(rel);
  const rows = GIFT_AMOUNTS.map((m) => { const g = GT.giftTax(m * 10000, rel); return { cells: [`<a href="${giftUrl(rel, m)}">${manwon(m * 10000)}</a>`, num(g.deduction), num(g.base), num(g.tax), g.tax ? pct(g.effective, 1) : '0%'] }; });
  const body = `
${crumb([['/gift-tax/', '증여세'], [null, R.label]])}
<h1 class="title">${REL_TO[rel]} 증여할 때 증여세 — 금액별</h1>
<p class="meta">${REL_FROM[rel]} 주는 경우 · ${GT.freeLimit(rel) ? `공제 ${manwon(GT.freeLimit(rel))} (10년 합산)` : '공제 없음'} · 신고세액공제 3% 반영</p>
${lead(REL_RULE[rel])}
${section('금액별 증여세', '원 · 금액을 누르면 계산 흐름과 절세 방법', table(['증여액', '공제', '과세표준', '증여세', '실효세율'], rows))}
${section('다른 관계', null, chips(GIFT_RELS.filter((r) => r !== rel).map((r) => ({ label: GT.RELATIONS[r].short, value: GT.giftTax(100000000, r).tax, href: giftUrl(r) }))))}
<p class="sub">칩의 숫자는 1억원을 줄 때의 증여세입니다.</p>
${GIFT_NOTE}`;
  write(url, shell({ url, title: `${REL_TO[rel]} 증여세 계산표 — 1,000만원부터 50억원까지 (${YEAR}년)`, desc: `${REL_FROM[rel]} 증여할 때 금액별 증여세. ${GT.freeLimit(rel) ? `공제 ${manwon(GT.freeLimit(rel))}` : '공제 없음'}, 세율 10~50%, 신고세액공제 3%를 반영했습니다.`, body }));
}

function giftIndex() {
  const rows = GIFT_AMOUNTS.map((m) => ({ cells: [`<a href="${giftUrl('child', m)}">${manwon(m * 10000)}</a>`].concat(['child', 'minor', 'spouse', 'relative', 'other'].map((r) => `<a href="${giftUrl(r, m)}">${num(GT.giftTax(m * 10000, r).tax)}</a>`)) }));
  const body = `
${crumb([['/', '홈'], [null, '증여세']])}
<h1 class="title">증여세 계산표 — 자녀·배우자·부모·친족·타인</h1>
<p class="meta">${YEAR}년 상속세 및 증여세법 · 10년 합산 공제와 10~50% 누진세율, 신고세액공제 3% 반영</p>
${lead(`증여세는 받는 사람이 냅니다. 배우자에게는 6억원, 부모가 자녀에게는 5,000만원(미성년 2,000만원), 혼인·출산 때는 1억원을 더해 세금 없이 줄 수 있고, 그 위로는 1억원까지 10%부터 30억원 초과 50%까지 올라갑니다. 자녀에게 1억원을 주면 ${won(GT.giftTax(100000000, 'child').tax)}, 3억원이면 ${won(GT.giftTax(300000000, 'child').tax)}입니다.`)}
${section('금액 × 관계', '증여세(원) · 칸을 누르면 계산 흐름', table(['증여액', '성년 자녀', '미성년 자녀', '배우자', '형제·친족', '타인'], rows))}
${section('관계별로 보기', '10년 동안 세금 없이 줄 수 있는 금액', list(GIFT_RELS.map((r) => ({ href: giftUrl(r), title: GT.RELATIONS[r].label, sub: r === 'grandchild' ? '공제 5,000만원 · 산출세액 30% 할증' : GT.freeLimit(r) ? `공제 ${manwon(GT.freeLimit(r))}${GT.RELATIONS[r].lineal ? ' · 혼인·출산 시 +1억' : ''}` : '공제 없음 · 전액 과세', value: GT.freeLimit(r) }))))}
${ad()}
${section('세율', '과세표준 = 증여액 − 공제', table(['과세표준', '세율', '누진공제'], GT.GIFT_BRACKETS.map(([lim, r, d], i) => ({ cells: [i === 0 ? '1억원 이하' : lim === Infinity ? '30억원 초과' : `${manwon(GT.GIFT_BRACKETS[i - 1][0])} 초과 ${manwon(lim)} 이하`, pct(r, 0), d ? manwon(d) : '—'] }))))}
${section('자주 묻는 것', null, `<div class="doc">
<p><b>부모가 각각 5,000만원씩 주면 1억원이 공제되나요?</b> 아닙니다. 직계존속(부모·조부모·외조부모)은 한 묶음으로 10년에 5,000만원입니다. 반면 배우자 6억, 장인·장모(기타 친족) 1,000만원은 별도입니다.</p>
<p><b>생활비·학비·축의금도 증여인가요?</b> 부양의무가 있는 사람이 실제 생활비·교육비·병원비로 쓴 돈과 사회 통념상의 축의금·선물은 비과세입니다. 다만 생활비 명목으로 받아 저축·투자·집 사는 데 쓰면 증여로 봅니다.</p>
<p><b>전세보증금이나 집 살 돈을 보태 주면?</b> 그것도 증여입니다. 국세청은 주택 취득 자금 출처를 조사하므로 5,000만원을 넘는 부모 지원은 신고하는 편이 안전합니다. 빌린 것으로 하려면 차용증과 이자 지급 기록(연 4.6% 기준)이 있어야 합니다.</p>
<p><b>상속세와 무엇이 다른가요?</b> 상속은 사망 시점에 전체 재산에 매기며 일괄공제 5억원과 배우자공제(최소 5억원)가 있어 대개 10억원까지 세금이 없습니다. 증여는 살아 있을 때 나눠 주는 것이고 사망 전 10년(상속인 외는 5년) 안의 증여는 상속재산에 다시 합산됩니다.</p>
</div>`)}
${GIFT_NOTE}`;
  write('/gift-tax/', shell({ url: '/gift-tax/', title: `증여세 계산표 — 자녀·배우자·부모·친족 금액별 세금 (${YEAR}년)`, desc: '자녀 1억, 배우자 10억처럼 금액과 관계별로 증여세를 미리 계산했습니다. 10년 합산 공제(배우자 6억·자녀 5,000만·혼인 출산 1억), 10~50% 세율, 신고세액공제 3% 반영.', body }));
}

/* ---------- 복비 (중개보수) ---------- */
const BOKBI = [3000, 5000, 7000, 10000, 15000, 20000, 25000, 30000, 40000, 50000, 60000, 70000, 80000, 90000, 100000, 120000, 150000, 200000, 300000];
const bokbiUrl = (m) => `/bokbi/${m}/`;
const BOKBI_NOTE = `<p class="note">공인중개사법 시행규칙 별표 1(2021년 10월 19일 개정)의 주택 상한요율입니다. 실제 요율은 상한 안에서 협의하고, 시·도 조례가 다를 수 있으며, 부가가치세 10%는 일반과세 중개사무소 기준입니다. <a href="/method/">계산 기준 보기</a></p>`;
const brRange = (t, i) => i === 0 ? `${manwon(t[0][0])} 미만` : t[i][0] === Infinity ? `${manwon(t[i - 1][0])} 이상` : `${manwon(t[i - 1][0])} ~ ${manwon(t[i][0])} 미만`;
const brTable = (t) => table(['거래금액', '상한요율', '한도'], t.map((row, i) => ({ cells: [brRange(t, i), pct(row[1], 1), row[2] ? won(row[2]) : '—'] })));

function bokbiPage(m) {
  const P = m * 10000, url = bokbiUrl(m);
  const s = RE.brokerage(P, 'sale'), r = RE.brokerage(P, 'rent');
  const of = Math.floor(P * RE.OFFICETEL.sale), ofv = of + Math.floor(of * RE.VAT);
  const title = `${manwon(P)} 복비 — 매매 ${won(s.fee)} · 전세 ${won(r.fee)} (상한요율 ${pct(s.rate, 1)} · ${pct(r.rate, 1)})`;
  const desc = `${manwon(P)} 아파트·주택 매매 중개보수는 상한요율 ${pct(s.rate, 1)}${s.cap ? `(한도 ${won(s.cap)})` : ''}로 최대 ${won(s.fee)}, 부가세 포함 ${won(s.total)}입니다. 같은 금액 전세는 ${pct(r.rate, 1)}로 ${won(r.fee)}. 월세 환산과 오피스텔 요율까지.`;
  const rentRows = [300000, 500000, 700000, 1000000, 1500000].map((mo) => { const base = RE.rentBase(P, mo), x = RE.brokerage(base, 'rent'); return { cells: [`보증금 ${short(P)} · 월세 ${manwon(mo)}`, num(base), pct(x.rate, 1), num(x.fee), num(x.total)] }; });
  const body = `
${crumb([['/bokbi/', '복비'], [null, manwon(P)]])}
<h1 class="title">${manwon(P)} 부동산 복비 — 매매·전세·월세</h1>
<p class="meta">주택 중개보수 상한요율(${YEAR}년) · 매도인과 매수인이 각각 · 부가세 10% 별도</p>
${lead(`${manwon(P)}짜리 집을 사고팔 때 중개보수는 상한요율 ${pct(s.rate, 1)}를 적용해 최대 ${won(s.fee)}${s.cap && s.fee === s.cap ? ` (요율로는 ${won(Math.floor(P * s.rate))}이지만 한도 ${won(s.cap)})` : ''}이고, 부가세를 더하면 ${won(s.total)}입니다. 같은 금액을 전세로 계약하면 ${pct(r.rate, 1)}로 ${won(r.fee)}. 이 숫자는 '상한'이라 그 아래로 협의할 수 있습니다.`)}
${hero({ label: '매매 중개보수 (상한)', value: s.fee, sub: `요율 ${pct(s.rate, 1)}${s.cap ? ` · 한도 ${won(s.cap)}` : ''} · 부가세 포함 ${won(s.total)} · 사는 쪽과 파는 쪽 각각` })}
${tiles([{ label: '매매 (부가세 포함)', value: s.total }, { label: '전세 (부가세 포함)', value: r.total }, { label: '오피스텔 매매 0.5% (부가세 포함)', value: ofv }])}
${section('매매', `${manwon(P)} 기준`, table(['구분', '상한요율', '복비', '부가세 포함'], [
  { cls: 'on', cells: ['아파트·주택', pct(s.rate, 1) + (s.cap ? ` (한도 ${won(s.cap)})` : ''), num(s.fee), num(s.total)] },
  { cells: ['주거용 오피스텔 (85㎡ 이하)', pct(RE.OFFICETEL.sale, 1), num(of), num(ofv)] },
  { cells: ['상가·토지·그 외', `${pct(RE.OTHER_RATE, 1)} 이내 협의`, num(Math.floor(P * RE.OTHER_RATE)), num(Math.floor(P * RE.OTHER_RATE) + Math.floor(Math.floor(P * RE.OTHER_RATE) * RE.VAT))] },
]))}
${section('전세', `보증금 ${manwon(P)}`, tiles([{ label: `상한요율 ${pct(r.rate, 1)}`, value: r.fee }, { label: '부가세 포함', value: r.total }, { label: '오피스텔 0.4%', value: Math.floor(P * RE.OFFICETEL.rent) }]))}
${section('월세라면', `보증금 ${manwon(P)}에 월세가 붙을 때 — 거래금액 = 보증금 + 월세 × 100 (5,000만원 미만이면 × 70)`, table(['조건', '거래금액', '요율', '복비', '부가세 포함'], rentRows))}
${section('금액이 바뀌면', '매매 복비 상한', chips(neighbors(BOKBI, m, 3).map((x) => ({ label: short(x * 10000), value: RE.brokerage(x * 10000).fee, href: bokbiUrl(x), on: x === m }))))}
${ad()}
${section('알아두면 좋은 것', null, `<div class="doc">
<p><b>요율은 상한입니다.</b> 법이 정한 건 "이 이상 받을 수 없다"는 선이고, 그 안에서 중개사와 협의합니다. 계약서를 쓰기 전에 요율을 먼저 정하고, 중개대상물 확인·설명서에 적힌 보수를 확인하세요.</p>
<p><b>부가세는 별도.</b> 일반과세 사업자인 중개사무소는 복비의 10%를 부가세로 받을 수 있습니다. 간이과세자는 세금계산서를 끊을 수 없고 부가세를 따로 청구하지 못하니, 부가세를 요구받으면 사업자 유형을 확인하세요. 현금영수증은 10만원 이상이면 의무 발급입니다.</p>
<p><b>지급 시점은 잔금일.</b> 중개보수는 거래가 완성된 때(보통 잔금·입주일)에 지급합니다. 계약금만 낸 상태에서 계약이 깨지면 중개사 책임이 없는 한 보수 청구권은 남지만, 실무에서는 협의로 정리하는 경우가 많습니다.</p>
<p><b>갱신 계약은 복비가 없습니다.</b> 같은 집주인과 같은 집을 계약갱신하면 중개사가 관여하지 않는 한 복비를 낼 이유가 없습니다. 중개사가 서류만 봐 주는 경우 소액을 협의합니다.</p>
</div>`)}
${section('이어서 계산하기', null, list([{ href: acqUrl(nearest(ACQ, m)), title: `${manwon(nearest(ACQ, m) * 10000)} 취득세`, sub: '집을 살 때 같이 드는 세금' }, { href: jeonseUrl(nearest(JEONSE, m)), title: `전세 ${manwon(nearest(JEONSE, m) * 10000)} 대출 이자`, sub: '전세대출 이자 vs 월세' }, { href: '/loan/', title: '대출 상환액 사전', sub: '매매 자금 대출의 월 상환액' }]))}
${BOKBI_NOTE}`;
  write(url, shell({ url, title, desc, body, nav: 'loan' }));
}

function bokbiIndex() {
  const rows = BOKBI.map((m) => { const P = m * 10000, s = RE.brokerage(P), r = RE.brokerage(P, 'rent'); return { cells: [`<a href="${bokbiUrl(m)}">${manwon(P)}</a>`, pct(s.rate, 1), num(s.fee), pct(r.rate, 1), num(r.fee)] }; });
  const body = `
${crumb([['/', '홈'], [null, '복비']])}
<h1 class="title">부동산 복비 계산표 — 매매·전세·월세 중개보수</h1>
<p class="meta">${YEAR}년 주택 중개보수 상한요율 · 부가세 별도 · 금액을 누르면 월세 환산과 오피스텔 요율까지</p>
${lead(`복비(중개보수)는 거래금액에 상한요율을 곱한 금액 안에서 협의합니다. 5억원 매매는 0.4%로 최대 ${won(RE.brokerage(500000000).fee)}, 2억원 전세는 0.3%로 ${won(RE.brokerage(200000000, 'rent').fee)}입니다. 9억원부터는 매매 요율이 0.5%, 12억원부터 0.6%, 15억원부터 0.7%로 올라갑니다.`)}
${section('금액별 복비 상한', '원 · 매도인·매수인(임대인·임차인) 각각', table(['거래금액', '매매 요율', '매매 복비', '전세 요율', '전세 복비'], rows))}
${ad()}
${section('매매·교환 요율표', '주택 (아파트·빌라·단독)', brTable(RE.BROKER_SALE))}
${section('임대차 요율표', '전세·월세 — 월세는 보증금 + 월세 × 100 (5,000만원 미만이면 × 70)', brTable(RE.BROKER_RENT))}
${section('오피스텔과 그 밖의 부동산', null, table(['대상', '매매', '임대차'], [{ cells: ['주거용 오피스텔 (85㎡ 이하, 부엌·화장실 구비)', pct(RE.OFFICETEL.sale, 1), pct(RE.OFFICETEL.rent, 1)] }, { cells: ['상가·사무실·토지·그 외', `${pct(RE.OTHER_RATE, 1)} 이내 협의`, `${pct(RE.OTHER_RATE, 1)} 이내 협의`] }]))}
${section('자주 묻는 것', null, `<div class="doc">
<p><b>반값 복비, 무료 복비는 어떻게 가능한가요?</b> 법정 요율이 상한이기 때문입니다. 온라인 중개 플랫폼이나 직거래 보조 서비스는 낮은 요율을 내세우고, 동네 중개사도 협의하면 깎아 주는 경우가 많습니다.</p>
<p><b>월세 복비는 왜 이렇게 계산하나요?</b> 월세는 보증금이 작아 요율만 곱하면 복비가 너무 적어지므로, 월세 × 100을 보증금에 더해 전세처럼 환산합니다. 그 값이 5,000만원 미만이면 × 70으로 다시 계산해 소액 임대차를 배려합니다.</p>
<p><b>복비도 세금 공제가 되나요?</b> 주택 매매 복비는 나중에 양도소득세 계산 때 필요경비로 인정됩니다. 영수증(현금영수증·계좌이체 기록)을 보관하세요.</p>
</div>`)}
${BOKBI_NOTE}`;
  write('/bokbi/', shell({ url: '/bokbi/', title: `부동산 복비 계산표 — 매매·전세·월세 중개보수 상한 (${YEAR}년)`, desc: '3,000만원부터 30억원까지 주택 매매·전세 중개보수(복비) 상한을 요율표와 함께 계산했습니다. 월세 환산, 오피스텔, 부가세, 협의 요령까지.', body, nav: 'loan' }));
}

/* ---------- 주택 취득세 ---------- */
const ACQ = [10000, 20000, 30000, 40000, 50000, 60000, 65000, 70000, 75000, 80000, 85000, 90000, 100000, 120000, 150000, 200000, 300000];
const acqUrl = (m) => `/acquisition-tax/${m}/`;
const rateTxt = (r) => (r * 100).toFixed(4).replace(/\.?0+$/, '') + '%';
const ACQ_NOTE = `<p class="note">지방세법 제11조·제13조의2 기준 주택 유상취득 세율입니다. 다주택 중과세율(8%·12%)은 2020년 8월 12일 이후 기준이며 완화 개정이 확정되면 갱신합니다. 조정대상지역 지정 여부는 국토교통부 고시를, 일시적 2주택(3년 안 종전 주택 처분) 등 예외는 시·군·구 세무과에 확인하세요. 국민주택채권 매입·법무사·등기 수수료는 별도입니다. <a href="/method/">계산 기준 보기</a></p>`;

function acqPage(m) {
  const P = m * 10000, url = acqUrl(m);
  const a = RE.acquisitionTax(P), aL = RE.acquisitionTax(P, { large: true }), aF = RE.acquisitionTax(P, { firstHome: true });
  const a2 = RE.acquisitionTax(P, { homes: 2, regulated: true }), a2L = RE.acquisitionTax(P, { homes: 2, regulated: true, large: true });
  const a3 = RE.acquisitionTax(P, { homes: 3, regulated: true }), a3L = RE.acquisitionTax(P, { homes: 3, regulated: true, large: true });
  const a3n = RE.acquisitionTax(P, { homes: 3 });
  const title = `${manwon(P)} 주택 취득세 — ${won(a.total)} (1주택 ${rateTxt(a.rate)} + 교육세, ${YEAR}년)`;
  const desc = `${manwon(P)} 아파트를 1주택으로 사면 취득세 ${rateTxt(a.rate)} ${won(a.tax)}에 지방교육세 ${won(a.educ)}을 더해 ${won(a.total)}입니다. 85㎡ 초과면 농어촌특별세 0.2%가 붙어 ${won(aL.total)}.${aF.cut ? ` 생애최초 감면을 받으면 ${won(aF.total)}.` : ''}`;
  const body = `
${crumb([['/acquisition-tax/', '취득세'], [null, manwon(P)]])}
<h1 class="title">${manwon(P)} 주택 취득세</h1>
<p class="meta">유상 취득(매매) · 1주택 · ${YEAR}년 지방세법 · 취득일부터 60일 안에 신고·납부</p>
${lead(`${manwon(P)}짜리 집을 사면 취득세율은 ${rateTxt(a.rate)}${a.rate > 0.01 && a.rate < 0.03 ? '(6억 초과 9억 이하 사잇값)' : ''}이고 취득세는 ${won(a.tax)}, 여기에 지방교육세 ${rateTxt(a.educRate)} ${won(a.educ)}을 더해 ${won(a.total)}입니다. 전용면적 85㎡를 넘으면 농어촌특별세 0.2% ${won(aL.rural)}이 더 붙어 ${won(aL.total)}이 되고, ${aF.cut ? `생애최초로 집을 사는 사람은 취득세에서 최대 200만원을 빼 ${won(aF.total)}만 냅니다.` : '취득가액이 12억원을 넘어 생애최초 감면은 받지 못합니다.'}`)}
${hero({ label: '취득세 합계 (1주택 · 85㎡ 이하)', value: a.total, sub: `취득세 ${rateTxt(a.rate)} + 지방교육세 ${rateTxt(a.educRate)} = ${rateTxt(a.totalRate)} · 85㎡ 초과 ${won(aL.total)}` })}
${led('계산 흐름', '원', [['취득가액', num(P)], [`취득세 ${rateTxt(a.rate)}`, num(a.tax), a.rate > 0.01 && a.rate < 0.03 ? `(${short(P)} × 2/3억 − 3)%` : ''], [`지방교육세 ${rateTxt(a.educRate)}`, '+' + num(a.educ), '취득세율의 1/10'], ['농어촌특별세 (85㎡ 이하)', '0', '85㎡ 초과면 0.2% = ' + won(aL.rural)], ['합계', num(a.total)]].concat(aF.cut ? [['생애최초 감면 시', num(aF.total), `취득세 −${won(aF.cut)} (12억원 이하)`]] : []))}
${section('주택 수·지역·면적별', `${manwon(P)} 기준 · 세율은 취득세 + 지방교육세 + 농어촌특별세 합계`, table(['조건', '85㎡ 이하', '85㎡ 초과'], [
  { cls: 'on', cells: ['1주택 · 비조정 2주택', `${rateTxt(a.totalRate)} · ${num(a.total)}`, `${rateTxt(aL.totalRate)} · ${num(aL.total)}`] },
  { cells: ['조정대상지역 2주택 · 비조정 3주택 (8%)', `${rateTxt(a2.totalRate)} · ${num(a2.total)}`, `${rateTxt(a2L.totalRate)} · ${num(a2L.total)}`] },
  { cells: ['조정대상지역 3주택 이상 · 비조정 4주택 이상 (12%)', `${rateTxt(a3.totalRate)} · ${num(a3.total)}`, `${rateTxt(a3L.totalRate)} · ${num(a3L.total)}`] },
]))}
${section('금액이 바뀌면', '1주택 · 85㎡ 이하 합계', chips(neighbors(ACQ, m, 3).map((x) => ({ label: short(x * 10000), value: RE.acquisitionTax(x * 10000).total, href: acqUrl(x), on: x === m }))))}
${ad()}
${section('알아두면 좋은 것', null, `<div class="doc">
<p><b>6억~9억 구간은 세율이 미끄러집니다.</b> 6억원까지 1%, 9억원 초과 3%인데 그 사이는 (취득가액 × 2/3억 − 3)%로 6억 1%에서 9억 3%까지 연속으로 올라갑니다. 7억이면 1.6667%, 7.5억이면 2%, 8억이면 2.3333%입니다. 6억 바로 아래와 바로 위의 세금 차이가 크지 않으니 가격 흥정 때 참고하세요.</p>
<p><b>생애최초 감면.</b> 본인과 배우자가 집을 가진 적이 없고 취득가액이 12억원 이하면 취득세에서 200만원까지 빼 줍니다(소득 요건 없음). 취득 후 3개월 안에 전입하고 3년 이상 살아야 하며, 감면 신청은 취득세 신고 때 합니다.</p>
<p><b>일시적 2주택.</b> 이사 때문에 잠깐 2주택이 되는 경우 종전 주택을 3년 안에 팔면 1주택 세율로 냅니다. 처분 기한을 넘기면 중과세율과의 차액에 가산세가 붙습니다.</p>
<p><b>증여·상속 취득은 다릅니다.</b> 무상 취득은 3.5%(증여, 조정대상지역 3억원 이상 다주택자 12%), 상속 2.8%가 기준이고 취득가액은 시가인정액입니다.</p>
</div>`)}
${section('이어서 계산하기', null, list([{ href: bokbiUrl(nearest(BOKBI, m)), title: `${manwon(nearest(BOKBI, m) * 10000)} 복비`, sub: '집 살 때 같이 드는 중개보수' }, { href: '/gift-tax/child/', title: '부모 지원금 증여세', sub: '집 살 돈을 보태 받을 때' }, { href: '/loan/', title: '대출 상환액 사전', sub: '주택담보대출 월 상환액' }, { href: '/dsr/', title: '연봉별 대출 한도', sub: 'DSR 40%로 얼마까지' }]))}
${ACQ_NOTE}`;
  write(url, shell({ url, title, desc, body, nav: 'loan' }));
}

function acqIndex() {
  const rows = ACQ.map((m) => { const P = m * 10000, a = RE.acquisitionTax(P), aL = RE.acquisitionTax(P, { large: true }), a2 = RE.acquisitionTax(P, { homes: 2, regulated: true }), a3 = RE.acquisitionTax(P, { homes: 3, regulated: true }); return { cells: [`<a href="${acqUrl(m)}">${manwon(P)}</a>`, rateTxt(a.rate), num(a.total), num(aL.total), num(a2.total), num(a3.total)] }; });
  const body = `
${crumb([['/', '홈'], [null, '취득세']])}
<h1 class="title">주택 취득세 계산표 — 1주택·다주택·생애최초</h1>
<p class="meta">${YEAR}년 지방세법 · 취득세 + 지방교육세 + 농어촌특별세 합계 · 금액을 누르면 면적·주택 수별 표</p>
${lead(`집을 사면 취득일부터 60일 안에 취득세를 냅니다. 1주택은 6억원까지 1%, 9억원 초과 3%, 그 사이는 사잇값이고 지방교육세가 세율의 10분의 1만큼 더 붙습니다. 5억원이면 ${won(RE.acquisitionTax(500000000).total)}, 10억원이면 ${won(RE.acquisitionTax(1000000000).total)}. 조정대상지역 2주택은 8%, 3주택 이상은 12%로 뜁니다.`)}
${section('금액별 취득세 합계', '원 · 취득세 + 지방교육세 (+ 85㎡ 초과 농특세)', table(['취득가액', '1주택 세율', '1주택 85㎡ 이하', '1주택 85㎡ 초과', '조정 2주택 (8%)', '조정 3주택 이상 (12%)'], rows))}
${ad()}
${section('세율표', '주택 유상취득', table(['조건', '취득세', '지방교육세', '농특세 (85㎡ 초과)'], [
  { cells: ['1주택 · 비조정 2주택 · 6억 이하', '1%', '0.1%', '0.2%'] },
  { cells: ['1주택 · 6억 초과 9억 이하', '1~3% 사잇값', '세율의 1/10', '0.2%'] },
  { cells: ['1주택 · 9억 초과', '3%', '0.3%', '0.2%'] },
  { cells: ['조정대상지역 2주택 · 비조정 3주택', '8%', '0.4%', '0.6%'] },
  { cells: ['조정대상지역 3주택 이상 · 비조정 4주택 이상', '12%', '0.4%', '1.0%'] },
  { cells: ['생애최초 (12억 이하)', '위 세율에서 최대 200만원 감면', '', ''] },
]))}
${section('자주 묻는 것', null, `<div class="doc">
<p><b>취득세는 언제 내나요?</b> 잔금일(취득일)부터 60일 안에 시·군·구청 세무과나 위택스로 신고·납부합니다. 보통 등기 법무사가 대행하며, 등기 접수 전에 납부 영수증이 필요합니다.</p>
<p><b>분양 아파트는요?</b> 분양가에 옵션(발코니 확장 등)을 더한 금액이 취득가액이고, 잔금을 치르고 입주하는 시점이 취득일입니다. 세율은 같습니다.</p>
<p><b>취득세 말고 또 뭐가 드나요?</b> 국민주택채권 매입(즉시 할인 매도 시 약 1~2% 손실), 법무사 보수, 등기신청수수료, 인지세(1억 초과 15만원 등), 그리고 <a href="/bokbi/">복비</a>가 있습니다.</p>
</div>`)}
${ACQ_NOTE}`;
  write('/acquisition-tax/', shell({ url: '/acquisition-tax/', title: `주택 취득세 계산표 — 1주택·다주택·생애최초 감면 금액별 (${YEAR}년)`, desc: '1억원부터 30억원까지 아파트·주택 취득세를 1주택 사잇값 세율, 85㎡ 초과 농특세, 조정대상지역 2주택 8%·3주택 12%, 생애최초 200만원 감면까지 계산했습니다.', body, nav: 'loan' }));
}

/* ---------- 예금 이자 ---------- */
const DEP_P = [100, 300, 500, 1000, 2000, 3000, 5000, 10000, 20000, 30000, 50000];
const DEP_N = [6, 12, 24, 36];
const DEP_R = [0.02, 0.025, 0.03, 0.035, 0.04, 0.045, 0.05];
const depUrl = (p, n) => `/deposit/${p}/${n}/`;
const nmText = (n) => n % 12 === 0 ? `${n / 12}년` : `${n}개월`;
const DEP_NOTE = `<p class="note">이자소득세 ${pct(INTEREST_TAX)}(소득세 14% + 지방소득세 1.4%)를 뺀 값입니다. 만 65세 이상 등의 비과세종합저축(5,000만원), ISA 계좌는 세금이 없거나 줄고, 연간 금융소득이 2,000만원을 넘으면 종합과세됩니다. 우대금리 조건·중도해지 이율은 반영하지 않았습니다. <a href="/method/">계산 기준 보기</a></p>`;

function depositPage(pm, nm) {
  const P = pm * 10000, url = depUrl(pm, nm);
  const d = DP.deposit(P, nm, 0.03), dc = DP.deposit(P, nm, 0.03, { compound: true });
  const title = `${manwon(P)} ${nmText(nm)} 예금 이자 — 세후 ${won(d.net)} (연 3%) · 매달 받으면 ${won(d.monthlyNet)}`;
  const desc = `${manwon(P)}을 ${nmText(nm)} 정기예금(연 3%, 단리)에 넣으면 세전 이자 ${won(d.interest)}, 이자소득세 15.4%를 뺀 세후 ${won(d.net)}, 만기에 ${won(d.total)}을 받습니다. 월 이자 지급식이면 매달 ${won(d.monthlyNet)}. 금리별·복리·적금 비교표.`;
  const rows = DEP_R.map((r) => { const x = DP.deposit(P, nm, r); return { cls: r === 0.03 ? 'on' : '', cells: [fmtRate(r), num(x.interest), num(x.tax), num(x.net), num(x.total), num(x.monthlyNet)] }; });
  const real = Math.round(d.total / Math.pow(1.02, nm / 12) - P);
  const monthly = Math.round(P / nm), sv = savings(monthly, nm, 0.03);
  const svM = nearest(SAV_M, Math.round(monthly / 10000)), svN = nearest(SAV_N, nm);
  const body = `
${crumb([['/deposit/', '예금'], [null, `${manwon(P)} · ${nmText(nm)}`]])}
<h1 class="title">${manwon(P)} · ${nmText(nm)} 예금 이자</h1>
<p class="meta">정기예금 단리 · 만기 일시 지급 · 이자소득세 ${pct(INTEREST_TAX)}</p>
${lead(`${manwon(P)}을 연 3% 정기예금에 ${nmText(nm)} 넣어 두면 세전 이자 ${won(d.interest)}에서 세금 ${won(d.tax)}을 뺀 ${won(d.net)}이 붙어 만기에 ${won(d.total)}을 받습니다. 이자를 매달 받는 상품이면 한 달에 세후 ${won(d.monthlyNet)}입니다. 물가가 연 2% 오른다고 보면 실제로 불어난 가치는 ${won(real)} 정도입니다.`)}
${hero({ label: '세후 이자 (연 3%)', value: d.net, sub: `세전 ${won(d.interest)} − 세금 ${won(d.tax)} · 만기 수령 ${won(d.total)}`, bars: [P / d.total, d.net / d.total], legendL: `원금 ${pct(P / d.total)}`, legendR: `이자 ${pct(d.net / d.total)}` })}
${section('금리별', `${manwon(P)} × ${nm}개월`, table(['금리', '세전 이자', '세금', '세후 이자', '만기 수령', '월 지급식 (세후/월)'], rows))}
${section('매달 이자를 받으면', '월 이자 지급식 — 원금 × 연이율 ÷ 12에서 세금을 뺀 금액', tiles([{ label: '연 3%', value: DP.deposit(P, nm, 0.03).monthlyNet }, { label: '연 4%', value: DP.deposit(P, nm, 0.04).monthlyNet }, { label: '연 5%', value: DP.deposit(P, nm, 0.05).monthlyNet }]))}
${section('단리와 월복리', '연 3% 세후 이자 — 이자를 매달 원금에 더해 굴리는 상품이면', tiles([{ label: '단리', value: d.net }, { label: '월복리', value: dc.net }, { label: '차이', value: dc.net - d.net }]))}
${ad()}
${section('같은 돈을 적금으로 나눠 넣으면', `매달 ${won(monthly)}씩 ${nm}개월 적금(연 3%)과 비교 — 목돈이 있다면 예금이, 없다면 적금이 답`, tiles([{ label: '예금 세후 이자', value: d.net }, { label: '적금 세후 이자', value: sv.net }, { label: '차이', value: d.net - sv.net }]) + list([{ href: savUrl(svM, svN), title: `월 ${manwon(svM * 10000)} ${svN / 12}년 적금`, sub: '적금 계산표에서 금리별로 보기' }]))}
${section('금액·기간이 바뀌면', '연 3% 세후 이자', cells(DEP_N.map((x) => ({ label: nmText(x), value: DP.deposit(P, x, 0.03).net, href: depUrl(pm, x), on: x === nm })), 4) + chips(DEP_P.map((x) => ({ label: short(x * 10000), value: DP.deposit(x * 10000, nm, 0.03).net, href: depUrl(x, nm), on: x === pm }))))}
${section('알아두면 좋은 것', null, `<div class="doc">
<p><b>예금자보호는 1억원.</b> 2025년 9월 1일부터 금융회사 한 곳당 원금과 이자를 합쳐 1억원까지 보호됩니다. 그보다 크면 은행을 나누세요.</p>
<p><b>중도해지하면 이자가 거의 없습니다.</b> 만기 전에 깨면 약정금리 대신 연 0.1~1% 수준의 중도해지 이율이 적용됩니다. 급전이 필요할 수 있으면 예금담보대출(예금금리 + 1%p 안팎)이 낫습니다.</p>
<p><b>세금을 줄이려면.</b> ISA 계좌 안의 예금은 200만원(서민형 400만원)까지 비과세, 초과분 9.9% 분리과세입니다. 만 65세 이상·장애인 등은 비과세종합저축 5,000만원까지 세금이 없습니다.</p>
</div>`)}
${DEP_NOTE}`;
  write(url, shell({ url, title, desc, body, nav: 'loan' }));
}

function depositIndex() {
  const rows = DEP_P.map((pm) => ({ cells: [manwon(pm * 10000)].concat(DEP_N.map((nm) => `<a href="${depUrl(pm, nm)}">${num(DP.deposit(pm * 10000, nm, 0.03).net)}</a>`)) }));
  const body = `
${crumb([['/', '홈'], [null, '예금']])}
<h1 class="title">예금 이자 계산표</h1>
<p class="meta">원금 × 기간별 세후 이자(연 3% 단리) · 칸을 누르면 금리별·월 이자 지급식·복리·적금 비교</p>
${lead(`정기예금은 목돈을 한 번에 맡기고 만기에 이자를 받습니다. 1억원을 1년 넣으면 연 3%에서 세후 ${won(DP.deposit(100000000, 12, 0.03).net)}, 매달 이자를 받는 상품이면 한 달 ${won(DP.deposit(100000000, 12, 0.03).monthlyNet)}입니다. 같은 금리라면 예금 이자가 적금의 두 배 가까이 되지만, 목돈이 없다면 적금으로 모으는 수밖에 없습니다.`)}
${section('원금 × 기간', '세후 이자(원) · 연 3%', table(['원금'].concat(DEP_N.map(nmText)), rows))}
${ad()}
${section('자주 묻는 것', null, `<div class="doc">
<p><b>세후 이자는 왜 84.6%인가요?</b> 이자에 소득세 14%와 지방소득세 1.4%, 합쳐 15.4%가 원천징수됩니다. 세전 100만원이면 84만 6,000원을 받습니다.</p>
<p><b>파킹통장과 뭐가 다른가요?</b> 파킹통장은 매일 이자를 계산해 언제든 뺄 수 있지만 금리가 낮고 변동됩니다. 정기예금은 만기까지 묶는 대신 금리가 확정됩니다. 3~6개월 안에 쓸 돈은 파킹통장, 그 이상은 예금이 보통 유리합니다.</p>
<p><b>금리 0.5%p 차이가 얼마나 되나요?</b> 1억원 1년이면 세후 약 42만원입니다. 우대금리 조건(급여 이체·카드 사용 등)이 번거로운 만큼 값어치가 있는지 이 표로 확인하세요.</p>
</div>`)}
${section('이어서 계산하기', null, list([{ href: '/savings/', title: '적금 이자표', sub: '매달 나눠 넣을 때' }, { href: '/goal/', title: '1억 모으기 시계', sub: '저축액·금리별 도달 기간' }, { href: '/gift-tax/', title: '증여세', sub: '목돈을 가족에게 줄 때' }]))}
${DEP_NOTE}`;
  write('/deposit/', shell({ url: '/deposit/', title: `예금 이자 계산표 — 원금·기간·금리별 세후 이자와 월 이자 (${YEAR}년)`, desc: '100만원부터 5억원까지, 6개월부터 3년까지 정기예금 세후 이자와 만기 수령액, 월 이자 지급식, 복리, 적금과의 비교를 계산했습니다.', body, nav: 'loan' }));
}

/* ---------- 상속세 ---------- */
const INH_AMOUNTS = [30000, 50000, 70000, 100000, 120000, 150000, 200000, 250000, 300000, 400000, 500000, 700000, 1000000];
const INH_CASES = ['spouse1', 'spouse2', 'spouse3', 'child1', 'child2'];
const inhUrl = (c, m) => m ? `/inheritance-tax/${c}/${m}/` : `/inheritance-tax/${c}/`;
const INH_NOTE = `<p class="note">상속세 및 증여세법 기준의 추정입니다. 자녀는 성년, 배우자는 법정상속분만큼 실제 상속받는다고 가정했고 사전증여(10년)·채무·장례비·동거주택상속공제·세대생략 할증은 반영하지 않았습니다. 상속재산은 시가(아파트는 유사 매매사례가액)로 평가합니다. 금액이 크면 세무사 상담을 권합니다. <a href="/method/">계산 기준 보기</a></p>`;

function inhPage(c, m) {
  const E = m * 10000, C = IH.CASES[c], url = inhUrl(c, m);
  const r = IH.inheritTax(E, C);
  const f = IH.inheritTax(E, { ...C, financial: Math.round(E * 0.3) });
  const title = `상속재산 ${manwon(E)} 상속세 — ${C.label} ${r.tax ? won(r.tax) : '0원'} (${YEAR}년)`;
  const desc = `${C.label}이 ${manwon(E)}을 상속받으면 ${r.lumpType === 'lump' ? '일괄공제 5억원' : `기초·자녀공제 ${manwon(r.lump)}`}${C.spouse ? `과 배우자상속공제 ${manwon(r.spouseDed)}` : ''}을 뺀 과세표준 ${manwon(r.base)}에 ${r.rate ? pct(r.rate, 0) : '—'} 세율, 신고세액공제 3%를 반영한 상속세는 ${won(r.tax)}입니다. 가족 구성별·금액별 표와 절세 방법.`;
  const rows = [['상속재산 (시가)', num(E)], [r.lumpType === 'lump' ? '일괄공제' : '기초공제 + 자녀공제', neg(r.lump), r.lumpType === 'lump' ? `기초 2억 + 자녀 ${C.children}명 × 5천만 = ${manwon(r.personal)}보다 큰 5억` : `자녀 ${C.children}명이라 일괄공제 5억보다 큼`]];
  if (C.spouse) rows.push(['배우자상속공제', neg(r.spouseDed), `법정상속분 ${pct(r.share, 1)} · 최소 5억 · 최대 30억`]);
  rows.push(['과세표준', num(r.base)], ['산출세액', num(r.calc), r.rate ? `${pct(r.rate, 0)}${r.progressiveDeduct ? ` − 누진공제 ${manwon(r.progressiveDeduct)}` : ''}` : '과세표준 없음'], ['신고세액공제 3%', neg(r.credit), '6개월 안 자진 신고'], ['납부할 상속세', num(r.tax)], ['상속인들 손에', num(r.net)]);
  const body = `
${crumb([['/inheritance-tax/', '상속세'], [inhUrl(c), C.label], [null, manwon(E)]])}
<h1 class="title">상속재산 ${manwon(E)} · ${C.label} — 상속세는</h1>
<p class="meta">${C.spouse ? '배우자가 법정상속분만큼 받고' : '배우자 없이'} 자녀 ${C.children}명이 상속 · 사전증여·채무 없음 가정 · 신고세액공제 3% 반영</p>
${lead(r.base === 0 ? `${manwon(E)}은 ${r.lumpType === 'lump' ? '일괄공제 5억원' : `기초·자녀공제 ${manwon(r.lump)}`}${C.spouse ? `과 배우자상속공제 ${manwon(r.spouseDed)}` : ''} 안에 들어 과세표준이 없고 상속세도 없습니다. ${C.spouse ? `배우자가 법정상속분보다 적게 받아 배우자공제가 최소 5억원만 인정되더라도 ${manwon(r.lump + IH.SPOUSE_MIN)}까지는 세금이 없습니다.` : '세금이 없어도 6개월 안에 신고해 두면 나중에 부동산을 팔 때 취득가액을 시가로 인정받아 양도세가 줄어듭니다.'}` : `${manwon(E)}에서 ${r.lumpType === 'lump' ? '일괄공제 5억원' : `기초·자녀공제 ${manwon(r.lump)}`}${C.spouse ? `과 배우자상속공제 ${manwon(r.spouseDed)}` : ''}을 빼면 과세표준 ${manwon(r.base)}, 여기에 ${pct(r.rate, 0)} 세율${r.progressiveDeduct ? `(누진공제 ${manwon(r.progressiveDeduct)})` : ''}을 적용한 ${won(r.calc)}에서 신고세액공제 3%를 빼면 ${won(r.tax)}입니다. 상속재산의 ${pct(r.effective, 1)}입니다.`)}
${hero({ label: '납부할 상속세', value: r.tax, sub: r.tax ? `상속재산의 ${pct(r.effective, 1)} · 상속인들 손에 ${won(r.net)}` : `공제 ${manwon(r.deductions)} 안이라 세금 없음` })}
${led('계산 흐름', '원', rows)}
${section('예금·주식이 있으면', '순금융재산이 상속재산의 30%일 때 — 2,000만원 초과분의 20%(최대 2억원)를 더 공제', tiles([{ label: '금융재산상속공제', value: f.fin }, { label: '과세표준', value: f.base }, { label: '상속세', value: f.tax }]))}
${section('같은 재산, 다른 가족 구성', `${manwon(E)}을 누가 상속받느냐에 따라`, table(['가족 구성', '공제 합계', '과세표준', '상속세'], INH_CASES.map((k) => { const x = IH.inheritTax(E, IH.CASES[k]); return { cls: k === c ? 'on' : '', cells: [k === c ? IH.CASES[k].label : `<a href="${inhUrl(k, m)}">${IH.CASES[k].label}</a>`, num(x.deductions), num(x.base), num(x.tax)] }; })))}
${section('재산이 바뀌면', `${C.label} 기준 상속세`, chips(neighbors(INH_AMOUNTS, m, 3).map((x) => ({ label: short(x * 10000), value: IH.inheritTax(x * 10000, C).tax, href: inhUrl(c, x), on: x === m }))))}
${ad()}
${section('세금을 줄이는 방법', null, `<div class="doc">
<p><b>배우자가 실제로 얼마를 받느냐가 가장 큽니다.</b> 배우자상속공제는 배우자가 실제 상속받은 금액(법정상속분·30억원 한도)만큼 인정되니, 배우자가 법정상속분까지 받으면 공제가 최대가 됩니다. 다만 그 재산은 배우자 사망 때 다시 상속되므로 2차 상속까지 놓고 배분을 정하는 것이 보통입니다. 분할 협의는 신고기한 안에 마쳐야 합니다.</p>
<p><b>10년 전부터 나눠 주기.</b> 사망 전 10년(상속인 외에는 5년) 안의 증여는 상속재산에 다시 합산됩니다. 그보다 앞서 <a href="/gift-tax/">증여</a>하면 증여 공제(자녀 5,000만원·배우자 6억원)를 따로 쓰고 낮은 세율 구간을 여러 번 씁니다.</p>
<p><b>같이 살던 집은 6억원 더.</b> 10년 이상 한집에서 산 무주택 자녀가 그 집을 상속받으면 동거주택상속공제로 집값의 100%(6억원 한도)를 더 공제합니다.</p>
<p><b>신고하면 3%, 못 내면 나눠서.</b> 6개월 안에 신고하면 산출세액의 3%를 깎아 주고, 세액이 2,000만원을 넘으면 10년에 걸친 연부연납(연 이자 있음), 부동산이 많으면 물납도 가능합니다.</p>
</div>`)}
${section('신고와 납부', null, `<div class="doc"><p>사망일이 속한 달의 말일부터 <b>6개월 안</b>(피상속인이 국외 거주면 9개월)에 상속인이 함께 신고·납부합니다. 세액이 1,000만원을 넘으면 2개월 뒤까지 분납, 2,000만원을 넘으면 연부연납을 신청할 수 있습니다. 상속받은 부동산은 별도로 <a href="/acquisition-tax/">취득세</a>(상속 2.8%, 무주택 상속 1주택 0.8%)를 6개월 안에 냅니다.</p></div>`)}
${section('이어서 계산하기', null, list([{ href: '/gift-tax/', title: '증여세', sub: '살아 있을 때 나눠 주면' }, { href: '/acquisition-tax/', title: '주택 취득세', sub: '상속받은 집의 취득세' }, { href: '/deposit/', title: '예금 이자', sub: '상속받은 목돈을 예금에 넣으면' }]))}
${INH_NOTE}`;
  write(url, shell({ url, title, desc, body }));
}

function inhCaseIndex(c) {
  const C = IH.CASES[c], url = inhUrl(c), free = IH.freeEstate(c);
  const rows = INH_AMOUNTS.map((m) => { const r = IH.inheritTax(m * 10000, C); return { cells: [`<a href="${inhUrl(c, m)}">${manwon(m * 10000)}</a>`, num(r.deductions), num(r.base), num(r.tax), r.tax ? pct(r.effective, 1) : '0%'] }; });
  const body = `
${crumb([['/inheritance-tax/', '상속세'], [null, C.label]])}
<h1 class="title">${C.label} — 상속재산별 상속세</h1>
<p class="meta">${C.spouse ? '배우자가 법정상속분만큼 받는다고 가정' : '배우자 없이 자녀만 상속'} · 일괄공제 5억 ${C.spouse ? '+ 배우자상속공제 5억~30억' : ''} · 신고세액공제 3% 반영</p>
${lead(C.spouse ? `${C.label}이면 배우자가 법정상속분(${pct(IH.spouseShare(C.children), 1)})을 받는다고 볼 때 ${manwon(free)}까지 상속세가 없습니다. 배우자가 그보다 적게 받아 배우자공제를 최소 5억원만 인정받는 경우에도 ${manwon(IH.LUMP + IH.SPOUSE_MIN)}까지는 세금이 없고, 그 위로는 10억원마다 세율이 20~30%로 올라갑니다.` : `${C.label}이면 일괄공제 ${manwon(free)}까지 상속세가 없고, 그 위로는 과세표준 1억원까지 10%, 5억원까지 20%, 10억원까지 30%, 30억원까지 40%, 초과 50%입니다. 배우자가 없어 공제가 절반이므로 같은 재산이라도 세금이 배우자가 있을 때의 두 배 이상입니다.`)}
${section('상속재산별', '원 · 금액을 누르면 계산 흐름과 절세 방법', table(['상속재산', '공제 합계', '과세표준', '상속세', '실효세율'], rows))}
${section('다른 가족 구성', '10억원을 상속할 때의 상속세', chips(INH_CASES.filter((k) => k !== c).map((k) => ({ label: IH.CASES[k].label, value: IH.inheritTax(1000000000, IH.CASES[k]).tax, href: inhUrl(k) }))))}
${INH_NOTE}`;
  write(url, shell({ url, title: `${C.label} 상속세 계산표 — 3억원부터 100억원까지 (${YEAR}년)`, desc: `${C.label}이 상속받을 때 재산 금액별 상속세. 일괄공제 5억${C.spouse ? '과 배우자상속공제' : ''}, 10~50% 세율, 신고세액공제 3%를 반영했습니다.`, body }));
}

function inhIndex() {
  const rows = INH_AMOUNTS.map((m) => ({ cells: [`<a href="${inhUrl('spouse1', m)}">${manwon(m * 10000)}</a>`].concat(INH_CASES.map((k) => `<a href="${inhUrl(k, m)}">${num(IH.inheritTax(m * 10000, IH.CASES[k]).tax)}</a>`)) }));
  const body = `
${crumb([['/', '홈'], [null, '상속세']])}
<h1 class="title">상속세 계산표 — 배우자·자녀 구성과 재산 금액별</h1>
<p class="meta">${YEAR}년 상속세 및 증여세법 · 일괄공제 5억 + 배우자상속공제(5억~30억) · 10~50% 누진세율 · 신고세액공제 3%</p>
${lead(`상속세는 재산에서 공제를 뺀 과세표준에 매깁니다. 자녀만 있으면 일괄공제 5억원, 배우자가 있으면 배우자상속공제가 최소 5억원 더 붙어 10억원까지는 세금이 없고, 배우자가 법정상속분대로 받으면 12억 5,000만원(자녀 1명)까지도 없습니다. 자녀만 있을 때 10억원을 물려주면 ${won(IH.inheritTax(1000000000, IH.CASES.child1).tax)}, 20억원이면 ${won(IH.inheritTax(2000000000, IH.CASES.child1).tax)}입니다.`)}
${section('재산 × 가족 구성', '상속세(원) · 칸을 누르면 계산 흐름', table(['상속재산'].concat(INH_CASES.map((k) => IH.CASES[k].label.replace(' (배우자 없음)', '<br><small>배우자 없음</small>'))), rows))}
${section('가족 구성별로 보기', '세금 없이 물려줄 수 있는 재산 (배우자 법정상속분 가정)', list(INH_CASES.map((k) => ({ href: inhUrl(k), title: IH.CASES[k].label, sub: IH.CASES[k].spouse ? '일괄공제 5억 + 배우자공제' : '일괄공제 5억', value: IH.freeEstate(k) }))))}
${ad()}
${section('공제 한눈에', null, table(['공제', '금액', '조건'], [
  { cells: ['일괄공제', '5억원', '기초공제 2억 + 인적공제(자녀 5천만·65세 이상 5천만·미성년 1천만×잔여연수·장애인)보다 크면 선택'] },
  { cells: ['배우자상속공제', '5억~30억원', '배우자가 실제 상속받은 금액, 법정상속분이 한도 · 배우자 단독 상속은 일괄공제 없음'] },
  { cells: ['금융재산상속공제', '최대 2억원', '순금융재산 2천만원 이하 전액, 초과분 20%'] },
  { cells: ['동거주택상속공제', '최대 6억원', '10년 이상 동거한 무주택 자녀가 그 집을 상속'] },
  { cells: ['신고세액공제', '산출세액의 3%', '6개월 안 자진 신고'] },
]))}
${section('세율', '과세표준 = 상속재산 − 공제', table(['과세표준', '세율', '누진공제'], GT.GIFT_BRACKETS.map(([lim, r, d], i) => ({ cells: [i === 0 ? '1억원 이하' : lim === Infinity ? '30억원 초과' : `${manwon(GT.GIFT_BRACKETS[i - 1][0])} 초과 ${manwon(lim)} 이하`, pct(r, 0), d ? manwon(d) : '—'] }))))}
${section('자주 묻는 것', null, `<div class="doc">
<p><b>정말 10억원까지 세금이 없나요?</b> 배우자와 자녀가 있으면 일괄공제 5억 + 배우자공제 최소 5억 = 10억원까지는 어떤 경우에도 없습니다. 자녀만 있으면 5억원까지입니다. 아파트 한 채가 10억원을 넘는 집이 많아진 지금은 미리 계산해 두는 편이 좋습니다.</p>
<p><b>상속재산은 어떻게 평가하나요?</b> 시가가 원칙입니다. 아파트는 사망일 전후 6개월 안의 유사한 매매사례가액, 없으면 공시가격·감정가액이고, 예금은 잔액, 주식은 사망일 전후 2개월 평균 종가입니다. 사망 전 1~2년 안에 인출한 현금이 크면(1년 2억·2년 5억 이상) 사용처를 밝혀야 합니다.</p>
<p><b>증여와 상속, 어느 쪽이 유리한가요?</b> 공제는 상속이 훨씬 크지만(10억 vs 자녀 5천만), 재산이 공제를 크게 넘으면 10년 단위로 미리 증여해 세율 구간을 나누는 쪽이 유리할 수 있습니다. 사망 전 10년 안의 증여는 합산되니 일찍 시작해야 효과가 있습니다.</p>
<p><b>상속받은 집도 취득세를 내나요?</b> 네, 상속 취득세 2.8%(무주택자가 1주택을 상속하면 0.8%)와 지방교육세·농특세를 6개월 안에 냅니다. <a href="/acquisition-tax/">취득세 계산표</a></p>
</div>`)}
${INH_NOTE}`;
  write('/inheritance-tax/', shell({ url: '/inheritance-tax/', title: `상속세 계산표 — 배우자·자녀 구성별 10억·20억·30억 상속세 (${YEAR}년)`, desc: '상속재산 3억원부터 100억원까지, 배우자·자녀 구성별로 상속세를 미리 계산했습니다. 일괄공제 5억, 배우자상속공제 5억~30억, 10~50% 세율, 신고세액공제 3% 반영.', body }));
}

/* ---------- 종합소득세 ---------- */
const INC = [1000, 1500, 2000, 2500, 3000, 3500, 4000, 5000, 6000, 7000, 8000, 10000, 12000, 15000, 20000, 30000, 50000];
const incUrl = (m) => `/income-tax/${m}/`;
const INC_NOTE = `<p class="note">기본공제(본인 150만원)와 표준세액공제 7만원만 반영한 추정입니다. 부양가족·연금보험료·노란우산공제 등 소득공제, 자녀·연금계좌 세액공제, 근로소득과의 합산, 성실신고확인 대상 여부에 따라 실제 세액은 달라집니다. <a href="/method/">계산 기준 보기</a></p>`;

function incPage(m) {
  const I = m * 10000, t = IC.incomeTax(I), url = incUrl(m);
  const title = `종합소득금액 ${manwon(I)} 종합소득세 — ${won(t.total)} (소득세 + 지방소득세, ${YEAR}년)`;
  const desc = `소득금액 ${manwon(I)}(수입 − 필요경비)이면 기본공제 150만원을 뺀 과세표준 ${manwon(t.base)}에 ${pct(t.rate, 0)} 세율로 소득세 ${won(t.tax)}, 지방소득세 ${won(t.local)}, 합계 ${won(t.total)}입니다. 프리랜서 3.3% 정산과 경비율별 수입 환산, 공제를 더할 때의 변화.`;
  const exp = [0.4, 0.5, 0.6, 0.7, 0.8].map((e) => { const rev = Math.round(I / (1 - e)); const s = IC.settle(rev, e); return { cells: [`${pct(e, 0)} (수입 ${manwon(rev)})`, num(s.prepaid), num(s.total), (s.refund >= 0 ? '환급 ' : '추가 납부 ') + num(Math.abs(s.refund))] }; });
  const more = [
    { label: '부양가족 1명 추가 (소득공제 150만원)', o: { deductions: 1500000 } },
    { label: '노란우산공제 연 300만원 납입', o: { deductions: 3000000 } },
    { label: '국민연금 지역가입 연 200만원 납입', o: { deductions: 2000000 } },
    { label: `연금저축 600만원 (세액공제 ${I <= 45000000 ? '15%' : '12%'})`, o: { credits: Math.round(6000000 * (I <= 45000000 ? 0.15 : 0.12)) } },
  ].map((x) => { const q = IC.incomeTax(I, x.o); return { cells: [x.label, num(q.total), '−' + num(t.total - q.total)] }; });
  const body = `
${crumb([['/income-tax/', '종합소득세'], [null, `소득 ${manwon(I)}`]])}
<h1 class="title">종합소득금액 ${manwon(I)} — 종합소득세는</h1>
<p class="meta">소득금액 = 수입 − 필요경비 · 기본공제 본인 150만원 · 표준세액공제 7만원 · ${YEAR}년 5월 신고분 기준</p>
${lead(`1년 소득금액이 ${manwon(I)}이면 기본공제 150만원을 뺀 과세표준 ${manwon(t.base)}에 ${pct(t.rate, 0)} 세율${t.progressiveDeduct ? `(누진공제 ${manwon(t.progressiveDeduct)})` : ''}을 적용해 소득세 ${won(t.tax)}, 여기에 지방소득세 10%를 더해 ${won(t.total)}을 냅니다. 소득의 ${pct(t.effective, 1)}입니다. 프리랜서로 3.3%를 미리 뗐다면 아래 표에서 환급인지 추가 납부인지 확인하세요.`)}
${hero({ label: '종합소득세 + 지방소득세', value: t.total, sub: `소득세 ${won(t.tax)} + 지방소득세 ${won(t.local)} · 소득금액의 ${pct(t.effective, 1)}` })}
${led('계산 흐름', '원 · 1년', [['종합소득금액', num(I), '수입 − 필요경비'], ['기본공제 (본인)', neg(IC.BASIC_DEDUCTION)], ['과세표준', num(t.base)], ['산출세액', num(t.calc), `${pct(t.rate, 0)}${t.progressiveDeduct ? ` − 누진공제 ${manwon(t.progressiveDeduct)}` : ''}`], ['표준세액공제', neg(t.credit)], ['소득세', num(t.tax)], ['지방소득세 10%', '+' + num(t.local)], ['합계', num(t.total)]])}
${section('프리랜서라면 — 3.3% 정산', `이 소득금액이 되는 수입을 경비율별로 역산 · 기납부 = 수입의 3.3%`, table(['경비율 (수입)', '미리 낸 3.3%', '내야 할 세금', '정산'], exp))}
${section('공제를 더 넣으면', '자주 쓰는 공제 하나를 추가할 때의 세금 (소득세 + 지방소득세)', table(['추가 공제', '세금', '절감'], more))}
${section('소득이 바뀌면', '소득세 + 지방소득세', chips(neighbors(INC, m, 3).map((x) => ({ label: short(x * 10000), value: IC.incomeTax(x * 10000).total, href: incUrl(x), on: x === m }))))}
${ad()}
${section('알아두면 좋은 것', null, `<div class="doc">
<p><b>신고는 5월 1일부터 31일까지.</b> 홈택스에서 직접 하거나 세무대리인에게 맡기고, 성실신고확인 대상(도소매 15억·제조 7.5억·서비스 5억 이상)은 6월 30일까지입니다. 세액이 1,000만원을 넘으면 절반을 8월 말까지 나눠 낼 수 있습니다.</p>
<p><b>필요경비는 어떻게 정하나요?</b> 장부를 쓰면 실제 경비, 안 쓰면 업종별 단순경비율(수입이 작을 때)·기준경비율을 적용합니다. 같은 수입이라도 경비율이 10%p 다르면 위 표처럼 세금이 크게 달라지니 업종 코드의 경비율을 먼저 확인하세요.</p>
<p><b>지방소득세는 따로.</b> 소득세의 10%를 위택스에 별도 신고하는데 홈택스에서 종소세 신고를 마치면 바로 이어서 할 수 있습니다.</p>
<p><b>건강보험료가 따라옵니다.</b> 지역가입자는 이 소득금액을 기준으로 11월부터 건강보험료가 다시 계산됩니다. 소득이 늘면 세금보다 보험료 인상이 더 크게 느껴지는 경우가 많습니다.</p>
</div>`)}
${section('이어서 계산하기', null, list([{ href: freeUrl(nearest(FREE, Math.round(I / 12 / 10000))), title: `월 ${manwon(nearest(FREE, Math.round(I / 12 / 10000)) * 10000)} 프리랜서 실수령`, sub: '3.3% 떼면 매달 얼마' }, { href: '/yearend/', title: '연말정산 미리보기', sub: '근로소득이 있다면' }, { href: '/rates/', title: `${YEAR}년 4대보험 요율표`, sub: '지역가입자 보험료의 기준' }]))}
${INC_NOTE}`;
  write(url, shell({ url, title, desc, body }));
}

function incIndex() {
  const rows = INC.map((m) => { const t = IC.incomeTax(m * 10000); return { cells: [`<a href="${incUrl(m)}">${manwon(m * 10000)}</a>`, num(t.base), pct(t.rate, 0), num(t.tax), num(t.local), num(t.total)] }; });
  const body = `
${crumb([['/', '홈'], [null, '종합소득세']])}
<h1 class="title">종합소득세 계산표 — 소득금액별 세금과 3.3% 정산</h1>
<p class="meta">${YEAR}년 5월 신고 · 기본세율 6~45% · 기본공제 150만원 · 표준세액공제 7만원 · 지방소득세 10% 포함</p>
${lead(`종합소득세는 1년 소득금액(수입 − 필요경비)에서 공제를 뺀 과세표준에 6~45% 누진세율로 매깁니다. 소득금액 3,000만원이면 ${won(IC.incomeTax(30000000).total)}, 5,000만원이면 ${won(IC.incomeTax(50000000).total)}, 1억원이면 ${won(IC.incomeTax(100000000).total)}입니다(지방소득세 포함). 프리랜서는 미리 낸 3.3%와 이 금액의 차이를 5월에 정산합니다.`)}
${section('소득금액별', '원 · 금액을 누르면 3.3% 정산표와 공제 효과', table(['소득금액', '과세표준', '세율', '소득세', '지방소득세', '합계'], rows))}
${ad()}
${section('세율표', '과세표준 기준 · 지방소득세 별도', table(['과세표준', '세율', '누진공제'], R.BRACKETS.map(([lim, r, d], i) => ({ cells: [i === 0 ? `${manwon(lim)} 이하` : lim === Infinity ? `${manwon(R.BRACKETS[i - 1][0])} 초과` : `${manwon(R.BRACKETS[i - 1][0])} 초과 ${manwon(lim)} 이하`, pct(r, 0), d ? manwon(d) : '—'] }))))}
${section('자주 묻는 것', null, `<div class="doc">
<p><b>수입과 소득금액은 다른가요?</b> 다릅니다. 수입(매출)에서 필요경비를 뺀 것이 소득금액이고, 세금은 소득금액 기준입니다. 경비율 60%라면 수입 1억원의 소득금액은 4,000만원입니다.</p>
<p><b>프리랜서는 왜 5월에 세금을 더 내기도 하나요?</b> 3.3%는 소득세 3%를 미리 떼는 것일 뿐이고, 실제 세율은 과세표준에 따라 6~45%입니다. 경비가 적게 인정되면 추가 납부, 많이 인정되면 환급입니다.</p>
<p><b>직장인인데 부업 소득이 있으면?</b> 근로소득과 사업소득을 합쳐 5월에 종합소득세를 신고합니다. 연말정산은 근로소득만 정산한 것이라 합산하면 세율 구간이 올라갈 수 있습니다.</p>
</div>`)}
${INC_NOTE}`;
  write('/income-tax/', shell({ url: '/income-tax/', title: `종합소득세 계산표 — 소득금액별 세금과 프리랜서 3.3% 정산 (${YEAR}년)`, desc: '소득금액 1,000만원부터 5억원까지 종합소득세와 지방소득세, 프리랜서 3.3% 기납부와의 정산, 경비율별 수입 환산, 공제 추가 효과를 정리했습니다.', body }));
}

/* ---------- 주택 재산세 ---------- */
const PROP = [10000, 15000, 20000, 25000, 30000, 40000, 50000, 60000, 70000, 80000, 90000, 100000, 120000, 150000, 200000, 300000];
const propUrl = (m) => `/property-tax/${m}/`;
const PROP_NOTE = `<p class="note">지방세법의 주택분 재산세 기준입니다. 1세대 1주택 공정시장가액비율 특례(43~45%)와 특례세율은 해마다 시행령·법 개정으로 정해지므로 올해 적용 여부를 고지서로 확인하세요. 세부담상한(전년 대비 105~130%), 지역자원시설세, 종합부동산세(1주택 공시가 12억 초과)는 반영하지 않았습니다. <a href="/method/">계산 기준 보기</a></p>`;

function propPage(m) {
  const P = m * 10000, a = PT.propertyTax(P), b2 = PT.propertyTax(P, { oneHome: false }), url = propUrl(m);
  const title = `공시가격 ${manwon(P)} 주택 재산세 — 1주택 연 ${won(a.total)} · 다주택 ${won(b2.total)} (${YEAR}년)`;
  const desc = `공시가격 ${manwon(P)} 주택의 재산세는 1세대 1주택이면 과세표준 ${manwon(a.base)}(${pct(a.ratio, 0)})에 ${a.special ? '특례세율' : '표준세율'}을 적용한 ${won(a.tax)}에 도시지역분 ${won(a.urban)}, 지방교육세 ${won(a.educ)}을 더해 연 ${won(a.total)}, 7월·9월에 ${won(a.july)}·${won(a.september)}씩 냅니다. 다주택이면 ${won(b2.total)}.`;
  const body = `
${crumb([['/property-tax/', '재산세'], [null, `공시가 ${manwon(P)}`]])}
<h1 class="title">공시가격 ${manwon(P)} 주택 재산세</h1>
<p class="meta">주택분 · 도시지역분·지방교육세 포함 · 과세기준일 6월 1일 · 7월·9월 절반씩 납부</p>
${lead(`공시가격 ${manwon(P)}인 집을 1세대 1주택으로 갖고 있으면 과세표준은 공시가격의 ${pct(a.ratio, 0)}인 ${manwon(a.base)}이고, ${a.special ? '9억원 이하 특례세율' : '표준세율'}로 재산세 ${won(a.tax)}에 도시지역분 ${won(a.urban)}, 지방교육세 ${won(a.educ)}이 붙어 1년에 ${won(a.total)}입니다. 7월에 ${won(a.july)}, 9월에 ${won(a.september)}이 고지됩니다. 2주택 이상이면 비율 60%와 표준세율이 적용되어 ${won(b2.total)}으로 ${b2.total > a.total ? `${pct(b2.total / a.total - 1, 0)} 더` : '같게'} 냅니다.`)}
${hero({ label: '1세대 1주택 연간 재산세 (도시지역분·교육세 포함)', value: a.total, sub: `7월 ${won(a.july)} + 9월 ${won(a.september)} · 공시가격의 ${pct(a.effective, 3)}` })}
${led('계산 흐름 (1주택)', '원', [['공시가격', num(P)], [`공정시장가액비율 ${pct(a.ratio, 0)}`, '', '1세대 1주택 특례 (일반 60%)'], ['과세표준', num(a.base)], [`재산세 (${a.special ? '특례세율' : '표준세율'})`, num(a.tax), a.special ? '9억 이하 1주택 · 구간별 0.05%p 인하' : '0.1~0.4% 누진'], ['도시지역분 0.14%', '+' + num(a.urban), '과세표준 기준'], ['지방교육세 20%', '+' + num(a.educ), '재산세 기준'], ['합계', num(a.total)]])}
${section('1주택 vs 다주택', `공시가격 ${manwon(P)}`, table(['구분', '1세대 1주택', '2주택 이상'], [
  { cells: ['공정시장가액비율', pct(a.ratio, 0), pct(b2.ratio, 0)] }, { cells: ['과세표준', num(a.base), num(b2.base)] }, { cells: ['재산세', num(a.tax), num(b2.tax)] }, { cells: ['도시지역분', num(a.urban), num(b2.urban)] }, { cells: ['지방교육세', num(a.educ), num(b2.educ)] }, { cls: 'on', cells: ['합계', num(a.total), num(b2.total)] },
]))}
${section('언제 얼마나 내나', '주택분은 7월(1기)과 9월(2기)에 절반씩 · 본세 20만원 이하면 7월에 한 번에', tiles([{ label: '7월', value: a.july }, { label: '9월', value: a.september }, { label: '연 합계', value: a.total }]))}
${section('공시가격이 바뀌면', '1주택 연간 합계', chips(neighbors(PROP, m, 3).map((x) => ({ label: short(x * 10000), value: PT.propertyTax(x * 10000).total, href: propUrl(x), on: x === m }))))}
${ad()}
${section('알아두면 좋은 것', null, `<div class="doc">
<p><b>공시가격은 시세보다 낮습니다.</b> 아파트 공시가격은 대체로 시세의 69% 안팎(현실화율)입니다. 매년 3월 열람·4월 확정되며 '부동산공시가격알리미'에서 확인합니다. 시세 ${manwon(Math.round(P / 0.69 / 10000000) * 10000000)} 안팎의 집이 이 페이지에 해당합니다.</p>
<p><b>6월 1일에 누가 갖고 있느냐.</b> 과세기준일이 6월 1일이라 5월 31일에 잔금을 치르면 매수인이, 6월 2일에 치르면 매도인이 그해 재산세를 냅니다. 계약 때 잔금일을 이 기준으로 조정하기도 합니다.</p>
<p><b>많이 오른 해도 상한이 있습니다.</b> 공시가격이 급등해도 전년 세액의 105%(3억 이하)·110%(6억 이하)·130%(6억 초과)를 넘지 않게 세부담상한이 적용됩니다.</p>
<p><b>12억원을 넘으면 종부세도.</b> 1세대 1주택자는 공시가격 12억원(다주택 합산 9억원) 초과분에 종합부동산세가 12월에 따로 나옵니다.</p>
</div>`)}
${section('이어서 계산하기', null, list([{ href: '/acquisition-tax/', title: '주택 취득세', sub: '살 때 한 번 내는 세금' }, { href: '/ltv/', title: 'LTV 대출 한도', sub: '이 집을 담보로 얼마까지' }, { href: '/bokbi/', title: '부동산 복비', sub: '사고팔 때 중개보수' }]))}
${PROP_NOTE}`;
  write(url, shell({ url, title, desc, body, nav: 'loan' }));
}

function propIndex() {
  const rows = PROP.map((m) => { const a = PT.propertyTax(m * 10000), b2 = PT.propertyTax(m * 10000, { oneHome: false }); return { cells: [`<a href="${propUrl(m)}">${manwon(m * 10000)}</a>`, num(a.base), num(a.total), `${num(a.july)} / ${num(a.september)}`, num(b2.total)] }; });
  const body = `
${crumb([['/', '홈'], [null, '재산세']])}
<h1 class="title">주택 재산세 계산표 — 공시가격별 1주택·다주택</h1>
<p class="meta">${YEAR}년 · 재산세 + 도시지역분 0.14% + 지방교육세 20% · 1세대 1주택 특례(공정시장가액비율 43~45%, 9억 이하 특례세율) 반영</p>
${lead(`재산세는 공시가격에 공정시장가액비율을 곱한 과세표준에 0.1~0.4% 누진세율로 매기고 도시지역분과 지방교육세가 붙습니다. 1세대 1주택은 비율과 세율 모두 낮아 공시가 5억원이면 연 ${won(PT.propertyTax(500000000).total)}, 같은 집을 다주택자가 가지면 ${won(PT.propertyTax(500000000, { oneHome: false }).total)}입니다. 7월과 9월에 절반씩 고지됩니다.`)}
${section('공시가격별 연간 재산세', '원 · 금액을 누르면 계산 흐름과 1주택·다주택 비교', table(['공시가격', '과세표준 (1주택)', '1주택 합계', '7월 / 9월', '다주택 합계'], rows))}
${ad()}
${section('세율표', '주택분 · 과세표준 기준', table(['과세표준', '표준세율', '1주택 특례세율 (공시가 9억 이하)'], [
  { cells: ['6,000만원 이하', '0.1%', '0.05%'] }, { cells: ['6,000만원 초과 1억 5,000만원 이하', '6만원 + 초과분 0.15%', '3만원 + 초과분 0.1%'] }, { cells: ['1억 5,000만원 초과 3억원 이하', '19만 5,000원 + 초과분 0.25%', '12만원 + 초과분 0.2%'] }, { cells: ['3억원 초과', '57만원 + 초과분 0.4%', '42만원 + 초과분 0.35%'] },
]))}
${section('자주 묻는 것', null, `<div class="doc">
<p><b>왜 두 번 나오나요?</b> 주택분 재산세는 7월과 9월에 절반씩 나눠 고지합니다(본세 20만원 이하는 7월 한 번). 건물과 토지를 따로 매기던 방식의 흔적입니다.</p>
<p><b>1주택 특례는 계속되나요?</b> 공정시장가액비율 43~45%와 특례세율은 법·시행령으로 해마다 정합니다. 최근 몇 년은 계속 연장됐지만 올해 고지서로 확인하는 편이 안전합니다.</p>
<p><b>재산세와 종부세는 다른가요?</b> 재산세는 지방세로 모든 주택에, 종합부동산세는 국세로 공시가격 12억원(1주택) 초과분에만 12월에 따로 부과됩니다.</p>
</div>`)}
${PROP_NOTE}`;
  write('/property-tax/', shell({ url: '/property-tax/', title: `주택 재산세 계산표 — 공시가격별 1주택·다주택 연간 세금 (${YEAR}년)`, desc: '공시가격 1억원부터 30억원까지 주택 재산세를 1세대 1주택 특례와 다주택 표준세율로 계산했습니다. 도시지역분·지방교육세 포함, 7월·9월 납부액.', body, nav: 'loan' }));
}

/* ---------- 자동차세 ---------- */
const CARS = [998, 1000, 1197, 1248, 1368, 1498, 1591, 1598, 1600, 1798, 1969, 1991, 1998, 1999, 2000, 2199, 2359, 2497, 2500, 2999, 3000, 3342, 3470, 3778, 4000, 5000];
const CAR_EX = { 998: '모닝·레이·캐스퍼 (경차)', 1598: '아반떼·K3·투싼 1.6 등', 1999: '쏘나타·K5·스포티지 2.0 등', 2497: '그랜저·K8 2.5 등', 3470: '그랜저·K8 3.5, G80 3.5 등', 3778: '팰리세이드 3.8 등' };
const carTaxUrl = (cc) => `/car-tax/${cc}/`;
const CAR_NOTE = `<p class="note">비영업용 승용차 기준입니다. 승합·화물·영업용은 정액 세율이고, 연납 공제율은 행정안전부가 해마다 고시합니다(${YEAR}년 ${pct(CT.ANNUAL_DISCOUNT[YEAR] || 0, 0)}). 중고차는 최초 등록일 기준 차령으로 경감합니다. <a href="/method/">계산 기준 보기</a></p>`;
const carAgeRows = (cc) => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((age) => { const t = CT.carTax(cc, { age, year: YEAR }); return { cls: age === 1 ? 'on' : '', cells: [age >= 12 ? '12년차 이상' : `${age}년차`, pct(t.discount, 0), num(t.tax), num(t.educ), num(t.total), num(t.prepaid)] }; });

function carTaxPage(cc) {
  const t = CT.carTax(cc, { year: YEAR }), t5 = CT.carTax(cc, { age: 5, year: YEAR }), t12 = CT.carTax(cc, { age: 12, year: YEAR }), url = carTaxUrl(cc);
  const title = `${num(cc)}cc 자동차세 — 연 ${won(t.total)} (교육세 포함) · 1월 연납 ${won(t.prepaid)} · 연식별 표 (${YEAR}년)`;
  const desc = `배기량 ${num(cc)}cc 승용차의 자동차세는 cc당 ${t.unit}원으로 ${won(t.tax)}, 지방교육세 30%를 더하면 연 ${won(t.total)}입니다(1~2년차). 5년차면 ${won(t5.total)}, 12년차 이상은 절반. 6월·12월 ${won(t.half)}씩, 1월 연납은 ${won(t.prepaid)}.`;
  const body = `
${crumb([['/car-tax/', '자동차세'], [null, `${num(cc)}cc`]])}
<h1 class="title">${num(cc)}cc 자동차세${CAR_EX[cc] ? ` — ${CAR_EX[cc]}` : ''}</h1>
<p class="meta">비영업용 승용차 · cc당 ${t.unit}원 · 지방교육세 30% 포함 · 6월·12월 절반씩 또는 1월 연납</p>
${lead(`배기량 ${num(cc)}cc는 cc당 ${t.unit}원 구간이라 자동차세 ${won(t.tax)}에 지방교육세 ${won(t.educ)}을 더해 1년에 ${won(t.total)}입니다. 6월과 12월에 ${won(t.half)}씩 나오고, 1월에 한 번에 내면 ${pct(t.rate, 0)}(2~12월분)를 깎아 ${won(t.prepaid)}만 냅니다. 등록 3년차부터 해마다 5%씩 줄어 5년차에는 ${won(t5.total)}, 12년차부터는 절반인 ${won(t12.total)}입니다.`)}
${hero({ label: '연간 자동차세 (1~2년차 · 교육세 포함)', value: t.total, sub: `자동차세 ${won(t.tax)} + 지방교육세 ${won(t.educ)} · 6월·12월 각 ${won(t.half)}` })}
${led('계산 흐름', '원 · 1년', [[`배기량 × cc당 세액`, num(t.gross), `${num(cc)}cc × ${t.unit}원`], ['차령 경감', neg(t.gross - t.tax), '1~2년차 없음 · 3년차부터 5%씩'], ['자동차세', num(t.tax)], ['지방교육세 30%', '+' + num(t.educ)], ['합계', num(t.total)], [`1월 연납 시 (${pct(t.rate, 0)} × 11/12 공제)`, num(t.prepaid), `−${won(t.prepay)}`]])}
${section('연식별 자동차세', `${num(cc)}cc · 최초 등록 후 몇 년째인지 기준`, table(['차령', '경감', '자동차세', '교육세', '합계', '연납 시'], carAgeRows(cc)))}
${section('언제 내나', null, tiles([{ label: '6월 (1기분)', value: t.half }, { label: '12월 (2기분)', value: t.total - t.half }, { label: '1월 연납', value: t.prepaid }]))}
${section('배기량이 바뀌면', '1~2년차 연간 합계', chips(neighbors(CARS, cc, 3).map((x) => ({ label: `${num(x)}cc`, value: CT.carTax(x, { year: YEAR }).total, href: carTaxUrl(x), on: x === cc }))))}
${ad()}
${section('알아두면 좋은 것', null, `<div class="doc">
<p><b>연납 할인은 줄어드는 중.</b> 1월 연납 공제율이 2023년 7%, 2024·2025년 5%, ${YEAR}년 ${pct(CT.ANNUAL_DISCOUNT[YEAR] || 0, 0)}로 낮아졌고 2027년 폐지 예정입니다. 그래도 위택스에서 1월 16~31일에 신청하면 두 번 낼 것을 한 번에 끝냅니다. 3월·6월·9월 연납도 남은 기간만큼 공제됩니다.</p>
<p><b>중고차를 사면 일할 계산.</b> 소유권 이전일을 기준으로 전 주인과 나눠 내고, 차령은 최초 등록일부터 셉니다. 폐차·양도하면 남은 기간분은 환급됩니다.</p>
<p><b>전기차는 13만원.</b> 배기량이 없는 전기·수소차는 자동차세 10만원 + 교육세 3만원 정액입니다. <a href="/car-tax/ev/">전기차 자동차세</a></p>
<p><b>배기량 경계에 유의.</b> 1,600cc를 1cc라도 넘으면 cc당 140원이 200원이 되어 세금이 40% 넘게 뜁니다. 1,598cc 차와 1,999cc 차가 갈리는 지점도 여기입니다.</p>
</div>`)}
${section('이어서 계산하기', null, list([{ href: '/car-tax/', title: '배기량별 자동차세표', sub: '998cc부터 5,000cc까지' }, { href: '/car-loan/', title: '자동차 할부', sub: '차값·개월별 월 납입액' }, { href: '/time/', title: '내 시간으로 사는 물건', sub: '자동차는 몇 시간 일해야 하나' }]))}
${CAR_NOTE}`;
  write(url, shell({ url, title, desc, body, nav: 'loan' }));
}

function carTaxEvPage() {
  const t = CT.carTax(0, { ev: true, year: YEAR }), url = '/car-tax/ev/';
  const body = `
${crumb([['/car-tax/', '자동차세'], [null, '전기차']])}
<h1 class="title">전기차·수소차 자동차세 — 연 ${won(t.total)}</h1>
<p class="meta">배기량 없음 · 자동차세 10만원 정액 + 지방교육세 3만원 · 차령 경감 없음</p>
${lead(`전기차와 수소차는 배기량이 없어 자동차세가 연 10만원 정액이고 지방교육세 30%를 더해 ${won(t.total)}입니다. 같은 값의 휘발유차(2,000cc 안팎)가 ${won(CT.carTax(1999).total)}인 것과 비교하면 4분의 1입니다. 6월·12월에 ${won(t.half)}씩 내고 1월 연납은 ${won(t.prepaid)}입니다.`)}
${hero({ label: '연간 자동차세 (교육세 포함)', value: t.total, sub: `자동차세 ${won(t.tax)} + 지방교육세 ${won(t.educ)} · 6월·12월 각 ${won(t.half)}` })}
${section('휘발유·디젤차와 비교', '1~2년차 연간 합계', table(['차종', '연간 자동차세'], [{ cls: 'on', cells: ['전기차·수소차', num(t.total)] }].concat([998, 1598, 1999, 2497, 3470].map((cc) => ({ cells: [`<a href="${carTaxUrl(cc)}">${num(cc)}cc</a>${CAR_EX[cc] ? ` (${CAR_EX[cc]})` : ''}`, num(CT.carTax(cc).total)] })))))}
${ad()}
${section('알아두면 좋은 것', null, `<div class="doc"><p>전기차 자동차세를 배터리 출력·차값 기준으로 바꾸는 논의가 있지만 ${YEAR}년 현재는 정액입니다. 차령에 따른 경감은 없고, 연납 공제(${pct(CT.ANNUAL_DISCOUNT[YEAR] || 0, 0)})는 같이 받습니다. 하이브리드는 배기량 기준으로 일반 승용차와 같습니다.</p></div>`)}
${CAR_NOTE}`;
  write(url, shell({ url, title: `전기차 자동차세 — 연 ${won(t.total)} (정액 10만원 + 교육세, ${YEAR}년)`, desc: '전기차·수소차 자동차세는 배기량과 관계없이 연 10만원에 지방교육세 3만원을 더한 13만원입니다. 휘발유차와 비교, 납부 시기, 연납.', body, nav: 'loan' }));
}

function carTaxIndex() {
  const rows = CARS.map((cc) => { const t = CT.carTax(cc, { year: YEAR }), t5 = CT.carTax(cc, { age: 5, year: YEAR }); return { cells: [`<a href="${carTaxUrl(cc)}">${num(cc)}cc</a>${CAR_EX[cc] ? `<br><small>${CAR_EX[cc]}</small>` : ''}`, `${t.unit}원`, num(t.tax), num(t.educ), num(t.total), num(t.prepaid), num(t5.total)] }; });
  const body = `
${crumb([['/', '홈'], [null, '자동차세']])}
<h1 class="title">자동차세 계산표 — 배기량별 연간 세금과 연납</h1>
<p class="meta">${YEAR}년 비영업용 승용차 · cc당 80·140·200원 · 지방교육세 30% 포함 · 1월 연납 ${pct(CT.ANNUAL_DISCOUNT[YEAR] || 0, 0)} 공제</p>
${lead(`자동차세는 배기량에 cc당 세액(1,000cc 이하 80원, 1,600cc 이하 140원, 초과 200원)을 곱하고 지방교육세 30%를 더합니다. 경차 998cc는 연 ${won(CT.carTax(998).total)}, 1,598cc는 ${won(CT.carTax(1598).total)}, 1,999cc는 ${won(CT.carTax(1999).total)}입니다. 등록 3년차부터 해마다 5%씩 줄어 12년차에는 절반이 되고, 전기차는 정액 ${won(CT.carTax(0, { ev: true }).total)}입니다.`)}
${section('배기량별', '원 · 배기량을 누르면 연식별 표', table(['배기량', 'cc당', '자동차세', '교육세', '연 합계 (1~2년차)', '연납 시', '5년차 합계'], rows))}
${ad()}
${section('전기차·수소차', null, list([{ href: '/car-tax/ev/', title: '전기차 자동차세', sub: '배기량 없이 정액 10만원 + 교육세', value: CT.carTax(0, { ev: true }).total }]))}
${section('자주 묻는 것', null, `<div class="doc">
<p><b>연납하면 얼마나 이득인가요?</b> ${YEAR}년 공제율 ${pct(CT.ANNUAL_DISCOUNT[YEAR] || 0, 0)}를 2~12월분에 적용하니 실제 할인은 연세액의 약 ${pct((CT.ANNUAL_DISCOUNT[YEAR] || 0) * 11 / 12, 1)}입니다. 1,999cc면 약 ${won(CT.carTax(1999, { year: YEAR }).prepay)}입니다. 공제율은 2027년 폐지 예정입니다.</p>
<p><b>차령은 어떻게 세나요?</b> 최초 등록 연도를 1년차로 보고 해가 바뀔 때마다 1년씩 더합니다. 3년차 5%, 4년차 10% … 12년차 이상 50%입니다. 중고차도 최초 등록일 기준입니다.</p>
<p><b>자동차 취득세와 다른가요?</b> 취득세는 살 때 한 번(승용차 7%), 자동차세는 보유하는 동안 해마다 내는 세금입니다.</p>
</div>`)}
${CAR_NOTE}`;
  write('/car-tax/', shell({ url: '/car-tax/', title: `자동차세 계산표 — 배기량별 연간 세금·연납 할인·연식 경감 (${YEAR}년)`, desc: '998cc부터 5,000cc까지 배기량별 자동차세와 지방교육세, 1월 연납 공제, 연식별 경감을 표로 정리했습니다. 전기차 정액 13만원.', body, nav: 'loan' }));
}

/* ---------- LTV 대출 한도 ---------- */
const LTV_P = [30000, 40000, 50000, 60000, 70000, 80000, 90000, 100000, 120000, 150000, 200000, 250000, 300000];
const ltvUrl = (m) => `/ltv/${m}/`;
const LTV_NOTE = `<p class="note">${LV.LTV_ASOF} 기준입니다. 규제지역 지정과 LTV·대출 한도는 정부 대책에 따라 바뀌므로 대출 전 은행에 확인하세요. 실제 한도는 LTV·DSR·은행 심사 중 가장 작은 값이고 방공제(서울 5,500만원 등, 보증보험 가입 시 면제)와 기존 대출만큼 줄어듭니다. <a href="/method/">계산 기준 보기</a></p>`;

function ltvPage(m) {
  const P = m * 10000, url = ltvUrl(m);
  const reg = LV.ltvLimit(P, 'regulated'), regF = LV.ltvLimit(P, 'regulated', { firstHome: true }), met = LV.ltvLimit(P, 'metro'), metF = LV.ltvLimit(P, 'metro', { firstHome: true }), oth = LV.ltvLimit(P, 'other'), othF = LV.ltvLimit(P, 'other', { firstHome: true });
  const title = `${manwon(P)} 집 LTV 대출 한도 — 규제지역 ${manwon(reg.limit)} · 비규제 ${manwon(met.limit)} · 생애최초 ${manwon(regF.limit)} (${LV.LTV_ASOF})`;
  const desc = `${manwon(P)}짜리 집을 살 때 주택담보대출 한도는 규제지역(서울 등) LTV 40%로 ${manwon(reg.limit)}${reg.capped ? `(${manwon(reg.cap)} 한도)` : ''}, 수도권 비규제 ${manwon(met.limit)}, 지방 ${manwon(oth.limit)}, 생애최초는 규제지역 ${manwon(regF.limit)}·지방 ${manwon(othF.limit)}입니다. 연봉별 DSR 한도와 필요 현금까지.`;
  const acq = RE.acquisitionTax(P), br = RE.brokerage(P);
  const dsrRows = [3000, 4000, 5000, 7000, 10000, 15000, 20000].map((s) => { const d = L.dsrLimit(s * 10000, 0.045, 360).principal, ds = L.loanForPayment(L.dsrLimit(s * 10000, 0.045, 360).monthlyCap, 0.06, 360); const real = Math.min(reg.limit, ds); return { cells: [`<a href="${dsrUrl(nearest(SALARIES, s))}">연봉 ${manwon(s * 10000)}</a>`, num(d), num(ds), num(real), real < reg.limit ? 'DSR' : 'LTV'] }; });
  const body = `
${crumb([['/ltv/', 'LTV 한도'], [null, manwon(P)]])}
<h1 class="title">${manwon(P)} 집, 주택담보대출은 얼마까지</h1>
<p class="meta">LTV(담보인정비율) 기준 · ${LV.LTV_ASOF} · 무주택자 기준, 1주택자는 기존 집 처분 조건</p>
${lead(`${manwon(P)}짜리 집을 담보로 빌릴 수 있는 돈은 지역에 따라 다릅니다. 서울 전역과 경기 12곳 같은 규제지역은 LTV 40%로 ${manwon(reg.raw)}${reg.capped ? `이지만 한도 ${manwon(reg.cap)}에 걸려 ${manwon(reg.limit)}` : ''}, 수도권 비규제지역은 70%로 ${manwon(met.raw)}${met.capped ? `이지만 6억원 한도에 걸려 ${manwon(met.limit)}` : ''}, 지방은 ${manwon(oth.limit)}입니다. 생애최초라면 규제지역 ${manwon(regF.limit)}, 지방 ${manwon(othF.limit)}까지 올라갑니다. 다만 연봉이 낮으면 DSR이 먼저 걸리니 아래 표를 함께 보세요.`)}
${hero({ label: '규제지역 LTV 한도 (무주택 · 40%)', value: reg.limit, sub: `${reg.capped ? `40%면 ${manwon(reg.raw)}이지만 ${manwon(reg.cap)} 한도 적용 · ` : ''}나머지 ${manwon(reg.cash)}은 현금 · 생애최초 ${manwon(regF.limit)}` })}
${section('지역·조건별 한도', `집값 ${manwon(P)}`, table(['지역', 'LTV', '한도', '생애최초 LTV', '생애최초 한도'], [
  { cls: 'on', cells: [LV.REGIONS.regulated.label, pct(reg.ratio, 0), num(reg.limit) + (reg.capped ? ' (한도)' : ''), pct(regF.ratio, 0), num(regF.limit) + (regF.capped ? ' (한도)' : '')] },
  { cells: [LV.REGIONS.metro.label, pct(met.ratio, 0), num(met.limit) + (met.capped ? ' (한도)' : ''), pct(metF.ratio, 0), num(metF.limit) + (metF.capped ? ' (한도)' : '')] },
  { cells: [LV.REGIONS.other.label, pct(oth.ratio, 0), num(oth.limit), pct(othF.ratio, 0), num(othF.limit)] },
]))}
${section('연봉이 정하는 한도 (DSR)', `규제지역 한도 ${manwon(reg.limit)}과 연봉별 DSR 40% 한도 중 작은 쪽이 실제 한도 · 30년 원리금균등`, table(['연봉', 'DSR 한도 (4.5%)', '스트레스 6% 적용', '실제 한도', '걸리는 쪽'], dsrRows))}
${section('현금은 얼마나 필요한가', `규제지역 무주택 기준 · 취득세·복비 포함`, tiles([{ label: '집값 − 대출', value: reg.cash }, { label: '취득세 (1주택 85㎡ 이하)', value: acq.total }, { label: '복비 (부가세 포함)', value: br.total }]) + `<p class="sub" style="margin-top:8px">합계 약 <b class="num">${num(reg.cash + acq.total + br.total)}</b>원 — 등기비용·이사비는 별도</p>`)}
${section('집값이 바뀌면', '규제지역 무주택 한도', chips(neighbors(LTV_P, m, 3).map((x) => ({ label: short(x * 10000), value: LV.ltvLimit(x * 10000).limit, href: ltvUrl(x), on: x === m }))))}
${ad()}
${section('알아두면 좋은 것', null, `<div class="doc">
<p><b>규제지역은 어디인가요?</b> ${LV.LTV_ASOF}로 서울 25개 구 전역과 경기 과천·광명·성남(분당·수정·중원)·수원(영통·장안·팔달)·안양 동안·용인 수지·의왕·하남이 조정대상지역·투기과열지구로 묶였습니다. 여기서는 LTV 40%, 15억 초과 4억원·25억 초과 2억원 한도, 6개월 안 전입 의무가 적용됩니다.</p>
<p><b>1주택자는 기존 집을 팔아야.</b> 규제지역에서 1주택자가 새 집 담보대출을 받으려면 6개월 안에 기존 집을 처분해야 하고, 2주택 이상은 담보대출이 나오지 않습니다.</p>
<p><b>방공제를 잊지 마세요.</b> 은행은 세입자 최우선변제금(서울 5,500만원, 경기 과밀억제권역 4,800만원 등)을 한도에서 뺍니다. 보증보험(MCI·MCG)에 가입하면 빼지 않습니다.</p>
<p><b>생애최초 조건.</b> 본인과 배우자 모두 집을 가진 적이 없어야 하고, 규제지역 70%·비규제 80%가 적용되지만 6억원 한도와 DSR은 그대로입니다.</p>
</div>`)}
${section('이어서 계산하기', null, list([{ href: '/dsr/', title: '연봉별 DSR 한도표', sub: '내 연봉으로는 얼마까지' }, { href: loanUrl(nearest(LOAN_AMOUNTS, Math.round(reg.limit / 10000)), 30, 0.045), title: `대출 ${manwon(nearest(LOAN_AMOUNTS, Math.round(reg.limit / 10000)) * 10000)} 30년 상환표`, sub: '한도만큼 빌리면 매달 얼마' }, { href: '/couple/', title: '둘이 합쳐 얼마까지', sub: '부부 합산 DSR' }, { href: acqUrl(nearest(ACQ, m)), title: `${manwon(nearest(ACQ, m) * 10000)} 취득세`, sub: '살 때 드는 세금' }]))}
${LTV_NOTE}`;
  write(url, shell({ url, title, desc, body, nav: 'loan' }));
}

function ltvIndex() {
  const rows = LTV_P.map((m) => { const P = m * 10000; return { cells: [`<a href="${ltvUrl(m)}">${manwon(P)}</a>`, num(LV.ltvLimit(P, 'regulated').limit), num(LV.ltvLimit(P, 'regulated', { firstHome: true }).limit), num(LV.ltvLimit(P, 'metro').limit), num(LV.ltvLimit(P, 'other').limit), num(LV.ltvLimit(P, 'other', { firstHome: true }).limit)] }; });
  const body = `
${crumb([['/', '홈'], [null, 'LTV 한도']])}
<h1 class="title">LTV 주택담보대출 한도표 — 집값·지역별</h1>
<p class="meta">${LV.LTV_ASOF} · 규제지역 40% (생애최초 70%) · 수도권 비규제 70% · 지방 70% (생애최초 80%) · 수도권 6억원, 규제지역 15억 초과 4억·25억 초과 2억 한도</p>
${lead(`LTV는 집값 대비 대출 비율입니다. 10억원짜리 집이면 규제지역에서 ${manwon(LV.ltvLimit(1000000000).limit)}, 수도권 비규제지역에서 ${manwon(LV.ltvLimit(1000000000, 'metro').limit)}(70%지만 6억 한도), 지방에서 ${manwon(LV.ltvLimit(1000000000, 'other').limit)}까지입니다. 집값이 15억원을 넘으면 규제지역 한도가 4억원, 25억원을 넘으면 2억원으로 줄어 현금이 훨씬 많이 필요합니다. 실제 한도는 여기에 연봉 기준 DSR이 겹쳐 더 작아질 수 있습니다.`)}
${section('집값별 한도', '원 · 집값을 누르면 연봉별 DSR과 필요 현금', table(['집값', '규제지역 40%', '규제 생애최초 70%', '수도권 비규제 70%', '지방 70%', '지방 생애최초 80%'], rows))}
${ad()}
${section('자주 묻는 것', null, `<div class="doc">
<p><b>LTV와 DSR 중 무엇이 먼저 걸리나요?</b> 둘 다 적용되고 작은 쪽이 한도입니다. 집값이 비싸면 LTV 40%가, 연봉이 낮으면 DSR 40%가 먼저 걸립니다. 각 집값 페이지에 연봉별 비교표가 있습니다.</p>
<p><b>전세 끼고 사도 되나요?</b> 규제지역에서 주택담보대출을 받으면 6개월 안에 전입해야 하므로 세입자를 둔 채로는 대출이 어렵습니다.</p>
<p><b>한도가 바뀌면요?</b> 규제지역 지정과 LTV는 정부 대책으로 자주 바뀝니다. 이 표는 ${LV.LTV_ASOF} 기준이며 바뀌면 갱신합니다.</p>
</div>`)}
${LTV_NOTE}`;
  write('/ltv/', shell({ url: '/ltv/', title: `LTV 주택담보대출 한도표 — 집값·지역·생애최초별 (${LV.LTV_ASOF})`, desc: '3억원부터 30억원까지 집값별 주택담보대출 LTV 한도를 규제지역 40%, 수도권 비규제 70%, 지방 70%, 생애최초 70~80%와 6억·4억·2억 한도로 계산했습니다.', body, nav: 'loan' }));
}

/* ---------- 청약 가점 ---------- */
const SUB_H = Array.from({ length: 16 }, (_, i) => i);   /* 무주택 0 = 1년 미만 … 15 = 15년 이상 */
const SUB_F = [0, 1, 2, 3, 4, 5, 6];                       /* 부양가족 6 = 6명 이상 */
const subUrl = (h, f) => `/subscription/${h}-${f}/`;
const hText = (h) => h === 0 ? '무주택 1년 미만' : h === 15 ? '무주택 15년 이상' : `무주택 ${h}년`;
const hRange = (h) => h === 0 ? '1년 미만' : h === 15 ? '15년 이상' : `${h}년 이상 ${h + 1}년 미만`;
const fText = (f) => f === 6 ? '부양가족 6명 이상' : `부양가족 ${f}명`;
const fShort = (f) => f === 6 ? '6명 이상' : `${f}명`;
const subTotal = (h, f, a = SB.SUB_MAX.account) => SB.homelessScore(h) + SB.familyScore(f) + a;
const SUB_NOTE = `<p class="note">주택공급에 관한 규칙 제28조·별표 1(가점제) 기준입니다. 무주택기간과 부양가족은 세대 구성·주민등록을 보고 청약홈이 최종 판정하며, 가점제·추첨제 비율과 당첨 커트라인은 지역·면적·단지마다 다릅니다. 참고용이며 실제 청약은 입주자모집공고를 확인하세요. <a href="/method/">계산 기준 보기</a></p>`;
const SUB_TIPS = `<div class="doc">
<p><b>무주택기간은 만 30세부터 셉니다.</b> 만 30세가 되는 날부터 무주택 기간을 세고, 그 전에 혼인했다면 혼인신고일부터입니다. 집을 가졌다가 판 사람은 무주택이 된 날부터 다시 셉니다. 만 30세 미만 미혼 무주택자와 유주택자는 0점입니다. 세대원 전원이 무주택이어야 하고, 60세 이상 직계존속이 가진 집은 무주택으로 봅니다(그 존속은 부양가족에서 빠집니다).</p>
<p><b>부양가족은 등본이 기준입니다.</b> 배우자(따로 살아도 인정), 3년 이상 같은 주민등록에 있는 직계존속(배우자의 부모 포함, 집을 가진 존속은 제외), 만 30세 미만 미혼 직계비속(30세 이상은 1년 이상 같은 등본)이 부양가족입니다. 본인은 들어가지 않습니다.</p>
<p><b>통장은 최초 가입일 기준입니다.</b> 청약통장 가입기간은 처음 가입한 날부터 세고, 미성년 때 가입한 기간은 최대 2년만 인정하다가 2024년부터 5년까지 인정합니다. 6개월 미만 1점에서 15년 이상 17점입니다.</p>
<p><b>가점제 비율은 지역·면적별로 다릅니다.</b> 규제지역(투기과열지구) 전용 60㎡ 이하는 가점 40%·추첨 60%, 60~85㎡는 가점 70%·추첨 30%, 85㎡ 초과는 가점 80%·추첨 20%이고, 비규제지역은 85㎡ 이하 가점 40%·추첨 60%, 85㎡ 초과는 100% 추첨입니다(2023년 4월 개정). 가점이 낮으면 추첨 물량이 많은 단지와 면적을 고릅니다.</p>
<p><b>최대 가점은 가족 수가 정합니다.</b> 무주택 15년·통장 15년을 다 채워도 4인 가족(부양가족 3명) 69점, 3인 64점, 2인 59점, 1인 54점이 최대입니다. 수도권 인기 단지 당첨 커트라인은 60점대 후반이 흔해 3인 가구 이하는 만점을 받아도 어려운 곳이 있습니다. 커트라인은 단지마다 다르니 청약홈의 과거 당첨 가점을 확인하세요.</p>
</div>`;

function subPage(h, f) {
  const hs = SB.homelessScore(h), fs = SB.familyScore(f), max = subTotal(h, f), min = subTotal(h, f, 1), url = subUrl(h, f);
  const g = SB.subGrade(max);
  const title = `${hText(h)} · ${fText(f)} 청약 가점 — 통장 기간별 합계 (최대 ${max}점)`;
  const desc = `무주택기간 ${hRange(h)} ${hs}점 + 부양가족 ${fShort(f)} ${fs}점에 청약통장 가입기간 점수(6개월 미만 1점 ~ 15년 이상 17점)를 더하면 청약 가점은 ${min}~${max}점입니다. 통장 기간별 합계표와 84점 만점 계산 기준.`;
  const accRows = SB.ACCOUNT_TABLE.map((a) => ({ cls: a.score === SB.SUB_MAX.account ? 'on' : '', cells: [a.label, `${a.score}점`, `${hs + fs + a.score}점`] }));
  const body = `
${crumb([['/subscription/', '청약 가점'], [null, `${hText(h)} · ${fText(f)}`]])}
<h1 class="title">${hText(h)} · ${fText(f)}이면 청약 가점은</h1>
<p class="meta">주택공급에 관한 규칙 별표 1 · 84점 만점 (무주택기간 32 + 부양가족 35 + 통장 가입기간 17)</p>
${lead(`무주택기간 ${hRange(h)}은 ${hs}점, ${fText(f)}은 ${fs}점입니다. 여기에 청약통장 가입기간 점수를 더하면 통장 6개월 미만일 때 ${min}점, 15년 이상이면 ${max}점입니다. ${g.text}`)}
${hero({ label: '청약 가점 합계 (통장 15년 이상일 때)', value: max, unit: '점', sub: `무주택 ${hs}점 + 부양가족 ${fs}점 + 통장 17점 · 84점 만점의 ${pct(max / 84, 0)} · ${g.label}` })}
${tiles([{ label: '무주택기간 점수', value: hs }, { label: '부양가족 점수', value: fs }, { label: '통장 가입기간 (최대)', value: SB.SUB_MAX.account }])}
${section('통장 가입기간별 합계', `무주택 ${hs}점 + 부양가족 ${fs}점에 통장 점수를 더한 값`, table(['청약통장 가입기간', '통장 점수', '합계'], accRows))}
${section('무주택 기간이 바뀌면', `${fText(f)} · 통장 15년 이상 기준`, chips(neighbors(SUB_H, h, 2).map((x) => ({ label: hText(x), value: subTotal(x, f), href: subUrl(x, f), on: x === h }))))}
${section('부양가족이 바뀌면', `${hText(h)} · 통장 15년 이상 기준`, chips(neighbors(SUB_F, f, 2).map((x) => ({ label: fText(x), value: subTotal(h, x), href: subUrl(h, x), on: x === f }))))}
${ad()}
${section('알아두면 좋은 것', null, SUB_TIPS)}
${section('이어서 계산하기', null, list([{ href: '/subscription/', title: '청약 가점 계산기', sub: '무주택 기간·부양가족·통장 기간을 직접 넣기' }, { href: '/ltv/', title: 'LTV 대출 한도', sub: '당첨되면 얼마까지 빌릴 수 있나' }, { href: '/loan/', title: '대출 상환액', sub: '중도금·잔금 대출 월 상환액' }, { href: '/acquisition-tax/', title: '주택 취득세', sub: '입주할 때 내는 세금' }]))}
${SUB_NOTE}`;
  write(url, shell({ url, title, desc, body }));
}

function subIndex() {
  const url = '/subscription/';
  const inp = (id, label, value) => `<label class="ye-f"><span>${label}</span><input id="${id}" type="text" inputmode="numeric" value="${value}"></label>`;
  const ex = SB.subscriptionScore({ homelessYears: 10, family: 2, accountMonths: 180 });
  const gridRows = SUB_H.map((h) => ({ cells: [`${hRange(h)}<br><small>${SB.homelessScore(h)}점</small>`].concat(SUB_F.map((f) => `<a href="${subUrl(h, f)}">${subTotal(h, f)}</a>`)) }));
  const body = `
${crumb([['/', '홈'], [null, '청약 가점']])}
<h1 class="title">청약 가점 계산기 — 무주택기간·부양가족·통장 가입기간</h1>
<p class="meta">주택공급에 관한 규칙 별표 1 · 84점 만점 · 입력값은 이 기기 밖으로 나가지 않습니다</p>
${lead(`청약 가점은 무주택기간(최대 32점), 부양가족 수(최대 35점), 청약통장 가입기간(최대 17점)을 더한 84점 만점입니다. 무주택 10년·부양가족 2명·통장 15년이면 ${ex.homeless} + ${ex.family} + ${ex.account} = ${ex.total}점입니다. 4인 가족이 모든 항목을 채우면 69점, 1인 가구는 54점이 최대라 가족 수가 점수 상한을 정합니다.`)}
<form class="quick ye-form" id="sb-form">
<div class="ye-grid">
${inp('sb-years', '무주택 기간 (년)', 10)}
${inp('sb-family', '부양가족 수 (본인 제외)', 2)}
${inp('sb-acc-y', '청약통장 가입 (년)', 15)}
${inp('sb-acc-m', '+ 개월', 0)}
</div>
<div class="ye-checks"><label><input type="checkbox" id="sb-under30"> 만 30세 미만 미혼 (무주택 0점)</label><label><input type="checkbox" id="sb-owner"> 지금 주택 소유 (무주택 0점)</label></div>
</form>
<div class="hero"><div class="hero-label">청약 가점 합계</div><div class="hero-num"><span class="num" id="sb-total">0</span><span class="unit">점</span></div><div class="hero-sub" id="sb-sub">계산 중</div></div>
<div class="tiles"><div class="tile"><small>무주택기간 (32점)</small><span class="num" id="sb-h">0</span></div><div class="tile"><small>부양가족 (35점)</small><span class="num" id="sb-f">0</span></div><div class="tile"><small>통장 가입기간 (17점)</small><span class="num" id="sb-a">0</span></div></div>
<div id="sb-grade"></div>
<p class="sub" style="margin-top:8px"><a id="sb-link" href="${subUrl(10, 2)}">무주택 10년 · 부양가족 2명 표로 →</a></p>
${section('무주택기간 점수', '만 30세(그 전에 혼인했으면 혼인신고일)부터 · 최대 32점', table(['무주택기간', '점수'], SB.HOMELESS_TABLE.map((r) => ({ cells: [r.label, `${r.score}점`] }))))}
${section('부양가족 점수', '배우자 · 3년 이상 같은 등본의 직계존속 · 만 30세 미만 미혼 직계비속 · 최대 35점', table(['부양가족', '점수'], SB.FAMILY_TABLE.map((r) => ({ cells: [r.label, `${r.score}점`] }))))}
${section('청약통장 가입기간 점수', '최초 가입일 기준 · 최대 17점', table(['가입기간', '점수'], SB.ACCOUNT_TABLE.map((r) => ({ cells: [r.label, `${r.score}점`] }))))}
${ad()}
${section('무주택 × 부양가족 합계표', '통장 15년 이상(17점) 기준 · 칸을 누르면 통장 기간별 합계', table(['무주택기간'].concat(SUB_F.map((f) => `부양가족<br>${fShort(f)}`)), gridRows))}
${section('가구원 수별 최대 가점', '무주택 15년 · 통장 15년을 다 채웠을 때', table(['가구', '부양가족', '최대 가점'], [1, 2, 3, 4, 5, 6, 7].map((p) => ({ cells: [p === 7 ? '7인 이상' : `${p}인`, fShort(Math.min(6, p - 1)), `${SB.maxForFamily(p - 1)}점`] }))))}
${section('자주 묻는 것', null, `<div class="doc">
<p><b>만 30세 미만인데 무주택 점수가 0점인가요?</b> 미혼이면 그렇습니다. 만 30세가 되는 날부터 기간이 쌓이고, 30세 전에 혼인신고를 했다면 그날부터 셉니다.</p>
<p><b>부모님을 모시면 부양가족인가요?</b> 3년 이상 같은 주민등록에 계속 올라 있어야 하고, 부모님에게 집이 있으면 인정되지 않습니다. 배우자의 부모도 같습니다.</p>
<p><b>통장을 오래전에 만들고 납입을 안 했으면?</b> 가입기간 점수는 납입 횟수가 아니라 가입일 기준입니다. 다만 1순위 요건(가입 기간·납입 횟수·예치금)은 따로 갖춰야 합니다.</p>
<p><b>가점이 낮으면 방법이 없나요?</b> 추첨제 물량(규제지역 60㎡ 이하 60%, 비규제지역 85㎡ 초과 100%)과 생애최초·신혼부부·다자녀 특별공급을 노립니다. 특별공급은 소득·자산 요건이 있고 가점이 아닌 별도 기준으로 뽑습니다.</p>
</div>`)}
${section('알아두면 좋은 것', null, SUB_TIPS)}
${section('이어서 계산하기', null, list([{ href: '/ltv/', title: 'LTV 대출 한도', sub: '당첨되면 얼마까지 빌릴 수 있나' }, { href: '/dsr/', title: '연봉별 DSR 한도', sub: '내 연봉으로는 얼마까지' }, { href: '/acquisition-tax/', title: '주택 취득세', sub: '입주할 때 내는 세금' }]))}
${SUB_NOTE}`;
  write(url, shell({ url, title: `청약 가점 계산기 — 무주택기간·부양가족·통장 가입기간 84점 만점 (${YEAR}년)`, desc: '무주택 기간, 부양가족 수, 청약통장 가입기간을 넣으면 주택청약 가점(84점 만점)을 바로 계산합니다. 항목별 점수표, 무주택×부양가족 합계표, 가구원 수별 최대 가점과 부양가족 인정 기준.', body, scripts: ['/js/engine.js', '/js/subscription.js'] }));
}

/* ---------- 육아휴직 급여 ---------- */
const PL_WAGES = []; for (let m = 150; m <= 700; m += 50) PL_WAGES.push(m);
const plUrl = (m) => `/parental-leave/${m}/`;
const PL_NOTE = `<p class="note">2025년 1월 1일 시행 고용보험법 시행령(제95조·제95조의3) 기준입니다. 통상임금은 휴직 시작일 기준으로 회사가 신고한 금액으로 확정되고, 휴직 중 회사가 임금을 주면 급여가 조정될 수 있습니다. 참고용이며 정확한 금액은 고용24 모의계산과 관할 고용센터에서 확인하세요. <a href="/method/">계산 기준 보기</a></p>`;
const PL_TIPS = `<div class="doc">
<p><b>통상임금은 기본급에 고정수당을 더한 금액입니다.</b> 정기적·일률적·고정적으로 받는 기본급·직책수당·고정 식대 등이 들어가고, 성과급·연장수당·실비 변상은 빠집니다. 휴직 시작일 기준으로 회사가 고용보험에 신고한 금액이 기준입니다.</p>
<p><b>2025년부터 휴직 중에 전액 받습니다.</b> 급여의 25%를 복직 6개월 뒤에 주던 사후지급금 제도가 폐지되어, 매달 신청한 금액을 그대로 받습니다. 급여는 비과세라 소득세를 떼지 않습니다.</p>
<p><b>신청은 고용24에서.</b> 휴직 시작 1개월 뒤부터 매달(또는 한꺼번에) 고용24(고용보험) 누리집이나 고용센터에 신청하고, 회사가 육아휴직 확인서를 먼저 제출해야 합니다. 휴직이 끝난 날부터 12개월 안에 신청하지 않으면 받지 못합니다.</p>
<p><b>기간은 최대 18개월.</b> 자녀 1명당 부모 각각 12개월이 기본이고, 부모가 모두 3개월 이상 쓰면(2025년 2월 23일부터) 각각 18개월까지 쓸 수 있습니다. 나눠 쓸 수도 있습니다(분할 횟수 제한 있음).</p>
<p><b>6+6은 생후 18개월 안에.</b> 아이가 생후 18개월 이내일 때 부모가 모두(순서대로 또는 동시에) 육아휴직을 쓰면 각자 첫 6개월에 높은 상한이 적용됩니다. 두 번째로 쓰는 사람의 급여가 확정될 때 먼저 쓴 사람의 차액도 정산됩니다.</p>
<p><b>배우자 출산휴가는 20일.</b> 2025년 2월 23일부터 배우자 출산휴가가 10일에서 20일로 늘었고 통상임금 100%를 받습니다. 우선지원대상기업(중소기업)은 정부가 20일분을 지원하되 상한이 있습니다.</p>
<p><b>휴직 중 보험료.</b> 국민연금은 납부 예외를 신청할 수 있고, 건강보험료는 휴직 기간 동안 고지가 유예됐다가 복직 후 경감된 금액으로 정산됩니다.</p>
</div>`;

function plPage(w) {
  const W = w * 10000, url = plUrl(w);
  const r = PL.parentalLeave({ wage: W, months: 12 }), r18 = PL.parentalLeave({ wage: W, months: 18 });
  const b = PL.parentalLeave({ wage: W, months: 6, mode: 'both' }), bt = PL.bothTotal(W);
  const s = PL.parentalLeave({ wage: W, months: 12, mode: 'single' });
  const p1 = r.rows[0].pay, p4 = r.rows[3].pay, p7 = r.rows[6].pay;
  const title = `통상임금 ${manwon(W)} 육아휴직 급여 — 1~3개월 ${short(p1)} · 4~6개월 ${short(p4)} · 7개월~ ${short(p7)} (1년 ${manwon(r.total)})`;
  const desc = `통상임금 월 ${manwon(W)}이면 육아휴직 급여는 1~3개월 ${won(p1)}, 4~6개월 ${won(p4)}, 7개월부터 ${won(p7)}으로 12개월 합계 ${won(r.total)}입니다. 6+6 부모육아휴직제로 부모가 6개월씩 쓰면 두 사람 합계 ${won(bt.total)}, 한부모는 12개월 ${won(s.total)}. 2025년 기준 월별 표.`;
  const why = (x) => x.capped ? '상한액' : x.floored ? '하한 70만원' : `통상임금 × ${pct(x.rate, 0)}`;
  const normRows = r.rows.map((x) => ({ cells: [`${x.month}개월째`, pct(x.rate, 0), num(x.cap), num(x.pay), why(x)] }));
  normRows.push({ cells: ['13~18개월째<br><small>부모 모두 3개월 이상 사용 시</small>', pct(r18.rows[12].rate, 0), num(r18.rows[12].cap), num(r18.rows[12].pay), why(r18.rows[12])] });
  normRows.push({ cls: 'sum', cells: ['12개월 합계', '', '', num(r.total), `18개월이면 ${num(r18.total)}`] });
  const bothRows = b.rows.map((x) => ({ cells: [`${x.month}개월째`, num(x.cap), num(x.pay), num(x.pay * 2)] }));
  bothRows.push({ cls: 'sum', cells: ['6개월 합계', '', num(b.total), num(bt.total)] });
  const singleRows = [[1, 3], [4, 6], [7, 12]].map(([a, z]) => { const x = s.rows[a - 1]; return { cells: [`${a}~${z}개월째`, pct(x.rate, 0), num(x.cap), num(x.pay), num(x.pay * (z - a + 1))] }; });
  singleRows.push({ cls: 'sum', cells: ['12개월 합계', '', '', '', num(s.total)] });
  const body = `
${crumb([['/parental-leave/', '육아휴직 급여'], [null, `통상임금 ${manwon(W)}`]])}
<h1 class="title">통상임금 ${manwon(W)}이면 육아휴직 급여는</h1>
<p class="meta">2025년 고용보험법 시행령 · 1~3개월 100% (상한 250만) · 4~6개월 100% (상한 200만) · 7개월부터 80% (상한 160만) · 사후지급금 없이 휴직 중 전액</p>
${lead(`통상임금이 월 ${manwon(W)}이면 육아휴직 첫 3개월은 ${r.rows[0].capped ? '상한에 걸려' : '통상임금 전액인'} ${won(p1)}, 4~6개월은 ${won(p4)}, 7개월째부터는 ${won(p7)}을 받습니다. 12개월을 다 쓰면 ${won(r.total)}으로 같은 기간 통상임금 ${manwon(W * 12)}의 ${pct(r.total / (W * 12), 0)}입니다. 아이가 생후 18개월 안이고 부모가 모두 휴직하면 6+6 제도로 각자 첫 6개월에 ${won(b.total)}씩, 두 사람 합쳐 ${won(bt.total)}까지 받습니다. 급여는 비과세라 세금을 떼지 않습니다.`)}
${hero({ label: '12개월 육아휴직 급여 합계', value: r.total, sub: `월평균 ${won(r.average)} · 통상임금 12개월분의 ${pct(r.total / (W * 12), 0)} · 소득세 없음` })}
${tiles([{ label: '1~3개월 (월)', value: p1 }, { label: '4~6개월 (월)', value: p4 }, { label: '7개월부터 (월)', value: p7 }])}
${section('월별 급여 (일반 육아휴직)', `통상임금 ${manwon(W)} · 원`, table(['개월', '비율', '상한', '급여', '적용'], normRows))}
${section('6+6 부모육아휴직제 (부모 모두 사용)', '생후 18개월 안에 부모가 모두 휴직하면 각자 첫 6개월 100% · 상한 250→450만원 · 두 사람 통상임금이 같다고 가정', table(['개월', '상한', '한 사람', '두 사람 합계'], bothRows))}
${section('한부모', '1~3개월 100% (상한 300만) · 4개월부터 일반과 동일', table(['개월', '비율', '상한', '월 급여', '구간 합계'], singleRows))}
${section('통상임금이 바뀌면', '일반 육아휴직 12개월 합계', chips(neighbors(PL_WAGES, w, 3).map((x) => ({ label: short(x * 10000), value: PL.parentalLeave({ wage: x * 10000, months: 12 }).total, href: plUrl(x), on: x === w }))))}
${ad()}
${section('알아두면 좋은 것', null, PL_TIPS)}
${section('이어서 계산하기', null, list([{ href: '/parental-leave/', title: '육아휴직 급여 계산기', sub: '통상임금·개월·유형을 직접 넣기' }, { href: '/baby-benefit/', title: '출산·양육 지원금 총정리', sub: '첫만남이용권·부모급여·아동수당은 얼마' }, { href: monthlyUrl(nearest(MONTHLIES, w)), title: `월급 ${manwon(nearest(MONTHLIES, w) * 10000)} 실수령액`, sub: '복직하면 손에 쥐는 돈' }]))}
${PL_NOTE}`;
  write(url, shell({ url, title, desc, body }));
}

function plIndex() {
  const url = '/parental-leave/';
  const inp = (id, label, value) => `<label class="ye-f"><span>${label}</span><input id="${id}" type="text" inputmode="numeric" value="${value}"></label>`;
  const rows = PL_WAGES.map((w) => { const W = w * 10000, r = PL.parentalLeave({ wage: W, months: 12 }); return { cells: [`<a href="${plUrl(w)}">${manwon(W)}</a>`, num(r.rows[0].pay), num(r.rows[3].pay), num(r.rows[6].pay), num(r.total), num(PL.bothTotal(W).total)] }; });
  const ex = PL.parentalLeave({ wage: 3000000, months: 12 });
  const body = `
${crumb([['/', '홈'], [null, '육아휴직 급여']])}
<h1 class="title">육아휴직 급여 계산기 — 통상임금별 월 급여와 12개월 총액</h1>
<p class="meta">2025년 1월 1일 시행 고용보험법 시행령 · 일반 · 6+6 부모육아휴직제 · 한부모 · 입력값은 이 기기 밖으로 나가지 않습니다</p>
${lead(`육아휴직 급여는 통상임금의 100%(1~3개월 상한 250만원, 4~6개월 상한 200만원), 7개월째부터 80%(상한 160만원)이고 하한은 월 70만원입니다. 통상임금 300만원이면 12개월에 ${won(ex.total)}, 부모가 모두 6개월씩 쓰는 6+6 제도로는 두 사람 합쳐 ${won(PL.bothTotal(3000000).total)}입니다. 2025년부터 사후지급금이 없어져 휴직 중에 전액 받고, 급여는 비과세입니다.`)}
<form class="quick ye-form" id="pl-form">
<div class="ye-grid">
${inp('pl-wage', '월 통상임금 (만원)', 300)}
${inp('pl-months', '사용 개월 (1~18)', 12)}
<label class="ye-f"><span>유형</span><select id="pl-mode"><option value="normal">일반 육아휴직</option><option value="both">6+6 부모 함께 (생후 18개월 이내)</option><option value="single">한부모</option></select></label>
</div>
</form>
<div class="hero"><div class="hero-label">육아휴직 급여 합계</div><div class="hero-num"><span class="num" id="pl-total">0</span><span class="unit">원</span></div><div class="hero-sub" id="pl-sub">계산 중</div></div>
<div class="tiles"><div class="tile"><small>첫 달</small><span class="num" id="pl-first">0</span></div><div class="tile"><small>마지막 달</small><span class="num" id="pl-last">0</span></div><div class="tile"><small>6+6 두 사람 합계</small><span class="num" id="pl-both">0</span></div></div>
<div id="pl-tips"></div>
<div class="ledger"><div class="lg-head"><h2>월별 급여</h2><span>원</span></div><div id="pl-rows"></div></div>
${section('통상임금별 급여표', '원 · 금액을 누르면 월별 표와 6+6·한부모 계산', table(['통상임금', '1~3개월 (월)', '4~6개월 (월)', '7개월~ (월)', '12개월 합계', '6+6 두 사람 합계'], rows))}
${ad()}
${section('상한액 한눈에', '2025년 1월 1일 시행', table(['유형', '기간', '비율', '월 상한'], [
  { cells: ['일반', '1~3개월', '100%', '2,500,000'] }, { cells: ['일반', '4~6개월', '100%', '2,000,000'] }, { cells: ['일반', '7개월부터', '80%', '1,600,000'] },
  { cells: ['6+6 부모 함께', '1~2개월', '100%', '2,500,000'] }, { cells: ['6+6 부모 함께', '3개월', '100%', '3,000,000'] }, { cells: ['6+6 부모 함께', '4개월', '100%', '3,500,000'] }, { cells: ['6+6 부모 함께', '5개월', '100%', '4,000,000'] }, { cells: ['6+6 부모 함께', '6개월', '100%', '4,500,000'] },
  { cells: ['한부모', '1~3개월', '100%', '3,000,000'] }, { cells: ['한부모', '4개월부터', '일반과 동일', '2,000,000 → 1,600,000'] },
  { cells: ['하한', '전 기간', '—', '700,000'] },
]))}
${section('자주 묻는 것', null, `<div class="doc">
<p><b>통상임금이 뭔가요?</b> 기본급과 정기적·일률적·고정적으로 받는 수당(직책수당·고정 식대 등)을 더한 월액입니다. 성과급·연장수당·실비는 빠집니다. 회사 급여명세서의 '통상임금'이나 인사팀에 확인하세요.</p>
<p><b>급여에서 세금을 떼나요?</b> 아닙니다. 육아휴직 급여는 소득세법상 비과세라 세금이 없고, 회사 급여가 아니라 고용보험에서 나옵니다.</p>
<p><b>부부가 같이 써야만 18개월인가요?</b> 기본은 각각 12개월입니다. 부모가 모두 3개월 이상 쓰면 각각 18개월까지 늘어나고, 한부모와 중증 장애아동 부모도 18개월입니다.</p>
<p><b>배우자 출산휴가는요?</b> 2025년 2월 23일부터 20일이며 통상임금 100%입니다. 중소기업은 정부가 20일분을 지원합니다(상한 있음). 출산 후 120일 안에 써야 하고 나눠 쓸 수 있습니다.</p>
</div>`)}
${section('알아두면 좋은 것', null, PL_TIPS)}
${section('이어서 계산하기', null, list([{ href: '/baby-benefit/', title: '출산·양육 지원금 총정리', sub: '첫만남이용권·부모급여·아동수당은 얼마' }, { href: '/monthly/', title: '월급 실수령액표', sub: '복직하면 손에 쥐는 돈' }, { href: '/unemployment/', title: '실업급여표', sub: '같은 고용보험에서 나오는 구직급여' }]))}
${PL_NOTE}`;
  write(url, shell({ url, title: `육아휴직 급여 계산기 — 통상임금별 월 급여·12개월 총액·6+6 부모육아휴직제 (2025년)`, desc: '통상임금과 사용 개월을 넣으면 육아휴직 급여를 월별로 계산합니다. 1~3개월 상한 250만, 4~6개월 200만, 7개월부터 80% 160만, 6+6 부모육아휴직제 상한 450만, 한부모 300만, 하한 70만원. 2025년 시행령 기준.', body, scripts: ['/js/engine.js', '/js/parental.js'] }));
}

function babyPage() {
  const url = '/baby-benefit/';
  const first = PL.babyBenefits('2025-01-01', 1, '2025-01-01'), second = PL.babyBenefits('2025-01-01', 2, '2025-01-01');
  const body = `
${crumb([['/', '홈'], [null, '출산·양육 지원금']])}
<h1 class="title">출산·양육 지원금 총정리 — 첫만남이용권·부모급여·아동수당</h1>
<p class="meta">2025년 전국 공통 지원 · 아기 생년월일을 넣으면 이번 달 받는 것과 만 2세까지 총액 · 입력값은 이 기기 밖으로 나가지 않습니다</p>
${lead(`아이가 태어나면 첫만남이용권 200만원(둘째부터 300만원)을 바우처로 받고, 0세에는 부모급여 월 100만원과 아동수당 월 10만원, 1세에는 부모급여 월 50만원과 아동수당 10만원을 현금으로 받습니다. 첫째 기준 만 2세까지 ${won(first.total24)}, 둘째는 ${won(second.total24)}입니다. 아동수당은 만 8세 전까지 이어지고, 어린이집·유치원에 다니지 않으면 24개월부터 양육수당 월 10만원이 더 붙습니다. 지역 출산장려금은 여기에 별도입니다.`)}
<form class="quick ye-form" id="bb-form">
<div class="ye-grid">
<label class="ye-f"><span>아기 생년월일 (출산 예정일도 가능)</span><input id="bb-birth" type="date" value="${BUILD_ISO}"></label>
<label class="ye-f"><span>출생 순위</span><select id="bb-order"><option value="1">첫째</option><option value="2">둘째 이상</option></select></label>
</div>
</form>
<div class="hero"><div class="hero-label">이번 달 받는 현금 지원</div><div class="hero-num"><span class="num" id="bb-monthly">0</span><span class="unit">원</span></div><div class="hero-sub" id="bb-sub">계산 중</div></div>
<div class="tiles tiles-wide"><div class="tile"><small>첫만남이용권 (한 번)</small><span class="num" id="bb-first">0</span></div><div class="tile"><small>만 2세까지 총액</small><span class="num" id="bb-total24">0</span></div><div class="tile"><small>앞으로 남은 것 (만 2세까지)</small><span class="num" id="bb-remaining">0</span></div></div>
<div class="tbl"><table><thead><tr><th>시기</th><th>기간</th><th>월 지급</th><th>구간 합계</th></tr></thead><tbody id="bb-timeline"></tbody></table></div>
<p class="sub" style="margin-top:8px">현금 지원(부모급여 + 아동수당)만 더한 값입니다. 첫만남이용권·양육수당·지역 출산장려금은 별도.</p>
${section('지원금 총정리', '2025년 · 소득 조건 없이 전국 공통', table(['항목', '금액', '기간', '신청처'], PL.BENEFITS.map((b) => ({ cells: [`<b>${b.name}</b><br><small>${b.note}</small>`, b.amount, b.when, b.where] }))))}
${ad()}
${section('만 2세까지 얼마나 받나', '첫만남이용권 + 부모급여 24개월 + 아동수당 24개월', table(['항목', '첫째', '둘째 이상'], [
  { cells: ['첫만남이용권', num(first.firstMeeting), num(second.firstMeeting)] },
  { cells: ['부모급여 0세 (100만 × 12)', num(PL.PARENT_PAY.age0 * 12), num(PL.PARENT_PAY.age0 * 12)] },
  { cells: ['부모급여 1세 (50만 × 12)', num(PL.PARENT_PAY.age1 * 12), num(PL.PARENT_PAY.age1 * 12)] },
  { cells: ['아동수당 (10만 × 24)', num(first.childTo24), num(second.childTo24)] },
  { cls: 'sum', cells: ['만 2세까지 합계', num(first.total24), num(second.total24)] },
  { cells: ['만 8세까지 아동수당 포함', num(first.total96), num(second.total96)] },
]))}
${section('자주 묻는 것', null, `<div class="doc">
<p><b>어린이집에 보내면 부모급여를 못 받나요?</b> 받습니다. 다만 보육료 바우처(0세반 기준 월 54만원 안팎)를 먼저 빼고 차액을 현금으로 줍니다. 0세는 100만원 − 보육료, 1세는 50만원 − 보육료가 남으면 그만큼 받습니다.</p>
<p><b>언제까지 신청해야 하나요?</b> 부모급여·아동수당은 출생 후 60일 안에 신청하면 출생월부터 소급됩니다. 60일이 지나면 신청한 달부터입니다. 출생신고 때 주민센터의 '행복출산 원스톱 서비스'로 한 번에 신청할 수 있습니다.</p>
<p><b>첫만남이용권은 현금인가요?</b> 국민행복카드에 들어오는 바우처(포인트)입니다. 출생 후 1년 안에 써야 하고 유흥·사행업종 외에는 대부분 쓸 수 있습니다.</p>
<p><b>지역 출산장려금은 얼마인가요?</b> 지자체마다 다릅니다. 첫째 수십만원부터 셋째 이상 수천만원까지 있고, 거주 기간 조건이 붙는 곳이 많습니다. 정부24에서 '출산지원금'으로 검색하거나 주민센터에 물어보세요.</p>
<p><b>양육수당과 아동수당은 다른가요?</b> 아동수당은 만 8세 전까지 모든 아동에게, 양육수당은 어린이집·유치원에 다니지 않는 24~86개월 아동에게 줍니다. 둘 다 받을 수 있습니다.</p>
</div>`)}
${section('이어서 계산하기', null, list([{ href: '/parental-leave/', title: '육아휴직 급여 계산기', sub: '통상임금별 월 급여와 6+6 부모육아휴직제' }, { href: '/yearend/', title: '연말정산 미리보기', sub: '자녀세액공제까지 넣어 환급 예상' }, { href: '/goal/', title: '목돈 모으기', sub: '지원금을 모으면 언제 1,000만원' }]))}
<p class="note">2025년 기준이며 지자체 지원(출산장려금·산후조리비 등)은 별도입니다. 부모급여·아동수당 금액과 첫만남이용권은 보건복지부 고시로 해마다 바뀔 수 있고, 어린이집 이용 시 부모급여는 보육료를 뺀 차액만 현금으로 받습니다. 참고용이며 신청과 확정 금액은 복지로·주민센터에서 확인하세요. <a href="/method/">계산 기준 보기</a></p>`;
  write(url, shell({ url, title: `출산·양육 지원금 총정리 — 첫만남이용권·부모급여·아동수당 만 2세까지 ${manwon(first.total24)} (2025년)`, desc: `아기 생년월일을 넣으면 이번 달 받는 부모급여·아동수당과 만 2세까지 총액을 계산합니다. 첫만남이용권 200만(둘째 300만), 부모급여 0세 월 100만·1세 월 50만, 아동수당 월 10만, 양육수당, 임신·출산 진료비 바우처까지 금액·기간·신청처 한 표.`, body, scripts: ['/js/engine.js', '/js/parental.js'] }));
}

/* ---------- 전기요금 ---------- */
const EL_KWH = []; for (let k = 100; k <= 1000; k += 50) EL_KWH.push(k);
const elUrl = (k) => `/electric/${k}/`;
const EL_NOTE = `<p class="note">한국전력 주택용 전기요금표(저압·고압, ${EL.ELECTRIC_ASOF}) 기준입니다. 기후환경요금 9원/kWh, 연료비조정요금 +5원/kWh, 부가가치세 10%, 전력산업기반기금 2.7%(2025년 7월부터)를 반영했고 복지할인·대가족할인·출산가구할인, TV수신료 2,500원, 검침일에 따른 계절 안분은 넣지 않았습니다. 참고용이며 실제 고지서와 다를 수 있습니다. <a href="/method/">계산 기준 보기</a></p>`;
const tierCell = (b, t) => { const r = b.rows.find((x) => x.tier === t); return r ? `${num(r.kwh)}kWh · ${num(r.amount)}` : '—'; };
const elBreakdown = (o, s) => {
  const rows = [{ cells: ['기본요금', `${o.tier}단계 · ${num(o.base)}`, `${s.tier}단계 · ${num(s.base)}`] }];
  for (const t of [1, 2, 3, 4]) if (o.rows.some((x) => x.tier === t) || s.rows.some((x) => x.tier === t)) rows.push({ cells: [t === 4 ? '슈퍼유저 (1,000kWh 초과분)' : `${t}단계 전력량요금`, tierCell(o, t), tierCell(s, t)] });
  rows.push({ cells: ['기후환경요금 (9원/kWh)', num(o.climate), num(s.climate)] }, { cells: ['연료비조정요금 (5원/kWh)', num(o.fuel), num(s.fuel)] }, { cls: 'sum', cells: ['전기요금계', num(o.subtotal), num(s.subtotal)] }, { cells: ['부가가치세 10%', num(o.vat), num(s.vat)] }, { cells: ['전력산업기반기금 2.7%', num(o.fund), num(s.fund)] }, { cls: 'sum', cells: ['청구액 (10원 미만 절사)', num(o.total), num(s.total)] });
  return rows;
};
const perKwhAll = (rate) => Math.round((rate + EL.CLIMATE + EL.FUEL) * (1 + EL.VAT + EL.FUND));   /* 부가세·기금까지 얹은 kWh당 어림 */

function elPage(k) {
  const o = EL.electricBill(k), s = EL.electricBill(k, { season: 'summer' }), ho = EL.electricBill(k, { voltage: 'high' }), hs = EL.electricBill(k, { season: 'summer', voltage: 'high' }), url = elUrl(k);
  const title = `전기요금 ${num(k)}kWh 얼마? — 기타계절 ${won(o.total)} · 여름(7~8월) ${won(s.total)} (주택용 저압 누진제)`;
  const desc = `한 달 ${num(k)}kWh를 쓰면 주택용 저압 전기요금은 기타계절(1~6월·9~12월) ${won(o.total)}, 여름(7~8월) ${won(s.total)}입니다. 기본요금·누진 단계별 전력량요금·기후환경요금·연료비조정요금에 부가세 10%와 전력산업기반기금 2.7%를 더한 청구액과 계산 흐름, 고압 요금.`;
  const same = o.total === s.total;
  const usage = [['벽걸이 에어컨 (0.7kW)', 0.7], ['스탠드 에어컨 (1.8kW)', 1.8], ['전기히터 (1.5kW)', 1.5], ['데스크톱 PC (0.15kW)', 0.15]].map(([name, kw]) => { const h = k / kw; return { cells: [name, `${num(h)}시간`, h / 30 <= 24 ? `하루 ${(Math.round(h / 3) / 10).toString().replace(/\.0$/, '')}시간씩 한 달` : '한 달 내내 켜 두어도 남음'] }; });
  const body = `
${crumb([['/electric/', '전기요금'], [null, `${num(k)}kWh`]])}
<h1 class="title">한 달 ${num(k)}kWh 쓰면 전기요금은</h1>
<p class="meta">주택용 저압 · 누진 3단계 · 부가세 10% · 전력산업기반기금 2.7% 포함 · ${EL.ELECTRIC_ASOF} 한전 요금표</p>
${lead(`${num(k)}kWh는 기타계절(1~6월·9~12월) 기준 ${o.tier}단계라 기본요금 ${won(o.base)}에 전력량요금 ${won(o.energy)}, 기후환경요금 ${won(o.climate)}, 연료비조정요금 ${won(o.fuel)}을 더한 전기요금계가 ${won(o.subtotal)}이고, 부가세 ${won(o.vat)}과 기금 ${won(o.fund)}을 얹은 청구액은 ${won(o.total)}입니다. ${same ? `여름(7~8월)에도 1단계 안이라 요금은 같은 ${won(s.total)}입니다.` : `여름(7~8월)에는 구간이 300·450kWh로 넓어져 ${s.tier}단계가 되고 청구액은 ${won(s.total)}으로 ${won(o.total - s.total)} 줄어듭니다.`} kWh당 평균 ${won(o.perKwh)}입니다.`)}
${hero({ label: '청구액 (기타계절 · 1~6월, 9~12월)', value: o.total, sub: `${o.tier}단계 · kWh당 평균 ${won(o.perKwh)} · 여름(7~8월)에는 ${won(s.total)}` })}
${tiles([{ label: '여름 (7~8월)', value: s.total }, { label: '누진 단계 (기타 / 여름)', value: `${o.tier} / ${s.tier}` }, { label: 'kWh당 평균', value: o.perKwh }])}
${section('계산 흐름', `${num(k)}kWh · 주택용 저압 · 원`, table(['항목', '기타계절', '여름 (7~8월)'], elBreakdown(o, s)))}
${section('주택용 고압이면', '아파트 단지 고압 계약 (관리비에 포함되는 경우)', tiles([{ label: '기타계절', value: ho.total }, { label: '여름 (7~8월)', value: hs.total }, { label: '저압과 차이 (기타계절)', value: o.total - ho.total }]))}
${section('이만큼은 어떤 사용량?', '정격 소비전력 기준 어림 · 실제는 설정 온도·인버터·절전 모드에 따라 절반 이하로 줄기도 합니다', table(['기기', `${num(k)}kWh로 켤 수 있는 시간`, '어림'], usage))}
${section('사용량이 바뀌면', '기타계절 청구액', chips(neighbors(EL_KWH, k, 3).map((x) => ({ label: `${num(x)}kWh`, value: EL.electricBill(x).total, href: elUrl(x), on: x === k }))))}
${ad()}
${section('알아두면 좋은 것', null, `<div class="doc">
<p><b>3단계에 들어가면 kWh당 약 ${won(perKwhAll(EL.PLANS.low.energy[2]))}.</b> 기타계절 400kWh(여름 450kWh)를 넘는 사용량은 kWh당 307.3원에 기후환경 9원·연료비 5원이 붙어 321.3원, 부가세와 기금까지 더하면 약 ${won(perKwhAll(EL.PLANS.low.energy[2]))}입니다. 1단계의 약 ${won(perKwhAll(EL.PLANS.low.energy[0]))}보다 ${(perKwhAll(EL.PLANS.low.energy[2]) / perKwhAll(EL.PLANS.low.energy[0])).toFixed(1)}배라 마지막 몇십 kWh를 줄이는 효과가 가장 큽니다.</p>
<p><b>여름엔 구간이 넓어집니다.</b> 7~8월은 1단계 300kWh·2단계 450kWh까지로 완화됩니다. ${same ? `${num(k)}kWh는 두 계절 모두 1단계라 차이가 없지만, 사용량이 200kWh를 넘으면 여름 요금이 더 쌉니다.` : `같은 ${num(k)}kWh라도 여름 요금이 ${won(s.total)}으로 기타계절보다 ${won(o.total - s.total)} 적습니다.`} 1,000kWh를 넘으면 여름·겨울에는 초과분에 슈퍼유저 요금 736.2원이 붙습니다.</p>
<p><b>검침일에 따라 달라집니다.</b> 한전은 검침일부터 다음 검침일 전날까지를 한 달로 봅니다. 여름 요금은 7월 1일~8월 31일 사용분에만 적용되어 검침 기간이 걸쳐 있으면 일수로 나눠 계산합니다.</p>
<p><b>복지할인과 TV수신료는 별도.</b> 장애인·기초생활수급자·다자녀(3자녀 이상)·대가족(5인 이상)·출산가구(3년 이내)는 한전에 신청하면 정액 또는 30% 할인을 받습니다(월 한도 있음). TV수신료 2,500원은 2023년 7월부터 전기요금과 따로 고지되어 이 계산에 넣지 않았습니다. 필수사용량 보장공제는 2024년에 없어졌습니다.</p>
</div>`)}
${section('이어서 계산하기', null, list([{ href: '/electric/', title: '전기요금 계산기', sub: '사용량·계절·저압/고압을 직접 넣기' }, { href: '/time/', title: '내 시간으로 사는 물건', sub: '전기요금은 몇 시간 일한 값인가' }, { href: '/monthly/', title: '월급 실수령액표', sub: '한 달 손에 쥐는 돈' }]))}
${EL_NOTE}`;
  write(url, shell({ url, title, desc, body }));
}

function elIndex() {
  const url = '/electric/';
  const rows = EL_KWH.map((k) => { const o = EL.electricBill(k), s = EL.electricBill(k, { season: 'summer' }); return { cells: [`<a href="${elUrl(k)}">${num(k)}kWh</a>`, num(o.total), num(s.total), `${o.tier} / ${s.tier}`, num(o.perKwh)] }; });
  const L = EL.PLANS.low, H = EL.PLANS.high;
  const rateRows = [0, 1, 2].map((i) => ({ cells: [`${i + 1}단계`, i === 0 ? '0~200 / 0~300' : i === 1 ? '201~400 / 301~450' : '401~ / 451~', num(L.base[i]), L.energy[i].toFixed(1), num(H.base[i]), H.energy[i].toFixed(1)] }));
  rateRows.push({ cells: ['슈퍼유저', '1,000 초과분 (여름·겨울)', '—', L.superUser.toFixed(1), '—', H.superUser.toFixed(1)] });
  const body = `
${crumb([['/', '홈'], [null, '전기요금']])}
<h1 class="title">전기요금 계산기 — 주택용 누진제 kWh별 청구액</h1>
<p class="meta">한국전력 주택용 저압·고압 요금표 (${EL.ELECTRIC_ASOF}) · 기타계절·여름·겨울 구간 · 부가세·전력산업기반기금 포함 · 입력값은 이 기기 밖으로 나가지 않습니다</p>
${lead(`주택용 전기요금은 쓸수록 kWh당 단가가 오르는 3단계 누진제입니다. 기타계절은 200kWh까지 120원, 400kWh까지 214.6원, 그 위로 307.3원이고 여름(7~8월)에는 구간이 300·450kWh로 넓어집니다. 한 달 300kWh면 ${won(EL.electricBill(300).total)}, 400kWh면 ${won(EL.electricBill(400).total)}, 500kWh면 ${won(EL.electricBill(500).total)}(여름 ${won(EL.electricBill(500, { season: 'summer' }).total)})입니다. 여기에 기후환경요금 9원과 연료비조정요금 5원이 kWh마다 붙고, 부가세 10%와 전력산업기반기금 2.7%가 더해집니다.`)}
<form class="quick ye-form" id="el-form">
<div class="ye-grid">
<label class="ye-f"><span>한 달 사용량 (kWh)</span><input id="el-kwh" type="text" inputmode="numeric" value="300"></label>
<label class="ye-f"><span>계절</span><select id="el-season"><option value="other">기타계절 (1~6월 · 9~12월)</option><option value="summer">여름 (7~8월)</option><option value="winter">겨울 (12~2월)</option></select></label>
<label class="ye-f"><span>계약</span><select id="el-voltage"><option value="low">주택용 저압 (일반 주택 · 대부분)</option><option value="high">주택용 고압 (아파트 단지 계약)</option></select></label>
</div>
</form>
<div class="hero"><div class="hero-label">청구액</div><div class="hero-num"><span class="num" id="el-total">0</span><span class="unit">원</span></div><div class="hero-sub" id="el-sub">계산 중</div></div>
<div class="tiles"><div class="tile"><small>누진 단계</small><span class="num" id="el-tier">-</span></div><div class="tile"><small>kWh당 평균</small><span class="num" id="el-per">0</span></div><div class="tile"><small id="el-other-label">여름이면</small><span class="num" id="el-other">0</span></div></div>
<div class="ledger"><div class="lg-head"><h2>계산 흐름</h2><span>원</span></div><div id="el-rows"></div></div>
<p class="sub" style="margin-top:8px"><a id="el-link" href="${elUrl(300)}">300kWh 페이지로 →</a></p>
${section('사용량별 청구액', '주택용 저압 · 원 · 사용량을 누르면 계산 흐름과 고압 요금', table(['사용량', '기타계절', '여름 (7~8월)', '단계 (기타 / 여름)', 'kWh당 (기타)'], rows))}
${ad()}
${section('요금표', `${EL.ELECTRIC_ASOF} 주택용 · 기본요금 원/호 · 전력량요금 원/kWh · 구간은 기타계절 / 여름`, table(['단계', '구간 (kWh)', '저압 기본', '저압 전력량', '고압 기본', '고압 전력량'], rateRows))}
<p class="sub" style="margin-top:8px">모든 사용량에 기후환경요금 9.0원/kWh와 연료비조정요금 +5.0원/kWh가 더해집니다.</p>
${section('자주 묻는 것', null, `<div class="doc">
<p><b>누진제는 왜 있나요?</b> 주택용에만 있는 제도로, 많이 쓸수록 kWh당 단가를 올려 절약을 유도합니다. 2016년 6단계에서 3단계로 줄었고, 여름에는 구간을 넓혀 부담을 줄입니다.</p>
<p><b>여름 요금이 더 싼 건가요?</b> 단가는 같고 구간만 넓어집니다. 같은 400kWh라도 기타계절은 2단계 끝(다음 kWh부터 3단계)이지만 여름은 2단계 안이라 기본요금이 낮고, 450kWh를 넘어야 3단계입니다.</p>
<p><b>1,000kWh 넘게 쓰면?</b> 여름(7~8월)과 겨울(12~2월)에는 1,000kWh 초과분에 슈퍼유저 요금 736.2원/kWh가 붙습니다. 3단계 307.3원의 2.4배입니다.</p>
<p><b>고지서 금액과 다른데요?</b> 검침일이 월초가 아니면 두 달의 요금이 일수로 섞이고, 복지할인·TV수신료·연체료가 더해지거나 빠집니다. 아파트는 단지 전체가 고압으로 계약해 관리비에 나눠 담기도 합니다.</p>
<p><b>저압과 고압 중 뭐가 내 집인가요?</b> 단독·다세대·빌라 대부분은 저압입니다. 아파트는 단지가 한전과 고압으로 계약하고 관리사무소가 세대별로 나누는 곳이 많습니다. 관리비 고지서의 '전기요금' 항목에 계약 종별이 적혀 있습니다.</p>
</div>`)}
${section('이어서 계산하기', null, list([{ href: '/time/', title: '내 시간으로 사는 물건', sub: '전기요금은 몇 시간 일한 값인가' }, { href: '/monthly/', title: '월급 실수령액표', sub: '한 달 손에 쥐는 돈' }, { href: '/savings/', title: '적금 세후 이자', sub: '아낀 전기요금을 모으면' }]))}
${EL_NOTE}`;
  write(url, shell({ url, title: `전기요금 계산기 — 주택용 누진제 100~1,000kWh 청구액 (여름·기타계절, ${EL.ELECTRIC_ASOF})`, desc: '한 달 사용량(kWh)과 계절, 저압·고압을 넣으면 기본요금·누진 단계별 전력량요금·기후환경요금·연료비조정요금·부가세·전력산업기반기금까지 계산해 청구액을 보여줍니다. 100~1,000kWh 요금표.', body, scripts: ['/js/engine.js', '/js/electric.js'] }));
}

/* ---------- 근로장려금·자녀장려금 ---------- */
const range = (a, b, step) => { const out = []; for (let v = a; v <= b; v += step) out.push(v); return out; };
const EITC_TYPES = ['single', 'one', 'dual'];
const EITC_WAGES = { single: range(500, 2100, 100), one: range(500, 3100, 100), dual: range(500, 3700, 100) };
const eitcUrl = (t, m) => m ? `/eitc/${t}/${m}/` : `/eitc/${t}/`;
const EITC_NOTE = `<p class="note">조세특례제한법 제100조의2~제100조의13(${EI.EITC_ASOF} 기준)의 산식으로 계산한 예상액입니다. 실제 지급액은 국세청이 부부 합산 총소득, 가구원 재산(전년 6월 1일 기준), 사업소득의 업종별 조정률, 다른 거주자의 부양자녀 여부를 심사해 확정합니다. 참고용이며 홈택스 '장려금 미리보기'와 국세청 장려금 상담센터(1566-3636)에서 확인하세요. <a href="/method/">계산 기준 보기</a></p>`;
const EITC_TIPS = `<div class="doc">
<p><b>신청은 5월, 지급은 8월 말.</b> 정기 신청 기간은 5월 1일~31일이고 심사를 거쳐 8월 말에 신청할 때 적은 계좌로 들어옵니다. 기간을 놓치면 6월 1일~11월 30일에 기한 후 신청을 할 수 있지만 산정액의 5%가 깎이고 지급도 신청한 달부터 넉 달 안으로 늦어집니다.</p>
<p><b>근로소득만 있으면 반기 신청도 됩니다.</b> 상반기 소득분은 9월 1~15일에 신청해 12월 말에 산정액의 35%를 먼저 받고, 하반기분은 다음 해 3월 1~15일에 신청해 6월 말에 나머지를 정산받습니다. 사업소득이나 종교인소득이 있으면 5월 정기 신청만 할 수 있습니다.</p>
<p><b>신청 방법.</b> 국세청이 5월 초 안내문(모바일·우편)을 보내면 홈택스·손택스(앱)·ARS 1544-9944에서 개별인증번호로 1~2분 만에 끝납니다. 안내문이 없어도 요건이 되면 홈택스 '장려금 신청'에서 직접 신청할 수 있습니다. 심사 결과와 지급 예정액은 홈택스 '장려금 심사 진행 상황'에서 봅니다.</p>
<p><b>'총급여액 등'은 근로소득 총급여 + 사업소득 수입금액 × 업종별 조정률 + 종교인소득입니다.</b> 회사 원천징수영수증의 총급여(비과세 제외)가 기준이고, 신청 자격을 볼 때는 여기에 이자·배당·연금·기타소득까지 더한 부부 합산 총소득이 단독 2,200만, 홑벌이 3,200만, 맞벌이 3,800만원 미만이어야 합니다(자녀장려금은 7,000만원 미만).</p>
<p><b>재산은 부채를 빼지 않고 더합니다.</b> 전년 6월 1일 기준 가구원 전체의 주택·토지·건물(시가표준액), 승용차, 전세보증금, 예금·주식·보험 등을 더한 금액이 2.4억원 미만이어야 하고, 1.7억원 이상이면 절반만 받습니다. 대출이 있어도 빼 주지 않으니 전세보증금이 큰 가구는 재산 요건에 걸리기 쉽습니다.</p>
<p><b>받지 못하는 경우.</b> 전년 12월 31일 기준 대한민국 국적이 아닌 사람(배우자나 부양자녀가 한국 국적이면 가능), 다른 거주자의 부양자녀인 사람, 변호사·의사·회계사 같은 전문직 사업자는 대상에서 빠집니다.</p>
</div>`;
const eitcPhaseRow = (T, r) => r.phase === 'in' ? [`점증 구간 (${manwon(T.phaseIn)} 미만)`, num(r.workRaw), `총급여 × ${Math.round(T.max / 10000)}/${Math.round(T.phaseIn / 10000)}`]
  : r.phase === 'flat' ? ['평탄 구간 (최대 지급)', num(r.workRaw), `${manwon(T.phaseIn)} 이상 ${manwon(T.flatTo)} 미만`]
  : r.phase === 'out' ? [`점감 구간 (${manwon(T.flatTo)} 이상 ${manwon(T.limit)} 미만)`, num(r.workRaw), `${manwon(T.max)} − (총급여 − ${manwon(T.flatTo)}) × ${Math.round(T.max / 10000)}/${Math.round((T.limit - T.flatTo) / 10000).toLocaleString('ko-KR')}`]
  : [`총급여 ${manwon(T.limit)} 이상`, '0', '근로장려금 대상 아님'];
const eitcPhaseLabel = (p) => p === 'in' ? '점증' : p === 'flat' ? '최대' : p === 'out' ? '점감' : '대상 아님';
const eitcReqRows = (T) => [
  { cells: ['가구 유형', T.who] },
  { cells: ['총급여액 등', `${manwon(T.limit)} 미만 (근로장려금) · 자녀장려금은 ${manwon(EI.CTC.limit)} 미만`] },
  { cells: ['총소득 기준금액', `부부 합산 ${manwon(T.limit)} 미만 — 근로·사업·종교인·이자·배당·연금·기타소득 합계`] },
  { cells: ['재산', `전년 6월 1일 기준 가구원 합계 ${manwon(EI.PROPERTY_LIMIT)} 미만 · ${manwon(EI.PROPERTY_HALF)} 이상이면 50% 감액`] },
  { cells: ['부양자녀', '18세 미만(2024년 귀속은 2006년 1월 2일 이후 출생) · 연 소득 100만원 이하 · 자녀장려금은 1인당'] },
  { cells: ['신청', '5월 1~31일 정기 (홈택스·손택스·ARS 1544-9944) · 기한 후 6월 1일~11월 30일 (5% 감액)'] },
  { cells: ['지급', '8월 말 · 반기 신청은 12월 말(35%)과 6월 말(정산)'] },
];

function eitcPage(type, m) {
  const T = EI.TYPES[type], W = m * 10000, url = eitcUrl(type, m), isSingle = type === 'single';
  const r0 = EI.eitc({ type, wage: W }), r1 = EI.eitc({ type, wage: W, children: 1 });
  const kids = [0, 1, 2, 3].map((k) => EI.eitc({ type, wage: W, children: k }));
  const half = EI.eitc({ type, wage: W, children: 1, property: 200000000 });
  const title = isSingle
    ? `총급여 ${manwon(W)} 단독 가구 근로장려금 — 예상 ${short(r0.work)}원 (2025년 신청, 재산 1.7억 이상이면 절반)`
    : `총급여 ${manwon(W)} ${T.short} 근로장려금 — 예상 ${short(r0.work)}원 (2025년 신청, 자녀장려금 포함 시 ${short(r1.total)}원)`;
  const desc = `${EI.EITC_ASOF} 기준 총급여액 등 ${manwon(W)}인 ${T.label}의 근로장려금은 ${won(r0.work)}입니다 (${EI.phaseText(W, type)}). ${isSingle ? '재산 1.7억원 이상이면 절반, 2.4억원 이상이면 받지 못합니다.' : `18세 미만 부양자녀 1명당 자녀장려금 ${won(r1.perChild)}이 더해져 자녀 1명이면 ${won(r1.total)}, 2명이면 ${won(kids[2].total)}입니다.`} 5월 신청, 8월 말 지급. 계산 흐름과 요건, 반기 신청.`;
  const ledgerRows = [['총급여액 등', num(W), T.label], eitcPhaseRow(T, r0), ['재산 감액', '0', '1.7억원 미만 기준 · 1.7억 이상 2.4억 미만이면 −50%'], ['근로장려금 (10원 미만 절사)', num(r0.work)]];
  if (!isSingle) ledgerRows.push(['자녀장려금 (부양자녀 1명당)', num(r1.perChild), r1.childPhase === 'flat' ? `총급여 ${manwon(EI.CTC.flatTo)} 미만 최대 ${manwon(EI.CTC.max)}` : r1.childPhase === 'out' ? `${manwon(EI.CTC.max)} − (총급여 − ${manwon(EI.CTC.flatTo)}) × 50/4,900 (최소 ${manwon(EI.CTC.min)})` : '대상 아님'], ['자녀 1명일 때 합계', num(r1.total)]);
  const body = `
${crumb([['/eitc/', '근로장려금'], [eitcUrl(type), T.label], [null, `총급여 ${manwon(W)}`]])}
<h1 class="title">총급여 ${manwon(W)} ${T.label}의 근로장려금은</h1>
<p class="meta">${EI.EITC_ASOF} · 조세특례제한법 · 재산 1.7억원 미만 · 5월 정기 신청 → 8월 말 지급 기준</p>
${lead(`총급여액 등이 ${manwon(W)}인 ${T.label}는 ${EI.phaseText(W, type)}이라 근로장려금이 ${won(r0.work)}입니다. ${isSingle ? `단독 가구 최대 지급액 ${manwon(T.max)}의 ${pct(r0.work / T.max, 0)}입니다. 배우자나 18세 미만 자녀, 70세 이상 부모를 부양하면 홑벌이 가구가 되어 최대 ${manwon(EI.TYPES.one.max)}까지 늘어납니다.` : `18세 미만 부양자녀가 있으면 자녀장려금이 1명당 ${won(r1.perChild)} 더해져 자녀 1명이면 합계 ${won(r1.total)}, 2명이면 ${won(kids[2].total)}입니다.`} 가구원 재산이 1.7억원 이상 2.4억원 미만이면 절반인 ${won(half.work)}${isSingle ? '' : `(자녀 1명 포함 ${won(half.total)})`}을 받고, 2.4억원 이상이면 받지 못합니다. 5월에 신청하면 8월 말에 들어옵니다.`)}
${hero({ label: '근로장려금 예상액 (연 1회)', value: r0.work, sub: `${T.label} · 총급여액 등 ${manwon(W)} · 최대 ${manwon(T.max)}의 ${pct(r0.work / T.max, 0)} · ${eitcPhaseLabel(r0.phase)} 구간` })}
${tiles(isSingle ? [{ label: '재산 1.7억~2.4억이면', value: half.work }, { label: '월로 나누면', value: Math.round(r0.work / 12) }, { label: '단독 가구 최대', value: T.max }] : [{ label: '자녀장려금 (자녀 1명당)', value: r1.perChild }, { label: '자녀 1명 합계', value: r1.total }, { label: '재산 1.7억~2.4억이면 (자녀 1명)', value: half.total }])}
${led('계산 흐름', '원 · 연 1회', ledgerRows)}
${isSingle ? '' : section('부양자녀 수별 합계', `${T.label} · 총급여 ${manwon(W)} · 원`, table(['부양자녀', '근로장려금', '자녀장려금', '합계', '재산 1.7억~2.4억이면'], kids.map((k) => ({ cls: k.children === 1 ? 'on' : '', cells: [k.children ? `${k.children}명` : '없음', num(k.work), num(k.child), num(k.total), num(EI.eitc({ type, wage: W, children: k.children, property: 200000000 }).total)] }))))}
${section('총급여가 바뀌면', `${T.label} 근로장려금`, chips(neighbors(EITC_WAGES[type], m, 3).map((x) => ({ label: short(x * 10000), value: EI.eitc({ type, wage: x * 10000 }).work, href: eitcUrl(type, x), on: x === m }))))}
${section('가구 유형이 다르면', `총급여 ${manwon(W)} 기준 근로장려금 · 유형을 누르면 그 표로`, cells(EITC_TYPES.map((t) => ({ label: EI.TYPES[t].label, value: EI.eitc({ type: t, wage: W }).work, href: EITC_WAGES[t].includes(m) ? eitcUrl(t, m) : eitcUrl(t), on: t === type }))))}
${ad()}
${section('요건 한눈에', EI.EITC_ASOF, table(['항목', '기준'], eitcReqRows(T)))}
${section('알아두면 좋은 것', null, EITC_TIPS)}
${section('이어서 계산하기', null, list([
  { href: '/eitc/', title: '근로장려금 계산기', sub: '가구 유형·총급여·재산·자녀 수를 직접 넣기' },
  { href: monthlyUrl(nearest(MONTHLIES, Math.round(W / 12 / 10000))), title: `월급 ${manwon(nearest(MONTHLIES, Math.round(W / 12 / 10000)) * 10000)} 실수령액`, sub: '이 총급여의 한 달 실수령' },
  { href: '/yearend/', title: '연말정산 미리보기', sub: '총급여로 환급 예상액 보기' },
  { href: '/baby-benefit/', title: '출산·양육 지원금', sub: '자녀가 있으면 함께 받는 것' },
]))}
${EITC_NOTE}`;
  write(url, shell({ url, title, desc, body, nav: 'salary' }));
}

function eitcTypeIndex(type) {
  const T = EI.TYPES[type], url = eitcUrl(type), isSingle = type === 'single';
  const rows = EITC_WAGES[type].map((m) => { const W = m * 10000, r = EI.eitc({ type, wage: W, children: 1 }), r2 = EI.eitc({ type, wage: W, children: 2 }); return { cells: [`<a href="${eitcUrl(type, m)}">${manwon(W)}</a>`, eitcPhaseLabel(r.phase), num(r.work)].concat(isSingle ? [num(EI.eitc({ type, wage: W, property: 200000000 }).work)] : [num(r.perChild), num(r.total), num(r2.total)]) }; });
  const body = `
${crumb([['/eitc/', '근로장려금'], [null, T.label]])}
<h1 class="title">${T.label} 근로장려금 지급액표 — 총급여별 예상액</h1>
<p class="meta">${EI.EITC_ASOF} · 최대 ${manwon(T.max)} · 총급여액 등 ${manwon(T.limit)} 미만 · 재산 1.7억원 미만 기준</p>
${lead(`${T.label}는 ${T.who}입니다. 근로장려금은 총급여액 등 ${manwon(T.phaseIn)}까지 비례해 늘다가 ${manwon(T.phaseIn)}~${manwon(T.flatTo)}에서 최대 ${manwon(T.max)}을 받고, 그 위로는 줄어들어 ${manwon(T.limit)}에서 0이 됩니다. ${isSingle ? '단독 가구는 부양자녀가 없으므로 자녀장려금은 없습니다.' : `18세 미만 부양자녀가 있으면 1명당 자녀장려금 최대 ${manwon(EI.CTC.max)}(총급여 ${manwon(EI.CTC.flatTo)} 미만)이 더해집니다.`} 총급여를 누르면 계산 흐름과 재산·자녀 수별 금액이 나옵니다.`)}
${section('총급여별 지급액', '원 · 연 1회', table(['총급여액 등', '구간', '근로장려금'].concat(isSingle ? ['재산 1.7억~2.4억이면'] : ['자녀장려금 (1명당)', '자녀 1명 합계', '자녀 2명 합계']), rows))}
${ad()}
${section('산정 구간', `${T.label}`, table(['구간', '총급여액 등', '근로장려금'], [
  { cells: ['점증', `${manwon(T.phaseIn)} 미만`, `총급여 × ${Math.round(T.max / 10000)}/${Math.round(T.phaseIn / 10000)}`] },
  { cells: ['평탄 (최대)', `${manwon(T.phaseIn)} 이상 ${manwon(T.flatTo)} 미만`, won(T.max)] },
  { cells: ['점감', `${manwon(T.flatTo)} 이상 ${manwon(T.limit)} 미만`, `${manwon(T.max)} − (총급여 − ${manwon(T.flatTo)}) × ${Math.round(T.max / 10000)}/${Math.round((T.limit - T.flatTo) / 10000).toLocaleString('ko-KR')}`] },
  { cells: ['대상 아님', `${manwon(T.limit)} 이상`, '0원'] },
]))}
${section('다른 가구 유형', null, list(EITC_TYPES.filter((t) => t !== type).map((t) => ({ href: eitcUrl(t), title: `${EI.TYPES[t].label} 지급액표`, sub: `최대 ${manwon(EI.TYPES[t].max)} · ${manwon(EI.TYPES[t].limit)} 미만`, value: EI.TYPES[t].max }))))}
${section('요건 한눈에', EI.EITC_ASOF, table(['항목', '기준'], eitcReqRows(T)))}
${section('알아두면 좋은 것', null, EITC_TIPS)}
${EITC_NOTE}`;
  write(url, shell({ url, title: `${T.label} 근로장려금 지급액표 — 총급여 ${manwon(EITC_WAGES[type][0] * 10000)}~${manwon(EITC_WAGES[type][EITC_WAGES[type].length - 1] * 10000)} 예상액 (2025년 신청)`, desc: `${T.label}(${T.who})의 근로장려금을 총급여별로 미리 계산했습니다. 최대 ${manwon(T.max)}, ${manwon(T.limit)} 미만까지. ${isSingle ? '재산 감액 기준' : '자녀장려금 포함 합계'}, 산정 구간, 신청·지급 일정.`, body, nav: 'salary' }));
}

function eitcIndex() {
  const url = '/eitc/';
  const inp = (id, label, value) => `<label class="ye-f"><span>${label}</span><input id="${id}" type="text" inputmode="numeric" value="${value}"></label>`;
  const ex = EI.eitc({ type: 'one', wage: 15000000, children: 1 });
  const all = range(500, 3700, 100);
  const gridRows = all.map((m) => ({ cells: [`${manwon(m * 10000)}`].concat(EITC_TYPES.map((t) => EITC_WAGES[t].includes(m) ? `<a href="${eitcUrl(t, m)}">${num(EI.eitc({ type: t, wage: m * 10000 }).work)}</a>` : '—')) }));
  const ctcRows = [1000, 2000, 3000, 4000, 5000, 6000, 6900].map((m) => ({ cells: [manwon(m * 10000), num(EI.childCredit(m * 10000, 'one').raw), num(EI.childCredit(m * 10000, 'one').raw * 2), num(EI.childCredit(m * 10000, 'one').raw * 3)] }));
  const body = `
${crumb([['/', '홈'], [null, '근로장려금']])}
<h1 class="title">근로장려금·자녀장려금 계산기 — 가구 유형·총급여별 예상액</h1>
<p class="meta">${EI.EITC_ASOF} · 조세특례제한법 · 단독 최대 165만 · 홑벌이 285만 · 맞벌이 330만 · 자녀 1명당 최대 100만 · 입력값은 이 기기 밖으로 나가지 않습니다</p>
${lead(`근로장려금은 일은 하지만 소득이 적은 가구에 국세청이 해마다 한 번 현금으로 주는 돈입니다. 총급여액 등이 단독 가구 2,200만원, 홑벌이 3,200만원, 맞벌이 3,800만원 미만이고 가구원 재산이 2.4억원 미만이면 대상이며, 총급여 1,500만원 홑벌이 가구는 ${won(ex.work)}, 18세 미만 자녀가 1명 있으면 자녀장려금 ${won(ex.perChild)}을 더해 ${won(ex.total)}을 받습니다. 5월 1~31일에 홈택스·손택스로 신청하면 8월 말에 들어옵니다.`)}
<form class="quick ye-form" id="ei-form">
<div class="ye-grid">
<label class="ye-f"><span>가구 유형</span><select id="ei-type"><option value="single">단독 가구 (배우자·부양자녀·70세 이상 부모 없음)</option><option value="one" selected>홑벌이 가구 (배우자 총급여 300만 미만 또는 부양자녀·부모)</option><option value="dual">맞벌이 가구 (부부 모두 총급여 300만 이상)</option></select></label>
${inp('ei-wage', '총급여액 등 (연 · 만원)', 1500)}
${inp('ei-prop', '가구 재산 합계 (만원)', 10000)}
${inp('ei-kids', '18세 미만 부양자녀 수', 1)}
</div>
</form>
<div class="hero"><div class="hero-label">근로장려금 + 자녀장려금 예상액</div><div class="hero-num"><span class="num" id="ei-total">0</span><span class="unit">원</span></div><div class="hero-sub" id="ei-sub">계산 중</div></div>
<div class="tiles"><div class="tile"><small>근로장려금</small><span class="num" id="ei-work">0</span></div><div class="tile"><small>자녀장려금</small><span class="num" id="ei-child">0</span></div><div class="tile"><small id="ei-prop-label">재산 감액</small><span class="num" id="ei-prop-out">0</span></div></div>
<div id="ei-tips"></div>
<div class="ledger"><div class="lg-head"><h2>계산 흐름</h2><span>원 · 연 1회</span></div><div id="ei-rows"></div></div>
<p class="sub" style="margin-top:8px"><a id="ei-link" href="${eitcUrl('one', 1500)}">총급여 1,500만원 홑벌이 표로 →</a></p>
${section('가구 유형별 산정 구간', `${EI.EITC_ASOF} · 총급여액 등 기준`, table(['가구 유형', '점증 (비례)', '최대 지급', '점감', '대상 아님'], EITC_TYPES.map((t) => { const T = EI.TYPES[t]; return { cells: [`<a href="${eitcUrl(t)}">${T.label}</a>`, `${manwon(T.phaseIn)} 미만`, `${manwon(T.phaseIn)}~${manwon(T.flatTo)} · <b>${manwon(T.max)}</b>`, `${manwon(T.flatTo)}~${manwon(T.limit)}`, `${manwon(T.limit)} 이상`] }; })))}
${ad()}
${section('총급여별 근로장려금', '원 · 재산 1.7억원 미만 · 금액을 누르면 계산 흐름과 자녀장려금 합계', table(['총급여액 등', '단독', '홑벌이', '맞벌이'], gridRows))}
${section('자녀장려금', '18세 미만 부양자녀 1명당 · 홑벌이·맞벌이 · 총급여 2,100만원 미만 100만원, 7,000만원까지 점감 (최소 50만원)', table(['총급여액 등', '자녀 1명', '자녀 2명', '자녀 3명'], ctcRows))}
${section('신청·지급 일정', '2025년 (2024년 소득분)', table(['구분', '신청 기간', '지급', '비고'], [
  { cells: ['정기 신청', '5월 1일 ~ 5월 31일', '8월 말', '근로·사업·종교인소득 모두'] },
  { cells: ['기한 후 신청', '6월 1일 ~ 11월 30일', '신청 후 4개월 안', '산정액의 5% 감액'] },
  { cells: ['반기 신청 (상반기분)', '9월 1일 ~ 9월 15일', '12월 말', '근로소득만 · 산정액의 35%'] },
  { cells: ['반기 신청 (하반기분)', '다음 해 3월 1일 ~ 3월 15일', '6월 말', '연간 산정액에서 정산'] },
]))}
${section('자주 묻는 것', null, `<div class="doc">
<p><b>안내문을 못 받았는데 신청할 수 있나요?</b> 요건이 되면 홈택스·손택스 '장려금 신청'에서 직접 할 수 있습니다. 안내문은 국세청이 파악한 자료로 보내는 것이라 이직·소득 변동이 있으면 빠질 수 있습니다.</p>
<p><b>맞벌이인데 배우자 소득이 적으면?</b> 배우자의 총급여액 등이 300만원 미만이면 홑벌이 가구로 봅니다. 홑벌이는 최대 285만원, 맞벌이는 330만원으로 최대액도 다르고 소득 구간도 다릅니다.</p>
<p><b>전세로 사는데 재산에 들어가나요?</b> 들어갑니다. 전세보증금(임차보증금)은 재산으로 합산하고, 대출은 빼 주지 않습니다. 재산이 1.7억원 이상이면 절반, 2.4억원 이상이면 못 받습니다.</p>
<p><b>자녀장려금은 근로장려금과 따로 받나요?</b> 신청은 한 번에 하고 둘을 더해 지급합니다. 자녀장려금은 소득 요건(7,000만원 미만)이 훨씬 넓어 근로장려금이 0원이어도 자녀장려금만 받을 수 있습니다.</p>
<p><b>받은 돈에 세금이 붙나요?</b> 아닙니다. 장려금은 소득이 아니라 환급 형태의 지원이라 세금이 없고, 다만 체납 세금이 있으면 지급액의 30%까지 충당될 수 있습니다.</p>
</div>`)}
${section('알아두면 좋은 것', null, EITC_TIPS)}
${section('이어서 계산하기', null, list([{ href: '/monthly/', title: '월급 실수령액표', sub: '총급여로 한 달 실수령 보기' }, { href: '/yearend/', title: '연말정산 미리보기', sub: '환급 예상액' }, { href: '/baby-benefit/', title: '출산·양육 지원금', sub: '자녀가 있으면 함께 받는 것' }, { href: '/minimum-wage/', title: `${YEAR}년 최저임금`, sub: '최저임금 월급은 어느 구간인지' }]))}
${EITC_NOTE}`;
  write(url, shell({ url, title: `근로장려금 계산기 — 단독·홑벌이·맞벌이 총급여별 예상액과 자녀장려금 (2025년 신청)`, desc: '가구 유형과 총급여액 등, 재산, 부양자녀 수를 넣으면 근로장려금과 자녀장려금 예상액을 계산합니다. 단독 최대 165만, 홑벌이 285만, 맞벌이 330만, 자녀 1명당 100만원. 2024년 귀속 산정 구간, 재산 감액, 5월 신청·8월 지급 일정과 반기 신청.', body, nav: 'salary', scripts: ['/js/engine.js', '/js/eitc.js'] }));
}

/* ---------- 국민연금 예상 수령액 ---------- */
const PEN_I = range(100, 600, 50);
const PEN_Y = [10, 15, 20, 25, 30, 35, 40];
const penUrl = (i, y) => `/pension/${i}/${y}/`;
const PEN_NOTE = `<p class="note">국민연금법 제51조(기본연금액)·제63조(노령연금액)·제62조(연기연금)·제63조의2(조기노령연금)의 산식을 단순화한 어림입니다. 비례상수 ${NP.DEFAULT_CONST}(2026년부터 소득대체율 43%)과 ${NP.PENSION_ASOF} A값 ${won(NP.A_VALUE)}을 전 가입기간에 적용했고, 가입 시기별로 다른 비례상수, 물가 연동, 과거 소득의 재평가, 부양가족연금, 소득이 있을 때의 감액은 반영하지 않았습니다. 참고용이며 정확한 금액은 국민연금공단 '내 연금 알아보기'(nps.or.kr)나 고객센터 1355에서 확인하세요. <a href="/method/">계산 기준 보기</a></p>`;
const PEN_TIPS = `<div class="doc">
<p><b>정확한 예상액은 공단에서.</b> 국민연금공단 누리집(nps.or.kr) '내 연금 알아보기'나 '내곁에 국민연금' 앱에 로그인하면 실제 납부 이력으로 계산한 예상연금액을 볼 수 있습니다. 이 페이지는 산식을 이해하고 감을 잡는 용도입니다.</p>
<p><b>물가만큼 오릅니다.</b> 받기 시작한 연금은 해마다 1월에 전년도 소비자물가 상승률만큼 오르고, 과거에 낸 보험료의 기준 소득도 받을 때의 가치로 재평가해 계산합니다. 그래서 실제 수령액은 지금 돈 기준인 이 어림보다 명목상 더 큽니다.</p>
<p><b>가입기간이 수령액을 정합니다.</b> 산식에서 가입기간 20년이 기준(계수 1.0)이고 1년 늘 때마다 5%씩 커집니다. 10년 미만이면 노령연금이 아니라 낸 돈에 이자를 더한 반환일시금을 받습니다. 추후납부(추납), 임의계속가입(60세 이후), 군복무·출산 크레딧으로 기간을 늘릴 수 있습니다.</p>
<p><b>조기 수령은 평생 깎입니다.</b> 개시 연령 5년 전부터 신청할 수 있지만 1년마다 6%씩 최대 30% 감액된 금액을 평생 받습니다. 반대로 5년까지 늦추면 1년마다 7.2%, 최대 36%를 더 받습니다. 오래 살수록 늦추는 쪽이 유리하고, 손익분기는 대략 80세 전후입니다.</p>
<p><b>부양가족연금은 별도.</b> 배우자, 19세 미만 자녀, 60세 이상 부모가 있으면 배우자 연 30만원, 자녀·부모 1인당 연 20만원 안팎의 부양가족연금이 더해집니다. 소득이 있는 업무에 종사하면 개시 후 5년 동안 A값을 넘는 소득에 따라 감액될 수 있습니다.</p>
<p><b>연금에도 세금이 있습니다.</b> 2002년 이후 납입분으로 받는 노령연금은 연금소득으로 과세 대상이지만, 연금소득공제와 기본공제가 있어 연 수령액이 수백만원대면 세금이 거의 없습니다.</p>
</div>`;
const penYearsRows = (I, y) => PEN_Y.map((k) => { const p = NP.pension({ avgIncome: I, years: k }); return { cls: k === y ? 'on' : '', cells: [`<a href="${penUrl(Math.round(I / 10000), k)}">${k}년</a>`, p.mult.toFixed(2), num(p.monthly), num(p.annual), pct(p.replacement, 1)] }; });
const penShiftRows = (I, y, birthYear) => NP.shiftTable({ avgIncome: I, years: y, birthYear }).map((r) => ({ cls: r.shift === 0 ? 'on' : '', cells: [`${r.age}세`, r.shift === 0 ? '정상 개시' : r.shift < 0 ? `${-r.shift}년 조기 · −${pct(-r.shift * NP.EARLY_CUT, 0)}` : `${r.shift}년 연기 · +${pct(r.shift * NP.DEFER_ADD, 1)}`, num(r.monthly), num(r.monthly * 12 * (85 - r.age))] }));
const penPremiumRows = (I) => NP.premiumTable(I).map((p) => ({ cls: p.year === YEAR ? 'on' : '', cells: [`${p.year}년`, pct(p.rate, 1), num(p.total), num(p.employee), num(p.self)] }));

function penPage(im, y) {
  const I = im * 10000, url = penUrl(im, y);
  const p = NP.payback({ avgIncome: I, years: y });
  const early = NP.pension({ avgIncome: I, years: y, startAge: 60 }), late = NP.pension({ avgIncome: I, years: y, startAge: 70 });
  const p30 = NP.pension({ avgIncome: I, years: 30 }), p40 = NP.pension({ avgIncome: I, years: 40 });
  const title = `월 ${manwon(I)} 소득 ${y}년 가입 국민연금 예상 수령액 — 월 약 ${Math.round(p.monthly / 10000)}만원 (참고용 어림)`;
  const desc = `가입기간 평균 소득월액 ${manwon(I)}으로 국민연금에 ${y}년 가입하면 노령연금은 65세부터 월 약 ${won(p.monthly)}(연 ${won(p.annual)})입니다. 기본연금액 산식 ${NP.DEFAULT_CONST} × (A값 + 본인 소득) × 가입기간 계수로 계산한 어림이며, 60세 조기 수령 ${won(early.monthly)}, 70세 연기 ${won(late.monthly)}, 가입기간별 표와 보험료 인상 일정.`;
  const body = `
${crumb([['/pension/', '국민연금 예상 수령액'], [null, `월 ${manwon(I)} · ${y}년`]])}
<h1 class="title">월 소득 ${manwon(I)}으로 ${y}년 가입하면 국민연금은</h1>
<p class="meta">${YEAR}년 기준 어림 · 비례상수 ${NP.DEFAULT_CONST} (소득대체율 43%) · A값 ${won(NP.A_VALUE)} · 65세 개시 (1969년생 이후) · 물가 연동·부양가족연금 미반영</p>
${lead(`가입기간 평균 소득월액이 ${manwon(I)}이고 ${y}년을 채우면, 기본연금액 산식 ${NP.DEFAULT_CONST} × (A값 ${won(NP.A_VALUE)} + 본인 소득 ${won(I)}) × 가입기간 계수(${p.mult.toFixed(2)})로 계산하면 연 ${won(p.annual)}, 월 ${won(p.monthly)}을 65세부터 받습니다. 소득의 ${pct(p.replacement, 1)}입니다. 30년이면 월 ${won(p30.monthly)}, 40년이면 ${won(p40.monthly)}으로 가입기간 1년마다 5%씩 늘어납니다. ${y}년 동안 낸 보험료는 요율 9% 기준 ${won(p.paidTotal)}(직장 가입자 본인 부담 ${won(p.paidSelf)})이라 본인 부담분은 ${Math.floor(p.monthsSelf / 12)}년${p.monthsSelf % 12 ? ` ${p.monthsSelf % 12}개월` : ''}이면 돌려받습니다. 60세부터 조기 수령하면 30% 줄어 월 ${won(early.monthly)}, 70세로 늦추면 36% 늘어 월 ${won(late.monthly)}입니다.`)}
${hero({ label: '월 예상 수령액 (65세 개시)', value: p.monthly, sub: `연 ${won(p.annual)} · 소득의 ${pct(p.replacement, 1)} · ${y}년 가입 · 지금 돈 기준 어림` })}
${tiles([{ label: '60세 조기 수령 (−30%)', value: early.monthly }, { label: '70세 연기 수령 (+36%)', value: late.monthly }, { label: `${y}년 낸 보험료 (9% 기준)`, value: p.paidTotal }])}
${led('계산 흐름', '원', [['A값 (전체 가입자 3년 평균 소득월액)', num(NP.A_VALUE), `${NP.PENSION_ASOF} 적용`], ['B값 (본인 가입기간 평균 소득월액)', num(I), `하한 ${manwon(NP.B_MIN)} · 상한 ${manwon(NP.B_MAX)}`], ['(A + B) × 비례상수', num(Math.round(NP.DEFAULT_CONST * (NP.A_VALUE + I))), `${num(NP.A_VALUE + I)} × ${NP.DEFAULT_CONST}`], [`× 가입기간 계수 (1 + 0.05 × (${y} − 20))`, p.mult.toFixed(2), '10년 0.5 · 20년 1.0 · 40년 2.0'], ['기본연금액 (연)', num(p.base)], ['÷ 12 → 월 수령액 (10원 미만 절사)', num(p.monthly)]])}
${section('가입기간별', `월 소득 ${manwon(I)} · 65세 개시 · 원`, table(['가입기간', '계수', '월 수령액', '연 수령액', '소득 대비'], penYearsRows(I, y)))}
${section('소득이 바뀌면', `${y}년 가입 · 월 수령액`, chips(neighbors(PEN_I, im, 3).map((x) => ({ label: short(x * 10000), value: NP.pension({ avgIncome: x * 10000, years: y }).monthly, href: penUrl(x, y), on: x === im }))))}
${section('조기·연기 수령', '1969년생 이후(정상 개시 65세) 기준 · 조기 1년당 6% 감액, 연기 1년당 7.2% 증액 · 85세까지 누적은 물가 반영 없이 단순 합산', table(['개시 나이', '조정', '월 수령액', '85세까지 누적'], penShiftRows(I, y)))}
${ad()}
${section('보험료 인상 일정', `기준소득월액 ${manwon(I)} · 2025년 3월 개정 국민연금법 — 매년 0.5%p씩 올라 2033년 13% · 직장 가입자는 회사가 절반 부담`, table(['연도', '보험료율', '월 보험료', '직장 본인 부담', '지역·임의 가입자'], penPremiumRows(I)))}
${section('알아두면 좋은 것', null, PEN_TIPS)}
${section('이어서 계산하기', null, list([
  { href: '/pension/', title: '국민연금 계산기', sub: '소득·가입기간·출생연도·수급 시기를 직접 넣기' },
  { href: retireUrl(nearest(RETIRE_PAYS, im), 20), title: `월급 ${manwon(nearest(RETIRE_PAYS, im) * 10000)} 퇴직금`, sub: '20년 근속 세전·세후' },
  { href: monthlyUrl(nearest(MONTHLIES, im)), title: `월급 ${manwon(nearest(MONTHLIES, im) * 10000)} 실수령액`, sub: '국민연금 보험료를 뗀 뒤 손에 쥐는 돈' },
  { href: '/goal/', title: '목돈 모으기 시계', sub: '연금 말고 따로 모은다면' },
]))}
${PEN_NOTE}`;
  write(url, shell({ url, title, desc, body, nav: 'retire' }));
}

function penIndex() {
  const url = '/pension/';
  const inp = (id, label, value) => `<label class="ye-f"><span>${label}</span><input id="${id}" type="text" inputmode="numeric" value="${value}"></label>`;
  const ex = NP.pension({ avgIncome: 3000000, years: 20 });
  const gridRows = PEN_I.map((im) => ({ cells: [manwon(im * 10000)].concat(PEN_Y.map((y) => `<a href="${penUrl(im, y)}">${num(NP.pension({ avgIncome: im * 10000, years: y }).monthly)}</a>`)) }));
  const shiftOpts = [];
  for (let s = -5; s <= 5; s++) shiftOpts.push(`<option value="${s}"${s === 0 ? ' selected' : ''}>${s === 0 ? '정상 개시' : s < 0 ? `${-s}년 조기 (−${pct(-s * NP.EARLY_CUT, 0)})` : `${s}년 연기 (+${pct(s * NP.DEFER_ADD, 1)})`}</option>`);
  const body = `
${crumb([['/', '홈'], [null, '국민연금 예상 수령액']])}
<h1 class="title">국민연금 예상 수령액 계산기 — 소득·가입기간별 월 수령액</h1>
<p class="meta">국민연금법 기본연금액 산식 · ${YEAR}년 기준 어림 (비례상수 ${NP.DEFAULT_CONST} · A값 ${won(NP.A_VALUE)}) · 조기·연기 · 입력값은 이 기기 밖으로 나가지 않습니다</p>
${lead(`노령연금은 기본연금액 = ${NP.DEFAULT_CONST} × (A값 + 본인 평균 소득) × (1 + 0.05 × (가입연수 − 20))으로 정해집니다. A값은 전체 가입자의 3년 평균 소득월액(${won(NP.A_VALUE)})이라 소득이 적을수록 낸 돈 대비 많이 받고, 가입기간 1년마다 5%씩 커집니다. 월 소득 300만원으로 20년 가입하면 월 약 ${won(ex.monthly)}, 40년이면 ${won(NP.pension({ avgIncome: 3000000, years: 40 }).monthly)}입니다. 1969년생 이후는 65세부터 받고, 5년 앞당기면 30% 덜, 5년 늦추면 36% 더 받습니다.`)}
<form class="quick ye-form" id="pn-form">
<div class="ye-grid">
${inp('pn-income', '가입기간 평균 소득월액 (만원)', 300)}
${inp('pn-years', '가입기간 (년)', 20)}
${inp('pn-birth', '출생연도', 1985)}
<label class="ye-f"><span>수급 시기</span><select id="pn-shift">${shiftOpts.join('')}</select></label>
</div>
</form>
<div class="hero"><div class="hero-label">월 예상 수령액</div><div class="hero-num"><span class="num" id="pn-monthly">0</span><span class="unit">원</span></div><div class="hero-sub" id="pn-sub">계산 중</div></div>
<div class="tiles"><div class="tile"><small>연 수령액</small><span class="num" id="pn-annual">0</span></div><div class="tile"><small>수급 개시</small><span class="num" id="pn-age">-</span></div><div class="tile"><small>소득 대비</small><span class="num" id="pn-rep">0%</span></div></div>
<div id="pn-tips"></div>
<div class="ledger"><div class="lg-head"><h2>계산 흐름</h2><span>원</span></div><div id="pn-rows"></div></div>
<p class="sub" style="margin-top:8px"><a id="pn-link" href="${penUrl(300, 20)}">월 300만원 · 20년 표로 →</a></p>
${section('가입기간별', '입력한 소득 기준 · 원', `<div class="tbl"><table><thead><tr><th>가입기간</th><th>계수</th><th>월 수령액</th><th>연 수령액</th></tr></thead><tbody id="pn-years-rows"></tbody></table></div>`)}
${section('조기·연기 수령', '입력한 출생연도의 정상 개시 연령 기준 · 85세까지 누적은 단순 합산', `<div class="tbl"><table><thead><tr><th>개시 나이</th><th>조정</th><th>월 수령액</th><th>85세까지 누적</th></tr></thead><tbody id="pn-shift-rows"></tbody></table></div>`)}
${section('소득 × 가입기간 월 수령액표', '65세 개시 · 원 · 금액을 누르면 계산 흐름과 조기·연기, 보험료 표', table(['평균 소득월액'].concat(PEN_Y.map((y) => `${y}년`)), gridRows))}
${ad()}
${section('수급 개시 연령', '국민연금법 부칙 · 출생연도별', table(['출생연도', '노령연금 개시', '조기연금 가능 (최대 5년)'], [['~1952년', 60], ['1953~1956년', 61], ['1957~1960년', 62], ['1961~1964년', 63], ['1965~1968년', 64], ['1969년 이후', 65]].map(([b, a]) => ({ cells: [b, `${a}세`, `${a - 5}세부터`] }))))}
${section('보험료 인상 일정', '2025년 3월 개정 · 월 소득 300만원 기준 · 직장 가입자는 회사가 절반', table(['연도', '보험료율', '월 보험료', '직장 본인 부담', '지역·임의 가입자'], penPremiumRows(3000000)))}
${section('자주 묻는 것', null, `<div class="doc">
<p><b>A값이 뭔가요?</b> 연금을 받기 시작하기 전 3년 동안 전체 가입자의 평균 소득월액입니다(${NP.PENSION_ASOF} 적용 ${won(NP.A_VALUE)}). 산식에 A값이 절반 들어가 있어 소득이 적은 사람은 낸 돈에 비해 많이, 많은 사람은 적게 받는 소득재분배 장치입니다.</p>
<p><b>소득대체율 43%는 무슨 뜻인가요?</b> 40년 가입한 평균 소득자(B값 = A값)가 가입기간 평균 소득의 43%를 연금으로 받는다는 뜻입니다. 2025년 3월 개정으로 2026년부터 43%로 고정됐고(비례상수 1.29), 가입기간이 20년이면 절반인 약 21.5%, 10년이면 약 10.8%가 됩니다.</p>
<p><b>보험료가 오르면 연금도 오르나요?</b> 보험료율(9% → 13%)은 내는 돈이고, 받는 돈은 소득대체율(43%)이 정합니다. 개정으로 내는 돈은 늘고 받는 돈은 40%에서 43%로 조금 늘었습니다.</p>
<p><b>지역 가입자는 다른가요?</b> 산식은 같고 보험료를 본인이 전액(2026년 9.5%) 내는 점만 다릅니다. 직장 가입자는 회사가 절반을 내 줍니다.</p>
<p><b>부부가 둘 다 받을 수 있나요?</b> 각자 가입기간이 10년 이상이면 각자의 노령연금을 받습니다. 한 사람이 사망하면 남은 배우자는 본인 노령연금과 유족연금(사망자 연금의 40~60%) 중 하나를 고르거나, 본인 연금에 유족연금의 30%를 더해 받습니다.</p>
</div>`)}
${section('알아두면 좋은 것', null, PEN_TIPS)}
${section('이어서 계산하기', null, list([{ href: '/retire/', title: '퇴직금 세후', sub: '은퇴 자금의 다른 한 축' }, { href: '/salary/', title: '연봉 실수령액표', sub: '국민연금 보험료가 빠진 월 실수령' }, { href: '/rates/', title: `${YEAR}년 4대보험 요율표`, sub: '국민연금 근로자 부담률' }]))}
${PEN_NOTE}`;
  write(url, shell({ url, title: `국민연금 예상 수령액 계산기 — 월 소득·가입기간별 노령연금 월 수령액 (${YEAR}년 어림)`, desc: '가입기간 평균 소득월액과 가입기간, 출생연도를 넣으면 국민연금 노령연금 예상 수령액을 기본연금액 산식으로 어림합니다. 소득 100~600만원 × 가입 10~40년 표, 조기·연기 수령액, 수급 개시 연령, 2033년까지 보험료 인상 일정.', body, nav: 'retire', scripts: ['/js/engine.js', '/js/pension.js'] }));
}

/* ---------- 양도소득세 ---------- */
const CAP_SALES = [30000, 40000, 50000, 60000, 70000, 80000, 90000, 100000, 120000, 150000, 200000];
const capCosts = (s) => range(10000, s - 10000, 10000);
const capUrl = (s, c) => `/capgain/${s}/${c}/`;
const CAP_HOLD = 5, CAP_LIVE = 5;
const capCalc = (S, C, o = {}) => CG.capitalGains({ sale: S, cost: C, expense: 0, holdYears: CAP_HOLD, liveYears: CAP_LIVE, oneHouse: true, ...o });
const capThree = (S, C, hold = CAP_HOLD, expense = 0) => ({ one: capCalc(S, C, { holdYears: hold, liveYears: hold, expense }), gen: capCalc(S, C, { oneHouse: false, liveYears: 0, holdYears: hold, expense }), sur: capCalc(S, C, { oneHouse: false, liveYears: 0, holdYears: hold, expense, multi: 2 }) });
const capRateText = (r) => r.base <= 0 ? '—' : r.kind === 'short1' ? '70% (보유 1년 미만)' : r.kind === 'short2' ? '60% (보유 2년 미만)' : r.kind === 'surcharge' ? `${pct(r.rate, 0)} (기본 ${pct(r.rate - r.surcharge, 0)} + ${pct(r.surcharge, 0)}p) − ${num(r.sub)}` : `${pct(r.rate, 0)} − 누진공제 ${num(r.sub)}`;
const capLtText = (r) => r.taxableGain <= 0 ? '—' : r.ltRate ? `${pct(r.ltRate, 0)} (${r.ltTable === 2 ? `보유 ${pct(r.ltHold, 0)} + 거주 ${pct(r.ltLive, 0)}` : '표1'}) · −${num(r.ltd)}` : r.multi ? '중과 대상 배제' : '3년 미만 없음';
const capLedger = (t) => [
  { cells: ['양도가액', num(t.one.sale), num(t.gen.sale), num(t.sur.sale)] },
  { cells: ['취득가액', neg(t.one.cost), neg(t.gen.cost), neg(t.sur.cost)] },
  { cells: ['필요경비', neg(t.one.expense), neg(t.gen.expense), neg(t.sur.expense)] },
  { cls: 'sum', cells: ['양도차익', num(t.one.gain), num(t.gen.gain), num(t.sur.gain)] },
  { cells: ['비과세 양도차익 (12억 이하분)', t.one.exempt ? neg(t.one.exemptGain) : '비과세 아님', '—', '—'] },
  { cells: ['과세 양도차익', num(t.one.taxableGain), num(t.gen.taxableGain), num(t.sur.taxableGain)] },
  { cells: ['장기보유특별공제', capLtText(t.one), capLtText(t.gen), capLtText(t.sur)] },
  { cells: ['양도소득금액', num(t.one.income), num(t.gen.income), num(t.sur.income)] },
  { cells: ['기본공제', neg(t.one.basic), neg(t.gen.basic), neg(t.sur.basic)] },
  { cls: 'sum', cells: ['과세표준', num(t.one.base), num(t.gen.base), num(t.sur.base)] },
  { cells: ['세율', capRateText(t.one), capRateText(t.gen), capRateText(t.sur)] },
  { cells: ['양도소득세', num(t.one.tax), num(t.gen.tax), num(t.sur.tax)] },
  { cells: ['지방소득세 10%', num(t.one.local), num(t.gen.local), num(t.sur.local)] },
  { cls: 'sum', cells: ['총 세액', num(t.one.total), num(t.gen.total), num(t.sur.total)] },
  { cells: ['양도차익 대비', pct(t.one.effective, 1), pct(t.gen.effective, 1), pct(t.sur.effective, 1)] },
];
const CAP_HEAD = ['항목', '1세대 1주택<br><small>2년 이상 보유·거주</small>', '일반 과세<br><small>비과세 요건 미충족 · 중과 유예</small>', '2주택 중과 시<br><small>조정대상지역 +20%p</small>'];
const CAP_NOTE = `<p class="note">소득세법 제89조(1세대 1주택 비과세)·제95조(장기보유특별공제)·제103조(기본공제)·제104조(세율)와 지방세법의 지방소득세 10%를 ${CG.CAP_ASOF} 기준으로 계산했습니다. 조정대상지역 다주택 중과는 ${CG.SURCHARGE_UNTIL}까지 한시 배제되어 기본 계산에 넣지 않았고, 취득가액 환산·감정, 상속·증여로 취득한 주택, 일시적 2주택·상생임대 등 특례, 비거주자는 반영하지 않았습니다. 참고용이며 실제 신고는 홈택스 모의계산과 세무사 상담으로 확인하세요. <a href="/method/">계산 기준 보기</a></p>`;
const CAP_TIPS = `<div class="doc">
<p><b>1세대 1주택 비과세 요건.</b> 양도일 현재 1세대가 국내에 주택 1채를 2년 이상 보유했으면 양도가액 12억원까지 비과세입니다. 2017년 8월 3일 이후 조정대상지역에서 취득한 주택은 보유 중 2년 이상 거주도 해야 합니다. 12억원을 넘는 고가주택은 양도차익 가운데 (양도가액 − 12억) ÷ 양도가액 비율만큼만 과세합니다.</p>
<p><b>장기보유특별공제는 두 가지 표.</b> 1세대 1주택(2년 이상 거주)은 보유기간 연 4%(3년부터, 최대 40%)와 거주기간 연 4%(최대 40%)를 더해 최대 80%까지 빼 줍니다. 그 밖의 주택은 보유 3년부터 연 2%, 15년 이상 30%가 최대입니다. 중과 대상 다주택은 공제가 없습니다.</p>
<p><b>필요경비를 챙기면 세금이 줄어듭니다.</b> 취득 때 낸 취득세·등록면허세, 법무사 비용, 중개수수료, 양도 때 중개수수료·신고 대행 수수료, 발코니 확장·새시·보일러 교체 같은 자본적 지출이 필요경비입니다. 도배·장판·싱크대 교체 같은 수리비(수익적 지출)는 인정되지 않습니다. 영수증과 이체 기록을 남겨 두세요.</p>
<p><b>다주택 중과는 ${CG.SURCHARGE_UNTIL}까지 유예.</b> 조정대상지역 2주택 +20%p, 3주택 이상 +30%p 중과와 장기보유특별공제 배제는 2022년 5월 10일부터 한시적으로 적용하지 않습니다. 그 뒤에 팔 계획이면 연장 여부를 확인하세요.</p>
<p><b>신고는 양도일이 속한 달의 말일부터 2개월 안에.</b> 홈택스 '양도소득세 예정신고'로 신고·납부하고, 세액이 1,000만원을 넘으면 2개월 안에 나눠 낼 수 있습니다. 같은 해에 두 건 이상 양도했으면 다음 해 5월 확정신고로 합산합니다. 지방소득세(10%)는 위택스에 따로 신고합니다.</p>
<p><b>보유 2년을 못 채우면 세금이 큽니다.</b> 1년 미만 70%, 2년 미만 60%의 단일세율이 과세표준 전체에 붙고 장기보유특별공제도 없습니다. 이사 계획이 있다면 취득일(잔금일·등기접수일 중 빠른 날)부터 2년을 확인하세요.</p>
</div>`;

function capPage(s, c) {
  const S = s * 10000, C = c * 10000, url = capUrl(s, c);
  const t = capThree(S, C), { one, gen, sur } = t;
  const over = S > CG.EXEMPT_PRICE;
  const title = over
    ? `양도가 ${short(S)} · 취득가 ${short(C)} 양도소득세 — 1주택 ${short(one.total)}원 · 일반 ${short(gen.total)}원 (보유 5년, ${CG.CAP_ASOF})`
    : `양도가 ${short(S)} · 취득가 ${short(C)} 양도소득세 — 1주택 비과세 0원 · 일반 ${short(gen.total)}원 (보유 5년, ${CG.CAP_ASOF})`;
  const desc = `양도가액 ${manwon(S)}, 취득가액 ${manwon(C)} 주택의 양도차익은 ${manwon(one.gain)}입니다. 1세대 1주택(2년 이상 보유·거주)이면 ${over ? `12억원 초과분만 과세해 장기보유특별공제 ${pct(one.ltRate, 0)}를 뺀 뒤 총 ${won(one.total)}` : '12억원 이하라 전액 비과세'}, 비과세 요건이 안 되는 일반 과세는 ${won(gen.total)}, 조정대상지역 2주택 중과를 적용하면 ${won(sur.total)}(${CG.SURCHARGE_UNTIL}까지 유예). 보유기간·필요경비별 표와 계산 흐름.`;
  const holdRows = [[0.5, '1년 미만'], [1, '1년 (2년 미만)'], [2, '2년'], [3, '3년'], [5, '5년'], [10, '10년'], [15, '15년']].map(([h, label]) => { const x = capThree(S, C, h); return { cls: h === CAP_HOLD ? 'on' : '', cells: [label, num(x.one.total), num(x.gen.total), num(x.sur.total)] }; });
  const expRows = [0, 10000000, 30000000, 50000000].map((e) => { const x = capThree(S, C, CAP_HOLD, e); return { cls: e === 0 ? 'on' : '', cells: [e ? manwon(e) : '없음', num(x.one.gain), num(x.one.total), num(x.gen.total)] }; });
  const body = `
${crumb([['/capgain/', '양도소득세'], [null, `양도가 ${short(S)} · 취득가 ${short(C)}`]])}
<h1 class="title">양도가 ${manwon(S)} · 취득가 ${manwon(C)} 주택의 양도소득세는</h1>
<p class="meta">${CG.CAP_ASOF} 소득세법 · 필요경비 0원 · 보유 5년 · 거주 5년 · 지방소득세 10% 포함 · 다주택 중과 유예 기준</p>
${lead(`양도차익은 ${manwon(S)} − ${manwon(C)} = ${manwon(one.gain)}입니다. ${over ? `1세대 1주택으로 2년 이상 보유·거주했다면 양도가액 12억원을 넘는 비율(${pct((S - CG.EXEMPT_PRICE) / S, 1)})만큼인 ${won(one.taxableGain)}만 과세하고, 장기보유특별공제 ${pct(one.ltRate, 0)}(보유 5년 ${pct(one.ltHold, 0)} + 거주 5년 ${pct(one.ltLive, 0)}) ${won(one.ltd)}과 기본공제 250만원을 빼면 과세표준 ${won(one.base)}, 양도소득세 ${won(one.tax)}에 지방소득세 ${won(one.local)}을 더해 총 ${won(one.total)}입니다.` : `1세대 1주택으로 2년 이상 보유(조정대상지역 취득분은 2년 이상 거주)했다면 양도가액이 12억원 이하라 전액 비과세, 세금이 0원입니다.`} 비과세 요건을 채우지 못한 일반 과세라면 장기보유특별공제 ${pct(gen.ltRate, 0)}(5년 보유)만 적용되어 총 ${won(gen.total)}이고, 조정대상지역 2주택 중과(+20%p, 장특공제 없음)를 적용하면 ${won(sur.total)}입니다. 중과는 ${CG.SURCHARGE_UNTIL}까지 유예 중입니다.`)}
${hero({ label: '1세대 1주택 총 세액 (양도세 + 지방소득세)', value: one.total, sub: over ? `양도차익 ${manwon(one.gain)} 가운데 12억 초과분 ${manwon(one.taxableGain)} 과세 · 장특공제 ${pct(one.ltRate, 0)} · 실효세율 ${pct(one.effective, 1)}` : `양도가액 12억원 이하 · 2년 이상 보유(조정대상지역은 거주 2년)면 전액 비과세` })}
${tiles([{ label: '양도차익', value: one.gain }, { label: '일반 과세 (비과세 아닐 때)', value: gen.total }, { label: '2주택 중과 시', value: sur.total }])}
${section('계산 흐름', `양도가 ${manwon(S)} · 취득가 ${manwon(C)} · 보유 5년 · 원`, table(CAP_HEAD, capLedger(t)))}
${section('보유기간별 총 세액', '1세대 1주택은 거주기간 = 보유기간으로 가정 · 2년 미만은 단기세율 60~70% · 원', table(['보유기간', '1세대 1주택', '일반 과세', '2주택 중과'], holdRows))}
${section('필요경비를 넣으면', '취득세·중개수수료·법무사비·자본적 지출 합계 · 보유 5년 · 원', table(['필요경비', '양도차익', '1세대 1주택', '일반 과세'], expRows))}
${section('취득가가 바뀌면', `양도가 ${manwon(S)} · 일반 과세 총 세액`, chips(neighbors(capCosts(s), c, 3).map((x) => ({ label: short(x * 10000), value: capThree(S, x * 10000).gen.total, href: capUrl(s, x), on: x === c }))))}
${section('양도가가 바뀌면', `취득가 ${manwon(C)} · 일반 과세 총 세액`, chips(neighbors(CAP_SALES.filter((x) => x > c), s, 3).map((x) => ({ label: short(x * 10000), value: capThree(x * 10000, C).gen.total, href: capUrl(x, c), on: x === s }))))}
${ad()}
${section('알아두면 좋은 것', null, CAP_TIPS)}
${section('이어서 계산하기', null, list([
  { href: '/capgain/', title: '양도소득세 계산기', sub: '양도가·취득가·필요경비·보유·거주 기간을 직접 넣기' },
  { href: '/acquisition-tax/', title: '주택 취득세', sub: '살 때 낸 취득세는 필요경비' },
  { href: '/bokbi/', title: '부동산 복비', sub: '중개수수료도 필요경비' },
  { href: '/gift-tax/', title: '증여세', sub: '팔지 않고 자녀에게 넘기면' },
]))}
${CAP_NOTE}`;
  write(url, shell({ url, title, desc, body }));
}

function capIndex() {
  const url = '/capgain/';
  const inp = (id, label, value) => `<label class="ye-f"><span>${label}</span><input id="${id}" type="text" inputmode="numeric" value="${value}"></label>`;
  const ex = capThree(1500000000, 900000000);
  const groups = CAP_SALES.map((s) => section(`양도가 ${manwon(s * 10000)}`, `보유 5년 · 필요경비 0원 · 원 · 취득가를 누르면 계산 흐름과 보유기간별 표`, table(['취득가', '양도차익', '1세대 1주택', '일반 과세', '2주택 중과'], capCosts(s).map((c) => { const t = capThree(s * 10000, c * 10000); return { cells: [`<a href="${capUrl(s, c)}">${manwon(c * 10000)}</a>`, num(t.one.gain), num(t.one.total), num(t.gen.total), num(t.sur.total)] }; })))).join('\n');
  const body = `
${crumb([['/', '홈'], [null, '양도소득세']])}
<h1 class="title">양도소득세 계산기 — 주택 양도가·취득가별 세금과 1세대 1주택 비과세</h1>
<p class="meta">${CG.CAP_ASOF} 소득세법 · 12억 비과세 · 장기보유특별공제 · 단기세율 · 다주택 중과 옵션 · 지방소득세 포함 · 입력값은 이 기기 밖으로 나가지 않습니다</p>
${lead(`양도소득세는 양도가액에서 취득가액과 필요경비를 뺀 양도차익에 장기보유특별공제와 기본공제 250만원을 뺀 과세표준에 6~45% 누진세율을 곱하고, 지방소득세 10%를 더한 금액입니다. 1세대 1주택을 2년 이상 보유(조정대상지역 취득분은 2년 거주)하고 12억원 이하에 팔면 전액 비과세이고, 12억원을 넘으면 초과 비율만큼만 과세합니다. 15억원에 판 9억원 집(보유·거주 5년)은 1주택이면 ${won(ex.one.total)}, 비과세 요건이 안 되면 ${won(ex.gen.total)}입니다. 보유 1년 미만은 70%, 2년 미만은 60% 단일세율입니다.`)}
<form class="quick ye-form" id="cg-form">
<div class="ye-grid">
${inp('cg-sale', '양도가액 (만원)', 150000)}
${inp('cg-cost', '취득가액 (만원)', 90000)}
${inp('cg-exp', '필요경비 (만원)', 3000)}
${inp('cg-hold', '보유기간 (년)', 5)}
${inp('cg-live', '거주기간 (년)', 5)}
<label class="ye-f"><span>주택 수</span><select id="cg-house"><option value="1">1세대 1주택</option><option value="2">2주택</option><option value="3">3주택 이상</option></select></label>
</div>
<div class="ye-checks"><label><input type="checkbox" id="cg-adj"> 조정대상지역에서 취득 (비과세에 거주 2년 필요)</label><label><input type="checkbox" id="cg-sur"> 다주택 중과 포함 계산 (${CG.SURCHARGE_UNTIL}까지 유예 중)</label></div>
</form>
<div class="hero"><div class="hero-label">총 세액 (양도소득세 + 지방소득세)</div><div class="hero-num"><span class="num" id="cg-total">0</span><span class="unit">원</span></div><div class="hero-sub" id="cg-sub">계산 중</div></div>
<div class="tiles"><div class="tile"><small>양도차익</small><span class="num" id="cg-gain">0</span></div><div class="tile"><small>양도소득세</small><span class="num" id="cg-tax">0</span></div><div class="tile"><small>지방소득세</small><span class="num" id="cg-local">0</span></div></div>
<div id="cg-tips"></div>
<div class="ledger"><div class="lg-head"><h2>계산 흐름</h2><span>원</span></div><div id="cg-rows"></div></div>
<p class="sub" style="margin-top:8px"><a id="cg-link" href="${capUrl(150000, 90000)}">양도가 15억 · 취득가 9억 표로 →</a></p>
${section('세율', `${CG.CAP_ASOF} 소득세법 제104조 · 지방소득세 10% 별도`, table(['과세표준', '세율', '누진공제'], CG.BRACKETS.map(([lim, r, sub], i) => ({ cells: [i === 0 ? `${manwon(lim)} 이하` : lim === Infinity ? `${manwon(CG.BRACKETS[i - 1][0])} 초과` : `${manwon(CG.BRACKETS[i - 1][0])} 초과 ${manwon(lim)} 이하`, pct(r, 0), sub ? num(sub) : '—'] })).concat([{ cells: ['보유 1년 미만 (주택·입주권·분양권)', '70%', '단일세율'] }, { cells: ['보유 1년 이상 2년 미만', '60%', '단일세율'] }, { cells: ['조정대상지역 2주택 · 3주택 이상', '기본세율 + 20%p · + 30%p', `${CG.SURCHARGE_UNTIL}까지 유예`] }])))}
${section('장기보유특별공제율', '소득세법 제95조 · 보유 3년 이상부터', table(['보유기간', '일반 (표1)', '1세대 1주택 보유분 (표2)', '1세대 1주택 거주분 (표2)'], [3, 4, 5, 6, 7, 8, 9, 10, 15].map((y) => ({ cells: [y === 15 ? '15년 이상' : y === 10 ? '10년 이상' : `${y}년`, pct(CG.longTermRate(y, 0, 1).rate, 0), pct(CG.longTermRate(y, 0, 2).hold, 0), pct(CG.longTermRate(y, y, 2).live, 0)] }))))}
<p class="sub" style="margin-top:8px">표2는 양도가액 12억원 초과 1세대 1주택에 거주 2년 이상일 때 적용하며 보유분과 거주분을 더해 최대 80%입니다. 중과 대상 다주택은 공제가 없습니다.</p>
${ad()}
${groups}
${section('자주 묻는 것', null, `<div class="doc">
<p><b>12억 넘게 팔면 전부 과세인가요?</b> 아닙니다. 양도차익 × (양도가액 − 12억) ÷ 양도가액만 과세합니다. 15억원에 팔면 양도차익의 20%만 과세 대상이고, 여기에 장기보유특별공제(최대 80%)까지 빠지니 실제 세금은 양도차익의 몇 % 수준입니다.</p>
<p><b>취득가액을 모르면요?</b> 매매계약서·등기부·계좌이체 기록으로 실지거래가액을 증명합니다. 오래된 집이라 증빙이 없으면 기준시가로 환산한 취득가액을 쓸 수 있는데, 실제보다 낮게 잡히는 일이 많아 세금이 늘어납니다.</p>
<p><b>일시적 2주택도 비과세되나요?</b> 종전 주택을 취득한 지 1년 이상 지나 새집을 사고, 새집 취득일부터 3년 안에 종전 주택을 팔면(종전 주택은 2년 이상 보유·거주 요건 충족) 1주택으로 보아 비과세됩니다. 이 계산기에서는 '1세대 1주택'을 고르면 됩니다.</p>
<p><b>부부 공동명의면?</b> 각자 지분만큼 양도차익을 나누어 각자 신고하고 기본공제 250만원도 각자 받습니다. 누진세율이 낮은 구간에 나눠 걸려 단독명의보다 세금이 줄어드는 것이 보통입니다.</p>
<p><b>손해 보고 팔면?</b> 양도차손이면 세금이 없고, 같은 해에 다른 부동산 양도차익이 있으면 서로 통산합니다. 다음 해로 넘기지는 못합니다.</p>
</div>`)}
${section('알아두면 좋은 것', null, CAP_TIPS)}
${section('이어서 계산하기', null, list([{ href: '/acquisition-tax/', title: '주택 취득세', sub: '살 때 내는 세금 · 필요경비' }, { href: '/property-tax/', title: '주택 재산세', sub: '보유하는 동안 해마다' }, { href: '/gift-tax/', title: '증여세', sub: '팔지 않고 넘길 때' }, { href: '/inheritance-tax/', title: '상속세', sub: '상속받은 집을 팔 때 취득가액은 상속 당시 평가액' }]))}
${CAP_NOTE}`;
  write(url, shell({ url, title: `양도소득세 계산기 — 주택 양도가·취득가별 세금, 1세대 1주택 12억 비과세·장특공제 (${CG.CAP_ASOF})`, desc: '양도가액·취득가액·필요경비·보유·거주 기간을 넣으면 1세대 1주택 비과세와 12억 초과분 과세, 장기보유특별공제, 기본공제, 누진세율, 지방소득세까지 계산합니다. 양도가 3억~20억 × 취득가별 세액표, 다주택 중과 옵션, 단기세율.', body, scripts: ['/js/engine.js', '/js/capgain.js'] }));
}

/* ---------- 자동차 유지비 ---------- */
const CARCOST_P = range(2000, 8000, 500);
const carcostUrl = (p) => `/carcost/${p}/`;
const carcostCc = (pm) => pm <= 2500 ? 1598 : pm <= 4000 ? 1999 : pm <= 5500 ? 2497 : 3470;
const carcostCalc = (pm, o = {}) => CC.carCost({ price: pm * 10000, cc: carcostCc(pm), year: YEAR, ...o });
const CARCOST_NOTE = `<p class="note">유류비·보험료·정비비·주차비는 입력값과 전국 평균 어림이고 자동차세는 지방세법 제127조·제130조(배기량·차령 경감, 전기차 정액), 감가상각은 차량가 × 첫해 20%·2~3년차 15%·4년차부터 10%의 단순 정액 어림입니다. 취득세(7%)·공채·검사비·세차·과태료·대출 이자는 넣지 않았습니다. 참고용이며 실제 비용은 차종·운전 습관·보험 가입 조건에 따라 크게 다릅니다. <a href="/method/">계산 기준 보기</a></p>`;
const CARCOST_TIPS = `<div class="doc">
<p><b>가장 큰 비용은 감가상각입니다.</b> 새 차는 첫해에 값의 20% 안팎, 3년이면 40% 가까이 떨어집니다. 눈에 보이지 않지만 팔 때 그대로 확정되는 비용이라, 유지비를 따질 때 가장 먼저 넣어야 합니다. 3년 된 중고차를 사면 이 부분이 크게 줄어듭니다.</p>
<p><b>보험료는 사람마다 두 배 넘게 차이 납니다.</b> 나이·운전 경력·사고 이력·차종·특약(운전자 한정, 블랙박스, 마일리지)에 따라 연 50만원에서 150만원을 넘기도 합니다. 만 26세 미만이나 첫 가입은 훨씬 비쌉니다. 다이렉트 보험과 마일리지 특약(연 1만km 이하)으로 줄일 수 있습니다.</p>
<p><b>살 때 드는 돈은 따로.</b> 취득세는 차값의 7%(경차 4%), 여기에 공채 매입(지역별)·번호판·탁송료가 붙어 3,000만원 차면 200만원 안팎이 첫해에 더 나갑니다. 할부로 사면 이자도 더해집니다.</p>
<p><b>정비·소모품.</b> 엔진오일(연 1~2회, 5~10만원), 타이어(4년마다 40~80만원), 브레이크 패드, 배터리(3~4년), 자동차 검사(2년마다 2~3만원)를 평균하면 연 50만원 안팎이고, 5년을 넘기면 늘어납니다. 전기차는 엔진오일이 없어 절반 이하입니다.</p>
<p><b>전기차는 연료비가 절반, 세금은 1/4.</b> 전기 350원/kWh(공용 충전 기준, 집 완속은 더 쌈)에 5km/kWh면 km당 70원으로 휘발유 12km/L(km당 137원)의 절반이고 자동차세는 정액 13만원입니다. 대신 보험료가 조금 비싸고 감가는 더 빠른 편입니다.</p>
<p><b>주차비가 복병.</b> 아파트는 월 1~3만원 수준이지만 도심 월 주차는 10~30만원이고, 출퇴근 통행료·주유소 세차까지 더하면 월 5만원은 최소치입니다.</p>
</div>`;
const carcostLedger = (c) => c.items.map((r) => [r.label, num(r.annual), `${r.note} · 월 ${won(r.monthly)} · ${pct(r.share, 0)}`]);

function carcostPage(pm) {
  const P = pm * 10000, url = carcostUrl(pm), c = carcostCalc(pm);
  const c2 = carcostCalc(pm, { age: 2 }), c4 = carcostCalc(pm, { age: 4 });
  const title = `차량가 ${manwon(P)} 자동차 유지비 — 월 약 ${Math.round(c.monthly / 10000)}만원 (유류비·보험·세금·감가 포함)`;
  const desc = `차량가 ${manwon(P)} 휘발유차(연비 ${c.eff}km/L, 연 ${num(c.km)}km, ${num(c.cc)}cc)의 유지비는 유류비 ${won(c.fuelCost)}, 자동차세 ${won(c.tax)}, 보험료 ${won(c.insurance)}, 정비 ${won(c.maintenance)}, 주차·통행료 ${won(c.parking)}, 첫해 감가상각 ${won(c.depreciation)}으로 연 ${won(c.annual)}, 월 ${won(c.monthly)}입니다. 감가를 뺀 현금 지출은 월 ${won(c.cashMonthly)}, km당 ${won(c.perKm)}. 주행거리·연식·연료별 표.`;
  const kmRows = [10000, 15000, 20000, 30000].map((k) => { const x = carcostCalc(pm, { km: k }); return { cls: k === c.km ? 'on' : '', cells: [`${num(k)}km`, num(x.fuelCost), num(x.monthly), num(x.cashMonthly), num(x.perKm)] }; });
  const ageRows = [1, 2, 3, 4, 5, 7, 10].map((a) => { const x = carcostCalc(pm, { age: a }); return { cls: a === 1 ? 'on' : '', cells: [`${a}년차`, pct(x.depRate, 0), num(x.depreciation), num(x.tax), num(x.monthly), num(x.cashMonthly)] }; });
  const fuelRows = Object.values(CC.FUELS).map((F) => { const x = carcostCalc(pm, { fuel: F.key }); return { cls: F.key === 'gasoline' ? 'on' : '', cells: [`${F.label} (${F.eff}${F.effUnit} · ${num(F.price)}원/${F.unit})`, num(x.fuelCost), num(x.tax), num(x.monthly), num(x.perKm)] }; });
  const body = `
${crumb([['/carcost/', '자동차 유지비'], [null, `차량가 ${manwon(P)}`]])}
<h1 class="title">차량가 ${manwon(P)} 자동차 유지비는 한 달에</h1>
<p class="meta">휘발유 ${c.eff}km/L · ${num(c.fuelPrice)}원/L · 연 ${num(c.km)}km · ${num(c.cc)}cc 자동차세 · 보험 ${manwon(c.insurance)} · 정비 ${manwon(c.maintenance)} · 주차·통행 월 ${manwon(c.parking / 12)} · 첫해 감가 ${pct(c.depRate, 0)} 기준</p>
${lead(`차량가 ${manwon(P)} 휘발유차를 1년에 ${num(c.km)}km 타면 유류비 ${won(c.fuelCost)}, 자동차세 ${won(c.tax)}(${num(c.cc)}cc), 보험료 ${won(c.insurance)}, 정비·소모품 ${won(c.maintenance)}, 주차·통행료 ${won(c.parking)}에 첫해 감가상각 ${won(c.depreciation)}을 더해 연 ${won(c.annual)}, 월 ${won(c.monthly)}이 듭니다. 감가를 빼고 실제로 통장에서 나가는 돈은 월 ${won(c.cashMonthly)}이고 km당 ${won(c.perKm)}입니다. 2년차부터는 감가가 15%로 줄어 월 ${won(c2.monthly)}, 4년차부터 10%와 자동차세 경감으로 월 ${won(c4.monthly)}이 됩니다.`)}
${hero({ label: '월 유지비 (감가상각 포함 · 첫해)', value: c.monthly, sub: `연 ${won(c.annual)} · 감가 제외 현금 지출 월 ${won(c.cashMonthly)} · km당 ${won(c.perKm)}` })}
${tiles([{ label: '현금 지출 (감가 제외) 월', value: c.cashMonthly }, { label: 'km당 비용', value: c.perKm }, { label: '연 합계', value: c.annual }])}
${led('항목별 연 비용', '원 · 1년', carcostLedger(c))}
${section('주행거리별', `차량가 ${manwon(P)} · 휘발유 ${c.eff}km/L · 첫해 · 원`, table(['연 주행거리', '유류비 (연)', '월 유지비', '현금 지출 (월)', 'km당'], kmRows))}
${section('연식별', `연 ${num(c.km)}km · 감가율과 자동차세 경감이 바뀜 · 원`, table(['연식', '감가율', '감가상각 (연)', '자동차세', '월 유지비', '현금 지출 (월)'], ageRows))}
${section('연료별', `차량가 ${manwon(P)} · 연 ${num(c.km)}km · 연비는 연료별 평균 가정 · 전기차 자동차세 13만원 · 원`, table(['연료 (연비 · 단가)', '유류비 (연)', '자동차세', '월 유지비', 'km당'], fuelRows))}
${section('차량가가 바뀌면', '첫해 월 유지비', chips(neighbors(CARCOST_P, pm, 3).map((x) => ({ label: short(x * 10000), value: carcostCalc(x).monthly, href: carcostUrl(x), on: x === pm }))))}
${ad()}
${section('알아두면 좋은 것', null, CARCOST_TIPS)}
${section('이어서 계산하기', null, list([
  { href: '/carcost/', title: '자동차 유지비 계산기', sub: '연비·주행거리·보험료·배기량을 직접 넣기' },
  { href: carUrl(nearest(CAR_PRICES, pm), 60), title: `차값 ${manwon(nearest(CAR_PRICES, pm) * 10000)} 60개월 할부`, sub: '월 납입액과 총 이자' },
  { href: carTaxUrl(c.cc), title: `${num(c.cc)}cc 자동차세`, sub: '연식별 세금과 연납 할인' },
  { href: '/time/', title: '내 시간으로 사는 물건', sub: '자동차는 몇 시간 일한 값인가' },
]))}
${CARCOST_NOTE}`;
  write(url, shell({ url, title, desc, body, nav: 'loan' }));
}

function carcostIndex() {
  const url = '/carcost/';
  const inp = (id, label, value) => `<label class="ye-f"><span>${label}</span><input id="${id}" type="text" inputmode="decimal" value="${value}"></label>`;
  const ex = carcostCalc(3000);
  const rows = CARCOST_P.map((pm) => { const c = carcostCalc(pm), c4 = carcostCalc(pm, { age: 4 }); return { cells: [`<a href="${carcostUrl(pm)}">${manwon(pm * 10000)}</a><br><small>${num(c.cc)}cc 가정</small>`, num(c.fuelCost + c.tax + c.insurance + c.maintenance + c.parking), num(c.depreciation), num(c.monthly), num(c.cashMonthly), num(c4.monthly)] }; });
  const body = `
${crumb([['/', '홈'], [null, '자동차 유지비']])}
<h1 class="title">자동차 유지비 계산기 — 차량가별 월·연 비용 (유류비·보험·세금·감가)</h1>
<p class="meta">유류비 + 자동차세 + 보험료 + 정비·소모품 + 주차·통행료 + 감가상각 · ${CC.CARCOST_ASOF} 어림 · 입력값은 이 기기 밖으로 나가지 않습니다</p>
${lead(`자동차 유지비는 기름값만이 아닙니다. 차량가 3,000만원 휘발유차(12km/L)를 연 15,000km 타면 유류비 ${won(ex.fuelCost)}, 자동차세 ${won(ex.tax)}, 보험료 ${won(ex.insurance)}, 정비 ${won(ex.maintenance)}, 주차·통행료 ${won(ex.parking)}에 첫해 감가상각 ${won(ex.depreciation)}까지 연 ${won(ex.annual)}, 월 ${won(ex.monthly)}이 듭니다. 감가를 뺀 현금 지출만 봐도 월 ${won(ex.cashMonthly)}, km당 ${won(ex.perKm)}입니다. 아래에 내 차 조건을 넣으면 항목별로 다시 계산합니다.`)}
<form class="quick ye-form" id="cc-form">
<div class="ye-grid">
${inp('cc-price', '차량가 (만원)', 3000)}
${inp('cc-age', '연식 (구입 후 몇 년째)', 1)}
<label class="ye-f"><span>연료</span><select id="cc-fuel">${Object.values(CC.FUELS).map((F) => `<option value="${F.key}">${F.label}</option>`).join('')}</select></label>
${inp('cc-eff', '연비 (km/L · 전기는 km/kWh)', 12)}
${inp('cc-km', '연 주행거리 (km)', 15000)}
${inp('cc-fuelprice', '연료 단가 (원/L · 원/kWh)', 1650)}
${inp('cc-cc', '배기량 (cc · 전기차는 무시)', 1999)}
${inp('cc-ins', '보험료 (연 · 만원)', 80)}
${inp('cc-maint', '정비·소모품 (연 · 만원)', 50)}
${inp('cc-park', '주차·통행료 (월 · 만원)', 5)}
</div>
</form>
<div class="hero"><div class="hero-label">월 유지비 (감가상각 포함)</div><div class="hero-num"><span class="num" id="cc-monthly">0</span><span class="unit">원</span></div><div class="hero-sub" id="cc-sub">계산 중</div></div>
<div class="tiles"><div class="tile"><small>현금 지출 (감가 제외) 월</small><span class="num" id="cc-cash">0</span></div><div class="tile"><small>km당 비용</small><span class="num" id="cc-perkm">0</span></div><div class="tile"><small>연 합계</small><span class="num" id="cc-annual">0</span></div></div>
<div id="cc-tips"></div>
<div class="ledger"><div class="lg-head"><h2>항목별 연 비용</h2><span>원 · 1년</span></div><div id="cc-rows"></div></div>
<p class="sub" style="margin-top:8px"><a id="cc-link" href="${carcostUrl(3000)}">차량가 3,000만원 표로 →</a></p>
${section('차량가별 유지비', '휘발유 12km/L · 연 15,000km · 보험 80만 · 정비 50만 · 주차 월 5만 · 원 · 차량가를 누르면 주행거리·연식·연료별 표', table(['차량가', '현금 지출 (연)', '첫해 감가', '월 유지비 (첫해)', '현금 지출 (월)', '4년차 월 유지비'], rows))}
${ad()}
${section('기본값으로 쓴 단가', `${CC.CARCOST_ASOF} 어림 · 계산기에서 바꿀 수 있습니다`, table(['항목', '기본값', '비고'], [
  { cells: ['휘발유 · 경유 · LPG', '1,650 · 1,550 · 1,000원/L', '전국 평균 안팎 · 오피넷에서 확인'] },
  { cells: ['전기', '350원/kWh', '공용 급속·완속 평균 · 집 완속은 더 쌈'] },
  { cells: ['연비', '휘발유 12 · 경유 14 · LPG 9km/L · 전기 5km/kWh', '복합연비 기준 · 시내 주행은 더 낮음'] },
  { cells: ['자동차세', '배기량 × 80·140·200원 + 교육세 30%', '3년차부터 해마다 5% 경감 · 전기차 13만원'] },
  { cells: ['감가상각', '첫해 20% · 2~3년차 15% · 4년차~ 10%', '차량가 기준 단순 정액'] },
  { cells: ['보험 · 정비 · 주차', '연 80만 · 연 50만 · 월 5만', '나이·경력·차종·지역에 따라 차이 큼'] },
]))}
${section('자주 묻는 것', null, `<div class="doc">
<p><b>감가상각을 왜 유지비에 넣나요?</b> 차를 팔 때 돌려받지 못하는 돈이라 실제로는 가장 큰 비용입니다. 다만 매달 통장에서 나가지는 않으니 '현금 지출' 숫자를 따로 보여 줍니다. 차를 오래 탈수록 연평균 감가는 줄어듭니다.</p>
<p><b>월 100만원이면 차를 사도 되나요?</b> 유지비가 월 실수령의 15~20%를 넘으면 부담스럽다는 게 통념입니다. 월 실수령 300만원이면 유지비 45~60만원 안에서, 할부금까지 더하면 그 이상이 됩니다. 실수령액은 <a href="/monthly/">월급 실수령액표</a>에서 보세요.</p>
<p><b>기름값이 오르면?</b> 연 15,000km에 12km/L면 1년에 1,250L를 쓰니 리터당 100원이 오르면 연 12만 5천원, 월 1만원 남짓 늘어납니다. 계산기의 연료 단가를 바꿔 보세요.</p>
<p><b>경차는 얼마나 싼가요?</b> 자동차세(998cc 연 ${won(CT.carTax(998).total)}), 취득세 4%, 보험료·통행료 할인, 연비까지 더해 같은 거리라면 중형차의 절반 안팎입니다.</p>
</div>`)}
${section('알아두면 좋은 것', null, CARCOST_TIPS)}
${section('이어서 계산하기', null, list([{ href: '/car-loan/', title: '자동차 할부', sub: '차값·개월별 월 납입액' }, { href: '/car-tax/', title: '배기량별 자동차세', sub: '연식별 세금과 연납 할인' }, { href: '/monthly/', title: '월급 실수령액표', sub: '유지비는 실수령의 몇 %인지' }, { href: '/time/', title: '내 시간으로 사는 물건', sub: '자동차는 몇 시간 일한 값인가' }]))}
${CARCOST_NOTE}`;
  write(url, shell({ url, title: `자동차 유지비 계산기 — 차량가 2,000~8,000만원 월·연 비용 (유류비·보험·자동차세·감가, ${CC.CARCOST_ASOF})`, desc: '차량가·연식·연료·연비·주행거리·보험료·배기량을 넣으면 유류비, 자동차세, 보험료, 정비비, 주차비, 감가상각을 더한 월·연 유지비와 km당 비용을 계산합니다. 차량가별 표, 주행거리·연식·연료별 비교, 감가 제외 현금 지출.', body, nav: 'loan', scripts: ['/js/engine.js', '/js/carcost.js'] }));
}

/* ---------- 연차휴가·연차수당 ---------- */
const ANNUAL_YEARS = range(1, 25, 1);
const ANNUAL_PAYS = range(200, 600, 25);
const annualUrl = (y) => `/annual/${y}/`;
const annualPayUrl = (m) => `/annual/pay/${m}/`;
const ANNUAL_NOTE = `<p class="note">근로기준법 제60조(연차 유급휴가)·제61조(연차 유급휴가의 사용 촉진)와 제49조(임금채권 소멸시효 3년)의 기준으로 계산했습니다. 1일 통상임금은 월급 전부가 통상임금이라고 보고 209시간으로 나눈 값이라 고정 상여·수당이 있으면 실제 통상임금이 더 큽니다. 출근율 80% 미만, 회계연도 기준을 쓰는 회사, 상시 근로자 5인 미만 사업장(연차 규정 적용 제외)은 결과가 다릅니다. 참고용이며 정확한 일수와 금액은 회사 취업규칙과 고용노동부 고객상담센터(1350)에서 확인하세요. <a href="/method/">계산 기준 보기</a></p>`;
const ANNUAL_TIPS = `<div class="doc">
<p><b>연차는 언제 생기나.</b> 입사 1년 미만일 때는 한 달을 개근할 때마다 1일씩, 최대 11일이 생깁니다. 1년을 채우고 그 기간 80% 이상 출근했으면 15일이 한꺼번에 생기고, 3년째부터는 2년마다 1일씩 늘어 최대 25일에서 멈춥니다. 1년 미만에 받은 11일과 1년째의 15일은 따로여서 입사 2년 차까지 최대 26일을 쓸 수 있습니다.</p>
<p><b>회사가 사용을 촉진하면 수당이 없어질 수 있습니다.</b> 근로기준법 제61조에 따라 회사가 연차 소멸 6개월 전에 남은 일수를 서면으로 알리고, 근로자가 사용 시기를 정해 통보하지 않으면 회사가 시기를 지정해 다시 서면으로 통보하는 절차를 모두 지켰는데도 쓰지 않았다면 미사용 연차수당을 주지 않아도 됩니다. 구두 통보나 메신저 공지만으로는 촉진 효력이 없다는 것이 고용노동부 해석입니다.</p>
<p><b>못 받은 연차수당은 3년 안에 청구.</b> 연차수당은 임금이라 근로기준법 제49조의 소멸시효 3년이 적용됩니다. 연차가 소멸한 다음 날부터 3년 안에 청구해야 하고, 회사가 주지 않으면 고용노동부에 임금체불로 진정할 수 있습니다.</p>
<p><b>언제 받나.</b> 연차가 소멸한 다음 달 임금 지급일에 미사용 일수만큼 받는 것이 보통입니다. 퇴사할 때는 남은 연차를 모두 수당으로 정산해야 하고, 퇴직일부터 14일 안에 지급해야 합니다.</p>
<p><b>회계연도 기준을 쓰는 회사.</b> 법의 원칙은 입사일 기준이지만 관리 편의로 1월 1일을 기준으로 삼는 회사가 많습니다. 이때 입사 다음 해 1월 1일에 15일 × (입사일부터 12월 31일까지 일수 ÷ 365)의 비례연차를 줍니다. 다만 퇴직할 때 입사일 기준으로 계산한 연차보다 적으면 그 차액을 채워 줘야 합니다.</p>
<p><b>5인 미만 사업장은 연차가 없습니다.</b> 상시 근로자 5명 미만 사업장에는 근로기준법 제60조가 적용되지 않아 연차휴가와 연차수당 의무가 없습니다. 다만 근로계약이나 취업규칙으로 정했다면 그대로 지켜야 합니다.</p>
<p><b>연차수당에도 세금이 붙습니다.</b> 연차수당은 근로소득이라 지급한 달의 급여에 더해 4대보험과 소득세를 뗍니다. 한 번에 큰 금액을 받으면 그달 간이세액이 올라가지만 연말정산에서 정산됩니다.</p>
</div>`;

const annualLadderRows = (active) => ANNUAL_YEARS.map((y) => {
  const d = AN.annualDays(y);
  return { cls: y === active ? 'on' : '', cells: [`<a href="${annualUrl(y)}">${y}년</a>`, `${d}일`, y >= 3 && d > AN.ANNUAL_BASE ? `+${d - AN.ANNUAL_BASE}일` : '기본', num(AN.annualPay(3000000, d).total)] };
});
const annualUnderRows = () => range(1, 11, 1).map((m) => ({ cells: [`${m}개월 개근`, `${AN.underOneYear(m)}일`, num(AN.annualPay(3000000, AN.underOneYear(m)).total)] }));
const annualProratedRows = () => range(1, 12, 1).map((mo) => {
  const p = AN.prorated(`${PREV}-${String(mo).padStart(2, '0')}-01`);
  return { cells: [`${mo}월 1일 입사`, `${p.days}일`, `${p.days1.toFixed(1)}일`, `${p.ceil}일`] };
});
const annualBumpRows = () => AN.bumpYears().map((b) => ({ cells: [`<a href="${annualUrl(b.years)}">${b.years}년</a>`, `${b.days}일`, `${b.days - AN.ANNUAL_BASE}일`] }));

function annualYearPage(y) {
  const d = AN.annualDays(y);
  const url = annualUrl(y);
  const p3 = AN.annualPay(3000000, d);
  const title = `근속 ${y}년 연차 ${d}일 — 연차수당 계산과 발생 기준 (근로기준법 제60조)`;
  const desc = `근속 ${y}년이면 연차는 ${d}일입니다. 1년 이상 15일에 3년째부터 2년마다 1일씩 더해 한도 25일까지 늘어납니다. 월 통상임금 300만원이면 ${d}일을 다 쓰지 않았을 때 연차수당 ${won(p3.total)}이고, 월 통상임금별 표와 1년 미만 연차, 회계연도 기준 비례연차까지 정리했습니다.`;
  const bump = d < AN.ANNUAL_MAX ? (y < 3 ? 3 : y % 2 === 1 ? y + 2 : y + 1) : null;
  const wageRows = ANNUAL_PAYS.map((m) => {
    const a = AN.annualPay(m * 10000, d);
    return { cls: m === 300 ? 'on' : '', cells: [`<a href="${annualPayUrl(m)}">${manwon(m * 10000)}</a>`, num(a.hourly), num(a.daily), num(a.total), num(AN.annualPay(m * 10000, Math.round(d / 2)).total)] };
  });
  const body = `
${crumb([['/annual/', '연차·연차수당'], [null, `근속 ${y}년`]])}
<h1 class="title">근속 ${y}년 연차는 ${d}일</h1>
<p class="meta">근로기준법 제60조 · 1년 이상 15일 + 3년째부터 2년마다 1일 (한도 25일) · 상시 5인 이상 사업장</p>
${lead(`근속 ${y}년 차 근로자는 1년간 80% 이상 출근했다면 연차 유급휴가 ${d}일이 생깁니다. ${y === 1 ? '1년 이상 근무의 기본 일수인 15일이고, 3년째가 되면 16일로 하루 늘어납니다.' : d === AN.ANNUAL_MAX ? '가산 한도인 25일에 닿아 그 뒤로는 근속이 아무리 길어져도 25일로 같습니다.' : `기본 15일에 가산 ${d - AN.ANNUAL_BASE}일이 붙은 일수이고, 근속 ${bump}년이 되면 ${AN.annualDays(bump)}일로 하루 더 늘어납니다.`} 월 통상임금이 300만원이라면 1일 통상임금은 ${won(p3.daily)}이라, ${d}일을 하나도 쓰지 않았을 때 연차수당은 ${won(p3.total)}입니다.`)}
${hero({ label: `근속 ${y}년 연차 일수`, value: d, unit: '일', sub: `기본 15일 ${d > AN.ANNUAL_BASE ? `+ 가산 ${d - AN.ANNUAL_BASE}일` : '(가산 없음)'} · 월 통상임금 300만원이면 전부 미사용 시 ${won(p3.total)}` })}
${led('연차 일수 계산', '근로기준법 제60조 · 일', [
  ['1년 이상 80% 출근 (제60조 제1항)', '15', '기본 연차'],
  ['3년 이상 가산 (제60조 제4항)', d > AN.ANNUAL_BASE ? `+${d - AN.ANNUAL_BASE}` : '0', y < 3 ? '근속 3년부터 2년마다 1일' : `(${y} − 1) ÷ 2 = ${Math.floor((y - 1) / 2)}일`],
  ['한도 25일 (제60조 제4항 단서)', d === AN.ANNUAL_MAX ? '적용' : '해당 없음', '21년 이상은 모두 25일'],
  [`근속 ${y}년 연차`, `${d}일`, ''],
])}
${tiles([{ label: '1일 통상임금 (월 300만)', value: p3.daily }, { label: `${d}일 전부 미사용`, value: p3.total }, { label: '절반만 남기면', value: AN.annualPay(3000000, Math.round(d / 2)).total }])}
${section('월 통상임금별 연차수당', `근속 ${y}년 · 연차 ${d}일 · 1일 통상임금 = 월 통상임금 ÷ 209시간 × 8시간 · 원`, table(['월 통상임금', '통상시급', '1일 통상임금', `${d}일 미사용`, `${Math.round(d / 2)}일 미사용`], wageRows))}
${section('근속이 달라지면', '연차 일수', chips(neighbors(ANNUAL_YEARS, y, 3).map((x) => ({ label: `${x}년`, value: AN.annualDays(x), href: annualUrl(x), on: x === y }))))}
${ad()}
${section('근속연수별 연차 일수', '근로기준법 제60조 · 월 통상임금 300만원 기준 전부 미사용 수당', table(['근속', '연차', '가산', '수당 (월 300만)'], annualLadderRows(y)))}
${section('입사 1년 미만이면', '1개월 개근할 때마다 1일씩, 최대 11일 (제60조 제2항) · 1년을 채우면 15일이 따로 생겨 2년 차까지 최대 26일', table(['근속', '연차', '수당 (월 300만)'], annualUnderRows()))}
${section('회계연도(1월 1일) 기준이라면', '법의 원칙은 입사일 기준이지만 1월 1일로 맞추는 회사가 많습니다. 이때 입사 다음 해 1월 1일에 15일 × (입사일부터 12월 31일까지 일수 ÷ 365)의 비례연차를 줍니다. 소수점은 법에 정한 것이 없어 회사 규정에 따라 반올림하거나 절상합니다.', table([`${PREV}년 입사일`, '남은 일수', '비례연차', '절상하면'], annualProratedRows()))}
<div class="callout"><b>연차 사용 촉진(제61조)</b> — 회사가 소멸 6개월 전 서면 통보, 근로자의 사용 시기 지정, 회사의 재통보라는 절차를 모두 지켰는데도 쓰지 않으면 미사용 연차수당을 주지 않아도 됩니다. 반대로 절차가 없었다면 <b>연차수당 청구권은 3년</b>(제49조) 안에 청구할 수 있습니다.</div>
${section('알아두면 좋은 것', null, ANNUAL_TIPS)}
${section('이어서 계산하기', null, list([
  { href: '/annual/', title: '연차·연차수당 계산기', sub: '입사일과 월 통상임금을 넣으면 올해 연차와 수당' },
  { href: annualPayUrl(300), title: '월 통상임금 300만원 연차수당', sub: `1일 ${won(AN.annualPay(3000000, 1).daily)}` },
  { href: otUrl(nearest(OT_PAYS, 300)), title: '월급 300만원 연장·야간수당', sub: `연장 1시간 ${won(LB.overtime(3000000).ext)}` },
  { href: retireUrl(nearest(RETIRE_PAYS, 300), nearest(RETIRE_YEARS, y)), title: `월급 300만원 · ${nearest(RETIRE_YEARS, y)}년 퇴직금`, sub: '세전·세후' },
]))}
${ANNUAL_NOTE}`;
  write(url, shell({ url, title, desc, body, nav: 'monthly' }));
}

function annualPayPage(m) {
  const wage = m * 10000;
  const a10 = AN.annualPay(wage, 10);
  const url = annualPayUrl(m);
  const title = `월 통상임금 ${manwon(wage)} 연차수당 — 1일 ${won(a10.daily)} · 미사용 10일 ${won(a10.total)}`;
  const desc = `월 통상임금 ${manwon(wage)}의 1일 통상임금은 ${won(a10.daily)}(통상시급 ${won(a10.hourly)} × 8시간)이라 미사용 연차 10일이면 연차수당 ${won(a10.total)}입니다. 미사용 일수별 금액과 근속연수별 연차 일수, 통상임금에 무엇이 들어가는지까지 정리했습니다.`;
  const dayRows = [1, 2, 3, 5, 7, 10, 12, 15, 20, 25].map((d) => ({ cls: d === 10 ? 'on' : '', cells: [`${d}일`, num(AN.annualPay(wage, d).total)] }));
  const yearRows = ANNUAL_YEARS.filter((y) => y <= 5 || y % 2 === 1 || y === 25).map((y) => {
    const d = AN.annualDays(y);
    return { cells: [`<a href="${annualUrl(y)}">${y}년</a>`, `${d}일`, num(AN.annualPay(wage, d).total), num(AN.annualPay(wage, Math.round(d / 2)).total)] };
  });
  const body = `
${crumb([['/annual/', '연차·연차수당'], [null, `월 통상임금 ${manwon(wage)}`]])}
<h1 class="title">월 통상임금 ${manwon(wage)}의 연차수당</h1>
<p class="meta">1일 통상임금 = 월 통상임금 ÷ 209시간 × 8시간 · 월급 전부가 통상임금이라고 가정 · 근로기준법 제60조</p>
${lead(`월 통상임금이 ${manwon(wage)}이면 통상시급은 ${won(a10.hourly)}(÷ 209시간), 1일 통상임금은 여기에 8시간을 곱한 ${won(a10.daily)}입니다. 미사용 연차가 10일이면 ${won(a10.total)}, 1년 이상 근속의 기본 연차 15일을 하나도 쓰지 않으면 ${won(AN.annualPay(wage, 15).total)}, 가산이 한도까지 붙은 25일이면 ${won(AN.annualPay(wage, 25).total)}입니다.`)}
${hero({ label: '1일 통상임금 (연차 하루 값)', value: a10.daily, sub: `통상시급 ${won(a10.hourly)} × 8시간 · 10일이면 ${won(a10.total)} · 15일이면 ${won(AN.annualPay(wage, 15).total)}` })}
${led('1일 통상임금 계산', '원', [
  ['월 통상임금', num(wage), '기본급 + 고정수당 (성과급·연장수당 제외)'],
  ['÷ 월 소정근로 209시간', num(a10.hourly), '주 40시간 + 주휴 8시간 = 월 209시간'],
  ['× 1일 소정근로 8시간', num(a10.daily), '연차 하루치 통상임금'],
  ['× 미사용 10일', num(a10.total), '연차수당'],
])}
${tiles([{ label: '5일 미사용', value: AN.annualPay(wage, 5).total }, { label: '15일 미사용', value: AN.annualPay(wage, 15).total }, { label: '25일 미사용', value: AN.annualPay(wage, 25).total }])}
${section('미사용 일수별 연차수당', `월 통상임금 ${manwon(wage)} · 1일 ${won(a10.daily)} · 원`, table(['미사용 연차', '연차수당'], dayRows))}
${section('근속연수별로 보면', '그 근속의 연차를 전부 안 썼을 때와 절반만 남겼을 때 · 원', table(['근속', '연차', '전부 미사용', '절반 미사용'], yearRows))}
${ad()}
${section('월 통상임금이 바뀌면', '1일 통상임금', chips(neighbors(ANNUAL_PAYS, m, 3).map((x) => ({ label: short(x * 10000), value: AN.annualPay(x * 10000, 1).daily, href: annualPayUrl(x), on: x === m }))))}
<div class="callout"><b>통상임금은 월급과 다를 수 있습니다.</b> 통상임금은 정기적·일률적·고정적으로 주는 임금이라 기본급과 고정수당(직책수당·식대 등)은 들어가고 성과급·연장근로수당은 빠집니다. 2024년 12월 대법원 전원합의체 판결로 재직 조건이 붙은 정기상여금도 통상임금으로 보게 되어 실제 통상임금이 월급보다 커진 회사가 많습니다. 그러면 연차수당도 그만큼 늘어납니다.</div>
${section('알아두면 좋은 것', null, ANNUAL_TIPS)}
${section('이어서 계산하기', null, list([
  { href: '/annual/', title: '연차·연차수당 계산기', sub: '입사일을 넣으면 올해 연차 일수까지' },
  { href: annualUrl(5), title: '근속 5년 연차 17일', sub: '근속연수별 발생 일수' },
  { href: leaveUrl(nearest(OT_PAYS, m)), title: `월급 ${manwon(nearest(OT_PAYS, m) * 10000)} 연차수당표`, sub: '월급 기준 하루 수당' },
  { href: monthlyUrl(nearest(MONTHLIES, m)), title: `월급 ${manwon(nearest(MONTHLIES, m) * 10000)} 실수령액`, sub: '연차수당을 받으면 그달 세금은' },
]))}
${ANNUAL_NOTE}`;
  write(url, shell({ url, title, desc, body, nav: 'monthly' }));
}

function annualIndex() {
  const url = '/annual/';
  const a15 = AN.annualPay(3000000, 15);
  const gridRows = ANNUAL_PAYS.map((m) => ({ cells: [`<a href="${annualPayUrl(m)}">${manwon(m * 10000)}</a>`, num(AN.annualPay(m * 10000, 1).daily), num(AN.annualPay(m * 10000, 5).total), num(AN.annualPay(m * 10000, 10).total), num(AN.annualPay(m * 10000, 15).total), num(AN.annualPay(m * 10000, 25).total)] }));
  const body = `
${crumb([['/', '홈'], [null, '연차·연차수당']])}
<h1 class="title">연차휴가·연차수당 계산기 — 입사일과 통상임금으로 올해 연차</h1>
<p class="meta">근로기준법 제60조·제61조 · 입사일 기준과 회계연도 기준을 함께 계산 · 입력값은 이 기기 밖으로 나가지 않습니다</p>
${lead(`연차 유급휴가는 1년 미만이면 한 달 개근에 1일씩 최대 11일, 1년 이상이면 15일이 생기고 3년째부터 2년마다 1일씩 늘어 최대 25일입니다. 쓰지 않고 남은 연차는 1일 통상임금(월 통상임금 ÷ 209시간 × 8시간)을 곱한 연차수당으로 받습니다. 월 통상임금 300만원이면 하루 ${won(a15.daily)}이라 15일을 남기면 ${won(a15.total)}입니다. 입사일과 월 통상임금, 남은 일수를 넣으면 입사일 기준과 회계연도 기준을 함께 계산합니다.`)}
<form class="quick ye-form" id="an-form">
<div class="ye-grid">
<label class="ye-f"><span>입사일</span><input id="an-hire" type="date" value="${PREV}-03-02"></label>
<label class="ye-f"><span>월 통상임금 (만원)</span><input id="an-wage" type="text" inputmode="numeric" value="300"></label>
<label class="ye-f"><span>미사용 연차 (일)</span><input id="an-unused" type="text" inputmode="numeric" value="10"></label>
</div>
</form>
<div class="hero"><div class="hero-label">미사용 연차수당</div><div class="hero-num"><span class="num" id="an-total">0</span><span class="unit">원</span></div><div class="hero-sub" id="an-sub">계산 중</div></div>
<div class="tiles"><div class="tile"><small>올해 연차 (입사일 기준)</small><span class="num" id="an-days">0</span></div><div class="tile"><small>회계연도(1/1) 기준</small><span class="num" id="an-fiscal">0</span></div><div class="tile"><small>1일 통상임금</small><span class="num" id="an-daily">0</span></div></div>
<div id="an-tips"></div>
<div class="ledger"><div class="lg-head"><h2>계산 흐름</h2><span>원 · 일</span></div><div id="an-rows"></div></div>
<p class="sub" style="margin-top:8px"><a id="an-link" href="${annualUrl(1)}">근속별 연차 표로 →</a></p>
${section('근속연수별 연차 일수', '근로기준법 제60조 · 1년 이상 15일, 3년째부터 2년마다 1일, 한도 25일 · 수당은 월 통상임금 300만원 기준', table(['근속', '연차', '가산', '수당 (월 300만)'], annualLadderRows(null)))}
${ad()}
${section('월 통상임금별 연차수당', '1일 통상임금 = 월 통상임금 ÷ 209시간 × 8시간 · 원 · 금액을 누르면 일수별 표', table(['월 통상임금', '1일', '5일', '10일', '15일', '25일'], gridRows))}
${section('입사 1년 미만', '1개월 개근할 때마다 1일씩 최대 11일 (제60조 제2항)', table(['근속', '연차', '수당 (월 300만)'], annualUnderRows()))}
${section('가산이 붙는 해', '최초 1년을 넘는 계속근로 2년마다 1일 (제60조 제4항)', table(['근속', '연차', '가산'], annualBumpRows()))}
${section('회계연도 기준 첫해 비례연차', `${PREV}년에 입사했다면 ${YEAR}년 1월 1일에 받는 일수 · 15일 × (입사일부터 12월 31일까지 일수 ÷ 365) · 소수점 처리는 회사 규정(반올림 또는 절상)을 따릅니다`, table([`${PREV}년 입사일`, '남은 일수', '비례연차', '절상하면'], annualProratedRows()))}
${section('자주 묻는 것', null, `<div class="doc">
<p><b>1년 일하고 바로 퇴사하면 며칠인가요?</b> 1년 미만 동안 개근한 달마다 받은 최대 11일에, 1년을 꽉 채우고 하루를 더 근무해야 15일이 생깁니다. 정확히 365일째에 퇴사하면 15일은 발생하지 않는다는 것이 대법원 판례(2021다227100)입니다.</p>
<p><b>중간에 육아휴직을 썼는데 연차가 줄어드나요?</b> 육아휴직 기간과 업무상 부상·질병 요양기간, 출산전후휴가는 출근한 것으로 봅니다(제60조 제6항). 2021년 대법원 판결 이후 육아휴직 기간도 출근으로 보아 15일을 그대로 주는 것이 원칙입니다.</p>
<p><b>연차를 못 쓰게 하면?</b> 연차는 근로자가 청구한 시기에 주어야 하고, 사업 운영에 막대한 지장이 있을 때만 시기를 바꿀 수 있습니다(제60조 제5항). 거부만 하고 수당도 주지 않으면 임금체불입니다.</p>
<p><b>주 15시간 미만 초단시간 근로자도 받나요?</b> 4주 평균 주 15시간 미만이면 연차휴가 규정이 적용되지 않습니다(제18조 제3항). 주휴수당도 마찬가지입니다.</p>
<p><b>연차수당은 퇴직금에 들어가나요?</b> 퇴직 전 1년 안에 지급받은 연차수당의 3/12이 평균임금에 들어갑니다. 퇴직하면서 정산받는 연차수당은 평균임금에 넣지 않습니다.</p>
</div>`)}
${section('알아두면 좋은 것', null, ANNUAL_TIPS)}
${section('이어서 계산하기', null, list([
  { href: '/overtime/', title: '연장·야간·휴일수당', sub: '통상시급의 1.5배·2배' },
  { href: '/leave/', title: '월급별 연차수당표', sub: '월급 기준으로 바로 보기' },
  { href: '/retire/', title: '퇴직금 계산표', sub: '연차수당은 평균임금에 3/12 반영' },
  { href: '/monthly/', title: '월급 실수령액표', sub: '연차수당을 받으면 그달 공제는' },
]))}
${ANNUAL_NOTE}`;
  write(url, shell({ url, title: '연차수당 계산기 — 근속연수별 연차 일수와 통상임금별 수당 (근로기준법 제60조)', desc: '입사일과 월 통상임금, 남은 연차 일수를 넣으면 올해 연차 일수와 미사용 연차수당을 입사일 기준·회계연도 기준으로 함께 계산합니다. 근속 1~25년 연차 일수표, 월 통상임금 200~600만원 수당표, 1년 미만 월차와 회계연도 비례연차까지.', body, nav: 'monthly', scripts: ['/js/engine.js', '/js/annual.js'] }));
}

/* ---------- 건강보험료 (직장·지역가입자) ---------- */
const NHIS_E = range(200, 1000, 50);
const NHIS_L = [500, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 6000, 7000, 8500, 10000];
const nhisEmpUrl = (m) => `/nhis/employee/${m}/`;
const nhisLocalUrl = (m) => `/nhis/local/${m}/`;
const NHIS_NOTE = `<p class="note">국민건강보험법 제69조~제73조·시행령과 노인장기요양보험법 제9조에 따른 ${NH.NHIS_ASOF} 계산입니다. 직장가입자는 보수월액 × ${NH.HEALTH_PCT}(근로자·사업주 각 ${NH.HALF_PCT}), 지역가입자는 소득 정률 ${NH.HEALTH_PCT}와 재산 부과점수 × ${NH.POINT_VALUE}원이며 장기요양보험료는 건강보험료의 ${NH.CARE_PCT}입니다. <b>지역가입자 재산 점수는 공단의 60등급표를 6단계로 줄인 근사치</b>라 구간 경계에서 실제와 차이가 납니다. 소득월액보험료(보수 외 소득 연 2,000만원 초과), 피부양자 자격, 경감·감면은 반영하지 않았습니다. 참고용이며 <b>정확한 금액은 <a href="${NH.NHIS_URL}" target="_blank" rel="noopener">국민건강보험공단 모의계산</a>이 정확합니다</b>(고객센터 1577-1000). <a href="/method/">계산 기준 보기</a></p>`;
const NHIS_TIPS = `<div class="doc">
<p><b>정확한 금액은 공단 모의계산에서.</b> 국민건강보험공단 누리집(nhis.or.kr)의 '4대보험료 계산기 · 보험료 모의계산'에 로그인하면 실제 신고 소득과 재산 자료로 계산한 보험료를 볼 수 있습니다. 특히 지역가입자 재산 점수는 60등급표를 그대로 적용해야 해서 이 사이트의 6단계 근사와 차이가 납니다.</p>
<p><b>직장가입자는 절반을 회사가 냅니다.</b> 건강보험료율 ${NH.HEALTH_PCT} 가운데 근로자가 ${NH.HALF_PCT}, 사업주가 ${NH.HALF_PCT}를 냅니다. 장기요양보험료도 같은 비율로 나눕니다. 급여명세서에 찍히는 금액은 근로자 몫뿐이라 회사가 내는 몫까지 더하면 두 배입니다.</p>
<p><b>보수월액에는 상한과 하한이 있습니다.</b> ${NH.NHIS_ASOF} 보수월액 상한은 ${won(NH.WAGE_MAX)}, 하한은 ${won(NH.WAGE_MIN)}입니다. 월급이 상한을 넘어도 보험료는 상한 기준으로 멈추고, 하한보다 적어도 하한으로 계산합니다.</p>
<p><b>지역가입자는 2022년 9월부터 소득 정률제입니다.</b> 예전에는 소득도 등급표로 점수를 매겼지만 이제는 직장가입자와 같은 ${NH.HEALTH_PCT}를 적용합니다. 연소득 ${manwon(NH.LOCAL_MIN_INCOME)} 이하는 최저보험료 ${won(NH.LOCAL_MIN)}만 냅니다.</p>
<p><b>재산은 시가가 아니라 과세표준입니다.</b> 재산세 과세표준(주택은 공시가격 × 공정시장가액비율 60%, 1세대 1주택은 43~45%)에서 기본공제 1억원을 뺀 금액을 점수로 바꿉니다. 전세보증금은 30%를 재산으로 봅니다. 시세 5억짜리 아파트라도 과세표준은 2억 안팎이라 공제 1억을 빼면 점수가 크지 않습니다.</p>
<p><b>자동차는 2024년부터 빠졌습니다.</b> 2024년 2월 부과분부터 자동차는 지역가입자 보험료 산정에서 제외됐습니다. 차가 있어도 보험료가 늘지 않습니다.</p>
<p><b>피부양자가 되면 보험료가 0원입니다.</b> 직장가입자의 배우자·직계존비속·형제자매 가운데 연 소득 2,000만원 이하, 재산과세표준 5.4억원 이하(5.4억~9억이면 소득 1,000만원 이하)이면 피부양자로 등재돼 따로 내지 않습니다. 요건에서 벗어나면 지역가입자로 전환됩니다.</p>
<p><b>퇴직 후에는 임의계속가입을 검토하세요.</b> 직장에서 1년 이상 다녔다면 퇴직 후 36개월까지 직장가입자 때 내던 근로자 부담분 수준으로 낼 수 있습니다. 지역가입자 보험료가 더 크면 퇴직 후 두 달 안에 신청하는 편이 유리합니다.</p>
</div>`;
const nhisPropertyRows = (active) => NH.PROPERTY_TABLE.map((r) => ({
  cls: active != null && NH.propertyPoints(active) === r.points ? 'on' : '',
  cells: [r.to === Infinity ? `${manwon(r.from)} 초과` : r.from === 0 ? `${manwon(r.to)} 이하` : `${manwon(r.from)} 초과 ${manwon(r.to)} 이하`, `${r.points}점`, num(Math.floor(r.points * NH.POINT_VALUE / 10) * 10)],
}));

function nhisEmpPage(m) {
  const wage = m * 10000;
  const e = NH.employee(wage);
  const url = nhisEmpUrl(m);
  const title = `보수월액 ${manwon(wage)} 건강보험료 — 근로자 ${won(e.employee)} (건강 ${num(e.healthEmployee)}·장기요양 ${num(e.careEmployee)})`;
  const desc = `${NH.NHIS_ASOF} 보수월액 ${manwon(wage)}인 직장가입자의 건강보험료는 회사와 반씩 나눠 근로자가 월 ${won(e.employee)}(건강보험 ${won(e.healthEmployee)} + 장기요양 ${won(e.careEmployee)})을 냅니다. 사업주 부담과 연 부담액, 같은 소득을 지역가입자로 낼 때의 보험료까지 비교했습니다.`;
  const lc = NH.local({ income: wage * 12 });
  const rows = NHIS_E.map((x) => { const q = NH.employee(x * 10000); return { cls: x === m ? 'on' : '', cells: [`<a href="${nhisEmpUrl(x)}">${manwon(x * 10000)}</a>`, num(q.healthEmployee), num(q.careEmployee), num(q.employee), num(q.total)] }; });
  const body = `
${crumb([['/nhis/', '건강보험료'], [null, `보수월액 ${manwon(wage)}`]])}
<h1 class="title">보수월액 ${manwon(wage)} 직장가입자 건강보험료</h1>
<p class="meta">${NH.NHIS_ASOF} · 건강보험료율 ${pct(NH.HEALTH_RATE, 2)} (근로자 ${pct(NH.HALF_RATE, 3)} + 사업주 ${pct(NH.HALF_RATE, 3)}) · 장기요양 건강보험료의 ${pct(NH.CARE_RATE, 2)}</p>
${lead(`보수월액 ${manwon(wage)}인 직장가입자의 건강보험료는 ${won(e.health)}이고, 회사와 절반씩 나눠 급여에서 빠지는 근로자 몫은 ${won(e.healthEmployee)}입니다. 여기에 장기요양보험료 ${won(e.care)}의 절반인 ${won(e.careEmployee)}이 더해져 매달 ${won(e.employee)}, 1년이면 ${won(e.annualEmployee)}을 냅니다. 회사도 같은 금액을 내므로 실제로는 매달 ${won(e.total)}이 국민건강보험공단에 들어갑니다.${e.capped ? ` 보수월액이 상한 ${won(NH.WAGE_MAX)}을 넘어 상한 기준으로 계산했습니다.` : ''}`)}
${hero({ label: '근로자 부담 (월)', value: e.employee, sub: `건강보험 ${won(e.healthEmployee)} + 장기요양 ${won(e.careEmployee)} · 회사도 같은 금액 부담 · 연 ${won(e.annualEmployee)}`, bars: [e.employee / (e.employee + e.employer)], legendL: '근로자 50%', legendR: '사업주 50%' })}
${led('보험료 계산', `${NH.NHIS_ASOF} · 원`, [
  ['보수월액', num(e.base), e.capped ? `상한 ${won(NH.WAGE_MAX)} 적용` : e.floored ? `하한 ${won(NH.WAGE_MIN)} 적용` : '월 과세 급여'],
  [`건강보험료 (× ${pct(NH.HEALTH_RATE, 2)})`, num(e.health), `근로자 ${num(e.healthEmployee)} + 사업주 ${num(e.healthEmployer)}`],
  [`장기요양보험료 (건강보험료 × ${pct(NH.CARE_RATE, 2)})`, num(e.care), `근로자 ${num(e.careEmployee)} + 사업주 ${num(e.careEmployer)}`],
  ['합계 (회사 부담까지)', num(e.total), '10원 미만 절사'],
  ['급여에서 빠지는 금액', num(e.employee), '근로자 부담'],
])}
${tiles([{ label: '근로자 연 부담', value: e.annualEmployee }, { label: '사업주 월 부담', value: e.employer }, { label: '건강+장기요양 합계', value: e.total }])}
${section('지역가입자로 내면', `같은 소득(연 ${manwon(wage * 12)})을 지역가입자로 낼 때 — 재산이 없다고 볼 때의 근사치입니다. 직장가입자는 회사가 절반을 내지만 지역가입자는 전액을 스스로 냅니다`, tiles([{ label: '직장가입자 (근로자 몫)', value: e.employee }, { label: '지역가입자 (재산 없음)', value: lc.total }, { label: '차이', value: lc.total - e.employee }]))}
${section('보수월액이 바뀌면', '근로자 부담 (건강 + 장기요양)', chips(neighbors(NHIS_E, m, 3).map((x) => ({ label: short(x * 10000), value: NH.employee(x * 10000).employee, href: nhisEmpUrl(x), on: x === m }))))}
${ad()}
${section('보수월액별 보험료', `${NH.NHIS_ASOF} · 원 · 근로자 부담은 건강보험료와 장기요양보험료의 각 절반`, table(['보수월액', '건강보험 (근로자)', '장기요양 (근로자)', '근로자 합계', '회사 포함 총액'], rows))}
${section('알아두면 좋은 것', null, NHIS_TIPS)}
${section('이어서 계산하기', null, list([
  { href: '/nhis/', title: '건강보험료 계산기', sub: '직장·지역 전환, 재산까지 넣어 계산' },
  { href: nhisLocalUrl(nearest(NHIS_L, Math.round(wage * 12 / 10000))), title: `연소득 ${manwon(nearest(NHIS_L, Math.round(wage * 12 / 10000)) * 10000)} 지역가입자 보험료`, sub: '퇴직하면 얼마를 내는지' },
  { href: monthlyUrl(nearest(MONTHLIES, m)), title: `월급 ${manwon(nearest(MONTHLIES, m) * 10000)} 실수령액`, sub: '4대보험을 모두 뗀 금액' },
  { href: '/rates/', title: `${YEAR}년 4대보험 요율표`, sub: '국민연금·고용보험까지' },
]))}
${NHIS_NOTE}`;
  write(url, shell({ url, title, desc, body, nav: 'monthly' }));
}

function nhisLocalPage(m) {
  const income = m * 10000;
  const l0 = NH.local({ income });
  const url = nhisLocalUrl(m);
  const title = `연소득 ${manwon(income)} 지역가입자 건강보험료 — 월 ${won(l0.total)} (${NH.NHIS_ASOF})`;
  const desc = `${NH.NHIS_ASOF} 연소득 ${manwon(income)}인 지역가입자의 건강보험료는 재산이 없을 때 월 ${won(l0.health)}, 장기요양보험료 ${won(l0.care)}을 더해 ${won(l0.total)}입니다. 재산과세표준별 가산액과 같은 소득 직장가입자와의 비교, 공단 모의계산 안내까지 정리했습니다.`;
  const propRows = NH.PROPERTY_TABLE.map((r) => {
    const p = NH.local({ income, property: r.to === Infinity ? 1200000000 : Math.max(r.from, Math.round((r.from + r.to) / 2)) });
    return { cls: r.points === 0 ? 'on' : '', cells: [r.to === Infinity ? `${manwon(r.from)} 초과` : r.from === 0 ? `${manwon(r.to)} 이하` : `${manwon(r.from)} 초과 ${manwon(r.to)} 이하`, `${r.points}점`, num(p.propertyPart), num(p.health), num(p.total)] };
  });
  const emp = NH.employee(Math.round(income / 12));
  const rows = NHIS_L.map((x) => { const q = NH.local({ income: x * 10000 }); return { cls: x === m ? 'on' : '', cells: [`<a href="${nhisLocalUrl(x)}">${manwon(x * 10000)}</a>`, num(q.incomePart), num(q.care), num(q.total), num(q.annual)] }; });
  const body = `
${crumb([['/nhis/', '건강보험료'], [null, `지역가입자 연소득 ${manwon(income)}`]])}
<h1 class="title">연소득 ${manwon(income)} 지역가입자 건강보험료</h1>
<p class="meta">${NH.NHIS_ASOF} · 소득 정률 ${pct(NH.HEALTH_RATE, 2)} · 재산 부과점수당 ${NH.POINT_VALUE}원 · 자동차 부과 제외 · 재산 점수는 근사</p>
${lead(`지역가입자는 2022년 9월 개편 이후 소득에 직장가입자와 같은 ${pct(NH.HEALTH_RATE, 2)}를 매깁니다. 연소득 ${manwon(income)}이면 ${l0.minimum ? `연소득 ${manwon(NH.LOCAL_MIN_INCOME)} 이하라 최저보험료 ${won(NH.LOCAL_MIN)}` : `월 ${won(l0.incomePart)}`}이고, 재산이 없다면 여기에 장기요양보험료 ${won(l0.care)}을 더해 매달 ${won(l0.total)}, 1년이면 ${won(l0.annual)}입니다. 재산과세표준이 1억원을 넘으면 초과분만큼 점수가 붙어 보험료가 올라갑니다. 직장가입자와 달리 회사가 절반을 내 주지 않아 전액을 스스로 냅니다.`)}
${hero({ label: '월 보험료 (재산 없을 때)', value: l0.total, sub: `건강보험 ${won(l0.health)} + 장기요양 ${won(l0.care)} · 연 ${won(l0.annual)} · 전액 본인 부담` })}
${led('보험료 계산', `${NH.NHIS_ASOF} · 원`, [
  ['연소득', num(income), '사업·근로·이자·배당·연금·기타소득 합계'],
  [l0.minimum ? `최저보험료 (연소득 ${manwon(NH.LOCAL_MIN_INCOME)} 이하)` : `소득 보험료 (연소득 × ${pct(NH.HEALTH_RATE, 2)} ÷ 12)`, num(l0.incomePart), l0.minimum ? '소득이 적어도 이 금액은 냅니다' : '직장가입자와 같은 요율'],
  ['재산 보험료 (부과점수 × ' + NH.POINT_VALUE + '원)', num(l0.propertyPart), '재산과세표준 1억원까지는 기본공제로 0점'],
  ['건강보험료', num(l0.health), '10원 미만 절사'],
  [`장기요양보험료 (× ${pct(NH.CARE_RATE, 2)})`, num(l0.care), ''],
  ['월 합계', num(l0.total), '전액 본인 부담'],
])}
${tiles([{ label: '연 부담액', value: l0.annual }, { label: '같은 소득 직장가입자 (근로자 몫)', value: emp.employee }, { label: '차이', value: l0.total - emp.employee }])}
${section('재산이 있으면 얼마가 더 붙나', `재산과세표준(공시가격 × 공정시장가액비율)에서 기본공제 1억원을 뺀 금액에 점수를 매기고 부과점수당 ${NH.POINT_VALUE}원을 곱합니다. <b>아래 점수는 공단 60등급표를 6단계로 줄인 근사치</b>라 실제와 다를 수 있습니다 · 원`, table(['재산과세표준', '부과점수 (근사)', '재산 보험료', '건강보험료', '장기요양 포함'], propRows))}
<div class="callout"><b>재산 점수는 근사입니다.</b> 공단의 재산등급표는 60등급이고 이 사이트는 이를 6단계로 줄였습니다. 구간 경계에서는 실제 보험료와 차이가 납니다. <b><a href="${NH.NHIS_URL}" target="_blank" rel="noopener">국민건강보험공단 모의계산</a>이 정확합니다</b> — 누리집의 '보험료 모의계산'에 소득·재산을 넣거나 로그인해 실제 부과 자료로 확인하세요(고객센터 1577-1000).</div>
${section('연소득이 바뀌면', '월 보험료 (재산 없을 때)', chips(neighbors(NHIS_L, m, 3).map((x) => ({ label: short(x * 10000), value: NH.local({ income: x * 10000 }).total, href: nhisLocalUrl(x), on: x === m }))))}
${ad()}
${section('연소득별 지역가입자 보험료', `${NH.NHIS_ASOF} · 재산 없음 기준 · 원`, table(['연소득', '소득 보험료', '장기요양', '월 합계', '연 합계'], rows))}
${section('자주 묻는 것', null, `<div class="doc">
<p><b>퇴직했더니 보험료가 늘었습니다.</b> 직장가입자일 때는 회사가 절반을 냈지만 지역가입자는 전액을 스스로 내고, 소득뿐 아니라 재산에도 점수가 붙기 때문입니다. 직장에서 1년 이상 다녔다면 퇴직 후 두 달 안에 <b>임의계속가입</b>을 신청해 36개월까지 직장가입자 때 내던 근로자 부담분 수준으로 낼 수 있습니다.</p>
<p><b>소득은 언제 기준인가요?</b> 매년 11월에 국세청이 확정한 전년도 소득으로 다시 계산해 12월분부터 반영합니다. 프리랜서라면 5월에 신고한 소득이 그해 11월 보험료에 나타납니다.</p>
<p><b>전세로 사는데 재산에 들어가나요?</b> 임차보증금은 30%를 재산으로 봅니다. 여기에도 기본공제 1억원이 적용됩니다.</p>
<p><b>소득이 하나도 없어도 내야 하나요?</b> 지역가입자는 최저보험료 ${won(NH.LOCAL_MIN)}을 냅니다. 직장가입자의 피부양자 요건(연 소득 2,000만원 이하, 재산과세표준 5.4억원 이하)을 채우면 가족의 피부양자로 등재해 0원이 됩니다.</p>
</div>`)}
${section('알아두면 좋은 것', null, NHIS_TIPS)}
${section('이어서 계산하기', null, list([
  { href: '/nhis/', title: '건강보험료 계산기', sub: '재산과 소득을 넣어 직접 계산' },
  { href: nhisEmpUrl(nearest(NHIS_E, Math.round(income / 12 / 10000))), title: `보수월액 ${manwon(nearest(NHIS_E, Math.round(income / 12 / 10000)) * 10000)} 직장가입자 보험료`, sub: '회사와 반씩 낼 때' },
  { href: freeUrl(nearest(FREE, Math.round(income / 12 / 10000))), title: `프리랜서 월 ${manwon(nearest(FREE, Math.round(income / 12 / 10000)) * 10000)} 3.3%`, sub: '3.3% 떼고 실수령은 얼마' },
  { href: incUrl(nearest(INC, Math.round(income / 10000))), title: '종합소득세 계산', sub: '5월 신고 소득이 보험료 기준' },
]))}
${NHIS_NOTE}`;
  write(url, shell({ url, title, desc, body, nav: 'monthly' }));
}

function nhisIndex() {
  const url = '/nhis/';
  const e3 = NH.employee(3000000), l3 = NH.local({ income: 30000000 });
  const empRows = NHIS_E.map((x) => { const q = NH.employee(x * 10000); return { cells: [`<a href="${nhisEmpUrl(x)}">${manwon(x * 10000)}</a>`, num(q.healthEmployee), num(q.careEmployee), num(q.employee), num(q.total)] }; });
  const locRows = NHIS_L.map((x) => { const q = NH.local({ income: x * 10000 }); return { cells: [`<a href="${nhisLocalUrl(x)}">${manwon(x * 10000)}</a>`, num(q.incomePart), num(q.care), num(q.total), num(q.annual)] }; });
  const body = `
${crumb([['/', '홈'], [null, '건강보험료']])}
<h1 class="title">건강보험료 계산기 — 직장가입자 보수월액·지역가입자 소득과 재산</h1>
<p class="meta">${NH.NHIS_ASOF} · 건강보험료율 ${pct(NH.HEALTH_RATE, 2)} · 장기요양 ${pct(NH.CARE_RATE, 2)} · 지역 부과점수당 ${NH.POINT_VALUE}원 · 입력값은 이 기기 밖으로 나가지 않습니다</p>
${lead(`직장가입자는 보수월액에 ${pct(NH.HEALTH_RATE, 2)}를 곱한 건강보험료를 회사와 반씩 냅니다. 보수월액 300만원이면 근로자 몫이 ${won(e3.healthEmployee)}, 장기요양보험료 ${won(e3.careEmployee)}을 더해 매달 ${won(e3.employee)}입니다. 지역가입자는 2022년 9월 개편 이후 소득에 같은 ${pct(NH.HEALTH_RATE, 2)}를 매기고 재산에는 부과점수를 붙이며, 전액을 스스로 냅니다. 연소득 3,000만원에 재산이 없으면 월 ${won(l3.total)}입니다. 자동차는 2024년부터 부과 대상에서 빠졌습니다.`)}
<form class="quick ye-form" id="nh-form">
<div class="ye-grid">
<label class="ye-f"><span>가입 자격</span><select id="nh-type"><option value="employee" selected>직장가입자 (회사와 반씩)</option><option value="local">지역가입자 (전액 본인)</option></select></label>
<label class="ye-f" id="nh-wage-f"><span>보수월액 (만원)</span><input id="nh-wage" type="text" inputmode="numeric" value="300"></label>
<label class="ye-f" id="nh-income-f" hidden><span>연소득 (만원)</span><input id="nh-income" type="text" inputmode="numeric" value="3000"></label>
<label class="ye-f" id="nh-prop-f" hidden><span>재산과세표준 (만원)</span><input id="nh-prop" type="text" inputmode="numeric" value="20000"></label>
</div>
</form>
<div class="hero"><div class="hero-label" id="nh-hero-label">근로자 부담 (월)</div><div class="hero-num"><span class="num" id="nh-total">0</span><span class="unit">원</span></div><div class="hero-sub" id="nh-sub">계산 중</div></div>
<div class="tiles"><div class="tile"><small>건강보험료</small><span class="num" id="nh-health">0</span></div><div class="tile"><small>장기요양보험료</small><span class="num" id="nh-care">0</span></div><div class="tile"><small id="nh-extra-label">회사 부담</small><span class="num" id="nh-extra">0</span></div></div>
<div id="nh-tips"></div>
<div class="ledger"><div class="lg-head"><h2>계산 흐름</h2><span>${NH.NHIS_ASOF} · 원</span></div><div id="nh-rows"></div></div>
<p class="sub" style="margin-top:8px"><a id="nh-link" href="${nhisEmpUrl(300)}">보수월액 300만원 표로 →</a></p>
${section('요율 한눈에', NH.NHIS_ASOF, table(['항목', '기준'], [
  { cells: ['건강보험료율', `${pct(NH.HEALTH_RATE, 2)} (직장은 근로자 ${pct(NH.HALF_RATE, 3)} + 사업주 ${pct(NH.HALF_RATE, 3)})`] },
  { cells: ['장기요양보험료율', `건강보험료 × ${pct(NH.CARE_RATE, 2)}`] },
  { cells: ['보수월액 상한·하한', `${won(NH.WAGE_MAX)} · ${won(NH.WAGE_MIN)}`] },
  { cells: ['지역가입자 소득', `연소득 × ${pct(NH.HEALTH_RATE, 2)} ÷ 12 · 연소득 ${manwon(NH.LOCAL_MIN_INCOME)} 이하는 최저보험료 ${won(NH.LOCAL_MIN)}`] },
  { cells: ['지역가입자 재산', `(재산과세표준 − 기본공제 ${manwon(NH.PROPERTY_DEDUCTION)})을 점수화 × ${NH.POINT_VALUE}원 — 이 사이트는 근사표`] },
  { cells: ['자동차', '2024년 2월 부과분부터 제외'] },
]))}
${ad()}
${section('보수월액별 직장가입자 보험료', `${NH.NHIS_ASOF} · 원 · 회사가 절반을 냅니다 · 금액을 누르면 계산 흐름과 지역가입자 비교`, table(['보수월액', '건강보험 (근로자)', '장기요양 (근로자)', '근로자 합계', '회사 포함 총액'], empRows))}
${section('연소득별 지역가입자 보험료', `${NH.NHIS_ASOF} · 재산 없음 기준 · 전액 본인 부담 · 원`, table(['연소득', '소득 보험료', '장기요양', '월 합계', '연 합계'], locRows))}
${section('지역가입자 재산 점수 (근사)', `재산과세표준에서 기본공제 ${manwon(NH.PROPERTY_DEDUCTION)}을 뺀 금액에 점수를 매기고 부과점수당 ${NH.POINT_VALUE}원을 곱합니다. <b>공단의 60등급표를 6단계로 줄인 근사치</b>라 구간 경계에서 실제와 차이가 납니다 · 원`, table(['재산과세표준', '부과점수 (근사)', '월 재산 보험료'], nhisPropertyRows(null)))}
<div class="callout"><b>공단 모의계산이 정확합니다.</b> 특히 지역가입자 재산 점수는 60등급표를 그대로 적용해야 해서 이 사이트의 근사와 차이가 납니다. <a href="${NH.NHIS_URL}" target="_blank" rel="noopener">국민건강보험공단(nhis.or.kr)</a>의 '보험료 모의계산'이나 고객센터 1577-1000에서 확인하세요.</div>
${section('자주 묻는 것', null, `<div class="doc">
<p><b>급여명세서의 건강보험료가 왜 이 값과 다른가요?</b> 보수월액은 월급 전체가 아니라 비과세(식대 등)를 뺀 과세 급여입니다. 식대 20만원이 비과세라면 보수월액은 월급보다 20만원 적습니다. 또 매년 4월에 전년도 실제 보수로 정산해 추가 납부나 환급이 생깁니다.</p>
<p><b>보수 외 소득이 있으면?</b> 직장가입자라도 이자·배당·임대 등 보수 외 소득이 연 2,000만원을 넘으면 초과분에 소득월액보험료를 따로 냅니다. 이 계산기에는 넣지 않았습니다.</p>
<p><b>지역가입자 보험료가 너무 많이 나옵니다.</b> 소득이 줄었다면 공단에 '조정 신청'을 할 수 있습니다. 폐업·퇴직·소득 감소를 증빙하면 다음 달부터 조정됩니다.</p>
<p><b>장기요양보험료는 뭔가요?</b> 노인장기요양보험의 재원으로, 건강보험료에 ${pct(NH.CARE_RATE, 2)}를 곱해 함께 걷습니다. 직장가입자는 이것도 회사와 반씩 냅니다.</p>
</div>`)}
${section('알아두면 좋은 것', null, NHIS_TIPS)}
${section('이어서 계산하기', null, list([
  { href: '/monthly/', title: '월급 실수령액표', sub: '건강보험을 포함한 4대보험을 다 뗀 금액' },
  { href: '/freelance/', title: '프리랜서 3.3% 계산기', sub: '지역가입자가 되는 경우' },
  { href: '/rates/', title: `${YEAR}년 4대보험 요율표`, sub: '국민연금·고용보험까지' },
  { href: '/pension/', title: '국민연금 예상 수령액', sub: '내는 돈과 받는 돈' },
]))}
${NHIS_NOTE}`;
  write(url, shell({ url, title: `건강보험료 계산기 — 직장가입자 보수월액·지역가입자 소득 재산 (${NH.NHIS_ASOF})`, desc: `${NH.NHIS_ASOF} 건강보험료율 ${pct(NH.HEALTH_RATE, 2)}와 장기요양 ${pct(NH.CARE_RATE, 2)}로 직장가입자 보수월액별 근로자·사업주 부담과 지역가입자 소득·재산 보험료를 계산합니다. 보수월액 200~1,000만원 표, 연소득 500~10,000만원 표, 재산 부과점수 근사표. 정확한 금액은 공단 모의계산에서 확인하세요.`, body, nav: 'monthly', scripts: ['/js/engine.js', '/js/nhis.js'] }));
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
guidePages();
couplePage();
timeIndex(); SALARIES.forEach(timePage);
taxReceiptIndex(); SALARIES.forEach(taxReceiptPage);
goalIndex(); GOALS.forEach((g) => SAVE_M.forEach((mm) => goalPage(g, mm)));
negotiateIndex(); SALARIES.forEach(negotiatePage);
historyIndex(); SALARIES.forEach(historyPage);
yearendPage(); embedPages();
giftIndex(); GIFT_RELS.forEach((r) => { giftRelIndex(r); GIFT_AMOUNTS.forEach((m) => giftPage(r, m)); });
bokbiIndex(); BOKBI.forEach(bokbiPage);
acqIndex(); ACQ.forEach(acqPage);
depositIndex(); DEP_P.forEach((pm) => DEP_N.forEach((nm) => depositPage(pm, nm)));
inhIndex(); INH_CASES.forEach((c) => { inhCaseIndex(c); INH_AMOUNTS.forEach((m) => inhPage(c, m)); });
incIndex(); INC.forEach(incPage);
propIndex(); PROP.forEach(propPage);
carTaxIndex(); carTaxEvPage(); CARS.forEach(carTaxPage);
ltvIndex(); LTV_P.forEach(ltvPage);
subIndex(); SUB_H.forEach((h) => SUB_F.forEach((f) => subPage(h, f)));
plIndex(); PL_WAGES.forEach(plPage); babyPage();
elIndex(); EL_KWH.forEach(elPage);
eitcIndex(); EITC_TYPES.forEach((t) => { eitcTypeIndex(t); EITC_WAGES[t].forEach((m) => eitcPage(t, m)); });
penIndex(); PEN_I.forEach((i) => PEN_Y.forEach((y) => penPage(i, y)));
capIndex(); CAP_SALES.forEach((s) => capCosts(s).forEach((c) => capPage(s, c)));
carcostIndex(); CARCOST_P.forEach(carcostPage);
annualIndex(); ANNUAL_YEARS.forEach(annualYearPage); ANNUAL_PAYS.forEach(annualPayPage);
nhisIndex(); NHIS_E.forEach(nhisEmpPage); NHIS_L.forEach(nhisLocalPage);
fs.writeFileSync(path.join(OUT, 'js', 'engine.js'), makeBundle(NT));
docs();

const indexable = urls.filter((u) => !['/terms/', '/privacy/'].includes(u));
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexable.map((u) => `<url><loc>${SITE}${u}</loc><lastmod>${BUILD_ISO}</lastmod></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
fs.writeFileSync(path.join(OUT, 'CNAME'), 'donpyo.com\n');   /* 스킴 없이 도메인만 — 생일첩에서 'http://'가 섞여 인증서가 멈췄던 전례 */
console.log(`돈표 빌드 완료: 페이지 ${urls.length}장, ${((Date.now() - t0) / 1000).toFixed(1)}s`);
