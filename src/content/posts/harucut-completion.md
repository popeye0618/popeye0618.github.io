---
slug: harucut-job-completion
title: 빠른 접수와 확실한 완료는 다른 지표다
description: Harucut 이미지 합성에서 요청 접수, 최종 완료, 실패 건수를 나눠 본 이유입니다.
publishedAt: '2026-09-28'
category: 프로젝트 기록
tags: [AWS, Lambda, SQS]
relatedProjects: [harucut]
draft: false
---

## 접수 응답 이후의 작업

이미지 합성을 비동기로 처리하면 요청을 받는 시점과 결과가 나오는 시점이 달라집니다. Harucut에서는 Lambda를 EVENT 방식으로 호출하고 SQS로 결과를 수신하며, 작업 상태를 저장해 처리와 복구를 추적하도록 구성했습니다.

사용자는 접수 응답을 받았더라도 실제 합성이 완료될 때까지 기다려야 합니다. 그래서 요청 응답 시간 외에도 최종 완료 수, 실패 수와 전체 완료 시간을 함께 살펴봤습니다.

## 실패는 줄었지만 기다리는 시간은 늘었다

소형 이미지 30건 실험에서 개선 전 pool20 조건은 21건 완료·9건 실패, 개선 후는 30건 완료·0건 실패였습니다. 반면 최대 완료 시간은 약 10초에서 약 53초로 늘었습니다. 접수 p95도 1,446ms에서 1,520ms로 늘었습니다.

이 결과의 핵심은 모든 작업이 빨라졌다는 것이 아니라, 해당 실험에서 더 많은 작업이 끝까지 완료됐다는 점입니다.

## 비교 조건을 남기는 이유

이전 pool2 실험에서도 30건 모두 완료한 기록이 있습니다. 따라서 기존 구조에서 항상 실패한다고 주장할 수 없습니다. 실험은 2 CPU·2GB, MySQL 8·Redis 7, Lambda 메모리 2,048MB·제한 시간 60초·동시성 10 조건이었습니다.

30건의 성공은 무손실 보장이 아닙니다. 더 큰 이미지나 더 긴 부하, 장애 상황에 대한 결과는 별도로 확인해야 합니다.

## 원본 기록

- [구조 변경 PR #21](https://github.com/popeye0618/Harucut/pull/21)
- [측정 환경과 해석](https://github.com/popeye0618/Harucut/blob/main/docs/measurement-2026-08-23.md)
- [개선 전 pool20 결과](https://github.com/popeye0618/Harucut/blob/main/monitoring/loadtest/results/before-pool20.json)
- [개선 후 결과](https://github.com/popeye0618/Harucut/blob/main/monitoring/loadtest/results/after.json)
