# AgentPayGuard：面向 AI Agent 的链上支付权限与风控（Kite Payment Track）

**项目描述**：AgentPayGuard 是一个面向 AI Agent 的链上支付权限与风控系统，让 AI Agent 在执行链上稳定币支付时，具备可验证身份、可编程权限、可审计记录、可阻断异常的最小闭环。系统支持自然语言支付请求解析、智能风险评估、AI增强策略和端到端的链上执行工作流。

本项目目标：让 AI Agent 在执行链上稳定币支付时，具备**可验证身份、可编程权限、可审计记录、可阻断异常**的最小闭环。

---

## 评委 1 分钟判定（赛道最低要求对照）

> 说明：下表是"是否进入评审"的硬门槛对照。占位信息（如 tx hash）请在提交前替换为真实数据。

**交付给 Role C（Tx 证据，来自 B）**  
- **EOA Tx Hash**：`0x8ec4f4a44fb7ef878db9fc549ff81294982224648f3cc21ecad04764dcbd75db`  
- **EOA Kite 链接**：https://testnet.kitescan.ai/tx/0x8ec4f4a44fb7ef878db9fc549ff81294982224648f3cc21ecad04764dcbd75db  
- **AA Tx Hash**：`0x3a58b19983db34e34eb95d9514bf860b3f03e15837c91844729013395b261313`  
- **AA Kite 链接**：https://testnet.kitescan.ai/tx/0x3a58b19983db34e34eb95d9514bf860b3f03e15837c91844729013395b261313  
- **AA UserOp Hash**（可选）：`0x423936cb87ad9946e28f5d06d8ff736735ca7bb43ed7861a8f632919157afce3`

| 赛道要求 | 本项目如何满足 | 证据/位置 |
| --- | --- | --- |
| 链上支付 | 完成 1 笔测试网稳定币转账（由 Agent 触发） | **EOA Tx Hash**：`0x8ec4f4a44fb7ef878db9fc549ff81294982224648f3cc21ecad04764dcbd75db`；**AA Tx Hash**：`0x3a58b19983db34e34eb95d9514bf860b3f03e15837c91844729013395b261313`；Kite 链接见下方「交付给 Role C」 |
| Agent 身份 | 使用 Kite 的 Agent/Passport（或官方身份体系）生成/绑定 Agent 身份 | AA 支付（ERC-4337）UserOp 已执行；AA Tx：`https://testnet.kitescan.ai/tx/0x3a58b19983db34e34eb95d9514bf860b3f03e15837c91844729013395b261313` |
| 权限控制 | 至少 1 条可验证的支付规则（如白名单/限额/有效期）在支付前被强制校验 + **实时链上冻结检查（强依赖模式）** | `Policy` 配置 + 拒绝案例 + 多签冻结 Tx: `https://testnet.kitescan.ai/tx/0xab40fc72ea1fa30a6455b48372a02d25e67952ab7c69358266f4d83413bfa46c` |
| 可复现性 | 提供完整运行说明，一键跑通 "创建 Agent → 发起支付 → 成功到账/被拒绝" | `README.md` / 本文"运行与复现" |

---

## 项目解决的问题

AI Agent 一旦开始"真花钱"，系统立刻出现三个现实问题：

1. **谁在花钱**：服务方与用户需要能验证"这是哪个 Agent、代表谁、在什么授权下"发起支付。
2. **能不能停得住**：Agent 被提示注入、私钥/会话泄露、行为异常时，需要在支付执行前或执行边界上被强制拦截。
3. **事后能不能说清**：需要可追溯的审计链路，回答"这笔钱为什么付、付给谁、谁批准、规则是否被遵守"。

---

## 我们做了什么（MVP 范围）

我们刻意收敛为"能跑通、能演示、能复现"的最小闭环，而不是宏大叙事：

- **🤖 AI Agent 核心**：支持自然语言支付请求解析和智能风险评估
- **Agent 身份（Kite）**：为 Agent 建立可验证身份（Agent/Passport），把"支付请求"与"身份/授权"绑定。
- **支付执行（Kite）**：通过 Kite 支付能力完成稳定币转账（测试网/真实网络均可），展示到账结果。
- **权限/风控（AgentPayGuard）**：在支付执行前强制执行最小规则集（白名单/限额/有效期等） + **AI增强风险评估**。
- **兜底治理（Kite 多签）**：当触发高风险事件时，资金/权限进入多签流程（冻结/解冻/策略更新）。

