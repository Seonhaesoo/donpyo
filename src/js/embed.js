/* 임베드 위젯 — 다른 사이트의 iframe 안에서 도는 작은 계산기 (window.Donpyo) */
(function () {
  var D = window.Donpyo;
  if (!D) return;
  var num = D.num, manwon = D.manwon, won = D.won;
  var box = document.querySelector('[data-embed]');
  if (!box) return;
  var kind = box.getAttribute('data-embed');
  var out = function (k) { return box.querySelector('[data-out="' + k + '"]'); };
  var val = function (k) { return parseInt((box.querySelector('[data-k="' + k + '"]').value || '0').replace(/[^0-9.]/g, ''), 10) || 0; };

  function update() {
    if (kind === 'salary') {
      var a = val('a'), d = parseInt(box.querySelector('[data-k="d"]').value, 10) || 1;
      if (!a) return;
      var p = D.netPay({ annual: a * 10000, dependents: d, nontax: D.NT });
      out('net').textContent = num(p.net);
      out('ins').textContent = num(p.insurance);
      out('tax').textContent = num(p.taxTotal);
      var near = Math.max(2000, Math.min(30000, Math.round(a / 100) * 100));
      out('link').href = 'https://donpyo.com/salary/' + near + '/?d=' + d + '&n=' + D.NT + '&utm_source=embed';
    } else if (kind === 'loan') {
      var P = val('p') * 10000, y = val('y'), r = parseFloat(box.querySelector('[data-k="r"]').value) || 0;
      if (!P || !y) return;
      var s = D.summary(P, r / 100, y * 12);
      out('pay').textContent = num(s.monthly);
      out('interest').textContent = num(s.totalInterest);
      out('total').textContent = num(s.totalPayment);
      out('link').href = 'https://donpyo.com/loan/?utm_source=embed';
    }
  }
  Array.prototype.forEach.call(box.querySelectorAll('input, select'), function (el) { el.addEventListener('input', update); el.addEventListener('change', update); });
  box.addEventListener('submit', function (e) { e.preventDefault(); update(); });
  update();
})();
