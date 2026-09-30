---
slug: harucut
title: Harucut
periods:
  - label: Harucut
    start: '2025-11'
    status: ongoing
summary: 이미지 합성 작업이 실패해도 다시 이어갈 수 있도록
order: 3
role: 백엔드 개발 · 작업 처리 구조 개선
kind: 이미지 합성 · 안정성 개선
theme: photo
technologies: [Spring Boot, AWS Lambda, SQS, MySQL, Redis]
repository: https://github.com/popeye0618/Harucut
highlight: 비교 실험 30건 중 실패 9건 → 0건
metrics:
  - key: errors
    label: 비교 실험의 실패 건수
    value: 9건 → 0건
    context: 30건 요청, 개선 전 pool20 조건과 비교
    source: 저장된 부하 실험 결과
  - key: completed
    label: 개선 후 완료 건수
    value: 30 / 30건
    context: 소형 이미지 · Lambda 동시성 10의 제한된 실험
    source: after.json
  - key: tradeoff
    label: 최대 완료 시간
    value: 약 53초
    context: 비교 대상은 약 10초. 완료 신뢰성을 높이는 대신 대기 시간이 증가
    source: 측정 기록 2026-08-23
---

## 오래 걸리는 작업을 끝까지 처리하기

이미지 합성 요청은 일반 조회보다 오래 걸리고 외부 처리 결과를 기다려야 합니다. Harucut에서는 요청을 받는 단계와 실제 합성 작업, 결과 반영을 분리하고 작업 상태를 영속화하는 방향으로 처리 구조를 개선했습니다.

## 요청과 완료를 분리한 구조

Lambda 호출에 `InvocationType.EVENT`를 사용하고, SQS를 통해 결과를 받아 작업 상태에 반영하도록 구성했습니다. 작업 상태 저장, 처리 권한 획득과 재실행 흐름을 두어 작업을 추적하고 복구할 수 있게 했습니다.

요청 접수와 합성 완료를 별도 상태로 관리하고, 작업 상태를 통해 최종 처리 결과를 확인하도록 구성했습니다.

- [비동기 전환 구현 · PR #21](https://github.com/popeye0618/Harucut/pull/21)

## 같은 요청 수로 비교한 결과

2 CPU·2GB 환경, MySQL 8·Redis 7, Java 21 Lambda 메모리 2,048MB·제한 시간 60초·동시성 10, 소형 이미지 조건의 비교 실험입니다.

| 항목           | 개선 전 pool20 | 개선 후 |
| -------------- | -------------- | ------- |
| 요청 수        | 30건           | 30건    |
| 완료           | 21건           | 30건    |
| 실패           | 9건            | 0건     |
| 최대 완료 시간 | 약 10초        | 약 53초 |
| 접수 p95       | 1,446ms        | 1,520ms |

개선 후에는 30건 모두 완료됐고 실패 건수는 9건에서 0건으로 줄었습니다. 최대 완료 시간은 10초에서 53초로, 접수 p95는 1,446ms에서 1,520ms로 늘었습니다. 작업 완료율을 높이는 과정에서 대기 시간이 증가한 결과입니다.

## 결과의 범위와 한계

기존 구조의 pool2 조건에서는 30건 모두 완료됐고, pool20에서는 9건이 실패했습니다. 동시 처리 조건에 따른 차이를 확인하고, pool20을 기준으로 구조 변경 전후를 비교했습니다.

이번 비교는 소형 이미지 30건을 대상으로 진행했습니다. 큰 이미지, 장시간 부하, 중복 결과 전달은 추가로 검증할 항목입니다.

- [측정 환경과 해석](https://github.com/popeye0618/Harucut/blob/main/docs/measurement-2026-08-23.md)
- [개선 전 원본 결과](https://github.com/popeye0618/Harucut/blob/main/monitoring/loadtest/results/before-pool20.json)
- [개선 후 원본 결과](https://github.com/popeye0618/Harucut/blob/main/monitoring/loadtest/results/after.json)

## 배운 점

처리 속도와 작업 완료의 신뢰성은 다른 지표입니다. 요청 접수 시간만 확인하지 않고 최종 완료와 실패, 대기 시간을 함께 측정해야 구조 변경의 효과를 설명할 수 있습니다.
