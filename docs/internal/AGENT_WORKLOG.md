## Agent 工作记录

**仓库**：AgentPayGuard | **目标**：Kite Payment Track MVP（链上支付 + 策略 + AI Agent + 多签冻结）

---

### 当前状态

- **代码**：`pnpm typecheck` / `demo:pay` / `demo:reject` / `demo:freeze` / `demo:ai-agent` / `pnpm server` 可用
- **待完成**：B 产出 EOA/AA Tx Hash 交 C；C 填满 for_judge.md
- **文档入口**：TESTING_GUIDE、交付给角色B、FINAL_DELIVERY_CHECKLIST、[PM_AND_ROLE_B_QUICKREF](PM_AND_ROLE_B_QUICKREF.md)

---

### 备注

- 工作记录按 **Phase 倒序**（最新在上）；新增 Phase 写在摘要表下方
- `.clinerules` 约束 5b：每次 commit 后自动 `git push`
- `HUMAN_CONSTRAINTS` 原则 7：有文件改动后立即 `git add -A`、`commit`、`push`

---

### 运行命令

```bash
# Node/TS（主线）
pnpm i
pnpm demo:pay          # 默认 dry-run
pnpm demo:reject
pnpm demo:freeze
pnpm demo:ai-agent "Pay 50 USDC to 0x... for server hosting"
pnpm server            # API 供前端 /pay 调用
pnpm typecheck

# 真实链上（需 .env 配置）
EXECUTE_ONCHAIN=1 pnpm demo:pay
PAYMENT_MODE=aa EXECUTE_ONCHAIN=1 pnpm demo:pay

# Python（可选 KitePass）
python -m pip install -r python/requirements.txt
$env:KITE_API_KEY="api_key_xxx"; python python/kitepass_demo.py
```

---

### 关键文件

| 文件 | 说明 |
|------|------|
| `src/lib/kite-aa.ts` | AA 支付（ERC-4337） |
| `src/lib/policy.ts` | 策略引擎（白名单/限额/冻结/AI 增强） |
| `src/lib/ai-intent.ts` | AI 意图解析与风险评估 |
| `src/lib/run-pay.ts` | 可复用支付逻辑（CLI + API） |
| `src/server.ts` | API 服务（GET /api/policy、POST /api/pay） |
| `src/demo-pay.ts` | 支付 Demo |
| `src/demo-reject.ts` | 拒绝 Demo |
| `src/test-freeze.ts` | 冻结验证 Demo（`pnpm demo:freeze`） |
| `src/demo-ai-agent.ts` | AI Agent Demo |
| `docs/for_judge.md` | 评委判定表（需填 Tx Hash） |

---

### Role B 完成记录（Sulla，2026-01-29 ~ 01-30）

- **kite-aa.ts**（104 行）：`sendErc20ViaAA()` 完整 ERC-4337 流程；8 步（初始化 SDK、获取地址、编码 callData、签名、发送 UO、轮询确认、解析结果）；支持 Paymaster、错误处理、详细日志
- **关键发现**：Kite 文档中的 `sendUserOperationAndWait()` 在实际 SDK 中不存在；通过 `PROBE_KITE_AA=1 pnpm demo:pay` 动态发现正确 API；采用 `sendUserOperation()` + `pollUserOperationStatus()` 两步模式
- **验证**：`pnpm typecheck` 0 errors；`pnpm demo:pay` 通过策略校验；`pnpm demo:reject` 输出 NOT_IN_ALLOWLIST
- **赛道满足**：链上支付（ERC-4337）、Agent 身份（Kite AA SDK）、权限控制（白名单/限额）、可复现性（演示脚本）
- **交付 A**：kite-aa.ts、policy.ts；待 A 补充多签地址 + 冻结 Tx Hash
- **交付 C**：demo 脚本、源码、.env.example；待 B 执行 EXECUTE_ONCHAIN=1 后提供 Tx Hash

---

### 新增/修改文件清单（Phase 3–7 汇总）

