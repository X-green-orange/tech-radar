# Agent 技术雷达

面向中文读者的 Agent、LLM 与开发工具简报。网站预期地址：[X-green-orange.github.io/tech-radar](https://X-green-orange.github.io/tech-radar/)。

## 本地运行

需要 Node.js 24。执行 `npm ci`、`npm run dev`；提交前运行 `npm run validate` 和 `npm run build`。

日报保存在 `src/content/daily/YYYY-MM-DD.md`，长文保存在 `src/content/articles/`，经审稿的每周深度解析保存在 `src/content/deep-dives/`。添加新稿时参照 `prompts/` 中的编辑规范。日报卡片的 `article` 字段只有在对应长文实际存在时才填写。

## 发布

主分支 `main` 的推送触发 GitHub Actions 构建并部署到 GitHub Pages。首次建仓后，在仓库 Settings → Pages 将 Source 设为 GitHub Actions。

每日定时任务在独立 worktree 中生成日报与长文，验证通过后运行 `./scripts/publish-daily.ps1 -Date YYYY-MM-DD`。脚本不会强制推送；远端有新提交时须重新基于最新 `main` 生成。每周深度解析来自 `deep-dive-ready` Issue，作为 PR 等待人工审稿。

本机日程为北京时间每天 20:00 和周日 16:00；运行时需要电脑开机、Codex 桌面应用保持运行且 GitHub CLI 已登录。可通过仓库的「每周深度解析选题」Issue 模板提出主题。日程失败时不会改写已有内容或强制推送。连续运行验收完成前，不启用云端自动发稿。

本站仓库仅存放计划公开的内容。不要提交私有数据、API 密钥、模型文件或内部实验记录。
