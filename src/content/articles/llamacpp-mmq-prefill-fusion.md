---
title: "llama.cpp 合并 MMQ 融合：加快长提示输入的 FFN 运算"
date: "2026-10-25"
summary: "CUDA 量化矩阵路径把 FFN 投影与门控合成一次启动；从实现条件、提示吞吐测试及与 FlashAttention、分块预填充的区别理解适用场景。"
tags: ["本地推理", "CUDA", "性能"]
daily: "2026-10-25"
sources:
  - label: "llama.cpp PR #29948"
    url: "https://github.com/ggml-org/llama.cpp/pull/29948"
  - label: "合并版本的 CUDA 路径选择"
    url: "https://github.com/ggml-org/llama.cpp/blob/c49edf0963a76d5e78b2a7278c9bd5b71d26c84f/ggml/src/ggml-cuda/ggml-cuda.cu"
  - label: "FlashAttention 原论文"
    url: "https://arxiv.org/abs/2205.14135"
  - label: "vLLM 官方优化与分块预填充文档"
    url: "https://docs.vllm.ai/en/latest/configuration/optimization/"
---

10 月 25 日，llama.cpp 合并了 CUDA 量化矩阵运算的 PR #29948。它针对稠密 FFN，把 gate、up 两次矩阵乘法和后续 GLU 门控放到一次内核启动里执行，覆盖提示处理使用的 MMQ 路径。此前的小批量 MMVQ／MMVF 已有类似融合；这次补充面向一次处理较多输入 token 的阶段。新增事件是代码合并，提案和作者测试说明在此前已公开。[PR 说明与合并记录](https://github.com/ggml-org/llama.cpp/pull/29948)

## 从两路投影到一次写回

带门控的 FFN 会把同一输入送入两路投影，再将 gate 路的激活结果与 up 路逐元素相乘。分开执行时，需要启动多个内核并传递中间结果。此次实现让加载器以八行为一组交错取出两路权重，使同一线程持有配对的输出值，在写回阶段直接计算 GLU。GGUF 权重布局保持原样，交错发生在内核加载过程中。[实现细节](https://github.com/ggml-org/llama.cpp/pull/29948)

融合需要满足具体形状与设备条件。代码支持 Q4_K、Q5_K、Q6_K、Q8_0 和 IQ4_XS，要求 NVIDIA Turing 或更新架构；路径选择还检查权重行能否填满分块、算子参数和分块利用率。已有矩阵运算提示、缓冲区条件不合适时，也可能继续走原路径。因此，同一张显卡上的不同模型、批量与量化格式，实际采用的内核可能不同。[合并版本的条件判断](https://github.com/ggml-org/llama.cpp/blob/c49edf0963a76d5e78b2a7278c9bd5b71d26c84f/ggml/src/ggml-cuda/ggml-cuda.cu)

## 提示吞吐对应哪段等待

作者给出的 llama-bench 测试固定输入为 16384 token，生成长度为零，batch 与 microbatch 均为 2048，开启 Flash Attention 并重复五次。在 DGX Spark 上，Llama-3.1-8B 的 IQ4_XS 从 2933.9 提升到 3249.0 token/s，约增 10.7%；同模型同格式在 RTX 5090 上约增 4.7%。这些数值描述输入处理吞吐，硬件差异已经体现在结果中。交互服务还包括排队、分词与输出生成，首 token 延迟需要连同这些环节测量。[作者测试配置与表格](https://github.com/ggml-org/llama.cpp/pull/29948)

## 与注意力优化、请求调度怎样配合

FlashAttention 同样关注 GPU 上的数据移动，但作用于注意力计算。它通过分块减少 HBM 与片上 SRAM 之间的读写，计算精确注意力。此次 MMQ 融合处理 FFN 的投影与门控，两者位于 Transformer 的不同运算部分。PR 测试已经开启 Flash Attention，报告的增益是在这一配置基础上取得；部署时可分别检查注意力和 FFN 在输入阶段的耗时。[FlashAttention 论文](https://arxiv.org/abs/2205.14135)

vLLM 的 chunked prefill 则从请求调度入手：将长输入切成较小块，与正在解码的请求合批。V1 在可用时默认启用该机制，优先安排解码，再用剩余 token 预算处理输入。较小预算偏向改善相邻输出 token 的延迟，较大预算有利于更快处理输入。它与 MMQ 融合共有提高推理效率的目标，具体决策分别是“何时处理多少输入”和“单次运算怎样执行”。服务端可以同时从调度与内核两个层次寻找瓶颈。[vLLM 分块预填充文档](https://docs.vllm.ai/en/latest/configuration/optimization/)

## 放进本地 Agent 的工作流

本地文档问答可以先用固定检索结果构造长输入，对照更新前后的提示吞吐和首 token 延迟；重复问题还应记录前缀复用情况，区分新处理与已缓存的 token。代码 Agent 在读取较长文件或工具返回后，也可记录每轮输入处理时间，判断等待是否集中于模型重新读取上下文。两类场景都应保留模型、量化、输入长度和 GPU 配置，避免把工作负载变化算成内核收益。

多用户服务还需要加入并发请求，观察长输入是否拖慢其他会话的输出节奏，再调整分块与批量。若主要耗时在逐 token 生成，评估重点就应转向解码路径。采用此合并版本时，可从相同输入的前后对照开始，同时保留融合开关对照、输出检查和端到端延迟，让提示处理的局部变化对应到实际用户等待。
