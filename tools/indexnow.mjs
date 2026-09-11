/* 색인 알림(IndexNow) — 배포 직전 떠 있는 사이트맵과 새 사이트맵을 비교해, 새로 생긴 주소만 네이버·빙에 알린다.
 * 서버(seo-dash) 워커의 이중화: VM이 꺼져 있어도 배포할 때 CI가 한 번 더 알린다. 둘이 같은 주소를 알려도 괜찮다.
 * 열쇠는 공개값 — 배포물 루트에 <열쇠>.txt 가 있어야 보낸다.
 *   node tools/indexnow.mjs diff <배포 폴더>   배포 전: robots.txt 의 사이트맵(색인 파일이면 하위까지)을 새것·지금 것 모두 읽어 새 주소 목록 저장
 *   node tools/indexnow.mjs send [--dry]       배포 뒤: 저장한 목록을 보낸다. 어떤 실패도 배포를 실패로 만들지 않는다
 * 사주첩·바디집·돈표·꿈해몽·타로 저장소에 같은 파일이 있다 — 고치면 모두 고칠 것. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const KEY = 'd49d364be4edd2e8b512d402529d63f8';
const ENGINES = [['네이버', 'https://searchadvisor.naver.com/indexnow'], ['빙', 'https://www.bing.com/indexnow']];
const LIMIT = 10000;
const STATE = path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'indexnow-urls.json');
const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));

/* 네트워크 끊김·5xx·429면 20초·60초 뒤 다시 */
async function retry(fn, label, waits = [20, 60]) {
  for (let i = 0; ; i++) {
    let r, err = null;
    try { r = await fn(); } catch (e) { err = e; }
    const again = err || r.status >= 500 || r.status === 429;
    if (!again || i >= waits.length) {
      if (err) throw err;
      return r;
    }
    console.warn(`${label} 일시 오류, ${waits[i]}초 뒤 다시 (${i + 1}/${waits.length}): ${err ? err.message : 'HTTP ' + r.status}`);
    await sleep(waits[i]);
  }
}

const locs = (xml) => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
const isIndex = (xml) => /<sitemapindex[\s>]/.test(xml);

/* 사이트맵 주소 → 새 배포 폴더의 같은 경로 파일 */
function localXml(dir, url) {
  const p = path.join(dir, decodeURIComponent(new URL(url).pathname));
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}
/* 지금 떠 있는 사이트맵 — 캐시를 피하려고 쿼리를 붙인다. 404 는 "아직 없는 사이트맵"이라 빈 것으로 */
async function liveXml(url) {
  const r = await retry(() => fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(), { headers: { 'User-Agent': 'indexnow-ci' } }), '사이트맵 읽기');
  if (r.status === 404) return '';
  if (!r.ok) throw new Error(`${url} HTTP ${r.status}`);
  return r.text();
}
/* 사이트맵 색인 파일이면 하위 사이트맵까지 따라가 주소를 모은다 */
async function collect(roots, read) {
  const out = new Set(), seen = new Set(), queue = [...roots];
  while (queue.length) {
    const u = queue.shift();
    if (seen.has(u)) continue;
    seen.add(u);
    const xml = await read(u);
    if (!xml) continue;
    if (isIndex(xml)) queue.push(...locs(xml)); else locs(xml).forEach((x) => out.add(x));
  }
  return out;
}

async function diff(dir) {
  fs.rmSync(STATE, { force: true });
  const robotsPath = path.join(dir, 'robots.txt');
  if (!fs.existsSync(robotsPath)) { console.log('robots.txt 가 없어 건너뜀'); return; }
  const roots = [...fs.readFileSync(robotsPath, 'utf8').matchAll(/^\s*Sitemap:\s*(\S+)/gim)].map((m) => m[1]);
  if (!roots.length) { console.log('robots.txt 에 사이트맵이 없어 건너뜀'); return; }
  const host = new URL(roots[0]).host;
  if (!fs.existsSync(path.join(dir, KEY + '.txt'))) { console.log('열쇠 파일이 배포물에 없어 건너뜀'); return; }
  const fresh = await collect(roots, async (u) => localXml(dir, u));
  let live;
  try {
    live = await collect(roots, liveXml);
  } catch (e) {
    console.warn('지금 사이트맵을 읽지 못해 이번엔 알리지 않음:', e.message);
    return;
  }
  const added = [...fresh].filter((u) => !live.has(u) && new URL(u).host === host)
    .sort((a, b) => a.length - b.length || (a < b ? -1 : 1));
  fs.writeFileSync(STATE, JSON.stringify({ host, urls: added.slice(0, LIMIT), total: added.length }));
  console.log(`${host}: 새 사이트맵 ${fresh.size}개 · 지금 떠 있는 ${live.size}개 · 새로 생긴 주소 ${added.length}개${added.length > LIMIT ? ` (짧은 주소부터 ${LIMIT}개만)` : ''}`);
  added.slice(0, 10).forEach((u) => console.log('  +', u));
}

async function send(dry) {
  if (!fs.existsSync(STATE)) { console.log('보낼 목록이 없어 건너뜀'); return; }
  const { host, urls } = JSON.parse(fs.readFileSync(STATE, 'utf8'));
  if (!urls.length) { console.log(host + ': 새로 생긴 주소가 없어 알릴 것 없음'); return; }
  const body = JSON.stringify({ host, key: KEY, keyLocation: `https://${host}/${KEY}.txt`, urlList: urls });
  for (const [name, url] of ENGINES) {
    if (dry) { console.log(`[연습] ${name} ← ${urls.length}개 (${body.length}바이트)`); continue; }
    try {
      const r = await retry(() => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body }), name);
      const t = (await r.text()).replace(/\s+/g, ' ').slice(0, 160);
      console.log(`${name}: ${urls.length}개 · HTTP ${r.status}${t ? ' ' + t : ''}`);
    } catch (e) {
      console.warn(`${name}: 보내지 못함 — ${e.message}`);
    }
  }
}

const [cmd, arg] = process.argv.slice(2);
try {
  if (cmd === 'diff') await diff(arg || 'dist');
  else if (cmd === 'send') await send(process.argv.includes('--dry'));
  else { console.error('사용법: node tools/indexnow.mjs diff <배포 폴더> | send [--dry]'); process.exit(2); }
} catch (e) {
  console.warn('색인 알림 건너뜀:', e.message);
}
