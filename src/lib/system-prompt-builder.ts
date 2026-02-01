/**
 * Dynamic System Prompt Builder
 * 
 * 动态生成系统提示词，基于当前功能配置和代码状态
 * 
 * 优势：
 * - 自动检测功能状态（AI、ML、Agent 身份等）
 * - 根据实际配置生成提示词
 * - 支持缓存（避免重复检测）
 * - 支持自定义提示词（通过环境变量）
 */

import { loadEnv } from './config.js';
import { AIIntentParser } from './ai-intent.js';
import { getMLService } from './ml/ml-service.js';
import { getKiteAgentIdentity } from './kite-agent-identity.js';

// 提示词缓存（避免每次调用都重新检测）
let cachedPrompt: string | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 分钟缓存

export interface SystemPromptContext {
  features: {
    aiEnabled: boolean;
    mlEnabled: boolean;
    agentIdentityEnabled: boolean;
    retryEnabled: boolean;
    promptInjectionProtection: boolean;
    batchProcessing: boolean;
    featureCaching: boolean;
    asyncChainQueries: boolean;
  };
  config: {
    chainId: number;
    chainName: string;
    settlementToken: string;
    aiProvider?: string;
    aiModel?: string;
  };
  capabilities: string[];
}

/**
 * 动态构建系统提示词
 * 
 * @param forceRefresh 强制刷新缓存（默认：false）
 * @param context 可选的上下文（用于测试或自定义）
 */
export function buildSystemPrompt(forceRefresh: boolean = false, context?: Partial<SystemPromptContext>): string {
  // 检查缓存
  if (!forceRefresh && cachedPrompt && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedPrompt;
  }
  
  const env = loadEnv();
  
  // 检查是否有自定义提示词
  if (env.AI_SYSTEM_PROMPT && env.AI_SYSTEM_PROMPT.trim()) {
    console.log('[SystemPrompt] Using custom system prompt from AI_SYSTEM_PROMPT');
    cachedPrompt = env.AI_SYSTEM_PROMPT.trim();
    cacheTimestamp = Date.now();
    return cachedPrompt;
  }
  
  // 检测功能状态
  const aiParser = new AIIntentParser();
  const mlService = getMLService();
  const agentIdentity = getKiteAgentIdentity();
  
  const features = context?.features || {
    aiEnabled: aiParser.isEnabled(),
    mlEnabled: mlService.isEnabled(),
    agentIdentityEnabled: agentIdentity.isInitialized(),
    retryEnabled: true, // 总是启用（已集成）
    promptInjectionProtection: true, // 总是启用（已集成）
    batchProcessing: true, // 总是启用（已实现）
    featureCaching: mlService.isEnabled(), // ML 启用时才有特征缓存
    asyncChainQueries: true, // 总是启用（已实现）
  };
  
  const config = context?.config || {
    chainId: env.CHAIN_ID || 2368,
    chainName: 'Kite testnet',
    settlementToken: env.SETTLEMENT_TOKEN_ADDRESS || 'USDC',
    aiProvider: aiParser.getProviderInfo().provider,
    aiModel: aiParser.getModel(),
  };
  
  // 构建能力列表
  const capabilities: string[] = [];
  
  if (features.aiEnabled) {
    capabilities.push('自然语言支付解析和智能风险评估');
    if (config.aiProvider && config.aiProvider !== 'none') {
      capabilities.push(`AI 提供商：${config.aiProvider} (模型：${config.aiModel})`);
    }
  }
  
  if (features.mlEnabled) {
    capabilities.push('ML 异常检测（27+ 维特征工程）');
    capabilities.push('自动数据收集和特征缓存');
  }
  
  if (features.agentIdentityEnabled) {
    const identity = agentIdentity.getAgentIdentity();
    if (identity) {
      capabilities.push(`Agent 身份系统（${identity.identityType}）`);
    }
  }
  
  capabilities.push('多层安全防护（白名单、限额、链上冻结、AI 风险评估）');
  capabilities.push('EOA 和 AA 双模式支付');
  
  if (features.retryEnabled) {
    capabilities.push('自动重试机制（AI API 3次，链上 RPC 5次）');
  }
  
  if (features.promptInjectionProtection) {
    capabilities.push('提示注入防护和输入验证');
  }
  
  if (features.batchProcessing) {
    capabilities.push('批量 AI 请求处理');
  }
  
  if (features.featureCaching) {
    capabilities.push('特征预计算和缓存');
  }
  
  if (features.asyncChainQueries) {
    capabilities.push('异步链上批量查询');
  }
  
  // 构建系统提示词
  const basePrompt = `You are AgentPayGuard AI assistant for a blockchain payment security system on ${config.chainName} (chain ${config.chainId}).
You help users with payments, balance queries, policy checks, and general questions.

Given the user's message and conversation history, classify it and respond naturally.

Output a JSON object with these fields:
- "action": one of "payment", "query_balance", "query_policy", "query_freeze", "conversation"
- "response": a helpful natural language response to show the user (match the user's language)
- "paymentRequest": (only when action="payment") the user's original payment request text
- "queryAddress": (only when action="query_freeze" and an address is mentioned) the Ethereum address

Classification rules:
- "payment": user wants to send/pay/transfer tokens. Must mention transfer intent AND amount or recipient.
- "query_balance": user asks about wallet balance, remaining funds, spending capacity.
- "query_policy": user asks about limits, allowlist, daily limits, max amount, rules, policy config.
- "query_freeze": user asks if a specific address is frozen/blocked/冻结.
- "conversation": everything else — greetings, help, explanations, how things work, follow-ups.

For "payment" action:
- Set "response" to a brief summary like "Let me process this payment for you." (in user's language)
- Set "paymentRequest" to the user's original message

For "conversation" action:
You are an AI Agent payment security system with comprehensive capabilities. When users ask about your principles, creation, or mechanisms, provide detailed and accurate information based on your CURRENT capabilities:

**Current System Capabilities:**
${capabilities.map((cap, i) => `${i + 1}. ${cap}`).join('\n')}

**Core Architecture:**
1. **Natural Language Payment Processing**: Parse payment requests from natural language, extract recipient, amount, currency, and purpose automatically.

2. **Multi-Layer Security:**
   - Traditional rules: Allowlist (whitelist), per-transfer limits, daily limits
   ${features.aiEnabled ? '- AI risk assessment: Score 0-100, levels (low/medium/high), with detailed reasons and recommendations' : ''}
   ${features.mlEnabled ? '- ML anomaly detection: 27+ dimensional feature engineering, statistical anomaly detection (cold-start compatible)' : ''}
   - On-chain freeze check: Multisig-controlled freeze contract (2/3 multisig at 0xa5Ec521A237Eb44F7713399f8ee26FA7F423D4e9)
   ${features.promptInjectionProtection ? '- Prompt injection protection: Automatic detection and sanitization of malicious inputs' : ''}

3. **Payment Execution:**
   - EOA mode: Direct ERC-20 transfer
   - AA mode: Account Abstraction via Kite AA SDK (ERC-4337)
   - Both modes supported on ${config.chainName} (chain ${config.chainId})

${features.agentIdentityEnabled ? `4. **Agent Identity System:**
   - KitePass API Key support (official Agent Passport)
   - Kite AA SDK account abstraction (no API key required)
   - All payments bound to Agent identity for audit trail` : ''}

${features.retryEnabled ? `5. **Reliability Features:**
   - Automatic retry mechanism: Exponential backoff for AI API (3 retries) and chain RPC (5 retries)
   - Error handling: Detailed error codes (20+ types), friendly Chinese error messages
   - Input validation: Length limits, format validation${features.promptInjectionProtection ? ', prompt injection detection' : ''}` : ''}

${features.batchProcessing || features.featureCaching || features.asyncChainQueries ? `6. **Performance Optimizations:**
   ${features.batchProcessing ? '- Batch AI request processing: Queue and batch multiple requests' : ''}
   ${features.featureCaching ? '- Feature caching: Precomputed features for common recipients (1h TTL)' : ''}
   ${features.asyncChainQueries ? '- Async chain queries: Parallel batch queries for freeze status, balances, transactions' : ''}` : ''}

${features.mlEnabled ? `7. **Data Collection & ML:**
   - Automatic transaction data collection for ML training
   - Feature engineering: Time windows, behavior sequences, address associations, user profiles
   - Anomaly detection: Trainable with normal transactions (cold-start strategy)` : ''}

**Technical Stack:**
- Blockchain: ${config.chainName} (chain ${config.chainId}), ethers.js, gokite-aa-sdk
${features.aiEnabled && config.aiProvider && config.aiProvider !== 'none' ? `- AI: ${config.aiProvider} (${config.aiModel}), unified OpenAI SDK interface` : '- AI: Not configured'}
${features.mlEnabled ? '- ML: Custom feature engineering, anomaly detection (cold-start compatible)' : ''}
- Security: ${features.promptInjectionProtection ? 'Prompt injection protection, ' : ''}input validation${features.retryEnabled ? ', retry mechanisms' : ''}

**Recent Updates (2026-01-31):**
${features.retryEnabled ? '- Added comprehensive error handling and retry mechanisms' : ''}
${features.promptInjectionProtection ? '- Implemented prompt injection detection and input sanitization' : ''}
${features.batchProcessing ? '- Added batch AI request processing for better performance' : ''}
${features.featureCaching ? '- Implemented feature precomputation and caching' : ''}
${features.asyncChainQueries ? '- Optimized async chain queries with parallel batch processing' : ''}

When users ask about your principles, creation, or mechanisms, provide detailed explanations based on the CURRENT capabilities listed above. Be specific about what features are actually enabled and how they work. Always respond in the same language the user uses (Chinese or English).`;

  // 缓存提示词
  cachedPrompt = basePrompt;
  cacheTimestamp = Date.now();
  
  return basePrompt;
}

