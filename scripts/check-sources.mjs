import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const files = process.argv.slice(2);
if (!files.length) {
  console.error('用法: node scripts/check-sources.mjs <Markdown 文件> [...]');
  process.exit(2);
}

const links = new Map();
for (const filename of files) {
  const absolute = path.resolve(filename);
  if (!fs.existsSync(absolute)) throw new Error(`文件不存在: ${filename}`);
  const { data, content } = matter(fs.readFileSync(absolute, 'utf8'));
  const sources = [...(data.sources ?? []), ...(data.items ?? []).flatMap((item) => item.sources ?? [])];
  for (const source of sources) {
    if (source.url) links.set(source.url, filename);
  }
  for (const match of content.matchAll(/\[[^\]]+\]\((https:\/\/[^)]+)\)/g)) links.set(match[1], filename);
}

let failures = 0;
for (const [url, filename] of links) {
  try {
    const parsed = new URL(url);
    const release = parsed.hostname === 'github.com' && parsed.pathname.match(/^\/([^/]+)\/([^/]+)\/releases\/tag\/(.+)$/);
    const checkUrl = release
      ? `https://api.github.com/repos/${release[1]}/${release[2]}/releases/tags/${encodeURIComponent(decodeURIComponent(release[3]))}`
      : url;
    const response = await fetch(checkUrl, {
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'Agent-Tech-Radar-Link-Check/1.0' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (release) {
      const data = await response.json();
      if (data.html_url !== url) throw new Error('Release API 返回的地址与来源链接不一致');
    } else await response.body?.cancel();
    console.log(`✓ ${response.status} ${url}`);
  } catch (error) {
    failures++;
    console.error(`✗ ${filename}: ${url} (${error.message})`);
  }
}
if (failures) process.exit(1);
console.log(`✓ ${links.size} 个来源链接可达`);
