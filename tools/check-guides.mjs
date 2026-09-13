/* 서재 글 검사 — 기본 글과 추가분의 body(c)를 실제 계산 문맥으로 렌더해 오류·빈 값·분량·링크를 본다(빌드 없이).
 *   node tools/check-guides.mjs          전체 요약 (문제가 있으면 끝 코드 1)
 *   node tools/check-guides.mjs <slug>   그 글의 제목·설명·본문 글자만 뽑아 보여 줌(교정용) */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GUIDES } from '../data/guides.mjs';
import { GUIDES_EXTRA as A } from '../data/guides-extra-a.mjs';
import { GUIDES_EXTRA as B } from '../data/guides-extra-b.mjs';
import { guideContext } from './guide-context.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const hasDist = fs.existsSync(path.join(DIST, 'index.html'));
const table = (head, rows) => `<table><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr>${rows.map((r) => `<tr>${r.cells.map((x) => `<td>${x}</td>`).join('')}</tr>`).join('')}</table>`;
const c = guideContext({ NT: 200000, table });
const all = [...GUIDES, ...A, ...B];
const slugs = new Set(all.map((g) => g.slug));
const title = (g) => g.title.replace(/\$\{YEAR\}/g, c.YEAR);
const textOf = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const okLink = (h) => {
  const m = h.match(/^\/guide\/([^/]+)\/$/);
  if (m) return slugs.has(m[1]);
  return !hasDist || fs.existsSync(path.join(DIST, h, 'index.html')) || fs.existsSync(path.join(DIST, h));
};

const want = process.argv[2];
if (want) {
  const g = all.find((x) => x.slug === want);
  if (!g) { console.error('없는 slug: ' + want); process.exit(1); }
  console.log(`# ${title(g)}\n${g.desc}\n`);
  console.log(textOf(g.body(c).replace(/<\/(p|h2|li|tr)>/g, '\n')).replace(/ ?\n ?/g, '\n'));
  process.exit(0);
}

let bad = 0;
const seen = new Set();
for (const g of all) {
  const probs = [];
  if (seen.has(g.slug)) probs.push('slug 중복');
  seen.add(g.slug);
  for (const k of ['slug', 'kind', 'title', 'desc', 'body']) if (!g[k]) probs.push(k + ' 없음');
  let html = '';
  try { html = g.body(c); } catch (e) { probs.push('렌더 오류: ' + e.message); }
  const text = textOf(html);
  if (/undefined|NaN|\[object |Infinity/.test(text)) probs.push('빈 값(undefined·NaN)');
  const links = [...html.matchAll(/href="(\/[^"#?]*)/g)].map((m) => m[1]);
  const broken = links.filter((h) => !okLink(h));
  if (broken.length) probs.push('없는 링크 ' + broken.join(' '));
  if ((A.includes(g) || B.includes(g)) && text.length < 2000) probs.push(`분량 ${text.length}자(2,000자 미만)`);
  console.log(`${probs.length ? '✗' : '✓'} ${g.slug} [${g.kind}] ${text.length}자 · 링크 ${links.length}${probs.length ? ' — ' + probs.join(' · ') : ''}`);
  if (probs.length) bad++;
}
console.log(`서재 ${all.length}편(기본 ${GUIDES.length} + 추가 ${A.length + B.length}) · 문제 ${bad}편${hasDist ? '' : ' · dist 없음: 링크는 서재 slug만 확인'}`);
process.exit(bad ? 1 : 0);
