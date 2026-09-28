import { mkdir, writeFile } from 'node:fs/promises';
const slug = process.argv[2];
if (
  !slug ||
  !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
  ['tags', 'series', 'categories', 'page'].includes(slug)
)
  throw new Error('Usage: pnpm new:post your-post-slug');
const day = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());
await writeFile(
  `src/content/posts/${slug}.md`,
  `---\nslug: ${slug}\ntitle: "새 글 제목"\ndescription: "글의 핵심 내용을 한 문장으로 적어주세요."\npublishedAt: '${day}'\ncategory: 프로젝트 기록\ntags: []\nrelatedProjects: []\ndraft: true\n---\n\n## 해결하고 싶었던 문제\n\n## 선택과 구현\n\n## 검증 결과와 한계\n\n## 참고 자료\n`,
  { flag: 'wx' },
);
await mkdir(`public/images/posts/${slug}`, { recursive: true });
console.log(
  `Created src/content/posts/${slug}.md (draft). Public repository source is not private.`,
);