**新增**：`.gitignore`、`.npmrc`、`.env.example`、`README.md`、`package.json`、`tsconfig.json`、`src/demo-pay.ts`、`src/demo-reject.ts`、`src/lib/config.ts`、`src/lib/erc20.ts`、`src/lib/kite-aa.ts`、`src/lib/policy.ts`、`src/lib/state.ts`、`python/requirements.txt`、`python/kitepass_demo.py`、`.vscode/settings.json`、`AGENT_WORKLOG.md`

**修改**：`for_judge.md`（重写）、`package.json`（依赖版本）、`kitepass_demo.py`（导入方式）、`.gitignore`（忽略 .venv）

---

### 已知缺口与下一步建议

- **稳定币 token 地址**：`.env` 的 `SETTLEMENT_TOKEN_ADDRESS` 需从 Kite 官方文档补全（测试网 USDC：`0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63`）
- **Tx Hash 证据**：`for_judge.md` 的占位需在跑通真实转账后替换
- **AA 路径 bundler**：`PAYMENT_MODE=aa` 需可用 `BUNDLER_URL`（如 `https://bundler-service.staging.gokite.ai/rpc/`）
- **多签兜底 demo**：当前以文档流程描述为主；可补「冻结/解冻/策略更新」的最小脚本或截图证据
- **B 待执行**：`EXECUTE_ONCHAIN=1 pnpm demo:pay`（EOA + AA）获取真实 Tx Hash 交付 C
- **C 待完成**：收到 B 和 A 的 Tx Hash 后填充 for_judge.md 4 行表格

---

### 项目组件状态表

| 组件 | 状态 | 说明 |
|------|------|------|
| 基础支付系统 | ✅ | EOA + AA 双模式，链上冻结风控 |
| 策略引擎 | ✅ | 白名单、限额、日限制、AI 增强 |
| AI 意图解析 | ✅ | 自然语言理解，风险评估，智能决策 |
| 演示脚本 | ✅ | 5 个（pay/reject/freeze/ai-agent + typecheck）+ server |
| TypeScript 检查 | ✅ | 0 errors |
| 文档体系 | ✅ | 完整四角色指南 + AI 说明 + PM/Role B 规整 |
| 安全防护 | ✅ | .env 保护，AI 安全集成 |
| 多签/冻结 | ✅ | A 已交付合约地址，B 已集成 policy 检查 |

**新增能力**：AI Agent 核心（ai-intent.ts）、智能策略（evaluatePolicyWithAI）、自然语言接口（demo:ai-agent）、AI 风险评分、降级兼容（无 API 时回退解析）、免费 API 支持（DeepSeek/Gemini/Ollama）、前端+API 联调（run-pay + server + Pay 页）

**评委价值亮点**：AI 特性（自然语言 + 智能风险评估）、安全框架（原有防护 + AI 增强）、可演示性（端到端 AI 工作流）、创新性（传统支付 → 智能 Agent）

---

### 附录：Kite 测试网与合约地址

- **Chain ID**：2368（Kite Testnet）
- **RPC**：`https://rpc-testnet.gokite.ai/`
- **浏览器**：`https://testnet.kitescan.ai/`
- **Faucet**：`https://faucet.gokite.ai/`（每地址 24h 一次，0.5 KITE）
- **多签钱包**：`0xA247e042cAE22F0CDab2a197d4c194AfC26CeECA`（SimpleMultiSig，2/3）
- **冻结合约**：`0x3168a2307a3c272ea6CE2ab0EF1733CA493aa719`（SimpleFreeze）
- **测试 USDC**：`0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63`
- **Bundler**：`https://bundler-service.staging.gokite.ai/rpc/`（AA 模式必需）
- **注意**：Ash Wallet 支持 Kite；Gnosis Safe 不支持 Kite 网络

---

### Phase 摘要（倒序：最新在上）

> **约定**：新增 Phase 请写在下方、按 Phase 倒序（最新在上）。

