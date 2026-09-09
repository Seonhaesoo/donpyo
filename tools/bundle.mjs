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
    wrap('EI', strip(read('eitc.mjs')), ['eitc', 'workCredit', 'childCredit', 'propertyFactor', 'phaseText', 'TYPES', 'CTC', 'PROPERTY_LIMIT', 'PROPERTY_HALF', 'EITC_ASOF']),
    wrap('NP', strip(read('pension.mjs')), ['pension', 'shiftTable', 'premium', 'premiumTable', 'payback', 'startAge', 'yearsFactor', 'A_VALUE', 'B_MIN', 'B_MAX', 'DEFAULT_CONST', 'MIN_YEARS', 'RATE_SCHEDULE']),
    wrap('CG', strip(read('capgain.mjs')), ['capitalGains', 'longTermRate', 'bracketOf', 'EXEMPT_PRICE', 'BASIC_DEDUCTION', 'SURCHARGE_UNTIL', 'SURCHARGE']),
    wrap('CC', strip(read('cartax.mjs')) + '\n' + strip(read('carcost.mjs')), ['carTax', 'carCost', 'depreciationRate', 'FUELS', 'DEFAULTS', 'CARCOST_ASOF']),
    wrap('AN', strip(read('annual.mjs')), ['annualDays', 'underOneYear', 'prorated', 'annualPay', 'annualByHire: byHire', 'annualByFiscal: byFiscal', 'annualToDate: toDate', 'annualMonths: monthsBetween', 'bumpYears', 'ANNUAL_BASE', 'ANNUAL_MAX', 'UNDER_ONE_MAX', 'ANNUAL_HOURS', 'DAY_HOURS', 'ANNUAL_ASOF', 'PRESCRIPTION']),
    wrap('FL', strip(read('freelance.mjs')), ['withholding', 'grossUp', 'freelanceYearly: yearly', 'FREE_TYPES: TYPES', 'BUSINESS_RATE', 'OTHER_RATE', 'OTHER_EXPENSE', 'OTHER_MIN', 'OTHER_SEPARATE', 'FREELANCE_ASOF']),
    wrap('NH', strip(read('nhis.mjs')), ['nhisEmployee: employee', 'nhisLocal: local', 'longTerm', 'propertyPoints', 'PROPERTY_TABLE', 'HEALTH_RATE', 'HALF_RATE', 'CARE_RATE', 'WAGE_MAX', 'WAGE_MIN', 'POINT_VALUE', 'LOCAL_MIN', 'LOCAL_MIN_INCOME', 'PROPERTY_DEDUCTION', 'NHIS_ASOF', 'NHIS_URL', 'HEALTH_PCT', 'HALF_PCT', 'CARE_PCT']),
    `window.Donpyo = Object.assign({ YEAR, RATES, NT: ${NT} }, F, T, L, K, A, G, Y, S, P, E, EI, NP, CG, CC, AN, FL, NH);`,
  ];
  return `/* 돈표 계산 엔진 — 브라우저용, 빌드 때 engine/*.mjs 에서 생성 */\n(function(){\n${parts.join('\n')}\n})();\n`;
}
