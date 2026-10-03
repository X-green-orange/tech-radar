# 每日技术雷达：内容与发布契约

北京时间每天 20:00 执行。读取仓库已有日报、文章和 `prompts/article.md`，检索过去 72 小时的 AI Agent、LLM 应用与开发工具变化。

## 发现与筛选

1. 以北京时间运行时刻向前 72 小时为常规窗口，记录每条候选的原始发布时间、来源、具体变化和可访问的直达链接。官方入口至少检查 [GitHub Changelog](https://github.blog/changelog/)、[OpenAI News](https://openai.com/news/)、[Anthropic News](https://www.anthropic.com/news)、[Google AI Blog](https://blog.google/technology/ai/)、[Hugging Face Blog](https://huggingface.co/blog)。这些入口用于导航，卡片应链接到具体发布页。
2. 检查相关项目的 `https://github.com/<owner>/<repo>/releases`、`https://github.com/<owner>/<repo>/pulls?q=is%3Apr+is%3Amerged` 和仓库提交记录；论文从 [arXiv cs.AI recent](https://arxiv.org/list/cs.AI/recent)、[arXiv cs.CL recent](https://arxiv.org/list/cs.CL/recent)、[OpenReview](https://openreview.net/) 与 [Hugging Face Daily Papers](https://huggingface.co/papers) 发现，正文回到论文原页核查。
3. 用 [GitHub Trending 今日榜](https://github.com/trending?since=daily)、[本周榜](https://github.com/trending?since=weekly)、[Hacker News](https://news.ycombinator.com/) 和相关 Reddit 社区发现讨论候选。热度只决定核查顺序；逐项核对最近 72 小时是否有实质 Release、已合并 PR、论文或官方公告。累计 Stars、单纯登榜和转帖都不是事件。
4. 对延续七天内旧事件的话题，明确今天新增的官方证据。合并转载、同一产品变化及无实质差异的小版本；检索 `src/content/daily/` 的标题、来源 URL 和事件内容，避免重复报道。
5. 每条候选以 0–3 分记录相关性、变化实质性、开发者可用性、来源质量四项；总分至少 8 分且来源质量至少 2 分才可入选。优先呈现对 Agent/LLM 开发实践有明确影响的变化；没有合格事件时少写或不发布，不凑数。

## 写稿

- 在 `src/content/daily/YYYY-MM-DD.md` 写一份日报。所有条目在同一列表，不分重点和简讯。
- 每张卡片有具体变化标题、发布日期、类型、发生了什么、为什么值得看、标签、直达原始资料的 HTTPS 链接。不得把论文作者主张写成独立验证结论。
- 从当天最值得展开且有足够资料的事件中选一条，在 `src/content/articles/` 写一篇约 1200–1800 字中文长文，按照 `prompts/article.md` 执行。卡片的 `article` 字段必须指向实际存在的文章 ID；其余卡片直接链接来源。
- 文章和日报日期使用北京时间。若没有适合长文的当日事件，只发布日报，并在运行报告中说明。
- 不要加入防御性写作，也不伪造本站详情链接。

## 校验与上线

运行 `npm run validate` 和 `npm run build`。`scripts/publish-daily.ps1` 会检查本期来源链接可达性；还须人工核对每个来源是否直接支持相关句子，以及重复和时间窗口。失败时保留草稿并报告，不发布。

在独立 worktree 中工作，确认只改动本期日报与关联长文后执行 `./scripts/publish-daily.ps1 -Date YYYY-MM-DD`。脚本只允许快进推送到 `main`，不可强制推送或覆盖其他工作。发布后报告提交和 Pages 构建状态。
