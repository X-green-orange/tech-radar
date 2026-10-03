import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const source = z.object({
  label: z.string().min(1),
  url: z.string().url(),
});

const daily = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/daily' }),
  schema: z.object({
    title: z.string(),
    date: z.string(),
    summary: z.string(),
    tags: z.array(z.string()).min(1),
    items: z.array(z.object({
      title: z.string(),
      type: z.string(),
      published: z.string(),
      summary: z.string(),
      value: z.string(),
      tags: z.array(z.string()).min(1),
      sources: z.array(source).min(1),
      article: z.string().optional(),
    })).min(1),
  }),
});

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    date: z.string(),
    summary: z.string(),
    tags: z.array(z.string()).min(1),
    daily: z.string(),
    sources: z.array(source).min(1),
  }),
});

const deepDives = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/deep-dives' }),
  schema: z.object({
    title: z.string(),
    date: z.string(),
    summary: z.string(),
    tags: z.array(z.string()).min(1),
    issue: z.number().int().positive(),
    sources: z.array(source).min(1),
  }),
});

export const collections = { daily, articles, 'deep-dives': deepDives };
