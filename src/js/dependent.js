/* 건강보험 피부양자 자격 판정기 — 관계·소득·재산을 바꾸면 그 자리에서 다시 판정 (window.Donpyo 엔진, 빌드 때 만든 예시와 같은 코드·같은 문장) */
(function () {
  var D = window.Donpyo;
  if (!D || !D.dependent) return;
  var $ = function (id) { return document.getElementById(id); };
  var man = function (id) { var v = parseFloat(($(id).value || '0').replace(/[^0-9.]/g, '')); return isNaN(v) ? 0 : Math.round(v * 10000); };
  var NEED_MARITAL = { child: 1, grandchild: 1, spouseChild: 1, sibling: 1 };

  function calc() {
    var rel = $('dp-rel').value;
    $('dp-marital-f').hidden = !NEED_MARITAL[rel];
    $('dp-age-f').hidden = rel !== 'sibling';
    $('dp-spouse-f').hidden = rel === 'spouse';
    var r = D.dependent({
      relation: rel, together: $('dp-live').value === '1',
      marital: NEED_MARITAL[rel] ? $('dp-marital').value : undefined,
      age: parseInt($('dp-age').value, 10) || 0, disabled: $('dp-dis').checked,
      pension: man('dp-pension'), wage: man('dp-wage'), business: man('dp-biz'), finance: man('dp-fin'), other: man('dp-other'),
      bizReg: $('dp-reg').checked, rental: $('dp-rental').checked, property: man('dp-prop'),
      spouseOver: $('dp-spouse').checked
    });
    $('dp-hero').className = 'hero dep-' + r.verdict;
    $('dp-verdict').textContent = D.DEP_VERDICT[r.verdict];
    var names = { support: '부양요건', income: '소득요건', property: '재산요건' };
    $('dp-sub').textContent = (r.verdict === 'fail'
      ? r.fails.map(function (k) { return names[k]; }).join('·') + '을 채우지 못했습니다. '
      : r.verdict === 'check' ? '부양요건은 다른 가족의 보수·소득에 달려 있습니다. ' : '세 요건을 모두 채웠습니다. ')
      + '최종 판정은 국민건강보험공단이 합니다';
    $('dp-items').innerHTML = D.explainDependent(r).map(function (x) {
      return '<div class="dep-item"><div class="dep-head"><b>' + x.title + '</b><span class="dep-badge ' + x.status + '">' + D.DEP_STATUS[x.status] + '</span></div>'
        + (x.margin ? '<div class="dep-margin">' + x.margin + '</div>' : '')
        + x.lines.map(function (l) { return '<p>' + l + '</p>'; }).join('') + '</div>';
    }).join('');
    var next = [];
    if (r.verdict === 'fail') {
      var loc = D.nhisLocal({ income: D.dependentLocalIncome(r), property: r.property.value });
      next.push('<b>피부양자에서 빠지면 지역가입자가 됩니다.</b> 이 소득과 재산으로 혼자 한 세대라면 건강보험료와 장기요양보험료를 합쳐 월 <b>' + D.won(loc.total) + '</b>쯤입니다(근로·연금소득은 50%만 반영'
        + (loc.approx ? ', 재산 점수는 근사' : '') + '). 같은 세대에 다른 지역가입자가 있으면 합쳐서 매깁니다. <a href="/nhis/?t=local">지역가입자 보험료 계산 →</a>');
    } else if (r.verdict === 'check') {
      next.push('<b>부양요건만 남았습니다.</b> 가족관계와 다른 가족의 소득은 공단이 자료로 확인합니다. 누리집(nhis.or.kr)의 \'피부양자 취득 가능 여부 조회\'나 고객센터 1577-1000에서 확인하세요.');
    } else {
      next.push('<b>세 요건을 모두 채웠습니다.</b> 등재는 직장가입자가 공단에 피부양자 자격취득 신고를 해야 이뤄집니다. 소득·재산 자료는 해마다 11월에 새로 반영되니 남은 금액이 적다면 그때 다시 확인하세요.');
    }
    $('dp-next').innerHTML = next.map(function (t) { return '<div class="callout">' + t + '</div>'; }).join('');
  }
  Array.prototype.forEach.call(document.querySelectorAll('#dp-form input, #dp-form select'), function (el) { el.addEventListener('input', calc); el.addEventListener('change', calc); });
  $('dp-form').addEventListener('submit', function (e) { e.preventDefault(); calc(); });
  calc();
})();
