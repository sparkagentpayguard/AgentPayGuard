import OpenAI from 'openai';
import { loadEnv } from './config.js';
import { SimpleCache, hashString } from './cache.js';
import { withRetry, AI_API_RETRY_OPTIONS, RetryableError, NonRetryableError } from './retry.js';
import { validateAndSanitizeInput } from './prompt-injection.js';
import { AIAPIError, ErrorCode, extractErrorCode, createFriendlyErrorMessage } from './errors.js';

export interface PaymentIntent {
  recipient: string;
  amount: string; // human-readable amount like "100 USDC"
  amountNumber: number;
  currency: string; // "USDC", "ETH", etc.
  purpose: string;
  confidence: number; // 0-1
  riskLevel: 'low' | 'medium' | 'high';
  reasoning: string;
  parsedSuccessfully: boolean;
}

export interface RiskAssessment {
  score: number; // 0-100
  level: 'low' | 'medium' | 'high';
  reasons: string[];
  recommendations: string[];
}

// 支持的API提供商类型
type AIProvider = 'openai' | 'deepseek' | 'gemini' | 'claude' | 'local' | 'ollama' | 'lmstudio' | 'none';

export class AIIntentParser {
  private openai: OpenAI | null = null;
  private env: ReturnType<typeof loadEnv>;
  private provider: AIProvider = 'none';
  private model: string = '';
  private cache: SimpleCache<{ intent: PaymentIntent; risk: RiskAssessment }>;
  /** 按 (recipient, amount, purpose) 的短时缓存，避免同一笔支付重复评估 */
  private intentCache: SimpleCache<{ intent: PaymentIntent; risk: RiskAssessment }>;

  constructor() {
    this.env = loadEnv();
    this.cache = new SimpleCache(300);
    this.intentCache = new SimpleCache(300);
    
    // 确定使用哪个API提供商
    this.provider = this.determineProvider();
    this.model = this.determineModel();
    
    if (this.env.ENABLE_AI_INTENT && this.provider !== 'none') {
      this.openai = this.createOpenAIClient();
    }
  }

  private determineProvider(): AIProvider {
    if (!this.env.ENABLE_AI_INTENT) return 'none';
    
    // 检查各种API密钥，按优先级排序
    if (this.env.DEEPSEEK_API_KEY) return 'deepseek';      // 免费额度
    if (this.env.GEMINI_API_KEY) return 'gemini';          // 免费额度
    if (this.env.OPENAI_API_KEY) return 'openai';          // 付费
    if (this.env.CLAUDE_API_KEY) return 'claude';          // 付费
    if (this.env.OLLAMA_URL) return 'ollama';              // 免费本地
    if (this.env.LMSTUDIO_URL) return 'lmstudio';          // 免费本地
    if (this.env.LOCAL_AI_URL) return 'local';             // 通用本地
    
    return 'none';
  }

  private determineModel(): string {
    // 如果用户指定了模型，使用用户指定的
    if (this.env.AI_MODEL) return this.env.AI_MODEL;
    
    // 否则根据提供商设置默认模型
    switch (this.provider) {
      case 'openai': return 'gpt-4o-mini';
      case 'deepseek': return 'deepseek-chat';
      case 'gemini': return 'gemini-1.5-pro';
      case 'claude': return 'claude-3-haiku';
      case 'ollama': return 'llama3.2';
      case 'lmstudio': return 'local-model';
      case 'local': return 'local-model';
      default: return 'gpt-4o-mini';
    }
  }

  private createOpenAIClient(): OpenAI | null {
    try {
      let apiKey = '';
      let baseURL = '';
      
      switch (this.provider) {
        case 'openai':
          apiKey = this.env.OPENAI_API_KEY!;
          baseURL = 'https://api.openai.com/v1';
          break;
        case 'deepseek':
          apiKey = this.env.DEEPSEEK_API_KEY!;
          baseURL = 'https://api.deepseek.com/v1';
          break;
        case 'gemini':
          // Google Gemini 使用不同的SDK，这里简化处理为兼容OpenAI格式
          apiKey = this.env.GEMINI_API_KEY!;
          baseURL = 'https://generativelanguage.googleapis.com/v1';
          break;
        case 'claude':
          apiKey = this.env.CLAUDE_API_KEY!;
          baseURL = 'https://api.anthropic.com/v1';
          break;
        case 'ollama':
          apiKey = 'not-needed';
          baseURL = this.env.OLLAMA_URL || 'http://localhost:11434/v1';
          break;
        case 'lmstudio':
          apiKey = 'not-needed';
          baseURL = this.env.LMSTUDIO_URL || 'http://localhost:1234/v1';
          break;
        case 'local':
          apiKey = 'not-needed';
          baseURL = this.env.LOCAL_AI_URL!;
          break;
        default:
          return null;
      }
      
      return new OpenAI({
        apiKey,
        baseURL,
      });
    } catch (error) {
      console.error('[AI] Failed to create API client:', error);
      return null;
    }
  }

