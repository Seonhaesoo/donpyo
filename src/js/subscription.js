/* 청약 가점 계산기 — 무주택 기간·부양가족·통장 가입기간을 바꾸면 그 자리에서 세 항목 점수와 합계를 다시 계산 (window.Donpyo 엔진) */
(function () {
  var D = window.Donpyo;
  if (!D || !D.subscriptionScore) return;
  var $ = function (id) { return document.getElementById(id); };
  var val = function (id) { var v = parseFloat(($(id).value || '0').replace(/[^0-9.]/g, '')); return isNaN(v) ? 0 : v; };
  var hText = function (h) { return h === 0 ? '무주택 1년 미만' : h === 15 ? '무주택 15년 이상' : '무주택 ' + h + '년'; };
  var fText = function (f) { return f === 6 ? '부양가족 6명 이상' : '부양가족 ' + f + '명'; };

  function calc() {
    var years = val('sb-years'), fam = val('sb-family'), months = val('sb-acc-y') * 12 + val('sb-acc-m');
    var under30 = $('sb-under30').checked, owner = $('sb-owner').checked;
    var r = D.subscriptionScore({ homelessYears: years, under30Single: under30, owner: owner, family: fam, accountMonths: months });
    var g = D.subGrade(r.total);
    $('sb-total').textContent = r.total;
    $('sb-h').textContent = r.homeless;
    $('sb-f').textContent = r.family;
    $('sb-a').textContent = r.account;
    $('sb-sub').textContent = '84점 만점 · 무주택 ' + r.homeless + ' + 부양가족 ' + r.family + ' + 통장 ' + r.account + ' · ' + g.label;
    var why = [];
    if (owner) why.push('집이 있어 무주택기간 점수가 0점입니다.');
    else if (under30) why.push('만 30세 미만 미혼은 무주택기간을 0점으로 봅니다. 만 30세가 되는 날부터 기간이 쌓입니다.');
    if (fam >= 6) why.push('부양가족은 6명 이상이면 35점으로 같습니다.');
    if (months >= 180) why.push('통장 가입기간은 15년 이상이면 17점으로 같습니다.');
    $('sb-grade').innerHTML = '<div class="callout"><b>' + g.label + '</b> — ' + g.text + (why.length ? '<br>' + why.join(' ') : '') + '</div>';
    var h = Math.max(0, Math.min(15, Math.floor(years))), f = Math.max(0, Math.min(6, Math.floor(fam)));
    var link = $('sb-link');
    if (owner || under30) { link.hidden = true; }
    else { link.hidden = false; link.href = '/subscription/' + h + '-' + f + '/'; link.textContent = hText(h) + ' · ' + fText(f) + ' 표로 →'; }
  }
  Array.prototype.forEach.call(document.querySelectorAll('#sb-form input'), function (el) { el.addEventListener('input', calc); el.addEventListener('change', calc); });
  $('sb-form').addEventListener('submit', function (e) { e.preventDefault(); calc(); });
  calc();
})();
