/**
 * AgentPayGuard API：供前端调用的支付与策略接口
 * 运行：pnpm server（需 .env 中 EXECUTE_ONCHAIN=1 或请求体 executeOnchain=true 才会真实发链上交易）
 * 启动时仅加载 dotenv+http，config/policy/run-pay 延后加载，避免进程立即退出。
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
  <li><a href="/api/policy">GET /api/policy</a> - 策略（白名单/限额）</li>
  <li>POST /api/pay - 发起支付（需用前端或 curl 调用）</li>
</ul>
</body></html>`);
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

server.on('error', (err: NodeJS.ErrnoException) => {
  console.error('[AgentPayGuard API] server error:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`端口 ${PORT} 已被占用，请更换 API_PORT 或关闭占用进程。`);
  }
  process.exit(1);
});
