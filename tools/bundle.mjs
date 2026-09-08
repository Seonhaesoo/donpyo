/* 브라우저용 엔진 묶음 — engine/*.mjs 원본을 그대로 읽어 import/export만 걷어내고 데이터를 앞에 붙인다.
 * 서버 계산과 브라우저 계산이 같은 소스를 쓰도록 하기 위한 장치. tools/test.mjs 가 두 결과를 비교한다. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { YEAR, RATES, PENSION_SCHEDULE } from '../data/rates.mjs';
import { AGE_INCOME } from '../data/age-income.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(ROOT, 'engine', f), 'utf8');
const strip = (src) => src.split('\n').filter((l) => !/^import /.test(l)).join('\n')
  .replace(/^export (function|const|let)/gm, '$1')
  .replace(/^export \{[^}]*\};?\s*$/gm, '');
const wrap = (name, src, names) => `const ${name} = (() => {\n${src}\nreturn { ${names.join(', ')} };\n})();`;

export function makeBundle(NT = 200000) {
  const rates = { ...RATES };
  for (const [y, r] of Object.entries(PENSION_SCHEDULE)) if (!rates[y]) rates[y] = { ...RATES[YEAR], pension: r };
  const table = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'ganyi.json'), 'utf8')).rows;
  const tax = strip(read('tax.mjs')).replace(/const TABLE = JSON\.parse\([^\n]*\n/, 'const TABLE = __TABLE__;\n');
  if (!tax.includes('__TABLE__')) throw new Error('tax.mjs TABLE 치환 실패');
  const parts = [
    `const YEAR = ${YEAR}; const RATES = ${JSON.stringify(rates)}; const AGE_INCOME = ${JSON.stringify(AGE_INCOME)}; const __TABLE__ = ${JSON.stringify(table)};`,
    wrap('F', strip(read('fmt.mjs')), ['num', 'won', 'manwon', 'short', 'pct', 'rate']),
    wrap('T', tax, ['insurance', 'incomeTax', 'netPay', 'grossForNet']),
    wrap('L', strip(read('loan.mjs')), ['annuityPayment', 'schedule', 'summary', 'loanForPayment', 'dsrLimit', 'refinance', 'extraPayment']),
    wrap('K', strip(read('rank.mjs')), ['rank', 'incomeAt', 'STAT']),
    wrap('A', strip(read('age.mjs')), ['ageRank', 'medianOf']),
    wrap('G', strip(read('goal.mjs')), ['monthsToGoal', 'balanceAfter', 'fmtMonths']),
    wrap('Y', strip(read('retire.mjs')) + '\n' + strip(read('yearend.mjs')), ['basicTax', 'severance', 'severanceTax', 'yearEnd', 'cardDeduction', 'earnedIncomeDeduction']),
    wrap('S', strip(read('subscription.mjs')), ['subscriptionScore', 'homelessScore', 'familyScore', 'accountScore', 'subGrade', 'maxForFamily', 'SUB_MAX', 'HOMELESS_TABLE', 'FAMILY_TABLE', 'ACCOUNT_TABLE']),
    wrap('P', strip(read('parental.mjs')), ['parentalLeave', 'monthPay', 'bothTotal', 'babyBenefits', 'benefitTimeline', 'ageMonths', 'MODES', 'BENEFITS', 'BOTH_CAPS', 'NORMAL_CAPS', 'LEAVE_MIN']),
    wrap('E', strip(read('electric.mjs')), ['electricBill', 'marginalPerKwh', 'PLANS', 'SEASONS']),
    `window.Donpyo = Object.assign({ YEAR, RATES, NT: ${NT} }, F, T, L, K, A, G, Y, S, P, E);`,
  ];
  return `/* 돈표 계산 엔진 — 브라우저용, 빌드 때 engine/*.mjs 에서 생성 */\n(function(){\n${parts.join('\n')}\n})();\n`;
}
