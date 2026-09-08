# 돈표 (donpyo.com)

연봉 실수령액 · 월급 실수령액 · 실수령 역산 · 대출 상환 · 퇴직금(세후) · 알바 월급을 금액별 페이지로 미리 계산해 둔 **돈 계산 사전**. 사주첩(sajucheop.com)과 같은 정적 사이트 파이프라인: 엔진 → `tools/build.mjs`가 `dist/`에 페이지 생성 → GitHub Pages(Actions) 배포.

## 구조

- `engine/tax.mjs` — 4대보험 근로자 부담분 + 근로소득 간이세액(국세청 간이세액표 조회, 표 밖 구간은 별표 2 계산식)
- `engine/loan.mjs` — 원리금균등·원금균등·만기일시 상환표, 갈아타기, 상환액→원금 역산, DSR 한도
- `engine/retire.mjs` — 퇴직금, 퇴직소득세(근속연수공제·환산급여)
- `data/rates.mjs` — 연도별 4대보험 요율·최저임금·국민연금 인상 일정 (매년 갱신)
- `data/ganyi.json` — 근로소득 간이세액표 (소득세법 시행령 별표 2, 2024.2.29 개정) 월급여 천원 구간 × 공제대상가족 1~11명
- `engine/gift.mjs` — 증여세(10년 합산 공제·혼인 출산 공제·누진세율·세대생략 할증·신고세액공제) → `/gift-tax/`
- `engine/realty.mjs` — 복비(중개보수 상한요율·월세 환산·부가세) → `/bokbi/`, 주택 취득세(사잇값 세율·다주택 중과·교육세·농특세·생애최초 감면) → `/acquisition-tax/`
- `engine/inherit.mjs` — 상속세(일괄공제·배우자상속공제 법정지분·금융재산공제·신고세액공제) → `/inheritance-tax/{가족구성}/{금액}/`
- `engine/income.mjs` — 종합소득세(기본세율·기본공제·표준세액공제·3.3% 정산) → `/income-tax/`
- `engine/property.mjs` — 주택 재산세(공정시장가액비율·1주택 특례세율·도시지역분·교육세·7/9월 분납) → `/property-tax/`
- `engine/cartax.mjs` — 자동차세(cc당 세액·차령 경감·연납 공제율 연도표·전기차 정액) → `/car-tax/`
- `engine/ltv.mjs` — LTV 한도(규제지역 40%·비규제 70%·생애최초·6억/4억/2억 한도, `LTV_ASOF` 표기) → `/ltv/`
- `engine/deposit.mjs` — 예금 이자(단리·월복리·월 이자 지급식) → `/deposit/`
- `engine/yearend.mjs` — 연말정산 미리보기(근로소득공제·카드·세액공제·표준세액공제, `/yearend/`에서 브라우저 계산)
- `engine/subscription.mjs` — 청약 가점(무주택기간 32·부양가족 35·통장 가입기간 17, 84점 만점, 주택공급에 관한 규칙 별표 1) → `/subscription/{무주택 년}-{부양가족 수}/` 112장 + `/subscription/` 계산기
- `engine/parental.mjs` — 육아휴직 급여(2025 시행령: 일반 250/200/160만 상한·6+6 부모육아휴직제·한부모, 하한 70만) → `/parental-leave/{통상임금 만원}/`, 출산·양육 지원금(첫만남이용권·부모급여·아동수당·양육수당) → `/baby-benefit/`
- `engine/electric.mjs` — 주택용 전기요금 누진제(저압·고압, 기타계절·하계·동계 구간, 슈퍼유저, 기후환경·연료비조정, 부가세·전력산업기반기금 2.7%) → `/electric/{kWh}/`
- `tools/build.mjs` — 페이지 생성기 (`node tools/build.mjs`), `tools/test.mjs` — 엔진 검증
- `tools/bundle.mjs` — engine/*.mjs를 브라우저용 `dist/js/engine.js`로 묶음 (슬라이더·커플 링크·연말정산·임베드 위젯이 사용)
- `/embed/` — 블로그에 붙이는 iframe 위젯(`/embed/salary/`, `/embed/loan/`, 헤더·푸터·광고 없는 bare 셸)
- 홈 검색창 — `src/js/app.js`의 `parseSmart`가 "연봉 4200", "2억 30년 4.5%", "시급 12000 주20" 같은 입력을 페이지로 연결 (격자는 빌드가 `window.DONPYO_GRID`로 넣음)
- `src/` — CSS·JS·favicon (빌드 시 dist/로 복사)
- `design/` — 디자인 캔버스 작업 파일(.dc.html)

## 로컬

```
node tools/test.mjs
node tools/build.mjs
node server.js   # http://localhost:8326
```

## 갱신 주기

- 1월: 건강보험·장기요양 요율, 간이세액표 개정 여부, 국민연금 근로자 부담률(연금개혁 일정), 구직급여 상한액
- 7월: 국민연금 기준소득월액 상·하한, 다음 해 최저임금 확정 → 다음 해 페이지 선점
- 12월: 국세청 근로소득 연말정산 통계(engine/rank.mjs STAT), 2월: 통계청 임금근로일자리 소득(data/age-income.mjs)
- 수시: 한국은행 기준금리(전월세전환율 상한)
- 1월: 육아휴직 급여 상한(고용보험법 시행령), 부모급여·아동수당·첫만남이용권 금액(보건복지부), 한전 주택용 전기요금표·기후환경요금·연료비조정요금·전력산업기반기금 요율(분기별 확인), 청약 가점 규칙 개정 여부

## 갱신 자동화

매달 2일 09:00 KST에 클라우드 루틴(Claude)이 위 출처를 확인해, 확정된 변경이 있으면 `rates-YYYYMM` 브랜치에 데이터 파일을 고쳐 PR을 연다. 사람은 PR의 출처와 diff를 보고 **Merge**만 누르면 배포된다. 간이세액표 개정과 통계 자료(표 구조가 복잡)는 루틴이 보고만 하고 사람이 원본을 받아 반영한다. 루틴 관리: https://claude.ai/code/routines

## 계산 기준

- 실수령액 = 세전 월급 − 비과세 − (국민연금 + 건강보험 + 장기요양 + 고용보험 + 소득세 + 지방소득세)
- 소득세는 간이세액표(100% 기준)를 그대로 조회. 회사가 80%·120%를 선택했거나 상여가 있으면 달라진다.
- 대출 이자는 매달 잔액 × 연이율/12, 원 단위 반올림. 고정금리·거치 없음 가정.
