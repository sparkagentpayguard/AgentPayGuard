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

  async classify(message: string, history: ChatHistoryMessage[]): Promise<ChatClassification> {
    // 验证和清理输入
    let sanitizedMessage: string;
    try {
      sanitizedMessage = validateAndSanitizeInput(message, {
        maxLength: 1000,
        allowInjection: false
      });
    } catch (error) {
      console.error('[AIChatOrchestrator] Input validation failed:', error);
      // 如果输入验证失败，使用回退分类器
      return this.fallbackClassify(message);
    }

    // 检查缓存（仅对无历史消息的简单请求缓存）
    if (history.length === 0) {
      const cacheKey = hashString(`chat:${sanitizedMessage}`);
      const cached = this.responseCache.get(cacheKey);
      if (cached) {
        console.log('[AIChatOrchestrator] Cache hit');
        return cached;
      }
    }

    try {
      // 清理历史消息中的输入
      const sanitizedHistory = history.slice(-10).map(h => ({
        role: h.role as 'user' | 'assistant',
        content: h.role === 'user' 
          ? validateAndSanitizeInput(h.content, { maxLength: 1000, allowInjection: true }) // 历史消息允许注入（仅记录）
          : h.content,
      }));

      // 动态生成系统提示词（基于当前功能状态）
      const systemPrompt = getSystemPrompt();
      
      const messages: OpenAI.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...sanitizedHistory,
        { role: 'user', content: sanitizedMessage },
      ];

      // 优化参数：降低 temperature，限制 max_tokens，设置超时
      const temperature = this.env.AI_TEMPERATURE ?? 0.1; // 默认 0.1（更快更确定）
      const maxTokens = this.env.AI_MAX_TOKENS; // 可选限制输出长度
      const timeout = this.env.AI_TIMEOUT_MS ?? 30000; // 默认 30 秒超时

      const completion = await withRetry(
        async () => {
          // 创建带超时的 Promise
          const completionPromise = this.openai.chat.completions.create({
            model: this.model,
            messages,
            temperature,
            max_tokens: maxTokens,
            response_format: { type: 'json_object' },
          });

          // 添加超时控制
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('AI API timeout')), timeout);
          });

          return await Promise.race([completionPromise, timeoutPromise]);
        },
        {
          ...AI_API_RETRY_OPTIONS,
          onRetry: (attempt: number, error: Error) => {
            console.warn(`[AIChatOrchestrator] Retry attempt ${attempt}: ${error.message}`);
          }
        }
      );

      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error('Empty LLM response');

      const parsed = JSON.parse(content);
      const result: ChatClassification = {
        action: this.normalizeAction(parsed.action),
        response: typeof parsed.response === 'string' ? parsed.response : '',
        paymentRequest: parsed.paymentRequest,
        queryAddress: parsed.queryAddress,
      };

      // 缓存结果（仅对无历史消息的请求）
      if (history.length === 0) {
        const cacheKey = hashString(`chat:${sanitizedMessage}`);
        this.responseCache.set(cacheKey, result);
      }

      return result;
    } catch (err) {
      console.error('[AIChatOrchestrator] classify failed after retries, using fallback:', err);
      return this.fallbackClassify(message);
    }
  }

  fallbackClassify(message: string): ChatClassification {
    const lower = message.toLowerCase();

    // Payment keywords (must have transfer intent + number)
    if (/\b(pay|send|transfer|转|支付|汇|打款)\b/i.test(lower) && /\d/.test(lower)) {
      return { action: 'payment', response: '', paymentRequest: message };
    }

    // Balance keywords
    if (/\b(balance|余额|balances|how much|还剩|可用)\b/i.test(lower)) {
      return { action: 'query_balance', response: '' };
    }

    // Policy keywords
    if (/\b(policy|policies|limit|allowlist|白名单|策略|限额|规则)\b/i.test(lower)) {
      return { action: 'query_policy', response: '' };
    }

    // Freeze keywords
    if (/\b(frozen?|freeze|冻结|是否被冻)\b/i.test(lower)) {
      const addrMatch = message.match(/0x[a-fA-F0-9]{40}/);
      return { action: 'query_freeze', response: '', queryAddress: addrMatch?.[0] };
    }

    return { action: 'conversation', response: 'I am AgentPayGuard assistant. I can help you with payments, balance queries, policy checks, and freeze status. How can I help?' };
  }

  private normalizeAction(raw: unknown): ChatAction {
    const valid: ChatAction[] = ['payment', 'query_balance', 'query_policy', 'query_freeze', 'conversation'];
    if (typeof raw === 'string' && valid.includes(raw as ChatAction)) return raw as ChatAction;
    return 'conversation';
  }
}
