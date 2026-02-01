/**
 * AgentPayGuard API：供前端调用的支付与策略接口
 * 运行：pnpm server（需 .env 中 EXECUTE_ONCHAIN=1 或请求体 executeOnchain=true 才会真实发链上交易）
 * 优化：预加载模块 + AIIntentParser 实例缓存 + 并行操作
 */
import 'dotenv/config';
import http from 'node:http';

process.on('uncaughtException', (err) => {
  console.error('[AgentPayGuard API] uncaughtException:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason, p) => {
  console.error('[AgentPayGuard API] unhandledRejection:', reason, p);
  process.exit(1);
});

console.error('[AgentPayGuard API] starting...');
const PORT = Number(process.env.API_PORT ?? process.env.PORT ?? 3456);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? '*';

// Preload modules at startup to avoid cold start delays
console.error('[AgentPayGuard API] preloading modules...');
const { ethers } = await import('ethers');
const { loadEnv } = await import('./lib/config.js');
const { AIIntentParser } = await import('./lib/ai-intent.js');
const { parseAllowlist, evaluatePolicyWithAI, getAIEnhancedPolicy, prepareAmountForEvaluation } = await import('./lib/policy.js');
const { getTokenDecimals, getTokenBalance } = await import('./lib/erc20.js');
const { readSpentToday, addSpentToday } = await import('./lib/state.js');
const { runPay } = await import('./lib/run-pay.js');
const { AIChatOrchestrator } = await import('./lib/ai-chat.js');
import type { ChatHistoryMessage, PendingPayment } from './lib/ai-chat.js';

// Cache AIIntentParser instance to avoid recreating OpenAI client on each request
const env = loadEnv();
const cachedAIParser = new AIIntentParser();
console.error('[AgentPayGuard API] modules preloaded, AI parser initialized');

// ─── Shared AI payment pipeline ──────────────────────────────────────
interface AIPayPipelineResult {
  ok: boolean;
  intent?: Record<string, unknown>;
  risk?: Record<string, unknown>;
  policy?: Record<string, unknown>;
  txHash?: string;
  userOpHash?: string;
  agentWallet?: string;
  error?: string;
  message?: string;
}

async function runAIPayPipeline(request: string, executeOnchain: boolean, paymentMode?: 'eoa' | 'aa'): Promise<AIPayPipelineResult> {
  if (!cachedAIParser.isEnabled()) {
    return { ok: false, error: 'ai_disabled', message: 'AI features disabled. Set ENABLE_AI_INTENT=1 and configure API key.' };
  }

  // 获取 Agent 身份（满足规则要求：使用 Kite Agent 或身份体系）
  const { getKiteAgentIdentity } = await import('./lib/kite-agent-identity.js');
  const agentIdentity = getKiteAgentIdentity();
  if (agentIdentity.isInitialized()) {
    const identity = agentIdentity.getAgentIdentity();
    if (identity) {
      console.log(`[ai-pipeline] Agent 身份: ${identity.agentName} (${identity.verified ? '已验证' : '未验证'})`);
    }
  } else {
    console.warn('[ai-pipeline] Agent 身份未初始化，建议设置 KITE_API_KEY 以使用 KitePass 身份');
  }

  const provider = new ethers.JsonRpcProvider(env.RPC_URL, env.CHAIN_ID);
  const tokenDecimalsForContext = env.TOKEN_DECIMALS ?? await getTokenDecimals(provider, env.SETTLEMENT_TOKEN_ADDRESS);

  let walletBalanceHuman = 0;
  let agentWalletAddress: string | undefined;
  if (env.PRIVATE_KEY) {
    const wallet = new ethers.Wallet(env.PRIVATE_KEY);
    agentWalletAddress = await wallet.getAddress();
    const balanceWei = await getTokenBalance(provider, env.SETTLEMENT_TOKEN_ADDRESS, agentWalletAddress);
    walletBalanceHuman = Number(ethers.formatUnits(balanceWei, tokenDecimalsForContext));
    console.log('[ai-pipeline] Agent wallet:', agentWalletAddress, '| balance:', walletBalanceHuman);
  }

  const spentTodayForContext = await readSpentToday(env.STATE_PATH);
  const spentTodayHuman = Number(ethers.formatUnits(spentTodayForContext, tokenDecimalsForContext));
  const context = { historicalPayments: [] as never[], walletBalance: walletBalanceHuman, spentToday: spentTodayHuman };

  const { intent, risk: aiAssessment } = await cachedAIParser.parseAndAssessRisk(request, context);

  if (!intent.parsedSuccessfully) {
    return { ok: false, error: 'parse_failed', message: 'Failed to parse payment intent', intent: intent as unknown as Record<string, unknown> };
  }

      // 将支付请求与 Agent 身份绑定（满足规则要求）
      if (agentIdentity.isInitialized()) {
        try {
          const boundPayment = await agentIdentity.bindPaymentToAgent({
            recipient: intent.recipient !== 'unknown' ? intent.recipient : env.RECIPIENT,
            amount: intent.amount,
            purpose: intent.purpose
          });
          console.log(`[ai-pipeline] 支付请求已绑定到 Agent: ${boundPayment.agentName}`);
          console.log(`[ai-pipeline] Agent 身份类型: ${boundPayment.identityType}`);
          if (boundPayment.agentAddress) {
            console.log(`[ai-pipeline] Agent Address (AA Account): ${boundPayment.agentAddress}`);
          }
        } catch (error) {
          console.warn('[ai-pipeline] Agent 身份绑定失败:', error);
        }
      }

  const finalRecipient = intent.recipient !== 'unknown' ? intent.recipient : env.RECIPIENT;
  if (!finalRecipient || finalRecipient === 'unknown') {
    return { ok: false, error: 'no_recipient', message: 'No recipient address specified or parsed', intent: intent as unknown as Record<string, unknown> };
  }

  const tokenDecimals = tokenDecimalsForContext;
  const spentToday = spentTodayForContext;
  const amountInTokenUnits = prepareAmountForEvaluation(intent.amountNumber, intent.currency, tokenDecimals);

  const basePolicy = {
    allowlist: (() => { const a = parseAllowlist(env.ALLOWLIST || ''); return a.length ? a : undefined; })(),
    maxAmount: env.MAX_AMOUNT ? ethers.parseUnits(env.MAX_AMOUNT, tokenDecimals) : undefined,
    dailyLimit: env.DAILY_LIMIT ? ethers.parseUnits(env.DAILY_LIMIT, tokenDecimals) : undefined,
  };
  const enhancedPolicy = getAIEnhancedPolicy(basePolicy, { AI_MAX_RISK_SCORE: env.AI_MAX_RISK_SCORE, AI_AUTO_REJECT_LEVELS: env.AI_AUTO_REJECT_LEVELS });
  const FREEZE_CONTRACT = '0x3168a2307a3c272ea6CE2ab0EF1733CA493aa719';

  const riskRejectionMessage = (msg: string) => {
    const reasons = aiAssessment.reasons.join('; ');
    const hint = /balance|余额|0\s*[,;]|wallet\s*balance/i.test(reasons)
      ? 'AI 检测的余额来自后端 .env 中 PRIVATE_KEY 对应钱包的结算代币 (SETTLEMENT_TOKEN_ADDRESS)，不是前端连接的钱包。请为该 Agent 钱包充值结算代币或核对 .env 配置。'
      : undefined;
    return { message: msg, hint };
  };

  if (enhancedPolicy.maxRiskScore !== undefined && aiAssessment.score > enhancedPolicy.maxRiskScore) {
    const { message, hint } = riskRejectionMessage(`AI风险评估分数过高：${aiAssessment.score} > ${enhancedPolicy.maxRiskScore}。原因：${aiAssessment.reasons.join('; ')}`);
    return { ok: false, intent: intent as unknown as Record<string, unknown>, risk: aiAssessment as unknown as Record<string, unknown>, policy: { ok: false, code: 'AI_RISK_TOO_HIGH', message, hint }, ...(agentWalletAddress && { agentWallet: agentWalletAddress }) };
  }

  const riskLevel = aiAssessment.level as 'high' | 'medium' | 'low';
  if (enhancedPolicy.autoRejectRiskLevels?.includes(riskLevel as 'high' | 'medium')) {
    const { message, hint } = riskRejectionMessage(`AI风险评估等级为 ${aiAssessment.level}，根据策略自动拒绝。原因：${aiAssessment.reasons.join('; ')}`);
    return { ok: false, intent: intent as unknown as Record<string, unknown>, risk: aiAssessment as unknown as Record<string, unknown>, policy: { ok: false, code: 'AI_RISK_TOO_HIGH', message, hint }, ...(agentWalletAddress && { agentWallet: agentWalletAddress }) };
  }

  const decision = await evaluatePolicyWithAI({
    policy: enhancedPolicy, recipient: finalRecipient, amount: amountInTokenUnits, spentToday,
    provider, freezeContractAddress: FREEZE_CONTRACT,
    naturalLanguageRequest: request, paymentIntent: intent, aiParser: cachedAIParser,
    context: { historicalPayments: [], walletBalance: context.walletBalance },
  });
  decision.aiAssessment = aiAssessment;

  if (!decision.baseDecision.ok) {
    return { ok: false, intent: intent as unknown as Record<string, unknown>, risk: aiAssessment as unknown as Record<string, unknown>, policy: decision.baseDecision as unknown as Record<string, unknown> };
  }

  if (executeOnchain) {
    const finalPaymentMode = paymentMode ?? env.PAYMENT_MODE;
    const payResult = await runPay({ recipient: finalRecipient, amount: intent.amount.split(' ')[0], paymentMode: finalPaymentMode as 'eoa' | 'aa', executeOnchain: true });
    if (payResult.ok) {
      await addSpentToday(env.STATE_PATH, amountInTokenUnits);
      return { ok: true, intent: intent as unknown as Record<string, unknown>, risk: aiAssessment as unknown as Record<string, unknown>, policy: decision.baseDecision as unknown as Record<string, unknown>, txHash: payResult.txHash, userOpHash: payResult.userOpHash };
    }
    return { ok: false, intent: intent as unknown as Record<string, unknown>, risk: aiAssessment as unknown as Record<string, unknown>, policy: payResult as unknown as Record<string, unknown> };
  }

  return { ok: true, intent: intent as unknown as Record<string, unknown>, risk: aiAssessment as unknown as Record<string, unknown>, policy: decision.baseDecision as unknown as Record<string, unknown> };
}

function parseBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

function send(res: http.ServerResponse, status: number, data: unknown) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.writeHead(status);
  res.end(JSON.stringify(data));
}