---

## 与 Kite 官方能力对齐（我们用到什么）

| Kite 能力 | 本项目用法（MVP） | 证据/链接 |
| --- | --- | --- |
| Agent 身份系统（Agent / Passport） | 创建/加载 Agent 身份，并把支付请求与身份绑定，便于追溯与授权证明 | 按官方文档集成（提交时附截图/日志） |
| 账户抽象（AA SDK） | 为 Agent 创建/加载智能账户，让权限/执行更适合自动化场景 | `https://docs.gokite.ai/kite-chain/5-advanced/account-abstraction-sdk` |
| 多签钱包（Multisig） | 自研 SimpleMultiSig（2/3 多签，OpenZeppelin v5）作为安全阀：冻结/解冻/策略更新等敏感操作由多签控制 | 多签地址: `0xA247e042cAE22F0CDab2a197d4c194AfC26CeECA` + 冻结合约: `0x3168a2307a3c272ea6CE2ab0EF1733CA493aa719` + 冻结 Tx: `https://testnet.kitescan.ai/tx/0xab40fc72ea1fa30a6455b48372a02d25e67952ab7c69358266f4d83413bfa46c` |
| 稳定币支付（Stablecoin Payment） | 执行 1 笔稳定币链上转账（测试网/真实网），并展示到账 | EOA Tx：`https://testnet.kitescan.ai/tx/0x8ec4f4a44fb7ef878db9fc549ff81294982224648f3cc21ecad04764dcbd75db`；AA Tx：`https://testnet.kitescan.ai/tx/0x3a58b19983db34e34eb95d9514bf860b3f03e15837c91844729013395b261313` |

---

## AI Agent 核心功能（新增亮点）

### 🤖 自然语言支付解析
- 从自然语言指令中提取收款地址、金额、币种、支付目的
- 示例：`"Pay 100 USDC to 0x... for server hosting"`

### 🧠 智能风险评估
- AI评估支付风险（0-100分数，低/中/高风险等级）
- 基于支付目的、金额、历史模式的风险分析
- 提供风险理由和改进建议

### 🔒 AI增强策略
- 传统规则（白名单、限额） + AI风险控制的组合
- 可配置AI风险阈值（如拒绝高风险支付）
- 支持AI评估失败时的降级处理

### 🚀 端到端AI工作流
```
自然语言请求 → AI意图解析 → 风险评估 → 策略检查 → 链上执行
```

---

## 核心工作流（Demo 脚本，建议现场照念）

### Demo A：AI Agent 自然语言支付（证明"智能支付"）

1. 使用自然语言指令发起支付：`"Pay 50 USDC to 0x... for server hosting"`
2. AI解析支付意图，提取收款地址、金额、币种、目的
3. AI进行风险评估，生成风险分数和等级
4. 结合传统规则和AI风险评估进行策略检查
5. 执行链上支付，展示交易结果

**预期展示点**：自然语言接口 → AI意图解析 → 智能风险评估 → 链上执行 → 完整AI工作流。

### Demo B：正常支付（证明"能付钱"）

1. 创建/加载 Agent 身份（Kite Agent/Passport）。
2. 创建/加载 Agent 的智能账户（AA）。
3. 配置策略（例：允许收款地址白名单 + 单笔上限）。
4. 触发一次支付：Agent 向白名单地址转账 `X` 稳定币。
5. 展示链上结果：交易成功 + 记录可追溯（贴 tx hash）。

**预期展示点**：有身份 → 有规则 → 有稳定币到账 → 有链上可查证据。

### Demo C：异常支付被阻断（证明"能拦住"）

1. 模拟异常：把收款地址换成非白名单地址，或把金额改成超过限额。
2. 再次触发支付。
3. 展示结果：支付被拒绝（失败原因明确），并记录一次"策略命中/拒绝"事件。

**预期展示点**：拦截发生在支付边界上，规则是可验证/可复现的。

### Demo D：多签兜底（证明"有人类可控的安全阀"）

1. 触发高风险状态（例如连续多次拒绝/可疑行为）后进入"冻结/暂停"模式。
2. 由多签成员执行解冻/调整策略/恢复服务。

---

