# AI Agent 开发指南

本指南详细介绍了 AgentPayGuard 项目的 AI Agent 功能，包括架构设计、API 使用、配置方法和开发扩展。

---

## 概述

AgentPayGuard 已从传统的安全支付系统升级为**智能 AI Agent 支付系统**，核心能力包括：

1. **自然语言支付解析**：理解人类语言中的支付指令
2. **智能风险评估**：基于上下文的 AI 风险评分
3. **AI增强策略**：传统规则 + AI 风险控制的组合
4. **端到端 AI 工作流**：从自然语言请求到链上执行的完整闭环
5. **多提供商支持**：支持OpenAI、DeepSeek、Gemini、Claude及本地AI服务

---

## 架构设计

### 核心模块

```
src/lib/ai-intent.ts        # AI意图解析和风险评估（支持多提供商）
src/lib/config.ts           # 环境变量配置（支持多种API密钥）
src/lib/policy.ts           # AI增强策略引擎（512行）
src/demo-ai-agent.ts        # AI Agent演示脚本（208行）
```

### 数据流

```
自然语言请求
    ↓
AIIntentParser.parsePaymentIntent()
    ↓
PaymentIntent（结构化支付信息）
    ↓
AIIntentParser.assessRisk()
    ↓
RiskAssessment（风险评分、等级、理由）
    ↓
evaluatePolicyWithAI()
    ↓
EnhancedPolicyDecision（AI增强决策）
    ↓
链上执行（EOA/AA）
```

---

## API 参考

### AIIntentParser 类

#### 构造函数
```typescript
const parser = new AIIntentParser();
```

#### 方法

**`parsePaymentIntent(text: string): Promise<PaymentIntent>`**
- 从自然语言文本解析支付意图
- 支持多种AI提供商，自动选择可用服务

**`assessRisk(intent: PaymentIntent, context?: RiskContext): Promise<RiskAssessment>`**
- 评估支付风险
- 返回风险评分、等级、理由和建议

**`isEnabled(): boolean`**
- 检查 AI 功能是否启用（是否有任何可用的API密钥）

**`getProviderInfo(): { provider: string; model: string; isFree: boolean }`**
- 获取当前使用的AI提供商信息
- 返回提供商类型、模型名称和是否免费

#### 类型定义

```typescript
interface PaymentIntent {
  recipient: string;          // 收款地址
  amount: string;            // 金额字符串（如 "50 USDC"）
  amountNumber: number;      // 金额数值
  currency: string;          // 币种
  purpose: string;          // 支付目的
  riskLevel: 'low' | 'medium' | 'high';  // 风险等级
  confidence: number;       // 解析置信度（0-1）
  parsedSuccessfully: boolean; // 是否成功解析
  reasoning?: string;       // 解析推理过程
}

interface RiskAssessment {
  score: number;            // 风险分数（0-100）
  level: 'low' | 'medium' | 'high';  // 风险等级
  reasons: string[];        // 风险理由
  recommendations: string[]; // 改进建议
}
```

### 策略引擎 API

#### `evaluatePolicyWithAI()`

```typescript
async function evaluatePolicyWithAI(args: {
  policy: Policy;
  recipient: string;
  amount: bigint;
  spentToday?: bigint;
  provider?: ethers.Provider;
  freezeContractAddress?: string;
  naturalLanguageRequest?: string;
  paymentIntent?: PaymentIntent;
  aiParser?: AIIntentParser;
  context?: RiskContext;
}): Promise<EnhancedPolicyDecision>
```

#### 类型定义

```typescript
interface Policy {
  allowlist?: string[];
  maxAmount?: bigint;
  dailyLimit?: bigint;
  // AI增强策略
  maxRiskScore?: number;          // 最大风险分数（0-100）
  requireAIAssessment?: boolean;  // 是否要求AI评估
  autoRejectRiskLevels?: ('high' | 'medium')[]; // 自动拒绝的风险等级
}

interface EnhancedPolicyDecision {
  baseDecision: PolicyDecision;
  aiAssessment?: RiskAssessment;
  paymentIntent?: PaymentIntent;
  aiEnabled: boolean;
  warnings: string[];
}
```

---

## 配置指南

### 环境变量

在 `.env` 文件中配置：

