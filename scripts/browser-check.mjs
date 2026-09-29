import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('.qa', { recursive: true });
const browser = await chromium.launch({
  ...(process.platform === 'win32' ? { channel: 'msedge' } : {}),
  headless: true,
});
const report = { screens: [], search: [], errors: [], print: false };
const context = await browser.newContext({
  baseURL: 'http://127.0.0.1:4321',
  permissions: ['clipboard-read', 'clipboard-write'],
});
const page = await context.newPage();
page.on('pageerror', (error) => report.errors.push(error.message));
const paths = [
  '/',
  '/projects/',
  '/projects/comatching/',
  '/projects/comatching-fc/',
  '/projects/harucut/',
  '/resume/',
  '/blog/',
  '/blog/comatching-participant-cache/',
];
for (const width of [360, 768, 1440]) {
  await page.setViewportSize({ width, height: 1000 });
  for (const route of paths) {
    const response = await page.goto(route);
    await page.evaluate(() => document.fonts.ready);
    if (response.status() !== 200)
      report.errors.push(`${width} ${route}: ${response.status()}`);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    );
    if (overflow) report.errors.push(`${width} ${route}: horizontal overflow`);
    if (
      route === '/' ||
      route === '/blog/' ||
      route === '/projects/comatching/'
    ) {
      const file = `.qa/${route === '/' ? 'home' : route === '/blog/' ? 'blog' : 'project'}-${width}.png`;
      await page.screenshot({ path: file, fullPage: true });
      report.screens.push(file);
    }
  }
}
await page.goto('/');
await page.getByRole('button', { name: '밝은 테마로 전환' }).click();
if ((await page.locator('html').getAttribute('data-theme')) !== 'light')
  report.errors.push('theme toggle failed');
await page.reload();
if ((await page.locator('html').getAttribute('data-theme')) !== 'light')
  report.errors.push('theme persistence failed');
await page.screenshot({ path: '.qa/home-light.png', fullPage: true });
await page.getByRole('button', { name: '어두운 테마로 전환' }).click();
await page.goto('/blog/');
for (const term of ['캐시', 'Spring', 'SQL', '작업', 'zzzzunlikelynotfound']) {
  await page.getByRole('searchbox').fill(term);
  await page.waitForFunction(
    () =>
      !['검색 중…', '제목과 본문에서 찾아보세요.'].includes(
        document.querySelector('#search-status').textContent,
      ),
  );
  const status = await page.locator('#search-status').innerText();
  const count = await page.locator('#search-results a').count();
  report.search.push({ term, status, count });
  if (term !== 'zzzzunlikelynotfound' && count === 0)
    report.errors.push(`Search failed: ${term}`);
  if (term === 'zzzzunlikelynotfound' && count !== 0)
    report.errors.push('Empty search failed');
}
await page.route('**/pagefind/pagefind.js', (route) => route.abort());
await page.reload();
await page.getByRole('searchbox').fill('캐시');
await page.waitForFunction(() =>
  document.querySelector('#search-status').textContent.includes('불러오지'),
);
await page.unroute('**/pagefind/pagefind.js');
for (const route of [
  '/02_comatching5.html',
  '/deepdive_socket_01.html',
  '/blog/tags/spring/',
  '/blog/series/comatching-performance/',
]) {
  const response = await page.goto(route);
  if (response.status() !== 200)
    report.errors.push(`Deep link ${route}: ${response.status()}`);
}
await page.goto('/resume/');
await page.emulateMedia({ media: 'print' });
await page.pdf({ path: '.qa/resume.pdf', format: 'A4', printBackground: true });
report.print = true;
await page.emulateMedia({ media: 'screen' });
await page.goto('/');
await page.keyboard.press('Tab');
if (
  !(await page.locator('.skip').evaluate((el) => el === document.activeElement))
)
  report.errors.push('Skip link not first keyboard target');
await browser.close();
await writeFile('.qa/browser-report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (report.errors.length) process.exitCode = 1;
