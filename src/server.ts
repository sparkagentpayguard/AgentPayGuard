/**
 * AgentPayGuard API：供前端调用的支付与策略接口
 * 运行：pnpm server（需 .env 中 EXECUTE_ONCHAIN=1 或请求体 executeOnchain=true 才会真实发链上交易）
 */
import http from 'node:http';
import { loadEnv } from './lib/config.js';
import { runPay } from './lib/run-pay.js';
import { parseAllowlist } from './lib/policy.js';

const PORT = Number(process.env.API_PORT ?? process.env.PORT ?? 3000);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? '*';

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

  if (path === '/api/policy' && req.method === 'GET') {
    try {
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

  if (path === '/api/pay' && req.method === 'POST') {
    try {
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

  if (path === '/api/health' && req.method === 'GET') {
    send(res, 200, { status: 'ok', service: 'AgentPayGuard API' });
    return;
  }

  send(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`[AgentPayGuard API] http://localhost:${PORT}`);
  console.log('  GET  /api/health - 健康检查');
  console.log('  GET  /api/policy - 策略（白名单/限额）');
  console.log('  POST /api/pay    - 发起支付（body: recipient?, amount?, paymentMode?, executeOnchain?）');
});