## 技术架构（从身份到支付的最短链路）

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

---

## 最小策略集（AI增强版）

本项目不追求"AI 风控模型"，而是先把**支付权限边界**做成可编程、可证明：

- **收款地址白名单**：只允许支付给预先登记的供应商/合约地址。
- **单笔上限**：每笔最多支付 `X`。
- **周期限额（可选）**：每日/每小时总额不超过 `Y`。
- **授权有效期（可选）**：超过有效期的支付请求自动失效。
- **AI风险评估**：基于支付目的、金额、历史模式的风险评分（0-100）。
- **AI风险阈值**：可配置最大风险分数（默认70）和自动拒绝的风险等级（默认["high"]）。
- **链上冻结检查**：实时检查多签冻结状态（强依赖模式）。

> 这些规则的价值在于：评委可以当场改配置、复现"允许/拒绝"的差异，并在链上/日志中看到结果。

---

## 为什么一定要链上（给评委的 3 句话版本）

1. **链上合约能 enforce（强制执行）**：规则不是"建议"，而是支付边界的一部分，能被验证、难以绕过。
2. **链上天然可审计**：事后可以用链上证据回答"谁付了钱、付给谁、规则是否被遵守"。
3. **跨组织可共享信任**：当服务方、用户、审计方不在同一套中心化系统时，链上是共同可信的对账层。

---

## 运行与复现（提交时请补全为可一键运行）

> 目标：让评委按步骤跑通 Demo A/B（最好 5 分钟内完成）。

### 前置条件

- Node.js >= 18 / pnpm
- Kite 测试网 RPC 与测试币（按官方文档）
- 环境变量（按 `README.md` 补齐）：`RPC_URL`、`PRIVATE_KEY`、`SETTLEMENT_TOKEN_ADDRESS`、`RECIPIENT` 等
- （可选）OpenAI API Key（用于AI意图解析和风险评估）

### 一键脚本（示例占位）

```bash
# 安装依赖
pnpm i

# Demo A：AI Agent 自然语言支付
pnpm demo:ai-agent "Pay 50 USDC to 0xd2d45ef2f2ddaffc8c8bc03cedc4f55fb9e97e2b for server hosting"

# Demo B：正常支付（输出 tx hash）
pnpm demo:pay

# Demo C：触发异常并被阻断（输出拒绝原因）
pnpm demo:reject

# Demo D：验证链上冻结风控
pnpm demo:freeze
```

### 交付物清单（建议）

- 演示视频：包含 Demo A/B/C/D（可选但加分）
- 截图：展示AI意图解析、风险评估、策略配置、拒绝原因、链上交易页面（tx hash）
- README：从零到跑通（无脑跟做）

---

## 项目亮点（面向评委）

1. **🤖 真正的AI Agent**：不仅仅是自动化脚本，而是能理解自然语言、进行风险评估的智能系统
2. **🔒 多层安全防护**：传统规则 + AI风险评估 + 链上冻结检查
3. **🚀 端到端工作流**：从自然语言请求到链上执行的完整闭环
4. **📊 可验证的AI决策**：AI风险评估透明可解释，提供风险理由和建议
5. **🔄 优雅降级**：无AI API时自动使用回退解析器，保证系统可用性

---

## 最新更新（2026-01-31）

✅ **AI Agent升级完成**：项目已从"安全支付系统"升级为"智能AI Agent支付系统"
- 新增：`src/lib/ai-intent.ts` - AI意图解析和风险评估模块（269行）
- 新增：`src/demo-ai-agent.ts` - AI Agent演示脚本（208行）
- 增强：`src/lib/policy.ts` - AI增强策略引擎（扩展到512行）
- 更新：完整AI工作流，支持自然语言接口

**Git提交**：`39233da` - "feat: Add AI Agent capabilities to AgentPayGuard"

---

## 参考（仅官方/项目内）

- Kite 多签钱包文档：`https://docs.gokite.ai/kite-chain/5-advanced/multisig-wallet`
- Kite 账户抽象 SDK：`https://docs.gokite.ai/kite-chain/5-advanced/account-abstraction-sdk`
- Kite 白皮书（项目内）：`resources/kite_whitepaper.pdf`
- 项目工作日志：`docs/internal/AGENT_WORKLOG.md`（Phase 1-20 完整历史）