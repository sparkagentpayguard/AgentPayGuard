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

---

## 技术架构

### 为什么选择这些技术

1. **Kite AA SDK（账户抽象）**
   - **为什么**：实现 Agent 优先的身份验证，支持分层身份委托，解决凭证管理复杂性
   - **是什么**：使用 `gokite-aa-sdk` 为 Agent 创建智能合约账户，在协议层面实现可编程约束
   - **优势**：Agent 可以作为一等经济主体，无需手动密钥管理

2. **AI 意图解析 + 风险评估**
   - **为什么**：自然语言理解实现人性化交互，AI 风险评估提供智能威胁检测
   - **是什么**：多提供商 LLM 支持（OpenAI、DeepSeek、Gemini、Claude、Ollama）用于意图解析和风险评分
   - **优势**：检测提示注入、可疑模式和上下文异常，这些是规则系统无法捕获的

3. **多层策略引擎**
   - **为什么**：纵深防御——结合基于规则的检查（白名单、限额）与 AI 风险评估和链上冻结状态
   - **是什么**：传统规则（白名单、最大金额、日限额）+ AI 风险评分（0-100）+ 链上冻结检查（多签控制）
   - **优势**：在执行前数学强制执行，而非基于信任——规则在任何链上调用前检查

4. **链上冻结机制**
   - **为什么**：当 AI 检测到威胁或多签成员识别可疑活动时，提供紧急停止能力
   - **是什么**：由 2/3 多签（SimpleMultiSig）控制的 SimpleFreeze 合约
   - **优势**：人类兜底机制用于冻结/解冻，能够快速响应安全事件

5. **模型无关流水线**
   - **为什么**：面向未来的设计允许将云端 LLM 替换为本地/边缘模型，而无需更改策略层
   - **是什么**：AI 推理层和策略执行层之间的清晰分离
   - **优势**：未来可迁移到亚秒级、数据可控的本地模型，同时保持相同的安全保证

### 系统架构图

```
User(授权/配置策略)
  └─ Agent（Kite 身份：Agent/Passport）
       └─ AI Intent Parser（自然语言解析 + 风险评估）
            └─ AA 智能账户（Kite AA SDK）
                 └─ Policy Guard（白名单/限额/有效期 + AI风险评估…）
                      └─ Stablecoin Payment（链上转账）
                           └─ Audit Trail（链上可查 + 可选本地日志）

异常/高风险 → SimpleMultiSig（自研 2/3 多签）介入：冻结/解冻/策略更新
  - 多签地址: 0xA247e042cAE22F0CDab2a197d4c194AfC26CeECA
  - 冻结合约: 0x3168a2307a3c272ea6CE2ab0EF1733CA493aa719
  - 冻结操作 Tx: https://testnet.kitescan.ai/tx/0xab40fc72ea1fa30a6455b48372a02d25e67952ab7c69358266f4d83413bfa46c
```

### 核心模块

**核心模块**（基础功能必需）：

| 模块 | 文件 | 功能 |
|------|------|------|
| **AI 意图解析** | [`src/lib/ai-intent.ts`](src/lib/ai-intent.ts) | 自然语言解析、风险评估、多AI提供商支持 |
| **策略引擎** | [`src/lib/policy.ts`](src/lib/policy.ts) | 白名单/限额/AI风险评估/链上冻结检查 |
| **支付执行** | [`src/lib/run-pay.ts`](src/lib/run-pay.ts) | EOA/AA 支付路径统一接口 |
| **ERC20 转账** | [`src/lib/erc20.ts`](src/lib/erc20.ts) | EOA 直接转账 |
| **AA 支付** | [`src/lib/kite-aa.ts`](src/lib/kite-aa.ts) | Kite AA SDK 集成 |
| **API 服务** | [`src/server.ts`](src/server.ts) | HTTP API（供前端调用） |

**支持模块**（增强功能和优化）：

