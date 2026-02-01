# AgentPayGuard 使用的 Agent 框架分析

> **分析日期**: 2026-01-31  
> **目的**: 明确当前项目使用的 AI Agent 框架和技术栈

---

## 核心发现

**当前项目没有使用传统的 Agent 框架（如 LangChain、AutoGPT、CrewAI 等），而是采用了自定义的轻量级实现。**

---

## 实际使用的技术栈

### 1. AI 推理层：OpenAI SDK（统一接口）

**框架**: `openai` npm 包（v6.17.0）

**实现方式**:
- 使用 OpenAI SDK 作为统一接口
- 通过 `baseURL` 配置兼容多种 AI 提供商
- 支持 OpenAI、DeepSeek、Gemini、Claude、Ollama、LM Studio 等

**代码位置**:
- `src/lib/ai-intent.ts` - 使用 `OpenAI` 类
- `src/lib/ai-chat.ts` - 使用 `OpenAI` 类

**特点**:
- ✅ 轻量级，无额外框架依赖
- ✅ 直接调用 LLM API
- ✅ 支持多种提供商（通过 baseURL 切换）

### 2. Agent 身份层：Kite AI 框架

**框架**: KitePass (Agent Passport) + Kite AA SDK

**实现方式**:
- `gokite-aa-sdk` (v1.0.14) - Kite 账户抽象 SDK
- `src/lib/kite-agent-identity.ts` - KitePass 身份管理

**代码位置**:
- `src/lib/kite-aa.ts` - 使用 `GokiteAASDK`
- `src/lib/kite-agent-identity.ts` - KitePass 身份管理

**特点**:
- ✅ 官方 Kite AI 框架
- ✅ 账户抽象（ERC-4337）
- ✅ Agent 身份验证

### 3. 自定义 Agent 逻辑层

**实现方式**: 自定义类，不使用传统 Agent 框架

**核心类**:
1. **`AIIntentParser`** (`src/lib/ai-intent.ts`)
   - 自然语言支付意图解析
   - 风险评估
   - 多提供商支持

2. **`AIChatOrchestrator`** (`src/lib/ai-chat.ts`)
   - 对话分类（payment、query_balance、query_policy 等）
   - 自然语言对话

3. **`KiteAgentIdentity`** (`src/lib/kite-agent-identity.ts`)
   - Agent 身份管理
   - 支付请求绑定

**特点**:
- ✅ 轻量级，无框架依赖
- ✅ 针对支付场景定制
- ✅ 直接控制流程

---

## 未使用的框架

### LangChain（已安装但未使用）

**状态**: ⚠️ **已安装但代码中未使用**

**证据**:
- `package.json` 中有 `@langchain/core@^1.1.17` 和 `langchain@^1.2.15`
- 但代码中**没有 import langchain**
- 所有 AI 调用都直接使用 OpenAI SDK

**可能原因**:
- 最初计划使用 LangChain，但后来改为直接使用 OpenAI SDK
- 或者是为了未来扩展预留的依赖

**建议**:
- 如果不需要，可以移除 LangChain 依赖
- 如果需要使用，可以集成 LangChain 的工具调用、链式推理等功能

---

## 架构对比

### 当前实现（自定义轻量级）

```
用户请求
    ↓
AIIntentParser (自定义类)
    ├─ OpenAI SDK → LLM API
    └─ 直接处理响应
    ↓
PaymentIntent + RiskAssessment
    ↓
evaluatePolicyWithAI (自定义逻辑)
    ↓
链上执行
```

**特点**:
- ✅ 轻量级，无框架开销
- ✅ 直接控制，易于调试
- ✅ 针对支付场景优化
- ⚠️ 功能相对简单，不支持复杂 Agent 能力

### 传统 Agent 框架（如 LangChain）

```
用户请求
    ↓
LangChain Agent
    ├─ Tools (工具调用)
    ├─ Memory (记忆管理)
    ├─ Chains (链式推理)
    └─ LLM (大模型)
    ↓
Agent 执行计划
    ↓
工具调用 → 结果 → 下一步
    ↓
最终结果
```

**特点**:
- ✅ 功能强大，支持复杂 Agent 能力
- ✅ 工具调用、记忆管理、链式推理
- ⚠️ 框架复杂，学习成本高
- ⚠️ 可能过度设计（对于简单场景）

---

## 当前 Agent 能力

### ✅ 已实现的能力

1. **自然语言理解**
   - 支付意图解析
   - 对话分类（payment、query、conversation）

2. **风险评估**
   - AI 风险评分（0-100）
   - 风险等级（low/medium/high）
   - 风险理由和建议

3. **决策执行**
   - 策略检查
   - 链上支付执行

4. **身份管理**
   - KitePass 身份验证
   - 支付请求绑定

### ❌ 未实现的能力（传统 Agent 框架通常提供）

1. **工具调用（Tool Calling）**
   - 无法调用外部 API
   - 无法执行复杂操作

2. **记忆管理（Memory）**
   - 无长期记忆
   - 无上下文管理

3. **链式推理（Chains）**
   - 无多步骤推理
   - 无计划执行

4. **自主决策**
   - 需要明确的支付请求
   - 无法自主发现和执行任务

---

## 总结

### 当前使用的"框架"

**严格来说，当前项目没有使用传统的 Agent 框架，而是：**

1. **AI 推理**: OpenAI SDK（统一接口，兼容多提供商）
2. **Agent 身份**: Kite AI 框架（KitePass + AA SDK）
3. **Agent 逻辑**: **自定义实现**（AIIntentParser、AIChatOrchestrator）

### 技术栈总结

| 层级 | 技术 | 说明 |
|------|------|------|
| **AI 推理** | OpenAI SDK | 统一接口，兼容多种 LLM |
| **Agent 身份** | Kite AI 框架 | KitePass + AA SDK |
| **Agent 逻辑** | 自定义类 | 无传统 Agent 框架 |
| **区块链** | ethers.js + gokite-aa-sdk | Web3 交互 |

### 是否应该使用传统 Agent 框架？

**当前场景（支付风控）**: ✅ **不需要**

**理由**:
- 支付场景相对简单，不需要复杂 Agent 能力
- 自定义实现更轻量、更可控
- 直接使用 LLM API 更高效

**未来扩展场景**: ⚠️ **可以考虑**

**如果未来需要**:
- 多步骤推理（如：查询余额 → 计算可支付金额 → 发起支付）
- 工具调用（如：调用外部 API 查询汇率、供应商信息）
- 长期记忆（如：记住用户的支付偏好）
- 自主决策（如：自动发现需要支付的账单）

**可以考虑集成**:
- **LangChain**: 工具调用、链式推理
- **AutoGPT**: 自主决策、任务规划
- **CrewAI**: 多 Agent 协作

---

## 建议

### 短期（当前）

✅ **保持现状**：
- 自定义实现适合当前场景
- 轻量级，易于维护
- 性能好，延迟低

### 中期（可选）

🟡 **考虑集成 LangChain**（如果已安装）：
- 如果不需要，移除 LangChain 依赖
- 如果需要，可以添加工具调用能力

### 长期（未来）

🟢 **根据需求扩展**：
- 如果需要复杂 Agent 能力，再考虑集成框架
- 当前自定义实现已经足够

---

**文档版本**: v1.0  
**最后更新**: 2026-01-31  
**维护者**: 算法工程师团队
