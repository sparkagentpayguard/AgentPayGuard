import OpenAI from 'openai';

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
- You know about: USDC/USDT stablecoin payments, allowlist policy, per-transfer & daily limits, on-chain freeze (multisig), AI risk assessment (score 0-100, levels low/medium/high), EOA & Account Abstraction modes.
- Be concise and helpful. If user greets you, greet back and briefly mention what you can do.

Always respond in the same language the user uses (Chinese or English).`;

export class AIChatOrchestrator {
  private openai: OpenAI;
  private model: string;

  constructor(openaiClient: OpenAI, model: string) {
    this.openai = openaiClient;
    this.model = model;
  }

  async classify(message: string, history: ChatHistoryMessage[]): Promise<ChatClassification> {
    try {
      const messages: OpenAI.ChatCompletionMessageParam[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.slice(-10).map(h => ({
          role: h.role as 'user' | 'assistant',
          content: h.content,
        })),
        { role: 'user', content: message },
      ];

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

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
      console.error('[AIChatOrchestrator] classify failed, using fallback:', err);
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
