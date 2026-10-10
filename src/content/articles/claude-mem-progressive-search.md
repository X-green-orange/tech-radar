---
title: "claude-mem 13.35.0：按需读取记忆，并归档原生笔记"
date: "2026-10-10"
summary: "从三阶段检索到 Markdown 笔记归档，拆解新版记忆接口，并比较 Mem0 与 Letta 的上下文组织方式。"
tags: ["Agent", "记忆", "MCP"]
daily: "2026-10-10"
sources:
  - label: "claude-mem 13.35.0 Release"
    url: "https://github.com/thedotmack/claude-mem/releases/tag/v13.35.0"
  - label: "版本固定的 mem-search 使用契约"
    url: "https://github.com/thedotmack/claude-mem/blob/614597a6e98ec2ed59c6662f18f2a4fd4f69e996/plugin/skills/mem-search/SKILL.md"
  - label: "版本固定的原生记忆桥接文档"
    url: "https://github.com/thedotmack/claude-mem/blob/614597a6e98ec2ed59c6662f18f2a4fd4f69e996/docs/native-memory-bridge.md"
  - label: "Mem0 官方机制说明"
    url: "https://docs.mem0.ai/core-concepts/how-it-works"
  - label: "Letta 官方 Memory blocks 文档"
    url: "https://docs.letta.com/v1-sdk/memory/memory-blocks"
---

长时间维护一个项目时，Agent 常要找回上周的接口决策，或确认某次报错为什么换了配置。历史记录越多，一次读入全部内容就越难控制。北京时间 10 月 9 日发布的 claude-mem 13.35.0 增加 `mem_search`，把记忆读取组织成索引、上下文和详情三个阶段；同时提供显式保存笔记的 `save_memory`。本地 worker 与托管 MCP 共用检索引擎，面向模型返回经过整理的文本。[版本发布说明](https://github.com/thedotmack/claude-mem/releases/tag/v13.35.0)

默认 guided 模式先给标题和 ID。Agent 选中相关条目后，才读取这些锚点附近的上下文，再挑出需要展开的详情。如果标题已经回答问题，可以提前结束。比如查找“为什么调整登录令牌过期时间”，先确认哪条记录涉及该决策，再查看对应的故障和修改理由，比直接读完整会话更容易保持问题范围。[检索契约](https://github.com/thedotmack/claude-mem/blob/614597a6e98ec2ed59c6662f18f2a4fd4f69e996/plugin/skills/mem-search/SKILL.md)

后续调用通过短游标继续，检索范围和已披露 ID 留在服务端；游标十五分钟过期，不能中途换项目或传入结果之外的 ID。索引最多二十条，详情默认三条、最多五条。问题明确时，`mode: "auto"` 会按词项匹配自动完成同样的阶段，不额外调用 LLM。这里的边界直接约束读取量；词面选取结果仍需要结合当前问题检查。[参数与续查规则](https://github.com/thedotmack/claude-mem/blob/614597a6e98ec2ed59c6662f18f2a4fd4f69e996/plugin/skills/mem-search/SKILL.md)

另一个入口是原生记忆桥接。在 worker 模式下，受支持的记忆查询或笔记读取触发 hook 后，插件按项目补充检索证据，原工具继续执行。补充文本最多一万字符；插件自己的检索被排除，避免递归。server 模式跳过这条本地补充路径。开发者需要区分直接调用 MCP 与 hook 补充两种接入方式，按实际运行模式配置。[桥接机制](https://github.com/thedotmack/claude-mem/blob/614597a6e98ec2ed59c6662f18f2a4fd4f69e996/docs/native-memory-bridge.md)

已有 Markdown 笔记也能进入归档。`CLAUDE_MEM_MEMORY_WATCH_ROOTS` 默认空，启用时要指定目录与项目；文件稳定后才导入，跳过隐藏文件、符号链接和超过 64 KiB 的文件。修改形成历史快照，删除源笔记不会删除归档。这个行为适合保留决策沿革，也意味着“清理本地笔记”和“清理存储中的历史”需要分别处理。[笔记目录配置](https://github.com/thedotmack/claude-mem/blob/614597a6e98ec2ed59c6662f18f2a4fd4f69e996/docs/native-memory-bridge.md)

Mem0 也解决跨会话记忆问题，默认写入路径会从消息抽取事实，去重并建立检索表示；应用在下次模型请求前调用 `search`，决定把哪些结果放入提示词。它更适合由业务程序管理用户偏好和项目事实。相比之下，此次 claude-mem 更新把“先看目录、再选证据”的读取顺序做进工具契约，适合从开发活动中追查决策过程。Mem0 也允许用 `infer=False` 保存原始内容，所以选择时应看实际配置与应用责任：谁提炼事实，谁限定用户或项目，谁决定最终进入上下文的内容。[Mem0 机制说明](https://docs.mem0.ai/core-concepts/how-it-works)

Letta 的 memory blocks 则持续驻留在 Agent 上下文中，无需每次检索；多个 Agent 可以共享同一块内容。稳定的角色设定或短篇项目约定适合这样组织，大量历史记录则需要考虑常驻上下文的容量。共享块若被并发直接替换，后写入的值会覆盖此前修改，更新方式也要纳入设计。固定约定可设为只读，由外部程序控制更新。claude-mem 的按需披露更偏向读取历史证据，两种组织方式可以按信息用途选择。[Letta memory blocks](https://docs.letta.com/v1-sdk/memory/memory-blocks)

在项目交接中，可以先把长期有效的决定写成短笔记，并指定所属项目；接手会话从索引查相关背景，需要时再展开原始理由。排查重复故障时，guided 模式适合人工控制证据范围，明确关键词的例行查询则可用自动模式。团队还可以用固定问题比较命中内容与读入文本量，检查归档中是否积累了互相冲突的旧决定。测试题可以包含一次已撤回的方案和一次真正生效的变更，观察 Agent 能否找对记录并分清当前状态；再用另一个项目的相同关键词检查范围隔离。这样评估的是记忆对任务的帮助，避免只统计保存了多少笔记。

升级后需重启本地 worker，并新建会话或重载 MCP 连接，已有进程才会拿到新工具定义。启用目录监听前应先确认项目映射和既有云同步设置；笔记归档沿用这些同步选项。[升级说明](https://github.com/thedotmack/claude-mem/releases/tag/v13.35.0)
