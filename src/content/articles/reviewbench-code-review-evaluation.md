---
title: "ReviewBench 开放评测：把代码审查 Agent 的发现能力与评论噪声分开看"
date: "2026-10-06"
summary: "从真实 PR、参考问题与新增发现，到容器接入和分层指标，理解 ReviewBench 如何帮助团队选择审查配置。"
tags: ["Agent", "代码审查", "评测"]
daily: "2026-10-06"
sources:
  - label: "GitHub 官方发布"
    url: "https://github.blog/ai-and-ml/github-copilot/reviewbench-an-open-benchmark-for-ai-code-review/"
  - label: "ReviewBench 官方仓库"
    url: "https://github.com/review-bench/ReviewBench"
  - label: "ReviewBench 方法文档"
    url: "https://github.com/review-bench/ReviewBench/blob/main/docs/METHODOLOGY.md"
  - label: "ReviewBench Agent 接入契约"
    url: "https://github.com/review-bench/ReviewBench/blob/main/AGENT_CONTRACT.md"
  - label: "Code Review Bench 官方仓库"
    url: "https://github.com/withmartian/code-review-benchmark"
  - label: "SWE-bench 官方文档"
    url: "https://www.swebench.com/SWE-bench/"
---

GitHub 于 10 月 5 日开放 ReviewBench 研究预览。代码审查 Agent 既要发现遗漏，也要控制无效评论；只比较评论数量，难以判断它是否帮助开发者。此次发布把真实 PR、参考问题和统一评测工具开放，使模型、检索和提示词的变化能够放到同一批任务上比较。[官方发布](https://github.blog/ai-and-ml/github-copilot/reviewbench-an-open-benchmark-for-ai-code-review/)

## 参考答案怎样建立

完整集合包含 219 个 PR，来自 187 个仓库；另有 25 个任务的测试子集。仓库保存 base、head 提交及镜像，保证上游历史变化后仍可重现输入。测试子集适合检查适配器是否正常，全量集合用于评价配置；正式榜单运行三轮，再经维护者审核。[数据与流程](https://github.com/review-bench/ReviewBench)

每条 finding 表示一个具体问题，而非整段审查报告。参考问题来自人工评论、后续修改、静态工具和多种模型，先按底层问题去重，再用共同规则标注并经人工审查。候选评论与参考问题做语义匹配：文字和行号可以不同，同一行上的不同问题也不能自动算命中。[方法文档](https://github.com/review-bench/ReviewBench/blob/main/docs/METHODOLOGY.md)

grounded 指标只使用既有参考标签，适合跨系统比较；augmented 指标还让裁判检查未匹配的发现，为有效新问题计分。由于新增发现会改变各自的召回率分母，跨系统主比较使用 grounded recall。按严重性和类别切分后，团队可以观察系统是否以低价值评论换取覆盖率，而不是只看一个总分。[指标定义](https://github.com/review-bench/ReviewBench/blob/main/docs/METHODOLOGY.md)

这里的可重复性也包括统计口径：按 PR 平均反映典型任务表现，汇总全部问题后计算则反映典型问题的表现。二者可能因大型 PR 含有更多问题而不同。评测还独立报告审查时长，不将速度混入质量分数。裁判的判断受标注规则影响，保留类别、严重性和作用范围等标签，能让团队按自己的审查要求重新筛选，并对有争议的标签提交具体代码证据。[统计与反馈机制](https://github.com/review-bench/ReviewBench/blob/main/docs/METHODOLOGY.md)

## 与其他评测路线的差异

这些路线都追求可重复评价，但交付对象不同：

| 路线 | 主要对象 | 对开发决策的用途 |
|---|---|---|
| ReviewBench | 固定 PR 上的问题发现与误报 | 比较审查配置，观察已知问题覆盖与有效新增发现 |
| Code Review Bench | 固定样本审查及新鲜 PR 上的后续修改 | 同时检查离线能力与评论在实际工作中的采用情况 |
| SWE-bench | 根据仓库 issue 生成修复补丁 | 检查编码 Agent 能否完成修复任务 |

Code Review Bench 的离线集包括五个项目的 50 个 PR 与 173 条人工核验参考评论，也使用语义匹配和可调整的精确率、召回率权重。其在线路线持续采样 PR，将机器评论与开发者后续修改关联。ReviewBench 则提供更广的固定仓库集合和新问题判定。前者便于追踪采用行为，后者便于保持输入不变做配置实验；实际采用还受到团队习惯和工作流程影响。[Code Review Bench](https://github.com/withmartian/code-review-benchmark)

SWE-bench 给出 issue 与代码库，以测试检查生成补丁是否解决问题。它回答修复任务能否完成，ReviewBench 回答问题能否被发现并清楚表达。部署“审查后自动修复”的工作流时，两类评价可以分别覆盖发现阶段和修改阶段。[SWE-bench 文档](https://www.swebench.com/SWE-bench/)

## 怎样接入现有 Agent

ReviewBench 每个 PR 启动新容器，挂载仓库、diff、标题和描述，读取输出 JSON 中的文件、行范围和问题说明。适配器应把每个逻辑问题写为一条 finding，校验 head 与 PR 编号；截断 JSON 或缺少文件会导致任务失败。运行环境默认每个 PR 限时 15 分钟，只允许声明的 HTTPS 主机，无 GPU，本地开放模型需通过托管推理接口调用。[接入契约](https://github.com/review-bench/ReviewBench/blob/main/AGENT_CONTRACT.md)

团队可以先保持模型不变，对比只读 diff 与读取相关代码的配置，检查上下文是否减少误报；再保持输入不变，更换模型或推理预算，比较严重问题覆盖和延迟。选择候选配置后，在自己的仓库跟踪评论采用和漏报，并将失败样例加入回归集。这是依据其评测机制形成的应用流程，目的在于把离线调参与真实工作反馈连接起来。

上线前还可单独检查安全与可靠性类别，避免总体平均分掩盖重点场景。正式结果应记录数据、裁判和配置版本；调参时审查与裁判推理由参与者承担，最终提交由 ReviewBench 承担裁判费用，审查 Agent 的模型调用仍由参与者承担。[接入与费用说明](https://github.com/review-bench/ReviewBench)