function setCors(res: http.ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const server = http.createServer(async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? '/', `http://localhost`);
  const path = url.pathname;

  if (path === '/api/agent-wallet' && req.method === 'GET') {
    try {
      if (!env.PRIVATE_KEY) {
        send(res, 200, {
          ok: false,
          error: 'no_private_key',
          message: 'PRIVATE_KEY not set. If you use .env.enc (Chainlink env-enc), run npx env-enc set-pw then npx env-enc set to store PRIVATE_KEY; then start the server with npx tsx src/server.ts (config loads .env.enc at startup).'
        });
        return;
      }
      const wallet = new ethers.Wallet(env.PRIVATE_KEY);
      const address = await wallet.getAddress();
      console.log('[api/agent-wallet] Agent wallet (PRIVATE_KEY):', address);
      send(res, 200, { ok: true, address });
    } catch (err) {
      send(res, 500, { error: err instanceof Error ? err.message : 'Failed to get agent wallet' });
    }
    return;
  }

  if (path === '/api/policy' && req.method === 'GET') {
    try {
      const { loadEnv } = await import('./lib/config.js');
      const { parseAllowlist } = await import('./lib/policy.js');
      const env = loadEnv();
      const allowlist = parseAllowlist(env.ALLOWLIST);
      send(res, 200, {
        allowlist: allowlist.slice(0, 10),
        allowlistCount: allowlist.length,
        maxAmount: env.MAX_AMOUNT ?? null,
        dailyLimit: env.DAILY_LIMIT ?? null,
        settlementToken: env.SETTLEMENT_TOKEN_ADDRESS,
        chainId: env.CHAIN_ID
      });
    } catch (err) {
      send(res, 500, { error: err instanceof Error ? err.message : 'Failed to load policy' });
    }
    return;
  }

  if (path === '/api/freeze' && req.method === 'GET') {
    try {
      const address = url.searchParams.get('address');
      if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
        send(res, 400, { ok: false, error: 'invalid_address', message: 'Query param address (0x...) is required' });
        return;
      }
      const FREEZE_CONTRACT = '0x3168a2307a3c272ea6CE2ab0EF1733CA493aa719';
      const FREEZE_ABI = ['function isFrozen(address account) view returns (bool)'];
      const provider = new ethers.JsonRpcProvider(env.RPC_URL, env.CHAIN_ID);
      const contract = new ethers.Contract(FREEZE_CONTRACT, FREEZE_ABI, provider);
      const isFrozen: boolean = await contract.isFrozen(address);
      send(res, 200, { ok: true, address, isFrozen });
    } catch (err) {
      send(res, 500, { error: err instanceof Error ? err.message : 'Failed to check freeze status' });
    }
    return;
  }

  if (path === '/api/pay' && req.method === 'POST') {
    try {
      const { runPay } = await import('./lib/run-pay.js');
      const body = await parseBody(req);
      const recipient = typeof body.recipient === 'string' ? body.recipient : undefined;
      const amount = typeof body.amount === 'string' ? body.amount : undefined;
      const paymentMode = body.paymentMode === 'aa' ? 'aa' as const : body.paymentMode === 'eoa' ? 'eoa' as const : undefined;
      const executeOnchain = body.executeOnchain === true || body.executeOnchain === 'true' || body.executeOnchain === '1';

      const result = await runPay({
        recipient,
        amount,
        paymentMode,
        executeOnchain: executeOnchain ? true : undefined
      });

      if (result.ok) {
        send(res, 200, { ok: true, txHash: result.txHash, userOpHash: result.userOpHash });
      } else {
        send(res, 400, { ok: false, code: result.code, message: result.message });
      }
    } catch (err) {
      send(res, 500, { error: err instanceof Error ? err.message : 'Payment failed' });
    }
    return;
  }

  if (path === '/api/ai-pay' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const request = typeof body.request === 'string' ? body.request : '';
      const executeOnchain = body.executeOnchain === true || body.executeOnchain === 'true' || body.executeOnchain === '1';
      const paymentMode = body.paymentMode === 'aa' ? 'aa' as const : body.paymentMode === 'eoa' ? 'eoa' as const : undefined;
      if (!request.trim()) {
        send(res, 400, { ok: false, error: 'missing_request', message: 'Natural language request is required' });
        return;
      }
      const result = await runAIPayPipeline(request, executeOnchain, paymentMode);
      send(res, result.ok ? 200 : (result.error ? 400 : 200), result);
    } catch (err) {
      send(res, 500, { ok: false, error: 'server_error', message: err instanceof Error ? err.message : 'AI payment failed' });
    }
    return;
  }

  // ─── AI Chat: natural conversation endpoint ─────────────────────────
  if (path === '/api/ai-chat' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const message = typeof body.message === 'string' ? body.message : '';
      const history = Array.isArray(body.history) ? body.history as ChatHistoryMessage[] : [];
      const confirmPayment = body.confirmPayment === true;
      const pending = (body.pendingPayment ?? null) as PendingPayment | null;

      if (!message.trim() && !confirmPayment) {
        send(res, 400, { ok: false, text: 'Message is required.', action: 'conversation' });
        return;
      }

      // Payment confirmation flow (backward compatible)
      if (confirmPayment && pending?.originalRequest) {
        const paymentMode = (body.paymentMode === 'eoa' || body.paymentMode === 'aa') ? body.paymentMode : undefined;
        console.log('[api/ai-chat] Confirming payment:', pending.originalRequest, paymentMode ? `(mode: ${paymentMode})` : '');
        const result = await runAIPayPipeline(pending.originalRequest, true, paymentMode);
        const text = result.ok && result.txHash
          ? `Payment executed successfully! Tx: ${result.txHash}`
          : `Payment failed: ${result.message || 'Unknown error'}`;
        send(res, 200, { text, action: 'payment', paymentResult: result });
        return;
      }

      // Build chat orchestrator / 构建聊天编排器
      const openaiClient = cachedAIParser.getOpenAIClient();
      const aiEnabled = cachedAIParser.isEnabled();
      const providerInfo = cachedAIParser.getProviderInfo();
      
      console.log(`[api/ai-chat] AI status check: enabled=${aiEnabled}, provider=${providerInfo.provider}, model=${providerInfo.model}, hasClient=${!!openaiClient}`);
      
      if (!openaiClient || !aiEnabled) {
        // AI disabled — use fallback keyword classification only / AI未启用 - 仅使用回退关键词分类
        console.warn('[api/ai-chat] AI not enabled or client not available, using fallback');
        console.warn(`[api/ai-chat] Diagnostic: ENABLE_AI_INTENT=${env.ENABLE_AI_INTENT}, provider=${providerInfo.provider}, hasClient=${!!openaiClient}`);
        const fallback = new AIChatOrchestrator(null as unknown as import('openai').default, '');
        const cls = fallback.fallbackClassify(message);
        send(res, 200, { 
          text: cls.response || 'AI is not configured. Please set ENABLE_AI_INTENT=1 and an API key.', 
          action: cls.action,
          fallback: true,
          diagnostic: {
            aiEnabled: false,
            provider: providerInfo.provider,
            reason: !openaiClient ? 'No OpenAI client' : 'AI disabled'
          }
        });
        return;
      }

      const orchestrator = new AIChatOrchestrator(openaiClient, cachedAIParser.getModel());
      const classification = await orchestrator.classify(message, history);

      switch (classification.action) {
        case 'payment': {
          const payRequest = classification.paymentRequest || message;
          const dryRun = body.dryRun === true;
          const paymentMode = (body.paymentMode === 'eoa' || body.paymentMode === 'aa') ? body.paymentMode : undefined;
          const autoExecute = body.autoExecute !== false; // default true
          
          // Dry-run mode: only parse and assess, don't execute
          if (dryRun) {
            const result = await runAIPayPipeline(payRequest, false);
            send(res, 200, {
              text: classification.response || (result.ok ? 'Payment intent parsed (dry-run mode). Risk assessed, policy checked, but not executed on-chain.' : `Issue found: ${result.message || 'Policy check failed.'}`),
              action: 'payment',
              paymentResult: result,
              dryRun: true,
            });
            break;
          }
          
          // Parse and assess first
          const result = await runAIPayPipeline(payRequest, false);
          
          // Check if should auto-execute: low risk + policy passed
          const shouldAutoExecute = autoExecute && result.ok && result.risk && 
            (result.risk as { level?: string }).level === 'low';
          
          if (shouldAutoExecute) {
            // Auto-execute: run with actual payment mode
            const executeMode = paymentMode ?? env.PAYMENT_MODE;
            console.log(`[api/ai-chat] Auto-executing payment (mode: ${executeMode})`);
            const executeResult = await runAIPayPipeline(payRequest, true, executeMode);
            
            if (executeResult.ok && executeResult.txHash) {
              const modeText = executeMode === 'aa' ? 'Account Abstraction' : 'EOA';
              send(res, 200, {
                text: `Payment executed automatically via ${modeText}! Transaction: ${executeResult.txHash}`,
                action: 'payment',
                paymentResult: executeResult,
                autoExecuted: true,
                paymentMode: executeMode,
              });
            } else {
              send(res, 200, {
                text: `Payment parsing passed but execution failed: ${executeResult.message || 'Unknown error'}`,
                action: 'payment',
                paymentResult: executeResult,
                autoExecuted: false,
              });
            }
          } else {
            // Manual confirmation flow (backward compatible)
            const pendingPayment: PendingPayment = {
              recipient: (result.intent as Record<string, string>)?.recipient ?? '',
              amount: (result.intent as Record<string, string>)?.amount ?? '',
              currency: (result.intent as Record<string, string>)?.currency ?? 'USDC',
              purpose: (result.intent as Record<string, string>)?.purpose ?? '',
              originalRequest: payRequest,
            };
            send(res, 200, {
              text: classification.response || (result.ok ? 'Payment intent parsed. Please review and confirm.' : `Issue found: ${result.message || 'Policy check failed.'}`),
              action: 'payment',
              paymentResult: result,
              pendingConfirmation: result.ok && !autoExecute,
              pendingPayment: result.ok && !autoExecute ? pendingPayment : undefined,
            });
          }
          break;
        }
        case 'query_balance': {
          let text = classification.response;
          const queryResult: Record<string, unknown> = {};
          try {
            if (env.PRIVATE_KEY) {
              const provider = new ethers.JsonRpcProvider(env.RPC_URL, env.CHAIN_ID);
              const wallet = new ethers.Wallet(env.PRIVATE_KEY);
              const addr = await wallet.getAddress();
              const decimals = env.TOKEN_DECIMALS ?? await getTokenDecimals(provider, env.SETTLEMENT_TOKEN_ADDRESS);
              const balWei = await getTokenBalance(provider, env.SETTLEMENT_TOKEN_ADDRESS, addr);
              const balHuman = Number(ethers.formatUnits(balWei, decimals));
              queryResult.address = addr;
              queryResult.balance = balHuman;
              queryResult.token = env.SETTLEMENT_TOKEN_ADDRESS;
              if (!text) text = `Agent wallet (${addr.slice(0, 6)}...${addr.slice(-4)}) balance: ${balHuman} (settlement token).`;
            } else {
              if (!text) text = 'PRIVATE_KEY is not configured. Cannot query balance.';
            }
          } catch (e) {
            if (!text) text = 'Failed to query balance.';
          }
          send(res, 200, { text, action: 'query_balance', queryResult });
          break;
        }
        case 'query_policy': {
          let text = classification.response;
          try {
            const allowlist = parseAllowlist(env.ALLOWLIST || '');
            const queryResult = {
              allowlistCount: allowlist.length,
              allowlist: allowlist.slice(0, 5),
              maxAmount: env.MAX_AMOUNT ?? null,
              dailyLimit: env.DAILY_LIMIT ?? null,
              settlementToken: env.SETTLEMENT_TOKEN_ADDRESS,
              chainId: env.CHAIN_ID,
            };
            if (!text) {
              text = `Policy: ${allowlist.length} address(es) in allowlist, max amount: ${env.MAX_AMOUNT ?? 'unlimited'}, daily limit: ${env.DAILY_LIMIT ?? 'unlimited'}.`;
            }
            send(res, 200, { text, action: 'query_policy', queryResult });
          } catch {
            send(res, 200, { text: text || 'Failed to load policy.', action: 'query_policy' });
          }
          break;
        }
        case 'query_freeze': {
          let text = classification.response;
          const addr = classification.queryAddress;
          if (addr && /^0x[a-fA-F0-9]{40}$/.test(addr)) {
            try {
              const FREEZE_CONTRACT = '0x3168a2307a3c272ea6CE2ab0EF1733CA493aa719';
              const FREEZE_ABI = ['function isFrozen(address account) view returns (bool)'];
              const provider = new ethers.JsonRpcProvider(env.RPC_URL, env.CHAIN_ID);
              const contract = new ethers.Contract(FREEZE_CONTRACT, FREEZE_ABI, provider);
              const isFrozen: boolean = await contract.isFrozen(addr);
              if (!text) text = isFrozen ? `Address ${addr} is FROZEN on-chain.` : `Address ${addr} is NOT frozen.`;
              send(res, 200, { text, action: 'query_freeze', queryResult: { address: addr, isFrozen } });
            } catch {
              send(res, 200, { text: text || 'Failed to check freeze status.', action: 'query_freeze' });
            }
          } else {
            send(res, 200, { text: text || 'Please provide a valid Ethereum address (0x...) to check freeze status.', action: 'query_freeze' });
          }
          break;
        }
        default: {
          send(res, 200, { text: classification.response || "I'm AgentPayGuard assistant. How can I help?", action: 'conversation' });
          break;
        }
      }
    } catch (err) {
      send(res, 500, { ok: false, text: 'Sorry, an error occurred.', action: 'conversation', error: err instanceof Error ? err.message : 'Chat failed' });
    }
    return;
  }

  if (path === '/api/health' && req.method === 'GET') {
    send(res, 200, { status: 'ok', service: 'AgentPayGuard API' });
    return;
  }

  if (path === '/' && req.method === 'GET') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
    res.writeHead(200);
    res.end(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>AgentPayGuard API</title></head><body>
<h1>AgentPayGuard API</h1>
<p>服务已启动，端口: ${PORT}</p>
<ul>
  <li><a href="/api/health">GET /api/health</a> - 健康检查</li>
  <li><a href="/api/agent-wallet">GET /api/agent-wallet</a> - 查看 .env 中 PRIVATE_KEY 对应钱包地址</li>
  <li><a href="/api/policy">GET /api/policy</a> - 策略（白名单/限额）</li>
  <li><a href="/api/freeze?address=0x...">GET /api/freeze?address=0x...</a> - 查询地址是否被链上冻结（前端可测）</li>
  <li>POST /api/pay - 发起支付（需用前端或 curl 调用）</li>
  <li>POST /api/ai-pay - AI 自然语言支付（需用前端或 curl 调用）</li>
  <li>POST /api/ai-chat - AI 自然对话（支持闲聊/查询/支付确认）</li>
</ul>
</body></html>`);
    return;
  }

  send(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`[AgentPayGuard API] http://localhost:${PORT}`);
  console.log('  GET  /api/health      - 健康检查');
  console.log('  GET  /api/agent-wallet - 查看 PRIVATE_KEY 对应钱包地址');
  console.log('  GET  /api/policy     - 策略（白名单/限额）');
  console.log('  GET  /api/freeze  - 查询地址冻结状态（?address=0x...）');
  console.log('  POST /api/pay     - 发起支付（body: recipient?, amount?, paymentMode?, executeOnchain?）');
  console.log('  POST /api/ai-pay  - AI 自然语言支付（body: request, executeOnchain?）');
  console.log('  POST /api/ai-chat - AI 自然对话（body: message, history?, confirmPayment?, pendingPayment?）');
});

server.on('error', (err: NodeJS.ErrnoException) => {
  console.error('[AgentPayGuard API] server error:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`端口 ${PORT} 已被占用，请更换 API_PORT 或关闭占用进程。`);
  }
  process.exit(1);
});
