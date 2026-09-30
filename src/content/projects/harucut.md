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
team: 프론트엔드 1명 · 백엔드 1명
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

## 네 장의 사진을 하나의 기록으로

Harucut은 사진 네 장과 프레임을 선택해 네 컷 이미지를 만드는 서비스입니다. 원본 업로드, 프레임과 배경색 선택, 합성, 갤러리 조회와 결과 다운로드까지 하나의 흐름으로 연결합니다.

프론트엔드 1명과 백엔드 1명으로 개발하며, 저는 백엔드를 담당하고 있습니다. 현재 운영을 준비 중입니다.

[Harucut 서비스 방문 ↗](https://harucut.com)

## 오래 걸리는 작업을 끝까지 처리하기

이미지 합성 요청은 일반 조회보다 오래 걸리고 외부 처리 결과를 기다려야 합니다. Harucut에서는 요청을 받는 단계와 실제 합성 작업, 결과 반영을 분리하고 작업 상태를 영속화하는 방향으로 처리 구조를 개선했습니다.

## 서비스 아키텍처

<figure class="architecture-figure">
  <a href="/diagrams/harucut.svg" aria-label="Harucut 아키텍처 원본 보기"><img src="/diagrams/harucut.svg" alt="클라이언트가 S3에 원본을 업로드하고 API가 MySQL에 작업을 저장한 뒤 Lambda를 호출하며 SQS 결과를 소비해 상태를 갱신하고 정체 작업은 스케줄러로 복구하는 구조" loading="lazy" width="1500" height="1150" /></a>
  <figcaption>이미지 파일은 S3, 작업 상태는 MySQL에 저장합니다. SQS 결과는 백엔드가 직접 가져와 처리합니다.</figcaption>
</figure>

<a href="/diagrams/harucut.drawio" download>편집 가능한 draw.io 원본 다운로드 ↓</a>

### 업로드부터 결과 확인까지

1. 백엔드가 발급한 Presigned URL로 브라우저에서 S3에 원본을 직접 업로드합니다.
2. 합성 요청에서는 원본의 소유권과 프레임을 검증하고 MySQL에 작업을 저장합니다.
3. 트랜잭션 커밋 후 작업을 선점하고 Lambda를 비동기로 호출합니다.
4. Lambda는 원본과 프레임을 읽어 결과 이미지와 썸네일을 S3에 저장합니다.
5. Lambda 실행 결과가 SQS로 전달되면 백엔드가 작업 상태와 미디어 정보를 갱신합니다.
6. 브라우저는 자신의 작업 상태를 조회하고 완료된 결과를 확인합니다.

이미지 전송과 합성을 API 요청 처리에서 분리하면서, 요청의 접수 여부와 최종 완료 여부를 각각 관리하도록 설계했습니다.

- [S3 직접 업로드 · PR #10](https://github.com/popeye0618/Harucut/pull/10)
- [갤러리·이미지 합성 · PR #13](https://github.com/popeye0618/Harucut/pull/13)

## 요청과 완료를 분리한 구조

Lambda 호출에 `InvocationType.EVENT`를 사용하고, SQS를 통해 결과를 받아 작업 상태에 반영하도록 구성했습니다. 작업 상태 저장, 처리 권한 획득과 재실행 흐름을 두어 작업을 추적하고 복구할 수 있게 했습니다.

요청 접수와 합성 완료를 별도 상태로 관리하고, 작업 상태를 통해 최종 처리 결과를 확인하도록 구성했습니다.

- [비동기 전환 구현 · PR #21](https://github.com/popeye0618/Harucut/pull/21)

### 커밋 이후에도 남는 작업 기록

Lambda를 호출하기 전에 작업을 `PENDING` 상태로 저장합니다. 커밋 직후 서버가 중단되거나 외부 호출에 실패하더라도 DB에 남은 작업을 다시 찾을 수 있습니다.

선점은 `PENDING`이면서 아직 시작되지 않았거나 일정 시간 이상 정체된 작업만 갱신하는 조건부 UPDATE로 처리합니다. 커밋 이후 이벤트에서 수행하는 선점에는 `REQUIRES_NEW`를 적용해 별도 트랜잭션으로 확정되도록 수정했습니다.

같은 사용자와 요청 키의 재요청은 기존 작업을 조회해 반환합니다. 작업 조회에는 소유자 조건을 포함하고, 이미 완료된 작업의 결과 통지는 상태를 확인해 다시 반영하지 않도록 했습니다.

- [영속 작업과 재실행 · PR #19](https://github.com/popeye0618/Harucut/pull/19)
- [선점 트랜잭션·소유권 검증 · PR #23](https://github.com/popeye0618/Harucut/pull/23)

### 결과 수신과 실패 복구

SQS 소비자는 전용 스레드에서 long polling으로 결과를 가져옵니다. DB 반영을 마친 후 메시지를 삭제하며, 처리 중 예외가 발생하면 메시지를 남겨 재전달을 받습니다.

Lambda의 실행 실패와 실행 기회를 얻지 못한 상황도 구분합니다. 재시도 소진은 실패 상태로 반영하고, 이벤트 만료나 실행 제한으로 처리되지 못한 작업은 `PENDING`을 유지해 복구 대상으로 둡니다. 기본 설정에서는 30초마다 확인해 10분 이상 정체된 작업을 다시 선점합니다.

외부 호출과 DB 저장은 하나의 트랜잭션으로 묶이지 않으므로 재실행 과정에서 Lambda가 중복 호출될 가능성은 남습니다. 작업 상태와 결과 키를 중심으로 후속 처리를 관리하고, 정체 시간은 Lambda 이벤트 수명을 고려해 설정했습니다.

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
