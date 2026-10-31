---
title: "Copilot Fusion 正式可用：把选模型与复核流程交给运行时"
date: "2026-10-31"
summary: "Fusion 合并自动模型选择与 HydraFusion 编排；结合单模型、升级和评审三种流程，理解它与 LangGraph、AutoGen 的差异及代码任务中的使用方式。"
tags: ["Agent", "模型路由", "开发工具"]
daily: "2026-10-31"
sources:
  - label: "Fusion 正式发布公告"
    url: "https://github.blog/changelog/2026-10-28-route-and-orchestrate-models-with-github-copilot-fusion/"
  - label: "Fusion 机制文档"
    url: "https://docs.github.com/en/copilot/concepts/models/copilot-fusion"
  - label: "HydraFusion 原始技术说明"
    url: "https://github.blog/ai-and-ml/github-copilot/project-hydrafusion-frontier-quality-via-multi-model-orchestration/"
  - label: "Auto 模型选择文档"
    url: "https://docs.github.com/en/copilot/concepts/models/auto-model-selection"
  - label: "LangGraph 工作流文档"
    url: "https://docs.langchain.com/oss/python/langgraph/workflows-agents"
  - label: "AutoGen SelectorGroupChat 文档"
    url: "https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/selector-group-chat.html"
---

GitHub 在 10 月 28 日的公告中宣布 Copilot Fusion 正式可用，对应北京时间 10 月 29 日。它把此前的 Auto 模型选择和 HydraFusion 多模型编排汇入同一入口。开发者在选择器中启用 Fusion，再选 Standard、High 或 Max，运行时决定模型及执行方式。首批覆盖 VS Code、Copilot 应用、CLI 和 JetBrains，组织管理员可以限定可用模型。[发布公告](https://github.blog/changelog/2026-10-28-route-and-orchestrate-models-with-github-copilot-fusion/)

## 从选择模型到选择执行过程

自动路由需要处理两类变化：任务复杂度和服务可用性。Copilot 的 Auto 文档描述了依据任务与实时健康状态选模型的机制，并在自然缓存边界、会话复杂度明显变化时调整路由，以减少无收益的缓存开销。这解释了为什么连续对话中，选择模型还要考虑已有上下文的复用成本。[Auto 文档](https://docs.github.com/en/copilot/concepts/models/auto-model-selection)

Fusion 在这个基础上还选择执行流程。Single 由一个模型完成；Cascade 先让成本较低的模型尝试，由评判步骤决定接受还是升级；Critique 则增加独立评审，再由原模型修订。现行文档描述的 Critique 可并行汇总多个评审模型的意见。同一会话的不同请求可以走不同流程，简单修改不必固定经过完整评审链。[Fusion 机制](https://docs.github.com/en/copilot/concepts/models/copilot-fusion)

这种选择也改变了成本的统计单位。一次用户请求可能包含起草、评审、修订或升级，使用费用需要覆盖所有分支。HydraFusion 原始设计还要求每一步有超时与取消行为，评审放在隔离的无工具上下文中，执行模型沿用工作区权限；取消或校验失败时不应用补丁。它让复核过程可以参与推理，同时控制对仓库的直接写入。[HydraFusion 技术说明](https://github.blog/ai-and-ml/github-copilot/project-hydrafusion-frontier-quality-via-multi-model-orchestration/)

## 与 LangGraph、AutoGen 分别怎样比较

路由和多模型协作已有通用开发接口。LangGraph 文档用结构化输出决定下一节点，再通过条件边进入专门流程；也提供编排器拆任务、工作节点执行和汇总结果的模式。开发者可以明确表达自己的路径和状态，适合把业务校验写成图节点。Fusion 提供的是已经接入代码助手的运行时决策，使用者主要通过投入档位和模型策略影响它。选择取决于是否需要自行定义整个流程。[LangGraph 官方示例](https://docs.langchain.com/oss/python/langgraph/workflows-agents)

AutoGen 的 SelectorGroupChat 围绕参与者组织协作：模型读取共享会话和角色描述，选择下一个发言者，结果广播给团队，再检查结束条件。开发者能覆盖选择函数或缩小候选集合，也能保留或重置上下文。它更适合明确设置规划、检索、分析等角色的应用。Fusion 的三个模式描述的是一个请求如何分配推理和复核；两者共有动态调度能力，但调度对象与开发者需要维护的接口不同。[AutoGen 文档](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/selector-group-chat.html)

## 把变化放回实际代码任务

日常维护可以从有明确验收条件的小改动开始，例如修正命令参数、补文档例子或处理局部类型错误。团队可固定任务集，记录一次请求是否完成、测试是否通过、需要几轮追问，以及所有模型调用的总费用。这个对照能判断自动选择是否减少了人工切换，也能识别评审步骤带来的等待。

复杂迁移可接着使用同样的记录方式。把接口替换、调用点修改和回归检查放入同一任务，观察较高投入档位能否减少返工；保留代码差异和测试结果作为验收依据。涉及权限或持久数据的改动，还应将允许动作和人工审查位置写进任务约束，让模型选择与操作授权各有明确入口。

对于自建 Agent，Fusion 提供了可以拆开验证的设计参考：先实现简单请求直达，再加入失败后的升级，最后检查独立评审是否改善结果。三种流程应在相同输入、工具权限和验收条件下比较，记录成功率、端到端耗时和总调用成本。团队由此可以决定哪些步骤值得保留，并让实际工作负载决定编排复杂度。
