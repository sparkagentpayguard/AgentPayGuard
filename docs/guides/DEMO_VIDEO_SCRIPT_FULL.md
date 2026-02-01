# AgentPayGuard 演示视频完整演讲稿

**目标时长：** 3 分钟（完整版）· 可剪辑为 30 秒精华版

---

## 📋 使用说明

- **时间节点：** 每个部分标注了建议时间范围
- **画面操作：** 括号内为需要展示的画面内容
- **关键展示：** ⭐ 标记为核心功能展示点
- **停顿提示：** 【停顿 1-2 秒】表示需要停顿让观众看清

---

# 中文版演讲稿

---

## Part 1: 开场与问题陈述（0:00-0:20）

### 画面操作
- 打开浏览器，导航到 `http://localhost:5173`
- 展示首页：Logo "AgentPayGuard" + 系统状态面板

### 演讲稿

> 当 AI Agent 具备在链上动用真金白银的能力时，你需要三样东西：
> 
> **第一，可验证的身份**——知道是谁在花钱，代表谁。
> 
> **第二，可执行的规则**——白名单、限额、冻结，这些规则在执行前就必须强制执行。
> 
> **第三，在出事时能够随时叫停的手段**——当异常发生时，能够立即阻断支付。
> 
> 这就是 **AgentPayGuard**——一个从自然语言到链上支付的完整闭环系统，集成了策略管控、AI 风险评估和人工干预机制。

【停顿 1 秒，展示系统状态：在线、安全等级最高、2/3 多签】

---

## Part 2: 自然语言支付演示（0:20-1:00）⭐ 核心功能

### 画面操作
1. 点击首页的 "AI CHAT" 卡片，进入对话页面
2. 在输入框输入：`给 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb 转 10 USDC，用于服务器托管费用`
3. 点击"发送"按钮
4. 等待 AI 响应（展示 loading："思考中..."）

### 演讲稿

> 一切从一句话开始。
> 
> 【输入指令】
> 
> "给这个地址转 10 USDC，用于服务器托管费用。"
> 
> 【等待响应，展示解析结果】
> 
> 系统会立即解析你的意图：提取收款地址、金额、币种和用途。同时，AI 会评估这笔支付的风险——给出风险等级和评分，并说明原因。
> 
> 【鼠标高亮解析结果卡片】
> 
> 你看，这里显示了：
> - 收款地址：已正确提取
> - 金额：10 USDC
> - 用途：服务器托管费用
> - 置信度：95%——说明 AI 对解析结果很有把握
> 
> 【切换到风险评估卡片】
> 
> 风险评估显示：**低风险**，评分 15 分。原因是：金额适中、用途明确、收款地址在白名单内。
> 
> 【切换到策略检查结果】
> 
> 策略检查通过：**已批准**。这意味着这笔支付符合所有规则：收款地址在白名单内，金额未超过单笔上限，今日累计未超过日限额。

【停顿 1 秒，展示"确认并上链执行"按钮】

---

## Part 3: 链上执行与审计（1:00-1:30）

### 画面操作
1. 点击"确认并上链执行"按钮
2. 等待交易确认（展示 loading）
3. 展示交易成功提示和交易哈希
4. 点击交易哈希，跳转到 Kite 区块浏览器
5. 在浏览器中展示交易详情

### 演讲稿

> 现在，我们点击"确认并上链执行"。
> 
> 【点击按钮，等待确认】
> 
> 交易已成功提交到 Kite 测试网。
> 
> 【展示交易哈希】
> 
> 这里显示了交易哈希。每笔支付都在链上可查、可审计。
> 
> 【点击交易哈希，跳转到区块浏览器】
> 
> 让我们在 Kite 区块浏览器中查看这笔交易。
> 
> 【展示浏览器页面】
> 
> 你可以看到：
> - 发送方：Agent 钱包地址
> - 接收方：我们指定的地址
> - 金额：10 USDC
> - 状态：成功
> - 时间戳：交易执行的确切时间
> 
> 所有这些信息都永久记录在链上，任何人都可以验证。

【停顿 1 秒】

---

## Part 4: 策略控制演示（1:30-2:00）

### 画面操作
1. 切换到 Dashboard 页面
2. 展示策略配置：白名单数量、单笔上限、日限额
3. 返回 AI Chat，输入会被拒绝的指令：`给 0x1111111111111111111111111111111111111111 转 1000 USDC`
4. 展示策略拒绝结果

### 演讲稿

