---
title: "ThinkingBox 接入 OpenEnv：用后台终态与重复运行检查 Agent 是否完成任务"
date: "2026-10-04"
summary: "隔离业务环境、检查实际副作用，并区分偶尔成功与持续成功。"
tags: ["Agent", "评测", "MCP"]
daily: "2026-10-04"
sources:
  - label: "Microsoft 与 Hugging Face 联合发布"
    url: "https://huggingface.co/blog/microsoft/thinkingbox"
  - label: "OpenEnv ThinkingBox 文档"
    url: "https://huggingface.co/docs/openenv/environments/thinkingbox"
  - label: "τ³-bench 官方仓库"
    url: "https://github.com/sierra-research/tau2-bench"
  - label: "OSWorld 官方仓库"
    url: "https://github.com/xlang-ai/OSWorld"
---

10 月 3 日，Microsoft 与 Hugging Face 介绍了 ThinkingBox 在 OpenEnv 中的评测接入。它让开发者把业务 Agent 放进隔离的 MCP 工具环境，再检查执行后留下的数据库状态。此次更新提供统一接口和运行入口，承接已有的 ThinkingBox 沙箱与基准，而不是重新发布一篇新论文。[联合发布](https://huggingface.co/blog/microsoft/thinkingbox)

发布材料给出一个售后案例：Agent 查订单、查物流、读退款政策并创建工单，工具调用都正常结束，最终却把仍需等待物流处理的工单标为已解决。回复看起来完整，后台状态却错误。ThinkingBox 因此将完成条件落到字段值、必要变更和额外副作用，避免仅用对话或调用格式判断业务是否结束。[案例与评测机制](https://huggingface.co/blog/microsoft/thinkingbox)

每个任务包含初始后台、用户目标、工具、业务规则和可执行检查。模拟用户掌握部分私有信息，在被询问时提供；Agent 需要完成交互，再执行正确操作。每次尝试获得独立 MCP 会话和重新初始化的状态，评分端提取实际变更并检查终态。标准答案、断言、凭据和评分内部信息留在环境侧，模型只看任务、对话与公开工具。这样既可接受不同的正确执行路径，也能识别错改、漏改和多改。[OpenEnv 文档](https://huggingface.co/docs/openenv/environments/thinkingbox)

ThinkingBox-Bench 的发布评测包含 507 个任务，每任务独立运行 20 次。三个指标回答不同问题：pass@1 观察一般尝试的成功情况，pass@20 观察是否至少成功过一次，实测 20/20 则统计所有记录尝试均成功的任务。最后一项是有限实验中的一致性记录，不能解释为未来执行必然成功。论文团队还把单次成功成本与整轮重复运行的成本分别计算，使模型选择同时考虑能力、稳定性和预算。[指标定义](https://huggingface.co/blog/microsoft/thinkingbox)

结果判定也保留了语言需求的位置。公开材料中，477 个任务仅依靠状态评分，另有 30 个任务增加回复规则，例如是否向用户说明某项条件。这使数据库字段与沟通义务可以共同进入完成标准。基准里的客户和业务流程是合成重建，采用模型化的企业规则；将它迁移到本地业务时，需要重新定义政策与断言，而不是照搬公开任务的答案。[任务构成](https://huggingface.co/blog/microsoft/thinkingbox)

这种终态评测与 τ-bench 系列有共同基础：模拟用户、领域规则和业务工具共同构成任务，流畅对话只是执行过程的一部分。当前 τ³-bench 已覆盖文本与全双工语音模式，并增加知识检索域，适合考察客服沟通、检索和工具使用的组合。ThinkingBox 此次接入更集中于隔离 MCP 会话、后台副作用提取和重复运行组织。两者可以围绕同类业务问题设计实验，但任务域、工具与评分口径不同，不能直接比较排行榜数字。[τ³-bench 仓库](https://github.com/sierra-research/tau2-bench)

OSWorld 则把任务放在真实桌面应用环境中，提供虚拟机、截图、动作记录和任务评估。它与 ThinkingBox 都要求检查实际结果，差异在交互表面：前者适合桌面软件操作，后者适合由 MCP 暴露的后台业务系统。若任务要跨越网页与数据库，两类环境可分别检查界面操作和记录变化，减少用一种评测代表完整工作流的偏差。[OSWorld 仓库](https://github.com/xlang-ai/OSWorld)

接入 OpenEnv 后，可信评测程序可通过 reset、工具发现、工具调用和消息提交驱动一次任务，最后得到二元通过结果。当前适配器用于评测，标准成绩需要固定的公开数据版本。服务镜像只启动 OpenEnv API，Session Proxy、MCP 服务、Typesense 以及 Agent、模拟用户和评分模型端点需要另行启动。health 表示进程存活，ready 也不能替代对所有外部依赖的检查；基础设施错误应单独记录，避免混入模型能力统计。[部署边界](https://huggingface.co/docs/openenv/environments/thinkingbox)

复现实验时还应区分资料入口：Hugging Face 数据集便于浏览，GitHub 的固定发布版本提供可执行任务。并发尝试使用独立环境实例，不能共用一条会话的数据库状态。保留框架版本、数据版本、运行配置和错误记录，才能判断分数变化来自 Agent、任务修订还是部署失败。[数据与会话边界](https://huggingface.co/docs/openenv/environments/thinkingbox)

在售后自动化中，可以先选退款、延迟配送与工单流转三类流程，定义应改变和不应改变的字段，再重复运行同一初始状态，查看状态误写是否集中在政策分支。更换模型或工具封装后，也可复用这些任务做回归，比较成功率与额外副作用。进一步接入真实业务之前，还可用隔离场景比较错误恢复策略，观察重试是否修复失败或产生重复记录。这些是环境支持的实验方向，具体收益需要在团队自己的任务上测量。[运行示例与实验入口](https://huggingface.co/blog/microsoft/thinkingbox)
