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
    end: '2026-09'
role: 백엔드 개발 · 팀장
kind: 대학 축제 · 실서비스
theme: matching
team: PM · 디자인 · 백엔드 · 프론트엔드 각 1명
technologies: [Java, Spring Boot, MySQL, Redis]
repository: https://github.com/COMAtching/COMAtching3_BE
highlight: 5회 운영 · 회차당 1,000명 이용
metrics:
  - key: users
    label: 누적 이용자
    value: 5,000명
    context: 5회 운영의 이용 인원 합산 · 같은 사람의 재이용 포함
  - key: revenue
    label: 누적 수익
    value: 1,200만 원
    context: 비용 차감 전 총액 · 회차당 200~300만 원
  - key: matches
    label: 누적 매칭
    value: 35,000건
    context: 회차당 7,000건 × 5회 운영
  - key: runs
    label: 축제 시즌 운영
    value: 5회
    context: 매 회차 일주일
---

## 축제의 만남을 서비스로

가톨릭대학교 축제에서 학생들이 만날 수 있는 매칭 서비스를 만들었습니다. 축제 시즌마다 일주일씩, 총 5회 운영했습니다. 회차별 이용 인원을 합하면 누적 이용자 5,000명이며 같은 사람의 중복 이용도 포함합니다. 누적 매칭은 35,000건, 누적 수익은 비용 차감 전 기준 1,200만 원입니다.

이 경험은 이후 부천 FC의 경기일 관중을 위한 [외주 매칭 서비스](/projects/comatching-fc/)로 확장되었습니다.

