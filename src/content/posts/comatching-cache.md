---
slug: comatching-participant-cache
title: 참가자 수 조회에 10초 캐시를 적용하고 부하를 높여봤다
description: Comatching5 참가자 수 조회에 Caffeine 캐시를 적용하고, 목표 부하와 실제 처리량을 나눠 확인한 기록입니다.
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

## 같은 참가자 수를 반복해서 조회했다

Comatching5는 참가자 수를 조회할 때 같은 집계 작업을 반복하고 있었습니다. 이 결과를 재사용하도록 Caffeine 캐시를 적용했습니다. 실험은 단일 인스턴스에서 진행했고 TTL은 10초로 설정했습니다.

참가자가 늘거나 줄어도 캐시가 만료되기 전까지는 이전 수치가 보일 수 있습니다. 이번 구현에서는 참가자 수가 최대 10초 늦게 반영될 수 있는 조건으로 반복 조회 비용을 줄였습니다.

## 목표 200 RPS에서 실제로 처리한 요청은 달랐다

사용자 10만 건을 넣고, 같은 EC2·RDS 환경에 별도 Windows JMeter 부하 발생기로 요청을 보냈습니다. 참가자 수 조회의 처리량 한계는 캐시 적용 전 약 60 RPS, 적용 후 약 330 RPS였습니다.

목표를 200 RPS로 설정한 실험의 p95는 개선 전 2,057ms, 개선 후 37ms였습니다. 이 수치를 해석하려면 실제 처리량도 확인해야 합니다. 개선 전에는 목표를 따라가지 못해 약 60 RPS를 처리했고, 개선 후에는 약 200 RPS를 처리했습니다.

| 목표 부하 | 캐시 적용 | 실제 처리량 | p95     |
| --------- | --------- | ----------- | ------- |
| 200 RPS   | 전        | 약 60 RPS   | 2,057ms |
| 200 RPS   | 후        | 약 200 RPS  | 37ms    |
| 400 RPS   | 후        | 약 331 RPS  | 592ms   |

두 실험은 부하 발생기에 설정한 목표가 같지만, 서버가 달성한 처리량은 다릅니다. 따라서 같은 처리량에서 응답 시간만 줄어든 결과로 설명할 수는 없습니다.

## 400 RPS를 목표로 보내자 지연이 다시 커졌다

캐시 적용 후 목표를 400 RPS로 높였을 때는 실제 약 331 RPS, p95 592ms가 기록됐습니다. 처리량이 330 RPS 부근에 머무르는 동안 응답 시간은 다시 늘었습니다. 이 값을 그대로 운영 목표로 삼기보다는, 서비스에 필요한 응답 시간을 정하고 그보다 여유가 있는 부하를 확인해야 한다고 봤습니다.

참가자 수 조회는 집계 결과를 재사용할 수 있지만, 매칭 API는 후보 조회와 점수 계산·이력 저장을 수행합니다. 두 API의 부하 실험을 나누어 각각의 병목을 확인했습니다.

## 근거와 측정 범위

- [캐시 구현 PR #82](https://github.com/COMAtching/Comatching5_BE/pull/82)
- [부하 실험 PR #84](https://github.com/COMAtching/Comatching5_BE/pull/84)
- [실험 조건과 성능 기록](https://github.com/COMAtching/Comatching5_BE/blob/main/docs/perf-log.md)

이번 결과는 사용자 10만 건을 넣은 별도 부하 실험에서 얻었습니다. 운영 트래픽을 측정한 수치와는 구분합니다. 인스턴스 수나 데이터 규모를 바꿀 때는 캐시 적중률, DB 부하, 실제 처리량과 p95를 다시 확인할 필요가 있습니다.