> 规则不是建议，而是硬性约束。
> 
> 【切换到 Dashboard】
> 
> 在控制台，你可以看到当前的策略配置：
> - 白名单：包含 3 个地址
> - 单笔上限：100 USDC
> - 日限额：500 USDC
> 
> 【返回 AI Chat，输入新指令】
> 
> 现在，我们尝试向一个不在白名单的地址转账 1000 USDC——这明显违反了规则。
> 
> 【等待响应】
> 
> AI 仍然能够解析意图——它理解你要做什么。
> 
> 【展示解析结果】
> 
> 解析成功：收款地址、金额、币种都正确提取了。
> 
> 【展示策略检查结果】
> 
> 但是，策略检查显示：**已拒绝**。
> 
> 拒绝原因：收款地址不在白名单内，且金额超过单笔上限。
> 
> 这就是关键：规则在执行前强制执行。即使 AI 理解你的意图，即使风险评估通过，只要违反策略，支付就会被立即拒绝。

【停顿 1 秒】

---

## Part 5: 人类兜底 - 链上冻结（2:00-2:30）⭐ 核心功能

### 画面操作
1. 切换到 Freeze 页面
2. 输入一个地址（例如：`0x2222222222222222222222222222222222222222`）
3. 点击"扫描"，展示地址状态
4. 切换到 Proposals 页面，展示提案列表
5. 展示多签确认进度和已执行的交易

### 演讲稿

> 当我们需要紧急停止向某个地址付款时，怎么办？
> 
> 【切换到 Freeze 页面】
> 
> AgentPayGuard 提供了链上冻结功能。
> 
> 【输入地址，点击扫描】
> 
> 我们可以查询任意地址的冻结状态。如果地址未被冻结，显示"正常"；如果已被冻结，显示"已封锁"。
> 
> 【展示冻结提案按钮】
> 
> 如果你是多签所有者，可以提交冻结提案。
> 
> 【切换到 Proposals 页面】
> 
> 所有冻结和解冻操作都需要通过 2/3 多签确认。
> 
> 【展示提案列表】
> 
> 在提案页面，你可以看到：
> - 提案类型：冻结或解冻
> - 目标地址：要冻结的地址
> - 确认进度：当前 1/3，需要 2/3 才能执行
> 
> 一旦达到 2/3 确认，任何所有者都可以执行提案。
> 
> 【展示已执行的提案】
> 
> 已执行的提案会显示交易哈希，你可以在链上验证。
> 
> 这就是人类兜底：即使 AI 和策略都通过了，如果某个地址被标记为可疑，多签所有者可以立即冻结它，阻止所有未来的支付。

【停顿 1 秒】

---

## Part 6: 总结与赛道对照（2:30-3:00）

### 画面操作
1. 回到首页
2. 展示功能卡片：PAY、AI CHAT、MULTI-SIG、FREEZE、PROPOSALS
3. 展示系统状态
4. 展示 README 链接和 Kite 浏览器链接

### 演讲稿

> 让我们回到首页，看看 AgentPayGuard 的完整功能。
> 
> 【展示功能卡片】
> 
> 我们提供了：
> - **PAY**：传统结构化支付
> - **AI CHAT**：对话式自然语言支付
> - **MULTI-SIG**：多签钱包管理
> - **FREEZE**：链上冻结控制
> - **PROPOSALS**：去中心化治理
> 
> 【展示系统状态】
> 
> 系统状态显示：在线、安全等级最高、2/3 多签保护。
> 
> AgentPayGuard 完全满足 Kite Payment Track 的四项要求：
> 
> **第一，链上支付**——我们在 Kite 测试网上完成了稳定币转账，支持 EOA 和账户抽象两种模式。
> 
> **第二，Agent 身份**——通过 Kite 账户抽象 SDK，Agent 拥有独立的链上身份。
> 
> **第三，权限控制**——白名单、限额、链上冻结，所有规则在执行前强制执行。
> 
> **第四，可复现性**——代码完全开源，README 提供了详细的运行指南，几分钟内即可克隆并运行。
> 
> 【展示链接】
> 
> 代码库、交易证据和详细文档都在 README 中。感谢观看。

---

# English Version Script

---

## Part 1: Opening & Problem Statement (0:00-0:20)

### Screen Actions
- Open browser, navigate to `http://localhost:5173`
- Show homepage: Logo "AgentPayGuard" + system status panel

### Script

