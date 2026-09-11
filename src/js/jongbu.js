/* 종부세 계산기 — 공시가격 합계·보유 형태·나이·보유 기간을 바꾸면 그 자리에서 다시 계산 (window.Donpyo 엔진, 서버 페이지와 같은 코드) */
(function () {
  var D = window.Donpyo;
  if (!D || !D.jongbu) return;
  var $ = function (id) { return document.getElementById(id); };
  var val = function (id) { var v = parseFloat(($(id).value || '0').replace(/[^0-9.]/g, '')); return isNaN(v) ? 0 : v; };
  var set = function (id, v) { var e = $(id); if (e) e.textContent = v; };
  var pages = window.JB_PAGES || [];
  function kind() { var r = document.querySelector('#jb-form input[name="jb-type"]:checked'); return r ? r.value : 'one'; }

  function calc() {
    var price = Math.round(val('jb-price') * 100000000);
    var k = kind(), one = k === 'one';
    $('jb-age').disabled = !one; $('jb-years').disabled = !one;
    var r = D.jongbu(price, { type: one ? 'one' : 'multi', three: k === 'three', age: val('jb-age'), years: val('jb-years') });
    set('jb-total', D.num(r.total));
    set('jb-sub', r.total ? '종부세 ' + D.won(r.tax) + ' + 농어촌특별세 ' + D.won(r.rural) + ' · 12월 1~15일 납부'
      : (one ? '1세대 1주택은 공시가격 12억원까지 종부세가 없습니다' : '공시가격 합계 9억원까지는 종부세가 없습니다'));
    set('jb-deduct', '−' + D.num(r.deduct)); set('jb-deduct-l', one ? '1세대 1주택 12억원' : '그 밖의 개인 9억원');
    set('jb-base', D.num(r.base));
    set('jb-calc', D.num(r.calc)); set('jb-calc-l', r.three ? '3주택 이상 — 12억 초과분 2.0~5.0%' : '0.5~2.7% 누진');
    set('jb-prop', '−' + D.num(r.propDeduct)); set('jb-prop-l', '과세표준 × ' + r.propPct + '% × 0.4%');
    set('jb-credit', '−' + D.num(r.credit)); set('jb-credit-l', one ? '나이 ' + r.agePct + '% + 보유 ' + r.holdPct + '% = ' + r.creditPct + '% (한도 80%)' : '1세대 1주택만');
    set('jb-tax', D.num(r.tax)); set('jb-rural', '+' + D.num(r.rural)); set('jb-total2', D.num(r.total));
    var extra = [];
    if (one && r.total) { var p = D.propertyTax(price); extra.push('재산세 ' + D.won(p.total) + '(7월·9월)까지 합친 1년 보유세는 <b>' + D.won(p.total + r.total) + '</b>입니다.'); }
    if (r.installment) extra.push('종부세가 250만원을 넘어 ' + D.won(r.installment) + '(농특세는 같은 비율)을 6개월 안에 나눠 낼 수 있습니다.');
    if (!one) extra.push('여러 채라면 가진 집 모두의 공시가격을 더한 금액을 넣으세요.');
    var m = Math.round(price / 10000);
    var near = pages.length ? pages.reduce(function (a, b) { return Math.abs(b - m) < Math.abs(a - m) ? b : a; }) : 0;
    if (near) extra.push('<a href="/jongbu/' + near + '/">공시가 ' + D.manwon(near * 10000) + ' 표로 보기 →</a>');
    $('jb-extra').innerHTML = extra.length ? '<div class="callout">' + extra.join('<br>') + '</div>' : '';
  }
  Array.prototype.forEach.call(document.querySelectorAll('#jb-form input'), function (el) { el.addEventListener('input', calc); el.addEventListener('change', calc); });
  $('jb-form').addEventListener('submit', function (e) { e.preventDefault(); calc(); });
  calc();
})();
