/* 연말정산 미리보기 — 입력값을 바꾸면 그 자리에서 결정세액과 환급 예상액을 다시 계산 (window.Donpyo 엔진) */
(function () {
  var D = window.Donpyo;
  if (!D || !D.yearEnd) return;
  var num = D.num, won = D.won, manwon = D.manwon;
  var $ = function (id) { return document.getElementById(id); };
  var val = function (id) { var v = parseInt(($(id).value || '0').replace(/[^0-9]/g, ''), 10); return isNaN(v) ? 0 : v; };
  var q = new URL(location.href).searchParams;
  if (q.get('a')) $('ye-annual').value = q.get('a');
  if (q.get('d')) $('ye-dep').value = q.get('d');

  function calc() {
    var annual = val('ye-annual') * 10000;
    var mealFree = $('ye-meal').checked ? 2400000 : 0;
    var gross = Math.max(0, annual - mealFree);
    var dep = Math.max(1, val('ye-dep')), kids = val('ye-kids');
    var monthlyTaxable = Math.round(gross / 12);
    var ins = D.insurance(monthlyTaxable);
    var withheld = D.incomeTax(monthlyTaxable, dep, kids);
    var r = D.yearEnd({
      gross: gross, dependents: dep, children: kids,
      pension: ins.pension * 12, health: (ins.health + ins.care) * 12, employment: ins.employment * 12,
      creditCard: val('ye-credit') * 10000, checkCard: val('ye-check') * 10000,
      medical: val('ye-med') * 10000, insurance: val('ye-ins') * 10000, education: val('ye-edu') * 10000,
      rent: val('ye-rent') * 10000, renter: $('ye-renter').checked, pensionAccount: val('ye-pa') * 10000,
      prepaid: withheld.tax * 12,
    });
    var sign = r.refund >= 0 ? '환급 예상' : '추가 납부 예상';
    $('ye-result-label').textContent = sign;
    $('ye-result').textContent = num(Math.abs(r.refund));
    $('ye-result-sub').textContent = '미리 낸 세금 ' + won(r.prepaidTotal) + ' − 결정세액 ' + won(r.total) + ' (지방소득세 포함)';
    var rows = [
      ['총급여', num(r.gross)], ['근로소득공제 후 근로소득금액', num(r.income)],
      ['기본공제 ' + dep + '인', '−' + num(r.basic)], ['국민연금 보험료', '−' + num(ins.pension * 12)],
      ['건강·고용보험료' + (r.usedStandard ? ' (표준세액공제 선택으로 미적용)' : ''), '−' + num(r.special)],
      ['신용카드 등', '−' + num(r.card)], ['과세표준', num(r.base)], ['산출세액', num(r.calc)],
      ['근로소득세액공제', '−' + num(r.earned)], ['자녀세액공제', '−' + num(r.child)], ['연금계좌', '−' + num(r.pa)],
    ];
    if (r.usedStandard) rows.push(['표준세액공제', '−' + num(r.standard)]);
    else rows.push(['보험료', '−' + num(r.ins)], ['의료비', '−' + num(r.med)], ['교육비', '−' + num(r.edu)], ['월세', '−' + num(r.rent)]);
    rows.push(['결정세액 (소득세)', num(r.determined)], ['지방소득세', num(r.local)], ['미리 낸 세금 (간이세액 12개월 + 지방세)', num(r.prepaidTotal)]);
    $('ye-rows').innerHTML = rows.map(function (x) { return '<div class="lg-row"><div class="lbl"><span>' + x[0] + '</span></div><span class="num">' + x[1] + '</span></div>'; }).join('');
    var tips = [];
    var th = Math.round(gross * 0.25);
    var used = val('ye-credit') * 10000 + val('ye-check') * 10000;
    if (used < th) tips.push('신용카드 등 사용액이 총급여의 25%(' + won(th) + ')에 못 미쳐 카드 공제가 0원입니다. 이 문턱을 넘긴 뒤부터는 체크카드·현금영수증(30%)이 신용카드(15%)보다 두 배 유리합니다.');
    if (val('ye-pa') * 10000 < 9000000) tips.push('연금저축·IRP를 연 900만원까지 넣으면 ' + (gross <= 55000000 ? '15%' : '12%') + '를 돌려받습니다. 지금보다 ' + manwon(9000000 - val('ye-pa') * 10000) + ' 더 넣으면 약 ' + won(Math.round((9000000 - val('ye-pa') * 10000) * (gross <= 55000000 ? 0.15 : 0.12))) + ' 추가 환급.');
    if (!$('ye-renter').checked && val('ye-rent') > 0) tips.push('월세 세액공제는 무주택 세대주(총급여 8,000만원 이하)만 받습니다. 조건이 맞으면 체크하세요.');
    if (val('ye-med') * 10000 > 0 && val('ye-med') * 10000 <= gross * 0.03) tips.push('의료비는 총급여의 3%(' + won(Math.round(gross * 0.03)) + ')를 넘는 부분만 공제됩니다. 지금은 문턱 아래입니다.');
    if (r.usedStandard) tips.push('항목별 공제가 적어 표준세액공제 13만원이 더 유리한 것으로 계산했습니다.');
    $('ye-tips').innerHTML = tips.length ? tips.map(function (t) { return '<div class="callout">' + t + '</div>'; }).join('') : '';
  }
  Array.prototype.forEach.call(document.querySelectorAll('#ye-form input'), function (el) { el.addEventListener('input', calc); el.addEventListener('change', calc); });
  $('ye-form').addEventListener('submit', function (e) { e.preventDefault(); calc(); });
  calc();
})();
