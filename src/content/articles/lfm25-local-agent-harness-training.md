---
title: "LFM2.5-24B-A2B：把本地模型训练成能接入实际框架的 Agent"
date: "2026-10-14"
summary: "LiquidAI 将纯文本推理、低活跃参数和框架内强化学习结合，提供本地工具调用模型；部署选择仍取决于权重内存、模态和任务表现。"
tags: ["Agent", "本地推理", "后训练"]
daily: "2026-10-14"
sources:
  - label: "LiquidAI 发布与实验"
    url: "https://huggingface.co/blog/LiquidAI/lfm25-24b-a2b"
  - label: "LFM2.5 官方模型卡"
    url: "https://huggingface.co/LiquidAI/LFM2.5-24B-A2B"
  - label: "Qwen3.6 官方模型卡"
    url: "https://huggingface.co/Qwen/Qwen3.6-35B-A3B"
  - label: "Gemma 4 官方模型卡"
    url: "https://huggingface.co/google/gemma-4-26B-A4B-it"
  - label: "LiquidAI 本地 Agent 接入指南"
    url: "https://docs.liquid.ai/examples/agent-harnesses"
---

LiquidAI 在北京时间 10 月 14 日发布 LFM2.5-24B-A2B 的技术介绍与开放权重。它面向设备上的多步工具任务：先生成推理过程，再调用工具，读取返回结果后继续执行。模型卡列出 24B 总参数、2.45B 活跃参数和 131072 token 上下文。发布中的“2B”是活跃规模的简写；加载与存储仍要考虑全部权重，不能按一个总计 2B 的模型估算内存。[官方模型卡](https://huggingface.co/LiquidAI/LFM2.5-24B-A2B)

这次变化延续了 LFM2 的混合结构：40 层中有 30 个双门控短卷积块与 10 个 GQA 块，MoE 每块包含 64 个专家、选择 4 个。上下文从 32K 扩至约 131K，词表从 65K 扩至 128K。模型变成始终推理的纯文本版本，聊天模板直接添加 `<think>` 起始标记。计算量较小有利于连续生成，但完成一次任务的等待时间还取决于推理长度、输入处理和工具响应。[结构与训练说明](https://huggingface.co/blog/LiquidAI/lfm25-24b-a2b)

后训练把模型放入实际 Agent 运行框架。流程先做 SFT 与教师专门化，再分别对非 Agent 和 Agent 任务进行多领域 on-policy 蒸馏，最后在 OpenClaw、Hermes、Pi、OpenCode 内做强化学习，让训练覆盖工具、系统提示和交互模式。接入时仍需应用执行工具：模型默认输出由特殊标记包围的 Python 风格函数列表，也可通过系统提示要求 JSON；执行器解析调用、执行函数，再以 tool 角色回传结果。选择后端时要检查这些输出能否被正确解析。[工具调用与训练流程](https://huggingface.co/LiquidAI/LFM2.5-24B-A2B)

低活跃参数与工具能力在同类模型中已有多种路线。Qwen3.6-35B-A3B 有 35B 总参数、3B 活跃参数，结合 Gated DeltaNet 与注意力，并支持视觉输入、原生 262144 token 上下文和历史推理保留。Gemma 4 的 26B A4B 指令版本采用局部与全局注意力，模型卡列出 25.2B 总参数、3.8B 活跃参数、256K 上下文及文本和图像输入。三者都可承担推理和工具工作；LFM 的差异集中在短卷积混合结构、更低的活跃规模，以及公开说明的框架内后训练。需要直接读截图时，两个视觉模型有相应入口；选 LFM 则需将视觉任务交给其他工具。[Qwen 模型卡](https://huggingface.co/Qwen/Qwen3.6-35B-A3B)、[Gemma 模型卡](https://huggingface.co/google/gemma-4-26B-A4B-it)

LiquidAI 的统一实验也显示了任务差异。其 vLLM 评测表中，LFM 在 ToolSandbox 为 80.71，Qwen 为 75.02；在 OpenCode 的 SWE-bench Verified 中，两者分别为 51.00 和 66.20。前者偏向带状态的工具执行，后者检验仓库修复。因此，开发者可以分别建立业务工具集与代码任务集，按完成率、重试次数和总耗时选择模型，而不是用单一榜单代替工作流测试。发布方报告的 M5 Max 184 token/s 是特定设备的解码结果，B300 超过 21K 输出 token/s 是高并发吞吐，两者对应不同的服务目标。[发布方实验表与速度说明](https://huggingface.co/blog/LiquidAI/lfm25-24b-a2b)

部署路径是先启动 OpenAI 兼容服务，再配置 Agent 的 base URL、模型 ID 和上下文。模型卡提供 GGUF、MLX、FP8 等格式，分别覆盖 llama.cpp、Apple Silicon 和 GPU 服务。官方指南给出 Hermes、OpenClaw 与 Pi 的接入方式。调整量化和实际服务窗口可以控制内存；窗口越大，历史与缓存的开销越值得测量。对知识密集的任务，模型卡建议结合检索或网页工具。[部署指南](https://docs.liquid.ai/examples/agent-harnesses)

本地服务与工具执行也有不同的数据边界。模型在设备上运行，意味着输入不必交给远端模型服务；如果它调用云端搜索、邮件或业务接口，相关参数仍会离开设备。应用可以把本地文件检索与远端查询分成不同工具，让调用记录说明每一步访问了什么。接入测试则应覆盖参数缺失、工具超时、空结果和重复调用，观察模型是否继续推进、修改参数，或把失败当成成功。这是围绕工具执行设计的验收，而不是再测一次普通问答。

应用可以从边界明确的本地任务起步。例如，内部文档助手先检索文件，再由模型调用查询工具组织答案；桌面工作流在同一服务上读取日历或整理文件，把敏感输入留在本地推理环节；代码助手则可让本地模型先定位文件和运行限定命令，按任务表现决定是否交给更强模型继续修改。三个场景都可以先提供只读工具，再逐步开放有结果检查的写入操作。文档任务检查引用是否对应原文，文件任务检查目标路径与变更清单，代码任务检查差异和测试结果。实际接入的验收重点是工具参数、状态更新和任务产物，并同时记录端到端延迟与设备占用，才能判断模型是否适合长期运行。
