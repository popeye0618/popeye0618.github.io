# 프로젝트 상세와 아키텍처 근거

확인일: 2026-09-30. 공개 저장소를 읽고 사용자에게 운영 환경을 확인했다. 프로젝트 코드를 실행하거나 부하 실험을 재수행한 결과는 아니다.

## 확인한 소스 버전

| 저장소                      | 커밋                                     |
| --------------------------- | ---------------------------------------- |
| COMAtching/COMAtching3_BE   | 406ecd19540f841d87332a5a01156198b489593b |
| COMAtching/Comatching5_BE   | d5fc7fae3b77f682f862b132e635846518b0db5b |
| COMAtching/COMAtching_FC_BE | de2ea7894d157f4fd9726b99c23cce144e1b363f |
| popeye0618/Harucut          | f78bc7cfc847ea801b5ae816c57576cb574c6475 |
| COMAtching/COMAtching3_FE   | 82573a107de338b542fd76a6e450366af1111f80 |
| COMAtching/COMATCHING_FC_FE | 6291a677c6d5a7bd83753b670922ce18438f0793 |
| COMAtching/COMAtching5_FE   | 7cc7bf252b8159c0d61e36ff14e2757afa721657 |

## 운영 경험 확인

- 최신 사용자 제공 자료: Comatching3 아키텍처 PNG(2026-09-30). 이 그림을 우선해 Ubuntu·Docker, Nginx/Certbot, 운영 백엔드 두 인스턴스, 운영/테스트별 MySQL·Redis, React, Git webhook·Jenkins, RabbitMQ RPC 큐와 FastAPI·CSV·AI 처리 구성을 반영했다. 앞선 대화에서 확인한 RDS 설명은 이 자료와 달라 본문에서 MySQL 컨테이너로 정정했다. 현재 main의 MatchService는 NoAiMatchingService를 사용하므로 AI 운영 당시 그림과 구분한다. PNG의 Redis 3467·RabbitMQ 관리 포트 15672는 제공 자료의 표기를 유지했다.
- 사용자 확인: Comatching5도 축제에서 운영했다. 성능 수치는 저장소의 별도 부하 실험 결과로 유지한다.
- FC는 경기일 서비스다. 배포 서버 배치는 따로 확정하지 않고 API·DB·캐시·메시지 연동의 논리 구성만 그린다.
- 사용자 확인: Harucut은 운영 준비 중이고 프론트엔드 1명, 백엔드 1명이며 본인이 백엔드를 담당한다.
- 서비스 링크는 사용자가 제공한 https://comatching.site 및 https://harucut.com 이다. 링크 추가는 현재 접속 가능성이나 운영 개시를 보장하는 표현이 아니다.

## 코드와 공개 설명 연결

### Comatching3

README의 서비스 흐름, MatchService의 기존 RabbitMQ 연동, MatchRabbitMQUtil의 요청/응답, RefreshTokenService의 Redis 사용을 확인했다. 사용자 확인을 우선해 AI 운영 당시 구성으로 표현했다. 운영 도구 기여는 본인 작성 PR #187(입금자 검색), #188(회원 검색)과 연결했다.

### Comatching5

settings.gradle과 docker-compose.prod.yml로 서비스 구성을 확인했다. Gateway의 application-aws.yml은 서비스별 라우팅을 정의한다. MatchingServiceImpl의 분산 락, Feign 조회, 아이템 사용/복구, 중복 매칭 저장 재시도와 성공 이벤트를 확인했다. Chat의 MongoRepository와 RedisPublisher, 매칭 성공 Kafka 소비자, Notification의 채팅 알림 소비자를 확인했다.

성능 근거는 docs/perf-log.md와 PR #58, #82, #84, #93, #94다. 캐시와 SQL 측정 범위를 구분하고 29 RPS 병목 및 공유 RDS 제약을 함께 작성했다. 표본 2,000명 변경 후 새로운 처리량 향상은 주장하지 않는다.

### COMAtching FC

AuthService의 기존 회원 조회/신규 예매번호 검증, AuthRabbitMQUtil, QuestionService의 Cacheable/CacheEvict, MatchService와 MatchingRabbitMQUtil, 정리 배치를 확인했다. 자동 스케줄 운영은 주장하지 않는다. 자체 AI 모델 개발이 아니라 백엔드 연동과 상태 관리 기여를 서술한다.

### Harucut

ComposeService, ComposeWorker, LambdaComposeExecutor, ComposeResultConsumer, ComposeJobRepository, ComposeRerunScheduler를 읽었다. DB 커밋 후 REQUIRES_NEW 선점, Lambda EVENT 호출, SQS long polling, DB 반영 후 삭제, 30초 주기/10분 정체 기본값을 확인했다. 요청 키 조회를 동시 중복 요청의 완전한 차단 보장으로 확대하지 않았다.

docs/measurement-2026-08-23.md와 monitoring/loadtest/results의 before-pool20.json·after.json을 근거로 기존 실험 수치와 조건을 유지했다. 30건 실험의 실패 0건을 모든 환경의 무손실 보장으로 확대하지 않는다.

## 그림 유지보수

`node scripts/generate-project-diagrams.mjs`로 public/diagrams의 SVG 4개, draw.io 원본 4개와 4페이지 통합 원본 all-projects.drawio를 생성한다. SVG에도 draw.io 데이터가 내장된다. 기술 타일은 아이콘과 라벨을 포함한 편집 그룹이며 연결선은 개별 편집할 수 있다. 아이콘 출처와 라이선스는 public/diagrams/icons에 보관한다. 그림은 서비스 책임과 대표 통신을 요약하며 모든 API 경로나 네트워크 보안 경계를 표현하지 않는다. 문서의 운영 시점과 현재 소스 구분을 유지한다.