```bash
# AI 功能配置 - 支持多种免费API提供商
ENABLE_AI_INTENT=1                    # 启用AI功能

# 免费API提供商（按优先级使用）
DEEPSEEK_API_KEY=your-deepseek-key    # DeepSeek免费额度（推荐）
GEMINI_API_KEY=your-gemini-key        # Google Gemini免费额度
OPENAI_API_KEY=sk-...                 # OpenAI API密钥（付费）
CLAUDE_API_KEY=your-claude-key        # Claude API密钥（付费）

# 本地AI服务（完全免费）
OLLAMA_URL=http://localhost:11434/v1  # Ollama本地服务
LMSTUDIO_URL=http://localhost:1234/v1 # LM Studio本地服务
LOCAL_AI_URL=http://localhost:8080/v1 # 其他本地AI服务

# AI模型配置
AI_MODEL=gpt-4o-mini                  # 默认模型，根据提供商自动调整

# 传统支付配置
RPC_URL=https://rpc-testnet.gokite.ai/
CHAIN_ID=2368
PRIVATE_KEY=0x...
SETTLEMENT_TOKEN_ADDRESS=0x...
RECIPIENT=0x...

# 策略配置
ALLOWLIST=0x...
MAX_AMOUNT=1000
DAILY_LIMIT=10000
```

### 免费API提供商说明

系统支持多种免费API提供商，按以下优先级自动选择：

1. **DeepSeek** - 推荐免费方案，提供充足免费额度
   - 注册：https://platform.deepseek.com/
   - 模型：`deepseek-chat`
   - 特点：完全免费，支持中文，响应速度快

2. **Google Gemini** - 免费额度充足
   - 注册：https://makersuite.google.com/app/apikey
   - 模型：`gemini-1.5-pro`
   - 特点：免费额度大，多模态支持

3. **本地AI服务** - 完全免费，需要本地部署
   - **Ollama**：部署本地大模型（Llama 3、Qwen等）
   - **LM Studio**：图形化本地AI服务
   - 特点：数据本地化，无网络延迟，完全免费

4. **OpenAI/Claude** - 付费方案
   - 适合需要最高准确性的生产环境
   - 提供最稳定的API服务

### 优雅降级机制

如果未配置任何API密钥，系统会自动使用**内置回退解析器**：
- ✅ 完全免费，无需API密钥
- ✅ 使用正则表达式解析基础支付信息
- ✅ 提供基础风险评估
- ✅ 确保系统始终可用

**使用回退解析器时的输出示例**：
```
[AI] Using fallback parser
Parsed Successfully: ⚠️
Reasoning: Fallback parser used - limited risk assessment
```

### AI 策略配置

在代码中配置 AI 增强策略：

```typescript
import { getAIEnhancedPolicy } from './lib/policy.js';

const basePolicy = {
  allowlist: ['0x...'],
  maxAmount: ethers.parseUnits('1000', 18),
  dailyLimit: ethers.parseUnits('10000', 18)
};

const enhancedPolicy = getAIEnhancedPolicy(basePolicy);
// 返回：{
//   ...basePolicy,
//   maxRiskScore: 70,
//   requireAIAssessment: false,
//   autoRejectRiskLevels: ['high']
// }
```

自定义 AI 策略：

```typescript
const customPolicy = {
  ...basePolicy,
  maxRiskScore: 60,                    // 更严格：拒绝分数>60的支付
  requireAIAssessment: true,           // 强制要求AI评估
  autoRejectRiskLevels: ['high', 'medium']  // 拒绝中高风险
};
```

---

## 使用示例

### 1. 基本使用（CLI）

```bash
# 使用自然语言指令执行支付（免费回退解析器）
ENABLE_AI_INTENT=1 pnpm demo:ai-agent "Pay 50 USDC to 0xd2d45ef2f2ddaffc8c8bc03cedc4f55fb9e97e2b for server hosting"

# 使用DeepSeek API（免费）
DEEPSEEK_API_KEY=your-key ENABLE_AI_INTENT=1 pnpm demo:ai-agent "Send 100 USDC to 0x742d35Cc6634C0532925a3b844Bc9e0BB0A8E2D3"

# 使用本地Ollama（完全免费）
OLLAMA_URL=http://localhost:11434/v1 ENABLE_AI_INTENT=1 pnpm demo:ai-agent "Pay 25 USDC to 0x..."

# 指定金额和目的
pnpm demo:ai-agent "Send 100 USDC to 0x742d35Cc6634C0532925a3b844Bc9e0BB0A8E2D3 for monthly subscription"

# 使用AA模式（如果配置了BUNDLER_URL）
pnpm demo:ai-agent "Pay 25 USDC to 0x... via account abstraction"
```

