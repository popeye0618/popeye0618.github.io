---
slug: harucut
title: Harucut
periods:
  - label: Harucut
    start: '2025-11'
    status: ongoing
summary: 네 컷 이미지 서비스의 업로드·합성·작업 복구를 개발하고 있습니다
order: 3
role: 백엔드 개발 · 작업 처리 구조 개선
team: 프론트엔드 1명 · 백엔드 1명
kind: 이미지 합성 · 안정성 개선
theme: photo
technologies: [Spring Boot, AWS Lambda, SQS, MySQL, Redis]
repository: https://github.com/popeye0618/Harucut
highlight: 이미지 업로드부터 합성 결과·작업 복구까지
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
    context: 개선 전 pool20은 약 10초 · 소형 이미지 30건 비교
    source: 측정 기록 2026-08-23
---

## 네 장의 사진을 하나의 기록으로

Harucut은 사진 네 장과 프레임을 선택해 네 컷 이미지를 만드는 서비스입니다. 원본 업로드, 프레임과 배경색 선택, 합성, 갤러리 조회와 결과 다운로드까지 하나의 흐름으로 연결합니다.

프론트엔드 1명과 백엔드 1명으로 개발하며, 저는 백엔드를 담당하고 있습니다. 현재 운영을 준비 중입니다.

[Harucut 서비스 방문 ↗](https://harucut.com)

## 이미지 합성 요청이 끝나는 시점

이미지 합성은 원본과 프레임을 읽고 결과 파일을 저장할 때까지 시간이 걸립니다. 요청을 받은 뒤에도 작업이 진행되므로, 사용자가 보낸 요청과 최종 결과를 연결해 관리할 필요가 있었습니다. 요청 접수, Lambda의 합성 작업, 결과 반영을 나누고 작업 상태를 DB에 저장하도록 구조를 변경했습니다.

## 서비스 아키텍처

<figure class="architecture-figure">
  <a href="/diagrams/harucut.svg" aria-label="Harucut 아키텍처 원본 보기"><img src="/diagrams/harucut.svg" alt="클라이언트가 S3에 원본을 업로드하고 API가 MySQL에 작업을 저장한 뒤 Lambda를 호출하며 SQS 결과를 소비해 상태를 갱신하고 정체 작업은 스케줄러로 복구하는 구조" loading="lazy" width="1500" height="1150" /></a>
  <figcaption>이미지 파일은 S3, 작업 상태는 MySQL에 저장합니다. SQS 결과는 백엔드가 직접 가져와 처리합니다.</figcaption>
</figure>

### 업로드부터 결과 확인까지

1. 백엔드가 발급한 Presigned URL로 브라우저에서 S3에 원본을 직접 업로드합니다.
2. 합성 요청에서는 원본의 소유권과 프레임을 검증하고 MySQL에 작업을 저장합니다.
3. 트랜잭션 커밋 후 작업을 선점하고 Lambda를 비동기로 호출합니다.
4. Lambda는 원본과 프레임을 읽어 결과 이미지와 썸네일을 S3에 저장합니다.
5. Lambda 실행 결과가 SQS로 전달되면 백엔드가 작업 상태와 미디어 정보를 갱신합니다.
6. 브라우저는 자신의 작업 상태를 조회하고 완료된 결과를 확인합니다.

파일은 브라우저에서 S3로 직접 보내고, 합성은 Lambda에서 처리합니다. 백엔드는 요청을 접수했는지와 합성이 완료됐는지를 작업 상태로 관리합니다.

- [S3 직접 업로드 · PR #10](https://github.com/popeye0618/Harucut/pull/10)
- [갤러리·이미지 합성 · PR #13](https://github.com/popeye0618/Harucut/pull/13)

## 요청과 완료를 분리한 구조

Lambda를 `InvocationType.EVENT`로 호출하고 실행 결과를 SQS로 받아 작업 상태에 반영했습니다. 백엔드가 재시작되거나 호출에 실패한 뒤에도 작업을 찾을 수 있도록, 작업 기록을 먼저 저장하고 처리 권한을 얻은 뒤 실행하는 흐름을 만들었습니다.

- [비동기 전환 구현 · PR #21](https://github.com/popeye0618/Harucut/pull/21)

### 작업을 저장한 뒤 실행하기

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

이 실험에서는 개선 후 30건이 모두 완료됐습니다. 다만 가장 늦게 끝난 작업은 약 53초가 걸렸고, 접수 p95도 1,446ms에서 1,520ms로 늘었습니다. 완료된 작업 수와 사용자의 대기 시간을 함께 두고 결과를 확인했습니다.

## 결과의 범위와 한계

기존 구조의 pool2 조건에서는 30건 모두 완료됐고, pool20에서는 9건이 실패했습니다. 동시 처리 조건에 따른 차이를 확인하고, pool20을 기준으로 구조 변경 전후를 비교했습니다.

이번 비교는 소형 이미지 30건을 대상으로 진행했습니다. 큰 이미지, 장시간 부하, 중복 결과 전달은 추가로 검증할 항목입니다.

- [측정 환경과 해석](https://github.com/popeye0618/Harucut/blob/main/docs/measurement-2026-08-23.md)
- [개선 전 원본 결과](https://github.com/popeye0618/Harucut/blob/main/monitoring/loadtest/results/before-pool20.json)
- [개선 후 원본 결과](https://github.com/popeye0618/Harucut/blob/main/monitoring/loadtest/results/after.json)

## 다음에 확인할 작업

추가로 확인할 항목은 큰 이미지와 장시간 부하에서의 처리, 결과 처리 도중 장애가 발생했을 때의 재전달과 복구입니다. 이때도 요청 접수 시간, 완료·실패 건수, 가장 늦은 작업의 완료 시간을 함께 살펴볼 필요가 있습니다.

[30건의 합성 요청을 비교한 기록](/blog/harucut-job-completion/)에 비교 조건과 결과를 정리했습니다.