| Phase | 内容 |
|-------|------|
| 29 | 前端与 CLI 结合：后端 API + 前端 Pay 页 |
| 28 | .clinerules 新增 4c 修改前检查分支约束 |
| 27 | README 新增主仓+子模块 feature 分支工作流 |
| 26 | README 新增测试白名单地址 + 余额/转账验证说明 |
| 25 | HUMAN_CONSTRAINTS 新增原则 7（立即提交推送） |
| 24 | 约束文档精简、SECURITY 合并到 .clinerules |
| 23 | 文档精简 + 自动 push 规则 |
| 22 | 子模块检测、前端 RPC 修正、PM/Role B 文档、README 子模块说明 |
| 21 | 支持免费 AI API（DeepSeek/Gemini/Ollama） |
| 20 | AI Agent（ai-intent + demo:ai-agent） |
| 19 | Role B 交付物优化 |
| 18 | 集成链上冻结（policy.ts + demo:freeze） |
| 16–17 | 前端升级、设计参考 |
| 13–15 | ROLE_A/C/D 指南、FINAL_DELIVERY_CHECKLIST、文档重组 |
| 11–12 | 安全政策、TESTING_GUIDE |
| 9–10 | 分工明确（链上/后端/前端/D）；新增角色 D |
| 8 | 修复 Python 导入（.venv + .vscode） |
| 6–7 | 策略引擎、ERC20、AA、demo-pay/reject；KitePass Python 脚本 |
| 3–5 | 从零搭建 Node/TS 骨架，处理 pnpm 依赖问题 |
| 1–2 | 评审 for_judge，重写为评委可判定版 |

---

### Phase 29：前端与 CLI 结合（方案一：后端 API）

- **目标**：前端通过 HTTP API 调用主仓支付逻辑，实现「Web UI 发起支付 → 后端执行 → 返回 txHash」。
- **主仓**：新增 `src/lib/run-pay.ts`（可复用支付逻辑，供 CLI 与 API 共用）、`src/server.ts`（Node http 服务，GET /api/health、GET /api/policy、POST /api/pay）；`package.json` 新增 `pnpm server`；CORS 支持 `CORS_ORIGIN`。
- **前端**：新增 `frontend/src/pages/Pay.tsx`（收款地址、金额、EOA/AA、executeOnchain 勾选，POST /api/pay，展示 txHash/错误）；`vite.config.ts` 开发时代理 `/api` → `http://localhost:3000`；首页增加 PAY 入口，路由 `/pay`。
- **环境**：`.env.example` 增加 `API_PORT`、`CORS_ORIGIN`；前端可选 `VITE_API_URL`（生产环境 API 地址）。
- **验证**：主仓 `pnpm server` 起 API，前端 `npm run dev` 打开 /pay，勾选 executeOnchain 发起支付，应返回 txHash 或策略错误。

---

### Phase 28：修改前检查分支约束（2026-01-31）

- **新增**：.clinerules 约束 4c「修改前检查分支（不污染 main）」
- **内容**：每次修改文件前检查主仓和子模块是否在 main；若在则按 README 切换到 feature 分支；不得在 main 上直接修改
- **强制提醒**：新增第 4 条「修改前检查主仓/子模块分支」
- **自检清单**：新增「主仓与子模块均不在 main 分支」

---

### Phase 27：主仓+子模块 feature 分支工作流（2026-01-31）

- **新增**：README 子模块章节下「主仓 + 子模块都在新分支修改（不污染 main）」
- **内容**：步骤（主仓切分支 → 子模块切分支 → 子模块修改+push → 主仓提交指针+push）；要点；一次性检查命令
- **目的**：确保主仓与 frontend 子模块在 feature 分支工作，不污染 main，均可 push 远端

---

### Phase 26：README 测试白名单地址（2026-01-31）

- **新增**：策略说明下「测试用白名单地址（ALLOWLIST）」章节
- **内容**：5 个仅接收、无私钥的测试地址；ALLOWLIST 配置示例；如何查看余额、验证转账成功
- **目的**：方便用户快速配置白名单并验证支付到账

