/* 증여세 계산기 — 관계·이번 증여액·10년 안 이전 증여·혼인·출산 공제를 바꾸면 그 자리에서 다시 계산 (window.Donpyo.giftTax = engine/gift.mjs) */
(function () {
  var D = window.Donpyo;
  if (!D || !D.giftTax || !document.getElementById('gc-form')) return;
  var num = D.num, won = D.won, manwon = D.manwon;
  var $ = function (id) { return document.getElementById(id); };
  /* 만원 단위 — 1.5 는 1만 5천원. 쉼표는 지우고 소수점은 살린다(예전엔 1.5를 15만원으로 읽었다) */
  var man = function (id) { var v = parseFloat(String($(id).value || '0').replace(/[^0-9.]/g, '')); return isNaN(v) ? 0 : Math.min(Math.round(v * 10000), 1e13); };
  var REL = D.GIFT_RELATIONS;
  var q = new URL(location.href).searchParams;
  if (q.get('a')) $('gc-amount').value = num(parseInt(q.get('a').replace(/[^0-9]/g, ''), 10) || 0);
  if (q.get('r') && REL[q.get('r')]) $('gc-rel').value = q.get('r');

  function calc() {
    var rel = $('gc-rel').value, R = REL[rel];
    var amount = man('gc-amount'), prior = man('gc-prior'), used = $('gc-used') ? man('gc-used') : 0;
    var mBox = $('gc-marriage');
    mBox.disabled = !R.lineal;
    if (!R.lineal) mBox.checked = false;
    var marriage = mBox.checked;
    var g = D.giftTax(amount, rel, { prior: prior, marriage: marriage, usedOther: used });
    var limit = g.limit;
    $('gc-label').textContent = '납부할 증여세 — ' + R.short + '에게 줄 때 (받는 사람이 냄)';
    $('gc-result').textContent = num(g.tax);
    $('gc-sub').textContent = g.tax ? '이번 증여액의 ' + (g.tax / Math.max(1, amount) * 100).toFixed(1) + '% · 받는 사람 손에 ' + won(amount - g.tax) : (amount ? (g.base >= 500000 ? '이전 증여 때 낸 세금으로 채워져 더 낼 세금 없음' : g.base > 0 ? '과세표준 50만원 미만이라 세금 없음' : '공제 안이라 세금 없음') + ' · 받는 사람 손에 ' + won(amount) : '금액을 넣어 보세요');

    var rows = [['이번 증여액', num(amount)]];
    if (prior) rows.push(['같은 사람에게 받은 이전 증여', '+' + num(prior), '10년 안 · 합쳐서 세율을 매김']);
    rows.push(['증여재산공제', Math.min(amount + prior, limit) ? '−' + num(Math.min(amount + prior, limit)) : '0', R.label + ' ' + manwon(R.deduction) + (used ? ' − 이미 쓴 ' + manwon(Math.min(used, R.deduction)) : '') + (g.marriage ? ' + 혼인·출산 1억' : '') + ' · 10년 합산 한도']);
    rows.push(['과세표준', num(g.base), g.base > 0 && g.base < 500000 ? '50만원 미만은 과세하지 않음' : '']);
    rows.push(['산출세액', num(g.calc), g.rate ? (g.rate * 100) + '% 구간' + (g.progressiveDeduct ? ' − 누진공제 ' + manwon(g.progressiveDeduct) : '') + (prior ? ' · 이전 증여분 세액을 뺀 값' : '') : '과세표준 없음']);
    if (g.surcharge) rows.push(['세대생략 할증 30%', '+' + num(g.surcharge), '조부모 → 손자녀']);
    rows.push(['신고세액공제 3%', g.credit ? '−' + num(g.credit) : '0', '3개월 안에 신고하면'], ['납부할 증여세', num(g.tax)]);
    $('gc-rows').innerHTML = rows.map(function (x) { return '<div class="lg-row"><div class="lbl"><span>' + x[0] + '</span>' + (x[2] ? '<small>' + x[2] + '</small>' : '') + '</div><span class="num">' + x[1] + '</span></div>'; }).join('');

    var tips = [];
    var left = limit - amount - prior;
    if (left > 0) tips.push('공제가 <b>' + won(left) + '</b> 남았습니다. 같은 쪽에게서 10년 안에 이만큼은 더 받아도 세금이 없습니다.');
    else if (left === 0 && amount) tips.push('공제 한도를 꼭 맞게 다 썼습니다. 같은 쪽에게서 10년 안에 더 받으면 그만큼 과세됩니다.');
    else if (g.tax === 0 && amount) tips.push('공제를 다 써서 남은 공제는 없지만, 과세표준이 50만원 미만이라 이번 세금은 없습니다.');
    if (R.lineal && !marriage && amount + prior > R.deduction) {
      var mg = D.giftTax(amount, rel, { prior: prior, marriage: true });
      if (mg.tax < g.tax) tips.push('혼인신고 전후 2년 또는 자녀 출생 후 2년 안이면 혼인·출산 공제 1억원이 더 붙어 증여세가 <b>' + won(mg.tax) + '</b>으로 줄어듭니다(' + won(g.tax - mg.tax) + ' 적게).');
    }
    if (rel === 'grandchild') tips.push('미성년 손자녀는 공제가 5,000만원이 아니라 2,000만원입니다 — 미성년이면 위 관계를 “미성년 자녀”로 바꿔 공제를 보고 할증 30%를 따로 더해 보세요. 손자녀가 미성년자이고 증여재산이 20억원을 넘으면 할증이 40%입니다. 부모가 먼저 사망해 손자녀가 대신 받는 경우는 할증이 없습니다. 이 계산기는 30%로만 계산합니다.');
    if (g.tax > 20000000) tips.push('증여세가 2,000만원을 넘어 연부연납(최대 5년)을 신청할 수 있습니다. 담보를 제공해야 하고 가산금이 붙습니다.');
    else if (g.tax > 10000000) tips.push('증여세가 1,000만원을 넘어 일부를 신고 기한 뒤 2개월 안에 나눠 낼 수 있습니다(분납).');
    if (g.tax > 0) tips.push('신고·납부 기한은 증여일이 속한 달의 말일부터 3개월입니다. 기한을 넘기면 신고세액공제 3% 대신 무신고 가산세(20%)와 납부지연 가산세가 붙습니다.');
    if (rel === 'other') tips.push('가족이 아닌 사람에게서 받으면 공제가 없습니다. 사회 통념상 인정되는 축의금·부의금·선물은 증여세를 매기지 않습니다.');
    $('gc-tips').innerHTML = tips.map(function (t) { return '<div class="callout">' + t + '</div>'; }).join('');
  }
  Array.prototype.forEach.call(document.querySelectorAll('#gc-form input, #gc-form select'), function (el) { el.addEventListener('input', calc); el.addEventListener('change', calc); });
  $('gc-form').addEventListener('submit', function (e) { e.preventDefault(); calc(); });
  calc();
})();
