import { ethers } from 'ethers';
import { AIIntentParser, PaymentIntent, RiskAssessment } from './ai-intent.js';

export type Policy = {
  allowlist?: string[];
  maxAmount?: bigint;
  dailyLimit?: bigint;
  // AI-enhanced policies
  maxRiskScore?: number; // 0-100
  requireAIAssessment?: boolean;
  autoRejectRiskLevels?: ('high' | 'medium')[];
};

export type PolicyDecision =
  | { ok: true; warnings?: string[]; aiAssessment?: RiskAssessment }
  | { 
      ok: false; 
      code: 'NOT_IN_ALLOWLIST' | 'AMOUNT_EXCEEDS_MAX' | 'DAILY_LIMIT_EXCEEDED' | 'RECIPIENT_FROZEN' | 'AI_RISK_TOO_HIGH' | 'AI_ASSESSMENT_FAILED'; 
      message: string;
      aiAssessment?: RiskAssessment;
    };

export type EnhancedPolicyDecision = {
  baseDecision: PolicyDecision;
  aiAssessment?: RiskAssessment;
  paymentIntent?: PaymentIntent;
  aiEnabled: boolean;
  warnings: string[];
};

export function normalizeAddresses(addrs: string[]): string[] {
  return addrs
    .map((a) => a.trim())
    .filter(Boolean)
    .map((a) => ethers.getAddress(a));
}

// SimpleFreeze contract ABI (minimal)
const FREEZE_ABI = ['function isFrozen(address account) view returns (bool)'];

/**
 * Original policy evaluation (unchanged for backward compatibility)
 */
export async function evaluatePolicy(args: {
  policy: Policy;
  recipient: string;
  amount: bigint;
  spentToday?: bigint; // in token units
  provider?: ethers.Provider; // Optional: needed for on-chain freeze check
  freezeContractAddress?: string; // Optional: address of the freeze contract
}): Promise<PolicyDecision> {
  const recipient = ethers.getAddress(args.recipient);
  const { policy, amount, provider, freezeContractAddress } = args;

  // 1. Check Allowlist
  if (policy.allowlist && policy.allowlist.length > 0) {
    const ok = policy.allowlist.some((a) => ethers.getAddress(a) === recipient);
    if (!ok) {
      return {
        ok: false,
        code: 'NOT_IN_ALLOWLIST',
        message: `收款地址不在白名单：${recipient}`
      };
    }
  }

  // 2. Check On-chain Freeze Status (Strong Consistency)
  if (provider && freezeContractAddress) {
    try {
      const freezeContract = new ethers.Contract(freezeContractAddress, FREEZE_ABI, provider);
      const isFrozen: boolean = await freezeContract.isFrozen(recipient);
      
      if (isFrozen) {
        return {
          ok: false,
          code: 'RECIPIENT_FROZEN',
          message: `收款地址已被多签冻结：${recipient}`
        };
      }
    } catch (error: any) {
      // In Strong Consistency mode, we fail if we can't verify status
      console.error('[Policy] Failed to check freeze status:', error);
      throw new Error(`策略校验失败：无法验证链上冻结状态 (${error.message})`);
    }
  }

  // 3. Check Max Amount
  if (policy.maxAmount !== undefined && amount > policy.maxAmount) {
    return {
      ok: false,
      code: 'AMOUNT_EXCEEDS_MAX',
      message: `单笔金额超过上限：amount=${amount.toString()} max=${policy.maxAmount.toString()}`
    };
  }

  if (policy.dailyLimit !== undefined) {
    const spent = args.spentToday ?? 0n;
    if (spent + amount > policy.dailyLimit) {
      return {
        ok: false,
        code: 'DAILY_LIMIT_EXCEEDED',
        message: `日累计超过限额：spent=${spent.toString()} + amount=${amount.toString()} > dailyLimit=${policy.dailyLimit.toString()}`
      };
    }
  }

  return { ok: true };
}

/**
 * Enhanced policy evaluation with AI capabilities
 */
