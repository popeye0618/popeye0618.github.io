---
slug: comatching-fc
title: COMAtching FC
periods:
  - label: COMAtching FC
    start: '2024-10'
    end: '2024-12'
summary: 부천 FC 경기장에서 응원 성향으로 관중을 연결한 외주 서비스
order: 2
role: 백엔드 개발
kind: 부천 FC · 외주 · 실서비스
theme: football
technologies: [Java, Spring Boot, Redis, RabbitMQ, MySQL, Spring Batch]
repository: https://github.com/COMAtching/COMAtching_FC_BE
highlight: 부천 FC 경기일 서비스 개발·운영
metrics:
  - key: delivery
    label: 서비스 운영
    value: 경기일 실서비스
    context: 부천 FC 관중을 위한 응원 성향 기반 매칭 서비스
    source: 개발자 운영 경험
  - key: traits
    label: 응원 성향
    value: 6가지 유형
    context: 설문 점수와 같은 성향 선수 정보를 제공
    source: 백엔드 코드 기준
  - key: authentication
    label: 경기장 인증 흐름
    value: QR · 예매번호
    context: 기존 회원은 재로그인 시 예매번호 검증 요청 생략
    source: PR #10 · #32
---

## 축제에서 경기장으로

Comatching3를 운영한 경험이 부천 FC의 외주로 이어졌습니다. 경기일 관중들이 응원 성향에 따라 서로 연결되는 서비스를 개발하고 실제 경기장에서 운영했습니다.

관중은 티켓을 인증하고 응원 성향 설문에 답한 뒤 매칭을 신청합니다. 저는 백엔드에서 사용자 인증, 설문과 성향 정보, 외부 매칭 서비스 연동, 운영 데이터 관리를 담당했습니다.

### 경기장에서의 이용 흐름

1. QR과 예매번호를 이용해 서비스를 시작합니다.
2. 신규 사용자는 예매번호 검증을 거쳐 회원 정보를 생성합니다.
3. 설문에 응답하고 자신의 응원 성향과 같은 성향의 선수 정보를 확인합니다.
4. 매칭을 요청하고 상대의 응원 성향과 프로필·연락 정보를 확인합니다.

## 서비스 아키텍처

<figure class="architecture-figure">
  <a href="/diagrams/comatching-fc.svg" aria-label="COMAtching FC 아키텍처 원본 보기"><img src="/diagrams/comatching-fc.svg" alt="React에서 Spring Boot API를 호출하고 MySQL에 정보를 저장하며 Redis로 설문을 캐시하고 RabbitMQ를 통해 예매번호 검증과 매칭 서비스에 연결하는 구조" loading="lazy" width="1440" height="890" /></a>
  <figcaption>백엔드 구현 기준의 논리 구성. 예매번호 검증과 매칭 처리는 메시지로 연동합니다.</figcaption>
</figure>

백엔드는 회원·설문·이력을 MySQL에 저장하고 반복 조회되는 설문을 Redis에 캐시합니다. 예매번호 검증과 매칭 처리는 RabbitMQ를 통해 별도 서비스와 연결했습니다. 두 연동 모두 요청을 보내고 응답을 받아 API의 다음 처리를 진행하는 흐름입니다.

## 경기장 사용 흐름에 맞춘 인증

### 소셜 로그인에서 QR·예매번호로

경기장에서 서비스를 시작하는 관중을 위해 소셜 로그인을 QR 기반 로그인으로 변경했습니다. 예매번호로 기존 회원을 찾고, 신규 회원이면 별도 인증 서비스에 예매번호 검증을 요청했습니다.

### 기존 회원의 재로그인과 관리자 인증

이미 검증을 마친 기존 회원은 다시 로그인할 때 예매번호 검증을 요청하지 않도록 변경했습니다. 사용자 인증과 관리자 인증을 분리하고, 쿠키로 전달하는 토큰의 처리와 갱신 검증도 구현했습니다.

- [QR 로그인으로 변경 · PR #10](https://github.com/COMAtching/COMAtching_FC_BE/pull/10)
- [사용자·관리자 인증 분리 · PR #19](https://github.com/COMAtching/COMAtching_FC_BE/pull/19)
- [기존 회원의 검증 호출 생략 · PR #32](https://github.com/COMAtching/COMAtching_FC_BE/pull/32)

## 응원 성향 설문과 결과 제공

열정형, 집중형, 축린이형, 축잘알형, 먹방형, 인싸형의 6가지 성향 점수를 저장하고 같은 성향의 선수 정보를 제공했습니다. 사용자 정보 수정·비활성화, 관리자 재활성화와 설문 질문 등록 등 운영 기능도 구현했습니다.

여러 관중이 같은 설문을 조회하므로 Redis에 질문을 캐시했습니다. 관리자가 질문을 저장하면 캐시를 무효화해 다음 조회에서 변경된 내용을 읽도록 했습니다.

- [설문·캐시·사용자 운영 기능 · PR #11](https://github.com/COMAtching/COMAtching_FC_BE/pull/11)
- [성향 결과 제공 · PR #19](https://github.com/COMAtching/COMAtching_FC_BE/pull/19)

## 매칭 연동과 데이터 정리

RabbitMQ를 통해 별도 매칭 처리 서비스에 요청을 전달하고, 응답을 받아 매칭 이력을 저장하는 백엔드 흐름을 구성했습니다.

요청 전에는 기존 매칭 이력과 후보 존재 여부를 확인합니다. 사용자 특성과 응원 성향을 전달해 상대를 받은 뒤, 상대의 식별자를 서비스 내부 회원 정보와 연결합니다. 이어서 후보 데이터에 상대 제외를 요청하고 신청자·상대의 매칭 상태와 이력을 저장합니다.

외부 서비스가 반환한 상대 식별자를 내부 회원 정보와 연결해 프로필과 연락 정보를 제공했습니다. 다음 요청에서는 같은 상대가 다시 선택되지 않도록 후보 데이터와 매칭 이력을 함께 관리했습니다.

데이터 정리에는 Spring Batch를 사용해 응원 성향, 사용자 특성, AI 정보, 매칭 이력, 사용자 순서로 삭제하는 Job을 구성했습니다.

- [데이터 정리 배치 · PR #12](https://github.com/COMAtching/COMAtching_FC_BE/pull/12)
- [토큰 검증과 매칭 이력 정리 · PR #28](https://github.com/COMAtching/COMAtching_FC_BE/pull/28)

## 경기장 서비스에서 맡았던 일

축제 서비스를 운영한 뒤 경기장 서비스를 맡으면서 인증과 설문, 운영 기능을 이용 환경에 맞게 다시 구성했습니다. 예매번호 검증과 매칭을 외부 서비스에 요청하고 그 결과를 내부 회원·이력 정보로 연결하는 백엔드 흐름을 개발했습니다.
