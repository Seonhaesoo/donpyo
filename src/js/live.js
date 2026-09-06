/* 페이지 위 슬라이더 — 미리 계산된 표 아래에서 값을 끌면 그 자리에서 다시 계산 (window.Donpyo 엔진) */
(function () {
  var D = window.Donpyo;
  if (!D) return;
  var num = D.num, manwon = D.manwon, won = D.won;
  var nearestStep = function (v, arr) { return arr.reduce(function (a, b) { return Math.abs(b - v) < Math.abs(a - v) ? b : a; }); };

  Array.prototype.forEach.call(document.querySelectorAll('[data-live="salary"]'), function (box) {
    var rA = box.querySelector('[data-k="a"]'), rD = box.querySelector('[data-k="d"]'), rN = box.querySelector('[data-k="n"]');
    var out = function (k) { return box.querySelector('[data-out="' + k + '"]'); };
    function update() {
      var a = parseInt(rA.value, 10), d = parseInt(rD.value, 10), n = parseInt(rN.value, 10);
      var p = D.netPay({ annual: a * 10000, dependents: d, nontax: n });
      out('a').textContent = manwon(a * 10000);
      out('d').textContent = d === 1 ? '본인' : d + '인';
      out('n').textContent = n ? '월 ' + manwon(n) : '없음';
      out('net').textContent = num(p.net);
      out('ins').textContent = num(p.insurance);
      out('tax').textContent = num(p.taxTotal);
      out('year').textContent = num(p.annualNet);
      var link = out('link');
      var step = a <= 10000 ? 100 : a <= 20000 ? 1000 : 5000;
      var near = Math.round(a / step) * step;
      link.href = '/salary/' + near + '/?d=' + d + '&n=' + n;
      link.textContent = '연봉 ' + manwon(near * 10000) + ' 페이지로 →';
    }
    [rA, rD, rN].forEach(function (r) { r.addEventListener('input', update); });
    update();
  });

  Array.prototype.forEach.call(document.querySelectorAll('[data-live="loan"]'), function (box) {
    var rP = box.querySelector('[data-k="p"]'), rY = box.querySelector('[data-k="y"]'), rR = box.querySelector('[data-k="r"]');
    var out = function (k) { return box.querySelector('[data-out="' + k + '"]'); };
    var AMOUNTS = [3000, 5000, 7000, 10000, 15000, 20000, 25000, 30000, 40000, 50000, 60000, 70000, 80000, 100000];
    var YEARS = [10, 15, 20, 25, 30, 35, 40];
    function update() {
      var p = parseInt(rP.value, 10), y = parseInt(rY.value, 10), r = parseInt(rR.value, 10) / 10;
      var P = p * 10000, n = y * 12, rate = r / 100;
      var pay = D.annuityPayment(P, rate, n);
      var s = D.summary(P, rate, n);
      out('p').textContent = manwon(P);
      out('y').textContent = y + '년';
      out('r').textContent = r.toFixed(1) + '%';
      out('pay').textContent = num(pay);
      out('interest').textContent = num(s.totalInterest);
      out('total').textContent = num(s.totalPayment);
      var link = out('link');
      var np = nearestStep(p, AMOUNTS), ny = nearestStep(y, YEARS), nr = Math.max(2.5, Math.min(7, Math.round(r * 2) / 2));
      link.href = '/loan/' + np + '/' + ny + '/' + nr.toFixed(1) + '/';
      link.textContent = manwon(np * 10000) + ' · ' + ny + '년 · ' + nr.toFixed(1) + '% 상환표로 →';
    }
    [rP, rY, rR].forEach(function (r) { r.addEventListener('input', update); });
    update();
  });
})();