---

### Phase 25：HUMAN_CONSTRAINTS 原则 7（2026-01-31）

- **新增原则 7「立即提交推送」**：每次完成会改变仓库状态的操作后，立即执行 `git add -A`、`git commit`、`git push`；不得遗漏
- **禁止行为**：补充「违反原则 7」
- **检查清单**：新增「有文件改动？→ 立即 git add/commit/push」
- **说明**：HUMAN_CONSTRAINTS 在 .gitignore，不提交仓库

---

### Phase 24：约束文档精简 + SECURITY 合并（2026-01-31）

- **.clinerules**：384 行 → ~156 行；删除冗余「理由」、压缩各约束；将 SECURITY.md 内容合并入「安全政策」章节
- **HUMAN_CONSTRAINTS**：145 行 → ~89 行；压缩原则表述、特殊指导改表格
- **SECURITY.md**：删除；内容已并入 .clinerules
- **README**：AGENT_CONSTRAINTS + SECURITY 链接合并为 .clinerules

---

### Phase 23：文档精简 + 自动 push（2026-01-31）

- **PM/Role B**：规整为 PM_AND_ROLE_B_QUICKREF（检查清单 + 文档入口）；后扩展为 PM_AND_ROLE_B_CONSOLIDATED（整合 A→B 交付、测试、演讲、文档索引）
- **AGENT_WORKLOG**：由 ~1000 行精简为 Phase 摘要 + 详细描述（本文档，控制在 500 行内）
- **.clinerules**：新增「每次 commit 后自动 `git push`」

---

### Phase 22：子模块与前端 RPC

- **子模块**：检测到 `frontend` 子模块（hacker-hackathon-hub）；需 `git submodule update --init --recursive` 克隆
- **RPC 修正**：`frontend/src/lib/web3/config.ts` 中 RPC 与区块浏览器地址与 Kite 官方不一致 → 改为 `rpc-testnet.gokite.ai`、`testnet.kitescan.ai`
- **PM/Role B 文档**：新增 PM_AND_ROLE_B_QUICKREF、注意事项（子模块、RPC、交接）
- **README**：补充子模块克隆与更新说明
- **chain_info.md**：记录 Kite 官方链信息（Ash Wallet 支持 Kite，Gnosis Safe 不支持）

---

### Phase 21：免费 AI API 支持

- **背景**：用户询问「OPENAI_API_KEY 可以用 deepseek 的吗」，需支持免费 API 提供商
- **ai-intent.ts**：完全重写支持多提供商；支持 OpenAI、DeepSeek、Gemini、Claude、Ollama、LM Studio、本地 AI；自动选择机制（DeepSeek > Gemini > OpenAI > Claude > 本地）；优雅降级（API 失败时自动回退解析）；`getProviderInfo()` 获取当前提供商
- **config.ts**：`DEEPSEEK_API_KEY`、`GEMINI_API_KEY`、`CLAUDE_API_KEY`、`OLLAMA_URL`、`LMSTUDIO_URL`、`LOCAL_AI_URL`
- **.env.example**：详细免费 API 配置指南（DeepSeek 推荐、Gemini、Ollama/LM Studio）
- **AI_AGENT_GUIDE.md**：多提供商说明、优雅降级、使用示例与最佳实践
- **验证**：无 API Key 时自动使用回退解析；OpenAI 超时后自动降级；零成本可用
- **总结**：项目具备「零成本 AI Agent」能力

---

### Phase 20：AI Agent 升级

