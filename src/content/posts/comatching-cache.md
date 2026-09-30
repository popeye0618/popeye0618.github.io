---
slug: comatching-participant-cache
title: 참가자 수 조회, 캐시로 줄인 반복 작업
description: Comatching5의 Caffeine 캐시 적용과 처리량 실험을 조건과 함께 읽어봅니다.
publishedAt: '2026-09-28'
updatedAt: '2026-09-30'
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

## 부하가 더 높아지면 어떻게 달라질까

목표 400 RPS 실험에서는 실제 약 331 RPS, p95 592ms가 기록됐습니다. 처리량은 330 RPS 부근에서 한계에 도달했고, 응답 지연도 다시 커졌습니다. 운영 부하를 정할 때는 이 한계점과 함께 서비스가 목표로 하는 응답 시간을 기준으로 여유 용량을 확보해야 합니다.

참가자 수 조회는 집계 결과를 재사용할 수 있지만, 매칭 API는 후보 조회와 점수 계산·이력 저장을 수행합니다. 두 API의 부하 실험을 나누어 각각의 병목을 확인했습니다.

## 근거와 측정 범위

- [캐시 구현 PR #82](https://github.com/COMAtching/Comatching5_BE/pull/82)
- [부하 실험 PR #84](https://github.com/COMAtching/Comatching5_BE/pull/84)
- [실험 조건과 성능 기록](https://github.com/COMAtching/Comatching5_BE/blob/main/docs/perf-log.md)

이번 결과는 사용자 10만 건을 넣은 별도 부하 실험에서 얻었습니다. 인스턴스 수나 데이터 규모가 달라지면 캐시 적중률과 DB 부하, 목표 부하에서의 p95도 함께 확인해야 합니다.
