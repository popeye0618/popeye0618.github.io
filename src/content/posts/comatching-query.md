---
slug: comatching-candidate-query
title: SQL 601회를 2회로 줄이고 확인한 것
description: 후보 조회 최적화에서 SQL 시간, API 응답 시간, 매칭 품질을 구분한 기록입니다.
publishedAt: '2026-09-28'
category: 데이터베이스
tags: [MySQL, Spring, Performance]
series: comatching-performance
seriesTitle: Comatching5 성능 개선 기록
seriesOrder: 2
relatedProjects: [comatching]
draft: false
---

## 조회 횟수부터 확인하기

Comatching5 후보 조회의 SQL 실행 횟수를 601회에서 2회로 줄였습니다. 사용자 10만 건과 반대 성별 5만 건을 넣은 낮은 동시성 실험에서 SQL 구간은 261.1ms에서 18.8ms로 줄었습니다.

| 비교 항목     | 변경 전 | 변경 후 |
| ------------- | ------- | ------- |
| SQL 실행 횟수 | 601회   | 2회     |
| SQL 소요 시간 | 261.1ms | 18.8ms  |

## 빨라진 구간을 정확하게 표현하기

측정한 것은 SQL 구간입니다. 인증, 네트워크, 매칭 계산 등 전체 요청의 다른 구간이 같은 비율로 줄었다는 뜻은 아닙니다. 따라서 SQL 개선 수치를 전체 API의 응답 시간 개선율로 옮기지 않습니다.

## 표본 조회가 바꾸는 것

이 실험의 변경에는 후보 5,000명 표본 조회가 포함되어 있습니다. 전체 후보를 탐색하는 방식과 비교하면 선택 가능한 후보 집합이 달라지고 매칭 품질에도 영향을 줄 수 있습니다.

이후 표본 2,000명으로 바뀐 구현은 동일한 측정 대상이 아닙니다. 실험과 코드가 달라졌다면 결과를 그대로 재사용하기보다 해당 변경에서 다시 확인해야 합니다.

## 근거

- [후보 조회 개선 PR #58](https://github.com/COMAtching/Comatching5_BE/pull/58)
- [Comatching5 저장소](https://github.com/COMAtching/Comatching5_BE)

조회 비용을 줄였다는 결과와 결과 품질을 유지했다는 주장은 다른 검증이 필요합니다. 이 기록은 전자의 측정 범위를 설명합니다.
