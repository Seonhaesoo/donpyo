/* 돈표 — 페이지 스크립트 (정적 사이트, 서버 없음)
 * 1) 홈 빠른 찾기: 입력한 금액을 가장 가까운 페이지로 보냄
 * 2) 변형 토글: 부양가족·비과세처럼 미리 렌더된 표 블록을 바꿔 보여줌 */
(function () {
  var forms = document.querySelectorAll('form[data-quick]');
  Array.prototype.forEach.call(forms, function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = f.querySelector('input');
      var v = parseInt((input.value || '').replace(/[^0-9]/g, ''), 10);
      if (!v) { input.focus(); return; }
      var kind = f.getAttribute('data-quick');
      var step = parseInt(f.getAttribute('data-step') || '100', 10);
      var min = parseInt(f.getAttribute('data-min') || '0', 10);
      var max = parseInt(f.getAttribute('data-max') || '0', 10);
      var n = Math.round(v / step) * step;
      if (min && n < min) n = min;
      if (max && n > max) n = max;
      location.href = '/' + kind + '/' + n + '/';
    });
  });

  var groups = document.querySelectorAll('[data-variants]');
  Array.prototype.forEach.call(groups, function (g) {
    var state = {};
    var segs = g.querySelectorAll('[data-dim]');
    function apply() {
      var key = Array.prototype.map.call(segs, function (s) { return state[s.getAttribute('data-dim')]; }).join('-');
      var blocks = g.querySelectorAll('[data-variant]');
      Array.prototype.forEach.call(blocks, function (b) { b.hidden = b.getAttribute('data-variant') !== key; });
      var url = new URL(location.href);
      Array.prototype.forEach.call(segs, function (s) { url.searchParams.set(s.getAttribute('data-dim'), state[s.getAttribute('data-dim')]); });
      history.replaceState(null, '', url.pathname + url.search);
    }
    Array.prototype.forEach.call(segs, function (s) {
      var dim = s.getAttribute('data-dim');
      var q = new URL(location.href).searchParams.get(dim);
      var btns = s.querySelectorAll('button');
      var initial = null;
      Array.prototype.forEach.call(btns, function (b) { if (b.getAttribute('data-value') === q) initial = q; });
      state[dim] = initial || s.getAttribute('data-default');
      Array.prototype.forEach.call(btns, function (b) {
        b.classList.toggle('on', b.getAttribute('data-value') === state[dim]);
        b.addEventListener('click', function () {
          state[dim] = b.getAttribute('data-value');
          Array.prototype.forEach.call(btns, function (x) { x.classList.toggle('on', x === b); });
          apply();
        });
      });
    });
    apply();
  });
})();
