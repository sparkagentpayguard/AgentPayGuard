import OpenAI from 'openai';
import { validateAndSanitizeInput } from './prompt-injection.js';
import { withRetry, AI_API_RETRY_OPTIONS } from './retry.js';
import { buildSystemPrompt } from './system-prompt-builder.js';
import { loadEnv } from './config.js';
import { SimpleCache, hashString } from './cache.js';

export type ChatAction = 'payment' | 'query_balance' | 'query_policy' | 'query_freeze' | 'conversation';

export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatClassification {
  action: ChatAction;
  response: string;
  paymentRequest?: string;
  queryAddress?: string;
}

export interface PendingPayment {
  recipient: string;
  amount: string;
  currency: string;
  purpose: string;
  originalRequest: string;
}

/**
 * 获取系统提示词（动态生成，带缓存）
 * 
 * 特点：
 * - 自动检测功能状态（AI、ML、Agent 身份等）
 * - 根据实际配置生成提示词
 * - 5 分钟缓存（避免重复检测）
 * - 支持自定义提示词（通过 AI_SYSTEM_PROMPT 环境变量）
 */
function getSystemPrompt(): string {
  return buildSystemPrompt(false);
}

export class AIChatOrchestrator {
  private openai: OpenAI;
  private model: string;
  private env: ReturnType<typeof loadEnv>;
  private responseCache: SimpleCache<ChatClassification>; // 响应缓存（避免重复请求）

  constructor(openaiClient: OpenAI, model: string) {
    this.openai = openaiClient;
    this.model = model;
    this.env = loadEnv();
    // 缓存 5 分钟（相同输入快速返回）
    this.responseCache = new SimpleCache(300);
  }

