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

// Cache AIIntentParser instance to avoid recreating OpenAI client on each request
const env = loadEnv();
const cachedAIParser = new AIIntentParser();
console.error('[AgentPayGuard API] modules preloaded, AI parser initialized');

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
      
      if (!request.trim()) {
        send(res, 400, { ok: false, error: 'missing_request', message: 'Natural language request is required' });
        return;
      }
      
      if (!cachedAIParser.isEnabled()) {
        send(res, 400, { ok: false, error: 'ai_disabled', message: 'AI features disabled. Set ENABLE_AI_INTENT=1 and configure API key.' });
        return;
      }
      
      const provider = new ethers.JsonRpcProvider(env.RPC_URL, env.CHAIN_ID);
      const tokenDecimalsForContext = env.TOKEN_DECIMALS ?? await getTokenDecimals(provider, env.SETTLEMENT_TOKEN_ADDRESS);
      // Balance passed to AI = backend Agent wallet (PRIVATE_KEY) settlement token only — not the frontend connected wallet
      let walletBalanceHuman = 0;
      let agentWalletAddress: string | undefined;
      if (env.PRIVATE_KEY) {
        const wallet = new ethers.Wallet(env.PRIVATE_KEY);
        agentWalletAddress = await wallet.getAddress();
        const balanceWei = await getTokenBalance(provider, env.SETTLEMENT_TOKEN_ADDRESS, agentWalletAddress);
        walletBalanceHuman = Number(ethers.formatUnits(balanceWei, tokenDecimalsForContext));
        console.log('[api/ai-pay] Agent wallet (PRIVATE_KEY):', agentWalletAddress, '| Settlement token balance:', walletBalanceHuman);
        if (walletBalanceHuman === 0) {
          console.warn('[api/ai-pay] Settlement token balance is 0. Token:', env.SETTLEMENT_TOKEN_ADDRESS);
        }
      }
      const spentTodayForContext = await readSpentToday(env.STATE_PATH);
      const spentTodayHuman = Number(ethers.formatUnits(spentTodayForContext, tokenDecimalsForContext));
      const context = {
        historicalPayments: [],
        walletBalance: walletBalanceHuman,
        spentToday: spentTodayHuman
      };
      const { intent, risk: aiAssessment } = await cachedAIParser.parseAndAssessRisk(request, context);
      
      if (!intent.parsedSuccessfully) {
        send(res, 400, { ok: false, error: 'parse_failed', message: 'Failed to parse payment intent', intent });
        return;
      }
      
      // Determine recipient
      const finalRecipient = intent.recipient !== 'unknown' ? intent.recipient : env.RECIPIENT;
      if (!finalRecipient || finalRecipient === 'unknown') {
        send(res, 400, { ok: false, error: 'no_recipient', message: 'No recipient address specified or parsed', intent });
        return;
      }
      
      // Reuse token decimals and spent-today from context (no duplicate RPC/file read)
      const tokenDecimals = tokenDecimalsForContext;
      const spentToday = spentTodayForContext;
      
      const amountInTokenUnits = prepareAmountForEvaluation(intent.amountNumber, intent.currency, tokenDecimals);
      
      // Prepare policy
      const basePolicy = {
        allowlist: (() => { const a = parseAllowlist(env.ALLOWLIST || ''); return a.length ? a : undefined; })(),
        maxAmount: env.MAX_AMOUNT ? ethers.parseUnits(env.MAX_AMOUNT, tokenDecimals) : undefined,
        dailyLimit: env.DAILY_LIMIT ? ethers.parseUnits(env.DAILY_LIMIT, tokenDecimals) : undefined
      };
      const enhancedPolicy = getAIEnhancedPolicy(basePolicy, {
        AI_MAX_RISK_SCORE: env.AI_MAX_RISK_SCORE,
        AI_AUTO_REJECT_LEVELS: env.AI_AUTO_REJECT_LEVELS
      });
      const FREEZE_CONTRACT = '0x3168a2307a3c272ea6CE2ab0EF1733CA493aa719';
      
      // OPTIMIZATION 3: Use pre-computed AI assessment instead of calling AI again
      // Check AI risk thresholds first (fast, no network call)
      const riskRejectionMessage = (msg: string) => {
        const reasons = aiAssessment.reasons.join('; ');
        const hint = /balance|余额|0\s*[,;]|wallet\s*balance/i.test(reasons)
          ? 'AI 检测的余额来自后端 .env 中 PRIVATE_KEY 对应钱包的结算代币 (SETTLEMENT_TOKEN_ADDRESS)，不是前端连接的钱包。请为该 Agent 钱包充值结算代币或核对 .env 配置。'
          : undefined;
        return { message: msg, hint };
      };
      if (enhancedPolicy.maxRiskScore !== undefined && aiAssessment.score > enhancedPolicy.maxRiskScore) {
        const { message, hint } = riskRejectionMessage(
          `AI风险评估分数过高：${aiAssessment.score} > ${enhancedPolicy.maxRiskScore}。原因：${aiAssessment.reasons.join('; ')}`
        );
        if (agentWalletAddress) {
          console.warn('[api/ai-pay] Rejected (risk score). Agent wallet:', agentWalletAddress);
        }
        send(res, 200, {
          ok: false,
          intent,
          risk: aiAssessment,
          policy: { ok: false, code: 'AI_RISK_TOO_HIGH', message, hint },
          ...(agentWalletAddress && { agentWallet: agentWalletAddress })
        });
        return;
      }
      
      const riskLevel = aiAssessment.level as 'high' | 'medium' | 'low';
      if (enhancedPolicy.autoRejectRiskLevels?.includes(riskLevel as 'high' | 'medium')) {
        const { message, hint } = riskRejectionMessage(
          `AI风险评估等级为 ${aiAssessment.level}，根据策略自动拒绝。原因：${aiAssessment.reasons.join('; ')}`
        );
        if (agentWalletAddress) {
          console.warn('[api/ai-pay] Rejected (risk level). Agent wallet:', agentWalletAddress);
        }
        send(res, 200, {
          ok: false,
          intent,
          risk: aiAssessment,
          policy: { ok: false, code: 'AI_RISK_TOO_HIGH', message, hint },
          ...(agentWalletAddress && { agentWallet: agentWalletAddress })
        });
        return;
      }
      
      // Evaluate traditional policy rules (allowlist, limits, freeze check)
      const decision = await evaluatePolicyWithAI({
        policy: enhancedPolicy,
        recipient: finalRecipient,
        amount: amountInTokenUnits,
        spentToday,
        provider,
        freezeContractAddress: FREEZE_CONTRACT,
        naturalLanguageRequest: request,
        paymentIntent: intent,
        aiParser: cachedAIParser,
        context: { historicalPayments: [], walletBalance: context.walletBalance }
      });
      
      // Override AI assessment with our pre-computed one
      decision.aiAssessment = aiAssessment;
      
      // Return result with intent, risk, and policy decision
      if (!decision.baseDecision.ok) {
        send(res, 200, {
          ok: false,
          intent,
          risk: decision.aiAssessment,
          policy: decision.baseDecision
        });
        return;
      }
      
      // If approved and executeOnchain, run payment
      if (executeOnchain) {
        const payResult = await runPay({
          recipient: finalRecipient,
          amount: intent.amount.split(' ')[0], // Extract numeric part
          paymentMode: env.PAYMENT_MODE as 'eoa' | 'aa',
          executeOnchain: true
        });
        
        if (payResult.ok) {
          await addSpentToday(env.STATE_PATH, amountInTokenUnits);
          send(res, 200, {
            ok: true,
            intent,
            risk: decision.aiAssessment,
            policy: decision.baseDecision,
            txHash: payResult.txHash,
            userOpHash: payResult.userOpHash
          });
        } else {
          send(res, 400, {
            ok: false,
            intent,
            risk: decision.aiAssessment,
            policy: payResult
          });
        }
      } else {
        // Dry-run: return approval without executing
        send(res, 200, {
          ok: true,
          intent,
          risk: decision.aiAssessment,
          policy: decision.baseDecision
        });
      }
    } catch (err) {
      send(res, 500, { ok: false, error: 'server_error', message: err instanceof Error ? err.message : 'AI payment failed' });
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
});

server.on('error', (err: NodeJS.ErrnoException) => {
  console.error('[AgentPayGuard API] server error:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`端口 ${PORT} 已被占用，请更换 API_PORT 或关闭占用进程。`);
  }
  process.exit(1);
});
