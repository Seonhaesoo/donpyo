/* 근로장려금·자녀장려금 계산기 — 가구 유형·총급여·재산·부양자녀 수를 바꾸면 그 자리에서 다시 계산 (window.Donpyo 엔진) */
(function () {
  var D = window.Donpyo;
  if (!D || !D.eitc) return;
  var num = D.num, won = D.won, manwon = D.manwon;
  var $ = function (id) { return document.getElementById(id); };
  var val = function (id) { var v = parseInt(($(id).value || '0').replace(/[^0-9]/g, ''), 10); return isNaN(v) ? 0 : v; };
  var row = function (label, value, small) { return '<div class="lg-row"><div class="lbl"><span>' + label + '</span>' + (small ? '<small>' + small + '</small>' : '') + '</div><span class="num">' + value + '</span></div>'; };
  var MAX = { single: 2100, one: 3100, dual: 3700 }, SHORT = { single: '단독', one: '홑벌이', dual: '맞벌이' };
  var phaseLabel = function (p) { return p === 'in' ? '점증' : p === 'flat' ? '최대 지급' : p === 'out' ? '점감' : '대상 아님'; };
  var q = new URL(location.href).searchParams;
  if (q.get('t') && D.TYPES[q.get('t')]) $('ei-type').value = q.get('t');
  if (q.get('w')) $('ei-wage').value = q.get('w');

  function calc() {
    var type = $('ei-type').value, wageMan = val('ei-wage'), wage = wageMan * 10000, prop = val('ei-prop') * 10000, kids = val('ei-kids');
    var T = D.TYPES[type];
    var r = D.eitc({ type: type, wage: wage, property: prop, children: kids });
    $('ei-total').textContent = num(r.total);
    $('ei-sub').textContent = T.label + ' · 총급여액 등 ' + manwon(wage) + ' · ' + (r.factor === 0 ? '재산 2.4억원 이상 — 지급 제외' : r.factor === 0.5 ? '재산 1.7억원 이상 — 50% 감액' : phaseLabel(r.phase) + ' 구간') + ' · 연 1회';
    $('ei-work').textContent = num(r.work);
    $('ei-child').textContent = num(r.child);
    var cut = (r.workRaw - r.work) + (r.childRaw * r.children - r.child);
    $('ei-prop-label').textContent = r.factor === 1 ? '재산 감액' : r.factor === 0.5 ? '재산 감액 (−50%)' : '재산 요건';
    $('ei-prop-out').textContent = r.factor === 1 ? '없음' : r.factor === 0.5 ? '−' + num(cut) : '제외';
    var rows = [row('총급여액 등', num(wage), T.label)];
    if (r.phase === 'in') rows.push(row('점증 구간 (' + manwon(T.phaseIn) + ' 미만)', num(r.workRaw), '총급여 × ' + Math.round(T.max / 10000) + '/' + Math.round(T.phaseIn / 10000)));
    else if (r.phase === 'flat') rows.push(row('평탄 구간 (최대 지급)', num(r.workRaw), manwon(T.phaseIn) + ' 이상 ' + manwon(T.flatTo) + ' 미만'));
    else if (r.phase === 'out') rows.push(row('점감 구간', num(r.workRaw), manwon(T.max) + ' − (총급여 − ' + manwon(T.flatTo) + ') × ' + Math.round(T.max / 10000) + '/' + num((T.limit - T.flatTo) / 10000)));
    else rows.push(row('총급여 ' + manwon(T.limit) + ' 이상', '0', '근로장려금 대상 아님'));
    if (r.factor < 1) rows.push(row('재산 ' + (r.factor === 0 ? '2.4억원 이상 — 제외' : '1.7억원 이상 — 50% 감액'), r.factor === 0 ? '−' + num(r.workRaw) : '−' + num(r.workRaw - r.work)));
    rows.push(row('근로장려금 (10원 미만 절사)', num(r.work)));
    if (type !== 'single') {
      rows.push(row('자녀장려금 (부양자녀 1명당)', num(r.perChild), r.childPhase === 'flat' ? '총급여 ' + manwon(D.CTC.flatTo) + ' 미만 최대 ' + manwon(D.CTC.max) : r.childPhase === 'out' ? manwon(D.CTC.max) + ' − (총급여 − ' + manwon(D.CTC.flatTo) + ') × 50/4,900 · 최소 ' + manwon(D.CTC.min) : '총급여 ' + manwon(D.CTC.limit) + ' 이상 — 대상 아님'));
      rows.push(row('× 부양자녀 ' + r.children + '명', num(r.child)));
    }
    $('ei-rows').innerHTML = rows.join('') + '<div class="lg-total"><span>합계</span><span class="num">' + num(r.total) + '</span></div>';
    var tips = [];
    if (type === 'single' && kids > 0) tips.push('단독 가구는 부양자녀가 없는 가구입니다. 18세 미만 자녀가 있으면 홑벌이(배우자 총급여 300만원 미만)나 맞벌이 가구를 골라야 자녀장려금이 계산됩니다.');
    if (r.phase === 'over') tips.push('총급여액 등이 ' + manwon(T.limit) + ' 이상이라 근로장려금 대상이 아닙니다.' + (type !== 'single' ? ' 자녀장려금은 총급여 7,000만원 미만까지 부양자녀 1명당 최소 50만원을 받습니다.' : ''));
    if (r.factor === 0) tips.push('가구원 재산 합계가 2.4억원 이상이면 근로장려금과 자녀장려금 모두 받지 못합니다. 전세보증금·자동차·예금도 재산에 들어가고 대출은 빼지 않습니다.');
    else if (r.factor === 0.5) tips.push('재산이 1.7억원 이상 2.4억원 미만이라 산정액의 절반만 받습니다.');
    if (r.phase === 'in') tips.push('점증 구간입니다. 총급여가 ' + manwon(T.phaseIn) + '이 될 때까지는 소득이 늘수록 장려금도 늘어납니다.');
    if (r.phase === 'flat') tips.push('최대 지급 구간입니다. 총급여 ' + manwon(T.flatTo) + '을 넘으면 줄기 시작해 ' + manwon(T.limit) + '에서 0이 됩니다.');
    $('ei-tips').innerHTML = tips.map(function (t) { return '<div class="callout">' + t + '</div>'; }).join('');
    var link = $('ei-link');
    if (r.phase === 'over' || !wageMan) { link.hidden = true; }
    else { var nw = Math.max(500, Math.min(MAX[type], Math.round(wageMan / 100) * 100)); link.hidden = false; link.href = '/eitc/' + type + '/' + nw + '/'; link.textContent = '총급여 ' + manwon(nw * 10000) + ' ' + SHORT[type] + ' 표로 →'; }
  }
  Array.prototype.forEach.call(document.querySelectorAll('#ei-form input, #ei-form select'), function (el) { el.addEventListener('input', calc); el.addEventListener('change', calc); });
  $('ei-form').addEventListener('submit', function (e) { e.preventDefault(); calc(); });
  calc();
})();
