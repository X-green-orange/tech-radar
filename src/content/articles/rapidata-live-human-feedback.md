---
title: "Rapidata Flows：把实时人工偏好接进 Flow-GRPO 训练循环"
date: "2026-10-05"
summary: "从图片组的两两比较到组内优势，理解在线人工反馈与奖励模型、离线 DPO 的具体差异。"
tags: ["后训练", "RLHF", "开发工具"]
daily: "2026-10-05"
sources:
  - label: "Rapidata Flows 接入说明"
    url: "https://huggingface.co/blog/Rapidata/live-human-feedback-in-the-training-loop-aligning"
  - label: "Flow-GRPO 原论文"
    url: "https://arxiv.org/abs/2505.05470"
  - label: "Diffusion-DPO 原论文"
    url: "https://arxiv.org/abs/2311.12908"
---

10 月 2 日，Rapidata 发布了一套将实时人工偏好接入视觉生成模型后训练的示例。它以 Flow-GRPO 为基础，把通常由奖励模型完成的打分环节换成人工比较服务 Flows：模型生成一组图片，标注者按指定标准比较，服务返回评分，训练程序再据此更新参数。此次材料的具体价值是给出可接入现有训练循环的接口和调度方式。[接入说明](https://huggingface.co/blog/Rapidata/live-human-feedback-in-the-training-loop-aligning)

奖励模型可以快速处理大量输出，但其学习到的偏好来自既有数据。随着生成策略变化，新输出可能逐渐偏离奖励模型熟悉的分布。Rapidata 希望在训练过程中持续收集人对当前样本的判断，让反馈与正在更新的策略保持联系。开发者仍需确定标注目标：视觉美感、提示词遵循和领域正确性对应不同问题，不能只用一句“哪张更好”替代具体任务标准。[问题与实现](https://huggingface.co/blog/Rapidata/live-human-feedback-in-the-training-loop-aligning)

流程从同一提示词生成多个候选开始。Flows 将图片组拆为两两比较，使用 Bradley–Terry 模型汇总投票，为每张图片产生类似 Elo 的评分。训练端在组内减去平均分，再除以标准差，得到相对优势：高于本组平均水平的输出获得正向信号，较差输出获得负向信号。绝对评分的大小因此不是核心，组内相对关系才是更新所需的信息。[评分流程](https://huggingface.co/blog/Rapidata/live-human-feedback-in-the-training-loop-aligning)

接口也围绕这个流程组织。训练开始前创建并复用一个 ranking flow，每次将图片组提交为 batch；图片可以通过 URL 或本地路径传入，生成提示词可作为标注上下文。示例设置 180 秒的反馈期限，调用 `get_results()` 会等待该组完成或期限到达，再返回已收集的结果。不同组可以异步并行提交，已生成的组先启动标注，不必等整个训练批次生成结束。[接口示例](https://huggingface.co/blog/Rapidata/live-human-feedback-in-the-training-loop-aligning)

它与 Flow-GRPO 的关系是反馈来源的替换。Flow-GRPO 为 flow matching 模型引入在线策略梯度训练，并通过 ODE 到 SDE 的转换支持探索，再用减少训练去噪步数的方式提高采样效率。Rapidata 示例保留生成、组内优势和策略更新的组织方式，将评分交给人工服务。采用该方案仍要准备可运行的训练实现、样本生成与参数更新，标注 API 负责的是偏好信号。[Flow-GRPO 论文](https://arxiv.org/abs/2505.05470) · [接入说明](https://huggingface.co/blog/Rapidata/live-human-feedback-in-the-training-loop-aligning)

Diffusion-DPO 则提供另一种路线：直接用人类比较数据优化扩散模型，通过适配扩散似然的目标函数学习偏好，无需先训练独立奖励模型。其原论文使用既有 Pick-a-Pic 比较数据微调 SDXL。两者都能利用人工偏好；具体区别在于，Diffusion-DPO 的这个实验以预先收集的数据训练，而 Flows 示例在训练中对当前生成的候选请求新反馈。已有优质偏好数据的团队可以从前者起步，需要持续校准新输出的团队则可考虑后者的在线组织方式。[Diffusion-DPO 论文](https://arxiv.org/abs/2311.12908) · [Flows 示例](https://huggingface.co/blog/Rapidata/live-human-feedback-in-the-training-loop-aligning)

在线反馈会把标注服务带宽引入训练调度。Rapidata 用每轮 48 组、每组 24 张图片举例，按每组 150 次比较、三分钟期限估算，需要每分钟约 2,400 次响应；这是作者的容量估算。另一种安排是在生成下一批图片时收集上一批反馈，以减少 GPU 等待，但也增加了反馈与当前参数之间的时间差。实施时可一起记录反馈覆盖率、等待时间和策略版本，判断吞吐量是否符合训练计划。[调度与带宽说明](https://huggingface.co/blog/Rapidata/live-human-feedback-in-the-training-loop-aligning)

并行训练还涉及服务访问的组织方式。Rapidata 提醒，大量 GPU worker 同时独立认证可能触发集中刷新令牌和限流，建议由协调进程完成认证，再让 worker 共享访问凭据。对训练工程而言，反馈结果也应与提示词、候选图片和生成批次关联保存；当组内差异很小、投票不足或期限先到时，这些记录有助于分析优势信号的来源，再决定是否调整每组响应数量与等待期限。这是沿着接口流程提出的工程设计。[分布式接入说明](https://huggingface.co/blog/Rapidata/live-human-feedback-in-the-training-loop-aligning)

这些机制可以串成逐步扩展的应用流程。先在小规模风格 LoRA 中确定评价标准，用同一提示词的候选比较检查偏好信号是否稳定；再将提示词加入标注上下文，处理商品细节或构图要求，让评分兼顾美感与条件遵循；当训练规模扩大时，按生成速度分批提交图片组，并监控反馈截止时已有多少有效比较。以上是基于接口机制的应用设计，核心是把生成、标注与更新的节奏一起规划。[实现依据](https://huggingface.co/blog/Rapidata/live-human-feedback-in-the-training-loop-aligning)
