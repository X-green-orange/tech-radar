# 每周深度解析：草稿与 PR 契约

北京时间每周日 16:00 执行。读取公开仓库 `X-green-orange/tech-radar` 中带 `deep-dive-ready` 标签且仍开放的 GitHub Issues，按创建时间从早到晚选择一条。若没有待写 Issue，保持安静，不创建空稿。

以该 Issue 的用户选题为边界，检索官方文档、代码、论文与可核查实测，写一篇充分展开机制、同类比较和应用选型的中文深度解析。遵守 `prompts/article.md` 的客观写法，正文保持来源就近引用。

在独立 worktree 的分支中创建 `src/content/deep-dives/<slug>.md`，frontmatter 写 `issue` 编号。运行 `npm run validate`、`npm run build` 和 `node scripts/check-sources.mjs src/content/deep-dives/<slug>.md`，检查来源是否直接支持正文后推送分支，创建指向 `main` 的 PR，标题包含选题名称与 Issue 编号。把 Issue 从 `deep-dive-ready` 改为 `deep-dive-review` 并附 PR 链接。严禁自行合并该 PR；等待用户审稿。

在本机 Windows 环境若 `gh` 不在当前进程的 PATH，使用 `C:\Program Files\GitHub CLI\gh.exe`；不要因为命令查找失败而改用网页自动操作授权。

任何检查失败、Issue 内容不足或 GitHub 身份验证失败时停止并报告，不发布、不改变 Issue 标签。