- **背景**：用户询问「能把他变成一个 ai agent」，需添加 AI 意图解析、自然语言交互、智能风险评估
- **依赖**：`pnpm add openai langchain @langchain/core`；TypeScript 编译 0 errors
- **ai-intent.ts**（269 行）：PaymentIntent 解析（从自然语言提取收款人、金额、币种、目的）；RiskAssessment（分数、等级、理由、建议）；AIIntentParser（支持 OpenAI API 与回退解析）；`isValidEthereumAddress()` 工具
- **policy.ts**（扩展至 512 行）：AI 增强策略（`maxRiskScore`、`requireAIAssessment`、`autoRejectRiskLevels`）；`evaluatePolicyWithAI()`；`getAIEnhancedPolicy()` 默认配置
- **demo-ai-agent.ts**（208 行）：自然语言 → AI 意图分析 → 风险评估 → AI 增强策略检查 → 支付执行（EOA/AA）；支持干运行与真实链上
- **命令**：`pnpm demo:ai-agent "Pay 50 USDC to 0x... for server hosting"`
- **验证**：正常支付通过；大额 `"Pay 5000 USDC"` → AMOUNT_EXCEEDS_MAX；无 OPENAI_API_KEY 时回退解析
- **价值**：自然语言界面、AI 意图解析、风险推理日志、端到端 AI 流程；核心主张变为「能理解自然语言支付请求、智能风险评估、链上安全执行的 AI Agent」
- **新增代码**：~1000 行（AI 模块 + 增强策略 + 演示脚本）

---

### Phase 19：Role B 交付物优化

- **背景**：检查 Role B 交付内容，发现缺失链上冻结验证的标准化脚本和文档描述
- **demo:freeze**：将 `test-freeze.ts` 升级为正式脚本，添加 `pnpm demo:freeze` 命令；优化日志输出
- **TESTING_GUIDE**：增加场景 6「链上冻结验证（Strong Dependency）」；说明若输出 `[PASS]` 表示目标地址未被冻结、需联系 Role A；若 `[ERROR]` 可能是网络问题
- **for_judge.md**：明确「强依赖模式」的链上检查机制
- **验证**：`pnpm demo:freeze` 输出 `[SUCCESS] 链上冻结风控生效` 或 `[PASS]`；文档检查确认所有新特性已记录

---

### Phase 18：集成链上冻结

- **背景**：角色 A 交付 SimpleMultiSig、SimpleFreeze 合约地址；需将链上冻结状态集成到后端策略引擎，实现「强依赖模式」风控
- **policy.ts**：`evaluatePolicy` 改为 async；引入 `ethers.Contract` 调用 `SimpleFreeze.isFrozen(recipient)`；增加 `provider`、`freezeContractAddress` 参数；新增错误码 `RECIPIENT_FROZEN`
- **demo-pay/reject**：注入 provider（JsonRpcProvider）、冻结合约地址 `0x3168a2307a3c272ea6CE2ab0EF1733CA493aa719`
- **test-freeze.ts**：专门验证 Owner 2（已冻结地址）的拦截能力
- **验证**：`pnpm demo:pay`（正常地址）→ 通过；`test-freeze.ts`（冻结地址）→ 拒绝，返回 `RECIPIENT_FROZEN`
- **文件变更**：修改 policy.ts、demo-pay.ts、demo-reject.ts；新增 test-freeze.ts

---

### Phase 16–17：前端升级与设计参考

- **用户需求**：「前端是必须的，评委看重视觉效果」「角色 D 的演讲任务转移到角色 B」
- **ROLE_C_GUIDE**：升级为「前端 Web UI 开发与可视化」；新增「前端亮眼方案」：技术栈 React 18 + TypeScript + Tailwind + Vite + Framer Motion；4 个核心 UI（支付操作面板、策略校验可视化、多签冻结面板、架构展示）；美观度加分项（响应式、深色主题、流畅动画、图表、代码窗口、骨架屏）
- **TESTING_GUIDE**：新增「Role B 演讲准备指南」：6 部分脚本（问题与方案 1 分钟、代码讲解 2–3 分钟、演示 1 正常支付 1.5 分钟、演示 2 拒绝 1 分钟、链上架构与多签 1.5–2 分钟、总结与 Q&A 30 秒）；演讲技巧（时间管理、视觉辅助、声音语调）；Q&A 预案表格（5 个常见问题）；5 天排练计划；演讲设备清单
- **allocation**：Role B 增加「现场演讲讲稿」；Role C 专注 Web UI + 数据可视化；Role D 改为 PPT 制作 + 视频剪辑 + 字幕配音（不再负责讲稿）
- **FRONTEND_DESIGN_REFERENCE.md**：基于黑客松获奖项目分析；3 种配色（深蓝赛博朋克、深灰高级、深紫彩虹）；6 种核心动画；排版、玻璃态、渐变、发光、网格背景；用户反馈（Toast、Modal、骨架屏）；3 种设计方向（极简/中等/高级）；技术栈对比
- **灵活性声明**：各指南添加「仅供参考」声明，鼓励团队创意与灵活调整

