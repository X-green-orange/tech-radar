---
title: "claude-mem 13.34.2：保留历史前缀，修复观察会话的缓存复用"
date: "2026-10-07"
summary: "逐轮缩短工具结果会改变已发送的历史；这次修复改用代际回收控制上下文，并保持代内消息不变。"
tags: ["Agent", "记忆", "推理优化"]
daily: "2026-10-07"
sources:
  - label: "claude-mem 13.34.2 Release"
    url: "https://github.com/thedotmack/claude-mem/releases/tag/v13.34.2"
  - label: "OpenAI Prompt caching 文档"
    url: "https://platform.openai.com/docs/guides/prompt-caching"
  - label: "Claude Prompt caching 文档"
    url: "https://platform.claude.com/docs/en/build-with-claude/prompt-caching"
---

claude-mem 在北京时间 10 月 7 日发布 13.34.2，移除了共享 HTTP 观察器每轮改写历史的逻辑。这条路径服务于 OpenRouter、Gemini 等使用 OpenAI 兼容接口的提供商。更新涉及后台观察会话：它读取工具执行记录、提取记忆并生成摘要。此前的裁剪虽然缩短单次输入，却破坏了相邻请求的共同前缀。[版本说明](https://github.com/thedotmack/claude-mem/releases/tag/v13.34.2)

问题从 13.29.0 引入。观察器每次请求前，把最近八条消息之外的工具交互载荷替换成带 `pruned="true"` 标记的短占位内容。工具结果第一次发送时是完整文本，数轮后再次发送就变成占位符。发布说明指出，从第五次观察开始，请求会改动此前已经发送的消息。摘要请求也执行同样的裁剪，因而看不到全部原始工具载荷。[版本说明](https://github.com/thedotmack/claude-mem/releases/tag/v13.34.2)

假设前一次输入依次包含指令、工具结果 A 和工具结果 B，下一次只在末尾追加结果 C，已有前缀便保持稳定。若同时把 A 换成一句摘要，从 A 开始的后续部分就无法匹配原缓存。这是输入长度与重复计算量之间的差别：输入更短，不一定意味着需要重新处理的输入更少。该例说明前缀匹配机制，具体命中仍取决于提供商、缓存有效期和请求配置。[OpenAI 缓存机制](https://platform.openai.com/docs/guides/prompt-caching)

13.34.2 删除了观察请求和摘要请求前的两处裁剪调用。同一代会话中，已发送的消息保持原样，后续请求沿着原有历史继续增长。上下文控制仍然存在：系统按观察器上下文窗口及最近报告的 token 数判断预算，到达上限后回收为新一代；提供商返回上下文溢出错误时也会触发回收。输出上限和被拒绝请求后的清理机制继续保留。[版本说明](https://github.com/thedotmack/claude-mem/releases/tag/v13.34.2)

这种调整把历史压缩从每轮改写转为阶段性回收。代内前缀更稳定，原始工具载荷也能进入本代摘要；代际切换则重新建立上下文。由于旧载荷不再逐条缩小，新版本会更早达到预算，长会话回收次数可能增加。版本说明没有给出生产成本测量；部署时应把缓存读取、非缓存输入和回收频率放在一起观察，而不能只比较请求大小。[版本说明](https://github.com/thedotmack/claude-mem/releases/tag/v13.34.2)

与两家模型平台的缓存接口相比，这次更新解决的是客户端如何组织历史。OpenAI 对支持的模型默认启用提示词缓存，复用已有前缀的 KV 状态；完整渲染前缀需要匹配，工具定义、消息内容及相关设置的变化都可能影响复用。保持同一会话本身不保证命中。对开发者而言，稳定的指令和工具 schema 应放在前面，每轮变化的材料放在后面，并通过实际 usage 检查效果。[OpenAI 文档](https://platform.openai.com/docs/guides/prompt-caching)

Claude 则提供自动缓存与显式断点两种配置方式：前者通过请求顶层的 `cache_control` 随对话增长推进断点，后者在内容块上标记缓存位置，并支持五分钟或一小时有效期。两者同样依赖可复用前缀，但配置与有效期管理不同。claude-mem 的共享 HTTP 路径修复不会自动替调用方配置这些接口；应用仍需按所接入提供商组织请求和读取缓存统计。[Claude 文档](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)

这对持续观察代码修改的记忆 Agent 很直接：测试输出和文件差异可能很长，逐轮替换旧结果容易让后面的历史一起失去复用机会。升级后可选一段有多次工具调用的会话，比较缓存输入、普通输入、首次响应延迟及摘要质量，并记录代际切换的位置。

多阶段资料整理也有类似需求。检索结果、提取片段和中间结论在同一阶段内保持稳定，阶段结束后再生成摘要并开始新一代，可以同时照顾证据完整性和上下文预算。多提供商路由场景还应分别统计：兼容的消息格式不代表相同的缓存策略，一条路径有效的前缀组织方式，需要结合另一条路径的缓存配置重新检查。

发布方新增的回归测试保存每次请求的深拷贝，检查四十次观察及最终摘要是否逐轮延续原消息；另一项测试覆盖两百个事件与多代预算限制。这为开发者提供了可迁移的验证方法：既检查相邻请求的历史是否保持不变，也检查会话能否在预算内正确回收。[测试与验证说明](https://github.com/thedotmack/claude-mem/releases/tag/v13.34.2)
