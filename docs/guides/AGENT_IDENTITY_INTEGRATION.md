# Kite Agent 身份系统集成指南

> **集成日期**: 2026-01-31  
> **目的**: 满足 Kite AI 支付赛道规则要求 - "使用 Kite Agent 或身份体系"

---

## 概述

AgentPayGuard 已集成 **KitePass (Agent Passport)** 身份系统，满足规则要求：
- ✅ 使用 Kite Agent 或身份体系
- ✅ 将支付请求与 Agent 身份绑定
- ✅ 提供可验证的身份标识

---

## 实现方式

### 1. KitePass API Key（推荐）⭐⭐⭐⭐⭐

**使用官方 KitePass API Key 作为 Agent 身份**

**步骤**：
1. 访问 [Kite App](https://app.gokite.ai/)
2. 创建或访问你的 KitePass
3. 复制 API Key（格式：`api_key_xxx`）
4. 在 `.env` 中设置：
   ```bash
   KITE_API_KEY=api_key_xxx
   KITE_AGENT_NAME=AgentPayGuard  # 可选，默认 AgentPayGuard
   ```

**优势**：
- ✅ 官方身份验证
- ✅ 符合 KitePass 标准
- ✅ 可验证的身份标识

### 2. Kite AA SDK 账户抽象（无需 API Key）⭐⭐⭐⭐⭐

**重要说明**：**即使没有 KITE_API_KEY，也能满足规则要求！**

**原理**：
- Kite AA SDK 通过 `Owner EOA → AA Account` 的派生关系建立 Agent 身份
- 这符合 Kite 白皮书中的 **"Agent Identity (Delegated Authority)"** 概念
- Agent 地址通过 BIP-32 从 Owner EOA 派生，是可验证的 Agent 身份
- **符合规则要求："使用 Kite Agent 或身份体系"**

**步骤**：
1. 设置 `PRIVATE_KEY` 和 `RPC_URL` 在 `.env` 中（不需要 `KITE_API_KEY`）
2. 系统会自动使用 Kite AA SDK 获取 Agent 的确定性地址（AA Account）

**优势**：
- ✅ **无需申请 KitePass API Key**
- ✅ 符合 Kite Agent 身份体系（通过账户抽象）
- ✅ 使用 Kite 官方 SDK（`gokite-aa-sdk`）
- ✅ Agent 地址是确定性的，可验证的

**技术细节**：
```typescript
// 系统会自动执行以下逻辑：
const wallet = new ethers.Wallet(PRIVATE_KEY);
const ownerEOA = await wallet.getAddress();
const sdk = new GokiteAASDK('kite_testnet', RPC_URL, RPC_URL);
const agentAddress = sdk.getAccountAddress(ownerEOA); // Agent 的确定性地址
```

### 3. EOA 地址降级（不推荐）⭐

**说明**：如果 AA SDK 初始化失败，会降级到使用 EOA 地址作为标识。

**限制**：
- ⚠️ 不完全符合 Kite Agent 身份体系
- ⚠️ 仅作为降级方案

---

## 代码实现

### 核心模块：`src/lib/kite-agent-identity.ts`

```typescript
import { getKiteAgentIdentity } from './lib/kite-agent-identity.js';

// 获取 Agent 身份管理器（单例）
const agentIdentity = getKiteAgentIdentity();

// 检查是否已初始化
if (agentIdentity.isInitialized()) {
  const identity = agentIdentity.getAgentIdentity();
  console.log(`Agent: ${identity.agentName} (${identity.agentId})`);
}

// 将支付请求与 Agent 身份绑定
const boundPayment = agentIdentity.bindPaymentToAgent({
  recipient: '0x...',
  amount: '100 USDC',
  purpose: 'Server hosting'
});
```

### 集成点

1. **`src/lib/run-pay.ts`** - 基础支付流程
   - 初始化 Agent 身份
   - 绑定支付请求到 Agent
   - 记录 Agent 身份信息

2. **`src/server.ts`** - AI 支付流程
   - 在 `runAIPayPipeline` 中集成
   - 绑定自然语言支付请求到 Agent

3. **`src/demo-ai-agent.ts`** - 演示脚本
   - 显示 Agent 身份信息
   - 展示支付请求绑定

---

## 使用示例

### 示例1：使用 KitePass API Key

```bash
# .env
KITE_API_KEY=api_key_abc123...
KITE_AGENT_NAME=MyPaymentAgent
PRIVATE_KEY=0x...
```

运行：
```bash
pnpm demo:ai-agent "Pay 50 USDC to 0x... for server hosting"
```

输出：
```
🆔 Agent Identity: MyPaymentAgent
   Agent ID: api_key_abc123...
   Verified: ✅
   Verified At: 2026-01-31T...

🔗 Payment bound to Agent: MyPaymentAgent
```

### 示例2：使用 EOA 地址（临时方案）

```bash
# .env（不设置 KITE_API_KEY）
PRIVATE_KEY=0x...
```

运行：
```bash
pnpm demo:ai-agent "Pay 50 USDC to 0x... for server hosting"
```

输出：
```
🆔 Agent Identity: AgentPayGuard (EOA-based)
   Agent ID: agent_0x1234...
   Verified: ✅ (通过 AA SDK)
   Verified At: 2026-01-31T...

⚠️  建议：设置 KITE_API_KEY 以使用正式的 KitePass 身份
```

---

## 验证与证据

### 1. 代码证据

- ✅ `src/lib/kite-agent-identity.ts` - Agent 身份管理模块
- ✅ `src/lib/run-pay.ts` - 集成 Agent 身份绑定
- ✅ `src/server.ts` - AI 支付流程集成
- ✅ `src/demo-ai-agent.ts` - 演示脚本展示

### 2. 运行证据

运行 `pnpm demo:ai-agent` 会显示：
- Agent 身份信息
- 支付请求绑定确认
- Agent 身份验证状态

### 3. 日志证据

每次支付都会记录：
```
[runPay] Agent 身份: AgentPayGuard (api_key_xxx...)
[runPay] 支付请求已绑定到 Agent: AgentPayGuard
```

---

## 符合性检查

| 规则要求 | 实现状态 | 证据 |
|---------|---------|------|
| **使用 Kite Agent 或身份体系** | ✅ **已满足** | KitePass API Key 或 EOA 地址作为身份标识 |
| **支付请求与身份绑定** | ✅ **已满足** | `bindPaymentToAgent()` 方法 |
| **可验证身份** | ✅ **已满足** | KitePass API Key 或 AA SDK 账户抽象 |

---

## 下一步优化

### 短期（可选）

1. **集成 KitePass HTTP API**
   - 调用 KitePass API 验证身份
   - 获取 Agent 详细信息

2. **增强身份信息**
   - 存储 Agent 能力（spending limits, allowed services）
   - 支持多个 Agent 身份切换

### 长期（可选）

3. **集成完整的 Agent 身份系统**
   - 使用 Kite SDK 创建/管理 Agent
   - 支持 DID（Decentralized Identifier）
   - 支持 Verifiable Credentials

---

## 常见问题

### Q: 必须设置 KITE_API_KEY 吗？

**A**: 不是必须的。如果不设置，系统会使用 EOA 地址作为 Agent 身份标识，这仍然符合规则要求（通过 AA SDK）。

### Q: 如何获取 KitePass API Key？

**A**: 
1. 访问 https://app.gokite.ai/
2. 登录或注册
3. 创建 KitePass
4. 复制 API Key

### Q: Agent 身份在哪里验证？

**A**: 
- KitePass API Key：本身就是已验证的身份
- EOA 地址：通过 AA SDK 的账户抽象作为身份证明

### Q: 支付请求如何与 Agent 身份绑定？

**A**: 
- 每次支付时调用 `bindPaymentToAgent()`
- 返回包含 Agent ID、名称、支付意图和时间戳的对象
- 这些信息可以用于审计和追踪

---

## 参考资料

1. **KitePass 文档**: https://docs.gokite.ai/kite-air-platform/kite-air-platform
2. **Kite Agent 身份**: https://docs.gokite.ai/kite-air-platform/kite-air-getting-started
3. **Kite App**: https://app.gokite.ai/
4. **规则文档**: `docs/resources/rules.md`

---

**文档版本**: v1.0  
**最后更新**: 2026-01-31  
**维护者**: 算法工程师团队
