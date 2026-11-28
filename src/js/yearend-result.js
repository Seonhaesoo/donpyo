/* 연말정산 결과 보는 법 — 원천징수영수증의 결정세액·기납부세액(소득세)을 넣으면 차감징수세액과 지방소득세까지 합친 환급·추가 납부액.
 * 빈칸은 placeholder(연봉 5,000만원 예시 값)로 계산한다. 같은 총급여의 보통 결정세액은 빌드 때 넣은 window.YE_TYPICAL 로 견준다 */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var num = function (v) { return Math.round(v).toLocaleString('ko-KR'); };
  var won = function (v) { return num(v) + '원'; };
  var f10 = function (v) { return Math.floor(v / 10) * 10; };
  /* 2026-11-28 Fable 점검: 예시 값(placeholder)은 네 칸이 모두 비었을 때만 쓴다 — 한 칸만 넣었는데 예시 숫자와 섞이지 않게. 총급여가 비면 비교를 건너뛴다 */
  var IDS = ['yr-det', 'yr-cur', 'yr-prev', 'yr-gross'];
  var raw = function (id) { return ($(id).value || '').replace(/[^0-9]/g, ''); };
  var val = function (id) {
    var useEx = IDS.every(function (k) { return raw(k) === ''; });
    var r = raw(id);
    if (r === '' && useEx) r = ($(id).getAttribute('placeholder') || '0').replace(/[^0-9]/g, '');
    var v = parseInt(r || '0', 10);
    return isNaN(v) ? 0 : v;
  };
  var TYP = window.YE_TYPICAL || [];

  function calc() {
    var det = val('yr-det'), cur = val('yr-cur'), prev = val('yr-prev'), gross = val('yr-gross');
    var paid = cur + prev;
    var diff = det - paid;                                         /* 차감징수세액(소득세) — 마이너스면 환급 */
    var localDiff = f10(det * 0.1) - (f10(cur * 0.1) + f10(prev * 0.1));
    var total = diff + localDiff;
    $('yr-label').textContent = total < 0 ? '돌려받는 돈 (소득세 + 지방소득세)' : total > 0 ? '더 내는 돈 (소득세 + 지방소득세)' : '돌려받지도 더 내지도 않음';
    $('yr-result').textContent = num(Math.abs(total));
    $('yr-sub').textContent = '차감징수세액 소득세 ' + (diff < 0 ? '−' : '') + num(Math.abs(diff)) + '원 · 지방소득세 ' + (localDiff < 0 ? '−' : '') + num(Math.abs(localDiff)) + '원 (결정세액 ' + won(det) + ' − 미리 낸 ' + won(paid) + ')';

    var tips = [];
    if (total < 0) tips.push('<b>환급입니다.</b> 1년 동안 미리 뗀 세금이 실제 낼 세금보다 ' + won(-total) + ' 많았다는 뜻입니다. 보통 2월분 급여(회사에 따라 3월)에 더해 들어옵니다.');
    if (det === 0) tips.push('<b>결정세액이 0원</b>이면 올해 낼 소득세가 없다는 뜻이라 미리 낸 세금은 모두 돌려받습니다. 이때는 연금저축·의료비 같은 공제를 더 챙겨도 돌려받는 돈이 늘지 않습니다.');
    if (diff > 100000) tips.push('<b>추가 납부 소득세가 10만원을 넘습니다.</b> 회사가 2월분부터 4월분 급여까지 나눠 뗄 수 있으니(소득세법 제137조 제4항) 분납을 신청하세요. 지방소득세까지 한 번에 내면 ' + won(diff + Math.max(0, localDiff)) + ', 2·3·4월에 나누면 한 달 약 ' + won(Math.ceil((diff + Math.max(0, localDiff)) / 3 / 10) * 10) + '입니다(어림).');
    else if (diff > 0) tips.push('<b>추가 납부입니다.</b> 10만원 이하라 2월분 급여에서 한 번에 뗍니다. 왜 더 내는지는 아래 "더 내게 되는 흔한 이유"를 보세요.');
    if (gross > 0 && TYP.length) {
      var best = TYP[0];
      TYP.forEach(function (t) { if (Math.abs(t.g - gross) < Math.abs(best.g - gross)) best = t; });
      var my = det / gross * 100, typ = best.d / best.g * 100;
      var near = Math.abs(best.g - gross) <= best.g * 0.1;
      if (near) {
        var cmp = my < typ - 0.5 ? '보다 낮습니다 — 부양가족·자녀·연금저축 같은 공제를 보통보다 많이 받은 편입니다.' : my > typ + 0.5 ? '보다 높습니다 — 공제가 적었거나 상여·다른 회사 소득이 합쳐졌을 수 있습니다.' : '와 비슷합니다.';
        tips.push('내 실효세율(결정세액 ÷ 총급여)은 <b>' + my.toFixed(1) + '%</b>입니다. 비슷한 총급여(' + won(best.g) + ')를 본인 1인·카드 연봉 40%로 계산한 보통 실효세율 ' + typ.toFixed(1) + '%' + cmp);
      } else {
        tips.push('내 실효세율(결정세액 ÷ 총급여)은 <b>' + my.toFixed(1) + '%</b>입니다.');
      }
    }
    $('yr-tips').innerHTML = tips.map(function (t) { return '<div class="callout">' + t + '</div>'; }).join('');
  }
  Array.prototype.forEach.call(document.querySelectorAll('#yr-form input'), function (el) { el.addEventListener('input', calc); el.addEventListener('change', calc); });
  $('yr-form').addEventListener('submit', function (e) { e.preventDefault(); calc(); });
  calc();
})();