> When an AI Agent can move real money on-chain, you need three things:
> 
> **First, verifiable identity**—know who is spending, and on whose behalf.
> 
> **Second, enforceable rules**—allowlist, limits, freeze. These rules must be enforced before execution.
> 
> **Third, a way to stop it when something goes wrong**—when anomalies occur, payments can be immediately blocked.
> 
> This is **AgentPayGuard**—a complete loop from natural language to on-chain payment, with policy control, AI risk assessment, and human override.

【Pause 1 second, show system status: Online, Maximum Security, 2/3 Multisig】

---

## Part 2: Natural Language Payment Demo (0:20-1:00) ⭐ Core Feature

### Screen Actions
1. Click "AI CHAT" card on homepage, enter chat page
2. Type in input: `Pay 10 USDC to 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb for server hosting`
3. Click "Send" button
4. Wait for AI response (show loading: "Thinking...")

### Script

> It all starts with a sentence.
> 
> 【Type command】
> 
> "Pay 10 USDC to this address for server hosting."
> 
> 【Wait for response, show parsing result】
> 
> The system immediately parses your intent: extracting recipient address, amount, currency, and purpose. At the same time, AI assesses the risk of this payment—providing risk level, score, and reasons.
> 
> 【Highlight parsing result card】
> 
> You can see:
> - Recipient: correctly extracted
> - Amount: 10 USDC
> - Purpose: server hosting
> - Confidence: 95%—showing AI is confident in the parsing
> 
> 【Switch to risk assessment card】
> 
> Risk assessment shows: **Low risk**, score 15. Reasons: moderate amount, clear purpose, recipient in allowlist.
> 
> 【Switch to policy check result】
> 
> Policy check: **APPROVED**. This means the payment meets all rules: recipient in allowlist, amount under per-transfer limit, daily total under daily limit.

【Pause 1 second, show "Confirm & Execute On-chain" button】

---

## Part 3: On-Chain Execution & Audit (1:00-1:30)

### Screen Actions
1. Click "Confirm & Execute On-chain" button
2. Wait for transaction confirmation (show loading)
3. Show success message and transaction hash
4. Click transaction hash, jump to Kite block explorer
5. Show transaction details in explorer

### Script

> Now, we click "Confirm & Execute On-chain."
> 
> 【Click button, wait for confirmation】
> 
> Transaction successfully submitted to Kite testnet.
> 
> 【Show transaction hash】
> 
> Here's the transaction hash. Every payment is on-chain, verifiable and auditable.
> 
> 【Click hash, jump to block explorer】
> 
> Let's check this transaction on Kite block explorer.
> 
> 【Show explorer page】
> 
> You can see:
> - From: Agent wallet address
> - To: the address we specified
> - Amount: 10 USDC
> - Status: Success
> - Timestamp: exact execution time
> 
> All this information is permanently recorded on-chain, verifiable by anyone.

【Pause 1 second】

---

## Part 4: Policy Control Demo (1:30-2:00)

### Screen Actions
1. Switch to Dashboard page
2. Show policy config: allowlist count, max amount, daily limit
3. Return to AI Chat, type command that will be rejected: `Pay 1000 USDC to 0x1111111111111111111111111111111111111111`
4. Show policy rejection result

### Script

> Rules are not suggestions—they are hard constraints.
> 
> 【Switch to Dashboard】
> 
> In the dashboard, you can see current policy:
> - Allowlist: 3 addresses
> - Max Amount: 100 USDC
> - Daily Limit: 500 USDC
> 
> 【Return to AI Chat, type new command】
> 
> Now, we try to send 1000 USDC to an address not in the allowlist—this clearly violates the rules.
> 
> 【Wait for response】
> 
> AI can still parse the intent—it understands what you want to do.
> 
> 【Show parsing result】
> 
> Parsing successful: recipient, amount, currency all correctly extracted.
> 
> 【Show policy check result】
> 
> But policy check shows: **REJECTED**.
> 
> Reason: recipient not in allowlist, and amount exceeds per-transfer limit.
> 
> This is the key: rules are enforced before execution. Even if AI understands your intent, even if risk assessment passes, as long as policy is violated, payment is immediately rejected.

【Pause 1 second】

---

## Part 5: Human Override - On-Chain Freeze (2:00-2:30) ⭐ Core Feature

### Screen Actions
1. Switch to Freeze page
2. Enter an address (e.g., `0x2222222222222222222222222222222222222222`)
3. Click "Scan", show address status
4. Switch to Proposals page, show proposal list
5. Show multisig confirmation progress and executed transactions

### Script

