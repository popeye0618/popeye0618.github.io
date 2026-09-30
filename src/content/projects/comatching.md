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
highlight: 5회 운영 · 회차당 1,000명 이용
metrics:
  - key: users
    label: 누적 이용자
    value: 5,000명
    context: 5회 운영의 회차별 합산 · 중복 이용 포함
    source: 운영자 추정치
  - key: revenue
    label: 누적 수익
    value: 1,200만 원
    context: 비용 차감 전 기준 · 회차당 200~300만 원
    source: 운영자 제공 수치
  - key: matches
    label: 누적 매칭
    value: 35,000건
    context: 회차당 7,000건 × 5회 운영
    source: 운영자 추정치
  - key: runs
    label: 축제 시즌 운영
    value: 5회
    context: 매 회차 일주일
    source: 운영자 추정치
---

## 축제의 만남을 서비스로

가톨릭대학교 축제 기간에 학생들이 서로 매칭할 수 있는 서비스를 만들었습니다. 축제 시즌마다 일주일씩 운영하면서 실제 이용자와 결제 흐름을 경험했고, 5회의 반복 운영으로 이어졌습니다.

이 경험은 이후 부천 FC의 경기일 관중을 위한 [외주 매칭 서비스](/projects/comatching-fc/)로 확장되었습니다.

