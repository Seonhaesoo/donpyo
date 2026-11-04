/* 성과급·상여금 실수령 계산기 — 월급(또는 연봉)·상여·지급대상기간·부양가족을 바꾸면 그 자리에서 다시 계산 (window.Donpyo 엔진, 소득세법 시행령 제146조) */
(function () {
  var D = window.Donpyo;
  if (!D || !D.bonusWithholding) return;
  var num = D.num, won = D.won, manwon = D.manwon, pct = D.pct;
  var $ = function (id) { return document.getElementById(id); };
  var val = function (id) { var v = parseFloat(($(id).value || '0').replace(/[^0-9.]/g, '')); return isNaN(v) ? 0 : v; };
  var row = function (label, value, small) { return '<div class="lg-row"><div class="lbl"><span>' + label + '</span>' + (small ? '<small>' + small + '</small>' : '') + '</div><span class="num">' + value + '</span></div>'; };
  var q = new URL(location.href).searchParams;
  if (q.get('m')) $('bn-pay').value = q.get('m');
  if (q.get('a') && !q.get('m')) { $('bn-mode').value = 'annual'; $('bn-pay').value = q.get('a'); }
  if (q.get('b')) $('bn-bonus').value = q.get('b');
  if (q.get('n')) $('bn-months').value = q.get('n');

  function calc() {
    var mode = $('bn-mode').value;
    var pay = Math.round(val('bn-pay') * 10000);
    var monthly = mode === 'annual' ? Math.round(pay / 12) : pay;
    $('bn-pay-label').textContent = mode === 'annual' ? '연봉 (세전 · 만원)' : '세전 월급 (만원)';
    var bonus = Math.round(val('bn-bonus') * 10000);
    var months = Math.max(1, Math.min(12, Math.round(val('bn-months') || 12)));
    var dep = Math.max(1, Math.round(val('bn-dep') || 1)), kids = Math.max(0, Math.round(val('bn-kids')));
    var nontax = $('bn-meal').checked ? D.NT : 0;
    var r = D.bonusWithholding({ monthly: monthly, nontax: nontax, bonus: bonus, months: months, dependents: dep, children: kids });
    var base = D.netPay({ monthly: monthly, nontax: nontax, dependents: dep, children: kids });

    $('bn-out').textContent = num(r.net);
    $('bn-sub').textContent = bonus ? '상여 ' + won(bonus) + '에서 소득세·지방소득세 ' + won(r.taxTotal) + '과 건강·장기요양·고용보험 ' + won(r.insurance) + '을 뗀 금액 · 상여의 ' + pct(r.ratio, 1) : '상여 금액을 넣어 주세요';
    $('bn-tile-tax').textContent = num(r.taxTotal);
    $('bn-tile-ins').textContent = num(r.insurance);
    $('bn-tile-month').textContent = num(base.net + r.net);

    var rows = [
      row('상여 금액', num(r.bonus), mode === 'annual' ? '연봉 ' + manwon(pay) + ' → 세전 월급 ' + won(monthly) : '세전 월급 ' + won(monthly) + (nontax ? ' (식대 비과세 20만원 포함)' : '')),
      row('① 월평균 급여', num(r.avg), '(과세 월급 ' + won(r.taxable) + ' × ' + months + '개월 + 상여) ÷ ' + months + '개월'),
      row('② 월평균 급여의 간이세액', num(r.avgTax), '부양가족 ' + dep + '인' + (kids ? ' · 자녀 ' + kids + '명' : '')),
      row('③ 매달 떼던 소득세', num(r.regularTax), '과세 월급 ' + won(r.taxable) + '의 간이세액'),
      row('상여 소득세 = (② − ③) × ' + months, '−' + num(r.tax), won(r.avgTax) + ' × ' + months + ' − ' + won(r.regularTax) + ' × ' + months),
      row('지방소득세', '−' + num(r.local), '소득세의 10%'),
      row('건강보험', '−' + num(r.health), pct(D.RATES[D.YEAR].health, 3)),
      row('장기요양', '−' + num(r.care), '건강보험의 ' + pct(D.RATES[D.YEAR].care, 2)),
      row('고용보험', '−' + num(r.employment), pct(D.RATES[D.YEAR].employment, 1)),
      row('국민연금', '0', r.pensionCapped ? '지급 달에 안 뗌 · 월급이 이미 상한(' + manwon(r.pensionMax) + ')이라 다음 해에도 안 오름' : '지급 달에 안 뗌 · 다음 해 7월부터 월 ' + won(r.pensionMonthly) + '씩(1년 ' + won(r.pensionYear) + ') 더 낼 수 있음'),
    ];
    $('bn-rows').innerHTML = rows.join('') + '<div class="lg-total"><span>상여 실수령</span><span class="num">' + num(r.net) + '</span></div>';

    var tips = [];
    if (bonus) {
      if (r.lump > r.tax) tips.push('회사가 지급대상기간을 보지 않고 상여를 그 달 월급에 더해 간이세액표를 한 번만 조회하면 소득세가 <b>' + won(r.lump) + '</b>으로 ' + won(r.lump - r.tax) + ' 더 떼입니다. 어느 쪽이든 미리 내는 세금이라 연말정산에서 똑같이 정산되므로 최종 세금은 같습니다.');
      if (months < 12 && r.tax > 0) {
        var r12 = D.bonusWithholding({ monthly: monthly, nontax: nontax, bonus: bonus, months: 12, dependents: dep, children: kids });
        if (r12.tax < r.tax) tips.push('지급대상기간을 12개월(연간 성과급)로 보면 소득세는 ' + won(r12.tax) + '으로 ' + won(r.tax - r12.tax) + ' 줄어듭니다. 지급대상기간은 회사가 성과급 지급 기준(평가 기간)으로 정한 기간입니다.');
      }
      if (r.pensionCapped) tips.push('세전 월급이 국민연금 기준소득월액 상한 ' + manwon(r.pensionMax) + '을 넘어 상여를 받아도 국민연금 보험료는 늘지 않습니다.');
      else if (r.pensionMonthly > 0) tips.push('국민연금은 상여 받는 달에 더 떼지 않습니다. 대신 올해 소득총액(상여 포함)으로 다음 해 7월 기준소득월액이 다시 정해져 월 ' + won(r.pensionMonthly) + '씩 1년간 더 낼 수 있습니다(회사도 같은 금액 부담). 상한 ' + manwon(r.pensionMax) + '을 넘는 부분은 오르지 않습니다.');
      tips.push('건강보험·고용보험은 회사가 지급 달에 떼지 않았다면 다음 해 4월 보수총액 정산에서 같은 금액(' + won(r.insurance) + ')이 빠집니다.');
    }
    $('bn-tips').innerHTML = tips.map(function (t) { return '<div class="callout">' + t + '</div>'; }).join('');
  }
  Array.prototype.forEach.call(document.querySelectorAll('#bn-form input, #bn-form select'), function (el) { el.addEventListener('input', calc); el.addEventListener('change', calc); });
  $('bn-form').addEventListener('submit', function (e) { e.preventDefault(); calc(); });
  calc();
})();
