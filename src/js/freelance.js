/* 프리랜서 3.3%·기타소득 8.8% 계산기 — 소득 구분과 계산 방향(세전↔실수령)을 바꾸면 그 자리에서 다시 계산 (window.Donpyo 엔진) */
(function () {
  var D = window.Donpyo;
  if (!D || !D.withholding) return;
  var num = D.num, won = D.won, manwon = D.manwon, pct = D.pct;
  var $ = function (id) { return document.getElementById(id); };
  var val = function (id) { var v = parseFloat(($(id).value || '0').replace(/[^0-9.]/g, '')); return isNaN(v) ? 0 : v; };
  var row = function (label, value, small) { return '<div class="lg-row"><div class="lbl"><span>' + label + '</span>' + (small ? '<small>' + small + '</small>' : '') + '</div><span class="num">' + value + '</span></div>'; };
  var G = window.DONPYO_GRID || {};
  /* 홈이 아닌 페이지에는 DONPYO_GRID 가 없으므로 격자를 여기에도 둔다 (tools/build.mjs 의 FREE 와 같은 값) */
  var AMOUNTS = G.free || (function () { var o = [50]; for (var i = 100; i <= 1000; i += 50) o.push(i); return o; })();
  var nearest = function (arr, v) { if (!arr || !arr.length) return v; return arr.reduce(function (a, b) { return Math.abs(b - v) < Math.abs(a - v) ? b : a; }); };
  var q = new URL(location.href).searchParams;
  if (q.get('t') && D.FREE_TYPES[q.get('t')]) $('fr-type').value = q.get('t');
  if (q.get('m') === 'net') $('fr-mode').value = 'net';
  if (q.get('a')) $('fr-amount').value = q.get('a');

  function calc() {
    var type = $('fr-type').value, mode = $('fr-mode').value, amount = Math.round(val('fr-amount') * 10000);
    var T = D.FREE_TYPES[type], other = type === 'other';
    $('fr-label').textContent = (mode === 'net' ? '실수령액' : '세전 금액') + ' (만원)';
    var r = mode === 'net' ? D.grossUp(amount, type) : D.withholding(amount, type);
    var gross = r.amount, net = r.net;

    $('fr-hero-label').textContent = mode === 'net' ? '필요한 세전 금액 (계약금액)' : '실수령액';
    $('fr-out').textContent = num(mode === 'net' ? gross : net);
    $('fr-tax').textContent = num(r.tax);
    $('fr-local').textContent = num(r.local);
    $('fr-total').textContent = num(r.total);
    $('fr-sub').textContent = T.short + ' · 원천징수 ' + (other ? '8.8%' : '3.3%') + ' · ' + (mode === 'net' ? '실수령 ' + won(net) + '을 받으려면 계약금액 ' + won(gross) : won(gross) + '에서 ' + won(r.total) + ' 공제') + (r.exempt ? ' · 과세최저한이라 원천징수 없음' : '');

    var rows = [row(mode === 'net' ? '필요한 계약금액 (세전)' : '계약금액 (세전)', num(gross), T.label)];
    if (other) {
      rows.push(row('필요경비 60% 인정', '−' + num(r.expense), '소득세법 시행령 제87조'));
      rows.push(row('기타소득금액 (과세표준)', num(r.base), '총액 × 40%'));
      if (r.exempt) rows.push(row('과세최저한', '0', '건당 ' + won(D.OTHER_MIN) + ' 이하 (기타소득금액 5만원 이하)는 원천징수 없음'));
      else {
        rows.push(row('소득세 (과세표준 × 20%)', num(r.tax), '총액의 8%'));
        rows.push(row('지방소득세 (소득세의 10%)', num(r.local), '총액의 0.8%'));
      }
    } else {
      rows.push(row('소득세 (지급액의 3%)', num(r.tax), ''));
      rows.push(row('지방소득세 (소득세의 10%)', num(r.local), '지급액의 0.3%'));
    }
    rows.push(row('원천징수 합계', num(r.total), r.rate ? pct(r.rate, 1) : '0%'));
    var y = D.freelanceYearly(gross, type);
    rows.push(row('매달 같은 금액을 받으면 연 실수령', num(y.net), '연 수입 ' + num(y.gross) + ' · 연 원천징수 ' + num(y.total)));
    $('fr-rows').innerHTML = rows.join('') + '<div class="lg-total"><span>' + (mode === 'net' ? '실수령' : '실수령') + '</span><span class="num">' + num(net) + '</span></div>';

    var tips = [];
    if (r.exempt) tips.push('기타소득은 건당 지급액이 ' + won(D.OTHER_MIN) + ' 이하이면 기타소득금액이 5만원 이하라 과세최저한(소득세법 제84조)에 걸려 세금을 떼지 않습니다.');
    if (other && !r.exempt) tips.push('기타소득은 필요경비 60%를 인정해 40%에만 22%(소득세 20% + 지방소득세 2%)를 매기므로 총액의 8.8%입니다. 같은 금액이 사업소득이면 3.3%인 ' + won(D.withholding(gross).total) + '만 뗍니다.');
    if (!other) tips.push('사업소득 3.3%는 미리 내는 세금입니다. 다음 해 5월 종합소득세 신고에서 1년 수입에서 필요경비와 공제를 뺀 소득으로 다시 계산해 환급받거나 더 냅니다.');
    if (other && y.net > 7500000) tips.push('연 기타소득 총액이 750만원(기타소득금액 300만원)을 넘으면 분리과세를 고를 수 없고 종합소득에 합산해 신고해야 합니다.');
    tips.push('프리랜서는 직장가입자가 아니라 건강보험·국민연금을 지역가입자로 따로 냅니다. 위 실수령에는 그 비용이 빠져 있습니다 — <a href="/nhis/">건강보험료 계산기</a>에서 연소득으로 확인해 보세요.');
    $('fr-tips').innerHTML = tips.map(function (t) { return '<div class="callout">' + t + '</div>'; }).join('');

    var man = Math.max(50, Math.round(gross / 10000));
    var link = $('fr-link'), fm = nearest(AMOUNTS, man);
    link.href = '/freelance/' + fm + '/';
    link.textContent = manwon(fm * 10000) + ' 표로 →';
  }
  Array.prototype.forEach.call(document.querySelectorAll('#fr-form input, #fr-form select'), function (el) { el.addEventListener('input', calc); el.addEventListener('change', calc); });
  $('fr-form').addEventListener('submit', function (e) { e.preventDefault(); calc(); });
  calc();
})();
