import rss from '@astrojs/rss';
import { publicPosts } from '../lib/content';
import type { APIContext } from 'astro';
export async function GET(context: APIContext) {
  return rss({
    title: '천승환의 개발 기록',
    description: '서비스를 개발하고 운영하며 배운 내용과 기술 학습 기록',
    site: context.site!,
    customData: '<language>ko</language>',
    items: (await publicPosts()).map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: new Date(p.data.publishedAt + 'T00:00:00+09:00'),
      link: `/blog/${p.data.slug}/`,
    })),
  });
}
