---
slug: comatching-participant-cache
title: 참가자 수 조회, 캐시로 줄인 반복 작업
description: Comatching5의 Caffeine 캐시 적용과 처리량 실험을 조건과 함께 읽어봅니다.
publishedAt: '2026-09-28'
category: 운영·성능
tags: [Spring, Cache, Performance]
series: comatching-performance
seriesTitle: Comatching5 성능 개선 기록
seriesOrder: 1
relatedProjects: [comatching]
draft: false
---

## 반복 조회에 캐시를 적용하기

Comatching5의 참가자 수 조회에는 동일한 집계 결과를 반복해서 읽는 비용이 있었습니다. 이 조회에 Caffeine 캐시를 적용했고, 단일 인스턴스 환경에서 TTL을 10초로 설정했습니다.

캐시는 조회 비용을 줄이는 대신 최신성에 영향을 줍니다. 여기서는 매번 즉시 갱신된 값을 읽는 대신 캐시 유효기간 동안 이전 값을 제공하는 선택을 했습니다.

## 처리량과 지연 시간을 함께 보기

같은 EC2·RDS 환경, 별도 Windows JMeter 부하 발생기와 사용자 10만 건 시드 조건에서 처리량 한계는 약 60 RPS에서 약 330 RPS로 높아졌습니다.

목표 200 RPS 조건에서 p95는 개선 전 2,057ms, 개선 후 37ms였습니다. 다만 개선 전 실제 처리량은 약 60 RPS, 개선 후는 약 200 RPS였습니다. 동일하게 달성한 요청량에서 지연 시간만 비교한 실험은 아닙니다.

> 목표 부하와 실제 처리량을 함께 기록해야 합니다. 목표 요청을 모두 처리하지 못한 결과를 같은 부하의 지연 시간 비교로 해석하면 개선 효과를 잘못 설명할 수 있습니다.

## 운영 용량으로 바로 바꾸지 않기

약 330 RPS는 실험에서 관측한 처리량 한계입니다. 목표 400 RPS 실험에서는 실제 약 331 RPS, p95 592ms가 기록됐습니다. 이 수치를 그대로 응답 시간 목표가 보장되는 운영 용량이라고 표현하지 않습니다.

또한 참가자 수 조회의 캐시 적용 결과를 매칭 API 전체의 성능으로 확대해서는 안 됩니다. API마다 하는 일과 병목이 다르기 때문입니다.

## 근거와 측정 범위

- [캐시 구현 PR #82](https://github.com/COMAtching/Comatching5_BE/pull/82)
- [부하 실험 PR #84](https://github.com/COMAtching/Comatching5_BE/pull/84)
- [실험 조건과 성능 기록](https://github.com/COMAtching/Comatching5_BE/blob/main/docs/perf-log.md)

이 글은 저장소의 구현과 실험 기록을 정리한 글입니다. 축제 실사용 트래픽을 재현한 수치나 모든 배포 환경에서의 보장값은 아닙니다.