### 2. 编程使用

```typescript
import { AIIntentParser } from './lib/ai-intent.js';
import { evaluatePolicyWithAI } from './lib/policy.js';

async function processPaymentRequest(naturalLanguage: string) {
  // 1. 初始化AI解析器
  const aiParser = new AIIntentParser();
  
  // 2. 获取提供商信息
  const providerInfo = aiParser.getProviderInfo();
  console.log(`Using AI provider: ${providerInfo.provider} (${providerInfo.isFree ? 'free' : 'paid'})`);
  
  // 3. 解析自然语言请求
  const paymentIntent = await aiParser.parsePaymentIntent(naturalLanguage);
  console.log('Parsed intent:', paymentIntent);
  
  // 4. 风险评估
  const riskAssessment = await aiParser.assessRisk(paymentIntent, {
    historicalPayments: [...],
    walletBalance: 10000
  });
  console.log('Risk assessment:', riskAssessment);
  
  // 5. AI增强策略评估
  const decision = await evaluatePolicyWithAI({
    policy: enhancedPolicy,
    recipient: paymentIntent.recipient,
    amount: ethers.parseUnits(paymentIntent.amountNumber.toString(), 18),
    naturalLanguageRequest: naturalLanguage,
    paymentIntent,
    aiParser,
    context: { /* 风险上下文 */ }
  });
  
  // 6. 处理决策结果
  if (decision.baseDecision.ok) {
    console.log('✅ Payment approved');
    if (decision.aiAssessment) {
      console.log('   Risk score:', decision.aiAssessment.score);
      console.log('   Risk level:', decision.aiAssessment.level);
    }
  } else {
    console.log('❌ Payment rejected:', decision.baseDecision.message);
  }
  
  return decision;
}
```

### 3. 集成到现有系统

```typescript
// 将AI Agent集成到现有的支付流程中
class PaymentService {
  private aiParser: AIIntentParser;
  
  constructor() {
    this.aiParser = new AIIntentParser();
  }
  
  async processPayment(request: PaymentRequest) {
    // 传统验证
    const traditionalCheck = await this.validateTraditional(request);
    if (!traditionalCheck.ok) return traditionalCheck;
    
    // AI增强验证（如果启用）
    if (this.aiParser.isEnabled() && request.naturalLanguage) {
      const aiCheck = await this.validateWithAI(request);
      if (!aiCheck.ok) return aiCheck;
    }
    
    // 执行支付
    return this.executePayment(request);
  }
  
  private async validateWithAI(request: PaymentRequest) {
    const intent = await this.aiParser.parsePaymentIntent(request.naturalLanguage);
    const assessment = await this.aiParser.assessRisk(intent);
    
    // 应用AI策略
    if (assessment.score > 70) {
      return {
        ok: false,
        reason: `AI risk score too high: ${assessment.score}`,
        details: assessment
      };
    }
    
    return { ok: true, assessment };
  }
}
```

---

## 开发扩展

### 1. 添加新的风险因素

扩展 `AIIntentParser.assessRisk()` 方法：

```typescript
class CustomAIParser extends AIIntentParser {
  async assessRisk(intent: PaymentIntent, context?: RiskContext): Promise<RiskAssessment> {
    // 调用父类的基础评估
    const baseAssessment = await super.assessRisk(intent, context);
    
    // 添加自定义风险因素
    const customFactors = this.evaluateCustomFactors(intent, context);
    
    return {
      ...baseAssessment,
      score: Math.min(100, baseAssessment.score + customFactors.additionalScore),
      reasons: [...baseAssessment.reasons, ...customFactors.reasons],
      recommendations: [...baseAssessment.recommendations, ...customFactors.recommendations]
    };
  }
  
  private evaluateCustomFactors(intent: PaymentIntent, context?: RiskContext) {
    // 实现自定义风险逻辑
    const factors = {
      additionalScore: 0,
      reasons: [] as string[],
      recommendations: [] as string[]
    };
    
    // 示例：检查是否在非工作时间
    const hour = new Date().getHours();
    if (hour < 9 || hour > 17) {
      factors.additionalScore += 10;
      factors.reasons.push('Payment requested outside business hours');
      factors.recommendations.push('Consider scheduling payment during business hours');
    }
    
    return factors;
  }
}
```

