import type { CollectionEntry } from 'astro:content';

export const base = '/tech-radar';
export const href = (path = '') => `${base}/${path.replace(/^\/+/, '')}`;
export const articleHref = (id: string) => href(`articles/${id}/`);
export const dailyHref = (id: string) => href(`daily/${id}/`);
export const diveHref = (id: string) => href(`deep-dives/${id}/`);
export const tagHref = (tag: string) => href(`tags/${encodeURIComponent(tag)}/`);

export const byDate = <T extends { data: { date: string } }>(entries: T[]) =>
  [...entries].sort((a, b) => b.data.date.localeCompare(a.data.date));

export type Daily = CollectionEntry<'daily'>;
export type Article = CollectionEntry<'articles'>;
