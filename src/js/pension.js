/* 국민연금 예상 수령액 계산기 — 소득·가입기간·출생연도·수급 시기를 바꾸면 그 자리에서 다시 계산 (window.Donpyo 엔진, 참고용 어림) */
(function () {
  var D = window.Donpyo;
  if (!D || !D.pension) return;
  var num = D.num, won = D.won, manwon = D.manwon;
  var $ = function (id) { return document.getElementById(id); };
  var val = function (id) { var v = parseFloat(($(id).value || '0').replace(/[^0-9.]/g, '')); return isNaN(v) ? 0 : v; };
  var pct1 = function (r) { return (r * 100).toFixed(1) + '%'; };
  var pct0 = function (r) { return Math.round(r * 100) + '%'; };
  var row = function (label, value, small) { return '<div class="lg-row"><div class="lbl"><span>' + label + '</span>' + (small ? '<small>' + small + '</small>' : '') + '</div><span class="num">' + value + '</span></div>'; };
  var INCOMES = [], YEARS = [10, 15, 20, 25, 30, 35, 40];
  for (var i = 100; i <= 600; i += 50) INCOMES.push(i);
  var nearest = function (arr, v) { return arr.reduce(function (a, b) { return Math.abs(b - v) < Math.abs(a - v) ? b : a; }); };
  var q = new URL(location.href).searchParams;
  if (q.get('i')) $('pn-income').value = q.get('i');
  if (q.get('y')) $('pn-years').value = q.get('y');

  function calc() {
    var incomeMan = val('pn-income'), income = Math.round(incomeMan * 10000), years = val('pn-years'), birth = Math.round(val('pn-birth')) || 1985, shift = parseInt($('pn-shift').value, 10) || 0;
    var normal = D.startAge(birth), start = normal + shift;
    var p = D.payback({ avgIncome: income, years: years, birthYear: birth, startAge: start });
    $('pn-monthly').textContent = num(p.monthly);
    $('pn-sub').textContent = p.eligible ? (birth + '년생 · ' + p.startAge + '세 개시' + (shift ? ' (' + (shift < 0 ? -shift + '년 조기 −' + pct0(-shift * 0.06) : shift + '년 연기 +' + pct1(shift * 0.072)) + ')' : '') + ' · ' + years + '년 가입 · 지금 돈 기준 어림') : '가입기간 10년 미만 — 노령연금 대신 반환일시금';
    $('pn-annual').textContent = num(p.annual);
    $('pn-age').textContent = p.startAge + '세';
    $('pn-rep').textContent = pct1(p.replacement);
    var rows = [
      row('A값 (전체 가입자 3년 평균 소득월액)', num(p.A), '2025년 적용'),
      row('B값 (본인 가입기간 평균 소득월액)', num(p.B), p.B !== income ? '입력 ' + num(income) + '원 → 기준소득월액 ' + (income > p.B ? '상한' : '하한') + ' 적용' : '하한 40만 · 상한 637만'),
      row('(A + B) × 비례상수 ' + p.constant, num(Math.round(p.constant * (p.A + p.B))), '2026년부터 소득대체율 43%'),
      row('× 가입기간 계수', p.mult.toFixed(2), '1 + 0.05 × (' + years + ' − 20) · 10년 미만은 0'),
      row('기본연금액 (연)', num(p.base)),
    ];
    if (shift) rows.push(row(shift < 0 ? '조기 수령 감액 (' + -shift + '년 × 6%)' : '연기 수령 증액 (' + shift + '년 × 7.2%)', (shift < 0 ? '−' : '+') + num(Math.abs(p.annual - p.base))));
    rows.push(row('연 수령액', num(p.annual)));
    $('pn-rows').innerHTML = rows.join('') + '<div class="lg-total"><span>월 수령액 (÷ 12 · 10원 미만 절사)</span><span class="num">' + num(p.monthly) + '</span></div>';
    var tips = [];
    if (!p.eligible) tips.push('가입기간이 10년 미만이면 노령연금을 받을 수 없고 낸 보험료에 이자를 더한 반환일시금을 받습니다. 추후납부나 임의계속가입으로 10년을 채우면 연금으로 바뀝니다.');
    else {
      tips.push(years + '년 동안 낸 보험료는 요율 9% 기준 ' + won(p.paidTotal) + '(직장 가입자 본인 부담 ' + won(p.paidSelf) + ')이고, 월 ' + won(p.monthly) + '씩 받으면 본인 부담분은 ' + Math.floor(p.monthsSelf / 12) + '년 ' + (p.monthsSelf % 12) + '개월, 회사 부담까지 합친 전체는 ' + Math.floor(p.monthsTotal / 12) + '년 ' + (p.monthsTotal % 12) + '개월이면 돌려받습니다.');
      if (shift < 0) tips.push('조기 수령은 평생 감액됩니다. 정상 개시 ' + normal + '세에 받으면 월 ' + won(D.pension({ avgIncome: income, years: years, birthYear: birth }).monthly) + '입니다.');
      if (shift > 0) tips.push('연기하는 동안은 받지 못하니 손익분기는 대략 80세 전후입니다. 정상 개시 ' + normal + '세에 받으면 월 ' + won(D.pension({ avgIncome: income, years: years, birthYear: birth }).monthly) + '입니다.');
    }
    if (p.B !== income && income > 0) tips.push('기준소득월액은 하한 40만원, 상한 637만원(2025년 7월~2026년 6월)이라 그 밖의 소득은 보험료도 연금도 상·하한 기준으로 계산합니다.');
    $('pn-tips').innerHTML = tips.map(function (t) { return '<div class="callout">' + t + '</div>'; }).join('');
    $('pn-years-rows').innerHTML = YEARS.map(function (y) {
      var r = D.pension({ avgIncome: income, years: y, birthYear: birth, startAge: start });
      return '<tr' + (y === nearest(YEARS, years) ? ' class="on"' : '') + '><td>' + y + '년</td><td>' + r.mult.toFixed(2) + '</td><td>' + num(r.monthly) + '</td><td>' + num(r.annual) + '</td></tr>';
    }).join('');
    $('pn-shift-rows').innerHTML = D.shiftTable({ avgIncome: income, years: years, birthYear: birth }).map(function (r) {
      return '<tr' + (r.shift === shift ? ' class="on"' : '') + '><td>' + r.age + '세</td><td>' + (r.shift === 0 ? '정상 개시' : r.shift < 0 ? -r.shift + '년 조기 · −' + pct0(-r.shift * 0.06) : r.shift + '년 연기 · +' + pct1(r.shift * 0.072)) + '</td><td>' + num(r.monthly) + '</td><td>' + num(r.monthly * 12 * Math.max(0, 85 - r.age)) + '</td></tr>';
    }).join('');
    var link = $('pn-link'), ni = nearest(INCOMES, incomeMan), ny = nearest(YEARS, years);
    link.href = '/pension/' + ni + '/' + ny + '/';
    link.textContent = '월 ' + manwon(ni * 10000) + ' · ' + ny + '년 표로 →';
  }
  Array.prototype.forEach.call(document.querySelectorAll('#pn-form input, #pn-form select'), function (el) { el.addEventListener('input', calc); el.addEventListener('change', calc); });
  $('pn-form').addEventListener('submit', function (e) { e.preventDefault(); calc(); });
  calc();
})();
