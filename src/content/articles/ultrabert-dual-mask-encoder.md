---
title: "UltraBERT 开放双掩码编码器：让分类与检索共享骨干、分开学习目标"
date: "2026-10-15"
summary: "UltraBERT 通过低、高掩码分支的独立训练头和选择性蒸馏，缓解分类与检索训练目标的冲突，并提供英语 32K 编码器和可直接使用的向量模型。"
tags: ["RAG", "模型", "检索"]
daily: "2026-10-15"
sources:
  - label: "DMIS Lab 官方发布与消融"
    url: "https://huggingface.co/blog/dmis-lab/ultrabert"
  - label: "UltraBERT-150M 模型卡"
    url: "https://huggingface.co/dmis-lab/UltraBERT-150M"
  - label: "UltraBERT-Embed-150M 模型卡"
    url: "https://huggingface.co/dmis-lab/UltraBERT-Embed-150M"
  - label: "ModernBERT 官方模型卡"
    url: "https://huggingface.co/answerdotai/ModernBERT-base"
  - label: "Ettin 官方模型卡"
    url: "https://huggingface.co/jhu-clsp/ettin-encoder-150m"
---

DMIS Lab 在 10 月 14 日开放 UltraBERT：150M 和 380M 两档英语双向编码器，以及可直接生成向量的 UltraBERT-Embed-150M，均采用 Apache 2.0 许可，支持 32K 上下文。它面向一次读取文本后输出标签、分数或向量的任务，适合放在生成模型前后承担检索和筛选。[发布说明](https://huggingface.co/blog/dmis-lab/ultrabert)将改进重点放在预训练配方：同一个骨干怎样同时学好分类与检索。

作者先检查了继续增加训练量的作用。在这组实验里，编码器的下游成绩约在 1–2T token 后趋于饱和，即使损失继续下降，继续训练到 8.8T 也未带来相应提升。随后改变掩码比例，发现较低比例更有利于分类，较高比例更有利于检索。低比例保留较完整上下文，高比例要求从更少线索恢复文本，两者对表示的要求不同。这些发现来自作者的规模与任务设置，为配方选择提供了实验依据。[实验与消融](https://huggingface.co/blog/dmis-lab/ultrabert)

直接把两种比例混起来仍会冲突。UltraBERT 在每批数据中按 4:1 混合 5% 和 50% 掩码序列，共享编码器，却为两个分支各设一个 LM 输出头。作者观察到，两类训练产生的输入嵌入相近，输出头几何却不同；让各分支分别预测，可以减少通过同一输出层回传的干扰。150M 消融中，混合样本使用共享头时 GLUE 为 88.9、BEIR 为 44.7，分头后为 89.4 和 45.1。[配方说明](https://huggingface.co/blog/dmis-lab/ultrabert)

蒸馏同样按分支处理。模型从 1.3B 教师逐步剪枝得到较小骨干，但两档学生都直接接受 1.3B 教师监督；低掩码分支使用 KL 蒸馏，高掩码分支保留普通 MLM 损失。其原因是作者发现高掩码条件下蒸馏会降低检索成绩。发布的基础检查点包含共享编码器和低掩码 MLM 头，高掩码头未包含在内；部署分类器或向量模型时不需要运行两套骨干。[检查点组成](https://huggingface.co/dmis-lab/UltraBERT-150M)

与 ModernBERT 相比，双方都采用双向编码、RoPE 和局部／全局注意力，均能作为分类与检索骨干。ModernBERT 的原生窗口为 8192 token，使用去填充和 Flash Attention 改善长输入效率；UltraBERT 扩展到 32768 token，并把双掩码、分头与选择性蒸馏作为训练重点。窗口变长能容纳完整材料，实际显存和吞吐仍取决于长度及批量设置。[ModernBERT 模型卡](https://huggingface.co/answerdotai/ModernBERT-base)与 [UltraBERT 架构](https://huggingface.co/dmis-lab/UltraBERT-150M)

Ettin 则提供使用相同数据、架构和训练配方的成对编码器与解码器，并开放多种规模和训练检查点，适合研究不同目标的影响。UltraBERT 侧重在一个编码器中协调两类下游需求。作者统一微调评测中，380M UltraBERT 的 GLUE 为 91.0、BEIR 为 47.7，同表 Ettin-395M 为 90.8 和 45.9；这些数字对应各骨干按任务微调后的结果。现成 embedding 模型还包含另一阶段的检索训练，不能直接混用这些指标。[Ettin 模型卡](https://huggingface.co/jhu-clsp/ettin-encoder-150m)与 [统一比较设置](https://huggingface.co/blog/dmis-lab/ultrabert)

对 RAG，直接起点是 Embed-150M：它在基础骨干上经过弱监督与精选对比数据训练，查询使用任务指令前缀，文档直接编码。对于英文长文，可以比较整篇编码与分块编码在召回、延迟和内存上的差别，再决定索引粒度。官方报告 MTEB 英语 v2 为 67.24，落地时应使用自身查询和相关文档检查召回。[向量模型及使用格式](https://huggingface.co/dmis-lab/UltraBERT-Embed-150M)

在工程迁移中，向量模型输出为 768 维，查询指令也属于索引与检索约定的一部分。更换已有模型时，应对同一组文档重新编码，固定查询格式后比较召回；相似句、重复检测等对称任务则按模型卡给两侧使用相同指令。这样的评估可以区分骨干能力、提示格式和分块策略各自的影响。[输入约定](https://huggingface.co/dmis-lab/UltraBERT-Embed-150M)

同一骨干还可微调成内容分类器，在检索前分流问题、筛选候选材料，再把保留内容交给生成模型；长对话审核也可利用较长窗口一次判断完整上下文。基础模型本身仍需任务训练，且训练语料以英语为主。接入要求 transformers 5 及自定义模型代码，长输入推荐 FlashAttention 2，也支持 SDPA；分类和检索需要分别选择任务头、数据与学习率。[部署与微调说明](https://huggingface.co/dmis-lab/UltraBERT-150M)

对需要训练分类与检索两个组件的团队，还可以先共享数据清洗和骨干选型，再分别维护任务检查点。上线验收应分别测分类错误、检索漏召回和高分错误匹配，并记录长输入批量大小、显存峰值与尾部延迟，避免只靠一个平均榜单分数决定替换。
