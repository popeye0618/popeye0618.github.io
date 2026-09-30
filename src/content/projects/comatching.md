---
slug: comatching
title: Comatching
summary: 대학 축제에서 시작해, 반복 운영으로 이어진 매칭 서비스
order: 1
periods:
  - label: Comatching
    start: '2024-07'
    end: '2025-03'
  - label: Comatching5
    start: '2026-01'
    end: '2026-09-20'
role: 백엔드 개발 · 팀장
kind: 대학 축제 · 실서비스
theme: matching
team: PM · 디자인 · 백엔드 · 프론트엔드 각 1명
technologies: [Java, Spring Boot, MySQL, Redis]
repository: https://github.com/COMAtching/COMAtching3_BE
highlight: 약 5회 운영 · 회차당 약 1,000명 이용
metrics:
  - key: users
    label: 누적 이용자
    value: 약 5,000명
    context: 약 5회 운영의 회차별 합산 약 5,000명. 중복 제거한 순이용자 수는 아닙니다.
    source: 운영자 추정치
  - key: revenue
    label: 누적 수익
    value: 1,200만 원
    context: 비용 차감 전 기준이며 순이익이 아닙니다. 회차당 매출은 200~300만 원입니다.
    source: 운영자 제공 수치
  - key: matches
    label: 누적 매칭
    value: 약 35,000건
    context: 회차당 약 7,000건 × 약 5회 운영의 합산 추정치입니다.
    source: 운영자 추정치
  - key: runs
    label: 축제 시즌 운영
    value: 약 5회
    context: 매 회차 약 일주일
    source: 운영자 추정치
---

## 축제의 만남을 서비스로

가톨릭대학교 축제 기간에 학생들이 서로 매칭할 수 있는 서비스를 만들었습니다. 축제 시즌마다 약 일주일씩 운영하면서 실제 이용자와 결제 흐름을 경험했고, 약 5회의 반복 운영으로 이어졌습니다.

이 경험은 이후 부천 FC의 경기일 관중을 위한 [외주 매칭 서비스](/projects/comatching-fc/)로 확장되었습니다.

## 제가 맡은 역할

PM, 디자이너, 백엔드, 프론트엔드 각 1명으로 구성된 4인 팀에서 백엔드 개발과 팀장을 맡았습니다. PM은 별도 구성원이었으며, 팀장으로서 회의를 이끌고 의견 차이를 조율하는 역할을 했습니다.

서비스 백엔드 개발과 운영을 담당했습니다. 결제 운영은 계좌이체 후 포인트를 충전하는 방식이었으며, 준비했던 Toss PG 연동을 실제 운영 결제로 소개하지 않습니다.

- [Comatching3 백엔드 기여 PR](https://github.com/COMAtching/COMAtching3_BE/pulls?q=is%3Apr+author%3Apopeye0618)
- [서비스 소개](https://github.com/COMAtching/.github/blob/main/profile/README.md)

## 반복 운영으로 얻은 경험

기능을 만드는 것에서 끝나지 않고 이용과 매출이 발생하는 서비스를 반복 운영했습니다. 짧은 축제 기간에도 사용자가 가입하고 매칭하며 결제하는 전체 흐름이 이어지도록 팀과 협업했습니다.

상단 운영 수치는 운영 경험에 대한 추정치입니다. 회차별 이용자를 더한 값은 중복 제거한 순이용자 수와 다르며, 매출은 비용을 뺀 순이익이 아닙니다.

## Comatching5

Comatching5에서는 운영 경험을 바탕으로 성능 문제를 측정하고 개선했습니다. 아래 수치는 실제 축제 이용량이 아닌 별도 부하 실험 결과입니다.

### 참가자 수 조회에 캐시 적용

반복되는 참가자 수 조회에 Caffeine 캐시를 적용했습니다. 단일 인스턴스 환경에서 TTL은 10초로 설정했으며, 그만큼 수치가 늦게 갱신될 수 있다는 절충이 있습니다.

같은 EC2·RDS 환경과 별도 Windows JMeter 부하 발생기, 사용자 10만 건 시드 조건에서 참가자 수 조회의 처리량 한계가 약 60 RPS에서 약 330 RPS로 높아졌습니다. 목표 200 RPS 실험의 p95는 개선 전 2,057ms, 개선 후 37ms였지만, 개선 전 실제 처리량은 약 60 RPS였으므로 동일 달성 부하에서의 비교는 아닙니다.

약 330 RPS는 관측한 처리량 한계이며 응답 시간 목표를 보장하는 운영 용량은 아닙니다. 목표 400 RPS에서는 실제 약 331 RPS, p95 592ms가 기록됐습니다.

- [캐시 구현 PR #82](https://github.com/COMAtching/Comatching5_BE/pull/82)
- [측정 PR #84](https://github.com/COMAtching/Comatching5_BE/pull/84)
- [성능 실험 기록](https://github.com/COMAtching/Comatching5_BE/blob/main/docs/perf-log.md)

### 후보 조회 SQL 601회에서 2회로

후보 조회 과정의 SQL 실행 횟수를 601회에서 2회로 줄였습니다. 사용자 10만 건, 반대 성별 5만 건 시드와 낮은 동시성 조건에서 SQL 소요 시간은 261.1ms에서 18.8ms로 줄었습니다.

이는 SQL 구간의 측정값으로, 전체 API가 같은 비율로 빨라졌다는 뜻은 아닙니다. 후보 5,000명을 표본으로 조회한 변경은 전체 후보 탐색과 결과 품질이 달라질 수 있습니다. 이후 표본 2,000명으로 변경된 코드와도 구분해야 합니다.

- [후보 조회 개선 PR #58](https://github.com/COMAtching/Comatching5_BE/pull/58)

### 실험 결과를 해석하는 기준

개선 결과에는 측정 환경과 달성 부하, 캐시 유효기간과 표본 크기를 함께 기록했습니다. 참가자 수 조회의 개선을 매칭 API 전체의 처리량으로 확대하지 않습니다. 트랜잭션과 OSIV 가설만으로 매칭 처리량 제한이 해결되지는 않았고, 이후 병목을 다시 분석했습니다.

- [후속 병목 분석 PR #93](https://github.com/COMAtching/Comatching5_BE/pull/93)

## 다음 서비스로 이어진 결과

Comatching3의 성과는 부천 FC 외주로 이어졌습니다. 대학 축제와 경기장은 사용 맥락이 달랐기 때문에, 기존 경험을 바탕으로 인증과 응원 성향 설문을 경기일 서비스에 맞게 구성했습니다.