| 模块 | 文件 | 功能 |
|------|------|------|
| **配置管理** | [`src/lib/config.ts`](src/lib/config.ts) | 环境变量加载与验证 |
| **状态管理** | [`src/lib/state.ts`](src/lib/state.ts) | 本地支付记录与限额追踪 |
| **提示注入防护** | [`src/lib/prompt-injection.ts`](src/lib/prompt-injection.ts) | 输入验证和注入检测 |
| **重试机制** | [`src/lib/retry.ts`](src/lib/retry.ts) | 指数退避重试逻辑 |
| **批量 AI 处理** | [`src/lib/batch-ai.ts`](src/lib/batch-ai.ts) | 批量 AI 请求处理（性能优化） |
| **异步链上查询** | [`src/lib/async-chain.ts`](src/lib/async-chain.ts) | 并行链上查询优化 |
| **性能监控** | [`src/lib/metrics.ts`](src/lib/metrics.ts) | 性能监控和统计 |
| **请求队列** | [`src/lib/request-queue.ts`](src/lib/request-queue.ts) | 请求队列和批处理 |

**可选 ML 模块**（MVP/简化实现，详见[机器学习功能](#机器学习功能可选mvp简化实现)）：

| 模块 | 文件 | 功能 |
|------|------|------|
| **ML 服务** | [`src/lib/ml/ml-service.ts`](src/lib/ml/ml-service.ts) | ML 模型管理（XGBoost、异常检测） |
| **特征工程** | [`src/lib/ml/features.ts`](src/lib/ml/features.ts) | 59维特征计算 |
| **异常检测** | [`src/lib/ml/anomaly-detection.ts`](src/lib/ml/anomaly-detection.ts) | 基于孤立森林的异常检测（MVP） |
| **XGBoost 模型** | [`src/lib/ml/xgboost-model.ts`](src/lib/ml/xgboost-model.ts) | 风险预测模型（MVP） |
| **数据收集** | [`src/lib/ml/data-collector.ts`](src/lib/ml/data-collector.ts) | 自动交易数据收集 |
| **特征缓存** | [`src/lib/feature-cache.ts`](src/lib/feature-cache.ts) | 特征预计算和缓存 |

---

## 赛道对照

| 要求 | 本项目如何满足 | 证据 |
|------|----------------|------|
| **链上支付** | 在 Kite 测试网完成稳定币转账（EOA + AA） | EOA: [Kite Tx](https://testnet.kitescan.ai/tx/0x8ec4f4a44fb7ef878db9fc549ff81294982224648f3cc21ecad04764dcbd75db) · AA: [Kite Tx](https://testnet.kitescan.ai/tx/0x3a58b19983db34e34eb95d9514bf860b3f03e15837c91844729013395b261313) |
| **Agent 身份** | KitePass（Agent Passport）+ Kite AA SDK | KitePass API Key（可选）或 AA SDK 账户抽象（无需 API Key）；支付请求与 Agent 身份绑定 |
| **权限控制** | 白名单、限额、每次支付前链上冻结检查 | 多签: `0xA247e042cAE22F0CDab2a197d4c194AfC26CeECA` · 冻结 Tx: [Kite Tx](https://testnet.kitescan.ai/tx/0xab40fc72ea1fa30a6455b48372a02d25e67952ab7c69358266f4d83413bfa46c) |
| **可复现性** | 一键运行；README 与脚本实现 clone → run | 见下方 Part II；`pnpm demo:pay` / `pnpm demo:ai-agent "..."` |

---

## 🔒 AI 增强策略

### 最小策略集

- **收款地址白名单**：只允许支付给预先登记的供应商/合约地址
- **单笔上限**：每笔最多支付 `MAX_AMOUNT`
- **周期限额（可选）**：每日总额不超过 `DAILY_LIMIT`
- **授权有效期（可选）**：超过有效期的支付请求自动失效
- **AI风险评估**：基于支付目的、金额、历史模式的风险评分（0-100）
- **AI风险阈值**：可配置最大风险分数（默认70）和自动拒绝的风险等级（默认["high"]）
- **链上冻结检查**：实时检查多签冻结状态（强依赖模式）
- **ML风险评估（可选）**：XGBoost 模型 + 孤立森林异常检测，59维特征工程

### AI 功能特性

#### 🤖 自然语言支付解析
- 从自然语言指令中提取收款地址、金额、币种、支付目的
- 示例：`"Pay 100 USDC to 0x... for server hosting"`

#### 🧠 智能风险评估
- AI评估支付风险（0-100分数，低/中/高风险等级）
- 基于支付目的、金额、历史模式的风险分析
- 提供风险理由和改进建议

#### 🔒 AI增强策略
- 传统规则（白名单、限额） + AI风险控制的组合
- 可配置AI风险阈值（如拒绝高风险支付）
- 支持AI评估失败时的降级处理

#### 🚀 端到端AI工作流
```
自然语言请求 → AI意图解析 → 风险评估 → 策略检查 → 链上执行
```

### 机器学习功能（可选，MVP/简化实现）

系统包含 ML 模块，用于高级风险检测。**注意：当前实现为简化 MVP 版本，用于演示目的。**

#### 🧠 ML 风险评估（MVP）
- **59维特征工程**：时间窗口（1h/24h/7d/30d）、行为序列、地址关联、用户画像、链上特征
- **XGBoost 模型**：有监督风险预测模型（**简化 MVP 实现**，生产环境建议使用完整版本）
- **孤立森林**：无监督异常检测，支持冷启动场景（**简化 MVP 实现**）
- **自动数据收集**：生产环境中自动收集交易数据用于模型训练
- **特征缓存**：常用收款地址特征预计算（1小时TTL）和用户特征缓存（30分钟TTL）

**配置**：
```bash
# 启用 ML 功能
ENABLE_ML_FEATURES=1
ML_DATA_PATH=./data/training  # 数据存储路径
```

**⚠️ 重要提示**：当前 ML 实现为**简化 MVP 版本**，适用于演示和概念验证。生产环境建议使用 Python XGBoost/scikit-learn 训练模型，导出为 ONNX/JSON 格式在 Node.js 中推理。详见 [`docs/guides/AI_RISK_CONTROL_ALGORITHM_ANALYSIS.md`](docs/guides/AI_RISK_CONTROL_ALGORITHM_ANALYSIS.md) 了解生产级实现细节。

### 安全特性

#### 🛡️ 提示注入防护
- **20+ 注入模式检测**：高/中/低严重性分类
- **输入清理**：自动清理恶意输入
- **长度限制**：可配置最大长度（默认1000字符）
- **严格模式**：可配置注入容忍度（默认：拒绝所有）

#### 🔄 重试机制
- **指数退避**：自动重试，指数延迟
- **AI API 重试**：3次重试，初始延迟1秒，最大延迟30秒
- **链上 RPC 重试**：5次重试，初始延迟500毫秒，最大延迟10秒
- **智能错误处理**：区分可重试和不可重试错误

### 性能优化

#### ⚡ 批量处理和异步查询
- **批量 AI 处理**：队列和批量处理多个 AI 请求（默认：每批10个）
- **异步链上查询**：并行批量查询冻结状态、余额、交易
- **请求队列**：并发请求管理，支持优先级调度
- **请求去重**：避免重复请求（5秒TTL）

#### 📊 性能监控
- **Metrics API**：`GET /api/metrics` - 实时性能指标
- **API 统计**：总请求数、成功率、平均响应时间、P50/P95/P99 延迟
- **AI 统计**：总调用数、成功率、平均延迟、缓存命中率、按提供商统计
- **支付统计**：总尝试数、成功率、平均处理时间、拒绝原因统计
- **风险评估统计**：总评估数、平均分数、风险分布
- **系统信息**：运行时间、内存使用、Node.js 版本

详见 [`docs/PERFORMANCE_OPTIMIZATION.md`](docs/PERFORMANCE_OPTIMIZATION.md)。

### 支持的 AI 提供商

系统支持多种 AI 提供商，按优先级自动选择：

| 提供商 | 配置变量 | 默认模型 | 特点 |
|--------|----------|----------|------|
| **DeepSeek** | `DEEPSEEK_API_KEY` | `deepseek-chat` | 免费额度，推荐 |
| **Google Gemini** | `GEMINI_API_KEY` | `gemini-1.5-flash` | 免费额度（Flash 版本更快） |
| **OpenAI** | `OPENAI_API_KEY` | `gpt-4o-mini` | 付费 |
| **Claude** | `CLAUDE_API_KEY` | `claude-3-haiku` | 付费 |
| **Ollama** | `OLLAMA_URL` | `llama3.2` | 本地免费 |
| **LM Studio** | `LMSTUDIO_URL` | `local-model` | 本地免费 |

配置示例（[`.env.example`](.env.example)）：
```bash
# 启用 AI 功能
ENABLE_AI_INTENT=1

# DeepSeek（推荐，免费额度）
DEEPSEEK_API_KEY=your-deepseek-api-key-here
AI_MODEL=deepseek-chat

# 或使用 Gemini
# GEMINI_API_KEY=your-gemini-api-key-here
# AI_MODEL=gemini-1.5-flash  # Flash 版本更快

# 或使用本地 Ollama
# OLLAMA_URL=http://localhost:11434/v1
# AI_MODEL=llama3.2
```

---

## 🚀 高级功能

详见[机器学习功能](#机器学习功能可选mvp简化实现)部分了解 ML 模块详情。

### 安全与可靠性

- **提示注入防护**：检测 20+ 注入模式，自动输入清理
- **重试机制**：AI API 指数退避重试（3次），链上 RPC 重试（5次）
- **错误处理**：20+ 错误码，友好错误消息（中英文）
- **输入验证**：长度限制、格式验证、注入检测

### 性能优化

- **批量 AI 处理**：队列和批量处理多个 AI 请求（减少 API 调用）
- **异步链上查询**：并行批量查询冻结状态、余额（降低延迟）
- **特征缓存**：常用收款地址/用户特征预计算（减少计算）
- **请求队列**：并发请求管理，支持优先级调度
- **请求去重**：避免重复请求（5秒TTL）

### 性能监控

- **Metrics API**：`GET /api/metrics` - 实时性能指标
- **仪表盘组件**：`MetricsDashboard` React 组件用于前端可视化
- **关键指标**：API 性能、AI 统计、支付成功率、风险评估分布、系统信息

详见 [`docs/PERFORMANCE_OPTIMIZATION.md`](docs/PERFORMANCE_OPTIMIZATION.md)。

---

## AI 速度瓶颈与未来

**为何偏慢（冷路径）：** 主要延迟来自远程大模型往返。我们现已改为**单次**合并调用（意图解析 + 风险评估在一次提示中完成）；若失败则回退为两次串行调用。首请求单次调用路径下约 1–4 秒；相同请求或相同意图从缓存返回 &lt;0.01 秒。服务端已复用 `getTokenDecimals` 与 `readSpentToday`，不再对每次请求重复 RPC/读文件。

**已做优化：** 请求级与意图级缓存；冷路径优先单次 LLM 调用；启动预加载与单一解析器实例；高风险在链上调用前按阈值拒绝；批量 AI 处理；异步链上查询；特征缓存。

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
| `pnpm server` | 启动 API（默认端口 3456）：`/api/health`、`/api/policy`、`/api/pay`、`/api/ai-pay`、`/api/freeze`、`/api/metrics` |
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

### Agent 身份（KitePass）

AgentPayGuard 集成 **KitePass（Agent Passport）** 身份系统以满足赛道要求：

- **KitePass API Key**：在 `.env` 中设置 `KITE_API_KEY` 以使用官方 KitePass 身份（推荐）
- **回退方案**：如果未设置 `KITE_API_KEY`，使用 `PRIVATE_KEY` 的 EOA 地址作为 Agent 标识符
- **支付绑定**：所有支付请求都与 Agent 身份绑定，用于审计追踪

**获取 KitePass API Key：**
1. 访问 [Kite App](https://app.gokite.ai/)
2. 创建或访问您的 KitePass
3. 复制 API Key
4. 在 `.env` 中设置 `KITE_API_KEY=api_key_xxx`

Agent 身份在启动时自动初始化，并绑定到每个支付请求。

- **黑客松：** [SPARK AI Hackathon](https://github.com/CasualHackathon/SPARK-AI-Hackathon)

---

## 🚀 演示方法

### 环境要求
- Node.js >= 18（建议 20+）
- pnpm
- Kite 测试网 RPC 与测试币
- （可选）OpenAI/DeepSeek/Gemini API Key（用于AI功能）

### 快速开始

#### 1. 安装依赖
```bash
pnpm i
```

#### 2. 配置环境变量
复制 [`.env.example`](.env.example) 为 `.env`，填写关键配置：

```bash
# 网络配置
RPC_URL=https://rpc-testnet.gokite.ai/
CHAIN_ID=2368

# 私钥（仅测试网）
PRIVATE_KEY=0xYOUR_TESTNET_PRIVATE_KEY

# 稳定币合约地址
SETTLEMENT_TOKEN_ADDRESS=0xTODO_TOKEN_ADDRESS

# 收款地址
RECIPIENT=0xTODO_RECIPIENT_ADDRESS
AMOUNT=0.001

# 策略配置
ALLOWLIST=0xTODO_RECIPIENT_ADDRESS
MAX_AMOUNT=1
DAILY_LIMIT=5

# 安全开关（设为1才会真实发送交易）
EXECUTE_ONCHAIN=0

# 支付模式（eoa 或 aa）
PAYMENT_MODE=eoa

# AI 配置（可选）
ENABLE_AI_INTENT=1
DEEPSEEK_API_KEY=your-deepseek-api-key-here
```

#### 3. 运行演示脚本

##### Demo A：AI Agent 自然语言支付
```bash
# 使用自然语言指令执行支付
pnpm demo:ai-agent "Pay 50 USDC to 0xd2d45ef2f2ddaffc8c8bc03cedc4f55fb9e97e2b for server hosting"

# 如果没有配置AI API Key，系统会自动使用回退解析器
```

**预期输出**：
- AI 解析支付意图（收款地址、金额、币种、目的）
- AI 风险评估（分数、等级、理由、建议）
- 策略检查（白名单、限额、AI风险阈值）
- 链上执行结果（dry-run 或真实交易）

##### Demo B：正常支付（证明"能付钱"）
```bash
pnpm demo:pay
```

**预期输出**：
- 策略检查通过
- 链上交易成功（dry-run 模式下显示模拟结果）
- 输出 tx hash（设置 `EXECUTE_ONCHAIN=1` 后）

##### Demo C：异常支付被阻断（证明"能拦住"）
```bash
pnpm demo:reject
```

**预期输出**：
- 策略检查失败（非白名单地址或超过限额）
- 支付被拒绝，显示拒绝原因

##### Demo D：验证链上冻结风控
```bash
pnpm demo:freeze
```

**预期输出**：
- 检查多签冻结状态
- 验证冻结机制是否生效

#### 4. 真实链上交易
设置 `.env` 中 `EXECUTE_ONCHAIN=1`，然后重新运行：

```bash
pnpm demo:pay
# 或使用AI Agent
pnpm demo:ai-agent "Pay 10 USDC to 0xd2d45ef2f2ddaffc8c8bc03cedc4f55fb9e97e2b"
```

**注意**：真实发送前确保钱包有足够测试资产：
- **KITE（原生代币）**：支付 gas，每笔约 0.01～0.05 KITE
- **USDT/USDC（稳定币）**：实际转出金额

### 前端 + API 联调

#### 1. 启动 API 服务
```bash
# 方式 1：使用 pnpm
pnpm server

# 方式 2：直接运行（推荐，可以看到实时输出）
API_PORT=3456 npx tsx src/server.ts
```

默认监听 `http://localhost:3456`，提供以下接口：
- `GET /api/health` - 健康检查
- `GET /api/policy` - 策略配置
- `POST /api/pay` - 发起支付
- `POST /api/ai-pay` - AI 自然语言支付

#### 2. 启动前端开发服务器
```bash
cd frontend && npm i && npm run dev
```

开发环境下 `/api` 会代理到主仓 API（3456），打开首页 → **PAY**，填写收款地址、金额，选择 EOA/AA，勾选「真实发链上交易」后提交即可。

---

## 📋 已完成交付物

### 链上交易证据
- **EOA Tx Hash**：`0x8ec4f4a44fb7ef878db9fc549ff81294982224648f3cc21ecad04764dcbd75db`
- **EOA Kite 链接**：https://testnet.kitescan.ai/tx/0x8ec4f4a44fb7ef878db9fc549ff81294982224648f3cc21ecad04764dcbd75db
- **AA Tx Hash**：`0x3a58b19983db34e34eb95d9514bf860b3f03e15837c91844729013395b261313`
- **AA Kite 链接**：https://testnet.kitescan.ai/tx/0x3a58b19983db34e34eb95d9514bf860b3f03e15837c91844729013395b261313
- **AA UserOp Hash**：`0x423936cb87ad9946e28f5d06d8ff736735ca7bb43ed7861a8f632919157afce3`

### 多签冻结机制
- **多签地址**：`0xA247e042cAE22F0CDab2a197d4c194AfC26CeECA`
- **冻结合约**：`0x3168a2307a3c272ea6CE2ab0EF1733CA493aa719`
- **冻结操作 Tx**：https://testnet.kitescan.ai/tx/0xab40fc72ea1fa30a6455b48372a02d25e67952ab7c69358266f4d83413bfa46c

---

## 🔗 与 Kite 官方能力对齐

| Kite 能力 | 本项目用法（MVP） | 证据/链接 |
|-----------|-------------------|-----------|
| Agent 身份系统（Agent / Passport） | ✅ KitePass API Key 身份验证；支付请求与 Agent 身份绑定 | `src/lib/kite-agent-identity.ts`；支持 KITE_API_KEY 或 EOA 地址作为身份标识 |
| 账户抽象（AA SDK） | 为 Agent 创建/加载智能账户，让权限/执行更适合自动化场景 | https://docs.gokite.ai/kite-chain/5-advanced/account-abstraction-sdk |
| 多签钱包（Multisig） | 自研 SimpleMultiSig（2/3 多签，OpenZeppelin v5）作为安全阀 | 多签地址 + 冻结合约 + 冻结 Tx（见上方） |
| 稳定币支付（Stablecoin Payment） | 执行 1 笔稳定币链上转账（测试网） | EOA Tx + AA Tx（见上方） |

---

## 📝 最新更新（2026-01-31）

✅ **AI Agent升级完成**：项目已从"安全支付系统"升级为"智能AI Agent支付系统"
- 新增：[`src/lib/ai-intent.ts`](src/lib/ai-intent.ts) - AI意图解析和风险评估模块（269行）
- 新增：[`src/demo-ai-agent.ts`](src/demo-ai-agent.ts) - AI Agent演示脚本（208行）
- 增强：[`src/lib/policy.ts`](src/lib/policy.ts) - AI增强策略引擎（扩展到512行）
- 更新：完整AI工作流，支持自然语言接口

**Git提交**：`39233da` - "feat: Add AI Agent capabilities to AgentPayGuard"

---

## 🔧 技术栈

### 后端
- **运行时**：Node.js >= 18
- **语言**：TypeScript 5.7
- **框架**：原生 Node.js HTTP 服务器
- **区块链**：ethers.js 6.15、gokite-aa-sdk 1.0.14
- **AI**：OpenAI SDK 6.17（兼容多种提供商）
- **配置**：dotenv、@chainlink/env-enc、zod

### 前端（子模块）
- **框架**：React + Vite
- **UI**：Tailwind CSS + shadcn/ui
- **Web3**：Reown AppKit（原 WalletConnect）
- **3D**：Three.js + React Three Fiber

### 开发工具
- **包管理**：pnpm
- **类型检查**：TypeScript strict mode
- **代码执行**：tsx

---

## 📚 文档导航

| 文档 | 用途 |
|------|------|
| **使用指南** |
| [`AI_AGENT_GUIDE.md`](docs/guides/AI_AGENT_GUIDE.md) | 🤖 **AI Agent 开发指南**（自然语言解析 + 风险评估 + API参考） |
| [`TESTING_GUIDE.md`](docs/guides/TESTING_GUIDE.md) | 🧪 Role B 测试与演讲指南（5 个场景 + 演讲脚本） |
| [`ROLE_A_GUIDE.md`](docs/guides/ROLE_A_GUIDE.md) | 🔗 多签部署指南（Gnosis Safe + TokenGuard） |
| [`ROLE_C_GUIDE.md`](docs/guides/ROLE_C_GUIDE.md) | 🎨 **前端开发指南**（Web UI + 可视化 + 科技感设计） |
| [`ROLE_D_GUIDE.md`](docs/guides/ROLE_D_GUIDE.md) | 🎥 PPT 与视频制作指南（支持 Role B 演讲） |
| **参考文档** |
| [`ARCHITECTURE.md`](docs/reference/ARCHITECTURE.md) | 🏗️ 系统架构与设计决策 |
| [`allocation.md`](docs/reference/allocation.md) | 👥 角色分工与交付物清单 |
| [`PM_AND_ROLE_B_QUICKREF.md`](docs/internal/PM_AND_ROLE_B_QUICKREF.md) | 📋 PM / 角色 B 快速参考（检查清单 + 文档入口） |
| [`resources/`](docs/resources/) | 📚 **原始资源**（赛道规则、官方链接等） |
| **内部管理** |
| [`FINAL_DELIVERY_CHECKLIST.md`](docs/internal/FINAL_DELIVERY_CHECKLIST.md) | ✅ 最终交付清单（角色 A/B/C/D） |
| [`AGENT_WORKLOG.md`](docs/internal/AGENT_WORKLOG.md) | 📝 工作日志（Phase 摘要） |
| [`.clinerules`](.clinerules) | 📋 Agent 工作约束 + 安全政策（16 条规则、.env 保护） |

---

## 🎯 项目亮点（面向评委）

1. **🤖 真正的AI Agent**：不仅仅是自动化脚本，而是能理解自然语言、进行风险评估的智能系统
2. **🔒 多层安全防护**：传统规则 + AI风险评估 + 链上冻结检查
3. **🚀 端到端工作流**：从自然语言请求到链上执行的完整闭环
4. **📊 可验证的AI决策**：AI风险评估透明可解释，提供风险理由和建议
5. **🔄 优雅降级**：无AI API时自动使用回退解析器，保证系统可用性
6. **🌐 多AI提供商支持**：支持 DeepSeek、Gemini、OpenAI、Claude、Ollama 等多种提供商
7. **🔐 安全第一**：严格的环境变量管理、敏感信息保护、多签冻结机制