---

### Phase 13–15：角色指南与文档重组

- **ROLE_A_GUIDE.md**：多签部署步骤（Ash Wallet / Gnosis Safe）、冻结操作、链上部署与浏览器证据
- **ROLE_C_GUIDE.md**：从 A/B 交付物编译 for_judge.md；任务 1 收集追踪交付物；任务 2 填充 for_judge.md 4 行表格（链上支付/Agent 身份/权限控制/可复现性）；任务 3 生成演示资料（截图或视频）；任务 4 生成证据索引供 Role D；20+ 项检查清单
- **ROLE_D_GUIDE.md**：Step 1 制作 PPT（12 页含时间轴）；Step 2 视频剪辑（1–3 分钟 + 10–30 秒高能版，DaVinci Resolve，MP4 <200MB）；Step 3 现场讲稿（分钟级时间轴、Q&A 预案、备选方案）；Step 4 最终检查与归档
- **FINAL_DELIVERY_CHECKLIST.md**：A/B/C/D 交付检查、时间轴与依赖、风险与备选（A 无法完成多签、B 无法链上执行时的缓解措施）
- **文档重组**：创建 `docs/guides/`、`reference/`、`internal/`、`archived/`；`git mv` 迁移 17 个 .md（保持历史）；README 新增文档导航表（用途标注：评委、测试、架构等）；根目录仅保留 README
- **AGENT_CONSTRAINTS.md**：新增 4b「实时更新交付清单」，确保交付清单始终保持最新

---

### Phase 11–12：安全政策与测试指南

- **SECURITY.md**：文件系统权限 `chmod 600 .env`；敏感信息清单（PRIVATE_KEY、API_KEY 等）；禁止行为（不要向 AI 分享 `.env`）；AI Assistant 承诺：根据文件名判断，**永远不读取任何 `.env*` 文件**，即使被明确要求也拒绝；代码审查检查清单
- **说明**：初版曾在 `.vscode/settings.json` 中添加 `files.exclude` 隐藏 `.env`，后撤销（阻碍用户）；改为文件名黑名单规则
- **TESTING_GUIDE.md**：前置条件（环境检查、钱包准备、.env 配置含安全提醒）；5 个测试场景详解（干运行 EOA/AA 含预期输出、真实 EOA/AA 含 Tx Hash 记录、政策拒绝 NOT_IN_ALLOWLIST）；测试结果矩阵；故障排除（模块未找到、环境变量缺失、余额不足、Bundler 超时、白名单失败）；链上验证（Kite 浏览器 EOA vs AA）；日志解读；Tx Hash 收集指导
- **目的**：为 Role B 提供清晰自测路径，降低故障排查成本

---

### Phase 9–10：分工与角色 D

- **背景**：原分工按模块写，未显式标注「前端/后端」；黑客松 MVP 下网页前端并非必需
- **allocation.md**：明确角色 A（链上/合约/多签）、B（后端/支付执行/AA 集成/链上交互）、C（前端体验与可复现，默认做演示整合；如做网页则负责最终 UI）
- **角色 D**：新增「新人辅助」——PPT 设计、Demo 视频剪辑、字幕高亮、证据索引与讲稿时间轴；黑客松评审看重呈现与证据，此类工作不必占用核心开发时间
- **说明**：MVP 以 CLI Demo + 文档证据为主，网页前端可选

