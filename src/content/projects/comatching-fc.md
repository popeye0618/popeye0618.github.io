---
slug: comatching-fc
title: COMAtching FC
summary: 부천 FC 경기장에서 응원 성향으로 관중을 연결한 외주 서비스
order: 2
role: 백엔드 개발
kind: 부천 FC · 외주 · 실서비스
theme: football
technologies: [Java, Spring Boot, Redis, RabbitMQ, MySQL, Spring Batch]
repository: https://github.com/COMAtching/COMAtching_FC_BE
highlight: 축제 서비스의 성과에서 구단 외주로
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

Comatching3의 실제 운영 성과를 바탕으로 부천 FC의 외주를 받아, 경기일 관중들이 응원 성향에 따라 매칭되는 서비스를 개발하고 실서비스했습니다. 서비스 이용자 수는 별도 확인되지 않아 관중 수로 대체하지 않습니다.

## 경기장 사용 흐름에 맞춘 인증

### 문제와 판단

관중이 경기장에서 서비스를 이용하는 흐름에 맞춰 소셜 로그인에서 QR 기반 로그인으로 인증 방식을 변경했습니다. 티켓 번호로 기존 회원을 찾고, 신규 회원에게는 별도 인증 서비스의 예매번호 검증을 요청하도록 구성했습니다.

### 구현과 검증

기존 회원이 다시 로그인할 때는 예매번호 검증 요청을 생략하도록 변경했습니다. 사용자와 관리자 인증을 분리하고 쿠키 기반 토큰 처리와 갱신 검증을 추가했습니다. 구현 사실은 아래 병합 PR에서 확인할 수 있습니다. 지연 시간이나 처리량의 개선율은 별도로 측정하지 않았습니다.

- [QR 로그인으로 변경 · PR #10](https://github.com/COMAtching/COMAtching_FC_BE/pull/10)
- [사용자·관리자 인증 분리 · PR #19](https://github.com/COMAtching/COMAtching_FC_BE/pull/19)
- [기존 회원의 검증 호출 생략 · PR #32](https://github.com/COMAtching/COMAtching_FC_BE/pull/32)

## 응원 성향 설문과 결과 제공

열정형, 집중형, 축린이형, 축잘알형, 먹방형, 인싸형의 6가지 성향 점수를 저장하고 같은 성향의 선수 정보를 제공했습니다. 사용자 정보 수정·비활성화, 관리자 재활성화와 설문 질문 등록 등 운영 기능도 구현했습니다.

설문 조회에는 Redis 캐시를 적용하고, 질문 저장 시 캐시를 무효화하도록 구성했습니다. 반복 조회 비용을 줄이는 구조와 수정 내용의 반영을 함께 고려한 구현입니다.

- [설문·캐시·사용자 운영 기능 · PR #11](https://github.com/COMAtching/COMAtching_FC_BE/pull/11)
- [성향 결과 제공 · PR #19](https://github.com/COMAtching/COMAtching_FC_BE/pull/19)

## 매칭 연동과 데이터 정리

매칭 요청을 별도 처리 서비스로 전달하고 응답을 받아 이력을 저장하는 백엔드 흐름을 구성했습니다. RabbitMQ의 요청·응답 호출은 응답을 기다리는 방식이므로 브로커를 사용했다는 이유만으로 비동기 API라고 설명하지 않습니다. 매칭 모델 전체를 직접 개발한 것으로도 소개하지 않습니다.

데이터 정리에는 Spring Batch를 사용해 응원 성향, 사용자 특성, AI 정보, 매칭 이력, 사용자 순서로 삭제하는 Job을 구성했습니다. 확인한 코드에서 스케줄러는 주석 상태이므로 매일 자동 실행된 운영 배치로 표현하지 않습니다.

- [데이터 정리 배치 · PR #12](https://github.com/COMAtching/COMAtching_FC_BE/pull/12)
- [토큰 검증과 매칭 이력 정리 · PR #28](https://github.com/COMAtching/COMAtching_FC_BE/pull/28)

## 이 경험의 의미

직접 운영한 서비스의 성과가 외주로 이어졌고, 새로운 사용 환경에 맞춰 인증과 설문·관리 기능을 개발했습니다. 대학 축제와 FC 서비스는 운영 맥락과 지표가 다르므로, 대학 축제의 이용 실적이나 Comatching5의 성능 수치를 이 서비스의 성과로 옮기지 않습니다.
