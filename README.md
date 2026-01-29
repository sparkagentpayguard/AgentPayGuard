# AgentPayGuard（从零脚手架）

本仓库提供一个**可复现的最小 MVP**，用于 Kite Payment Track：

- **demo:pay**：通过“策略校验 → 稳定币支付（ERC-20 转账）”跑通一笔链上支付（测试网）
- **demo:reject**：故意触发策略（白名单/限额）并拒绝

> 说明：为了避免误转账，默认不发链上交易。你需要显式设置 `EXECUTE_ONCHAIN=1` 才会真的发送。

参赛链接：https://github.com/CasualHackathon/SPARK-AI-Hackathon
---

## 文档导航

| 文档 | 用途 |
|------|------|
| [for_judge.md](docs/for_judge.md) | 📋 **评委评审用** - 赛道要求对照表 + 证据链接 |
| **使用指南** |
| [TESTING_GUIDE.md](docs/guides/TESTING_GUIDE.md) | 🧪 Role B 测试与演讲指南（5 个场景 + 演讲脚本） |
| [ROLE_A_GUIDE.md](docs/guides/ROLE_A_GUIDE.md) | 🔗 多签部署指南（Gnosis Safe + TokenGuard） |
| [ROLE_C_GUIDE.md](docs/guides/ROLE_C_GUIDE.md) | 🎨 **前端开发指南**（Web UI + 可视化 + 科技感设计） |
| [ROLE_D_GUIDE.md](docs/guides/ROLE_D_GUIDE.md) | 🎥 PPT 与视频制作指南（支持 Role B 演讲） |
| [FRONTEND_DESIGN_REFERENCE.md](docs/guides/FRONTEND_DESIGN_REFERENCE.md) | 🌈 **Web3 前端设计参考**（黑客松风格分析 + 配色/动画建议） |
| **参考文档** |
| [ARCHITECTURE.md](docs/reference/ARCHITECTURE.md) | 🏗️ 系统架构与设计决策 |
| [allocation.md](docs/reference/allocation.md) | 👥 角色分工与交付物清单 |
| [QUICK_REFERENCE.md](docs/reference/QUICK_REFERENCE.md) | ⚡ 快速参考（命令、地址、Tx Hash）|
| [resources/](docs/resources/) | 📚 **原始资源**（赛道规则、官方链接等） |
| **内部管理** |
| [FINAL_DELIVERY_CHECKLIST.md](docs/internal/FINAL_DELIVERY_CHECKLIST.md) | ✅ 最终交付清单（角色 A/B/C/D） |
| [AGENT_WORKLOG.md](docs/internal/AGENT_WORKLOG.md) | 📝 工作日志（Phase 1-16 历史） |
| [AGENT_CONSTRAINTS.md](docs/internal/AGENT_CONSTRAINTS.md) | 📋 Agent 工作约束（16 条规则） |
| [SECURITY.md](docs/internal/SECURITY.md) | 🔐 安全政策（.env 保护、代码审查） |

---

## 环境要求

- Node.js >= 18（建议 20+）
- pnpm

---

## 快速开始

1) 安装依赖

```bash
pnpm i
```

2) 配置环境变量

复制 `.env.example` 为 `.env`，填好以下关键项：

- `PRIVATE_KEY`：测试网私钥（只用于测试）
- `RPC_URL`：默认已填 Kite Testnet RPC：`https://rpc-testnet.gokite.ai/`
- `SETTLEMENT_TOKEN_ADDRESS`：Kite 测试网稳定币（或结算 token）合约地址（从官方文档获取）
- `RECIPIENT`：收款地址

3) 运行 Demo（默认 dry-run）

```bash
pnpm demo:pay
pnpm demo:reject
```

4) 真正发送链上交易（测试网）

把 `.env` 里的 `EXECUTE_ONCHAIN=1` 打开，然后再次运行：

```bash
pnpm demo:pay
```

输出里会打印 tx hash（把它填到 `for_judge.md` 的占位里）。

---

## 可选：走 AA（gokite-aa-sdk / bundler）

如果你已经有 bundler 服务（或官方提供的 bundler URL），可以把 `.env` 改为：

- `PAYMENT_MODE=aa`
- `BUNDLER_URL=...`
- `EXECUTE_ONCHAIN=1`

然后执行同样的命令：

```bash
pnpm demo:pay
```

输出会包含 `userOpHash` 与最终状态（用于展示 AA 路径的执行结果）。

---

## 策略说明（最小可复现）

当前实现的最小策略集：

- **收款白名单**：`ALLOWLIST`（逗号分隔地址）
- **单笔上限**：`MAX_AMOUNT`
- **周期限额（可选）**：`DAILY_LIMIT`（按本地 `STATE_PATH` 记录当天累计）

---

## Kite 官方参考

- AA SDK：`https://docs.gokite.ai/kite-chain/5-advanced/account-abstraction-sdk`
- 多签钱包：`https://docs.gokite.ai/kite-chain/5-advanced/multisig-wallet`

> 我们在代码里预留了对 `gokite-aa-sdk` 的探测入口（`PROBE_KITE_AA=1`），后续你接入 AA 路径时可以用来校准 SDK 的真实导出与用法。

---

## 可选：KitePass / Agent 身份（Python 侧最小演示）

Kite AIR 的“Agent 身份”在当前文档里主要以 **KitePass API Key** 的形式交付（`api_key_...`）。本仓库提供一个最小 Python 脚本，方便你拿来录屏/截图证明“身份已接入”：

```bash
python -m pip install -r python/requirements.txt

# PowerShell：只验证 API key 初始化成功（不调用 service）
$env:KITE_API_KEY="api_key_xxx"
python python/kitepass_demo.py

# PowerShell：可选（需要你从 app 里复制 service id）
$env:KITE_SERVICE_ID="agent_xxx"
$env:KITE_PAYLOAD_JSON='{"foo":"bar"}'
python python/kitepass_demo.py
```

> 说明：支付赛道的“链上稳定币转账”仍以 `pnpm demo:pay` 为主；Python 部分是为了更容易展示/证明“Agent 身份（KitePass）”已接入。

