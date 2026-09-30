import { mkdirSync, writeFileSync } from 'node:fs';

// Source-controlled, dependency-free diagrams. Coordinates use a 760px canvas.
const escape = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
const box = (x, y, w, title, subtitle) =>
  `<rect x="${x}" y="${y}" width="${w}" height="84" rx="14" fill="#fff" stroke="#cbd5e1"/><text x="${x + 20}" y="${y + 32}" class="name">${escape(title)}</text><text x="${x + 20}" y="${y + 58}" class="sub">${escape(subtitle)}</text>`;
const arrow = (x1, y1, x2, y2, label = '') =>
  `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="#475569" stroke-width="2" fill="none" marker-end="url(#arrow)"/>${label ? `<text x="${(x1 + x2) / 2 + (y1 === y2 ? 0 : 10)}" y="${(y1 + y2) / 2 - 10}" text-anchor="${y1 === y2 ? 'middle' : 'start'}" class="sub">${escape(label)}</text>` : ''}`;
function save(name, title, subtitle, height, content) {
  writeFileSync(
    `public/diagrams/${name}.svg`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 ${height}" role="img" aria-labelledby="title desc"><title id="title">${title}</title><desc id="desc">${subtitle}</desc><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10" fill="#475569"/></marker></defs><style>text{font-family:Pretendard,system-ui,sans-serif;fill:#172033}.name{font-size:19px;font-weight:650}.sub{font-size:14px;fill:#475569}</style><rect width="760" height="${height}" rx="20" fill="#f1f5f9"/><text x="32" y="43" font-size="24" font-weight="700">${title}</text><text x="32" y="70" class="sub">${subtitle}</text>${content}</svg>\n`,
  );
}
mkdirSync('public/diagrams', { recursive: true });
save(
  'comatching',
  'Comatching3 · AI 매칭 운영 구조',
  '사용자 → 백엔드 → 매칭 처리 → 이력과 채팅',
  620,
  box(
    220,
    100,
    320,
    'React 웹 클라이언트',
    '가입 · 포인트 충전 · 매칭 · 채팅',
  ) +
    arrow(380, 184, 380, 235, 'HTTPS / WebSocket') +
    box(
      180,
      235,
      400,
      'Spring Boot · EC2',
      '인증 · 포인트 · 매칭 연동 · 운영 관리',
    ) +
    arrow(240, 319, 150, 385) +
    arrow(500, 319, 600, 385) +
    box(30, 385, 260, 'RDS · MySQL', '회원 · 포인트 · 매칭 이력') +
    box(460, 385, 270, 'Redis · EC2', '인증 관련 데이터') +
    `<path d="M380 319 V490 H190 V515" stroke="#475569" stroke-width="2" fill="none" marker-end="url(#arrow)"/><text x="392" y="481" class="sub">매칭 요청 / 결과</text>` +
    box(40, 515, 300, 'RabbitMQ · EC2', '매칭 메시지 중계') +
    arrow(340, 556, 440, 556) +
    box(440, 515, 280, 'AI 매칭 서비스', '조건에 따른 대상 추천'),
);
save(
  'comatching5',
  'Comatching5 · 서비스 분리 구조',
  'HTTP로 요청을 연결하고 Kafka 이벤트로 후속 작업을 전달',
  810,
  box(220, 100, 320, 'Next.js 웹 클라이언트', '매칭 · 아이템 · 실시간 채팅') +
    arrow(380, 184, 380, 225) +
    box(220, 225, 320, 'API Gateway', '인증 검증 · 서비스별 라우팅') +
    arrow(300, 309, 145, 355) +
    arrow(380, 309, 380, 355) +
    arrow(460, 309, 615, 355) +
    box(30, 355, 220, 'User', '회원 · 프로필') +
    box(270, 355, 220, 'Matching', '후보 조회 · 매칭') +
    box(510, 355, 220, 'Item', '아이템 사용 · 복구') +
    arrow(380, 439, 380, 485, '매칭 성공 이벤트') +
    box(270, 485, 220, 'Kafka', '서비스 간 이벤트') +
    arrow(270, 527, 250, 595) +
    arrow(490, 527, 510, 595) +
    box(30, 595, 300, 'Chat', 'MongoDB 저장 · Redis Pub/Sub') +
    box(430, 595, 300, 'Notification', '채팅 알림 이벤트 · FCM') +
    `<rect x="30" y="715" width="700" height="65" rx="12" fill="#dbeafe"/><text x="50" y="743" class="name">관계형 데이터: MySQL / RDS · 동시성 제어: Redis</text><text x="50" y="766" class="sub">Gateway는 Chat·Notification에도 라우팅 · 서비스 간 조회/아이템 처리는 Feign 사용</text>`,
);
save(
  'comatching-fc',
  'COMAtching FC · 경기일 서비스 구조',
  '티켓 인증과 응원 성향 설문을 매칭 흐름으로 연결',
  610,
  box(
    220,
    100,
    320,
    'React 웹 클라이언트',
    'QR · 예매번호 · 설문 · 매칭 결과',
  ) +
    arrow(380, 184, 380, 225) +
    box(180, 225, 400, 'Spring Boot API', '회원 인증 · 성향 점수 · 매칭 이력') +
    arrow(230, 309, 155, 355) +
    arrow(530, 309, 605, 355) +
    box(30, 355, 250, 'MySQL', '회원 · 설문 · 매칭 이력') +
    box(480, 355, 250, 'Redis', '설문 조회 캐시') +
    arrow(380, 309, 380, 465, '요청 / 응답 메시지') +
    box(270, 465, 220, 'RabbitMQ', '외부 처리 연동') +
    arrow(270, 507, 245, 545) +
    arrow(490, 507, 515, 545) +
    `<text x="45" y="577" class="name">예매번호 검증 서비스</text><text x="495" y="577" class="name">매칭 처리 서비스</text>`,
);
save(
  'harucut',
  'Harucut · 이미지 합성과 복구 구조',
  '작업을 먼저 저장하고, 비동기 실행 결과를 반영',
  825,
  box(30, 100, 300, '웹 클라이언트', '사진 4장 업로드 · 작업 상태 조회') +
    box(430, 100, 300, 'Amazon S3', '원본 · 프레임 · 결과 · 썸네일') +
    arrow(330, 142, 430, 142, '직접 업로드') +
    arrow(180, 184, 180, 260, '합성 요청 / 상태 조회') +
    box(30, 260, 300, 'Spring Boot API', '소유권 검증 · 작업 생성') +
    arrow(330, 302, 430, 302) +
    box(430, 260, 300, 'MySQL · ComposeJob', 'PENDING → DONE / FAILED') +
    arrow(180, 344, 180, 445, '커밋 후 선점 · 비동기 호출') +
    box(30, 445, 300, 'AWS Lambda', '이미지 합성 · S3 결과 저장') +
    arrow(330, 487, 430, 487, '실행 결과') +
    box(430, 445, 300, 'Amazon SQS', 'Lambda 성공 / 실패 통지') +
    arrow(580, 529, 580, 600, '백엔드가 long polling') +
    box(430, 600, 300, '결과 소비자', 'DB 반영 후 메시지 삭제') +
    box(30, 600, 300, '복구 스케줄러', '정체된 PENDING 작업 재선점') +
    arrow(180, 600, 180, 529, '재실행') +
    `<path d="M730 642 H745 V365 H580 V344" stroke="#475569" stroke-width="2" fill="none" marker-end="url(#arrow)"/>` +
    `<rect x="30" y="725" width="700" height="70" rx="12" fill="#dbeafe"/><text x="50" y="754" class="name">완료는 작업 상태로 확인 · 결과 반영 실패는 재전달</text><text x="50" y="779" class="sub">복구 기본값: 30초 주기 / 10분 이상 정체 · Redis는 인증 데이터에 사용</text>`,
);
