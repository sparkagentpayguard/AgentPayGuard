# AgentPayGuard

**以 Agent 为原生的支付：可验证身份、可编程治理与人类兜底。**

[**English**](README.md)

---

# Part I — 评委与评审

## 愿景

Kite 白皮书指出制约 Agent 经济的瓶颈：*自主 Agent 仍被为人类设计的基础设施所束缚*——要么赋予其资金权限并承担无界损失风险，要么要求人工授权从而丧失自主性。出路是**无需信任的支付基础设施**：让 Agent 作为**一等经济主体**，在**可编程约束**与**不可篡改审计**下运行，依靠**数学保证的安全而非假定信任**（[《From Human-Centric to Agent-Native》](https://gokite.ai/kite-whitepaper)）。

AgentPayGuard 是在 Kite 上的一次具体实现。我们围绕三个问题：*谁*在花钱（身份）、*能否*在需要时叫停（策略与冻结）、*事后*如何说清（审计）。闭环为：自然语言支付请求 → AI 意图解析与风险评估 → **可编程规则**与链上冻结检查 → 在 Kite 上完成稳定币转账。规则在执行前强制执行；2/3 多签提供冻结/解冻的人类兜底。流水线与模型解耦——未来可接入本地或边缘部署的大模型，在不变更策略层的前提下实现亚秒级、数据可控的决策。

---

## 我们做了什么

与 Kite 的 **SPACE** 方向一致（稳定币原生、可编程约束、Agent 优先身份、合规就绪审计、经济可行的小额支付）：

- **自然语言支付：** Agent 接受如「Pay 50 USDC to 0x... for server hosting」的指令，解析收款人、金额、币种与目的，在执行任何链上调用前完成策略与风险检查。
- **可编程约束：** 白名单、单笔与日限额、链上冻结（多签控制）、AI 风险分数与等级——均在执行前强制执行，不依赖信任。
- **Kite 上的稳定币：** EOA 与 AA（Kite 账户抽象）双路径；在 Kite 测试网均有证据。
- **人类兜底：** 2/3 多签（SimpleMultiSig）控制冻结/解冻。地址被冻结后，Agent 无法向其转账；解冻由多签执行。
- **审计轨迹：** 每笔支付可在链上查验；策略与风险结果在日志与 API 响应中明确可查。

---

## 赛道对照

| 要求 | 本项目如何满足 | 证据 |
|------|----------------|------|
| **链上支付** | 在 Kite 测试网完成稳定币转账（EOA + AA） | EOA: [Kite Tx](https://testnet.kitescan.ai/tx/0x8ec4f4a44fb7ef878db9fc549ff81294982224648f3cc21ecad04764dcbd75db) · AA: [Kite Tx](https://testnet.kitescan.ai/tx/0x3a58b19983db34e34eb95d9514bf860b3f03e15837c91844729013395b261313) |
| **Agent 身份** | Kite AA SDK；UserOp 执行与结算 | 见上 AA Tx；[账户抽象 SDK](https://docs.gokite.ai/kite-chain/5-advanced/account-abstraction-sdk) |
| **权限控制** | 白名单、限额、每次支付前链上冻结检查 | 多签: `0xA247e042cAE22F0CDab2a197d4c194AfC26CeECA` · 冻结 Tx: [Kite Tx](https://testnet.kitescan.ai/tx/0xab40fc72ea1fa30a6455b48372a02d25e67952ab7c69358266f4d83413bfa46c) |
| **可复现性** | 一键运行；README 与脚本实现 clone → run | 见下方 Part II；`pnpm demo:pay` / `pnpm demo:ai-agent "..."` |

---

## AI 速度瓶颈与未来

**为何偏慢（冷路径）：** 主要延迟来自远程大模型往返。我们现已改为**单次**合并调用（意图解析 + 风险评估在一次提示中完成）；若失败则回退为两次串行调用。首请求单次调用路径下约 1–4 秒；相同请求或相同意图从缓存返回 &lt;0.01 秒。服务端已复用 `getTokenDecimals` 与 `readSpentToday`，不再对每次请求重复 RPC/读文件。

**已做优化：** 请求级与意图级缓存；冷路径优先单次 LLM 调用；启动预加载与单一解析器实例；高风险在链上调用前按阈值拒绝。

**未来：** 本地或边缘部署模型可显著降低延迟，并可将意图与风险合并为一次提示实现真正的单次调用。当前流水线（意图 → 风险 → 策略 → 链上）已与模型解耦；用本地 LLM 替换云端 API 即可替换推理层。

---

## 与其他 Dapp 的对接

后端提供 HTTP API：`/api/policy`、`/api/pay`、`/api/ai-pay`、`/api/freeze`。任何 Dapp 或服务可：

- **查询策略**（白名单数量、限额）与**地址冻结状态**。
- **发起支付**（自然语言或结构化）并在同一规则与风险检查下执行。

其他 Dapp 可复用我们的策略与风控层而无需重写；调用我们的 API，由我们执行白名单、限额、冻结与可选 AI 风险后再在 Kite 上执行。

---

## 应用场景与未来工作（与 Kite 白皮书对齐）

**应用场景（白皮书 §6）。** 白皮书描述了 Agent 自主性与可编程支付结合的场景：**游戏**（真实小额交易、家长限额）、**物联网**（机对机带宽、按包付费）、**创作者经济**（粉丝打赏、可编程分成）、**API 经济**（每次调用即一笔交易、按请求计费）、**电商**（可编程托管、条件释放）、**个人理财**（自主预算与账单、限额内小额投资）、**知识市场**（去中心化专家、按贡献小额支付）、**供应链**（自主商业网络、里程碑托管）、**DAO**（AI 增强财库、政策内自动再平衡、大额需人类投票）。AgentPayGuard 提供这些场景所依赖的**支付 + 策略 + 冻结**层：白名单、限额、链上冻结与可选 AI 风险。上述任一场景（游戏 Agent、API 计费、个人理财机器人等）均可调用我们的 API，在 Kite 上获得可执行规则与可审计记录。

**未来工作（白皮书 §7）。** 白皮书展望：**零知识可验证 Agent 凭证**（证明属性而不泄露数据）、**可验证推理与计算**（模型输出与决策链的密码学证明）、**可移植声誉网络**（链上声誉、跨平台可移植、自动化信任决策）、**可验证服务发现**（能力与合规证明）、**完整可追溯与证明**（每笔动作配证明、合规与自动救济）。我们自己的路线——本地或边缘部署大模型实现亚秒级、数据可控的意图/风险——与之一致：策略与审计层不变，未来可接入可证明或本地模型；可验证推理（当可用时）可接入同一流水线。

详见：[Kite 白皮书](https://gokite.ai/kite-whitepaper)；全文见 `docs/resources/kite_whitepaper.md`（§6 应用场景，§7 未来工作）。

---

## 团队分工

| 角色 | 职责 |
|------|------|
| **Sulla** | 后端、demo 展示、架构设计、主题设计、视频制作 |
| **huahua** | 合约、多签钱包（SimpleMultiSig / SimpleFreeze） |
| **yoona** | 前端（Web UI、看板、可视化） |
| **zh4o** | PPT、视频剪辑、视觉与素材整理 |

---

## FAQ：冻结后资金怎么取出来？

在本项目中，「冻结」指**禁止 Agent 向该地址转账**，不锁定、不没收该地址上已有资产。因此：

- **已在**被冻结地址内的资金仍由该地址的私钥控制，可照常转出。
- 若要让 Agent **再次向该地址付款**，由多签成员执行**解冻**；之后策略即允许向该地址支付。

若未来设计中将资金存放在多签控制的**金库合约**中，提款将是另一笔多签执行的交易（如「从金库提款到地址 X」）；当前 SimpleFreeze 仅限制「Agent → 收款人」，不涉及金库提款。

---

## 参考（官方）

- [Kite 白皮书](https://gokite.ai/kite-whitepaper) — *From Human-Centric to Agent-Native: Building Trustless Payment Infrastructure for Agentic AI*
- [Kite 账户抽象 SDK](https://docs.gokite.ai/kite-chain/5-advanced/account-abstraction-sdk)
- [Kite 多签钱包](https://docs.gokite.ai/kite-chain/5-advanced/multisig-wallet)
- [SPARK AI Hackathon](https://github.com/CasualHackathon/SPARK-AI-Hackathon)

项目内白皮书来源：`docs/resources/kite_whitepaper.md`、`docs/resources/kite_micar_whitepaper.md`。

---

# Part II — 开发者

## 快速开始

```bash
git clone <repo> && cd AgentPayGuard && git submodule update --init --recursive
pnpm i
cp .env.example .env   # 设置 PRIVATE_KEY、RPC_URL、SETTLEMENT_TOKEN_ADDRESS、RECIPIENT
pnpm demo:pay          # 干跑（不发链上交易）
pnpm demo:ai-agent "Pay 10 USDC to 0xd2d45ef2f2ddaffc8c8bc03cedc4f55fb9e97e2b for test"
```

真实链上：在 `.env` 中设置 `EXECUTE_ONCHAIN=1`，并确保钱包有测试用 KITE 与稳定币（见下方「测试准备」）。

## 环境

- Node.js ≥ 18（建议 20+）、pnpm
- `.env`：`PRIVATE_KEY`、`RPC_URL`（默认 Kite 测试网）、`SETTLEMENT_TOKEN_ADDRESS`、`RECIPIENT`；可选 `OPENAI_API_KEY` 或其他 AI key 用于意图/风险（见 `.env.example`）

可选：[Chainlink env-enc](https://www.npmjs.com/package/@chainlink/env-enc) 加密敏感项——先执行一次 `npx env-enc set-pw` 设置密码，再执行 `npx env-enc set`。

## 命令

| 命令 | 说明 |
|------|------|
| `pnpm demo:pay` | 一次支付流程（默认干跑） |
| `pnpm demo:reject` | 触发策略拒绝（如非白名单） |
| `pnpm demo:freeze` | 验证链上冻结检查 |
| `pnpm demo:ai-agent "Pay 50 USDC to 0x... for hosting"` | 自然语言支付 |
| `pnpm server` | 启动 API（默认端口 3456）：`/api/health`、`/api/policy`、`/api/pay`、`/api/ai-pay`、`/api/freeze` |
| `pnpm typecheck` | TypeScript 检查 |

**服务端提示：** 若要在终端看到实时日志，可运行 `npx tsx src/server.ts` 代替 `pnpm server`。若 **PRIVATE_KEY** 在 **.env.enc**（Chainlink env-enc）里，先执行一次 `npx env-enc set-pw` 设置密码，再用 `npx env-enc set` 写入敏感项；然后正常启动 `npx tsx src/server.ts`（config 会在启动时加载 .env.enc）。

## 前端

- 子模块：`frontend/`。克隆后执行 `git submodule update --init --recursive`。
- 运行：`cd frontend && npm i && npm run dev`。主仓 API 在 3456 时，开发服务器会将 `/api` 代理到该端口。
- 页面：Pay、AI Pay、Freeze、Proposals、Dashboard、History（真实合约数据）。策略与冻结状态可展示并通过 API 查询。钱包弹窗中的余额（如 0.289 ETH）为**链上真实数据**（wagmi `useBalance`）。

## 测试准备

- **KITE：** [Kite 测试网水龙头](https://faucet.gokite.ai/)（每地址限额）。
- **稳定币：** 在 `.env` 中设置 `SETTLEMENT_TOKEN_ADDRESS`（见 Kite 文档测试网代币）。
- 低余额测试：小额 `AMOUNT` / `MAX_AMOUNT` / `DAILY_LIMIT` 配合干跑可覆盖大部分策略/冻结场景；详见 `docs/guides/TESTING_GUIDE.md`。

## 仓库结构

| 路径 | 用途 |
|------|------|
| `src/server.ts` | HTTP API |
| `src/lib/ai-intent.ts` | 意图解析与风险评估 |
| `src/lib/policy.ts` | 策略引擎（白名单、限额、冻结、AI 风险） |
| `src/lib/run-pay.ts` | 共享支付逻辑（CLI + API） |
| `src/lib/kite-aa.ts` | Kite AA（ERC-4337） |
| `src/demo-ai-agent.ts`、`demo-pay.ts`、`demo-reject.ts` | 演示脚本 |
| `contracts/` | SimpleMultiSig、SimpleFreeze |
| `frontend/` | Web UI（子模块） |

## Kite 与参赛链接

- **Kite 测试网：** RPC `https://rpc-testnet.gokite.ai/` · 浏览器：[testnet.kitescan.ai](https://testnet.kitescan.ai/)
- **黑客松：** [SPARK AI Hackathon](https://github.com/CasualHackathon/SPARK-AI-Hackathon)
