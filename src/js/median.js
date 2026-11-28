/* 기준 중위소득 — 가구원 수·월 소득(만원) → 2027년 중위소득 몇 %, 급여별 선정기준과 비교 (window.Donpyo = engine/median.mjs) */
(function () {
  var D = window.Donpyo;
  if (!D || !D.medianCheck || !document.getElementById('md-form')) return;
  var $ = function (id) { return document.getElementById(id); };
  var won = D.won;
  function calc() {
    var n = parseInt($('md-n').value, 10) || 1;
    var v = parseFloat(String($('md-income').value || '').replace(/[^0-9.]/g, ''));
    var inc = isNaN(v) ? 0 : Math.round(v * 10000);
    var r = D.medianCheck(inc, n, 2027);
    $('md-result').textContent = r.pct.toFixed(1);
    $('md-sub').textContent = n + '인 가구 2027년 기준 중위소득 ' + won(r.median) + ' · 입력한 월 소득 ' + won(inc);
    var tips = [];
    var under = D.BENEFITS.filter(function (b) { return r.under.indexOf(b.key) >= 0; }).map(function (b) { return b.label + '(' + b.pct + '%)'; });
    if (under.length) tips.push('입력한 소득은 <b>' + under.join(' · ') + '</b> 선정기준 이하입니다. 다만 기초생활보장은 재산을 소득으로 바꿔 더한 소득인정액으로 판정하고 다른 요건도 보니, 주민센터나 복지로 모의계산으로 확인하세요.');
    var nextP = D.COMMON_PCTS.filter(function (p) { return r.pct <= p; })[0];
    if (nextP) tips.push('공고에 자주 나오는 비율로 보면 <b>중위소득 ' + nextP + '% 이하</b>(' + n + '인 ' + won(D.pctAmount(2027, n, nextP)) + ')에 듭니다. 사업마다 소득을 보는 방법(건강보험료·소득인정액 등)이 달라 공고를 확인하세요.');
    else tips.push('중위소득 180%를 넘습니다. 소득 기준이 있는 지원 사업 대부분은 이보다 낮은 비율을 씁니다.');
    $('md-tips').innerHTML = tips.map(function (x) { return '<div class="callout">' + x + '</div>'; }).join('');
  }
  Array.prototype.forEach.call(document.querySelectorAll('#md-form input, #md-form select'), function (el) { el.addEventListener('input', calc); el.addEventListener('change', calc); });
  $('md-form').addEventListener('submit', function (e) { e.preventDefault(); calc(); });
  calc();
})();