  /**
   * Classify user message and generate response / 分类用户消息并生成响应
   * 
   * @param {string} message - User message / 用户消息
   * @param {ChatHistoryMessage[]} history - Conversation history / 对话历史
   * @returns {Promise<ChatClassification>} Classification result / 分类结果
   */
  async classify(message: string, history: ChatHistoryMessage[]): Promise<ChatClassification> {
    console.log(`[AIChatOrchestrator] Classifying message: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
    
    // Step 1: Validate and sanitize input / 步骤1：验证和清理输入
    let sanitizedMessage: string;
    try {
      sanitizedMessage = validateAndSanitizeInput(message, {
        maxLength: 1000,
        allowInjection: false // Strict mode: reject injection attempts / 严格模式：拒绝注入尝试
      });
      console.log('[AIChatOrchestrator] Input validation passed');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('[AIChatOrchestrator] Input validation failed:', err.message);
      console.warn('[AIChatOrchestrator] Using fallback due to input validation failure');
      // If input validation fails, use fallback classifier / 如果输入验证失败，使用回退分类器
      return this.fallbackClassify(message);
    }

    // Step 2: Check cache (only for simple requests without history) / 步骤2：检查缓存（仅对无历史消息的简单请求）
    if (history.length === 0) {
      const cacheKey = hashString(`chat:${sanitizedMessage}`);
      const cached = this.responseCache.get(cacheKey);
      if (cached) {
        console.log('[AIChatOrchestrator] Cache hit - returning cached result');
        return cached;
      }
    }

    // Step 3: Call AI API / 步骤3：调用AI API
    try {
      // Sanitize history messages / 清理历史消息中的输入
      const sanitizedHistory = history.slice(-10).map(h => ({
        role: h.role as 'user' | 'assistant',
        content: h.role === 'user' 
          ? validateAndSanitizeInput(h.content, { maxLength: 1000, allowInjection: true }) // History allows injection (for logging only) / 历史消息允许注入（仅记录）
          : h.content,
      }));

      // Generate dynamic system prompt (based on current feature state) / 动态生成系统提示词（基于当前功能状态）
      const systemPrompt = getSystemPrompt();
      console.log(`[AIChatOrchestrator] System prompt length: ${systemPrompt.length} chars`);
      
      const messages: OpenAI.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...sanitizedHistory,
        { role: 'user', content: sanitizedMessage },
      ];

      // Optimize parameters: lower temperature, limit max_tokens, set timeout / 优化参数：降低 temperature，限制 max_tokens，设置超时
      const temperature = this.env.AI_TEMPERATURE ?? 0.1; // Default 0.1 (faster and more deterministic) / 默认 0.1（更快更确定）
      // Dynamic max_tokens: conversation needs more tokens, payment/queries need less / 动态 max_tokens：对话需要更多 tokens，支付/查询需要更少
      // Default: 2000 for conversation (detailed responses), 500 for others (brief responses) / 默认：对话 2000（详细响应），其他 500（简短响应）
      const defaultMaxTokens = 2000; // Increased default for conversation responses / 增加默认值以支持对话响应
      const maxTokens = this.env.AI_MAX_TOKENS ?? defaultMaxTokens;
      const timeout = this.env.AI_TIMEOUT_MS ?? 30000; // Default 30s timeout / 默认 30 秒超时

      console.log(`[AIChatOrchestrator] Calling AI API: model=${this.model}, temperature=${temperature}, maxTokens=${maxTokens}, timeout=${timeout}ms`);

      const completion = await withRetry(
        async () => {
          // Create timeout-controlled Promise / 创建带超时的 Promise
          const completionPromise = this.openai.chat.completions.create({
            model: this.model,
            messages,
            temperature,
            max_tokens: maxTokens,
            response_format: { type: 'json_object' },
          });

          // Add timeout control / 添加超时控制
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`AI API timeout after ${timeout}ms`)), timeout);
          });

          return await Promise.race([completionPromise, timeoutPromise]);
        },
        {
          ...AI_API_RETRY_OPTIONS,
          onRetry: (attempt: number, error: Error) => {
            console.warn(`[AIChatOrchestrator] Retry attempt ${attempt}/${AI_API_RETRY_OPTIONS.maxRetries ?? 3}: ${error.message}`);
          }
        }
      );

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        console.error('[AIChatOrchestrator] Empty LLM response - no content in completion');
        throw new Error('Empty LLM response');
      }

      console.log(`[AIChatOrchestrator] Received AI response (${content.length} chars), parsing JSON...`);

      // Parse JSON response / 解析JSON响应
      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch (parseError) {
        console.error('[AIChatOrchestrator] JSON parse failed:', parseError);
        console.error('[AIChatOrchestrator] Response content:', content.substring(0, 500));
        
        // Check if JSON is truncated (common when max_tokens is too small) / 检查 JSON 是否被截断（max_tokens 太小时常见）
        const isTruncated = content.length > 0 && (
          parseError instanceof SyntaxError && 
          (parseError.message.includes('Unterminated') || parseError.message.includes('Unexpected end'))
        );
        
        if (isTruncated && maxTokens < 4000) {
          console.warn(`[AIChatOrchestrator] JSON appears truncated. Response length: ${content.length}, maxTokens: ${maxTokens}`);
          console.warn('[AIChatOrchestrator] Consider increasing AI_MAX_TOKENS (e.g., 2000-4000) for conversation responses');
        }
        
        throw new Error(`Invalid JSON response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }

      const result: ChatClassification = {
        action: this.normalizeAction(parsed.action),
        response: typeof parsed.response === 'string' ? parsed.response : '',
        paymentRequest: parsed.paymentRequest,
        queryAddress: parsed.queryAddress,
      };

      console.log(`[AIChatOrchestrator] Classification successful: action=${result.action}, responseLength=${result.response.length}`);

      // Cache result (only for requests without history) / 缓存结果（仅对无历史消息的请求）
      if (history.length === 0) {
        const cacheKey = hashString(`chat:${sanitizedMessage}`);
        this.responseCache.set(cacheKey, result);
        console.log('[AIChatOrchestrator] Result cached');
      }

      return result;
    } catch (err) {
      // Log detailed error information / 记录详细错误信息
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[AIChatOrchestrator] classify failed after retries, using fallback');
      console.error('[AIChatOrchestrator] Error type:', error.constructor.name);
      console.error('[AIChatOrchestrator] Error message:', error.message);
      console.error('[AIChatOrchestrator] Error stack:', error.stack);
      
      // Check specific error types / 检查特定错误类型
      if (error.message.includes('timeout')) {
        console.error('[AIChatOrchestrator] Reason: AI API timeout - consider increasing AI_TIMEOUT_MS or checking network');
      } else if (error.message.includes('JSON')) {
        console.error('[AIChatOrchestrator] Reason: Invalid JSON response from AI - AI may not be following response_format');
      } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
        console.error('[AIChatOrchestrator] Reason: API key invalid or expired - check your API key configuration');
      } else if (error.message.includes('429') || error.message.includes('rate limit')) {
        console.error('[AIChatOrchestrator] Reason: Rate limit exceeded - wait and retry later');
      } else if (error.message.includes('model')) {
        console.error('[AIChatOrchestrator] Reason: Model not found or not available - check AI_MODEL configuration');
      }
      
