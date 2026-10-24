---
title: "Nemotron 3.5 怎样把页面图像、检索重排和文档解析接入 Agent"
date: "2026-10-24"
summary: "从单向量召回到页面结构提取，理解 Nemotron 3.5 的分工，并比较 BGE-M3 文本检索与 ColPali 多向量页面检索。"
tags: ["Agent", "RAG", "多模态"]
daily: "2026-10-24"
sources:
  - label: "NVIDIA 官方机制与评测说明"
    url: "https://huggingface.co/blog/nvidia/nemotron-retriever-world-class-agentic-retrieval"
  - label: "Nemotron 3.5 Embed 8B 模型卡"
    url: "https://huggingface.co/nvidia/Nemotron-3.5-Embed-8B-BF16"
  - label: "Nemotron 3.5 Rerank 8B 模型卡"
    url: "https://huggingface.co/nvidia/Nemotron-3.5-Rerank-8B-BF16"
  - label: "Nemotron 3.5 Parse 模型卡"
    url: "https://huggingface.co/nvidia/Nemotron-3.5-Parse"
  - label: "BGE-M3 官方模型卡"
    url: "https://huggingface.co/BAAI/bge-m3"
  - label: "ColPali 1.3 官方模型卡"
    url: "https://huggingface.co/vidore/colpali-v1.3"
---

NVIDIA 在 10 月 21 日公布了 Nemotron 3.5 检索组件的组合机制与实验：Embed 负责召回，Rerank 重排候选，Parse 把页面变成结构化内容。扫描件、图表和表格常把关键关系放在版面里，单独抽取文字可能丢掉表头、阅读顺序或图例。此次说明把这些问题放进同一条 Agent 取证流程；其中 Embed、Rerank 权重日期为 10 月 20 日，Parse 为 10 月 17 日。[官方说明](https://huggingface.co/blog/nvidia/nemotron-retriever-world-class-agentic-retrieval)

## 页面怎样进入向量索引

Embed 8B 接收文字查询，文档侧可以输入文字、页面图像或二者组合。它对 token 隐状态做平均池化和归一化，每份输入输出一个 4096 维向量，也支持截短后重新归一化。文档可离线编码并进入向量数据库，查询时再做相似度召回。这个接口让图文材料可以沿用单向量索引，但分页方式、图像分辨率和原始内容关联仍由应用管理。[Embed 模型卡](https://huggingface.co/nvidia/Nemotron-3.5-Embed-8B-BF16)

8B 版本冻结了来自 Nemotron 3 Embed 的语言组件，训练视觉编码器与多模态投影层，模型卡说明其文字嵌入与对应前代相同。已有该前代文字索引的系统因而可以扩展图像内容；使用其他模型建立的索引仍需匹配新的查询编码。1B 版本通过蒸馏缩小模型，提供 BF16 和 NVFP4 两种部署选择。精度格式的选择还取决于硬件与运行栈支持。[模型卡](https://huggingface.co/nvidia/Nemotron-3.5-Embed-8B-BF16)、[训练与部署说明](https://huggingface.co/blog/nvidia/nemotron-retriever-world-class-agentic-retrieval)

## 召回之后，选择证据并保留结构

Rerank 8B 把查询与每个候选文档放在一起编码，输出相关性 logit。候选可以是文字、页面图像或图文组合。联合编码会增加候选阶段的计算，因此通常先召回一批材料，再对这批材料细排；logit 用于排序，应用需要自行确定截断策略。[Rerank 模型卡](https://huggingface.co/nvidia/Nemotron-3.5-Rerank-8B-BF16)

Parse 的职责是提取可操作内容。这个约 631M 参数的模型输出文字、语义类别、位置框和阅读顺序，后处理可生成 Markdown、HTML 表格及结构化块。官方提供单遍、双遍、三遍处理：后两种会重新检查表格、图表等区域，用更多计算换取提取质量。系统可以先检索页面，再按需解析命中区域，也可以在入库时预处理；前者减少初始工作量，后者便于直接查询表格字段。[Parse 模型卡](https://huggingface.co/nvidia/Nemotron-3.5-Parse)、[多遍处理说明](https://huggingface.co/blog/nvidia/nemotron-retriever-world-class-agentic-retrieval)

## 与 BGE-M3、ColPali 的取舍

BGE-M3 面向文字，支持最长 8192 token，提供稠密、稀疏和 ColBERT 式多向量检索。已有可靠文本层的知识库可用它组合语义与词项匹配；图片资料则需要前置解析或其他视觉组件。Nemotron 3.5 的单向量路径直接接收页面图像，减少了必须先转写整页的依赖。[BGE-M3 模型卡](https://huggingface.co/BAAI/bge-m3)、[Nemotron 输入接口](https://huggingface.co/nvidia/Nemotron-3.5-Embed-8B-BF16)

ColPali 基于 PaliGemma-3B，为文字 token 和图像 patch 生成多向量表示，用晚交互计算匹配。它同样能检索富版面文档，区别在于保存和比较的表示粒度。ColPali 保留局部匹配向量，需要支持相应索引与打分；Nemotron Embed 每份输入形成一个向量，再由独立 Rerank 检查查询与候选的细节。选择时可比较索引体积、召回遗漏和重排延迟，按实际文档测试。[ColPali 模型卡](https://huggingface.co/vidore/colpali-v1.3)、[Nemotron 组合机制](https://huggingface.co/blog/nvidia/nemotron-retriever-world-class-agentic-retrieval)

## 把节省落实到具体工作流

官方实验固定 Agent 模型、工具、任务集、语料和执行策略，只改变检索配置；加入 Rerank 后，8B、1B Embed 配置的 Agent 推理 token 分别减少约 14%、13%。该口径统计各轮输入和输出 token。部署预算还要计入文档编码、重排及解析的计算和等待时间。[实验设置与结果](https://huggingface.co/blog/nvidia/nemotron-retriever-world-class-agentic-retrieval)

供应链分析可以先找出预测图、库存表和交期说明，再解析命中页面，把数字与原页位置一起交给 Agent。设备手册助手可以用图文召回定位示意图附近的维护步骤，重排后保留引用。历史档案检索则可先索引扫描页，用户选中材料后再提取阅读顺序与表格。三种流程都需要保存文档版本、页码和原图关联，才能让检索结果进入后续复核与操作。
