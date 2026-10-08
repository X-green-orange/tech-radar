---
title: "Copilot 本地沙箱正式发布：MXC 如何约束 Agent 的工具执行"
date: "2026-10-08"
summary: "跨系统策略、本地服务隔离与凭据代理，以及它和 Claude Code、Docker Sandboxes 的具体边界差异。"
tags: ["Agent", "安全", "开发工具"]
daily: "2026-10-08"
sources:
  - label: "GitHub 正式发布公告"
    url: "https://github.blog/changelog/2026-10-07-local-sandboxing-for-github-copilot-now-generally-available/"
  - label: "GitHub 沙箱机制与配置文档"
    url: "https://docs.github.com/en/copilot/concepts/security-governance-and-network-settings/about-cloud-and-local-sandboxes"
  - label: "Microsoft MXC 官方仓库"
    url: "https://github.com/microsoft/mxc"
  - label: "Claude Code 官方沙箱文档"
    url: "https://code.claude.com/docs/en/sandboxing"
  - label: "Docker Sandboxes 官方架构文档"
    url: "https://docs.docker.com/ai/sandboxes/architecture/"
---

GitHub 在 10 月 7 日宣布 Copilot 本地沙箱正式可用，覆盖 CLI、Copilot app 和使用 Agent Host 的 VS Code 会话，随 Copilot 提供且不额外收费。Agent 连续运行测试、安装依赖和修改文件时，需要把获准完成任务的范围落实到工具执行层。此次发布以开发者或组织定义的策略约束文件、网络和凭据访问。[发布公告](https://github.blog/changelog/2026-10-07-local-sandboxing-for-github-copilot-now-generally-available/)

支撑这套机制的是 Microsoft eXecution Container，即 MXC。调用方声明哪些路径可读、可写或禁止访问，再由 MXC 映射到操作系统控制。Copilot 的 macOS 路径采用 Seatbelt，Linux 采用 bubblewrap，Windows 需要支持相关能力的较新 Windows 11 更新。MXC 本身还有其他后端，但 Copilot 当前本地方案主要是进程级隔离，没有为每条命令建立独立虚拟机。[GitHub 机制说明](https://docs.github.com/en/copilot/concepts/security-governance-and-network-settings/about-cloud-and-local-sandboxes) · [MXC 仓库](https://github.com/microsoft/mxc)

CLI 中用 `/sandbox enable` 开启后，shell 命令、文件搜索及默认纳入的本地 MCP、LSP 服务进入隔离范围。内置文件工具在 CLI 进程内执行，依靠自身代码尽力遵守策略；远程 MCP 服务也不会因此被沙箱化。这使评估问题变得具体：除了命令能否写目录，还要检查提供工具的服务运行在哪里。[工具覆盖范围](https://docs.github.com/en/copilot/concepts/security-governance-and-network-settings/about-cloud-and-local-sandboxes)

凭据控制采用另一条路径。CLI 可让沙箱内工具拿到占位值，由本地代理仅向批准的 HTTPS 目标注入真实凭据。macOS 和 Linux 的沙箱限制直接外连，强制流量经过代理；Windows 的代理及主机规则依赖程序遵守代理设置，约束强度有所不同。模型运行位置与工具隔离分开管理，换成本地模型也需要单独配置执行策略。[网络与凭据控制](https://docs.github.com/en/copilot/concepts/security-governance-and-network-settings/about-cloud-and-local-sandboxes)

本地沙箱默认关闭，CLI 与 app 的配置互不联动。Linux 需要 bubblewrap，允许外连还涉及 slirp4netns、网络工具和设备权限。企业可以通过托管配置要求沙箱；若希望不支持的主机停止执行，还需落实 `sandbox.failIfUnavailable`。普通用户保存的启用偏好在不支持的主机上可能仅对当前会话关闭，并显示提示。[启用与主机要求](https://docs.github.com/en/copilot/concepts/security-governance-and-network-settings/about-cloud-and-local-sandboxes)

本地正式发布也没有改变云端沙箱的状态：后者仍为公开预览，运行在 GitHub 托管的临时 Linux 环境，按使用计费。CLI 的云端选项用于交互会话，不能直接与程序化运行参数组合。因此，已有定时脚本迁移时，应先核对运行入口、环境持久性和费用，不能把本地功能的可用范围直接延伸到云端。[云端运行说明](https://docs.github.com/en/copilot/concepts/security-governance-and-network-settings/about-cloud-and-local-sandboxes)

Claude Code 同样使用操作系统约束文件和网络，但其内置沙箱主要包围 shell 命令及子进程，文件工具、hooks、本地 MCP 与 LSP 服务在外部运行。当前支持 macOS、Linux 和 WSL2，原生 Windows 命令不受这套沙箱保护。因此，依赖本地工具服务的团队比较两者时，需要明确是否希望把服务进程一并纳入边界，而不只比较命令审批方式。[Claude Code 文档](https://code.claude.com/docs/en/sandboxing)

Docker Sandboxes 则把 Agent 工作负载放进 microVM，每个沙箱保存自己的 Docker daemon 状态和镜像缓存。它适合需要完整构建环境和 Docker 能力的任务，同时承担虚拟机与独立环境的资源开销。直接挂载的工作区仍与宿主文件共享变更，MCP gateway 注册的本地 stdio 服务运行在宿主侧，需要由 gateway 策略单独治理。[Docker 架构](https://docs.docker.com/ai/sandboxes/architecture/)

这三条路线都提供执行边界，具体差别在覆盖范围与环境组织。Copilot 将本地服务和跨系统策略整合进日常会话；Claude Code 的内置方案集中于 shell；Docker 用独立 microVM 保存整套工作负载。选型时应按实际工具路径检查可读文件、可写目录、网络出口及服务位置，再决定需要哪一种隔离层。

持续修改仓库的 Agent 可以从允许工作目录写入、仅放行依赖源开始，把提交凭据留在代理侧。失败日志随后用于补充必要权限，避免一次开放整个用户目录。接入本地 MCP 的场景还应把服务自身的缓存、数据库目录和联网需求一起梳理，验证服务进程确实按预期启动在边界内。

例如同一套代码任务包含搜索文件、调用本地索引服务和执行测试，可分别检查工作区内的合法操作能否完成，以及对禁止目录和未批准域名的操作是否被拒绝。还要确认失败后申请的例外只对应需要扩大权限的命令，并观察组织策略能否阻止用户关闭边界。这种按执行路径验收的方法，可用于模型升级后继续复用原有工具权限配置。

需要构建镜像、运行数据库和反复恢复依赖的长任务，则可评估持久 microVM，让环境设置随沙箱保留。若直接挂载宿主工作区，应把可写范围与 Git 审查配合；若采用私有克隆，再通过明确的变更交付步骤合并结果。隔离方案由任务所需的文件与服务决定，模型选择则沿用任务质量、延迟和成本的评估流程。[Docker 存储与生命周期](https://docs.docker.com/ai/sandboxes/architecture/)
