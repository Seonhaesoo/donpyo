/* 전기요금 계산기 — 사용량·계절·저압/고압을 바꾸면 그 자리에서 청구액과 계산 흐름을 다시 계산 (window.Donpyo 엔진) */
(function () {
  var D = window.Donpyo;
  if (!D || !D.electricBill) return;
  var num = D.num, won = D.won;
  var $ = function (id) { return document.getElementById(id); };
  var val = function (id) { var v = parseInt(($(id).value || '0').replace(/[^0-9]/g, ''), 10); return isNaN(v) ? 0 : v; };
  var row = function (label, value, small) { return '<div class="lg-row"><div class="lbl"><span>' + label + '</span>' + (small ? '<small>' + small + '</small>' : '') + '</div><span class="num">' + value + '</span></div>'; };
  var q = new URL(location.href).searchParams;
  if (q.get('k')) $('el-kwh').value = q.get('k');

  function calc() {
    var kwh = val('el-kwh'), season = $('el-season').value, voltage = $('el-voltage').value;
    var b = D.electricBill(kwh, { season: season, voltage: voltage });
    var otherSeason = season === 'summer' ? 'other' : 'summer';
    var o = D.electricBill(kwh, { season: otherSeason, voltage: voltage });
    $('el-total').textContent = num(b.total);
    $('el-sub').textContent = D.PLANS[voltage].label + ' · ' + D.SEASONS[season].label + ' · ' + b.tier + '단계' + (b.superUser ? ' (슈퍼유저)' : '') + ' · kWh당 평균 ' + won(b.perKwh);
    $('el-tier').textContent = b.tier + '단계' + (b.superUser ? '+' : '');
    $('el-per').textContent = num(b.perKwh);
    $('el-other').textContent = num(o.total);
    $('el-other-label').textContent = D.SEASONS[otherSeason].short + '이면';
    var rows = [row('기본요금', num(b.base), b.tier + '단계 기본요금')];
    b.rows.forEach(function (r) { rows.push(row(r.label, num(r.amount), num(r.kwh) + 'kWh × ' + r.rate.toFixed(1) + '원')); });
    rows.push(row('기후환경요금', num(b.climate), num(kwh) + 'kWh × 9.0원'));
    rows.push(row('연료비조정요금', num(b.fuel), num(kwh) + 'kWh × 5.0원'));
    rows.push(row('전기요금계', num(b.subtotal)));
    rows.push(row('부가가치세 10%', num(b.vat), '원 단위 반올림'));
    rows.push(row('전력산업기반기금 2.7%', num(b.fund), '10원 미만 절사'));
    $('el-rows').innerHTML = rows.join('') + '<div class="lg-total"><span>청구액 (10원 미만 절사)</span><span class="num">' + num(b.total) + '</span></div>';
    var near = Math.max(100, Math.min(1000, Math.round(kwh / 50) * 50));
    var link = $('el-link');
    link.href = '/electric/' + near + '/';
    link.textContent = num(near) + 'kWh 페이지로 →';
  }
  Array.prototype.forEach.call(document.querySelectorAll('#el-form input, #el-form select'), function (el) { el.addEventListener('input', calc); el.addEventListener('change', calc); });
  $('el-form').addEventListener('submit', function (e) { e.preventDefault(); calc(); });
  calc();
})();
