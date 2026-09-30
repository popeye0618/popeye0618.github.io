# 블로그 이관 기록

2026-09-30에 사용자가 요청한 추천 글 4편을 이관했다. 원문 본문·코드·표를 Markdown으로 옮기고 원문 링크를 남겼다. 게시일은 원문 표시 날짜를, 수정일은 이관일을 사용한다.

| 새 경로 | 원문 게시일 | 출처 |
| --- | --- | --- |
| /blog/redis-duplicate-request/ | 2025-12-17 | Velog의 AOP와 Redis를 활용한 API 중복 요청 방지 |
| /blog/spring-security-login-migration/ | 2025-11-25 | Velog의 Spring Security 로그인 마이그레이션 |
| /blog/oauth2-oidc-provider-separation/ | 2025-12-08 | Velog의 카카오는 OIDC로, 네이버는 OAuth2로 분리하기 |
| /blog/java-hashmap-internals/ | 2026-05-01 | open-blog.pages.dev의 Java HashMap 글 |

공개 글의 이관 안내와 최초 작성 글 링크는 사용자 요청으로 제거했다. 기술 설명과 공식 참고 자료, 게시일은 유지한다. 기존 포트폴리오 글 3편은 처음 추가된 소스 커밋 b24e073의 날짜인 2026-09-28과 게시일이 일치하여 유지했다. 프로젝트 실험이 수행된 날을 글 게시일로 추정하지 않았다.

## 이관 시 수정

- Redis: TTL 내 중복 억제와 영구 멱등성을 구분하고 장애·만료 조건을 보완했다. 실행하지 않은 부하 테스트 결과를 추가하지 않았다.
- Security: 필터 기반 SecurityContext 저장과 직접 authenticate 호출을 구분했다. Mock 단위 테스트가 전체 인증 경로를 검증하는 것으로 표현하지 않았다.
- OIDC: 원문의 버전 조합과 제공자 표준 준수 여부는 확정하지 않고 확인 범위를 명시했다. 원문 발췌 코드는 완결된 실행 예제가 아니다.
- HashMap: 해시 분산·분할 상환·트리화 조건을 보완했다. 코드 실행 결과를 새로 측정한 것으로 표현하지 않았다.

Spring Batch 개념 글과 알고리즘 풀이는 이번 추천 4편에 포함하지 않았다. 원문 사이트의 글은 수정하거나 삭제하지 않았다.
