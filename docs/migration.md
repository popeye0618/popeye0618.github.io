# 콘텐츠 이관 기록

기준 커밋: 517283217b82abfca2227be2f7ae0fd9c2d9edcc

기존 루트 HTML·CSS는 Astro 사이트로 교체하면서 현재 소스에서 제거했습니다. 원문은 위 기준 커밋의 Git 이력에서 확인할 수 있습니다. Astro는 `src/pages`와 `public`을 배포하며, 기존 주소의 이동·보관 안내는 `src/pages/[legacy].html.astro`에서 생성합니다.

| 기존 주소 | 처리 |
|---|---|
| index.html | 새 홈과 동일 |
| 01_comatching3.html | Comatching 상세로 이동 안내 |
| 02_comatching5.html | Comatching 상세의 Comatching5 섹션으로 이동 안내 |
| 03_harucut.html | Harucut 상세로 이동 안내 |
| 04_unitt.html | 검토 중 안내와 기준 커밋 원문 링크 |
| deepdive_redis.html 및 _01, _02, _03 | 검토 중 안내와 각 원문 링크 |
| deepdive_socket.html 및 _01, _02, _03 | 검토 중 안내와 각 원문 링크 |

이동 안내는 정적 HTML이며 HTTP 301이 아닙니다. 보관 안내는 noindex이며 사이트맵과 검색에 포함하지 않습니다.

## 보류한 근거

- Redis 이벤트 글: self-invocation과 비동기 프록시 동작, 측정 환경의 해석을 다시 확인해야 합니다. 기존 속도 개선 주장을 그대로 옮기지 않았습니다.
- Redis 랭킹·Stream 글, Java Socket 글: 원문을 보존했으며 코드·실험 근거 전수 검증 전이므로 발행을 보류했습니다.
- UniTKR: 연결된 저장소 접근과 기여 근거를 확인한 후 재작성합니다.

## 새 원고

Comatching, COMAtching FC, Harucut은 GitHub 조사 결과와 운영자 설명을 구분하여 작성했습니다. 초기 블로그 세 편은 Comatching5 캐시·SQL 실험과 Harucut 비교 실험의 확인된 기록을 재구성했으며, 원본 PR과 측정 기록을 연결했습니다. 글의 발행일은 이 사이트의 원고 작성일이며 실제 개발일을 의미하지 않습니다.

Comatching5 명칭은 새 사이트 전체에서 통일합니다. 기존 원문과 커밋 제목은 역사적 기록이므로 수정하지 않습니다.
