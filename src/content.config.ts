import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const metric = z.object({
  key: z.string(),
  label: z.string(),
  value: z.string(),
  context: z.string(),
  source: z.string().optional(),
});
const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    slug,
    title: z.string(),
    summary: z.string(),
    order: z.number(),
    role: z.string(),
    kind: z.string(),
    theme: z.enum(['matching', 'football', 'photo']),
    technologies: z.array(z.string()),
    repository: z.url(),
    team: z.string().optional(),
    periods: z
      .array(
        z.object({
          label: z.string(),
          start: z.string(),
          end: z.string().optional(),
          status: z.enum(['ongoing', 'unconfirmed']).optional(),
        }),
      )
      .default([]),
    metrics: z.array(metric),
    highlight: z.string(),
  }),
});
const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    slug,
    title: z.string(),
    description: z.string(),
    publishedAt: z.string(),
    updatedAt: z.string().optional(),
    category: z.string(),
    tags: z.array(z.string()),
    draft: z.boolean().default(true),
    series: slug.optional(),
    seriesTitle: z.string().optional(),
    seriesOrder: z.number().int().positive().optional(),
    relatedProjects: z.array(slug).default([]),
  }),
});
export const collections = { projects, posts };
