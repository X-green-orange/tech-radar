---
title: "ColGrep-Agent 将代码探索交给本地小模型：少传上下文，多一次委派"
date: "2026-10-13"
summary: "LightOn 公布本地代码检索 Agent 的接入方式与委派实验，展示语义检索、有限工具循环和主模型分工如何改变成本与延迟。"
tags: ["Agent", "代码检索", "本地模型"]
daily: "2026-10-13"
sources:
  - label: "LightOn 官方技术文章"
    url: "https://huggingface.co/blog/lightonai/colgrep-agent"
  - label: "ColGrep 官方仓库"
    url: "https://github.com/lightonai/next-plaid"
  - label: "ripgrep 官方仓库"
    url: "https://github.com/BurntSushi/ripgrep"
---

编码 Agent 修复问题前，常要先猜符号名、搜索文件、追踪引用。每次工具返回都会进入对话，下一轮又把累积上下文送给主模型。LightOn 在 10 月 12 日公布的 ColGrep-Agent 方案将这段探索交给本地专用模型，让主模型直接收到文件路径、行号和相关代码。它定位于代码搜索，主模型继续负责理解问题与修改代码。[官方发布](https://huggingface.co/blog/lightonai/colgrep-agent)

## 从检索结果到可交接的代码位置

三个组件承担不同职责：ColGrep 是语义搜索工具，ColGrep-Agent-2B 是专用模型，`colgrep --agent` 是运行模型与工具循环的命令。搜索底层使用约 1700 万参数的 LateOn-Code-edge，以多个 token 向量表示代码，进行查询与代码之间的晚交互匹配。它能把“自定义属性”这类行为描述匹配到命名为 `fieldDefinition` 的实现，还支持正则和路径过滤。NextPlaid 将索引保存在本地，文件变化后增量更新。[机制与代码入口](https://github.com/lightonai/next-plaid)

小模型只有三个工具：语义检索、只读终端、提交位置的 `finish`。它先搜索，再打开候选文件、追踪引用；十轮预算的最后一轮强制提交。结果采用 `文件:起始行-结束行`，附带代码，便于主模型继续核对。训练从 MiniCPM5-2B 开始，先学习教师探索轨迹，再用强化学习优化文件和行号重合度，并惩罚冗长探索。训练与发布命令使用相同工具定义和回合预算，使学习目标对应实际交接格式。[工具循环与训练说明](https://huggingface.co/blog/lightonai/colgrep-agent)

## 词法搜索、语义搜索和委派探索

[ripgrep](https://github.com/BurntSushi/ripgrep) 按正则匹配文本，并遵守忽略文件规则；已知符号、错误字符串或配置键时，它能直接找出候选。单独使用 ColGrep 则让主模型以自然语言检索，但仍由主模型判断结果、读文件和追踪关系。ColGrep-Agent 在相同检索工具上增加本地决策循环，先筛选和核对，再交回少量位置。三种路线的差别包括查询匹配方式，以及探索过程由哪个模型承担。[官方对照实验](https://huggingface.co/blog/lightonai/colgrep-agent)

LightOn 用 13 个仓库的 52 道代码搜索题比较四种配置，每题每配置运行三次，共 624 场会话。Claude Code 使用 Sonnet 5.5，作者以参考位置和模型裁判评估答案。纯委派平均 API token 从每题约 14.2 万降至 9.3 万，减少 34.3%；计入缓存的 API 费用从 7.3 美分降至 4.4 美分。计数不包含本地小模型的生成 token，费用也不包括本地设备成本。[实验设计与表格](https://huggingface.co/blog/lightonai/colgrep-agent)

节省主要来自主模型回合减少：平均由 5.5 轮降至 3.9 轮。不过平均端到端时间由 13.0 秒升至 21.6 秒，观测正确率由 83.3% 变为 80.8%。混合模式允许主模型在普通 ColGrep 与委派之间选择，正确率为 83.3%，token 节省 21.2%，耗时 17.7 秒。这组结果对应代码搜索题；实际接入时应分别考察定位完整性、修改成功率和等待时间。[结果与延迟](https://huggingface.co/blog/lightonai/colgrep-agent)

检索输出的粒度也会改变下游负担。在作者的 Semble 文件级测试中，普通 ColGrep 平均返回 9.8 个文件，Agent 返回 1.7 个；对应召回率为 0.966 和 0.887。这意味着主模型阅读量减少，同时可能缺少关联位置。跨文件修复需要额外核对接口定义、调用方和测试，尤其是问题要求找齐完整引用链时。作者的正确答案判定也要求跨目录问题找齐全部参考位置。[文件级检索对照](https://huggingface.co/blog/lightonai/colgrep-agent)

## 怎样进入开发流程

遇到陌生仓库中的行为问题，可以先委派：“空配置文件为什么触发崩溃？”小模型负责找实现和引用，主模型拿到行号后再检查调用边界、修改并运行测试。对于已知函数名或确定的错误文本，词法搜索通常足以缩小范围；混合模式保留这种直接路径，减少每个问题都先启动本地探索的等待。

批量工单分流也适合这种分工：先将问题定位到模块，再把证据交给后续诊断与修复步骤。评价时可记录遗漏关联文件的比例，避免只用输出长度衡量检索质量。对代码不能离开设备的检索环节，本地索引与推理可承担探索；交给远端主模型的代码仍需按团队的数据发送规则处理。

安装后先运行 `colgrep init` 建立索引，再选择 Claude Code、Codex 或 OpenCode 集成。Claude Code 的 hook 提供工具建议，是否调用仍由主模型决定。默认 Q8 模型下载约 2.5 GB，可使用 GPU，缺少支持时回退 CPU；作者在 M3 Pro 上给出的单题时间约 20 秒、峰值内存约 3–4 GB，部署选择需要与本地硬件和交互节奏一起评估。[安装与集成](https://huggingface.co/blog/lightonai/colgrep-agent)