> When we need to urgently stop payments to an address, what do we do?
> 
> 【Switch to Freeze page】
> 
> AgentPayGuard provides on-chain freeze functionality.
> 
> 【Enter address, click scan】
> 
> We can check the freeze status of any address. If not frozen, shows "Active"; if frozen, shows "Blocked."
> 
> 【Show freeze proposal button】
> 
> If you're a multisig owner, you can submit a freeze proposal.
> 
> 【Switch to Proposals page】
> 
> All freeze and unfreeze operations require 2/3 multisig confirmation.
> 
> 【Show proposal list】
> 
> In the proposals page, you can see:
> - Type: Freeze or Unfreeze
> - Target Address: address to freeze
> - Confirmation Progress: currently 1/3, needs 2/3 to execute
> 
> Once 2/3 is reached, any owner can execute the proposal.
> 
> 【Show executed proposal】
> 
> Executed proposals show transaction hash, verifiable on-chain.
> 
> This is the human override: even if AI and policy both pass, if an address is marked suspicious, multisig owners can immediately freeze it, blocking all future payments.

【Pause 1 second】

---

## Part 6: Summary & Track Alignment (2:30-3:00)

### Screen Actions
1. Return to homepage
2. Show feature cards: PAY, AI CHAT, MULTI-SIG, FREEZE, PROPOSALS
3. Show system status
4. Show README link and Kite explorer link

### Script

> Let's return to the homepage and see AgentPayGuard's complete features.
> 
> 【Show feature cards】
> 
> We provide:
> - **PAY**: Traditional structured payment
> - **AI CHAT**: Conversational natural language payment
> - **MULTI-SIG**: Multisig wallet management
> - **FREEZE**: On-chain freeze control
> - **PROPOSALS**: Decentralized governance
> 
> 【Show system status】
> 
> System status shows: Online, Maximum Security, 2/3 Multisig protection.
> 
> AgentPayGuard fully meets the four requirements of Kite Payment Track:
> 
> **First, on-chain payment**—We completed stablecoin transfers on Kite testnet, supporting both EOA and Account Abstraction modes.
> 
> **Second, Agent identity**—Through Kite Account Abstraction SDK, Agents have independent on-chain identity.
> 
> **Third, permission control**—Allowlist, limits, on-chain freeze. All rules enforced before execution.
> 
> **Fourth, reproducibility**—Code is fully open source, README provides detailed run instructions, can clone and run in minutes.
> 
> 【Show links】
> 
> Repository, transaction evidence, and detailed documentation are all in the README. Thanks for watching.

---

## 🎬 30-Second Highlight Version

### Chinese (中文)

> 【0:00-0:10】当 AI Agent 能自主支付时，你需要可验证身份、可执行规则和人工干预。AgentPayGuard：自然语言 → 策略+风险 → 链上执行。
> 
> 【0:10-0:20】一句话完成支付。输入"转 10 USDC"，AI 解析意图、评估风险、检查策略，通过后链上执行。交易哈希可查，规则强制执行。
> 
> 【0:20-0:30】人工兜底：2/3 多签可冻结可疑地址，阻止所有未来支付。代码开源，链接见 README。谢谢。

### English

> 【0:00-0:10】When AI Agents can autonomously pay, you need verifiable identity, enforceable rules, and human override. AgentPayGuard: natural language → policy + risk → on-chain execution.
> 
> 【0:10-0:20】Complete payment with one sentence. Type "pay 10 USDC," AI parses intent, assesses risk, checks policy, executes on-chain if approved. Transaction hash verifiable, rules enforced.
> 
> 【0:20-0:30】Human override: 2/3 multisig can freeze suspicious addresses, blocking all future payments. Open source, links in README. Thanks.

---

## 📝 录制提示

### 语速控制
- **正常语速：** 每分钟约 150-180 字（中文）或 120-150 词（英文）
- **停顿：** 在每个【停顿】标记处暂停 1-2 秒
- **强调：** 在核心功能处（⭐标记）稍微放慢语速

### 画面同步
- **操作提示：** 在【】内的操作要在说对应台词时完成
- **高亮展示：** 用鼠标圈出或高亮关键信息
- **切换流畅：** 页面切换要自然，避免突兀

### 时间控制
- **总时长：** 控制在 2:45-3:15 之间（留出缓冲）
- **各部分：** 按时间节点分配，可适当调整
- **精华版：** 30 秒版本只保留最核心的演示

---

**祝录制顺利！** 🎬
