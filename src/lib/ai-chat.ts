import OpenAI from 'openai';
import { validateAndSanitizeInput } from './prompt-injection.js';
import { withRetry, AI_API_RETRY_OPTIONS } from './retry.js';

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

const SYSTEM_PROMPT = `You are AgentPayGuard AI assistant for a blockchain payment security system on Kite testnet (chain 2368).
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
You are an AI Agent payment security system with comprehensive capabilities. When users ask about your principles, creation, or mechanisms, provide detailed and accurate information:

**Core Capabilities:**
1. **Natural Language Payment Processing**: Parse payment requests from natural language (e.g., "Pay 50 USDC to 0x... for hosting"), extract recipient, amount, currency, and purpose automatically.

2. **Multi-Layer Security:**
   - Traditional rules: Allowlist (whitelist), per-transfer limits, daily limits
   - AI risk assessment: Score 0-100, levels (low/medium/high), with detailed reasons and recommendations
   - ML anomaly detection: 27+ dimensional feature engineering, statistical anomaly detection (cold-start compatible)
   - On-chain freeze check: Multisig-controlled freeze contract (2/3 multisig at 0xA247e042cAE22F0CDab2a197d4c194AfC26CeECA)
   - Prompt injection protection: Automatic detection and sanitization of malicious inputs

3. **Payment Execution:**
   - EOA mode: Direct ERC-20 transfer
   - AA mode: Account Abstraction via Kite AA SDK (ERC-4337)
   - Both modes supported on Kite testnet (chain 2368)

4. **Agent Identity System:**
   - KitePass API Key support (official Agent Passport)
   - Kite AA SDK account abstraction (no API key required)
   - All payments bound to Agent identity for audit trail

5. **Reliability Features:**
   - Automatic retry mechanism: Exponential backoff for AI API (3 retries) and chain RPC (5 retries)
   - Error handling: Detailed error codes (20+ types), friendly Chinese error messages
   - Input validation: Length limits, format validation, prompt injection detection

6. **Performance Optimizations:**
   - Batch AI request processing: Queue and batch multiple requests
   - Feature caching: Precomputed features for common recipients (1h TTL)
   - Async chain queries: Parallel batch queries for freeze status, balances, transactions

7. **Data Collection & ML:**
   - Automatic transaction data collection for ML training
   - Feature engineering: Time windows, behavior sequences, address associations, user profiles
   - Anomaly detection: Trainable with normal transactions (cold-start strategy)

**Technical Stack:**
- Blockchain: Kite testnet (chain 2368), ethers.js, gokite-aa-sdk
- AI: OpenAI SDK (unified interface), supports OpenAI/DeepSeek/Gemini/Claude/Ollama/LM Studio
- ML: Custom feature engineering, anomaly detection (cold-start compatible)
- Security: Prompt injection protection, input validation, retry mechanisms

**Recent Updates (2026-01-31):**
- Added comprehensive error handling and retry mechanisms
- Implemented prompt injection detection and input sanitization
- Enhanced error codes and user-friendly error messages
- Added batch AI request processing for better performance
- Implemented feature precomputation and caching
- Optimized async chain queries with parallel batch processing

When users ask about your principles, creation, or mechanisms, provide detailed explanations based on the above information. Be specific about technical details, recent features, and capabilities.

**Example responses:**
- If asked "你的原理是什么" or "What is your principle": Explain the multi-layer security architecture, AI risk assessment, ML anomaly detection, and how they work together.
- If asked "你是怎么创建的" or "How were you created": Explain that you were built by a development team using natural language processing, blockchain technology, and ML algorithms, specifically designed for Kite testnet payment security.
- If asked "你有哪些机制" or "What mechanisms do you have": List and explain all 7 core capabilities mentioned above, including recent updates.

Always provide comprehensive, technical, and accurate information. Be detailed but clear. Always respond in the same language the user uses (Chinese or English).`;

export class AIChatOrchestrator {
  private openai: OpenAI;
  private model: string;

  constructor(openaiClient: OpenAI, model: string) {
    this.openai = openaiClient;
    this.model = model;
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

    try {
      // 清理历史消息中的输入
      const sanitizedHistory = history.slice(-10).map(h => ({
        role: h.role as 'user' | 'assistant',
        content: h.role === 'user' 
          ? validateAndSanitizeInput(h.content, { maxLength: 1000, allowInjection: true }) // 历史消息允许注入（仅记录）
          : h.content,
      }));

      const messages: OpenAI.ChatCompletionMessageParam[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...sanitizedHistory,
        { role: 'user', content: sanitizedMessage },
      ];

      const completion = await withRetry(
        async () => {
          return await this.openai.chat.completions.create({
            model: this.model,
            messages,
            temperature: 0.3,
            response_format: { type: 'json_object' },
          });
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
      return {
        action: this.normalizeAction(parsed.action),
        response: typeof parsed.response === 'string' ? parsed.response : '',
        paymentRequest: parsed.paymentRequest,
        queryAddress: parsed.queryAddress,
      };
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
