# 演示视频演讲稿（简化版）

**快速参考 · 3 分钟版本**

---

## 📝 中文版（逐句稿）

### Part 1: 开场（0:00-0:20）

> 当 AI Agent 具备在链上动用真金白银的能力时，你需要三样东西：
> 
> 第一，可验证的身份——知道是谁在花钱，代表谁。
> 
> 第二，可执行的规则——白名单、限额、冻结，这些规则在执行前就必须强制执行。
> 
> 第三，在出事时能够随时叫停的手段——当异常发生时，能够立即阻断支付。
> 
> 这就是 AgentPayGuard——一个从自然语言到链上支付的完整闭环系统。

---

### Part 2: 自然语言支付（0:20-1:00）

> 一切从一句话开始。
> 
> "给这个地址转 10 USDC，用于服务器托管费用。"
> 
> 系统会立即解析你的意图：提取收款地址、金额、币种和用途。
> 
> 同时，AI 会评估这笔支付的风险——给出风险等级和评分，并说明原因。
> 
> 风险评估显示：低风险，评分 15 分。原因是：金额适中、用途明确、收款地址在白名单内。
> 
> 策略检查通过：已批准。这意味着这笔支付符合所有规则。

---

### Part 3: 链上执行（1:00-1:30）

> 现在，我们点击"确认并上链执行"。
> 
> 交易已成功提交到 Kite 测试网。
> 
> 这里显示了交易哈希。每笔支付都在链上可查、可审计。
> 
> 让我们在 Kite 区块浏览器中查看这笔交易。
> 
> 你可以看到：发送方、接收方、金额、状态、时间戳。
> 
> 所有这些信息都永久记录在链上，任何人都可以验证。

---

### Part 4: 策略控制（1:30-2:00）

> 规则不是建议，而是硬性约束。
> 
> 在控制台，你可以看到当前的策略配置：白名单、单笔上限、日限额。
> 
> 现在，我们尝试向一个不在白名单的地址转账 1000 USDC——这明显违反了规则。
> 
> AI 仍然能够解析意图——它理解你要做什么。
> 
> 但是，策略检查显示：已拒绝。
> 
> 拒绝原因：收款地址不在白名单内，且金额超过单笔上限。
> 
> 这就是关键：规则在执行前强制执行。

---

### Part 5: 链上冻结（2:00-2:30）

> 当我们需要紧急停止向某个地址付款时，怎么办？
> 
> AgentPayGuard 提供了链上冻结功能。
> 
> 我们可以查询任意地址的冻结状态。
> 
> 如果你是多签所有者，可以提交冻结提案。
> 
> 所有冻结和解冻操作都需要通过 2/3 多签确认。
> 
> 一旦达到 2/3 确认，任何所有者都可以执行提案。
> 
> 这就是人类兜底：即使 AI 和策略都通过了，如果某个地址被标记为可疑，多签所有者可以立即冻结它。

---

### Part 6: 总结（2:30-3:00）

> AgentPayGuard 完全满足 Kite Payment Track 的四项要求：
> 
> 第一，链上支付——我们在 Kite 测试网上完成了稳定币转账。
> 
> 第二，Agent 身份——通过 Kite 账户抽象 SDK，Agent 拥有独立的链上身份。
> 
> 第三，权限控制——白名单、限额、链上冻结，所有规则在执行前强制执行。
> 
> 第四，可复现性——代码完全开源，README 提供了详细的运行指南。
> 
> 代码库、交易证据和详细文档都在 README 中。感谢观看。

---

## 📝 English Version (Line-by-Line)

### Part 1: Opening (0:00-0:20)

> When an AI Agent can move real money on-chain, you need three things:
> 
> First, verifiable identity—know who is spending, and on whose behalf.
> 
> Second, enforceable rules—allowlist, limits, freeze. These rules must be enforced before execution.
> 
> Third, a way to stop it when something goes wrong—when anomalies occur, payments can be immediately blocked.
> 
> This is AgentPayGuard—a complete loop from natural language to on-chain payment.

