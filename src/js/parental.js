/* 육아휴직 급여 · 출산·양육 지원금 — 입력값을 바꾸면 그 자리에서 다시 계산 (window.Donpyo 엔진) */
(function () {
  var D = window.Donpyo;
  if (!D || !D.parentalLeave) return;
  var num = D.num, won = D.won, manwon = D.manwon;
  var $ = function (id) { return document.getElementById(id); };
  var val = function (id) { var v = parseInt(($(id).value || '0').replace(/[^0-9]/g, ''), 10); return isNaN(v) ? 0 : v; };
  var pct = function (r) { return Math.round(r * 100) + '%'; };
  var row = function (label, value, small) { return '<div class="lg-row"><div class="lbl"><span>' + label + '</span>' + (small ? '<small>' + small + '</small>' : '') + '</div><span class="num">' + value + '</span></div>'; };

  /* 1) 육아휴직 급여 */
  if ($('pl-form')) {
    var q = new URL(location.href).searchParams;
    if (q.get('w')) $('pl-wage').value = q.get('w');
    var calcLeave = function () {
      var wage = val('pl-wage') * 10000;
      var months = Math.max(1, Math.min(18, val('pl-months') || 12));
      var mode = $('pl-mode').value;
      var r = D.parentalLeave({ wage: wage, months: months, mode: mode });
      var bt = D.bothTotal(wage);
      $('pl-total').textContent = num(r.total);
      $('pl-sub').textContent = D.MODES[mode].label + ' ' + months + '개월 · 월평균 ' + won(r.average) + ' · 비과세';
      $('pl-first').textContent = num(r.rows[0].pay);
      $('pl-last').textContent = num(r.rows[r.rows.length - 1].pay);
      $('pl-both').textContent = num(bt.total);
      $('pl-rows').innerHTML = r.rows.map(function (x) {
        return row(x.month + '개월째', num(x.pay), pct(x.rate) + ' · 상한 ' + manwon(x.cap) + (x.capped ? ' (상한 적용)' : x.floored ? ' (하한 70만원)' : ''));
      }).join('') + '<div class="lg-total"><span>' + months + '개월 합계</span><span class="num">' + num(r.total) + '</span></div>';
      var tips = [];
      if (r.rows[0].capped) tips.push('통상임금이 상한을 넘어 첫 달부터 상한액을 받습니다. 통상임금 ' + manwon(r.rows[0].cap) + '까지는 급여가 통상임금과 같고, 그 위로는 얼마를 벌든 같은 금액입니다.');
      if (mode === 'normal' && months > 12) tips.push('13개월째부터는 부모가 모두 3개월 이상 육아휴직을 써야 쓸 수 있는 기간입니다(2025년 2월 23일부터, 각각 18개월).');
      if (mode === 'both' && months > 6) tips.push('6+6 상한은 첫 6개월에만 적용되고 7개월째부터는 일반 규정(80%, 상한 160만원)입니다.');
      if (mode === 'both') tips.push('부모가 모두 쓸 때 두 사람 합계는 통상임금이 같다고 보고 ' + won(bt.total) + '입니다. 배우자 통상임금이 다르면 각각 넣어 더하세요.');
      if (wage > 0 && wage < D.LEAVE_MIN) tips.push('통상임금이 하한 70만원보다 적어도 급여는 월 70만원입니다.');
      $('pl-tips').innerHTML = tips.map(function (t) { return '<div class="callout">' + t + '</div>'; }).join('');
    };
    Array.prototype.forEach.call(document.querySelectorAll('#pl-form input, #pl-form select'), function (el) { el.addEventListener('input', calcLeave); el.addEventListener('change', calcLeave); });
    $('pl-form').addEventListener('submit', function (e) { e.preventDefault(); calcLeave(); });
    calcLeave();
  }

  /* 2) 출산·양육 지원금 */
  if ($('bb-form')) {
    var d = new Date();
    var today = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    if (!$('bb-birth').value) $('bb-birth').value = today;
    var calcBaby = function () {
      var birth = $('bb-birth').value || today;
      var order = parseInt($('bb-order').value, 10) || 1;
      var r = D.babyBenefits(birth, order, today);
      var tl = D.benefitTimeline(birth);
      var m = r.ageMonths;
      $('bb-monthly').textContent = num(r.monthly);
      if (m < 0) $('bb-sub').textContent = '출산 예정 · 태어나면 첫 달부터 부모급여 100만원 + 아동수당 10만원';
      else if (m < 24) $('bb-sub').textContent = '생후 ' + m + '개월 · 부모급여 ' + won(r.parent) + ' + 아동수당 ' + won(r.child) + ' · 이번 달 기준';
      else if (m < 96) $('bb-sub').textContent = '생후 ' + m + '개월 (' + Math.floor(m / 12) + '세) · 아동수당 ' + won(r.child) + (r.home ? ' + 가정양육이면 양육수당 ' + won(r.home) : '') + ' · 부모급여는 끝났습니다';
      else $('bb-sub').textContent = '만 8세가 지나 아동수당이 끝났습니다';
      $('bb-first').textContent = num(r.firstMeeting);
      $('bb-total24').textContent = num(r.total24);
      $('bb-remaining').textContent = num(r.remaining24);
      $('bb-timeline').innerHTML = tl.map(function (p) {
        var on = m >= p.from && m < p.to;
        return '<tr' + (on ? ' class="on"' : '') + '><td>' + p.label + '<br><small>' + p.items.join(' · ') + '</small></td><td>' + p.startText + ' ~ ' + p.endText + '</td><td>' + num(p.monthly) + '</td><td>' + num(p.sum) + '</td></tr>';
      }).join('');
    };
    Array.prototype.forEach.call(document.querySelectorAll('#bb-form input, #bb-form select'), function (el) { el.addEventListener('input', calcBaby); el.addEventListener('change', calcBaby); });
    $('bb-form').addEventListener('submit', function (e) { e.preventDefault(); calcBaby(); });
    calcBaby();
  }
})();
