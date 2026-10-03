import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const root = path.resolve('src/content');
const issues = [];
const readCollection = (name) => {
  const dir = path.join(root, name);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((name) => name.endsWith('.md')).map((name) => {
    const file = path.join(dir, name);
    const parsed = matter(fs.readFileSync(file, 'utf8'));
    return { id: name.slice(0, -3), file, ...parsed };
  });
};
const dailies = readCollection('daily');
const articles = readCollection('articles');
const dives = readCollection('deep-dives');
const fail = (entry, message) => issues.push(`${path.relative(process.cwd(), entry.file)}: ${message}`);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (value) => typeof value === 'string' && datePattern.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
const validSources = (entry, sources) => {
  if (!Array.isArray(sources) || sources.length === 0) return fail(entry, '至少需要一个原始来源');
  for (const source of sources) {
    if (!source?.label || !source?.url) { fail(entry, '来源需要 label 和 url'); continue; }
    try { if (new URL(source.url).protocol !== 'https:') fail(entry, `来源必须使用 HTTPS: ${source.url}`); }
    catch { fail(entry, `无效来源 URL: ${source.url}`); }
  }
};
const common = (entry) => {
  if (!entry.data.title || !entry.data.summary) fail(entry, '缺少标题或摘要');
  if (!validDate(entry.data.date)) fail(entry, '日期必须是 YYYY-MM-DD');
  if (!Array.isArray(entry.data.tags) || !entry.data.tags.length) fail(entry, '至少需要一个标签');
  if (!entry.content.trim()) fail(entry, '正文不能为空');
};
const ids = new Set();
const seenEventSources = new Map();
for (const daily of dailies) {
  common(daily);
  if (daily.id !== daily.data.date) fail(daily, '文件名必须与日期一致');
  if (ids.has(daily.id)) fail(daily, '重复日报日期');
  ids.add(daily.id);
  if (!Array.isArray(daily.data.items) || !daily.data.items.length) { fail(daily, '至少需要一张卡片'); continue; }
  for (const item of daily.data.items) {
    if (!item.title || !item.type || !item.summary || !item.value || !validDate(item.published)) fail(daily, '卡片缺少必要字段');
    if (!Array.isArray(item.tags) || !item.tags.length) fail(daily, `卡片 ${item.title} 缺少标签`);
    validSources(daily, item.sources);
    if (validDate(item.published) && validDate(daily.data.date)) {
      const lag = (Date.parse(`${daily.data.date}T00:00:00Z`) - Date.parse(`${item.published}T00:00:00Z`)) / 86400000;
      if (lag < 0 || lag > 3) fail(daily, `卡片 ${item.title} 不在近 72 小时日期范围内`);
    }
    const eventUrl = item.sources?.[0]?.url;
    if (eventUrl) {
      const old = seenEventSources.get(eventUrl);
      if (old) fail(daily, `原始事件已在 ${old} 报道: ${eventUrl}`);
      seenEventSources.set(eventUrl, daily.id);
    }
    if (item.article && !articles.some((a) => a.id === item.article)) fail(daily, `关联长文不存在: ${item.article}`);
  }
}
for (const article of articles) {
  common(article);
  validSources(article, article.data.sources);
  if (!dailies.some((d) => d.id === article.data.daily)) fail(article, `关联日报不存在: ${article.data.daily}`);
}
for (const dive of dives) {
  common(dive);
  validSources(dive, dive.data.sources);
  if (!Number.isInteger(dive.data.issue) || dive.data.issue < 1) fail(dive, '需要有效的 Issue 编号');
}
if (issues.length) { for (const issue of issues) console.error(`✗ ${issue}`); process.exit(1); }
console.log(`✓ 内容校验通过：${dailies.length} 期日报、${articles.length} 篇长文、${dives.length} 篇深度解析`);
