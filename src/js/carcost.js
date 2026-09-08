/* 자동차 유지비 계산기 — 차량가·연식·연료·연비·주행거리·보험·배기량을 바꾸면 그 자리에서 다시 계산 (window.Donpyo 엔진) */
(function () {
  var D = window.Donpyo;
  if (!D || !D.carCost) return;
  var num = D.num, won = D.won, manwon = D.manwon;
  var $ = function (id) { return document.getElementById(id); };
  var val = function (id) { var v = parseFloat(($(id).value || '0').replace(/[^0-9.]/g, '')); return isNaN(v) ? 0 : v; };
  var pct0 = function (r) { return Math.round(r * 100) + '%'; };
  var row = function (label, value, small) { return '<div class="lg-row"><div class="lbl"><span>' + label + '</span>' + (small ? '<small>' + small + '</small>' : '') + '</div><span class="num">' + value + '</span></div>'; };
  var PRICES = []; for (var p = 2000; p <= 8000; p += 500) PRICES.push(p);
  var nearest = function (arr, v) { return arr.reduce(function (a, b) { return Math.abs(b - v) < Math.abs(a - v) ? b : a; }); };
  var q = new URL(location.href).searchParams;
  if (q.get('p')) $('cc-price').value = q.get('p');

  function calc() {
    var priceMan = val('cc-price'), fuel = $('cc-fuel').value;
    var c = D.carCost({ price: Math.round(priceMan * 10000), age: Math.round(val('cc-age')) || 1, fuel: fuel, efficiency: val('cc-eff'), km: Math.round(val('cc-km')), fuelPrice: val('cc-fuelprice'), cc: Math.round(val('cc-cc')), insurance: Math.round(val('cc-ins') * 10000), maintenance: Math.round(val('cc-maint') * 10000), parking: Math.round(val('cc-park') * 10000), year: D.YEAR });
    $('cc-monthly').textContent = num(c.monthly);
    $('cc-sub').textContent = c.fuelLabel + ' ' + c.eff + c.effUnit + ' · 연 ' + num(c.km) + 'km · ' + c.age + '년차 (감가 ' + pct0(c.depRate) + ') · 연 ' + won(c.annual);
    $('cc-cash').textContent = num(c.cashMonthly);
    $('cc-perkm').textContent = num(c.perKm);
    $('cc-annual').textContent = num(c.annual);
    $('cc-rows').innerHTML = c.items.map(function (r) { return row(r.label, num(r.annual), r.note + ' · 월 ' + won(r.monthly) + ' · ' + pct0(r.share)); }).join('') + '<div class="lg-total"><span>연 합계</span><span class="num">' + num(c.annual) + '</span></div>';
    var tips = [];
    var dep = c.items.filter(function (r) { return r.key === 'depreciation'; })[0];
    if (dep && dep.share >= 0.4) tips.push('감가상각이 전체의 ' + pct0(dep.share) + '입니다. 매달 통장에서 나가지는 않지만 팔 때 확정되는 비용이라, 3년쯤 된 중고차를 사면 이 부분이 절반 이하로 줄어듭니다. 감가를 뺀 현금 지출은 월 ' + won(c.cashMonthly) + '입니다.');
    if (fuel === 'ev') tips.push('전기차는 배기량이 없어 자동차세가 정액 13만원(교육세 포함)이고 엔진오일 같은 소모품이 적습니다. 집 완속 충전(kWh당 150~250원)이 가능하면 연료 단가를 낮춰 보세요.');
    if (c.km >= 25000) tips.push('연 ' + num(c.km) + 'km는 평균(15,000km 안팎)보다 훨씬 많습니다. 연비가 좋은 하이브리드·전기차나 경유차가 유리하고 타이어·소모품 비용도 늘어납니다.');
    if (c.age >= 3 && c.fuel !== 'ev') tips.push(c.age + '년차라 자동차세가 ' + pct0(D.carTax(c.cc, { age: c.age, year: D.YEAR }).discount) + ' 경감됐습니다. 12년차부터는 절반입니다.');
    $('cc-tips').innerHTML = tips.map(function (t) { return '<div class="callout">' + t + '</div>'; }).join('');
    var link = $('cc-link'), np = nearest(PRICES, priceMan);
    link.href = '/carcost/' + np + '/';
    link.textContent = '차량가 ' + manwon(np * 10000) + ' 표로 →';
  }
  $('cc-fuel').addEventListener('change', function () { var F = D.FUELS[$('cc-fuel').value]; if (F) { $('cc-eff').value = F.eff; $('cc-fuelprice').value = F.price; } });
  Array.prototype.forEach.call(document.querySelectorAll('#cc-form input, #cc-form select'), function (el) { el.addEventListener('input', calc); el.addEventListener('change', calc); });
  $('cc-form').addEventListener('submit', function (e) { e.preventDefault(); calc(); });
  calc();
})();
