/* RSS 피드 — 빌드가 끝난 dist/ 의 사이트맵과 페이지에서 최신 50개를 골라 dist/rss.xml 로.
 * 네이버 서치어드바이저에 RSS 를 한 번 등록해 두면 그 뒤로는 네이버가 알아서 새 글을 가져간다(등록 API 는 없다).
 * 날짜: 주소가 /YYYY/MM/DD/ 꼴이면 그 날짜(생일첩 날짜 페이지), 아니면 사이트맵 lastmod. 같은 날짜면 사이트맵에 적힌 순서.
 * build.mjs 끝에서 불러 쓴다. 사주첩·생일첩·꿈첩·타로첩·돈표·바디집 저장소에 같은 파일이 있다 — 고치면 모두 고칠 것. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const LIMIT = 50;
const x = (s) => String(s).replace(/&(?!amp;|lt;|gt;|quot;|#)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const un = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const meta = (h, re) => { const m = h.match(re); return m ? un(m[1]) : ''; };

const home = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const site = new URL(meta(home, /<link rel="canonical" href="([^"]+)"/)).origin;
const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

/* 사이트맵(색인 파일이면 하위까지) → [{ url, lastmod, order }] */
const entries = [];
const readMap = (file) => {
  if (!fs.existsSync(file)) return;
  const xml = fs.readFileSync(file, 'utf8');
  if (/<sitemapindex[\s>]/.test(xml)) { for (const m of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) readMap(path.join(DIST, new URL(m[1]).pathname)); return; }
  for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = (m[1].match(/<loc>\s*([^<\s]+)\s*<\/loc>/) || [])[1], lastmod = ((m[1].match(/<lastmod>\s*([^<\s]+)\s*<\/lastmod>/) || [])[1] || '').slice(0, 10);
    if (loc) entries.push({ url: loc.replace(/&amp;/g, '&'), lastmod, order: entries.length });
  }
};
const robots = fs.existsSync(path.join(DIST, 'robots.txt')) ? fs.readFileSync(path.join(DIST, 'robots.txt'), 'utf8') : '';
for (const m of robots.matchAll(/^\s*Sitemap:\s*(\S+)/gim)) readMap(path.join(DIST, new URL(m[1]).pathname));

for (const e of entries) {
  const d = new URL(e.url).pathname.match(/^\/(\d{4})\/(\d{2})\/(\d{2})\/$/);
  e.date = d ? `${d[1]}-${d[2]}-${d[3]}` : (e.lastmod || today);
  e.isDay = !!d;
}
const pool = entries.filter((e) => e.date <= today);
/* 날짜 페이지가 있는 사이트(생일첩)는 최신 날짜 페이지를 앞에, 그 밖에는 lastmod 순 */
pool.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.isDay - a.isDay) || a.order - b.order));
/* 날짜 페이지가 있으면 최신 40개를 먼저 — 다른 페이지는 lastmod 가 모두 빌드 날짜라 날짜 페이지를 밀어낸다 */
const dayFirst = pool.filter((e) => e.isDay).slice(0, 40);
const ordered = dayFirst.concat(pool.filter((e) => !dayFirst.includes(e)));
const items = [];
for (const e of ordered) {
  if (items.length >= LIMIT) break;
  const p = new URL(e.url).pathname;
  const file = path.join(DIST, p.endsWith('/') ? p + 'index.html' : p);
  if (!fs.existsSync(file)) continue;
  const h = fs.readFileSync(file, 'utf8');
  if (/<meta name="robots" content="[^"]*noindex/i.test(h)) continue;
  const title = meta(h, /<title>([^<]*)<\/title>/), desc = meta(h, /<meta name="description" content="([^"]*)"/);
  if (!title || !desc) continue;
  items.push({ ...e, title, desc });
}
const rfc822 = (iso) => new Date(iso + 'T00:00:00+09:00').toUTCString();
fs.writeFileSync(path.join(DIST, 'rss.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${x(meta(home, /<title>([^<]*)<\/title>/))}</title>
  <link>${site}/</link>
  <description>${x(meta(home, /<meta name="description" content="([^"]*)"/))}</description>
  <language>ko</language>
  <lastBuildDate>${rfc822(today)}</lastBuildDate>
  <atom:link href="${site}/rss.xml" rel="self" type="application/rss+xml"/>
${items.map((it) => `  <item>
    <title>${x(it.title)}</title>
    <link>${x(it.url)}</link>
    <guid isPermaLink="true">${x(it.url)}</guid>
    <description>${x(it.desc)}</description>
    <pubDate>${rfc822(it.date)}</pubDate>
  </item>`).join('\n')}
</channel>
</rss>
`);
console.log(`rss.xml — ${items.length}개 (사이트맵 주소 ${entries.length}개 중, 가장 새 글 ${items[0] ? items[0].date : '-'})`);
