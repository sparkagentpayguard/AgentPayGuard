import OpenAI from 'openai';
import { loadEnv } from './config.js';

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

export class AIIntentParser {
  private openai: OpenAI | null = null;
  private env: ReturnType<typeof loadEnv>;

  constructor() {
    this.env = loadEnv();
    if (this.env.OPENAI_API_KEY && this.env.ENABLE_AI_INTENT) {
      this.openai = new OpenAI({
        apiKey: this.env.OPENAI_API_KEY,
      });
    }
  }

  isEnabled(): boolean {
    return this.env.ENABLE_AI_INTENT && !!this.env.OPENAI_API_KEY;
  }

  /**
   * Parse natural language payment request into structured intent
   */
  async parsePaymentIntent(userMessage: string): Promise<PaymentIntent> {
    if (!this.isEnabled() || !this.openai) {
      return this.fallbackParse(userMessage);
    }

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

      const completion = await this.openai.chat.completions.create({
        model: this.env.AI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      const parsed = JSON.parse(content);
      
      return {
        ...parsed,
        parsedSuccessfully: true,
        riskLevel: parsed.riskLevel.toLowerCase() as 'low' | 'medium' | 'high'
      };
    } catch (error) {
      console.error('[AI] Error parsing intent:', error);
      return this.fallbackParse(userMessage);
    }
  }

  /**
   * Simple fallback parser when AI is not available
   */
  private fallbackParse(userMessage: string): PaymentIntent {
    console.log('[AI] Using fallback parser');
    
    // Very basic parsing - in real implementation would be more sophisticated
    const amountMatch = userMessage.match(/(\d+(\.\d+)?)\s*(USDC|ETH|USD|\$)/i);
    const addressMatch = userMessage.match(/0x[a-fA-F0-9]{40}/);
    
    const defaultAddress = this.env.RECIPIENT || 'unknown';
    const defaultAmount = this.env.AMOUNT || '0.01';
    
    return {
      recipient: addressMatch ? addressMatch[0] : defaultAddress,
      amount: amountMatch ? `${amountMatch[1]} ${amountMatch[3]?.toUpperCase() || 'USDC'}` : `${defaultAmount} USDC`,
      amountNumber: amountMatch ? parseFloat(amountMatch[1]) : parseFloat(defaultAmount),
      currency: amountMatch ? (amountMatch[3]?.toUpperCase() === 'USD' ? 'USDC' : amountMatch[3]?.toUpperCase()) : 'USDC',
      purpose: extractPurpose(userMessage),
      confidence: 0.5,
      riskLevel: 'medium',
      reasoning: 'Fallback parser used - limited risk assessment',
      parsedSuccessfully: false
    };
  }

  /**
   * Assess risk of a payment intent
   */
  async assessRisk(intent: PaymentIntent, context?: {
    historicalPayments?: Array<{recipient: string, amount: number, timestamp: Date}>;
    walletBalance?: number;
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
- Amount size relative to typical payments
- Recipient address format and validity
- Payment purpose clarity
- Historical patterns (if available)
- Time of day, frequency, etc.

Be conservative - it's better to flag medium risk than miss a high risk.`;

      const userPrompt = `Payment Intent:
${JSON.stringify(intent, null, 2)}

Context:
${contextStr}

Please provide risk assessment.`;

      const completion = await this.openai.chat.completions.create({
        model: this.env.AI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      return JSON.parse(content);
    } catch (error) {
      console.error('[AI] Error assessing risk:', error);
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