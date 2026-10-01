import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ ...(process.platform === 'win32' ? { channel: 'msedge' } : {}), headless: true });
const report = [];
try {
  // Measure settled colors; do not sample midway through the theme transition.
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  for (const theme of ['light', 'dark']) {
    for (const route of ['/', '/projects/comatching/', '/resume/', '/blog/', '/blog/comatching-participant-cache/']) {
      await page.goto('http://127.0.0.1:4321' + route);
      await page.evaluate(value => document.documentElement.dataset.theme = value, theme);
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      report.push({ theme, route, violations: result.violations });
    }
  }
} finally { await browser.close(); }
await mkdir('.qa', { recursive: true });
await writeFile('.qa/accessibility.json', JSON.stringify(report, null, 2));
console.log(report.map(item => `${item.theme} ${item.route}: ${item.violations.length} violations`).join('\n'));
if (report.some(item => item.violations.length)) process.exitCode = 1;
