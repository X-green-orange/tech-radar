---
title: "GitHub Copilot 开始操作桌面应用，开发流程能延伸到哪里？"
date: "2026-10-03"
summary: "从发布能力、使用入口和同类产品定位，理解 GitHub Copilot 的 computer use。"
tags: ["Agent", "开发工具", "Computer Use"]
daily: "2026-10-02"
sources:
  - label: "GitHub 发布说明"
    url: "https://github.blog/changelog/2026-10-01-github-copilot-can-now-interact-with-desktop-apps/"
  - label: "GitHub 功能文档"
    url: "https://docs.github.com/en/copilot/concepts/agents/computer-use"
  - label: "GitHub Agent 会话文档"
    url: "https://docs.github.com/en/copilot/how-tos/github-copilot-app/agent-sessions"
  - label: "Claude computer use 文档"
    url: "https://support.claude.com/en/articles/14128542-let-claude-use-your-computer-in-cowork"
  - label: "Microsoft Copilot Studio 文档"
    url: "https://learn.microsoft.com/en-us/microsoft-copilot-studio/computer-use"
---

开发任务常常在代码仓库之外结束。Agent 可以修改程序、运行测试、整理结果，交付前却还要打开一款桌面软件，查看运行状态、调整设置，或将内容录入只有图形界面的系统。如果这款软件没有 API 或命令行接口，最后几步通常需要人来完成。

10 月 1 日，GitHub 在 Copilot CLI 和 Copilot 桌面应用中推出 computer use 公开预览，支持 macOS 和 Windows。启用后，Copilot 可以读取应用的可访问内容；需要视觉信息时，也可以查看界面截图。它随后能够点击控件、输入和编辑文字、按键、滚动、拖动，并在不同应用之间继续任务。[GitHub 发布说明](https://github.blog/changelog/2026-10-01-github-copilot-can-now-interact-with-desktop-apps/)给出了功能范围。

GitHub 为这项功能指出的使用对象，是缺少 API、命令行或 MCP 集成的旧软件与纯图形界面软件。它为 Copilot 增加了一种完成任务的路径：当文件操作和直接工具无法处理剩余步骤时，Agent 可以进入用户正在使用的桌面应用。GitHub 列出的例子包括读取旧软件中的状态信息、修改演示文稿，以及在应用之间转移内容。[功能文档](https://docs.github.com/en/copilot/concepts/agents/computer-use)也建议在可用时优先选择更结构化的直接工具。

## 与同类产品相比

Computer use 已经是一个有多个产品参与的品类。[Claude 桌面应用](https://support.claude.com/en/articles/14128542-let-claude-use-your-computer-in-cowork)也能操作用户电脑上的应用，并会优先尝试连接器和浏览器等工具；[Microsoft Copilot Studio](https://learn.microsoft.com/en-us/microsoft-copilot-studio/computer-use)允许创建者把 computer use 配置为 Agent 工具，指定运行机器、任务指令和凭据，用于数据录入等流程。三者都能通过界面处理缺少直接接口的软件，区别主要在于任务从哪里开始、由谁配置，以及如何接入已有工作流。

GitHub Copilot 的入口贴近开发者正在进行的工作。用户可以从终端中的 Copilot CLI 启用桌面操作，也可以在 Copilot 桌面应用里开启。后者的会话本来就围绕本地仓库、分支、Issue 和 PR 组织：开发者可以从 Issue 发起会话，让 Agent 修改代码，随后在应用内查看或处理 PR。Computer use 为这条开发链补上了操作本机图形界面的手段。[GitHub Agent 会话文档](https://docs.github.com/en/copilot/how-tos/github-copilot-app/agent-sessions)说明了这些入口。

## 使用场景与控制方式

这种衔接适合包含桌面步骤的软件开发任务。一个项目可能需要在没有自动化接口的本地工具中检查输出：Agent 先在仓库里完成修改并运行已有测试，再打开该工具读取界面结果，将发现的问题带回开发会话。另一种场景是交付材料制作：代码和数据处理结束后，任务还需要进入桌面演示软件修改页面。对于使用内部图形界面系统记录测试结果的团队，computer use 则可以承担录入步骤。

GitHub 还把授权与两个入口连接起来。Computer use 默认关闭；用户可以按会话批准应用访问，也可以保存对某个应用的批准。在同一台电脑上，保存的决定同时适用于 Copilot CLI 和桌面应用，并可在应用设置中查看和删除。运行中的操作可以手动停止。[GitHub 使用说明](https://docs.github.com/en/copilot/how-tos/github-copilot-app/computer-use)列出了具体控制方式。

与 Copilot Studio 面向指定机器、凭据和可发布 Agent 的配置方式相比，GitHub 此次更新更直接地服务于开发者的本机会话；与 Claude 覆盖较广的桌面任务相比，它的使用入口紧挨着仓库、终端和 PR。对于需要从代码工作流走进本地软件界面的任务，这构成了 Copilot computer use 的产品特点。
