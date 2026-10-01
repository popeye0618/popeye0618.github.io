import { writeFile, unlink, readFile, access, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const created = [];
const results = [];
const existingPostCount = (
  (await readFile('dist/rss.xml', 'utf8')).match(/<item>/g) ?? []
).length;
const expectedPublicCount = existingPostCount + 11;
let browser;
function build() {
  for (const args of [
    ['scripts/validate-content.mjs'],
    ['node_modules/astro/bin/astro.mjs', 'build'],
    ['scripts/normalize-legacy.mjs'],
    ['node_modules/pagefind/lib/runner/bin.cjs', '--site', 'dist'],
    ['scripts/check-links.mjs'],
  ]) {
    const r = spawnSync(process.execPath, args, {
      env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
      encoding: 'utf8',
    });
    if (r.status !== 0) throw new Error(r.stdout + r.stderr);
  }
}
try {
  for (let i = 0; i < 13; i++) {
    const slug = `verification-fixture-${i}`;
    const file = `src/content/posts/${slug}.md`;
    const content = `---\nslug: ${slug}\ntitle: "검증용 ${i}"\ndescription: "자동 검증 후 제거하는 임시 글"\npublishedAt: '${i === 12 ? '2999-01-01' : '2020-01-01'}'\ncategory: 검증용\ntags: [Fixture]\nseries: verification-fixture\nseriesTitle: 검증 시리즈\nseriesOrder: ${i + 1}\nrelatedProjects: [comatching]\ndraft: ${i === 11}\n---\n\n## 코드 확인\n\n\`\`\`java\nSystem.out.println("${'long'.repeat(70)}");\n\`\`\`\n\n| 긴 표 | 값 |\n| --- | --- |\n| ${'LongCell'.repeat(50)} | test |\n\n![사이트 아이콘](/favicon.svg)\n\n${i === 11 ? 'draftsentinel' : i === 12 ? 'futuresentinel' : 'publicsentinel'}\n`;
    await writeFile(file, content, { flag: 'wx' });
    created.push(file);
  }
  build();
  for (const slug of ['verification-fixture-11', 'verification-fixture-12']) {
    await assert.rejects(access(`dist/blog/${slug}/index.html`));
    for (const file of [
      'dist/rss.xml',
      'dist/sitemap.xml',
      'dist/blog/index.html',
      'dist/blog/series/verification-fixture/index.html',
      'dist/projects/comatching/index.html',
    ])
      assert.ok(!(await readFile(file, 'utf8')).includes(slug));
  }
  results.push(
    'Draft/future pages excluded from routes, RSS, sitemap, series and related projects',
  );
  browser = await chromium.launch({
    ...(process.platform === 'win32' ? { channel: 'msedge' } : {}),
    headless: true,
  });
  const context = await browser.newContext({
    permissions: ['clipboard-read', 'clipboard-write'],
    viewport: { width: 360, height: 900 },
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4321/blog/');
  assert.equal(await page.locator('.post-row').count(), 10);
  await page.getByRole('link', { name: '다음 →', exact: true }).click();
  assert.equal(
    await page.locator('.post-row').count(),
    Math.min(10, expectedPublicCount - 10),
  );
  await page.goto(
    'http://127.0.0.1:4321/blog/categories/%EA%B2%80%EC%A6%9D%EC%9A%A9/',
  );
  assert.equal(await page.locator('.post-row').count(), 10);
  results.push(
    `${expectedPublicCount} public posts paginate correctly; category pagination generated`,
  );
  await page.goto('http://127.0.0.1:4321/blog/verification-fixture-0/');
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    ),
    false,
  );
  await page.getByRole('button', { name: '코드 복사' }).click();
  await page
    .getByRole('button', { name: '코드 복사' })
    .filter({ hasText: '복사됨' })
    .waitFor();
  assert.ok(
    (await page.evaluate(() => navigator.clipboard.readText())).includes(
      'System.out.println',
    ),
  );
  await page.getByRole('link', { name: '코드 확인', exact: true }).click();
  assert.ok(page.url().includes('#'));
  results.push(
    'Mobile long code/table stay contained; code copy, Markdown image and heading link work',
  );
  await page.goto('http://127.0.0.1:4321/blog/');
  const hiddenCounts = await page.evaluate(async () => {
    const engine = await import('/pagefind/pagefind.js');
    // Inspect the whole index: fuzzy search may return unrelated public posts.
    const indexed = await engine.search(null);
    const documents = await Promise.all(indexed.results.map((r) => r.data()));
    return ['draftsentinel', 'futuresentinel', 'publicsentinel'].map(
      (sentinel) =>
        documents.filter((doc) => doc.content.includes(sentinel)).length,
    );
  });
  assert.deepEqual(hiddenCounts, [0, 0, 11]);
  results.push(
    'Search indexes 11 temporary public posts and zero draft/future posts',
  );
  console.log(results.join('\n'));
} finally {
  await browser?.close();
  for (const file of created) await unlink(file);
  build();
  await mkdir('.qa', { recursive: true });
  await writeFile(
    '.qa/publication-report.json',
    JSON.stringify(results, null, 2),
  );
}
