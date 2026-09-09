/* 건강보험료 계산기 — 직장가입자(보수월액)와 지역가입자(연소득·재산과세표준)를 전환하며 그 자리에서 다시 계산 (window.Donpyo 엔진) */
(function () {
  var D = window.Donpyo;
  if (!D || !D.nhisEmployee) return;
  var num = D.num, won = D.won, manwon = D.manwon, pct = D.pct;
  var $ = function (id) { return document.getElementById(id); };
  var val = function (id) { var v = parseFloat(($(id).value || '0').replace(/[^0-9.]/g, '')); return isNaN(v) ? 0 : v; };
  var row = function (label, value, small) { return '<div class="lg-row"><div class="lbl"><span>' + label + '</span>' + (small ? '<small>' + small + '</small>' : '') + '</div><span class="num">' + value + '</span></div>'; };
  var G = window.DONPYO_GRID || {};
  /* 홈이 아닌 페이지에는 DONPYO_GRID 가 없으므로 격자를 여기에도 둔다 (tools/build.mjs 의 NHIS_E·NHIS_L 과 같은 값) */
  var WAGES = G.nhisE || (function () { var o = []; for (var i = 200; i <= 1000; i += 50) o.push(i); return o; })();
  var INCOMES = G.nhisL || [500, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 6000, 7000, 8500, 10000];
  var nearest = function (arr, v) { if (!arr || !arr.length) return v; return arr.reduce(function (a, b) { return Math.abs(b - v) < Math.abs(a - v) ? b : a; }); };
  var q = new URL(location.href).searchParams;
  if (q.get('t') === 'local') $('nh-type').value = 'local';

  function calc() {
    var type = $('nh-type').value, local = type === 'local';
    $('nh-wage-f').hidden = local;
    $('nh-income-f').hidden = !local;
    $('nh-prop-f').hidden = !local;

    var rows = [], tips = [], link = $('nh-link');
    if (local) {
      var income = Math.round(val('nh-income') * 10000), prop = Math.round(val('nh-prop') * 10000);
      var r = D.nhisLocal({ income: income, property: prop });
      $('nh-hero-label').textContent = '지역가입자 월 보험료 (전액 본인)';
      $('nh-total').textContent = num(r.total);
      $('nh-health').textContent = num(r.health);
      $('nh-care').textContent = num(r.care);
      $('nh-extra-label').textContent = '연 부담액';
      $('nh-extra').textContent = num(r.annual);
      $('nh-sub').textContent = '연소득 ' + manwon(income) + ' · 재산과세표준 ' + manwon(prop) + ' (부과점수 ' + r.points + '점) · 연 ' + won(r.annual);
      rows.push(row('연소득', num(income), '사업·근로·이자·배당·연금·기타소득 합계'));
      rows.push(row(r.minimum ? '최저보험료 (연소득 ' + manwon(D.LOCAL_MIN_INCOME) + ' 이하)' : '소득 보험료 (연소득 × ' + pct(D.HEALTH_RATE, 2) + ' ÷ 12)', num(r.incomePart), r.minimum ? '소득이 적어도 이 금액은 냅니다' : '직장가입자와 같은 요율'));
      rows.push(row('재산과세표준 − 기본공제 ' + manwon(D.PROPERTY_DEDUCTION), num(r.propertyNet), '재산세 과세표준 기준 · 전세보증금은 30%'));
      rows.push(row('재산 부과점수 × ' + D.POINT_VALUE + '원', num(r.propertyPart), r.points + '점 — 60등급표를 6단계로 줄인 근사'));
      rows.push(row('건강보험료', num(r.health), '10원 미만 절사'));
      rows.push(row('장기요양보험료 (× ' + pct(D.CARE_RATE, 2) + ')', num(r.care), ''));
      $('nh-rows').innerHTML = rows.join('') + '<div class="lg-total"><span>월 합계</span><span class="num">' + num(r.total) + '</span></div>';
      if (r.minimum) tips.push('연소득이 ' + manwon(D.LOCAL_MIN_INCOME) + ' 이하라 최저보험료 ' + won(D.LOCAL_MIN) + '이 적용됐습니다. 소득이 없어도 지역가입자는 이 금액을 냅니다.');
      if (r.points > 0) tips.push('재산 점수 ' + r.points + '점은 국민건강보험공단의 60등급표를 6단계로 줄인 <b>근사치</b>입니다. 구간 경계에서 실제와 차이가 나니 <a href="' + D.NHIS_URL + '" target="_blank" rel="noopener">공단 모의계산</a>이 정확합니다(고객센터 1577-1000).');
      else tips.push('재산과세표준이 기본공제 ' + manwon(D.PROPERTY_DEDUCTION) + ' 이하라 재산 보험료가 0원입니다. 재산 점수는 공단 60등급표를 6단계로 줄인 근사치라 <a href="' + D.NHIS_URL + '" target="_blank" rel="noopener">공단 모의계산</a>이 정확합니다.');
      var emp = D.nhisEmployee(Math.round(income / 12));
      tips.push('같은 소득을 직장가입자로 받으면 회사가 절반을 내 근로자 몫은 월 ' + won(emp.employee) + '입니다. 퇴직 전 1년 이상 직장가입자였다면 퇴직 후 두 달 안에 임의계속가입을 신청해 36개월까지 그 수준으로 낼 수 있습니다.');
      var nl = nearest(INCOMES, Math.round(income / 10000));
      link.href = '/nhis/local/' + nl + '/';
      link.textContent = '연소득 ' + manwon(nl * 10000) + ' 지역가입자 표로 →';
    } else {
      var wage = Math.round(val('nh-wage') * 10000);
      var e = D.nhisEmployee(wage);
      $('nh-hero-label').textContent = '근로자 부담 (월)';
      $('nh-total').textContent = num(e.employee);
      $('nh-health').textContent = num(e.healthEmployee);
      $('nh-care').textContent = num(e.careEmployee);
      $('nh-extra-label').textContent = '회사 부담';
      $('nh-extra').textContent = num(e.employer);
      $('nh-sub').textContent = '보수월액 ' + manwon(e.base) + ' · 건강보험 ' + won(e.healthEmployee) + ' + 장기요양 ' + won(e.careEmployee) + ' · 연 ' + won(e.annualEmployee);
      rows.push(row('보수월액', num(e.base), e.capped ? '상한 ' + won(D.WAGE_MAX) + ' 적용' : e.floored ? '하한 ' + won(D.WAGE_MIN) + ' 적용' : '월 과세 급여 (비과세 식대 제외)'));
      rows.push(row('건강보험료 (× ' + pct(D.HEALTH_RATE, 2) + ')', num(e.health), '근로자 ' + num(e.healthEmployee) + ' + 사업주 ' + num(e.healthEmployer)));
      rows.push(row('장기요양보험료 (건강보험료 × ' + pct(D.CARE_RATE, 2) + ')', num(e.care), '근로자 ' + num(e.careEmployee) + ' + 사업주 ' + num(e.careEmployer)));
      rows.push(row('회사 부담까지 합계', num(e.total), '10원 미만 절사'));
      $('nh-rows').innerHTML = rows.join('') + '<div class="lg-total"><span>급여에서 빠지는 금액</span><span class="num">' + num(e.employee) + '</span></div>';
      if (e.capped) tips.push('보수월액이 상한 ' + won(D.WAGE_MAX) + '을 넘어 상한 기준으로 계산했습니다. 월급이 더 올라도 건강보험료는 이 금액에서 멈춥니다.');
      if (e.floored) tips.push('보수월액이 하한 ' + won(D.WAGE_MIN) + '보다 적어 하한 기준으로 계산했습니다.');
      tips.push('보수월액은 월급 전체가 아니라 비과세(식대 등)를 뺀 과세 급여입니다. 식대 20만원이 비과세라면 보수월액은 월급보다 20만원 적습니다. 매년 4월에는 전년도 실제 보수로 정산해 추가 납부나 환급이 생깁니다.');
      var lc = D.nhisLocal({ income: wage * 12 });
      tips.push('같은 소득을 지역가입자로 내면 회사 부담이 없어 재산이 없어도 월 ' + won(lc.total) + '입니다. 재산 점수는 공단 60등급표를 6단계로 줄인 근사치라 <a href="' + D.NHIS_URL + '" target="_blank" rel="noopener">공단 모의계산</a>이 정확합니다.');
      var ne = nearest(WAGES, Math.round(wage / 10000));
      link.href = '/nhis/employee/' + ne + '/';
      link.textContent = '보수월액 ' + manwon(ne * 10000) + ' 표로 →';
    }
    $('nh-tips').innerHTML = tips.map(function (t) { return '<div class="callout">' + t + '</div>'; }).join('');
  }
  Array.prototype.forEach.call(document.querySelectorAll('#nh-form input, #nh-form select'), function (el) { el.addEventListener('input', calc); el.addEventListener('change', calc); });
  $('nh-form').addEventListener('submit', function (e) { e.preventDefault(); calc(); });
  calc();
})();