[Comatching 서비스 방문 ↗](https://comatching.site)

기존에는 신청 정보를 모아 조건을 분류하고 상대를 연결하는 과정에 운영자의 손이 많이 필요했습니다. 가입부터 조건 입력, 포인트 충전, 매칭 결과 확인과 채팅까지 웹에서 이어지도록 만들었습니다.

### 이용자의 서비스 흐름

1. 카카오 로그인 후 나이, 학과, MBTI와 취미 등 프로필을 등록합니다.
2. 계좌이체 후 충전을 요청하면 운영자가 입금 내역을 확인하고 포인트를 지급합니다.
3. 원하는 상대의 조건을 선택하고 포인트를 사용해 매칭을 요청합니다.
4. 매칭 이력에서 결과를 확인하고 생성된 채팅방에서 대화를 시작합니다.

## 제가 맡은 역할

PM, 디자이너, 백엔드, 프론트엔드 각 1명으로 구성된 4인 팀에서 백엔드 개발과 팀장을 맡았습니다. 팀장으로서 회의를 이끌고 의견 차이를 조율했습니다.

서비스 백엔드 개발과 운영을 담당했습니다.

회원과 매칭 기능뿐 아니라 입금자 검색, 충전 요청 목록, 회원 조회와 참여 상태 관리 등 운영자가 실제로 사용하는 기능도 다뤘습니다. 사용자 화면과 운영 도구를 함께 개선하며 축제 기간의 요청에 대응했습니다.

- [Comatching3 백엔드 기여 PR](https://github.com/COMAtching/COMAtching3_BE/pulls?q=is%3Apr+author%3Apopeye0618)
- [서비스 소개](https://github.com/COMAtching/.github/blob/main/profile/README.md)

## 반복 운영으로 얻은 경험

기능을 만드는 것에서 끝나지 않고 이용과 매출이 발생하는 서비스를 반복 운영했습니다. 짧은 축제 기간에도 사용자가 가입하고 매칭하며 결제하는 전체 흐름이 이어지도록 팀과 협업했습니다.

## Comatching3 아키텍처

<figure class="architecture-figure">
  <a href="/diagrams/comatching.svg" aria-label="Comatching3 아키텍처 원본 보기"><img src="/diagrams/comatching.svg" alt="React 클라이언트가 EC2의 Spring Boot에 연결하고, 백엔드가 RDS MySQL과 Redis를 사용하며 RabbitMQ로 AI 매칭 서비스에 요청하는 구조" loading="lazy" width="760" height="620" /></a>
  <figcaption>AI 매칭을 사용했던 운영 당시 구성. 그림을 누르면 원본을 볼 수 있습니다.</figcaption>
</figure>

Spring Boot 백엔드가 인증, 포인트, 매칭 요청과 이력, 채팅과 관리자 기능을 담당했습니다. EC2에 백엔드·Redis·RabbitMQ를 두고 회원과 운영 데이터는 RDS의 MySQL에 저장했습니다.

AI 매칭 처리와 웹 서비스의 업무 처리를 분리했습니다. 백엔드는 사용자의 조건을 메시지로 구성해 RabbitMQ로 전달하고, 매칭 결과를 받아 상대 정보와 이력을 연결하는 역할을 맡았습니다. 프론트엔드는 백엔드 API를 통해 결과를 확인합니다.

### 포인트와 운영 데이터 관리

충전 요청을 접수하는 것과 실제 포인트를 지급하는 단계를 나눴습니다. 운영자는 입금 내역을 확인하고 충전을 처리하며, 사용자는 보유 포인트와 매칭 결과를 확인합니다. 입금자 검색과 목록 정렬을 개선해 반복적인 확인 작업을 지원했습니다.

- [입금자 검색 · PR #187](https://github.com/COMAtching/COMAtching3_BE/pull/187)
- [회원 검색 · PR #188](https://github.com/COMAtching/COMAtching3_BE/pull/188)
- [운영 당시 서비스 소개와 구성](https://github.com/COMAtching/COMAtching3_BE/blob/main/README.md)

## Comatching5

Comatching5에서는 운영 경험을 바탕으로 성능 문제를 측정하고 개선했습니다. 별도 부하 실험으로 처리량과 응답 시간을 비교했습니다.

### MSA로 나눈 서비스 책임

축제에서 운영한 Comatching5는 회원, 매칭, 아이템, 채팅, 알림을 서비스로 분리했습니다. API Gateway가 인증을 검증하고 요청을 각 서비스로 전달합니다. 매칭에 필요한 프로필 조회와 아이템 처리는 Feign을 사용한 HTTP 호출로 연결하고, 매칭 성공 이후 채팅방 생성은 Kafka 이벤트로 전달합니다.

<figure class="architecture-figure">
  <a href="/diagrams/comatching5.svg" aria-label="Comatching5 아키텍처 원본 보기"><img src="/diagrams/comatching5.svg" alt="Next.js와 Gateway 뒤에 회원 매칭 아이템 채팅 알림 서비스가 배치되고 Kafka가 후속 이벤트를 전달하는 MSA 구조" loading="lazy" width="760" height="810" /></a>
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

서비스 분리 이후에는 외부 호출 지연과 일부 단계의 실패도 다뤄야 했습니다. Feign 타임아웃과 Circuit Breaker를 적용하고, 정상 처리량뿐 아니라 실패가 발생하는 구간을 함께 점검했습니다.

- [Comatching5 전체 서비스 구성](https://github.com/COMAtching/Comatching5_BE/blob/main/settings.gradle)
- [배포 구성](https://github.com/COMAtching/Comatching5_BE/blob/main/docker-compose.prod.yml)
- [서비스 간 호출 보호 · PR #85](https://github.com/COMAtching/Comatching5_BE/pull/85)

### 참가자 수 조회에 캐시 적용

반복되는 참가자 수 조회에 Caffeine 캐시를 적용했습니다. 단일 인스턴스 환경에서 TTL은 10초로 설정했으며, 그만큼 수치가 늦게 갱신될 수 있다는 절충이 있습니다.

같은 EC2·RDS 환경과 별도 Windows JMeter 부하 발생기, 사용자 10만 건 시드 조건에서 참가자 수 조회의 처리량 한계가 60 RPS에서 330 RPS로 높아졌습니다. 목표 200 RPS 실험의 p95는 2,057ms에서 37ms로 줄었습니다. 개선 전 실제 처리량은 60 RPS로, 두 실험의 달성 부하에는 차이가 있었습니다.

처리량 한계 부근의 응답 시간도 확인했습니다. 목표 400 RPS에서는 실제 331 RPS, p95 592ms가 기록됐습니다.

- [캐시 구현 PR #82](https://github.com/COMAtching/Comatching5_BE/pull/82)
- [측정 PR #84](https://github.com/COMAtching/Comatching5_BE/pull/84)
- [성능 실험 기록](https://github.com/COMAtching/Comatching5_BE/blob/main/docs/perf-log.md)

### 후보 조회 SQL 601회에서 2회로

후보 조회 과정의 SQL 실행 횟수를 601회에서 2회로 줄였습니다. 사용자 10만 건, 반대 성별 5만 건 시드와 낮은 동시성 조건에서 SQL 소요 시간은 261.1ms에서 18.8ms로 줄었습니다.

측정 범위는 SQL 실행 구간이며, 당시 후보 표본은 5,000명이었습니다. 표본 크기는 조회 비용과 매칭 결과 품질에 영향을 주므로 함께 고려했습니다. 이후 코드에서는 표본을 2,000명으로 조정했습니다.

- [후보 조회 개선 PR #58](https://github.com/COMAtching/Comatching5_BE/pull/58)

### 실험 결과를 해석하는 기준

개선 결과에는 측정 환경과 달성 부하, 캐시 유효기간과 표본 크기를 함께 기록했습니다. 참가자 수 조회와 매칭 API를 구분해 측정했습니다. 매칭 API는 트랜잭션과 OSIV 관련 가설을 검토한 뒤, 남아 있는 처리량 병목을 추가로 분석했습니다.

트랜잭션과 OSIV 설정을 변경해도 매칭 API의 처리량 한계는 약 29 RPS에 머물렀습니다. 스레드 덤프에서는 요청 스레드 106개 중 78개가 커넥션을 기다렸고, 커넥션을 확보한 스레드는 쿼리를 실행 중이었습니다. 동시 부하에서 쿼리 지연이 커지는 현상을 확인하면서 애플리케이션 설정 외에 공유 RDS의 자원 제약까지 분석 범위를 넓혔습니다.

- [후속 병목 분석 PR #93](https://github.com/COMAtching/Comatching5_BE/pull/93)

## 다음 서비스로 이어진 결과

Comatching3의 성과는 부천 FC 외주로 이어졌습니다. 대학 축제와 경기장은 사용 맥락이 달랐기 때문에, 기존 경험을 바탕으로 인증과 응원 성향 설문을 경기일 서비스에 맞게 구성했습니다.