### 2. 支持新的支付指令格式

扩展自然语言解析：

```typescript
class ExtendedPaymentParser extends AIIntentParser {
  async parsePaymentIntent(text: string): Promise<PaymentIntent> {
    // 先尝试父类解析
    const baseIntent = await super.parsePaymentIntent(text);
    if (baseIntent.parsedSuccessfully) return baseIntent;
    
    // 添加自定义解析逻辑
    const customMatch = this.parseCustomFormat(text);
    if (customMatch) {
      return {
        recipient: customMatch.recipient,
        amount: customMatch.amount,
        amountNumber: customMatch.amountNumber,
        currency: customMatch.currency,
        purpose: customMatch.purpose || 'General payment',
        riskLevel: 'medium',
        confidence: 0.7,
        parsedSuccessfully: true,
        reasoning: 'Parsed using custom format parser'
      };
    }
    
    // 回退到基础解析
    return baseIntent;
  }
  
  private parseCustomFormat(text: string) {
    // 实现自定义格式解析
    // 例如： "转账100 USDT到0x..."
    const match = text.match(/转账\s*(\d+(\.\d+)?)\s*([A-Z]+)\s*到\s*(0x[a-fA-F0-9]{40})/);
    if (match) {
      return {
        recipient: match[4],
        amount: `${match[1]} ${match[3]}`,
        amountNumber: parseFloat(match[1]),
        currency: match[3],
        purpose: 'Transfer'
      };
    }
    return null;
  }
}
```

### 3. 集成外部风险数据源

```typescript
class EnhancedRiskAssessor extends AIIntentParser {
  private riskApiClient: RiskAPIClient;
  
  constructor(apiKey: string) {
    super();
    this.riskApiClient = new RiskAPIClient(apiKey);
  }
  
  async assessRisk(intent: PaymentIntent, context?: RiskContext): Promise<RiskAssessment> {
    // 获取外部风险数据
    const externalRisk = await this.riskApiClient.getAddressRisk(intent.recipient);
    const transactionPatterns = await this.riskApiClient.getPatternAnalysis(intent);
    
    // 结合内部和外部风险评估
    const baseAssessment = await super.assessRisk(intent, context);
    
    return {
      score: this.calculateCombinedScore(baseAssessment.score, externalRisk.score),
      level: this.determineCombinedLevel(baseAssessment.level, externalRisk.level),
      reasons: [
        ...baseAssessment.reasons,
        ...externalRisk.reasons,
        ...transactionPatterns.insights
      ],
      recommendations: [
        ...baseAssessment.recommendations,
        ...externalRisk.recommendations
      ]
    };
  }
}
```

---

## 测试指南

### 单元测试

```typescript
import { AIIntentParser } from './lib/ai-intent.js';

describe('AIIntentParser', () => {
  let parser: AIIntentParser;
  
  beforeEach(() => {
    parser = new AIIntentParser();
  });
  
  test('should parse basic payment intent', async () => {
    const intent = await parser.parsePaymentIntent(
      'Pay 50 USDC to 0xd2d45ef2f2ddaffc8c8bc03cedc4f55fb9e97e2b for server hosting'
    );
    
    expect(intent.parsedSuccessfully).toBe(true);
    expect(intent.recipient).toBe('0xd2d45ef2f2ddaffc8c8bc03cedc4f55fb9e97e2b');
    expect(intent.amountNumber).toBe(50);
    expect(intent.currency).toBe('USDC');
    expect(intent.purpose).toContain('server hosting');
  });
  
  test('should assess risk appropriately', async () => {
    const intent = {
      recipient: '0xd2d45ef2f2ddaffc8c8bc03cedc4f55fb9e97e2b',
      amount: '1000 USDC',
      amount