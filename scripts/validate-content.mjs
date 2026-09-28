import { readdir, readFile } from 'node:fs/promises';
import matter from 'gray-matter';
import { validDate } from '../src/lib/publication.mjs';
export function validate(projects, posts) {
  const errors = [];
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  for (const [name, items] of [
    ['projects', projects],
    ['posts', posts],
  ]) {
    const seen = new Set();
    for (const item of items) {
      const d = item.data;
      if (!slugPattern.test(d.slug ?? ''))
        errors.push(`${item.file}: invalid slug`);
      if (seen.has(d.slug)) errors.push(`${name}: duplicate slug ${d.slug}`);
      seen.add(d.slug);
      if (!d.title) errors.push(`${item.file}: missing title`);
    }
  }
  const projectIds = new Set(projects.map((p) => p.data.slug));
  const series = new Map();
  for (const { data: d, file } of posts) {
    if (['page', 'tags', 'categories', 'series'].includes(d.slug))
      errors.push(`${file}: reserved slug`);
    if (!validDate(d.publishedAt)) errors.push(`${file}: invalid publishedAt`);
    if (d.updatedAt && (!validDate(d.updatedAt) || d.updatedAt < d.publishedAt))
      errors.push(`${file}: invalid updatedAt`);
    if (typeof d.draft !== 'boolean')
      errors.push(`${file}: draft must be explicit`);
    if (!d.description || !d.category || !Array.isArray(d.tags))
      errors.push(`${file}: missing metadata`);
    for (const value of [d.category, ...(d.tags ?? [])])
      if (typeof value !== 'string' || !value.trim() || /[\/#?%]/.test(value))
        errors.push(`${file}: invalid category/tag`);
    for (const id of d.relatedProjects ?? [])
      if (!projectIds.has(id)) errors.push(`${file}: unknown project ${id}`);
    if (d.series) {
      if (
        !slugPattern.test(d.series) ||
        !d.seriesTitle ||
        !Number.isInteger(d.seriesOrder) ||
        d.seriesOrder < 1
      )
        errors.push(`${file}: incomplete series`);
      const current = series.get(d.series) ?? {
        title: d.seriesTitle,
        orders: new Set(),
      };
      if (current.title !== d.seriesTitle || current.orders.has(d.seriesOrder))
        errors.push(`${file}: conflicting series metadata`);
      current.orders.add(d.seriesOrder);
      series.set(d.series, current);
    } else if (d.seriesTitle || d.seriesOrder)
      errors.push(`${file}: series id required`);
  }
  return errors;
}
export async function entries(dir) {
  const files = await readdir(dir, { recursive: true });
  return Promise.all(
    files
      .filter((file) => file.endsWith('.md'))
      .map(async (file) => ({
        file,
        data: matter(await readFile(`${dir}/${file}`, 'utf8')).data,
      })),
  );
}
if (
  process.argv[1]
    ?.replaceAll('\\', '/')
    .endsWith('/scripts/validate-content.mjs')
) {
  const errors = validate(
    await entries('src/content/projects'),
    await entries('src/content/posts'),
  );
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else console.log('Content metadata, slugs and references validated.');
}