[Comatching 서비스 방문 ↗](https://comatching.site)

처음에는 신청 정보를 모으고, 조건을 분류하고, 상대를 연결하는 데 운영자의 손이 많이 필요했습니다. 이 과정을 웹으로 옮겨 가입부터 조건 입력, 포인트 충전, 매칭 결과 확인과 채팅까지 이어지도록 만들었습니다.

### 이용자의 서비스 흐름

1. 카카오 로그인 후 나이, 학과, MBTI와 취미 등 프로필을 등록합니다.
2. 계좌이체 후 충전을 요청하면 운영자가 입금 내역을 확인하고 포인트를 지급합니다.
3. 원하는 상대의 조건을 선택하고 포인트를 사용해 매칭을 요청합니다.
4. 매칭 이력에서 결과를 확인하고 생성된 채팅방에서 대화를 시작합니다.

## 제가 맡은 역할

PM, 디자이너, 백엔드, 프론트엔드 각 1명으로 구성된 4인 팀에서 백엔드 개발과 팀장을 맡았습니다. 백엔드를 개발하고 운영하면서 팀 회의를 이끌고 의견 차이를 조율했습니다.

회원과 매칭 기능을 개발하고, 입금자 검색·충전 요청 목록·회원 조회·참여 상태 관리처럼 운영에 필요한 기능도 만들었습니다. 축제 기간에는 사용자 요청에 대응하면서 운영자가 반복해서 확인하는 목록과 검색 기능을 개선했습니다.

- [Comatching3 백엔드 기여 PR](https://github.com/COMAtching/COMAtching3_BE/pulls?q=is%3Apr+author%3Apopeye0618)
- [서비스 소개](https://github.com/COMAtching/.github/blob/main/profile/README.md)

## 축제 기간에 함께 맡았던 운영

축제 시즌마다 서비스를 다시 열며 회원 가입과 매칭, 입금 확인·포인트 충전·참여 상태 관리에 필요한 기능을 개발했습니다. 5회의 운영에서 사용자 기능과 운영자가 사용하는 도구를 함께 다뤘습니다.

## Comatching3 아키텍처

<figure class="architecture-figure">
  <a href="/diagrams/comatching.svg" aria-label="Comatching3 아키텍처 원본 보기"><img src="/diagrams/comatching.svg" alt="Nginx가 두 Spring Boot 인스턴스에 요청을 분산하고 운영 및 테스트용 MySQL과 Redis 컨테이너, React, RabbitMQ 및 AI 처리 서비스를 Jenkins로 배포하는 구조" loading="lazy" width="1440" height="1150" /></a>
  <figcaption>AI 매칭을 사용했던 운영 당시 구성. 그림을 누르면 원본을 볼 수 있습니다.</figcaption>
</figure>

Spring Boot 백엔드가 인증, 포인트, 매칭 요청과 이력, 채팅과 관리자 기능을 담당했습니다. Ubuntu 서버에서 Docker 컨테이너로 서비스를 구성했습니다. Nginx와 Certbot으로 HTTPS 진입점을 구성하고 두 Spring Boot 인스턴스로 요청을 분산했습니다. 운영·테스트 환경의 MySQL과 Redis 컨테이너를 분리하고, React 프론트엔드와 RabbitMQ·AI 처리 영역을 함께 배포했습니다.

AI 매칭 처리와 웹 서비스의 업무 처리를 분리했습니다. 백엔드는 사용자의 조건을 메시지로 구성해 RabbitMQ로 전달하고, 매칭 결과를 받아 상대 정보와 이력을 연결하는 역할을 맡았습니다. 프론트엔드는 백엔드 API를 통해 결과를 확인합니다.

Git 저장소의 webhook으로 Jenkins를 실행해 백엔드, 프론트엔드와 매칭 처리 영역을 배포했습니다. 매칭 영역은 사용자 데이터 처리와 매칭 요청을 각각 RPC 큐로 나누고, FastAPI와 AI 처리 모듈이 CSV 후보 데이터를 활용하는 구조였습니다.

### 포인트와 운영 데이터 관리

충전 요청을 접수하는 것과 실제 포인트를 지급하는 단계를 나눴습니다. 운영자는 입금 내역을 확인하고 충전을 처리하며, 사용자는 보유 포인트와 매칭 결과를 확인합니다. 입금자 검색과 목록 정렬을 개선해 반복적인 확인 작업을 지원했습니다.

- [입금자 검색 · PR #187](https://github.com/COMAtching/COMAtching3_BE/pull/187)
- [회원 검색 · PR #188](https://github.com/COMAtching/COMAtching3_BE/pull/188)
- [운영 당시 서비스 소개와 구성](https://github.com/COMAtching/COMAtching3_BE/blob/main/README.md)

## Comatching5

Comatching5에서는 서비스별 책임을 나누고, 반복 조회와 매칭 후보 조회의 비용을 살펴봤습니다. 개선 결과는 운영 이용량과 구분해 별도 부하 실험의 처리량과 응답 시간으로 확인했습니다.

### 회원·매칭·아이템·채팅·알림 분리

축제에서 운영한 Comatching5는 회원, 매칭, 아이템, 채팅, 알림을 서비스로 분리했습니다. API Gateway가 인증을 검증하고 요청을 각 서비스로 전달합니다. 매칭에 필요한 프로필 조회와 아이템 처리는 Feign을 사용한 HTTP 호출로 연결하고, 매칭 성공 이후 채팅방 생성은 Kafka 이벤트로 전달합니다.

<figure class="architecture-figure">
  <a href="/diagrams/comatching5.svg" aria-label="Comatching5 아키텍처 원본 보기"><img src="/diagrams/comatching5.svg" alt="Next.js와 Gateway 뒤에 회원 매칭 아이템 채팅 알림 서비스가 배치되고 Kafka가 후속 이벤트를 전달하는 MSA 구조" loading="lazy" width="1500" height="1180" /></a>
  <figcaption>서비스의 책임과 주요 통신 경로. 데이터 저장소는 용도에 따라 MySQL·MongoDB·Redis를 사용합니다.</figcaption>
</figure>

| 구성         | 담당하는 일                                                           |
| ------------ | --------------------------------------------------------------------- |
| User         | 회원과 프로필 조회·관리                                               |
| Matching     | 조건에 맞는 후보 조회, 매칭 판단과 이력 저장                          |
| Item         | 매칭에 사용하는 아이템 차감과 실패 시 복구                            |
| Chat         | Kafka 매칭 성공 이벤트를 받아 채팅방 생성, MongoDB에 채팅 데이터 저장 |
| Notification | 채팅 알림 이벤트 처리와 FCM 알림                                      |

채팅 전달에는 Redis Pub/Sub를 사용합니다. 관계형 데이터는 MySQL에 저장하며, 부하 실험에서는 여러 서비스가 하나의 RDS 인스턴스를 공유하는 환경을 사용했습니다.

### 중복 요청과 실패 처리

매칭 요청에는 회원 단위 분산 락을 적용했습니다. 프로필과 매칭 조건을 확인하고 아이템을 사용한 뒤 후보를 처리합니다. 매칭에 실패하면 사용한 아이템을 복구하고, 동일한 매칭 쌍의 저장 충돌에는 제한된 재시도를 적용합니다.

서비스를 분리하면서 다른 서비스의 응답이 늦거나 일부 단계만 실패하는 경우를 다뤄야 했습니다. Feign 타임아웃과 Circuit Breaker를 적용하고, 요청이 어느 단계에서 실패하는지 확인했습니다.

- [Comatching5 전체 서비스 구성](https://github.com/COMAtching/Comatching5_BE/blob/main/settings.gradle)
- [배포 구성](https://github.com/COMAtching/Comatching5_BE/blob/main/docker-compose.prod.yml)
- [서비스 간 호출 보호 · PR #85](https://github.com/COMAtching/Comatching5_BE/pull/85)

### 참가자 수 조회에 캐시 적용

반복되는 참가자 수 조회에 Caffeine 캐시를 적용했습니다. 단일 인스턴스 환경에서 TTL은 10초로 설정했으며, 그만큼 수치가 늦게 갱신될 수 있다는 절충이 있습니다.

같은 EC2·RDS 환경과 별도 Windows JMeter 부하 발생기, 사용자 10만 건 시드 조건에서 참가자 수 조회의 처리량 한계가 60 RPS에서 330 RPS로 높아졌습니다. 목표 200 RPS 실험의 p95는 2,057ms에서 37ms로 줄었습니다. 개선 전 실제 처리량은 60 RPS로, 두 실험의 달성 부하에는 차이가 있었습니다.

부하를 더 높인 목표 400 RPS 실험에서는 실제 331 RPS, p95 592ms가 기록됐습니다. 캐시 적용 후에도 330 RPS 부근에서는 처리량이 더 늘지 않고 응답 지연이 커졌습니다.

[참가자 수 조회의 캐시 적용과 부하 실험](/blog/comatching-participant-cache/)에 조건별 결과를 정리했습니다.

- [캐시 구현 PR #82](https://github.com/COMAtching/Comatching5_BE/pull/82)
- [측정 PR #84](https://github.com/COMAtching/Comatching5_BE/pull/84)
- [성능 실험 기록](https://github.com/COMAtching/Comatching5_BE/blob/main/docs/perf-log.md)

### 후보 조회 SQL 601회에서 2회로

후보 조회 벤치마크의 정상 경로에서 SQL 실행 횟수를 601회에서 2회로 줄였습니다. 사용자 10만 건, 반대 성별 5만 건 시드와 낮은 동시성 조건에서 SQL 소요 시간은 261.1ms에서 18.8ms로 줄었습니다.

이 수치는 API 전체가 아닌 SQL 실행 구간을 측정한 결과이며, 당시 표본은 5,000명이었습니다. 표본을 줄이면 조회 비용과 높은 점수의 후보를 포함할 가능성이 함께 달라지므로 두 조건을 비교했습니다. 이후 코드에서는 표본을 2,000명으로 조정했고, 첫 표본이 비면 다시 조회하는 경로를 추가했습니다. 재조회가 발생하면 SQL 횟수도 늘어납니다.

[후보 조회 SQL과 실행 계획을 바꾼 과정](/blog/comatching-candidate-query/)에 조회 횟수, 표본 크기와 인덱스를 각각 검토한 내용을 남겼습니다.

- [후보 조회 개선 PR #58](https://github.com/COMAtching/Comatching5_BE/pull/58)

### 매칭 API에 남아 있던 병목

참가자 수 조회와 매칭 API는 하는 일이 달라 별도로 측정했습니다. 매칭 API에서는 트랜잭션과 OSIV 설정이 병목의 원인인지 확인한 뒤, 설정을 바꿔도 처리량이 늘지 않는 이유를 더 살펴봤습니다.

EC2와 여러 서비스가 공유하는 RDS 환경에서는 트랜잭션과 OSIV 설정을 변경해도 매칭 API의 처리량 한계가 약 29 RPS에 머물렀습니다. 스레드 덤프에서는 요청 스레드 106개 중 78개가 커넥션을 기다렸고, 커넥션을 확보한 스레드는 쿼리를 실행 중이었습니다. 동시 부하에서 쿼리 지연이 커지는 현상을 확인하면서 애플리케이션 설정 외에 공유 RDS의 자원 제약까지 분석 범위를 넓혔습니다.

- [후속 병목 분석 PR #93](https://github.com/COMAtching/Comatching5_BE/pull/93)

## 부천 FC 외주로 이어진 운영 경험

Comatching3의 운영 성과를 바탕으로 부천 FC의 외주를 맡았습니다. 경기장에서는 티켓으로 입장한 관중이 서비스를 이용하므로 인증 방식부터 다시 살펴봤습니다. QR·예매번호 인증과 응원 성향 설문을 개발한 과정은 [COMAtching FC](/projects/comatching-fc/)에 정리했습니다.
