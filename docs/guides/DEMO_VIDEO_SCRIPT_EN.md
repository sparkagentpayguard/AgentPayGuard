# Demo Video Script (English)

**Target length:** 1–3 minutes (full) · optional 30-second cut for highlights.

---

## Opening (0:00–0:15)

**Voiceover:**  
"When an AI Agent can move real money on-chain, you need three things: identity you can verify, rules you can enforce, and a way to stop it when something goes wrong. This is AgentPayGuard — a minimal loop from natural language to on-chain payment, with policy, risk, and a human override."

---

## What We Built (0:15–0:45)

**Voiceover:**  
"We start with a sentence: *Pay 50 USDC to this address for server hosting.* The system parses intent, runs a risk check, then applies your rules: allowlist, per-transfer and daily limits, and an on-chain freeze check. If everything passes, it executes on Kite — either as a normal transfer or via Account Abstraction. All of this is enforceable and auditable on-chain."

**On screen:**  
- Terminal or Web UI: type "Pay 50 USDC to 0x... for server hosting"  
- Show policy / risk result (e.g. “Approved” or “Rejected”)  
- Show one successful Tx on Kite explorer (EOA or AA link)

---

## Human Override (0:45–1:05)

**Voiceover:**  
"When we need to stop payments to a specific address, a 2-of-3 multisig can freeze it. After that, the Agent cannot send funds to that address. The funds already in that address are not locked — only future payments from the Agent are blocked. Unfreeze is another multisig execution. So you keep a human-controlled safety valve."

**On screen:**  
- Web UI: Freeze page — enter address, submit (or show Proposals / History)  
- Kite explorer: open freeze Tx link  
- Short note: “Unfreeze = multisig executes unfreeze; funds in address stay with the owner.”

---

## Track Alignment (1:05–1:25)

**Voiceover:**  
"We meet the four track requirements: stablecoin payment on Kite — we have EOA and AA evidence; Agent identity via Kite AA; permission control with allowlist, limits, and on-chain freeze; and full reproducibility — clone, install, set env, and run in minutes. Links are in the README."

**On screen:**  
- Optional: 4-row table (Chain payment · Agent identity · Permission control · Reproducibility) with short labels and “See README” or links.

---

## AI Latency & Future (1:25–1:50)

**Voiceover:**  
"The main delay today is the remote AI call for intent and risk — usually two to six seconds on first request. We merged that into one call and added caching, so repeat requests can be under a hundred milliseconds. Going forward, we see local or edge-deployed models replacing the cloud API for sub-second response and better privacy — the same policy and risk logic, just a different inference backend."

**On screen:**  
- Optional: simple diagram “Natural language → one AI call (intent + risk) → policy → chain”  
- One line: “Future: local LLM → &lt;1 s, data stays on device.”

---

## Closing (1:50–2:00)

**Voiceover:**  
"AgentPayGuard: programmable policy, AI risk, and human override for on-chain Agent payments. Repo and evidence links are in the README. Thanks for watching."

**On screen:**  
- Project name + tagline  
- “README: track alignment, evidence, run instructions”  
- Hackathon / Kite links if desired

---

## Optional 30-Second Cut

- 0:00–0:10: One-sentence problem + “AgentPayGuard: natural language → policy + risk → chain.”  
- 0:10–0:20: Single demo: type pay command → show approval/reject → show one Tx on explorer.  
- 0:20–0:30: “Human override: multisig freeze/unfreeze. Links in README. Thanks.”


演示视频脚本 (中文版)
目标长度： 全长 1–3 分钟 · 可剪辑 30 秒精华版。

开篇 (0:00–0:15)
旁白： “当 AI Agent 具备在链上动用真金白银的能力时，你需要三样东西：可验证的身份、可执行的规则，以及在出事时能够随时叫停的手段。这就是 AgentPayGuard —— 一个从自然语言到链上支付的闭环系统，集成了策略管控、风险评估和人工干预机制。”

我们做了什么 (0:15–0:45)
旁白： “一切从一句话开始：‘支付 50 USDC 到这个地址用于服务器托管。’ 系统会解析意图，运行风险检查，然后应用你设定的规则：包括白名单、单笔及每日限额，以及链上冻结检查。如果全部通过，它将在 Kite 网络上执行 —— 无论是通过普通转账还是账户抽象（AA）。所有这些操作在链上均可强制执行且可审计。”

画面展示：

终端或网页 UI：输入 “Pay 50 USDC to 0x... for server hosting”

显示策略/风险结果（例如：“已批准”或“已拒绝”）

显示 Kite 浏览器上的一笔成功交易（EOA 或 AA 链接）

人工干预机制 (0:45–1:05)
旁白： “当我们需要停止向特定地址付款时，可以通过 2/3 多签（Multisig）将其冻结。冻结后，Agent 将无法向该地址发送资金。该地址内已有的资金不会被锁定 —— 仅阻断 Agent 未来的支付行为。解冻则需另一次多签执行。这样，你就拥有了一个由人工控制的安全阀。”

画面展示：

网页 UI：冻结页面 —— 输入地址并提交（或展示提案/历史记录）

Kite 浏览器：打开冻结交易链接

短注：“解冻 = 多签执行解冻；地址内的资金仍归原主所有。”

赛道契合度 (1:05–1:25)
旁白： “我们完全满足赛道的四项要求：在 Kite 上进行稳定币支付（提供 EOA 和 AA 证明）；通过 Kite AA 实现 Agent 身份识别；具备白名单、限额和链上冻结的权限控制；以及完全的可复现性 —— 几分钟内即可克隆、安装并运行。相关链接已在 README 中提供。”

画面展示：

（可选）四行表格：链上支付 · Agent 身份 · 权限控制 · 可复现性（附带简短标签和“详见 README”或链接）。

AI 延迟与未来 (1:25–1:50)
旁白： “目前主要的延迟源于处理意图和风险的远程 AI 调用 —— 首次请求通常需要 2 到 6 秒。我们将其合并为一次调用并加入了缓存机制，使重复请求的响应时间缩短至 100 毫秒以内。未来，我们计划用本地或边缘部署的模型取代云端 API，实现亚秒级响应和更强的隐私保护 —— 策略和风险逻辑不变，只是更换了推理后端。”

画面展示：

（可选）简单流程图：“自然语言 → 一次 AI 调用（意图+风险） → 策略检查 → 链上执行”

文字：“未来规划：本地 LLM → 响应时间 <1 秒，数据不出本地。”

结语 (1:50–2:00)
旁白： “AgentPayGuard：为链上 Agent 支付提供可编程策略、AI 风险管控和人工干预。代码库和证明链接请见 README。感谢观看。”

画面展示：

项目名称 + 口号（Tagline）

“README：赛道要求对照、证明材料、运行指南”

Hackathon / Kite 相关链接

30 秒精华剪辑版
0:00–0:10: 一句话描述痛点 + “AgentPayGuard：自然语言 → 策略+风险 → 链上执行。”

0:10–0:20: 单个 Demo 展示：输入支付命令 → 显示批准/拒绝 → 展示浏览器交易。

0:20–0:30: “人工干预：多签冻结/解冻。链接详见 README。谢谢。”