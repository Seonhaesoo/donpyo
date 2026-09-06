/* 돈표 — 페이지 스크립트 (정적 사이트, 서버 없음)
 * 1) 홈 빠른 찾기: 입력한 금액을 가장 가까운 페이지로 보냄
 * 2) 변형 토글: 부양가족·비과세처럼 미리 렌더된 표 블록을 바꿔 보여줌 */
(function () {
  /* 스마트 검색 — "연봉 4200", "2억 30년 4.5%", "시급 12000 주 20시간" 같은 말을 알맞은 페이지로 보냄 */
  var G = window.DONPYO_GRID || {};
  function nearest(arr, v) { if (!arr || !arr.length) return v; return arr.reduce(function (a, b) { return Math.abs(b - v) < Math.abs(a - v) ? b : a; }); }
  function fmtMan(m) { if (m >= 10000) { var eok = Math.floor(m / 10000), rest = m % 10000; return eok + '억' + (rest ? ' ' + rest.toLocaleString('ko-KR') + '만' : ''); } return m.toLocaleString('ko-KR') + '만'; }
  /* 금액 토큰 → 만원. "2억" "2억5천" "3천만" "4200" "1억2000만원" "35000000원" */
  function amounts(t) {
    var out = [], re = /(\d+(?:\.\d+)?)\s*(억|천만원|천만|천|만원|만|원)?/g, x, pending = 0, has = false;
    while ((x = re.exec(t))) {
      var v = parseFloat(x[1]), u = x[2] || '';
      if (u === '억') { pending += v * 10000; has = true; continue; }
      if (u === '천만' || u === '천만원' || u === '천') { pending += v * 1000; has = true; continue; }
      if (u === '만' || u === '만원') { pending += v; has = true; out.push({ man: Math.round(pending), raw: v, unit: u }); pending = 0; has = false; continue; }
      if (u === '원') { out.push({ man: Math.round((pending * 10000 + v) / 10000), raw: v, unit: u }); pending = 0; has = false; continue; }
      if (has) { out.push({ man: Math.round(pending), raw: v, unit: 'partial' }); pending = 0; has = false; }
      out.push({ man: v, raw: v, unit: '' });
    }
    if (has) out.push({ man: Math.round(pending), raw: pending, unit: 'big' });
    return out;
  }
  function pick(t, re) { var m = t.match(re); return m ? parseFloat(m[1]) : null; }
  function parseSmart(s) {
    var t = (s || '').replace(/,/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (!t) return null;
    if (/최저/.test(t)) return { href: '/minimum-wage/', label: '올해 최저임금' };
    if (/순위|상위/.test(t)) return { href: '/rank/', label: '연봉 순위' };
    if (/나이|또래/.test(t)) return { href: '/age/', label: '나이대별 평균 월급' };
    if (/요율/.test(t)) return { href: '/rates/', label: '4대보험 요율표' };
    var A = amounts(t);
    var big = A.filter(function (x) { return x.unit !== '' || x.man >= 100; });
    var first = big.length ? big[0].man : (A.length ? A[0].man : null);
    var years = pick(t, /(\d+)\s*년/), months = pick(t, /(\d+)\s*개월/), rate = pick(t, /(\d+(?:\.\d+)?)\s*(?:%|퍼|프로)/), hours = pick(t, /(?:주\s*)?(\d+)\s*시간/) || pick(t, /주\s*(\d+)/);
    if (rate == null) { var r2 = t.match(/금리\s*(\d+(?:\.\d+)?)/) || t.match(/(?:^|\s)(\d{1,2}\.\d+)(?!\s*(?:억|천|만|년|개월|시간|%))/); if (r2) rate = parseFloat(r2[1]); }
    var man = function (v) { return v >= 100000 ? Math.round(v / 10000) : v; };   /* 원 단위로 적은 경우 */
    if (/시급|알바|아르바이트|주휴/.test(t)) {
      var w = pick(t, /시급\s*(\d+)/) || (A.filter(function (x) { return x.man >= 1000 && x.man < 100000 && !/시간/.test(x.unit); })[0] || {}).man;
      if (!w) return { href: '/hourly/', label: '알바 월급표' };
      var hh = nearest(G.hourlyH || [40], hours || 40);
      return { href: '/hourly/' + nearest(G.hourlyW || [w], w) + '/' + hh + '/', label: '시급 ' + w.toLocaleString('ko-KR') + '원 · 주 ' + hh + '시간 월급' };
    }
    if (/퇴직/.test(t)) {
      if (!first) return { href: '/retire/', label: '퇴직금표' };
      var rp = nearest(G.retireP || [first], man(first)), ry = nearest(G.retireY || [5], years || 5);
      return { href: '/retire/' + rp + '/' + ry + '/', label: '월급 ' + fmtMan(rp) + '원 · ' + ry + '년 퇴직금' };
    }
    if (/실업|구직/.test(t)) {
      if (!first) return { href: '/unemployment/', label: '실업급여표' };
      var up = nearest(G.uiP || [first], man(first)), uy = nearest(G.uiY || [5], years == null ? 5 : years);
      return { href: '/unemployment/' + up + '/' + uy + '/', label: '월급 ' + fmtMan(up) + '원 실업급여' };
    }
    if (/전세|월세|보증금/.test(t)) {
      if (!first) return { href: '/jeonse/', label: '전세 vs 월세' };
      var jd = nearest(G.jeonse || [first], man(first));
      return { href: '/jeonse/' + jd + '/', label: '전세 ' + fmtMan(jd) + '원 vs 월세' };
    }
    if (/적금|저축|예금/.test(t)) {
      if (!first) return { href: '/savings/', label: '적금 이자표' };
      var sm = nearest(G.savM || [first], man(first)), sn = nearest(G.savN || [36], months || (years ? years * 12 : 36));
      return { href: '/savings/' + sm + '/' + sn + '/', label: '월 ' + fmtMan(sm) + '원 · ' + sn + '개월 적금 이자' };
    }
    if (/모으|목표|모을/.test(t) && !/대출|빌/.test(t)) {
      var gl = A.filter(function (x) { return x.man >= 3000; })[0], sv = A.filter(function (x) { return x.man < 3000; })[0];
      var gg = nearest(G.goals || [10000], gl ? gl.man : 10000), gs = nearest(G.saveM || [100], sv ? sv.man : 100);
      return { href: '/goal/' + gg + '/' + gs + '/', label: fmtMan(gg) + '원 모으기 · 월 ' + fmtMan(gs) + '원' };
    }
    if (/자동차|차량|할부/.test(t)) {
      if (!first) return { href: '/car-loan/', label: '자동차 할부표' };
      var cp = nearest(G.carP || [first], man(first)), cn = nearest(G.carN || [60], months || (years ? years * 12 : 60));
      return { href: '/car-loan/' + cp + '/' + cn + '/', label: '차값 ' + fmtMan(cp) + '원 · ' + cn + '개월 할부' };
    }
    if (/프리|3\.3|사업소득/.test(t)) {
      if (!first) return { href: '/freelance/', label: '프리랜서 3.3% 실수령' };
      var fm = nearest(G.free || [first], man(first));
      return { href: '/freelance/' + fm + '/', label: '월 ' + fmtMan(fm) + '원 프리랜서 실수령' };
    }
    if (/연차/.test(t)) { if (!first) return { href: '/leave/', label: '연차수당표' }; var lv = nearest(G.ot || [first], man(first)); return { href: '/leave/' + lv + '/', label: '월급 ' + fmtMan(lv) + '원 연차수당' }; }
    if (/연장|야근|야간|휴일|수당/.test(t)) { if (!first) return { href: '/overtime/', label: '연장·야간·휴일수당표' }; var ov = nearest(G.ot || [first], man(first)); return { href: '/overtime/' + ov + '/', label: '월급 ' + fmtMan(ov) + '원 연장수당' }; }
    if (/dsr|한도|얼마까지|빌릴/.test(t)) { if (!first) return { href: '/dsr/', label: '대출 한도표' }; var dm = nearest(G.salary || [first], man(first)); return { href: '/dsr/' + dm + '/', label: '연봉 ' + fmtMan(dm) + '원 대출 한도' }; }
    var loanish = /대출|억|금리|상환|갚/.test(t) || rate != null || (first && first >= 3000 && years && years >= 10 && !/연봉|월급|실수령/.test(t));
    if (loanish && !/연봉|월급|실수령|연말/.test(t)) {
      if (!first) return { href: '/loan/', label: '대출 상환액표' };
      var la = nearest(G.loanA || [first], man(first)), ly = nearest(G.loanY || [30], years || 30);
      var rs = G.loanR || ['4.5']; var lr = rs.reduce(function (p, q) { return Math.abs(parseFloat(q) - (rate || 4.5)) < Math.abs(parseFloat(p) - (rate || 4.5)) ? q : p; });
      return { href: '/loan/' + la + '/' + ly + '/' + lr + '/', label: '대출 ' + fmtMan(la) + '원 · ' + ly + '년 · ' + lr + '% 월 상환액' };
    }
    if (/연말|환급/.test(t)) return { href: '/yearend/' + (first ? '?a=' + man(first) : ''), label: '연말정산 미리보기' };
    if (!first) return null;
    var v = man(first);
    if (/실수령|세후|손에|받으려면/.test(t) && !/연봉/.test(t)) { var nn = nearest(G.net || [v], v); return { href: '/net/' + nn + '/', label: '월 ' + fmtMan(nn) + '원 실수령하려면 연봉은' }; }
    if (/월급|월 /.test(t) || (!/연봉/.test(t) && v < 1500)) { var mm = nearest(G.monthly || [v], v); return { href: '/monthly/' + mm + '/', label: '월급 ' + fmtMan(mm) + '원 실수령액' }; }
    var sa = nearest(G.salary || [v], v);
    return { href: '/salary/' + sa + '/', label: '연봉 ' + fmtMan(sa) + '원 실수령액' };
  }
  var smart = document.querySelector('form[data-quick="smart"]');
  if (smart) {
    var sin = smart.querySelector('input'), hint = smart.querySelector('[data-hint]'), idle = hint ? hint.textContent : '';
    var show = function () { var r = parseSmart(sin.value); if (!hint) return; if (r) { hint.textContent = '→ ' + r.label; hint.classList.remove('off'); } else { hint.textContent = sin.value.trim() ? '숫자를 함께 적어 주세요 (예: 연봉 4200)' : idle; hint.classList.add('off'); } };
    sin.addEventListener('input', show);
    smart.addEventListener('submit', function (e) { e.preventDefault(); var r = parseSmart(sin.value); if (r) location.href = r.href; else { sin.focus(); show(); } });
    Array.prototype.forEach.call(smart.querySelectorAll('.quick-ex button'), function (bt) { bt.addEventListener('click', function () { sin.value = bt.textContent; show(); sin.focus(); }); });
    if (hint) hint.classList.add('off');
  }

  var forms = document.querySelectorAll('form[data-quick]:not([data-quick="smart"])');
  Array.prototype.forEach.call(forms, function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = f.querySelector('input');
      var v = parseInt((input.value || '').replace(/[^0-9]/g, ''), 10);
      if (!v) { input.focus(); return; }
      var kind = f.getAttribute('data-quick');
      var step = parseInt(f.getAttribute('data-step') || '100', 10);
      var min = parseInt(f.getAttribute('data-min') || '0', 10);
      var max = parseInt(f.getAttribute('data-max') || '0', 10);
      var n = Math.round(v / step) * step;
      if (min && n < min) n = min;
      if (max && n > max) n = max;
      location.href = '/' + kind + '/' + n + '/';
    });
  });

  var groups = document.querySelectorAll('[data-variants]');
  Array.prototype.forEach.call(groups, function (g) {
    var state = {};
    var segs = g.querySelectorAll('[data-dim]');
    function apply() {
      var key = Array.prototype.map.call(segs, function (s) { return state[s.getAttribute('data-dim')]; }).join('-');
      var blocks = g.querySelectorAll('[data-variant]');
      Array.prototype.forEach.call(blocks, function (b) { b.hidden = b.getAttribute('data-variant') !== key; });
      var url = new URL(location.href);
      Array.prototype.forEach.call(segs, function (s) { url.searchParams.set(s.getAttribute('data-dim'), state[s.getAttribute('data-dim')]); });
      history.replaceState(null, '', url.pathname + url.search);
    }
    Array.prototype.forEach.call(segs, function (s) {
      var dim = s.getAttribute('data-dim');
      var q = new URL(location.href).searchParams.get(dim);
      var btns = s.querySelectorAll('button');
      var initial = null;
      Array.prototype.forEach.call(btns, function (b) { if (b.getAttribute('data-value') === q) initial = q; });
      state[dim] = initial || s.getAttribute('data-default');
      Array.prototype.forEach.call(btns, function (b) {
        b.classList.toggle('on', b.getAttribute('data-value') === state[dim]);
        b.addEventListener('click', function () {
          state[dim] = b.getAttribute('data-value');
          Array.prototype.forEach.call(btns, function (x) { x.classList.toggle('on', x === b); });
          apply();
        });
      });
    });
    apply();
  });

  /* 2-1) 복사 버튼 */
  Array.prototype.forEach.call(document.querySelectorAll('[data-copy]'), function (b) {
    b.addEventListener('click', function () {
      var el = document.querySelector(b.getAttribute('data-copy'));
      if (!el) return;
      var text = el.value || el.textContent;
      var done = function () { var t = b.textContent; b.textContent = '복사했어요'; setTimeout(function () { b.textContent = t; }, 1500); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () { el.select && el.select(); });
      else { el.select && el.select(); }
    });
  });

  /* 3) 실수령액 카드 — 1080×1350 이미지를 만들어 공유하거나 저장 */
  var shareBtn = document.querySelector('[data-share-card]');
  if (shareBtn) {
    shareBtn.addEventListener('click', function () {
      var d = shareBtn.dataset;
      var visible = document.querySelector('[data-variant]:not([hidden]) .hero-num .num');
      var l2 = visible ? visible.textContent : d.l2;
      var draw = function () {
        var c = document.createElement('canvas');
        c.width = 1080; c.height = 1350;
        var x = c.getContext('2d');
        x.fillStyle = '#FBF8F1'; x.fillRect(0, 0, 1080, 1350);
        x.fillStyle = '#1E5C46'; x.fillRect(0, 0, 1080, 14);
        x.strokeStyle = '#E3DCCB'; x.lineWidth = 2;
        for (var i = 0; i < 14; i++) { x.beginPath(); x.moveTo(90, 300 + i * 70); x.lineTo(990, 300 + i * 70); x.stroke(); }
        x.fillStyle = '#1E5C46'; x.font = '700 44px "Gowun Batang", serif'; x.fillText('돈표', 90, 130);
        x.fillStyle = '#8A948E'; x.font = '500 26px "Noto Sans KR", sans-serif'; x.fillText('돈 계산 사전 · donpyo.com', 90, 178);
        x.fillStyle = '#17211C'; x.font = '700 64px "Gowun Batang", serif'; x.fillText(d.l1, 90, 420);
        x.fillStyle = '#5F6B64'; x.font = '500 30px "Noto Sans KR", sans-serif'; x.fillText(d.l3, 90, 480);
        x.fillStyle = '#1E5C46'; x.font = '600 150px "IBM Plex Mono", monospace'; x.fillText(l2, 90, 690);
        x.fillStyle = '#17211C'; x.font = '500 40px "Noto Sans KR", sans-serif'; x.fillText('원', 90 + measure(x, l2, '600 150px "IBM Plex Mono", monospace') + 16, 690);
        x.fillStyle = '#B8862B'; x.font = '700 36px "Noto Sans KR", sans-serif'; x.fillText(d.l4, 90, 800);
        x.fillStyle = '#8A948E'; x.font = '400 26px "Noto Sans KR", sans-serif'; x.fillText('국세청 간이세액표 · 4대보험 요율 기준 · 참고용', 90, 1230);
        x.fillStyle = '#1E5C46'; x.fillRect(90, 1270, 900, 3);
        deliver(c);
      };
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw); else draw();
    });
  }
  function measure(x, text, font) { var f = x.font; x.font = font; var w = x.measureText(text).width; x.font = f; return w; }
  function deliver(c) {
    c.toBlob(function (blob) {
      if (!blob) return;
      var file = new File([blob], 'donpyo-card.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: '돈표 실수령액 카드' }).catch(function () {});
        return;
      }
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'donpyo-card.png';
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    }, 'image/png');
  }
})();