---

### Part 2: Natural Language Payment (0:20-1:00)

> It all starts with a sentence.
> 
> "Pay 10 USDC to this address for server hosting."
> 
> The system immediately parses your intent: extracting recipient address, amount, currency, and purpose.
> 
> At the same time, AI assesses the risk of this payment—providing risk level, score, and reasons.
> 
> Risk assessment shows: Low risk, score 15. Reasons: moderate amount, clear purpose, recipient in allowlist.
> 
> Policy check: APPROVED. This means the payment meets all rules.

---

### Part 3: On-Chain Execution (1:00-1:30)

> Now, we click "Confirm & Execute On-chain."
> 
> Transaction successfully submitted to Kite testnet.
> 
> Here's the transaction hash. Every payment is on-chain, verifiable and auditable.
> 
> Let's check this transaction on Kite block explorer.
> 
> You can see: From, To, Amount, Status, Timestamp.
> 
> All this information is permanently recorded on-chain, verifiable by anyone.

---

### Part 4: Policy Control (1:30-2:00)

> Rules are not suggestions—they are hard constraints.
> 
> In the dashboard, you can see current policy: allowlist, max amount, daily limit.
> 
> Now, we try to send 1000 USDC to an address not in the allowlist—this clearly violates the rules.
> 
> AI can still parse the intent—it understands what you want to do.
> 
> But policy check shows: REJECTED.
> 
> Reason: recipient not in allowlist, and amount exceeds per-transfer limit.
> 
> This is the key: rules are enforced before execution.

---

### Part 5: On-Chain Freeze (2:00-2:30)

> When we need to urgently stop payments to an address, what do we do?
> 
> AgentPayGuard provides on-chain freeze functionality.
> 
> We can check the freeze status of any address.
> 
> If you're a multisig owner, you can submit a freeze proposal.
> 
> All freeze and unfreeze operations require 2/3 multisig confirmation.
> 
> Once 2/3 is reached, any owner can execute the proposal.
> 
> This is the human override: even if AI and policy both pass, if an address is marked suspicious, multisig owners can immediately freeze it.

---

### Part 6: Summary (2:30-3:00)

> AgentPayGuard fully meets the four requirements of Kite Payment Track:
> 
> First, on-chain payment—We completed stablecoin transfers on Kite testnet.
> 
> Second, Agent identity—Through Kite Account Abstraction SDK, Agents have independent on-chain identity.
> 
> Third, permission control—Allowlist, limits, on-chain freeze. All rules enforced before execution.
> 
> Fourth, reproducibility—Code is fully open source, README provides detailed run instructions.
> 
> Repository, transaction evidence, and detailed documentation are all in the README. Thanks for watching.

---

## 🎯 关键操作时间点

| 时间 | 操作 | 关键展示 |
|------|------|----------|
| 0:20 | 进入 AI Chat | 对话界面 |
| 0:25 | 输入支付指令 | 自然语言输入 |
| 0:30 | AI 解析完成 | 解析结果卡片 |
| 0:35 | 风险评估完成 | 风险等级、评分 |
| 0:40 | 策略检查通过 | APPROVED 状态 |
| 1:00 | 点击确认执行 | 交易提交 |
| 1:10 | 交易成功 | 交易哈希 |
| 1:15 | 打开区块浏览器 | 链上验证 |
| 1:30 | 切换到 Dashboard | 策略配置 |
| 1:40 | 输入拒绝指令 | 策略拒绝演示 |
| 2:00 | 切换到 Freeze | 冻结功能 |
| 2:10 | 切换到 Proposals | 多签提案 |
| 2:30 | 回到首页 | 功能总结 |

---

## 💡 录制提示

- **语速：** 每分钟 150-180 字（中文）或 120-150 词（英文）
- **停顿：** 在关键操作后停顿 1-2 秒
- **强调：** 核心功能处放慢语速
- **画面：** 操作要与台词同步

---

**完整版演讲稿见：** `DEMO_VIDEO_SCRIPT_FULL.md`