  isEnabled(): boolean {
    return this.env.ENABLE_AI_INTENT && this.provider !== 'none';
  }

  /** Expose the OpenAI client for reuse by AIChatOrchestrator */
  getOpenAIClient(): OpenAI | null {
    return this.openai;
  }

  /** Expose the model name for reuse */
  getModel(): string {
    return this.model;
  }

  getProviderInfo(): { provider: AIProvider; model: string; isFree: boolean; baseURL?: string } {
    const freeProviders: AIProvider[] = ['deepseek', 'gemini', 'ollama', 'lmstudio', 'local'];
    const isFree = freeProviders.includes(this.provider);
    
    return {
      provider: this.provider,
      model: this.model,
      isFree,
      baseURL: this.openai?.baseURL
    };
  }

  /**
   * Parse natural language payment request into structured intent
   */
  async parsePaymentIntent(userMessage: string): Promise<PaymentIntent> {
    if (!this.isEnabled() || !this.openai) {
      return this.fallbackParse(userMessage);
    }

    // 1. 验证和清理输入（防止提示注入）
    let sanitizedMessage: string;
    try {
      sanitizedMessage = validateAndSanitizeInput(userMessage, {
        maxLength: 1000,
        allowInjection: false // 严格模式：检测到注入直接抛出错误
      });
    } catch (error) {
      console.error('[AI] Input validation failed:', error);
      // 如果输入验证失败，使用回退解析器
      return this.fallbackParse(userMessage);
    }

    // 2. 使用重试机制调用 AI API
    try {
      const systemPrompt = `You are a payment intent parser for a blockchain payment system.
Extract structured information from user payment requests.
Output should be JSON with the following structure:
{
  "recipient": "ethereum address (0x...) or 'unknown'",
  "amount": "human-readable amount with currency (e.g., '100 USDC')",
  "amountNumber": number (e.g., 100),
  "currency": "currency symbol (USDC, ETH, etc.)",
  "purpose": "brief description of payment purpose",
  "confidence": 0-1 confidence score,
  "riskLevel": "low|medium|high",
  "reasoning": "brief reasoning for risk assessment"
}

Rules:
- If address is not specified, use "unknown"
- Default currency is USDC unless specified
- Risk assessment based on: amount size, purpose clarity, address format
- If request seems suspicious or unclear, mark risk as medium/high

Example inputs:
- "Pay 100 USDC to 0x742d35Cc6634C0532925a3b844Bc9e0BB0A8E2D3 for server hosting"
- "Send 0.5 ETH to my supplier"
- "Transfer $50 to vendor for office supplies"`;

      const completion = await withRetry(
        async () => {
          return await this.openai!.chat.completions.create({
            model: this.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: sanitizedMessage }
            ],
            temperature: 0.1,
            response_format: { type: "json_object" }
          });
        },
        {
          ...AI_API_RETRY_OPTIONS,
          onRetry: (attempt: number, error: Error) => {
            console.warn(`[AI] Retry attempt ${attempt} for parsePaymentIntent: ${error.message}`);
          }
        }
      );

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new AIAPIError(
          ErrorCode.AI_API_INVALID_RESPONSE,
          'No response from AI',
          this.provider,
          this.model
        );
      }

      const parsed = JSON.parse(content);
      
      return {
        ...parsed,
        parsedSuccessfully: true,
        riskLevel: parsed.riskLevel?.toLowerCase() as 'low' | 'medium' | 'high' || 'medium'
      };
    } catch (error: unknown) {
      // 处理重试错误
      if (error instanceof RetryableError) {
        console.error(`[AI] Failed after retries: ${error.message}`);
        const errorCode = extractErrorCode(error.originalError);
        throw new AIAPIError(
          errorCode,
          createFriendlyErrorMessage(error.originalError),
          this.provider,
          this.model,
          { originalError: error.originalError.message, attempts: error.attempt }
        );
      } else if (error instanceof NonRetryableError) {
        console.error(`[AI] Non-retryable error: ${error.message}`);
        throw new AIAPIError(
          extractErrorCode(error.originalError),
          createFriendlyErrorMessage(error.originalError),
          this.provider,
          this.model,
          { originalError: error.originalError.message }
        );
      } else if (error instanceof AIAPIError) {
        throw error;
      } else {
        console.error('[AI] Error parsing intent:', error);
        // 非重试错误，使用回退解析器
        return this.fallbackParse(userMessage);
      }
    }
  }

  /**
   * Simple fallback parser when AI is not available
   */
  private fallbackParse(userMessage: string): PaymentIntent {
    console.log('[AI] Using fallback parser');
    
    // Very basic parsing - in real implementation would be more sophisticated
    const amountMatch = userMessage.match(/(\d+(\.\d+)?)\s*(USDC|USDT|ETH|USD|\$)/i);
    const addressMatch = userMessage.match(/0x[a-fA-F0-9]{40}/);
    
    const defaultAddress = this.env.RECIPIENT || 'unknown';
    const defaultAmount = this.env.AMOUNT || '0.001';
    
    // Normalize currency
    let currency = 'USDC';
    if (amountMatch && amountMatch[3]) {
      const matched = amountMatch[3].toUpperCase();
      if (matched === 'USD' || matched === '$') {
        currency = 'USDC';
      } else if (matched === 'USDT') {
        currency = 'USDT';
      } else {
        currency = matched;
      }
    }
    
    return {
      recipient: addressMatch ? addressMatch[0] : defaultAddress,
      amount: amountMatch ? `${amountMatch[1]} ${currency}` : `${defaultAmount} USDC`,
      amountNumber: amountMatch ? parseFloat(amountMatch[1]) : parseFloat(defaultAmount),
      currency,
      purpose: extractPurpose(userMessage),
      confidence: 0.5,
      riskLevel: 'medium',
      reasoning: 'Fallback parser used - limited risk assessment',
      parsedSuccessfully: false
    };
  }

  /**
   * Single LLM call: parse intent AND assess risk in one request (faster cold path).
   * Returns combined { intent, risk }; on failure returns null so caller can fall back to two-call path.
   */
  private async parseAndAssessRiskInOneCall(userMessage: string, context?: {
    historicalPayments?: Array<{recipient: string, amount: number, timestamp: Date}>;
    walletBalance?: number;
    spentToday?: number;
  }): Promise<{ intent: PaymentIntent; risk: RiskAssessment } | null> {
    if (!this.isEnabled() || !this.openai) return null;
    
    // 验证和清理输入
    let sanitizedMessage: string;
    try {
      sanitizedMessage = validateAndSanitizeInput(userMessage, {
        maxLength: 1000,
        allowInjection: false
      });
    } catch (error) {
      console.error('[AI] Input validation failed in parseAndAssessRiskInOneCall:', error);
      return null;
    }
    
    const contextStr = context ? JSON.stringify(context, null, 2) : 'No additional context';
    const systemPrompt = `You are a payment intent parser and risk assessor for a blockchain payment system.
From the user's natural language payment request, output a single JSON object with two keys: "intent" and "risk".

"intent" must have:
  "recipient": "ethereum address (0x...) or 'unknown'",
  "amount": "human-readable amount with currency (e.g., '100 USDC')",
  "amountNumber": number (e.g., 100),
  "currency": "currency symbol (USDC, ETH, etc.)",
  "purpose": "brief description of payment purpose",
  "confidence": 0-1,
  "riskLevel": "low" | "medium" | "high",
  "reasoning": "brief reasoning"

"risk" must have:
  "score": 0-100 (0=no risk, 100=high risk),
  "level": "low" | "medium" | "high",
  "reasons": ["reason1", "reason2"],
  "recommendations": ["recommendation1", "recommendation2"]

Rules: Default currency USDC. Consider wallet balance and spent today (if in context). Be conservative on risk.`;

    const userPrompt = `User payment request:\n${sanitizedMessage}\n\nContext:\n${contextStr}\n\nOutput one JSON: { "intent": {...}, "risk": {...} }`;

    try {
      const completion = await withRetry(
        async () => {
          return await this.openai!.chat.completions.create({
            model: this.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.1,
            response_format: { type: 'json_object' }
          });
        },
        {
          ...AI_API_RETRY_OPTIONS,
          onRetry: (attempt: number, error: Error) => {
            console.warn(`[AI] Retry attempt ${attempt} for parseAndAssessRiskInOneCall: ${error.message}`);
          }
        }
      );
      
      const content = completion.choices[0]?.message?.content;
      if (!content) return null;
      const parsed = JSON.parse(content);
      const rawIntent = parsed.intent;
      const rawRisk = parsed.risk;
      if (!rawIntent || !rawRisk) return null;
      const intent: PaymentIntent = {
        recipient: rawIntent.recipient ?? 'unknown',
        amount: rawIntent.amount ?? `${rawIntent.amountNumber ?? 0} USDC`,
        amountNumber: Number(rawIntent.amountNumber) || 0,
        currency: rawIntent.currency ?? 'USDC',
        purpose: rawIntent.purpose ?? '',
        confidence: Number(rawIntent.confidence) ?? 0.5,
        riskLevel: (String(rawIntent.riskLevel).toLowerCase() as 'low' | 'medium' | 'high') || 'medium',
        reasoning: rawIntent.reasoning ?? '',
        parsedSuccessfully: true
      };
      const risk: RiskAssessment = {
        score: Math.min(100, Math.max(0, Number(rawRisk.score) ?? 50)),
        level: (String(rawRisk.level).toLowerCase() as 'low' | 'medium' | 'high') || 'medium',
        reasons: Array.isArray(rawRisk.reasons) ? rawRisk.reasons : [],
        recommendations: Array.isArray(rawRisk.recommendations) ? rawRisk.recommendations : []
      };
      return { intent, risk };
    } catch (e) {
      console.error('[AI] parseAndAssessRiskInOneCall failed after retries:', e);
      return null;
    }
  }

  /**
   * Parse intent and assess risk. Uses a single LLM call when possible; falls back to two calls or fallback parser.
   */
  async parseAndAssessRisk(userMessage: string, context?: {
    historicalPayments?: Array<{recipient: string, amount: number, timestamp: Date}>;
    walletBalance?: number;
    spentToday?: number;
  }): Promise<{ intent: PaymentIntent; risk: RiskAssessment }> {
    const cacheKey = hashString(userMessage + JSON.stringify(context || {}));
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log('[AI] Cache hit for request:', userMessage.substring(0, 50) + '...');
      return cached;
    }

    let intent: PaymentIntent;
    let risk: RiskAssessment;

    if (this.isEnabled() && this.openai) {
      const oneCall = await this.parseAndAssessRiskInOneCall(userMessage, context);
      if (oneCall) {
        intent = oneCall.intent;
        risk = oneCall.risk;
      } else {
        intent = await this.parsePaymentIntent(userMessage);
        const intentCacheKey = hashString(`${intent.recipient}|${intent.amountNumber}|${intent.purpose}`);
        const cachedByIntent = this.intentCache.get(intentCacheKey);
        if (cachedByIntent) {
          this.cache.set(cacheKey, { intent, risk: cachedByIntent.risk });
          return { intent, risk: cachedByIntent.risk };
        }
        risk = await this.assessRisk(intent, context);
      }
    } else {
      intent = this.fallbackParse(userMessage);
      risk = this.fallbackRiskAssessment(intent);
    }

    const intentCacheKey = hashString(`${intent.recipient}|${intent.amountNumber}|${intent.purpose}`);
    const result = { intent, risk };
    this.cache.set(cacheKey, result);
    this.intentCache.set(intentCacheKey, result);
    return result;
  }

  /**
   * Assess risk of a payment intent
   */
  async assessRisk(intent: PaymentIntent, context?: {
    historicalPayments?: Array<{recipient: string, amount: number, timestamp: Date}>;
    walletBalance?: number;
    spentToday?: number;
  }): Promise<RiskAssessment> {
    if (!this.isEnabled() || !this.openai) {
      return this.fallbackRiskAssessment(intent);
    }

    try {
      const contextStr = context ? JSON.stringify(context, null, 2) : 'No additional context';
      
      const systemPrompt = `You are a payment risk assessment AI.
Analyze the payment intent and provide risk assessment.
Output JSON with structure:
{
  "score": 0-100 (0=no risk, 100=high risk),
  "level": "low|medium|high",
  "reasons": ["reason1", "reason2"],
  "recommendations": ["recommendation1", "recommendation2"]
}

Considerations:
- Amount size relative to typical payments and wallet balance (if provided)
- Recipient address format and validity
- Payment purpose clarity
- Wallet balance and spent today (if provided) - flag risk if amount exceeds balance or daily spend is high
- Historical patterns (if available)

Be conservative - it's better to flag medium risk than miss a high risk.`;

      const userPrompt = `Payment Intent:
${JSON.stringify(intent, null, 2)}

Context:
${contextStr}

Please provide risk assessment.`;

      const completion = await withRetry(
        async () => {
          return await this.openai!.chat.completions.create({
            model: this.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.2,
            response_format: { type: "json_object" }
          });
        },
        {
          ...AI_API_RETRY_OPTIONS,
          onRetry: (attempt: number, error: Error) => {
            console.warn(`[AI] Retry attempt ${attempt} for assessRisk: ${error.message}`);
          }
        }
      );

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new AIAPIError(
          ErrorCode.AI_API_INVALID_RESPONSE,
          'No response from AI',
          this.provider,
          this.model
        );
      }

      const parsed = JSON.parse(content);
      return {
        score: Math.min(100, Math.max(0, Number(parsed.score) ?? 50)),
        level: (String(parsed.level).toLowerCase() as 'low' | 'medium' | 'high') || 'medium',
        reasons: Array.isArray(parsed.reasons) ? parsed.reasons : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : []
      };
    } catch (error) {
      console.error('[AI] Error assessing risk after retries:', error);
      // 如果是重试错误，记录但不抛出（使用回退）
      if (error instanceof RetryableError || error instanceof NonRetryableError || error instanceof AIAPIError) {
        console.warn('[AI] Using fallback risk assessment due to API error');
      }
      return this.fallbackRiskAssessment(intent);
    }
  }

  private fallbackRiskAssessment(intent: PaymentIntent): RiskAssessment {
    let score = 50; // Default medium
    
    // Simple heuristics
    if (intent.amountNumber > 1000) score += 20;
    if (intent.recipient === 'unknown') score += 30;
    if (!intent.parsedSuccessfully) score += 15;
    
    score = Math.min(100, Math.max(0, score));
    
    const level = score < 30 ? 'low' : score < 70 ? 'medium' : 'high';
    
    return {
      score,
      level,
      reasons: [
        intent.recipient === 'unknown' ? 'Recipient address not specified' : '',
        intent.amountNumber > 1000 ? 'Large amount' : '',
        !intent.parsedSuccessfully ? 'AI parsing failed' : ''
      ].filter(Boolean),
      recommendations: [
        'Verify recipient address',
        'Consider splitting large payments',
        'Review payment purpose'
      ]
    };
  }
}

/**
 * Extract payment purpose from message (basic implementation)
 */
function extractPurpose(message: string): string {
  const lower = message.toLowerCase();
  
  if (lower.includes('server') || lower.includes('hosting')) return 'Server hosting';
  if (lower.includes('supplier') || lower.includes('vendor')) return 'Supplier payment';
  if (lower.includes('salary') || lower.includes('payroll')) return 'Salary payment';
  if (lower.includes('rent') || lower.includes('lease')) return 'Rent payment';
  if (lower.includes('utility') || lower.includes('electric') || lower.includes('water')) return 'Utility bill';
  if (lower.includes('tax') || lower.includes('irs')) return 'Tax payment';
  if (lower.includes('invoice')) return 'Invoice payment';
  
  // Try to extract between keywords
  const forMatch = message.match(/for\s+(.+?)(?:\.|$)/i);
  if (forMatch) return `Payment for ${forMatch[1].trim()}`;
  
  const toMatch = message.match(/to\s+(.+?)(?:\s+for|\.|$)/i);
  if (toMatch && !toMatch[1].includes('0x')) return `Payment to ${toMatch[1].trim()}`;
  
  return 'General payment';
}

/**
 * Utility function to check if address looks like Ethereum address
 */
export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