---

### Phase 8：Python 导入修复

- **问题**：编辑器提示 `Import "gokite.kite_client" could not be resolved`（语言服务未使用安装了依赖的解释器）
- **处理**：将导入改为官方 `__init__` 导出写法 `from gokite import KiteClient`；在仓库根目录创建 `.venv` 并安装 `python/requirements.txt`；新增 `.vscode/settings.json` 指向 `.venv\\Scripts\\python.exe`；更新 `.gitignore` 忽略 `.venv`
- **验证**：`.venv\\Scripts\\python.exe -c "from gokite import KiteClient; print(...)"` 成功；`python kitepass_demo.py` 正常运行并提示缺少 `KITE_API_KEY`（预期行为）

---

### Phase 6–7：核心实现与 KitePass

- **策略引擎**：`src/lib/policy.ts`（白名单/单笔上限/日限额）
- **本地状态**：`src/lib/state.ts`（写入默认 `.agentpayguard/state.json`，用于 DAILY_LIMIT 演示）
- **ERC-20**：`src/lib/erc20.ts`（EOA 路径，`ethers.Contract.transfer()`）
- **AA 路径**：`src/lib/kite-aa.ts`（基于 `gokite-aa-sdk` 真实文档 API：`GokiteAASDK('kite_testnet', rpcUrl, bundlerUrl)`；编码 `ERC20.transfer(to, amount)` 为 callData，通过 `sendUserOperation(...)` 发送）
- **CLI Demo**：`src/demo-pay.ts`（默认 dry-run 不发链上交易；`EXECUTE_ONCHAIN=1` 才真实发送；`PAYMENT_MODE=eoa` 默认 EOA，`PAYMENT_MODE=aa` 需 `BUNDLER_URL`）、`src/demo-reject.ts`（故意触发拒绝）
- **KitePass**：`python/kitepass_demo.py`（读取 `KITE_API_KEY`；可选 `KITE_SERVICE_ID` 调 `get_service_info`、`KITE_PAYLOAD_JSON` 调 `call_service`）；README 补充 PowerShell 环境变量示例
- **类型**：加入 `pnpm typecheck`；修复 `zod` 布尔默认值实现（`boolFromEnv()`）；`pnpm typecheck` 通过
- **已知缺口**：`SETTLEMENT_TOKEN_ADDRESS` 仍为占位；`for_judge.md` 的 `0xTODO_REPLACE_WITH_REAL_TX_HASH` 需真实转账后替换；`PAYMENT_MODE=aa` 需可用 `BUNDLER_URL`

---

### Phase 3–5：项目骨架与依赖

- **创建**：`src/`、`src/lib/`、`.gitignore`、`.npmrc`、`package.json`、`tsconfig.json`、`.env.example`、`README.md`
- **依赖问题 1**：`gokite-aa-sdk@^0.1.0` 不存在 → 改为 `^1.0.14`（pnpm 提示 latest）
- **依赖问题 2**：pnpm 在 Windows 上报 `ERR_PNPM_EISDIR ... symlink undici-types` → 删除失败后的 `node_modules` 和 `pnpm-lock.yaml`，新增 `.npmrc`：`node-linker=hoisted` + `shamefully-hoist=true`，重新 `pnpm i` 成功
- **验证**：`pnpm i` 安装成功

---

### Phase 1–2：评审与重写 for_judge.md

- **读取**：`resources/rules.md`、`website.md`、`kite_whitepaper.pdf`、原 `for_judge.md`
- **结论**：原文方向对，但宏大叙事多、可复现/证据少，含非官方外链（如 `utm_source=chatgpt.com`）不利于评委信任
- **重写**：新增赛道最低要求对照表（含 tx hash 占位）、Kite 官方能力对齐表、Demo 脚本说明、运行与复现段落；移除非官方泛引用
- **产出**：`for_judge.md` 评委 1 分钟可判定版本
