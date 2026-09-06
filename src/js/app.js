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

  /* 3) 실수령액 카드 — 1080×1350 이미지를 만들어 공유하거나 저장 */
  var shareBtn = document.querySelector('[data-share-card]');
  if (shareBtn) {
    shareBtn.addEventListener('click', function () {
      var d = shareBtn.dataset;
      var visible = document.querySelector('[data-variant]:not([hidden]) .hero-num .num');
      var l2 = visible ? visible.textContent : d.l2;
      var draw = function () {
        var c = document.createElement('canvas');
        c.width = 1080; c.height = 1350;
        var x = c.getContext('2d');
        x.fillStyle = '#FBF8F1'; x.fillRect(0, 0, 1080, 1350);
        x.fillStyle = '#1E5C46'; x.fillRect(0, 0, 1080, 14);
        x.strokeStyle = '#E3DCCB'; x.lineWidth = 2;
        for (var i = 0; i < 14; i++) { x.beginPath(); x.moveTo(90, 300 + i * 70); x.lineTo(990, 300 + i * 70); x.stroke(); }
        x.fillStyle = '#1E5C46'; x.font = '700 44px "Gowun Batang", serif'; x.fillText('돈표', 90, 130);
        x.fillStyle = '#8A948E'; x.font = '500 26px "Noto Sans KR", sans-serif'; x.fillText('돈 계산 사전 · donpyo.com', 90, 178);
        x.fillStyle = '#17211C'; x.font = '700 64px "Gowun Batang", serif'; x.fillText(d.l1, 90, 420);
        x.fillStyle = '#5F6B64'; x.font = '500 30px "Noto Sans KR", sans-serif'; x.fillText(d.l3, 90, 480);
        x.fillStyle = '#1E5C46'; x.font = '600 150px "IBM Plex Mono", monospace'; x.fillText(l2, 90, 690);
        x.fillStyle = '#17211C'; x.font = '500 40px "Noto Sans KR", sans-serif'; x.fillText('원', 90 + measure(x, l2, '600 150px "IBM Plex Mono", monospace') + 16, 690);
        x.fillStyle = '#B8862B'; x.font = '700 36px "Noto Sans KR", sans-serif'; x.fillText(d.l4, 90, 800);
        x.fillStyle = '#8A948E'; x.font = '400 26px "Noto Sans KR", sans-serif'; x.fillText('국세청 간이세액표 · 4대보험 요율 기준 · 참고용', 90, 1230);
        x.fillStyle = '#1E5C46'; x.fillRect(90, 1270, 900, 3);
        deliver(c);
      };
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw); else draw();
    });
  }
  function measure(x, text, font) { var f = x.font; x.font = font; var w = x.measureText(text).width; x.font = f; return w; }
  function deliver(c) {
    c.toBlob(function (blob) {
      if (!blob) return;
      var file = new File([blob], 'donpyo-card.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: '돈표 실수령액 카드' }).catch(function () {});
        return;
      }
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'donpyo-card.png';
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    }, 'image/png');
  }
})();