export async function evaluatePolicyWithAI(args: {
  policy: Policy;
  recipient: string;
  amount: bigint;
  spentToday?: bigint;
  provider?: ethers.Provider;
  freezeContractAddress?: string;
  // AI-specific arguments
  naturalLanguageRequest?: string;
  paymentIntent?: PaymentIntent;
  aiParser?: AIIntentParser;
  context?: {
    historicalPayments?: Array<{recipient: string, amount: number, timestamp: Date}>;
    walletBalance?: number;
  };
}): Promise<EnhancedPolicyDecision> {
  const { 
    policy, 
    recipient, 
    amount, 
    spentToday, 
    provider, 
    freezeContractAddress,
    naturalLanguageRequest,
    paymentIntent,
    aiParser,
    context
  } = args;

  const warnings: string[] = [];
  let finalPaymentIntent = paymentIntent;
  let aiAssessment: RiskAssessment | undefined;
  const aiEnabled = aiParser?.isEnabled() || false;

  // Step 1: Parse natural language if provided and no intent yet
  if (naturalLanguageRequest && aiParser && !paymentIntent) {
    try {
      console.log('[AI] Parsing natural language request:', naturalLanguageRequest);
      finalPaymentIntent = await aiParser.parsePaymentIntent(naturalLanguageRequest);
      
      if (finalPaymentIntent.parsedSuccessfully) {
        console.log('[AI] Parsed intent:', JSON.stringify(finalPaymentIntent, null, 2));
        
        // Validate parsed address matches provided recipient if both exist
        if (recipient && finalPaymentIntent.recipient !== 'unknown' && 
            ethers.getAddress(recipient) !== ethers.getAddress(finalPaymentIntent.recipient)) {
          warnings.push(`解析出的收款地址 (${finalPaymentIntent.recipient}) 与提供的地址 (${recipient}) 不一致，使用提供的地址`);
        }
      } else {
        warnings.push('AI意图解析失败，使用回退解析结果');
      }
    } catch (error) {
      console.error('[AI] Failed to parse intent:', error);
      warnings.push('AI意图解析出错，跳过AI评估');
    }
  }

  // Step 2: AI Risk Assessment if enabled and we have intent
  if (aiParser && aiParser.isEnabled() && finalPaymentIntent) {
    try {
      console.log('[AI] Performing risk assessment...');
      aiAssessment = await aiParser.assessRisk(finalPaymentIntent, context);
      console.log('[AI] Risk assessment:', JSON.stringify(aiAssessment, null, 2));
      
      // Apply AI-based policies
      if (policy.maxRiskScore !== undefined && aiAssessment.score > policy.maxRiskScore) {
        return {
          baseDecision: {
            ok: false,
            code: 'AI_RISK_TOO_HIGH',
            message: `AI风险评估分数过高：${aiAssessment.score} > ${policy.maxRiskScore}。原因：${aiAssessment.reasons.join('; ')}`
          },
          aiAssessment,
          paymentIntent: finalPaymentIntent,
          aiEnabled: true,
          warnings
        };
      }
      
      // Use type assertion to handle the 'low' case
      const riskLevel = aiAssessment.level as 'high' | 'medium' | 'low';
      if (policy.autoRejectRiskLevels?.includes(riskLevel as 'high' | 'medium')) {
        return {
          baseDecision: {
            ok: false,
            code: 'AI_RISK_TOO_HIGH',
            message: `AI风险评估等级为 ${aiAssessment.level}，根据策略自动拒绝。原因：${aiAssessment.reasons.join('; ')}`
          },
          aiAssessment,
          paymentIntent: finalPaymentIntent,
          aiEnabled: true,
          warnings
        };
      }
      
      // Add AI warnings if risk is medium or high
      if (aiAssessment.level === 'medium' || aiAssessment.level === 'high') {
        warnings.push(`AI风险提醒：${aiAssessment.level} 风险 (分数: ${aiAssessment.score})`);
        if (aiAssessment.recommendations.length > 0) {
          warnings.push(...aiAssessment.recommendations.map(rec => `建议：${rec}`));
        }
      }
    } catch (error) {
      console.error('[AI] Failed to assess risk:', error);
      if (policy.requireAIAssessment) {
        return {
          baseDecision: {
            ok: false,
            code: 'AI_ASSESSMENT_FAILED',
            message: 'AI风险评估失败，但策略要求AI评估'
          },
          aiAssessment: undefined,
          paymentIntent: finalPaymentIntent,
          aiEnabled: true,
          warnings: [...warnings, 'AI风险评估失败']
        };
      }
      warnings.push('AI风险评估失败，跳过AI策略检查');
    }
  } else if (policy.requireAIAssessment) {
    // AI required but not available
    return {
      baseDecision: {
        ok: false,
        code: 'AI_ASSESSMENT_FAILED',
        message: '策略要求AI评估，但AI功能未启用'
      },
      aiAssessment: undefined,
      paymentIntent: finalPaymentIntent,
      aiEnabled: false,
      warnings
    };
  }

  // Step 3: Apply traditional policy checks
  const baseDecision = await evaluatePolicy({
    policy,
    recipient,
    amount,
    spentToday,
    provider,
    freezeContractAddress
  });

  // Combine results
  if (baseDecision.ok) {
    return {
      baseDecision: {
        ...baseDecision,
        warnings: warnings.length > 0 ? warnings : undefined,
        aiAssessment
      },
      aiAssessment,
      paymentIntent: finalPaymentIntent,
      aiEnabled,
      warnings
    };
  } else {
    return {
      baseDecision: {
        ...baseDecision,
        aiAssessment
      },
      aiAssessment,
      paymentIntent: finalPaymentIntent,
      aiEnabled,
      warnings
    };
  }
}

/**
 * Utility to convert human-readable amount to bigint for token units
 */
export function prepareAmountForEvaluation(
  amountNumber: number,
  currency: string,
  tokenDecimals: number = 18
): bigint {
  // Simple conversion - in production would use proper token decimals
  const multiplier = 10n ** BigInt(tokenDecimals);
  return BigInt(Math.floor(amountNumber * Number(multiplier)));
}

/**
 * Get AI-enhanced policy configuration
 */
export function getAIEnhancedPolicy(basePolicy: Policy): Policy {
  return {
    ...basePolicy,
    maxRiskScore: 70, // Default: reject if risk score > 70
    requireAIAssessment: false, // Default: AI assessment optional
    autoRejectRiskLevels: ['high'] // Default: auto-reject high risk
  };
}