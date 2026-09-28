import { getCollection } from 'astro:content';
import { isPublished } from './publication.mjs';
export async function publicPosts() {
  return (await getCollection('posts'))
    .filter((p) => isPublished(p.data))
    .sort(
      (a, b) =>
        b.data.publishedAt.localeCompare(a.data.publishedAt) ||
        a.data.slug.localeCompare(b.data.slug),
    );
}
export async function projects() {
  return (await getCollection('projects')).sort(
    (a, b) => a.data.order - b.data.order,
  );
}
export function dateLabel(date: string) {
  return date.replaceAll('-', '.');
}
