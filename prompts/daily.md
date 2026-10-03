# 每日技术雷达：内容与发布契约

北京时间每天 20:00 执行。读取仓库已有日报、文章和 `prompts/article.md`，检索过去 72 小时的 AI Agent、LLM 应用与开发工具变化。

## 发现与筛选

1. 检查官方产品更新、GitHub Releases 和已合并的重要 PR、arXiv/OpenReview、Hugging Face Daily Papers。用 GitHub Trending、Hacker News、Reddit 发现候选，但事实须回到原始发布、代码或论文。
2. 对热榜项目核查最近 72 小时的实际发布或合并变化。累计 Stars 不是新闻。
3. 合并转载与连续小版本；检查已有 `src/content/daily/`，同一事件不重复报道。持续发酵的话题可回看七天，但本期必须有新证据。
4. 按相关性、变化实质性、开发者可用性和证据质量排序。没有合格事件时少写，不凑数。

## 写稿

- 在 `src/content/daily/YYYY-MM-DD.md` 写一份日报。所有条目在同一列表，不分重点和简讯。
- 每张卡片有具体变化标题、发布日期、类型、发生了什么、为什么值得看、标签、直达原始资料的 HTTPS 链接。不得把论文作者主张写成独立验证结论。
- 从当天最值得展开且有足够资料的事件中选一条，在 `src/content/articles/` 写一篇约 1200–1800 字中文长文，按照 `prompts/article.md` 执行。卡片的 `article` 字段必须指向实际存在的文章 ID；其余卡片直接链接来源。
- 文章和日报日期使用北京时间。若没有适合长文的当日事件，只发布日报，并在运行报告中说明。
- 不要加入防御性写作，也不伪造本站详情链接。

## 校验与上线

运行 `npm run validate` 和 `npm run build`。检查每个来源是否能打开、是否直接支持相关句子，核对重复与时间窗口。失败时保留草稿并报告，不发布。

在独立 worktree 中工作，确认只改动本期日报与关联长文后执行 `./scripts/publish-daily.ps1 -Date YYYY-MM-DD`。脚本只允许快进推送到 `main`，不可强制推送或覆盖其他工作。发布后报告提交和 Pages 构建状态。
