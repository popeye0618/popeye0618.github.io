import { readdir, rename, rmdir } from 'node:fs/promises';
import path from 'node:path';
// Astro emits directory-format pages. Old .html URLs must remain actual files on Pages.
const root = path.resolve('dist');
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (!entry.isDirectory() || !entry.name.endsWith('.html')) continue;
  const directory = path.resolve(root, entry.name);
  if (path.dirname(directory) !== root)
    throw new Error('Legacy output escaped dist');
  const temporary = directory + '.migration';
  await rename(path.join(directory, 'index.html'), temporary);
  await rmdir(directory); // Empty directory only; never recursively remove output.
  await rename(temporary, directory);
}
