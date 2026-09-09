/* 연차휴가·연차수당 계산기 — 입사일·월 통상임금·미사용 일수를 바꾸면 그 자리에서 입사일 기준과 회계연도 기준 연차를 다시 계산 (window.Donpyo 엔진) */
(function () {
  var D = window.Donpyo;
  if (!D || !D.annualPay) return;
  var num = D.num, won = D.won, manwon = D.manwon;
  var $ = function (id) { return document.getElementById(id); };
  var val = function (id) { var v = parseFloat(($(id).value || '0').replace(/[^0-9.]/g, '')); return isNaN(v) ? 0 : v; };
  var row = function (label, value, small) { return '<div class="lg-row"><div class="lbl"><span>' + label + '</span>' + (small ? '<small>' + small + '</small>' : '') + '</div><span class="num">' + value + '</span></div>'; };
  var G = window.DONPYO_GRID || {};
  /* 홈이 아닌 페이지에는 DONPYO_GRID 가 없으므로 격자를 여기에도 둔다 (tools/build.mjs 의 ANNUAL_YEARS·ANNUAL_PAYS 와 같은 값) */
  var YEARS = G.annualY || (function () { var o = []; for (var i = 1; i <= 25; i++) o.push(i); return o; })();
  var PAYS = G.annualP || (function () { var o = []; for (var i = 200; i <= 600; i += 25) o.push(i); return o; })();
  var nearest = function (arr, v) { if (!arr || !arr.length) return v; return arr.reduce(function (a, b) { return Math.abs(b - v) < Math.abs(a - v) ? b : a; }); };
  var today = function () { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
  var q = new URL(location.href).searchParams;
  if (q.get('w')) $('an-wage').value = q.get('w');
  if (q.get('d')) $('an-unused').value = q.get('d');

  function calc() {
    var hire = $('an-hire').value, wage = val('an-wage') * 10000, unused = val('an-unused');
    var now = today();
    var h = D.annualByHire(hire, now);
    var pay = D.annualPay(wage, unused);
    var fiscalYear = new Date().getFullYear();
    var f = D.annualByFiscal(hire, fiscalYear);
    var ok = !!h.hire;

    $('an-total').textContent = num(pay.total);
    $('an-days').textContent = ok ? h.days + '일' : '—';
    /* 입사한 해에는 두 기준이 같다(개근한 달마다 1일). 다음 해 1월 1일에 비례연차가 생긴다. */
    $('an-fiscal').textContent = !ok || f.kind === 'none' ? '—' : f.kind === 'prorated' ? f.days.toFixed(1) + '일' : f.kind === 'monthly' ? h.days + '일' : f.days + '일';
    $('an-daily').textContent = num(pay.daily);
    $('an-sub').textContent = ok
      ? '입사일 기준 근속 ' + (h.years >= 1 ? h.years + '년 ' + (h.months % 12) + '개월' : h.months + '개월') + ' · 올해 연차 ' + h.days + '일 · 1일 통상임금 ' + won(pay.daily) + ' × 미사용 ' + unused + '일'
      : '입사일을 넣으면 올해 연차 일수까지 계산합니다 · 1일 통상임금 ' + won(pay.daily) + ' × 미사용 ' + unused + '일';

    var rows = [
      row('월 통상임금', num(wage), '기본급 + 고정수당'),
      row('÷ 월 소정근로 209시간', num(pay.hourly), '통상시급'),
      row('× 1일 소정근로 8시간', num(pay.daily), '1일 통상임금'),
    ];
    if (ok) {
      rows.push(row('근속 (입사일 기준)', h.years >= 1 ? h.years + '년 ' + (h.months % 12) + '개월' : h.months + '개월', h.hire + ' 입사 · ' + now + ' 기준'));
      rows.push(row(h.under ? '연차 (1개월 개근 1일, 최대 11일)' : '연차 (15일 + 3년째부터 2년마다 1일)', h.days + '일', h.under ? '근로기준법 제60조 제2항' : '근로기준법 제60조 제1항·제4항'));
      if (f.kind === 'prorated') rows.push(row('회계연도 기준 ' + f.year + '년 1월 1일 비례연차', f.days.toFixed(1) + '일', f.note + ' · 회사 규정에 따라 반올림/절상'));
      else if (f.kind === 'full') rows.push(row('회계연도 기준 ' + f.year + '년 1월 1일', f.days + '일', f.note));
      else if (f.kind === 'monthly') rows.push(row('회계연도 기준 ' + f.year + '년', h.days + '일', '입사한 해에는 두 기준이 같습니다 (개근한 달마다 1일, 최대 11일) · 다음 해 1월 1일에 비례연차'));
    }
    rows.push(row('미사용 연차', unused + '일', unused > (ok ? h.days : 25) ? '올해 발생 일수보다 많습니다 — 이월분까지 넣었다면 그대로 두세요' : ''));
    $('an-rows').innerHTML = rows.join('') + '<div class="lg-total"><span>연차수당</span><span class="num">' + num(pay.total) + '</span></div>';

    var tips = [];
    if (ok && h.under) tips.push('입사 1년 미만이라 한 달을 개근할 때마다 1일씩, 최대 11일이 생깁니다. 1년을 채우고 하루를 더 근무하면 15일이 따로 생겨 2년 차까지 최대 26일을 쓸 수 있습니다.');
    if (ok && !h.under && h.days < D.ANNUAL_MAX) tips.push('근속 ' + h.years + '년이라 연차가 ' + h.days + '일입니다. 3년째부터 2년마다 1일씩 늘어 한도 25일에서 멈춥니다.');
    if (ok && h.days === D.ANNUAL_MAX) tips.push('가산 한도인 25일에 닿았습니다. 근속이 더 길어져도 연차는 25일로 같습니다.');
    if (ok && f.kind === 'prorated') tips.push('회계연도(1월 1일) 기준을 쓰는 회사라면 ' + f.year + '년 1월 1일에 ' + f.days.toFixed(1) + '일의 비례연차를 받습니다. 소수점은 법에 정한 것이 없어 회사 규정에 따라 반올림하거나 절상(' + f.ceil + '일)합니다. 퇴직할 때 입사일 기준보다 적으면 차액을 채워 줘야 합니다.');
    if (unused > 0) tips.push('연차수당은 연차가 소멸한 다음 달 임금 지급일에 받는 것이 보통이고 근로소득이라 세금을 뗍니다. 회사가 근로기준법 제61조의 사용 촉진 절차(서면 통보 → 사용 시기 지정 → 재통보)를 모두 지켰다면 수당을 주지 않아도 됩니다. 청구권 소멸시효는 3년입니다.');
    if (!ok) tips.push('입사일을 넣으면 오늘 기준 근속연수로 올해 연차 일수를 계산합니다.');
    $('an-tips').innerHTML = tips.map(function (t) { return '<div class="callout">' + t + '</div>'; }).join('');

    var link = $('an-link');
    if (ok && !h.under) { var ny = nearest(YEARS, h.years); link.href = '/annual/' + ny + '/'; link.textContent = '근속 ' + ny + '년 연차 ' + D.annualDays(ny) + '일 표로 →'; }
    else { var np = nearest(PAYS, Math.round(wage / 10000)); link.href = '/annual/pay/' + np + '/'; link.textContent = '월 통상임금 ' + manwon(np * 10000) + ' 연차수당 표로 →'; }
  }
  Array.prototype.forEach.call(document.querySelectorAll('#an-form input'), function (el) { el.addEventListener('input', calc); el.addEventListener('change', calc); });
  $('an-form').addEventListener('submit', function (e) { e.preventDefault(); calc(); });
  calc();
})();
