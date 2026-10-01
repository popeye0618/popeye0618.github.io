import test from 'node:test';
import assert from 'node:assert/strict';
import { isPublished, validDate } from '../src/lib/publication.mjs';
import { validate } from '../scripts/validate-content.mjs';
test('Korean midnight publishes on the boundary, never before', () => {
  const data = { draft: false, publishedAt: '2026-09-28' };
  assert.equal(isPublished(data, new Date('2026-09-27T14:59:59Z')), false);
  assert.equal(isPublished(data, new Date('2026-09-27T15:00:00Z')), true);
});
test('drafts, missing status and invalid dates stay unpublished', () => {
  for (const data of [
    { draft: true, publishedAt: '2020-01-01' },
    { publishedAt: '2020-01-01' },
    { draft: false, publishedAt: '2026-02-30' },
  ])
    assert.equal(isPublished(data), false);
  assert.equal(validDate('2024-02-29'), true);
  assert.equal(validDate('2025-02-29'), false);
});
test('duplicate slugs and dangling project references fail validation', () => {
  const data = {
    slug: 'hello',
    title: 'Hello',
    description: 'desc',
    publishedAt: '2026-09-28',
    draft: false,
    category: '기록',
    tags: [],
    relatedProjects: ['missing'],
  };
  const errors = validate(
    [],
    [
      { file: 'a.md', data },
      { file: 'b.md', data },
    ],
  );
  assert.ok(errors.some((e) => e.includes('duplicate slug')));
  assert.ok(errors.some((e) => e.includes('unknown project')));
});
test('series ordering conflicts are rejected before routes are built', () => {
  const data = {
    slug: 'one',
    title: 'One',
    description: 'desc',
    publishedAt: '2026-09-28',
    draft: false,
    category: '기록',
    tags: [],
    relatedProjects: [],
    series: 'test',
    seriesTitle: 'Test',
    seriesOrder: 1,
  };
  assert.ok(
    validate(
      [],
      [
        { file: 'a', data },
        { file: 'b', data: { ...data, slug: 'two' } },
      ],
    ).some((e) => e.includes('conflicting series')),
  );
});
