/* 월세 세액공제 계산기 — 연봉·월세·개월·부양가족 → 실제로 줄어드는 세금(지방소득세 포함) (window.Donpyo = engine/wolse.mjs) */
(function () {
  var D = window.Donpyo;
  if (!D || !D.wolseCredit || !document.getElementById('ws-form')) return;
  var $ = function (id) { return document.getElementById(id); };
  var won = D.won;
  var n = function (id) { var v = parseFloat(String($(id).value || '').replace(/[^0-9.]/g, '')); return isNaN(v) ? 0 : v; };
  function calc() {
    var annual = Math.round(n('ws-annual') * 10000), rent = Math.round(n('ws-rent') * 10000), months = Math.min(12, Math.max(0, Math.round(n('ws-months')))), dep = Math.max(1, Math.round(n('ws-dep')) || 1);
    var ok = $('ws-ok').checked;
    var r = D.wolseCredit({ annual: annual, rent: rent, months: months, dependents: dep });
    var save = ok ? r.save : 0;
    $('ws-result').textContent = D.num(save);
    $('ws-sub').textContent = !ok ? '무주택 세대주·전입신고 요건을 채워야 받을 수 있습니다' : !r.eligible ? '총급여(연봉 − 비과세)가 ' + won(r.gross) + '로 8,000만원을 넘어 대상이 아닙니다' : '낸 월세 ' + won(r.paid) + (r.paid > r.counted ? '(1,000만원까지 셈)' : '') + ' × ' + Math.round(r.rate * 100) + '% = 최대 ' + won(r.max) + ' + 지방소득세';
    var tips = [];
    if (ok && r.eligible && r.capped) tips.push('계산상 최대는 <b>' + won(r.maxWithLocal) + '</b>(지방소득세 포함)이지만, 낼 세금이 적어 실제로는 <b>' + won(r.save) + '</b>만 줄어듭니다. 결정세액이 0원이 되면 그 이상은 돌려받지 못합니다.');
    if (ok && r.eligible && !r.capped && r.save > 0) tips.push('결정세액이 충분해 공제를 다 받습니다. 연금저축·의료비 같은 다른 세액공제가 많으면 줄어들 수 있으니 <a href="/yearend/?a=' + Math.round(annual / 10000) + '">연말정산 미리보기</a>에서 함께 넣어 보세요.');
    if (ok && r.eligible && r.gross > 55000000) tips.push('총급여가 5,500만원을 넘어 공제율이 15%입니다(5,500만원 이하면 17%).');
    if (!ok) tips.push('세대주가 아니어도 요건을 갖춘 세대원(또는 따로 사는 배우자)이면 받을 수 있습니다. 어려우면 홈택스에서 주택임차료 현금영수증을 신청해 카드 공제(30%)로 받는 방법이 있습니다.');
    $('ws-tips').innerHTML = tips.map(function (x) { return '<div class="callout">' + x + '</div>'; }).join('');
  }
  Array.prototype.forEach.call(document.querySelectorAll('#ws-form input'), function (el) { el.addEventListener('input', calc); el.addEventListener('change', calc); });
  $('ws-form').addEventListener('submit', function (e) { e.preventDefault(); calc(); });
  calc();
})();