      return this.fallbackClassify(message);
    }
  }

  /**
   * Fallback Classifier / 回退分类器
   * Used when AI classification fails, provides basic keyword-based classification
   * 当AI分类失败时使用，提供基于关键词的基本分类
   */
  fallbackClassify(message: string): ChatClassification {
    const lower = message.toLowerCase();

    // Payment keywords (must have transfer intent + number) / 支付关键词（必须有转账意图+数字）
    if (/\b(pay|send|transfer|转|支付|汇|打款)\b/i.test(lower) && /\d/.test(lower)) {
      return { action: 'payment', response: '', paymentRequest: message };
    }

    // Balance keywords / 余额关键词
    if (/\b(balance|余额|balances|how much|还剩|可用)\b/i.test(lower)) {
      return { action: 'query_balance', response: '' };
    }

    // Policy keywords / 策略关键词
    if (/\b(policy|policies|limit|allowlist|白名单|策略|限额|规则)\b/i.test(lower)) {
      return { action: 'query_policy', response: '' };
    }

    // Freeze keywords / 冻结关键词
    if (/\b(frozen?|freeze|冻结|是否被冻)\b/i.test(lower)) {
      const addrMatch = message.match(/0x[a-fA-F0-9]{40}/);
      return { action: 'query_freeze', response: '', queryAddress: addrMatch?.[0] };
    }

    // Technical questions / 技术问题：返回详细的功能说明
    if (/\b(功能|实现|原理|机制|技术|架构|如何工作|what.*implement|how.*work|features|functions)\b/i.test(lower)) {
      const detailedResponse = `AgentPayGuard 是一个基于 Kite 测试网的 AI Agent 支付风控系统。核心功能包括：

1. **自然语言支付解析**：支持理解如"Pay 50 USDC to 0x... for server hosting"的指令，自动提取收款地址、金额、币种和支付目的。

2. **智能风险评估**：使用 AI（支持 OpenAI、DeepSeek、Gemini、Claude 等多种提供商）进行风险评分（0-100），提供风险等级（低/中/高）和详细理由。

3. **多层安全防护**：
   - 传统规则：白名单、单笔限额、日限额
   - AI 风险评估：基于支付目的、金额、历史模式
   - 链上冻结检查：实时检查多签冻结状态

4. **Agent 身份绑定**：每笔支付都与 Agent 身份绑定（支持 KitePass API Key 或 Kite AA SDK），确保可追溯性。

5. **双路径支付**：支持 EOA（外部账户）和 AA（账户抽象）两种支付模式。

技术架构：自然语言请求 → AI 意图解析 → 风险评估 → 策略检查 → 链上执行。所有规则在执行前强制执行，2/3 多签提供人类兜底机制。

如需了解更多技术细节，请告诉我具体想了解的功能模块。`;

      return { action: 'conversation', response: detailedResponse };
    }

    // Default fallback response / 默认回退响应
    return { 
      action: 'conversation', 
      response: '你好！我是 AgentPayGuard AI 助手。我可以帮助您处理支付、查询余额、检查策略、验证地址冻结状态，或回答相关问题。请告诉我您需要什么帮助？' 
    };
  }

  private normalizeAction(raw: unknown): ChatAction {
    const valid: ChatAction[] = ['payment', 'query_balance', 'query_policy', 'query_freeze', 'conversation'];
    if (typeof raw === 'string' && valid.includes(raw as ChatAction)) return raw as ChatAction;
    return 'conversation';
  }
}
