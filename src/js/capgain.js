/* 양도소득세 계산기 — 양도가·취득가·필요경비·보유·거주 기간·주택 수를 바꾸면 그 자리에서 다시 계산 (window.Donpyo 엔진) */
(function () {
  var D = window.Donpyo;
  if (!D || !D.capitalGains) return;
  var num = D.num, won = D.won, manwon = D.manwon;
  var $ = function (id) { return document.getElementById(id); };
  var val = function (id) { var v = parseFloat(($(id).value || '0').replace(/[^0-9.]/g, '')); return isNaN(v) ? 0 : v; };
  var pct0 = function (r) { return Math.round(r * 100) + '%'; };
  var pct1 = function (r) { return (r * 100).toFixed(1) + '%'; };
  var row = function (label, value, small) { return '<div class="lg-row"><div class="lbl"><span>' + label + '</span>' + (small ? '<small>' + small + '</small>' : '') + '</div><span class="num">' + value + '</span></div>'; };
  var neg = function (v) { return v ? '−' + num(v) : '0'; };
  var SALES = [30000, 40000, 50000, 60000, 70000, 80000, 90000, 100000, 120000, 150000, 200000];
  var nearest = function (arr, v) { return arr.reduce(function (a, b) { return Math.abs(b - v) < Math.abs(a - v) ? b : a; }); };
  var q = new URL(location.href).searchParams;
  if (q.get('s')) $('cg-sale').value = q.get('s');
  if (q.get('c')) $('cg-cost').value = q.get('c');

  function calc() {
    var saleMan = val('cg-sale'), costMan = val('cg-cost'), sale = Math.round(saleMan * 10000), cost = Math.round(costMan * 10000), exp = Math.round(val('cg-exp') * 10000);
    var hold = val('cg-hold'), live = val('cg-live'), house = $('cg-house').value, adj = $('cg-adj').checked, sur = $('cg-sur').checked;
    var oneHouse = house === '1', multi = (sur && !oneHouse) ? parseInt(house, 10) : 0;
    var r = D.capitalGains({ sale: sale, cost: cost, expense: exp, holdYears: hold, liveYears: live, oneHouse: oneHouse, adjusted: adj, multi: multi });
    $('cg-total').textContent = num(r.total);
    var sub;
    if (r.fullyExempt) sub = '1세대 1주택 · 양도가액 12억원 이하 · 전액 비과세';
    else if (r.exempt) sub = '1세대 1주택 고가주택 · 12억 초과분 ' + pct1((sale - D.EXEMPT_PRICE) / sale) + '만 과세 · 장특공제 ' + pct0(r.ltRate) + ' · 실효세율 ' + pct1(r.effective);
    else if (multi) sub = house + '주택 중과 +' + pct0(r.surcharge) + 'p · 장특공제 없음 · 실효세율 ' + pct1(r.effective);
    else sub = (r.kind === 'short1' ? '보유 1년 미만 70%' : r.kind === 'short2' ? '보유 2년 미만 60%' : '일반 과세 · 장특공제 ' + pct0(r.ltRate)) + ' · 실효세율 ' + pct1(r.effective);
    $('cg-sub').textContent = sub;
    $('cg-gain').textContent = num(r.gain);
    $('cg-tax').textContent = num(r.tax);
    $('cg-local').textContent = num(r.local);
    var rateText = r.base <= 0 ? '—' : r.kind === 'short1' ? '70% (보유 1년 미만)' : r.kind === 'short2' ? '60% (보유 2년 미만)' : r.kind === 'surcharge' ? pct0(r.rate) + ' (기본 ' + pct0(r.rate - r.surcharge) + ' + ' + pct0(r.surcharge) + 'p) − ' + num(r.sub) : pct0(r.rate) + ' − 누진공제 ' + num(r.sub);
    var rows = [row('양도가액', num(sale)), row('취득가액', neg(cost)), row('필요경비', neg(exp), '취득세·중개수수료·법무사비·자본적 지출'), row('양도차익', num(r.gain))];
    if (r.exempt) rows.push(row('비과세 양도차익 (12억 이하분)', neg(r.exemptGain), r.fullyExempt ? '양도가액 12억 이하 전액' : '양도차익 × 12억 ÷ 양도가액'));
    rows.push(row('과세 양도차익', num(r.taxableGain)));
    rows.push(row('장기보유특별공제', neg(r.ltd), r.ltRate ? pct0(r.ltRate) + (r.ltTable === 2 ? ' (보유 ' + pct0(r.ltHold) + ' + 거주 ' + pct0(r.ltLive) + ')' : ' (표1 · 연 2%)') : multi ? '중과 대상 배제' : '보유 3년 미만 없음'));
    rows.push(row('양도소득금액', num(r.income)));
    rows.push(row('기본공제', neg(r.basic), '연 1회 250만원'));
    rows.push(row('과세표준', num(r.base)));
    rows.push(row('세율', rateText));
    rows.push(row('양도소득세', num(r.tax)));
    rows.push(row('지방소득세 10%', num(r.local)));
    $('cg-rows').innerHTML = rows.join('') + '<div class="lg-total"><span>총 세액</span><span class="num">' + num(r.total) + '</span></div>';
    var tips = [];
    if (r.gain === 0 && sale > 0) tips.push('양도차손이라 세금이 없습니다. 같은 해에 다른 부동산 양도차익이 있으면 서로 통산합니다.');
    if (oneHouse && !r.exempt) {
      if (hold < 2) tips.push('보유 2년 미만이라 1세대 1주택 비과세를 받지 못하고 ' + (hold < 1 ? '70%' : '60%') + ' 단일세율이 붙습니다. 2년을 채우면 12억원까지 비과세입니다.');
      else if (adj && live < 2) tips.push('2017년 8월 3일 이후 조정대상지역에서 취득한 주택은 2년 이상 거주해야 비과세됩니다. 거주 2년을 채우면 12억원까지 비과세입니다.');
    }
    if (r.exempt && !r.fullyExempt && live < 2) tips.push('거주 2년 미만이면 장기보유특별공제는 일반 표(연 2%, 최대 30%)만 적용됩니다. 2년 이상 거주하면 보유·거주 각 연 4%로 최대 80%까지 늘어납니다.');
    if (r.exempt && !r.fullyExempt && live >= 2 && (hold < 10 || live < 10)) tips.push('보유·거주가 각 10년이 되면 장기보유특별공제 80%로 세금이 크게 줄어듭니다.');
    if (!oneHouse && !sur) tips.push('조정대상지역 다주택 중과(2주택 +20%p, 3주택 이상 +30%p, 장특공제 배제)는 ' + D.SURCHARGE_UNTIL + '까지 유예 중이라 기본세율과 일반 공제로 계산했습니다. 유예가 끝난 뒤의 세금은 "중과 포함 계산"을 켜서 보세요.');
    if (sur && oneHouse) tips.push('1세대 1주택에는 중과가 없습니다. 주택 수를 2주택 이상으로 바꾸면 중과를 계산합니다.');
    if (r.total > 10000000) tips.push('세액이 1,000만원을 넘으면 납부 기한부터 2개월 안에 나눠 낼 수 있습니다(2,000만원 이하는 1,000만원 초과분, 초과면 절반까지).');
    $('cg-tips').innerHTML = tips.map(function (t) { return '<div class="callout">' + t + '</div>'; }).join('');
    var link = $('cg-link'), ns = nearest(SALES, saleMan);
    var costs = []; for (var c = 10000; c < ns; c += 10000) costs.push(c);
    var nc = costs.length ? nearest(costs, costMan) : null;
    if (nc == null) { link.hidden = true; }
    else { link.hidden = false; link.href = '/capgain/' + ns + '/' + nc + '/'; link.textContent = '양도가 ' + manwon(ns * 10000) + ' · 취득가 ' + manwon(nc * 10000) + ' 표로 →'; }
  }
  Array.prototype.forEach.call(document.querySelectorAll('#cg-form input, #cg-form select'), function (el) { el.addEventListener('input', calc); el.addEventListener('change', calc); });
  $('cg-form').addEventListener('submit', function (e) { e.preventDefault(); calc(); });
  calc();
})();
