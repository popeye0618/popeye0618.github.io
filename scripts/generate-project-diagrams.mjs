import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const ROOT = 'public/diagrams';
const xml = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const palette = {
  ink: '#192B40',
  muted: '#526579',
  line: '#AAB8C7',
  blue: '#2476C5',
  orange: '#D87924',
  green: '#388763',
};
const icons = {};
for (const name of [
  'spring',
  'mysql',
  'redis',
  'docker',
  'nginx',
  'react',
  'jenkins',
  'git',
  'ubuntu',
  'fastapi',
  'apachekafka',
  'mongodb',
  'nextjs',
  'rabbitmq',
]) {
  let svg = readFileSync(`${ROOT}/icons/${name}.svg`, 'utf8');
  if (name === 'rabbitmq') svg = svg.replace('<svg ', '<svg fill="#FF6600" ');
  icons[name] = svg;
}
// Original symbolic icons for clients and cloud services; vendor logos are bundled above.
for (const [name, color, glyph] of [
  ['client', '#34495E', 'WEB'],
  ['developer', '#34495E', '</>'],
  ['csv', '#388763', 'CSV'],
  ['ai', '#6F55AD', 'AI'],
  ['aws', '#E58B22', 'AWS'],
  ['s3', '#4E8F38', 'S3'],
  ['lambda', '#E58B22', 'λ'],
  ['sqs', '#AD3C78', 'SQS'],
  ['rds', '#3572B0', 'RDS'],
  ['batch', '#388763', 'JOB'],
  ['gateway', '#2476C5', 'API'],
  ['fcm', '#E58B22', 'FCM'],
  ['monitor', '#D87924', 'OBS'],
]) {
  icons[name] =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="3" y="3" width="58" height="58" rx="12" fill="${color}"/><text x="32" y="40" text-anchor="middle" font-family="Arial,sans-serif" font-size="${glyph.length > 2 ? 19 : 28}" font-weight="700" fill="white">${xml(glyph)}</text></svg>`;
}
const uri = (svg) =>
  'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
class Diagram {
  constructor(name, title, subtitle, w, h) {
    this.name = name;
    this.title = title;
    this.subtitle = subtitle;
    this.w = w;
    this.h = h;
    this.items = [];
    this.seq = 0;
    this.text(40, 37, w - 80, 44, title, 34, palette.ink, true);
    this.text(42, 91, w - 84, 27, subtitle, 19, palette.muted);
  }
  add(item) {
    item.id = item.id || `v${++this.seq}`;
    this.items.push(item);
    return item.id;
  }
  text(
    x,
    y,
    w,
    h,
    label,
    size = 19,
    color = palette.ink,
    bold = false,
    align = 'left',
  ) {
    return this.add({
      type: 'text',
      x,
      y,
      w,
      h,
      label,
      size,
      color,
      bold,
      align,
    });
  }
  group(
    id,
    x,
    y,
    w,
    h,
    label,
    icon = 'docker',
    color = palette.blue,
    dashed = true,
  ) {
    this.add({ type: 'group', id, x, y, w, h, color, dashed });
    this.icon(x + 16, y + 13, 28, icon);
    this.text(x + 55, y + 13, w - 70, 29, label, 21, color, true);
  }
  icon(x, y, size, icon) {
    return this.add({ type: 'icon', x, y, w: size, h: size, icon });
  }
  node(id, x, y, w, label, sub, icon, h = 116) {
    this.add({ type: 'node', id, x, y, w, h, color: '#D7E0E8' });
    this.icon(x + w / 2 - 23, y + 13, 46, icon);
    this.text(
      x + 4,
      y + 66,
      w - 8,
      25,
      label,
      label.length >= 18 ? 18 : 21,
      palette.ink,
      true,
      'center',
    );
    if (sub)
      this.text(
        x + 4,
        y + 93,
        w - 8,
        20,
        sub,
        15,
        palette.muted,
        false,
        'center',
      );
    return id;
  }
  note(x, y, w, label, color = palette.muted) {
    this.text(x, y, w, 24, label, 17, color);
  }
  edge(
    points,
    label = '',
    lx = 0,
    ly = 0,
    kind = 'request',
    src = null,
    tgt = null,
  ) {
    const color =
      kind === 'event'
        ? palette.orange
        : kind === 'deploy'
          ? '#82909D'
          : palette.blue;
    this.add({
      type: 'edge',
      points,
      label,
      lx,
      ly,
      color,
      dashed: kind === 'deploy',
      src,
      tgt,
    });
  }
  legend(y) {
    this.edge(
      [
        [44, y],
        [100, y],
      ],
      '',
      0,
      0,
    );
    this.note(112, y - 12, 230, '서비스 요청 / 데이터');
    this.edge(
      [
        [375, y],
        [431, y],
      ],
      '',
      0,
      0,
      'event',
    );
    this.note(443, y - 12, 240, '메시지 / 비동기 처리');
    this.edge(
      [
        [750, y],
        [806, y],
      ],
      '',
      0,
      0,
      'deploy',
    );
    this.note(818, y - 12, 270, '배포 / 관리 경로');
  }
  render() {
    // Keep each icon and label inside its movable draw.io technology tile.
    for (let k = 0; k < this.items.length; k++) {
      const n = this.items[k];
      if (n.type === 'node')
        for (
          let j = k + 1;
          j < this.items.length &&
          ['icon', 'text'].includes(this.items[j].type);
          j++
        )
          this.items[j].parent = n.id;
    }
    const cells = ['<mxCell id="0"/><mxCell id="1" parent="0"/>'];
    let svg = [];
    const geo = (i) => {
      const p = this.items.find((n) => n.id === i.parent);
      return `<mxGeometry x="${i.x - (p?.x || 0)}" y="${i.y - (p?.y || 0)}" width="${i.w}" height="${i.h}" as="geometry"/>`;
    };
    for (const i of this.items) {
      let style = '',
        value = '';
      if (i.type === 'group' || i.type === 'node') {
        const group = i.type === 'group';
        style = `rounded=1;arcSize=${group ? 5 : 8};whiteSpace=wrap;html=0;fillColor=#FFFFFF;strokeColor=${i.color};strokeWidth=${group ? 1.5 : 1};dashed=${i.dashed ? 1 : 0};`;
        svg.push(
          `<rect x="${i.x}" y="${i.y}" width="${i.w}" height="${i.h}" rx="${group ? 12 : 7}" fill="#fff" stroke="${i.color}" stroke-width="${group ? 1.5 : 1}" ${i.dashed ? 'stroke-dasharray="6 5"' : ''}/>`,
        );
      } else if (i.type === 'icon') {
        style = `shape=image;imageAspect=1;aspect=fixed;image=data:image/svg+xml,${Buffer.from(icons[i.icon]).toString('base64')};`;
        svg.push(
          `<image x="${i.x}" y="${i.y}" width="${i.w}" height="${i.h}" href="${uri(icons[i.icon])}"/>`,
        );
      } else if (i.type === 'text') {
        value = i.label;
        style = `text;html=0;whiteSpace=wrap;overflow=hidden;align=${i.align};verticalAlign=middle;spacing=0;fontFamily=Arial;fontSize=${i.size};fontColor=${i.color};fontStyle=${i.bold ? 1 : 0};`;
        svg.push(
          `<text x="${i.align === 'center' ? i.x + i.w / 2 : i.x}" y="${i.y + i.h / 2}" dominant-baseline="central" text-anchor="${i.align === 'center' ? 'middle' : 'start'}" font-size="${i.size}" font-weight="${i.bold ? 700 : 400}" fill="${i.color}">${xml(i.label)}</text>`,
        );
      } else if (i.type === 'edge') {
        const start = i.points[0],
          end = i.points.at(-1);
        const mid = i.points.slice(1, -1);
        style = `edgeStyle=none;rounded=0;html=0;endArrow=block;endFill=1;strokeColor=${i.color};strokeWidth=2;dashed=${i.dashed ? 1 : 0};`;
        for (const [field, p, id] of [
          ['exit', start, i.src],
          ['entry', end, i.tgt],
        ]) {
          if (id) {
            const n = this.items.find((v) => v.id === id);
            if (n)
              style += `${field}X=${(p[0] - n.x) / n.w};${field}Y=${(p[1] - n.y) / n.h};${field}Dx=0;${field}Dy=0;`;
          }
        }
        cells.push(
          `<mxCell id="${i.id}" edge="1" parent="1" style="${xml(style)}"${i.src ? ` source="${i.src}"` : ''}${i.tgt ? ` target="${i.tgt}"` : ''}><mxGeometry relative="1" as="geometry"><mxPoint x="${start[0]}" y="${start[1]}" as="sourcePoint"/><mxPoint x="${end[0]}" y="${end[1]}" as="targetPoint"/><Array as="points">${mid.map((p) => `<mxPoint x="${p[0]}" y="${p[1]}"/>`).join('')}</Array></mxGeometry></mxCell>`,
        );
        svg.push(
          `<path d="${i.points.map((p, k) => (k ? 'L' : 'M') + p.join(' ')).join(' ')}" fill="none" stroke="${i.color}" stroke-width="2.2" ${i.dashed ? 'stroke-dasharray="7 6"' : ''} marker-end="url(#${i.dashed ? 'deploy' : i.color === palette.orange ? 'event' : 'request'})"/>`,
        );
        if (i.label) {
          const tw = Math.max(
            70,
            [...i.label].reduce(
              (n, c) => n + (c.charCodeAt(0) > 255 ? 17 : 9),
              0,
            ) + 12,
          );
          svg.push(
            `<rect x="${i.lx - 5}" y="${i.ly - 2}" width="${tw}" height="24" fill="white"/><text x="${i.lx}" y="${i.ly + 16}" font-size="17" fill="${i.color}">${xml(i.label)}</text>`,
          );
          cells.push(
            `<mxCell id="${i.id}-label" value="${xml(i.label)}" vertex="1" parent="1" style="text;html=0;align=left;verticalAlign=middle;spacing=0;fontSize=17;fontColor=${i.color};fillColor=#FFFFFF;"><mxGeometry x="${i.lx}" y="${i.ly}" width="${tw}" height="24" as="geometry"/></mxCell>`,
          );
        }
        continue;
      }
      if (i.type === 'node') {
        cells.push(
          `<mxCell id="${i.id}" vertex="1" parent="1" style="group;connectable=1;">${geo(i)}</mxCell>`,
        );
        cells.push(
          `<mxCell id="${i.id}-frame" vertex="1" parent="${i.id}" style="${xml(style)}"><mxGeometry x="0" y="0" width="${i.w}" height="${i.h}" as="geometry"/></mxCell>`,
        );
      } else
        cells.push(
          `<mxCell id="${i.id}" value="${xml(value)}" vertex="1" parent="${i.parent || '1'}" style="${xml(style)}">${geo(i)}</mxCell>`,
        );
    }
    const model = `<mxGraphModel dx="${this.w}" dy="${this.h}" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${this.w}" pageHeight="${this.h}" background="#ffffff"><root>${cells.join('')}</root></mxGraphModel>`;
    const file = `<mxfile host="app.diagrams.net"><diagram id="${this.name}" name="${xml(this.title)}">${model}</diagram></mxfile>`;
    const markers = [
      ['request', palette.blue],
      ['event', palette.orange],
      ['deploy', '#82909D'],
    ]
      .map(
        ([id, c]) =>
          `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10Z" fill="${c}"/></marker>`,
      )
      .join('');
    writeFileSync(`${ROOT}/${this.name}.drawio`, file + '\n');
    writeFileSync(
      `${ROOT}/${this.name}.svg`,
      `<svg xmlns="http://www.w3.org/2000/svg" width="${this.w}" height="${this.h}" viewBox="0 0 ${this.w} ${this.h}" style="max-width:100%;height:auto" role="img" aria-labelledby="title desc" content="${xml(file)}"><title id="title">${xml(this.title)}</title><desc id="desc">${xml(this.subtitle)}</desc><defs>${markers}</defs><rect width="100%" height="100%" fill="white"/><g font-family="Pretendard,Arial,sans-serif">${svg.join('')}</g></svg>\n`,
    );
    return file;
  }
}
mkdirSync(ROOT, { recursive: true });
const diagrams = [];
{
  const d = new Diagram(
    'comatching',
    'Comatching3',
    '축제 운영 환경 · AI 매칭 · Docker / Nginx / Jenkins',
    1440,
    1150,
  );
  d.group(
    'host',
    250,
    285,
    1150,
    785,
    'Ubuntu · comatching.site',
    'ubuntu',
    '#D87924',
    false,
  );
  d.group('prod', 285, 345, 490, 300, 'Production backend');
  d.group('test', 285, 685, 490, 170, 'Test backend');
  d.group('front', 285, 895, 260, 145, 'React frontend');
  d.group('match', 830, 345, 530, 510, 'Matching platform');
  d.group('broker', 855, 405, 215, 415, 'RPC queues', 'rabbitmq', '#D87924');
  d.group(
    'engine',
    1090,
    405,
    245,
    425,
    'AI application',
    'fastapi',
    '#388763',
  );
  d.node('client', 65, 150, 140, 'Client', 'HTTPS', 'client');
  d.node('dev', 1210, 150, 160, 'Developers', '', 'developer');
  d.node('git', 1020, 150, 140, 'Git', '', 'git');
  d.node('jenkins', 820, 150, 150, 'Jenkins', '', 'jenkins');
  d.node('nginx', 55, 460, 160, 'Nginx', 'TLS · Certbot', 'nginx');
  d.node('spring1', 320, 400, 160, 'Spring Boot', ':8080', 'spring');
  d.node('spring2', 320, 525, 160, 'Spring Boot', ':8081', 'spring');
  d.node('mysql', 570, 400, 160, 'MySQL', ':3306', 'mysql');
  d.node('redis', 570, 525, 160, 'Redis', ':3467', 'redis');
  d.node('ts', 305, 733, 140, 'Spring Boot', ':8080', 'spring');
  d.node('tm', 465, 733, 140, 'MySQL', ':3306', 'mysql');
  d.node('tr', 625, 733, 140, 'Redis', ':3467', 'redis');
  d.node('react', 335, 930, 160, 'React', '', 'react', 105);
  d.node('rabbit', 887, 455, 150, 'RabbitMQ', 'Management :15672', 'rabbitmq');
  d.text(870, 585, 185, 40, 'User CRUD queue', 18, palette.ink, true, 'center');
  d.text(
    870,
    629,
    185,
    25,
    'Request / Reply',
    16,
    palette.muted,
    false,
    'center',
  );
  d.text(
    870,
    700,
    185,
    40,
    'Match request queue',
    18,
    palette.ink,
    true,
    'center',
  );
  d.text(
    870,
    744,
    185,
    25,
    'Request / Reply',
    16,
    palette.muted,
    false,
    'center',
  );
  d.node('csv', 1140, 460, 140, 'CSV', 'Candidate data', 'csv');
  d.node('fastapi', 1140, 585, 140, 'FastAPI', 'Read / Write', 'fastapi');
  d.node('ai', 1140, 710, 140, 'AI matching', 'Recommendation', 'ai');
  d.edge(
    [
      [135, 266],
      [135, 460],
    ],
    'HTTPS',
    148,
    340,
    'request',
    'client',
    'nginx',
  );
  d.edge(
    [
      [215, 495],
      [260, 495],
      [260, 458],
      [320, 458],
    ],
    'Round robin',
    70,
    420,
    'request',
    'nginx',
    'spring1',
  );
  d.edge(
    [
      [260, 495],
      [260, 583],
      [320, 583],
    ],
    '',
    0,
    0,
    'request',
    null,
    'spring2',
  );
  d.edge(
    [
      [215, 535],
      [235, 535],
      [235, 791],
      [305, 791],
    ],
    'Test',
    244,
    758,
    'request',
    'nginx',
    'ts',
  );
  d.edge(
    [
      [135, 576],
      [135, 984],
      [335, 984],
    ],
    'Web',
    155,
    958,
    'request',
    'nginx',
    'react',
  );
  d.edge(
    [
      [1210, 208],
      [1160, 208],
    ],
    'push',
    1166,
    177,
    'deploy',
    'dev',
    'git',
  );
  d.edge(
    [
      [1020, 208],
      [970, 208],
    ],
    'webhook',
    965,
    177,
    'deploy',
    'git',
    'jenkins',
  );
  d.edge(
    [
      [895, 266],
      [895, 307],
      [760, 307],
      [760, 345],
    ],
    'deploy',
    792,
    282,
    'deploy',
    'jenkins',
  );
  d.edge(
    [
      [895, 307],
      [1380, 307],
      [1380, 370],
      [1360, 370],
    ],
    '',
    0,
    0,
    'deploy',
    null,
    'match',
  );
  d.edge(
    [
      [760, 307],
      [800, 307],
      [800, 675],
      [530, 675],
      [530, 685],
    ],
    '',
    0,
    0,
    'deploy',
    null,
    'test',
  );
  d.edge(
    [
      [800, 675],
      [800, 880],
      [415, 880],
      [415, 895],
    ],
    '',
    0,
    0,
    'deploy',
    null,
    'front',
  );
  d.edge(
    [
      [775, 480],
      [813, 480],
      [813, 606],
      [855, 606],
    ],
    'RPC',
    784,
    565,
    'event',
    'prod',
    'broker',
  );
  d.edge(
    [
      [1070, 630],
      [1090, 630],
      [1140, 630],
    ],
    '',
    0,
    0,
    'event',
    'broker',
    'fastapi',
  );
  d.edge(
    [
      [1210, 585],
      [1210, 576],
    ],
    '',
    0,
    0,
    'request',
    'fastapi',
    'csv',
  );
  d.edge(
    [
      [1210, 701],
      [1210, 710],
    ],
    '',
    0,
    0,
    'request',
    'fastapi',
    'ai',
  );
  d.note(854, 877, 485, '실선: 서비스 연결 · 점선: Jenkins 배포');
  d.note(854, 909, 485, '운영·테스트의 DB / Redis 컨테이너 분리');
  d.legend(1114);
  diagrams.push(d);
}
{
  const d = new Diagram(
    'comatching5',
    'Comatching5',
    'MSA · 서비스별 책임 · Kafka 이벤트 · 데이터 저장소',
    1500,
    1180,
  );
  d.group(
    'ec2',
    265,
    145,
    960,
    940,
    'EC2 · Docker Compose',
    'aws',
    '#D87924',
    false,
  );
  d.group('apps', 295, 325, 900, 245, 'Application services');
  d.group('data', 295, 875, 900, 175, 'State / observability', 'docker');
  d.node('client', 60, 190, 160, 'Next.js', 'Web client', 'nextjs');
  d.node('gateway', 640, 190, 190, 'API Gateway', 'JWT · Routing', 'gateway');
  d.node('user', 330, 400, 180, 'User', 'Profile · Account', 'spring');
  d.node(
    'matching',
    640,
    400,
    190,
    'Matching',
    'Candidate · History',
    'spring',
  );
  d.node('item', 950, 400, 180, 'Item', 'Consume · Refund', 'spring');
  d.node('kafka', 640, 610, 190, 'Kafka', 'Domain events', 'apachekafka');
  d.node('chat', 330, 705, 180, 'Chat', 'WebSocket · Rooms', 'spring');
  d.node(
    'notification',
    950,
    705,
    180,
    'Notification',
    'Push notification',
    'spring',
  );
  d.node('rds', 1280, 400, 175, 'RDS · MySQL', 'Relational data', 'rds');
  d.node('fcm', 1280, 705, 175, 'FCM', 'Push delivery', 'fcm');
  d.node('redis', 330, 925, 180, 'Redis', 'Lock · Pub/Sub', 'redis');
  d.node('mongo', 640, 925, 190, 'MongoDB', 'Chat persistence', 'mongodb');
  d.node(
    'monitor',
    950,
    925,
    180,
    'Monitoring',
    'Prometheus · Grafana',
    'monitor',
  );
  d.edge(
    [
      [220, 248],
      [640, 248],
    ],
    'HTTPS',
    370,
    219,
    'request',
    'client',
    'gateway',
  );
  d.edge(
    [
      [735, 306],
      [735, 366],
      [420, 366],
      [420, 400],
    ],
    'Routing',
    750,
    338,
    'request',
    'gateway',
    'user',
  );
  d.edge(
    [
      [735, 366],
      [735, 400],
    ],
    '',
    0,
    0,
    'request',
    null,
    'matching',
  );
  d.edge(
    [
      [735, 366],
      [1040, 366],
      [1040, 400],
    ],
    '',
    0,
    0,
    'request',
    null,
    'item',
  );
  d.edge(
    [
      [640, 458],
      [510, 458],
    ],
    'Feign',
    543,
    428,
    'request',
    'matching',
    'user',
  );
  d.edge(
    [
      [830, 458],
      [950, 458],
    ],
    'Feign',
    856,
    428,
    'request',
    'matching',
    'item',
  );
  d.edge(
    [
      [1130, 458],
      [1280, 458],
    ],
    'SQL',
    1187,
    427,
    'request',
    'item',
    'rds',
  );
  d.edge(
    [
      [735, 516],
      [735, 610],
    ],
    'Matching success',
    756,
    576,
    'event',
    'matching',
    'kafka',
  );
  d.edge(
    [
      [640, 668],
      [420, 668],
      [420, 705],
    ],
    'Create room',
    462,
    640,
    'event',
    'kafka',
    'chat',
  );
  d.edge(
    [
      [510, 750],
      [585, 750],
      [585, 701],
      [640, 701],
    ],
    'Chat event',
    516,
    710,
    'event',
    'chat',
    'kafka',
  );
  d.edge(
    [
      [830, 668],
      [1040, 668],
      [1040, 705],
    ],
    'Chat notification',
    846,
    636,
    'event',
    'kafka',
    'notification',
  );
  d.edge(
    [
      [1130, 763],
      [1280, 763],
    ],
    'Push',
    1185,
    733,
    'request',
    'notification',
    'fcm',
  );
  d.edge(
    [
      [420, 821],
      [310, 821],
      [310, 983],
      [330, 983],
    ],
    'Pub/Sub',
    320,
    842,
    'event',
    'chat',
    'redis',
  );
  d.edge(
    [
      [510, 790],
      [735, 790],
      [735, 925],
    ],
    'Save / Read',
    577,
    759,
    'request',
    'chat',
    'mongo',
  );
  d.note(
    303,
    1101,
    1100,
    'Gateway는 Chat·Notification에도 라우팅 · 관계형 데이터를 사용하는 서비스는 RDS 연결',
  );
  d.legend(1149);
  diagrams.push(d);
}
{
  const d = new Diagram(
    'comatching-fc',
    'COMAtching FC',
    '경기일 관중 서비스 · 티켓 인증 · 응원 성향 설문 · 매칭',
    1440,
    890,
  );
  d.group('web', 40, 245, 240, 245, 'Frontend', 'react');
  d.group('backend', 335, 180, 400, 590, 'Backend · Spring Boot', 'docker');
  d.group(
    'external',
    1085,
    180,
    310,
    590,
    'External services',
    'docker',
    '#388763',
  );
  d.node('client', 80, 315, 160, 'React', 'QR · Ticket · Survey', 'react');
  d.node(
    'api',
    445,
    285,
    180,
    'Spring Boot',
    'Auth · Survey · Match',
    'spring',
  );
  d.node('mysql', 365, 495, 155, 'MySQL', 'User · Survey · History', 'mysql');
  d.node('redis', 550, 495, 155, 'Redis', 'Survey cache', 'redis');
  d.node('batch', 450, 650, 170, 'Spring Batch', 'Data cleanup', 'batch');
  d.node('rabbit', 815, 325, 180, 'RabbitMQ', 'Request / Reply', 'rabbitmq');
  d.node(
    'ticket',
    1140,
    270,
    200,
    'Ticket verification',
    'Reservation number',
    'gateway',
  );
  d.node(
    'matching',
    1140,
    520,
    200,
    'Matching service',
    'Supporter preferences',
    'ai',
  );
  d.edge(
    [
      [240, 373],
      [315, 373],
      [315, 343],
      [445, 343],
    ],
    'HTTPS',
    298,
    312,
    'request',
    'client',
    'api',
  );
  d.edge(
    [
      [490, 401],
      [490, 445],
      [442, 445],
      [442, 495],
    ],
    'Persist',
    384,
    444,
    'request',
    'api',
    'mysql',
  );
  d.edge(
    [
      [580, 401],
      [580, 445],
      [627, 445],
      [627, 495],
    ],
    'Cache',
    635,
    444,
    'request',
    'api',
    'redis',
  );
  d.edge(
    [
      [625, 343],
      [780, 343],
      [780, 383],
      [815, 383],
    ],
    'RPC',
    743,
    307,
    'event',
    'api',
    'rabbit',
  );
  d.edge(
    [
      [995, 383],
      [1045, 383],
      [1045, 328],
      [1140, 328],
    ],
    'Verify',
    1055,
    296,
    'event',
    'rabbit',
    'ticket',
  );
  d.edge(
    [
      [1045, 383],
      [1045, 578],
      [1140, 578],
    ],
    'Match',
    1065,
    545,
    'event',
    null,
    'matching',
  );
  d.edge(
    [
      [450, 708],
      [405, 708],
      [405, 611],
    ],
    '',
    0,
    0,
    'request',
    'batch',
    'mysql',
  );
  d.note(820, 663, 235, '신규 회원: 티켓 검증');
  d.note(820, 695, 235, '기존 회원: 재검증 생략');
  d.legend(836);
  diagrams.push(d);
}
{
  const d = new Diagram(
    'harucut',
    'Harucut',
    '사진 4장 → 합성 → 결과 확인 · 영속 작업과 실패 복구',
    1500,
    1150,
  );
  d.group('backend', 325, 220, 415, 825, 'Backend', 'spring');
  d.group(
    'aws',
    840,
    220,
    615,
    615,
    'AWS · storage / compute / queue',
    'aws',
    '#D87924',
    false,
  );
  d.group('storage', 840, 850, 615, 195, 'Data storage', 'docker');
  d.node('client', 55, 305, 180, 'Web client', 'Upload · Poll job', 'client');
  d.node(
    'api',
    440,
    285,
    190,
    'Spring Boot API',
    'Validate · Create job',
    'spring',
  );
  d.node(
    'worker',
    440,
    480,
    190,
    'Compose worker',
    'After commit · Claim',
    'batch',
  );
  d.node(
    'consumer',
    440,
    680,
    190,
    'Result consumer',
    'Save → Delete message',
    'batch',
  );
  d.node(
    'recovery',
    440,
    895,
    190,
    'Recovery scheduler',
    'Stalled jobs · Retry',
    'batch',
  );
  d.node('s3', 1140, 285, 190, 'Amazon S3', 'Original · Result', 's3');
  d.node(
    'lambda',
    895,
    480,
    190,
    'AWS Lambda',
    'Compose · Thumbnail',
    'lambda',
  );
  d.node('sqs', 1140, 680, 190, 'Amazon SQS', 'Success / Failure', 'sqs');
  d.node('mysql', 895, 895, 190, 'MySQL', 'ComposeJob · Media', 'mysql');
  d.node('redis', 1210, 895, 190, 'Redis', 'Auth token data', 'redis');
  d.edge(
    [
      [235, 363],
      [300, 363],
      [300, 343],
      [440, 343],
    ],
    'API / Polling',
    265,
    320,
    'request',
    'client',
    'api',
  );
  d.edge(
    [
      [145, 305],
      [145, 171],
      [1235, 171],
      [1235, 285],
    ],
    'Presigned URL · Direct upload',
    530,
    142,
    'request',
    'client',
    's3',
  );
  d.edge(
    [
      [535, 401],
      [535, 480],
    ],
    'Commit',
    550,
    424,
    'request',
    'api',
    'worker',
  );
  d.edge(
    [
      [630, 343],
      [784, 343],
      [784, 953],
      [895, 953],
    ],
    'Persist job',
    655,
    313,
    'request',
    'api',
    'mysql',
  );
  d.edge(
    [
      [630, 538],
      [895, 538],
    ],
    'Async invocation',
    673,
    507,
    'event',
    'worker',
    'lambda',
  );
  d.edge(
    [
      [990, 480],
      [990, 424],
      [1235, 424],
      [1235, 401],
    ],
    'Read / Write',
    1043,
    396,
    'request',
    'lambda',
    's3',
  );
  d.edge(
    [
      [1085, 560],
      [1235, 560],
      [1235, 680],
    ],
    'Destination',
    1246,
    600,
    'event',
    'lambda',
    'sqs',
  );
  d.edge(
    [
      [1140, 738],
      [630, 738],
    ],
    'Long polling · Result delivery',
    813,
    708,
    'event',
    'sqs',
    'consumer',
  );
  d.edge(
    [
      [630, 768],
      [815, 768],
      [815, 981],
      [895, 981],
    ],
    'Update job',
    665,
    985,
    'request',
    'consumer',
    'mysql',
  );
  d.edge(
    [
      [440, 953],
      [375, 953],
      [375, 538],
      [440, 538],
    ],
    'Retry',
    379,
    833,
    'event',
    'recovery',
    'worker',
  );
  d.note(62, 492, 220, '1. 원본 업로드');
  d.note(62, 532, 220, '2. 합성 요청');
  d.note(62, 572, 220, '3. 작업 상태 조회');
  d.note(62, 612, 220, '4. 결과 다운로드');
  d.legend(1105);
  diagrams.push(d);
}
const files = diagrams.map((d) => d.render());
writeFileSync(
  `${ROOT}/all-projects.drawio`,
  '<mxfile host="app.diagrams.net">' +
    files.map((f) => f.match(/<diagram[\s\S]*<\/diagram>/)[0]).join('') +
    '</mxfile>\n',
);
console.log(
  `Generated ${diagrams.length} SVG / draw.io pairs and one multipage draw.io file.`,
);
