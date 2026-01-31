# AgentPayGuard 项目分析总结

## 一、项目定位

**AgentPayGuard** 是一个为 Kite 区块链黑客松开发的 MVP 项目，核心主题是 **AI Agent 支付风控系统**。在 Kite Testnet（Chain ID 2368）上运行，实现从"自然语言下达支付指令"到"策略校验 + 链上执行"的完整闭环。

## 二、仓库结构

| 路径 | 说明 |
|------|------|
| `src/server.ts` | HTTP API 服务入口（端口 3456） |
| `src/lib/config.ts` | 环境变量加载（Zod 校验） |
| `src/lib/policy.ts` | 策略引擎：白名单、限额、冻结检查、AI 风险评估 |
| `src/lib/ai-intent.ts` | AI 意图解析器：自然语言 → 结构化支付指令 |
| `src/lib/erc20.ts` | ERC-20 转账基础操作 |
| `src/lib/kite-aa.ts` | Kite AA SDK 集成（账户抽象 UserOperation） |
| `src/lib/run-pay.ts` | 可复用支付执行逻辑（CLI + API 共用） |
| `src/lib/state.ts` | 本地状态管理（每日累计消费追踪） |
| `src/demo-pay.ts` | 正常支付演示脚本 |
| `src/demo-reject.ts` | 策略拒绝演示脚本 |
| `src/demo-ai-agent.ts` | AI Agent 支付完整流程演示 |
| `src/test-freeze.ts` | 链上冻结状态检测演示 |
| `contracts/SimpleFreeze.sol` | 冻结合约（多签控制的地址冻结） |
| `contracts/SimpleMultiSig.sol` | 2/3 多签钱包合约 |
| `python/kitepass_demo.py` | KitePass 身份接入演示（Python） |
| `frontend/` | 子模块，React + Vite + Tailwind 前端 |

## 三、展示方法 / 运行方式

| 命令 | 功能 |
|------|------|
| `pnpm server` | 启动后端 API（端口 3456） |
| `pnpm demo:pay` | CLI 正常支付流程 |
| `pnpm demo:reject` | CLI 策略拒绝演示 |
| `pnpm demo:ai-agent "..."` | CLI AI Agent 完整流程 |
| `pnpm demo:freeze` | 链上冻结检测 |
| `pnpm typecheck` | TypeScript 类型检查 |
| 前端 | `cd frontend && npm install && npm run dev` |

**API 端点：**

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/health` | GET | 健康检查 |
| `/api/policy` | GET | 获取策略配置 |
| `/api/pay` | POST | 发起支付 |
| `/api/ai-pay` | POST | AI 自然语言支付 |

## 四、核心功能

1. **策略引擎**：白名单、单笔上限、日累计限额、链上冻结检测、AI 风险评估
2. **AI 意图解析**：多 AI 供应商支持（DeepSeek/Gemini/OpenAI/Claude/Ollama），回退解析器
3. **双支付模式**：EOA 直接转账 + AA 账户抽象（gokite-aa-sdk）
4. **链上合约**：SimpleFreeze（冻结/解冻）+ SimpleMultiSig（2/3 多签）
5. **前端**：React + Vite + Tailwind，7 个页面，中英双语

## 五、Agent 约束要点

- 禁止读取 `.env*` 文件
- 不在 main 分支修改，必须切 feature 分支
- commit 后立即 push
- 代码提交前必须通过 `pnpm typecheck`
- 重大决策先列选项等用户选择

## 六、前端问题分析

### 功能问题

1. **Dashboard/Freeze/Proposals/History 全部使用硬编码 Mock 数据**，无真实链上交互
2. **Pay 页面没有使用 i18n**，硬编码中文；语言切换按钮只在首页
3. **钱包连接形同虚设**：支付走后端 API，连接钱包只显示网络状态
4. **无表单校验**：地址输入无格式验证
5. **前后端能力不对称**：后端有完整策略引擎，前端无策略展示

### 美观 / UX 问题

1. **Header 样式不统一**（fixed vs sticky，padding 不一致）
2. **ParticleBackground 每页都渲染**，性能开销大
3. **移动端体验薄弱**（核心视觉元素隐藏）
4. **只有暗色主题**
5. **信息层次不够清晰**（AIPay 四层 panel 视觉权重相同）
