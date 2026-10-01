import { readdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { load } from 'cheerio';
const root = path.resolve('dist');
const files = (await readdir(root, { recursive: true })).filter((f) =>
  f.endsWith('.html'),
);
const errors = [];
for (const file of files) {
  const $ = load(await readFile(path.join(root, file), 'utf8'));
  const current = '/' + file.replaceAll('\\', '/').replace(/index\.html$/, '');
  for (const node of $('[href],[src]').toArray()) {
    const raw = $(node).attr('href') ?? $(node).attr('src');
    if (!raw || /^(mailto:|tel:|data:|https?:\/\/|\/\/)/.test(raw)) continue;
    const url = new URL(raw, 'https://popeye0618.github.io' + current);
    let target = decodeURIComponent(url.pathname);
    if (target.endsWith('/')) target += 'index.html';
    const local = path.join(root, target);
    try {
      await access(local);
      if (url.hash && local.endsWith('.html')) {
        const targetDoc = load(await readFile(local, 'utf8'));
        const id = decodeURIComponent(url.hash.slice(1));
        if (
          !targetDoc('[id]')
            .toArray()
            .some((n) => targetDoc(n).attr('id') === id)
        )
          errors.push(`${file}: missing anchor ${raw}`);
      }
    } catch {
      errors.push(`${file}: missing ${raw}`);
    }
  }
}
if (errors.length) {
  console.error([...new Set(errors)].join('\n'));
  process.exitCode = 1;
} else
  console.log(
    `Validated local links, assets and anchors in ${files.length} pages.`,
  );
