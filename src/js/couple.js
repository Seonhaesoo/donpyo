/* 커플 합산 대출 링크 — 서버 없이 URL 해시(#a=연봉&ad=기존상환&b=연봉&bd=기존상환, 단위 만원)로 주고받는다 */
(function () {
  var D = window.Donpyo;
  if (!D) return;
  var $ = function (s) { return document.querySelector(s); };
  var q = function (hash) { var o = {}; (hash || '').replace(/^#/, '').split('&').forEach(function (kv) { var p = kv.split('='); if (p[0]) o[p[0]] = parseInt(p[1], 10) || 0; }); return o; };
  var num = D.num, won = D.won, manwon = D.manwon, pct = D.pct;
  var base = location.origin + location.pathname;

  function limits(annualSum, existingMonthly) {
    var cap = Math.max(0, Math.floor(annualSum * 0.4 / 12) - existingMonthly);
    return { cap: cap, p45: D.loanForPayment(cap, 0.045, 360), p60: D.loanForPayment(cap, 0.06, 360), p35: D.loanForPayment(cap, 0.035, 360) };
  }
  var floorMan = function (v) { return Math.floor(v / 10000) * 10000; };

  function render(a, ad, b, bd) {
    var A = a * 10000, B = b * 10000;
    var na = D.netPay({ annual: A, nontax: D.NT }).net, nb = D.netPay({ annual: B, nontax: D.NT }).net;
    var la = limits(A, ad * 10000), lb = limits(B, bd * 10000), lc = limits(A + B, (ad + bd) * 10000);
    var pay = D.annuityPayment(floorMan(lc.p45), 0.045, 360);
    var jeonseInterest = Math.round(floorMan(lc.p45) * 0.04 / 12);
    var html = '';
    html += '<div class="hero"><div class="hero-label">둘이 합쳐 빌릴 수 있는 돈 (DSR 40% · 30년 · 4.5%)</div><div class="hero-num"><span class="num">' + num(floorMan(lc.p45)) + '</span><span class="unit">원</span></div><div class="hero-sub">합산 연봉 ' + manwon(A + B) + ' · 월 상환 여력 ' + won(lc.cap) + ' · 한도만큼 빌리면 매달 ' + won(pay) + '</div>' +
      '<div class="bar"><i style="width:' + (pay / (na + nb) * 100).toFixed(1) + '%"></i></div><div class="bar-legend"><span>월 상환 ' + pct(pay / (na + nb)) + '</span><span>둘의 실수령 합계 ' + won(na + nb) + '</span></div></div>';
    html += '<div class="tbl" style="margin-top:16px"><table><thead><tr><th>기준</th><th>연봉</th><th>월 실수령</th><th>혼자 한도</th></tr></thead><tbody>' +
      '<tr><td>보낸 사람</td><td>' + num(A) + '</td><td>' + num(na) + '</td><td>' + num(floorMan(la.p45)) + '</td></tr>' +
      '<tr><td>받은 사람</td><td>' + num(B) + '</td><td>' + num(nb) + '</td><td>' + num(floorMan(lb.p45)) + '</td></tr>' +
      '<tr class="sum"><td>합산</td><td>' + num(A + B) + '</td><td>' + num(na + nb) + '</td><td>' + num(floorMan(lc.p45)) + '</td></tr></tbody></table></div>';
    html += '<div class="tiles"><div class="tile"><small>3.5%면</small><span class="num">' + manwon(floorMan(lc.p35)) + '</span></div><div class="tile"><small>스트레스 6%로 계산</small><span class="num">' + manwon(floorMan(lc.p60)) + '</span></div><div class="tile"><small>한도만큼 전세대출 시 월 이자(4%)</small><span class="num">' + num(jeonseInterest) + '</span></div></div>';
    if (ad + bd > 0) html += '<div class="callout">기존 대출 월 ' + won((ad + bd) * 10000) + '을 갚고 있다고 보고 그만큼 여력을 뺐습니다.</div>';
    html += '<div class="callout"><b>읽는 법</b> — 은행권 DSR 40% 기준으로 다른 대출이 없을 때의 최대치입니다. 실제 한도는 LTV(집값 대비 비율), 스트레스 금리, 신용대출 유무에 따라 더 낮을 수 있습니다. 합산 심사는 부부(혼인신고 기준)만 가능하고, 예비부부는 대출 실행 전 혼인신고가 필요한 상품이 많습니다.</div>';
    return html;
  }

  function shareUrl(u, text) {
    if (navigator.share) { navigator.share({ title: '둘이 합쳐 얼마까지 — 돈표', text: text, url: u }).catch(function () {}); return; }
    copy(u);
  }
  function copy(u) {
    var done = function () { var t = $('#cp-toast'); if (t) { t.hidden = false; setTimeout(function () { t.hidden = true; }, 1800); } };
    if (navigator.clipboard) navigator.clipboard.writeText(u).then(done, function () { prompt('링크를 복사하세요', u); });
    else prompt('링크를 복사하세요', u);
  }

  function show(id) { ['cp-start', 'cp-invite', 'cp-result'].forEach(function (x) { var el = $('#' + x); if (el) el.hidden = x !== id; }); }

  function init() {
    var h = q(location.hash);
    if (h.a && h.b) {
      show('cp-result');
      $('#cp-result-body').innerHTML = render(h.a, h.ad || 0, h.b, h.bd || 0);
      var u = base + '#a=' + h.a + (h.ad ? '&ad=' + h.ad : '') + '&b=' + h.b + (h.bd ? '&bd=' + h.bd : '');
      $('#cp-result-link').value = u;
      $('#cp-result-share').onclick = function () { shareUrl(u, '우리 둘이 합쳐 얼마까지 빌릴 수 있는지 계산했어요'); };
      $('#cp-result-copy').onclick = function () { copy(u); };
    } else if (h.a) {
      show('cp-invite');
      $('#cp-invite-a').textContent = manwon(h.a * 10000);
      $('#cp-invite-form').onsubmit = function (e) {
        e.preventDefault();
        var b = parseInt(($('#cp-b').value || '').replace(/[^0-9]/g, ''), 10);
        var bd = parseInt(($('#cp-bd').value || '0').replace(/[^0-9]/g, ''), 10) || 0;
        if (!b) { $('#cp-b').focus(); return; }
        location.hash = '#a=' + h.a + (h.ad ? '&ad=' + h.ad : '') + '&b=' + b + (bd ? '&bd=' + bd : '');
        init(); window.scrollTo(0, 0);
      };
    } else {
      show('cp-start');
      $('#cp-start-form').onsubmit = function (e) {
        e.preventDefault();
        var a = parseInt(($('#cp-a').value || '').replace(/[^0-9]/g, ''), 10);
        var ad = parseInt(($('#cp-ad').value || '0').replace(/[^0-9]/g, ''), 10) || 0;
        if (!a) { $('#cp-a').focus(); return; }
        var u = base + '#a=' + a + (ad ? '&ad=' + ad : '');
        $('#cp-link').value = u;
        $('#cp-link-box').hidden = false;
        $('#cp-share').onclick = function () { shareUrl(u, '연봉 넣으면 우리 둘이 합쳐 얼마까지 빌릴 수 있는지 나와요'); };
        $('#cp-copy').onclick = function () { copy(u); };
        var mine = D.netPay({ annual: a * 10000, nontax: D.NT }).net, l = limits(a * 10000, ad * 10000);
        $('#cp-mine').innerHTML = '혼자면 월 실수령 ' + won(mine) + ', 한도 약 ' + manwon(floorMan(l.p45)) + '. 상대 연봉이 더해지면 여기서 늘어납니다.';
      };
    }
  }
  window.addEventListener('hashchange', init);
  init();
})();
