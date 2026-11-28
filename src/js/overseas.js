/* 해외주식 양도세 계산기 — 올해 이익·지금 확정할 손실·이익(만원) → 세금, 손실 정리 효과, 남은 250만원 공제 (window.Donpyo = engine/overseas.mjs) */
(function () {
  var D = window.Donpyo;
  if (!D || !D.overseasPlan || !document.getElementById('os-form')) return;
  var $ = function (id) { return document.getElementById(id); };
  var won = D.won;
  /* 만원 단위 · 앞에 '-'를 붙이면 손실(올해 손실이 더 큰 경우) */
  var man = function (id) { var t = String($(id).value || '').replace(/[^0-9.\-]/g, ''); var v = parseFloat(t); return isNaN(v) ? 0 : Math.max(-1e12, Math.min(1e12, Math.round(v * 10000))); };
  function calc() {
    var g = man('os-gain'), L = Math.abs(man('os-loss')), H = Math.abs(man('os-harvest'));
    var p = D.overseasPlan(g, L, H), t = p.now;
    $('os-result').textContent = D.num(t.total);
    $('os-sub').textContent = t.total ? '과세표준 ' + won(t.base) + ' × 22% (양도소득세 ' + won(t.tax) + ' + 지방소득세 ' + won(t.local) + ')' : (g <= 0 ? '올해는 손실이 더 커서 낼 세금이 없습니다' : '250만원 공제 안이라 세금이 없습니다');
    var tips = [];
    if (L && t.total) tips.push('손실 <b>' + won(L) + '</b>을 올해 안에 확정하면 세금이 <b>' + won(p.afterLoss.total) + '</b>으로 ' + won(p.saveByLoss) + ' 줄어듭니다.');
    if (t.total && p.needLoss) tips.push('세금을 0원으로 만들려면 손실 <b>' + won(p.needLoss) + '</b>을 더 확정해야 합니다(이익이 250만원 이하가 되도록).');
    if (t.room > 0) tips.push('250만원 공제가 <b>' + won(t.room) + '</b> 남았습니다. 이만큼은 이익을 확정해도 세금이 없고, 다시 사면 취득가가 올라가 나중 세금 약 ' + won(Math.floor(t.room * 0.22)) + '을 아낄 수 있습니다. 공제는 해를 넘기면 사라집니다.' + (H ? ' 입력한 이익 ' + won(H) + '을 확정하면 ' + (p.harvestTax ? '공제를 넘는 부분에 세금 ' + won(p.harvestTax) + '이 생깁니다.' : '세금은 그대로 0원입니다.') : ''));
    if (g < 0) tips.push('올해 손실은 다음 해로 넘어가지 않습니다. 이익 종목이 있다면 올해 안에 확정해 손실과 상계하는 방법도 있습니다.');
    tips.push('올해분은 <b>12월 31일까지 결제</b>된 매도만입니다. 마지막 매도일은 거래하는 증권사의 연말 공지를 확인하세요.');
    $('os-tips').innerHTML = tips.map(function (x) { return '<div class="callout">' + x + '</div>'; }).join('');
  }
  Array.prototype.forEach.call(document.querySelectorAll('#os-form input'), function (el) { el.addEventListener('input', calc); el.addEventListener('change', calc); });
  $('os-form').addEventListener('submit', function (e) { e.preventDefault(); calc(); });
  calc();
})();
