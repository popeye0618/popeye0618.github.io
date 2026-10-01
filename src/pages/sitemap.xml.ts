import { publicPosts, projects } from '../lib/content';
import type { APIContext } from 'astro';
export async function GET(context: APIContext) {
  const posts = await publicPosts();
  const paths = new Set([
    '/',
    '/projects/',
    '/resume/',
    '/blog/',
    ...(await projects()).map((p) => `/projects/${p.data.slug}/`),
    ...posts.map((p) => `/blog/${p.data.slug}/`),
  ]);
  const groups = new Map<string, number>();
  groups.set('/blog/', posts.length);
  for (const p of posts) {
    const keys = [
      `/blog/categories/${encodeURIComponent(p.data.category.toLowerCase())}/`,
      ...new Set(
        p.data.tags.map(
          (t) => `/blog/tags/${encodeURIComponent(t.toLowerCase())}/`,
        ),
      ),
    ];
    if (p.data.series) keys.push(`/blog/series/${p.data.series}/`);
    for (const key of keys) groups.set(key, (groups.get(key) ?? 0) + 1);
  }
  for (const [base, count] of groups) {
    paths.add(base);
    for (let n = 2; n <= Math.ceil(count / 10); n++)
      paths.add(`${base}page/${n}/`);
  }
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...paths].map((path) => `<url><loc>${new URL(path, context.site).href}</loc></url>`).join('')}</urlset>`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
}