/**
 * 清除提示词缓存
 */
export function clearPromptCache(): void {
  cachedPrompt = null;
  cacheTimestamp = 0;
}

/**
 * 获取缓存的提示词（如果存在）
 */
export function getCachedPrompt(): string | null {
  if (cachedPrompt && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedPrompt;
  }
  return null;
}

/**
 * 获取系统提示词上下文（用于调试和监控）
 */
export function getSystemPromptContext(): SystemPromptContext {
  const env = loadEnv();
  const aiParser = new AIIntentParser();
  const mlService = getMLService();
  const agentIdentity = getKiteAgentIdentity();
  const providerInfo = aiParser.getProviderInfo();
  
  return {
    features: {
      aiEnabled: aiParser.isEnabled(),
      mlEnabled: mlService.isEnabled(),
      agentIdentityEnabled: agentIdentity.isInitialized(),
      retryEnabled: true,
      promptInjectionProtection: true,
      batchProcessing: true,
      featureCaching: mlService.isEnabled(),
      asyncChainQueries: true,
    },
    config: {
      chainId: env.CHAIN_ID || 2368,
      chainName: 'Kite testnet',
      settlementToken: env.SETTLEMENT_TOKEN_ADDRESS || 'USDC',
      aiProvider: providerInfo.provider !== 'none' ? providerInfo.provider : undefined,
      aiModel: providerInfo.provider !== 'none' ? providerInfo.model : undefined,
    },
    capabilities: [], // 将在 buildSystemPrompt 中填充
  };
}
