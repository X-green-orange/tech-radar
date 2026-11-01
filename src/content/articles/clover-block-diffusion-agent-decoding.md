---
title: "Clover 开放块扩散模型：代码 Agent 多了一条并行解码路线"
date: "2026-11-01"
summary: "从块内去噪、历史状态与置信度阈值，理解 Clover 和 Qwen、Dream 的具体差异，以及当前可用实现的边界。"
tags: ["扩散模型", "Agent", "开放权重"]
daily: "2026-11-01"
sources:
  - label: "DiffuSpace 发布公告"
    url: "https://huggingface.co/blog/Diffuspace/clover-35b-a3b-preview"
  - label: "Clover 模型卡"
    url: "https://huggingface.co/Diffuspace/Clover-35B-A3B-Preview"
  - label: "官方代码仓库"
    url: "https://github.com/DiffuSpace/Clover-35B-A3B-Preview"
  - label: "Qwen3.6 官方模型卡"
    url: "https://huggingface.co/Qwen/Qwen3.6-35B-A3B"
  - label: "HKU NLP Dream 技术说明"
    url: "https://hkunlp.github.io/blog/2025/dream/"
---

代码 Agent 一次任务往往反复读取、生成、执行，再根据结果继续修改。模型生成这一环如果能同时推进多个位置，就有机会缩短每轮等待。10 月 30 日，DiffuSpace 发布 Clover-35B-A3B-Preview，把块扩散引入 35B 总参数、约 3B 激活参数的 MoE 模型，并开放权重和调用实现。这次发布关注的是扩散模型在代码与工具任务中的扩展，而代码执行和结果检查仍由应用框架承担。[发布公告](https://huggingface.co/blog/Diffuspace/clover-35b-a3b-preview)

## 一块文本怎样逐步完成

可以把生成过程想成填写一小段带空位的文本。Clover 先放入一块掩码，再同时预测其中的位置；可信度足够高的位置先确定，余下位置继续计算，完成后把整块接到已有前缀后面。这样，块内能参考两个方向的线索，块与块之间仍按顺序前进。

这里有两个工作区：已经确定的历史，以及正在反复修改的当前块。团队介绍，历史通过 Gated DeltaNet 的循环状态压缩，块内使用双向 softmax attention；历史读出与当前 token 一起参与权重分配，并通过可学习校准减轻块长变化对历史注意力的影响。它要解决的是历史利用和块内并行之间的协调。[机制说明](https://huggingface.co/blog/Diffuspace/clover-35b-a3b-preview)

实际接口也给出可检查的规则：Transformers 实现默认块长 32、置信度阈值 0.95。超过阈值的位置会被填入；若没有位置通过，就选择最有把握的一个，保证生成继续。这意味着并行度会随内容变化，块大小本身并不等于每次确定的 token 数量。[解码规则](https://huggingface.co/Diffuspace/Clover-35B-A3B-Preview)

## 与 Qwen、Dream 的差别在哪里

Clover 的骨干来自 Qwen3.6-35B-A3B。Qwen 官方模型是带视觉编码器的因果语言模型，同样使用混合 GDN、注意力和 MoE；它还提供多步预测组件。Clover 则是纯文本模型，新增支持噪声块双向交互的参数。因而两者共有稀疏专家计算，但输入能力、生成过程与上下文规格都有差别，接入时需要分别检查。[Qwen 模型规格](https://huggingface.co/Qwen/Qwen3.6-35B-A3B) · [Clover 架构](https://huggingface.co/Diffuspace/Clover-35B-A3B-Preview)

另一条参照是 Dream 7B。Dream 已展示从掩码序列迭代恢复文本、利用双向上下文的路线，也研究了从自回归权重初始化的方法。Clover 延续扩散生成思路，但将其放到更大的 MoE 混合骨干中，并明确划分因果历史和当前块。对开发者来说，可比较的重点是每轮计算如何利用前缀、怎样确定输出位置，以及任务完成所需的总时间。[Dream 原始技术说明](https://hkunlp.github.io/blog/2025/dream/)

两种路线都可以生成代码，支持这些能力并不能直接决定框架里的效果。适合的对照方式是固定仓库任务、工具权限和停止条件，分别记录补丁通过情况、模型生成时间、工具等待和重试次数。这样才能看出解码变化影响了哪一段流程。

## 现有实现适合怎样接入

当前可从官方模型卡的 Transformers 示例开始，检查聊天模板、思考模式和生成配置。总上下文为 128K，包含提示与回复；BF16 权重约需 69GB 显存，另需推理状态空间。约 3B 激活参数描述每次计算使用的专家规模，部署仍要为完整权重安排存储和显存。[模型卡与资源要求](https://huggingface.co/Diffuspace/Clover-35B-A3B-Preview)

官方仓库把 SGLang 列为服务与评测路线，列出块扩散和自推测解码；llama.cpp 列为本地自推测解码路线。不过当前 README 仍说明后端代码与设置指南将补充，SFT 说明也标为待发布。因此，现阶段应先围绕已给出的实现组织验证，再决定服务部署安排。[仓库交付状态](https://github.com/DiffuSpace/Clover-35B-A3B-Preview)

一个直接场景是补丁生成：选取可自动测试的小型修复任务，记录首个可用补丁和最终通过测试的耗时。接着可扩展到工具调用密集的助理，观察短回复与长推理是否得到相同收益；工具本身耗时较长时，模型生成加速对整轮任务的影响也会缩小。最后，可将同一任务集用于内部模型服务选择，把硬件占用、并发吞吐和成功率一起纳入判断。这三步共享任务与日志，能逐步回答块扩散在实际 Agent 中是否值得接入。
