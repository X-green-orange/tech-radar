---
title: "Cloudflare Agents 0.28.0：把文档读取与持久浏览器接入 Agent"
date: "2026-10-11"
summary: "从分窗读取网页到跨回合操作浏览器，理解 Cloudflare 新工具的会话边界、适配方式与部署选择。"
tags: ["Agent", "浏览器", "状态管理"]
daily: "2026-10-11"
sources:
  - label: "Cloudflare Agents 0.28.0 Release"
    url: "https://github.com/cloudflare/agents/releases/tag/agents%400.28.0"
  - label: "持久浏览器官方文档"
    url: "https://raw.githubusercontent.com/cloudflare/agents/main/docs/agents/browse-the-web.md"
  - label: "web_fetch 官方文档"
    url: "https://raw.githubusercontent.com/cloudflare/agents/main/docs/agents/fetch-the-web.md"
  - label: "Playwright 浏览器上下文文档"
    url: "https://raw.githubusercontent.com/microsoft/playwright/main/docs/src/browser-contexts.md"
---

Agent 访问网络有两种常见需求：读取一份资料，或在页面上连续完成操作。Cloudflare Agents 0.28.0 为这两种需求增加了 browser 与 web_fetch 工具入口，并为 Pi、AI SDK 和 TanStack AI 提供适配。版本同时将生命周期、调度、状态、WebSocket 和 MCPClientManager 能力标为稳定接口，便于把网络操作纳入持续运行的 Agent。[版本说明](https://github.com/cloudflare/agents/releases/tag/agents%400.28.0)

## 先确定是否需要浏览器

web_fetch 接收 URL，将 HTML、PDF 和 Office 文档通过 Workers AI 转为 Markdown；JSON 会整理格式，其他支持的文本可以直接返回。默认每次给模型约两万字符，结果标明最终地址、HTTP 状态、内容类型、总长度和下一段 offset。开发者因此可以保留完整页面长度信息，让模型按需继续阅读，而不把整份长文一次塞进上下文。[读取机制](https://raw.githubusercontent.com/cloudflare/agents/main/docs/agents/fetch-the-web.md)

这个工具执行 GET，不携带 cookies、凭据或自定义请求头，也不运行页面 JavaScript。公开说明书和文档适合先走这条路径；需要登录、等待前端加载或提交表单的任务则需要浏览器。每次续读会重新请求页面，动态页面可能变化，分窗也不等于缓存。返回的网页内容包在不可信数据标记内，宿主仍应把网页文字当作资料处理。[接口与限制](https://raw.githubusercontent.com/cloudflare/agents/main/docs/agents/fetch-the-web.md)

## 浏览器如何跨回合延续

持久 browserTool 由宿主创建 Browser 实例，模型编写 CDP 代码完成页面检查和操作。活动标签页跨回合保留，浏览器生命周期可注册到 Agent；Pi 适配默认按调用会话区分 scope，同一 scope 的操作串行，不同 scope 可并行。相比每次工具调用重新打开网页，这种组织方式能连续使用已有标签页、cookies 和登录。[持久浏览器说明](https://raw.githubusercontent.com/cloudflare/agents/main/docs/agents/browse-the-web.md)

这里的 scope 只管理活动标签页，并不隔离账号：多个 scope 共享 cookies 和登录。不同用户的身份隔离需要在宿主的浏览器实例设计中解决。浏览器因闲置、关闭或崩溃丢失后，工具会在新浏览器执行并返回 restarted 标记；应用应据此检查当前页面与登录状态。Pi 不会自动重放被驱逐打断的浏览器调用，因为操作可能已经点击或提交。[会话边界](https://raw.githubusercontent.com/cloudflare/agents/main/docs/agents/browse-the-web.md)

宿主还可以通过 liveView 给人提供进入当前浏览器的链接，在登录或关键步骤中接管操作；关闭和清理浏览器也由宿主管理。对于原有 browser_execute 接口，one-shot 默认在执行结束时清理会话，reuse 使用命名共享会话，dynamic 允许执行中提升为持续会话。持久 browserTool 则把浏览器创建和关闭交给应用，不让模型自行决定。这些接口需要按各自生命周期接入，不能只替换工具名。[生命周期与人工接管](https://raw.githubusercontent.com/cloudflare/agents/main/docs/agents/browse-the-web.md)

文档读取也要处理错误正文。web_fetch 可以把有文字的 4xx 或 5xx 响应交给模型，并在头部标明状态；遇到机器人挑战页则报告 blocked。应用可以依据状态区分“找到资料”和“读到拒绝访问说明”，避免把错误页写入后续摘要。[错误返回](https://raw.githubusercontent.com/cloudflare/agents/main/docs/agents/fetch-the-web.md)

## 与几种实现路线相比

同一 SDK 的 Quick Actions 面向一次性的 Markdown 读取、链接提取和结构化抽取，只需浏览器绑定，不要求 Durable Object、Worker Loader 或沙箱。持久 browserTool 则适合连续交互，需要浏览器与 LOADER 绑定和相应运行时导出。两者都能读页面，差异在于任务是否依赖前一步留下的状态。[两类浏览器接口](https://raw.githubusercontent.com/cloudflare/agents/main/docs/agents/browse-the-web.md)

Playwright 的 BrowserContext 提供另一种边界：各上下文拥有独立 cookies、localStorage 和 sessionStorage，可在同一浏览器内模拟不同用户。Cloudflare 的 scope 解决多对话活动标签页冲突，Playwright 上下文解决身份与存储隔离。开发者选择时应分别检查账号隔离、浏览器持有者和模型工具适配，不能把标签页分流视为独立登录环境。[Playwright 上下文文档](https://raw.githubusercontent.com/microsoft/playwright/main/docs/src/browser-contexts.md)

web_fetch 则适合无需渲染的资料读取，避免为了下载一份公开文档维持浏览器。它提供主机白名单、黑名单及私有地址检查，逐个核查重定向目标；域名不做 DNS 解析，因此运行环境仍承担最终网络出口约束。它与浏览器工具之间的选择，应围绕认证和交互需求，而不是只看页面能否返回文字。[URL 策略](https://raw.githubusercontent.com/cloudflare/agents/main/docs/agents/fetch-the-web.md)

## 从资料到操作的工作流

资料研究 Agent 可以先检索地址，再用 web_fetch 按段读原文，记录最终 URL 与状态；遇到依赖 JavaScript 的内容，再切换浏览器。后台业务助手可以让宿主持有浏览器，跨回合延续筛选、查看和填表，并在会话重启后重新确认页面。多对话助手则可按线程分配 scope，避免抢占活动标签页，同时按用户身份拆分浏览器实例。这些场景把资料读取、页面交互和身份隔离分别落实到对应组件，减少状态混用。[工具与会话设计](https://raw.githubusercontent.com/cloudflare/agents/main/docs/agents/browse-the-web.md)
