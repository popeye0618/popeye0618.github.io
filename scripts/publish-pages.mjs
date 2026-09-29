import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  writeFileSync,
  unlinkSync,
  rmdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = process.cwd();
const git = (args, options = {}) =>
  execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' },
    ...options,
  }).trim();
if (
  !/github\.com[:/]popeye0618\/popeye0618\.github\.io(?:\.git)?$/.test(
    git(['remote', 'get-url', 'origin']),
  )
) {
  throw new Error('Unexpected publishing repository');
}
if (git(['status', '--porcelain']))
  throw new Error('Commit source changes before publishing');
const output = path.join(root, 'dist');
if (!existsSync(path.join(output, 'index.html')))
  throw new Error('Run the checked build first');
git(['fetch', 'origin', 'gh-pages']);
const parent = git(['rev-parse', 'refs/remotes/origin/gh-pages']);
const source = git(['rev-parse', '--short', 'HEAD']);
const scratch = mkdtempSync(path.join(tmpdir(), 'portfolio-pages-'));
try {
  const env = { ...process.env, GIT_INDEX_FILE: path.join(scratch, 'index') };
  const stage = (args) =>
    git(
      [
        '--git-dir=' + path.join(root, '.git'),
        '--work-tree=' + output,
        '-c',
        'core.autocrlf=false',
        '-c',
        'user.name=popeye0618',
        '-c',
        'user.email=popeye0618@gmail.com',
        ...args,
      ],
      { cwd: output, env },
    );
  writeFileSync(path.join(output, '.nojekyll'), '');
  stage(['read-tree', '--empty']);
  stage(['add', '--all']);
  const tree = stage(['write-tree']);
  const commit = stage([
    'commit-tree',
    tree,
    '-p',
    parent,
    '-m',
    `Publish portfolio from ${source}`,
  ]);
  git(['push', 'origin', `${commit}:refs/heads/gh-pages`]);
  console.log(
    `Published ${commit}. Check GitHub Pages build status before announcing deployment.`,
  );
} finally {
  // Only the temporary index created by this invocation is removed.
  for (const name of ['index', 'index.lock']) {
    const file = path.join(scratch, name);
    if (existsSync(file)) unlinkSync(file);
  }
  rmdirSync(scratch);
}
