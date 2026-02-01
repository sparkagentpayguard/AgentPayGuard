#!/usr/bin/env node

import { ethers } from 'ethers';
import { loadEnv } from './lib/config.js';
import { getTokenDecimals, transferErc20 } from './lib/erc20.js';
import { AIIntentParser } from './lib/ai-intent.js';
import { parseAllowlist, evaluatePolicyWithAI, getAIEnhancedPolicy, prepareAmountForEvaluation } from './lib/policy.js';
import { addSpentToday, readSpentToday } from './lib/state.js';
import { sendErc20ViaAA } from './lib/kite-aa.js';
import { getKiteAgentIdentity } from './lib/kite-agent-identity.js';

/**
 * AI Agent Payment Demo
 * 
 * This demonstrates a complete AI Agent payment workflow:
 * 1. Parse natural language payment request
 * 2. Perform AI risk assessment
 * 3. Apply enhanced AI-powered policies
 * 4. Execute payment (dry-run or real)
 * 
 * Example usage:
 * ENABLE_AI_INTENT=1 pnpm tsx src/demo-ai-agent.ts "Pay 100 USDC to 0x742d35Cc6634C0532925a3b844Bc9e0BB0A8E2D3 for server hosting"
 */

async function main() {
  const env = loadEnv();
  
  // Get natural language request from command line argument
  const naturalLanguageRequest = process.argv[2];
  if (!naturalLanguageRequest) {
    console.error('Usage: pnpm tsx src/demo-ai-agent.ts "Pay 100 USDC to 0x... for purpose"');
    console.error('\nExample:');
    console.error('  pnpm tsx src/demo-ai-agent.ts "Pay 50 USDC to 0xd2d45ef2f2ddaffc8c8bc03cedc4f55fb9e97e2b for server hosting"');
    console.error('\nEnvironment variables:');
    console.error('  ENABLE_AI_INTENT=1 - Enable AI features');
    console.error('  OPENAI_API_KEY=... - OpenAI API key (required if ENABLE_AI_INTENT=1)');
    console.error('  EXECUTE_ONCHAIN=0  - Dry-run (default)');
    console.error('  EXECUTE_ONCHAIN=1  - Real transaction');
    process.exit(1);
  }

  console.log('🤖 AI Agent Payment Demo');
  console.log('=======================\n');
  console.log('Request:', naturalLanguageRequest);

  // Initialize Agent Identity (满足规则要求：使用 Kite Agent 或身份体系)
  const agentIdentity = getKiteAgentIdentity();
  if (agentIdentity.isInitialized()) {
    const identity = agentIdentity.getAgentIdentity();
    if (identity) {
      console.log(`\n🆔 Agent Identity: ${identity.agentName}`);
      console.log(`   Agent ID: ${identity.agentId.substring(0, 30)}...`);
      console.log(`   Verified: ${identity.verified ? '✅' : '⚠️'}`);
      if (identity.verifiedAt) {
        console.log(`   Verified At: ${identity.verifiedAt.toISOString()}`);
      }
    }
  } else {
    console.log('\n⚠️  Agent Identity: 未初始化');
    console.log('   提示: 设置 KITE_API_KEY 以使用 KitePass 身份（推荐）');
    console.log('   或使用 PRIVATE_KEY 对应的 EOA 地址作为 Agent 身份标识');
  }

  const provider = new ethers.JsonRpcProvider(env.RPC_URL, env.CHAIN_ID);
  
  // Initialize AI Parser
  const aiParser = new AIIntentParser();
  const aiEnabled = aiParser.isEnabled();
  
  console.log(`\n📊 AI Status: ${aiEnabled ? '✅ Enabled' : '⚠️ Disabled (using fallback parser)'}`);
  if (!aiEnabled && env.ENABLE_AI_INTENT) {
    console.log('   Hint: Set OPENAI_API_KEY environment variable to enable AI features');
  }

  // Step 1: Parse natural language request
  console.log('\n🔍 Step 1: Parsing natural language request...');
  const paymentIntent = await aiParser.parsePaymentIntent(naturalLanguageRequest);
  
  console.log('\n📋 Parsed Payment Intent:');
  console.log('  Recipient:', paymentIntent.recipient);
  console.log('  Amount:', paymentIntent.amount);
  console.log('  Currency:', paymentIntent.currency);
  console.log('  Purpose:', paymentIntent.purpose);
  console.log('  Risk Level:', paymentIntent.riskLevel);
  console.log('  Confidence:', (paymentIntent.confidence * 100).toFixed(1) + '%');
  console.log('  Parsed Successfully:', paymentIntent.parsedSuccessfully ? '✅' : '⚠️');
  
  if (paymentIntent.reasoning) {
    console.log('  Reasoning:', paymentIntent.reasoning);
  }

  // Determine final recipient (use parsed if available, otherwise use env)
  const finalRecipient = paymentIntent.recipient !== 'unknown' && paymentIntent.parsedSuccessfully
    ? paymentIntent.recipient
    : env.RECIPIENT;

  if (!finalRecipient || finalRecipient === 'unknown') {
    console.error('\n❌ Error: No recipient address specified or parsed');
    console.error('   Please specify recipient in request or set RECIPIENT in .env');
    process.exit(1);
  }

  // 将支付请求与 Agent 身份绑定（满足规则要求）
  if (agentIdentity.isInitialized()) {
    try {
      const boundPayment = agentIdentity.bindPaymentToAgent({
        recipient: finalRecipient,
        amount: paymentIntent.amount,
        purpose: paymentIntent.purpose
      });
      console.log(`\n🔗 Payment bound to Agent: ${boundPayment.agentName}`);
    } catch (error) {
      console.warn('\n⚠️  Failed to bind payment to Agent identity:', error);
    }
  }

  // Get token decimals and convert amount
  const tokenDecimals = env.TOKEN_DECIMALS ?? (await getTokenDecimals(provider, env.SETTLEMENT_TOKEN_ADDRESS));
  const amountInTokenUnits = prepareAmountForEvaluation(paymentIntent.amountNumber, paymentIntent.currency, tokenDecimals);

  console.log(`\n💰 Amount Details:`);
  console.log('  Human-readable:', paymentIntent.amount);
  console.log('  Numeric:', paymentIntent.amountNumber);
  console.log('  Token Units:', amountInTokenUnits.toString());
  console.log('  Decimals:', tokenDecimals);

  // Prepare policy with AI enhancements
  const basePolicy = {
    allowlist: (() => { const a = parseAllowlist(env.ALLOWLIST || ''); return a.length ? a : undefined; })(),
    maxAmount: env.MAX_AMOUNT ? ethers.parseUnits(env.MAX_AMOUNT, tokenDecimals) : undefined,
    dailyLimit: env.DAILY_LIMIT ? ethers.parseUnits(env.DAILY_LIMIT, tokenDecimals) : undefined
  };

  const enhancedPolicy = getAIEnhancedPolicy(basePolicy, {
    AI_MAX_RISK_SCORE: env.AI_MAX_RISK_SCORE,
    AI_AUTO_REJECT_LEVELS: env.AI_AUTO_REJECT_LEVELS
  });
  
  console.log('\n⚙️ Policy Configuration:');
  console.log('  Allowlist:', basePolicy.allowlist?.length ? basePolicy.allowlist.join(', ') : '(none)');
  console.log('  Max Amount:', basePolicy.maxAmount?.toString() || '(none)');
  console.log('  Daily Limit:', basePolicy.dailyLimit?.toString() || '(none)');
  console.log('  AI Max Risk Score:', enhancedPolicy.maxRiskScore);
  console.log('  Auto-reject Risk Levels:', enhancedPolicy.autoRejectRiskLevels?.join(', ') || '(none)');

  // Check on-chain freeze status
  const FREEZE_CONTRACT = '0x3168a2307a3c272ea6CE2ab0EF1733CA493aa719';
  const spentToday = await readSpentToday(env.STATE_PATH);

  // Step 2: AI-enhanced policy evaluation
  console.log('\n🔒 Step 2: AI-enhanced policy evaluation...');
  const decision = await evaluatePolicyWithAI({
    policy: enhancedPolicy,
    recipient: finalRecipient,
    amount: amountInTokenUnits,
    spentToday,
    provider,
    freezeContractAddress: FREEZE_CONTRACT,
    naturalLanguageRequest,
    paymentIntent,
    aiParser,
    context: {
      // In production, you would load historical data here
      historicalPayments: [],
      walletBalance: 10000 // Example balance
    }
  });

  console.log('\n📋 Evaluation Results:');
  console.log('  AI Enabled:', decision.aiEnabled ? '✅' : '❌');
  
  if (decision.aiAssessment) {
    console.log('\n  🤖 AI Risk Assessment:');
    console.log('    Score:', decision.aiAssessment.score + '/100');
    console.log('    Level:', decision.aiAssessment.level);
    console.log('    Reasons:', decision.aiAssessment.reasons.join('; ') || '(none)');
    if (decision.aiAssessment.recommendations.length > 0) {
      console.log('    Recommendations:', decision.aiAssessment.recommendations.join('; '));
    }
  }

  if (decision.warnings.length > 0) {
    console.log('\n  ⚠️ Warnings:');
    decision.warnings.forEach(warning => console.log('   -', warning));
  }

  console.log('\n  📊 Final Decision:', decision.baseDecision.ok ? '✅ APPROVED' : '❌ REJECTED');
  
  if (!decision.baseDecision.ok) {
    console.log('  ❌ Reason:', decision.baseDecision.message);
    console.log('  🔒 Code:', decision.baseDecision.code);
    process.exit(2);
  }

  console.log('\n✅ All checks passed! Payment approved.');

  // Dry-run or real execution
  if (!env.EXECUTE_ONCHAIN) {
    console.log('\n🚀 Step 3: Dry-run (no transaction sent)');
    console.log('\nWould execute:');
    console.log('  From: (your wallet)');
    console.log('  To:', finalRecipient);
    console.log('  Amount:', paymentIntent.amount);
    console.log('  Token:', env.SETTLEMENT_TOKEN_ADDRESS);
    console.log('  Mode:', env.PAYMENT_MODE);
    console.log('\nTo send real transaction, set EXECUTE_ONCHAIN=1');
    return;
  }

  // Real execution
  console.log('\n🚀 Step 3: Executing payment...');
  
  const needsSigner = env.EXECUTE_ONCHAIN || env.PAYMENT_MODE === 'aa';
  if (needsSigner && !env.PRIVATE_KEY) {
    throw new Error('需要签名私钥：请在 .env 中配置 PRIVATE_KEY（测试网）');
  }
  const wallet = env.PRIVATE_KEY ? new ethers.Wallet(env.PRIVATE_KEY, provider) : undefined;

  if (env.PAYMENT_MODE === 'aa') {
    if (!env.BUNDLER_URL) throw new Error('PAYMENT_MODE=aa 时必须提供 BUNDLER_URL');
    
    console.log('  Mode: Account Abstraction (AA)');
    console.log('  Using Bundler:', env.BUNDLER_URL);
    
    const { userOpHash, status } = await sendErc20ViaAA({
      rpcUrl: env.RPC_URL,
      bundlerUrl: env.BUNDLER_URL,
      ownerWallet: wallet!,
      token: env.SETTLEMENT_TOKEN_ADDRESS,
      to: finalRecipient,
      amount: amountInTokenUnits,
      paymasterAddress: env.PAYMASTER_ADDRESS
    });
    
    console.log('  ✅ UserOp Hash:', userOpHash);
    console.log('  Status:', status);
    
  } else {
    console.log('  Mode: EOA (Direct Transfer)');
    
    const { txHash } = await transferErc20({
      token: env.SETTLEMENT_TOKEN_ADDRESS,
      signer: wallet!,
      to: finalRecipient,
      amount: amountInTokenUnits
    });
    
    console.log('  ✅ Transaction Hash:', txHash);
    console.log('  💡 Tip: Copy this txHash to for_judge.md');
  }

  // Update daily spend
  await addSpentToday(env.STATE_PATH, amountInTokenUnits);
  
  console.log('\n🎉 Payment executed successfully!');
  console.log('\n📊 Summary:');
  console.log('  Request:', naturalLanguageRequest);
  console.log('  Recipient:', finalRecipient);
  console.log('  Amount:', paymentIntent.amount);
  console.log('  Purpose:', paymentIntent.purpose);
  console.log('  AI Risk Assessment:', decision.aiAssessment?.level || 'N/A');
  console.log('  AI Score:', decision.aiAssessment?.score || 'N/A');
  console.log('\n🔗 Next steps:');
  console.log('  1. Verify transaction on Kite blockchain explorer');
  console.log('  2. Update for_judge.md with transaction hash');
  console.log('  3. Consider adding this to your demo video');
}

// Run with error handling
main().catch((error) => {
  console.error('\n❌ Error:', error.message);
  if (error.stack) {
    console.error('\nStack trace:');
    console.error(error.stack);
  }
  process.exit(1);
});