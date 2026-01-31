/**
 * 可复用的支付执行逻辑（供 CLI demo-pay 与 API server 共用）
 */
import { ethers } from 'ethers';
import type { Env } from './config.js';
import { loadEnv } from './config.js';
import { getTokenDecimals, transferErc20 } from './erc20.js';
import { parseAllowlist, evaluatePolicy } from './policy.js';
import { addSpentToday, readSpentToday } from './state.js';
import { sendErc20ViaAA } from './kite-aa.js';

const FREEZE_CONTRACT = '0x3168a2307a3c272ea6CE2ab0EF1733CA493aa719';

export type RunPayOverrides = {
  recipient?: string;
  amount?: string;
  paymentMode?: 'eoa' | 'aa';
  executeOnchain?: boolean;
};

export type RunPayResult =
  | { ok: true; txHash: string; userOpHash?: string }
  | { ok: false; code: string; message: string };

export async function runPay(overrides: RunPayOverrides = {}): Promise<RunPayResult> {
  const env = loadEnv();
  const recipient = overrides.recipient ?? env.RECIPIENT;
  const amountStr = overrides.amount ?? env.AMOUNT;
  const paymentMode = overrides.paymentMode ?? env.PAYMENT_MODE;
  const executeOnchain = overrides.executeOnchain !== undefined ? overrides.executeOnchain : env.EXECUTE_ONCHAIN;

  const provider = new ethers.JsonRpcProvider(env.RPC_URL, env.CHAIN_ID);
  if ((executeOnchain || paymentMode === 'aa') && !env.PRIVATE_KEY) {
    return { ok: false, code: 'MISSING_PRIVATE_KEY', message: '需要签名私钥：请在 .env 中配置 PRIVATE_KEY' };
  }
  const wallet = env.PRIVATE_KEY ? new ethers.Wallet(env.PRIVATE_KEY, provider) : undefined;

  const decimals = env.TOKEN_DECIMALS ?? (await getTokenDecimals(provider, env.SETTLEMENT_TOKEN_ADDRESS));
  const amount = ethers.parseUnits(amountStr, decimals);

  const allowlist = parseAllowlist(env.ALLOWLIST);
  const policy = {
    allowlist: allowlist.length ? allowlist : undefined,
    maxAmount: env.MAX_AMOUNT ? ethers.parseUnits(env.MAX_AMOUNT, decimals) : undefined,
    dailyLimit: env.DAILY_LIMIT ? ethers.parseUnits(env.DAILY_LIMIT, decimals) : undefined
  };

  const spentToday = await readSpentToday(env.STATE_PATH);
  const decision = await evaluatePolicy({
    policy,
    recipient,
    amount,
    spentToday,
    provider,
    freezeContractAddress: FREEZE_CONTRACT
  });

  if (!decision.ok) {
    return { ok: false, code: decision.code, message: decision.message };
  }

  if (!executeOnchain) {
    return { ok: false, code: 'DRY_RUN', message: '通过策略校验，但未发送链上交易（executeOnchain 为 false）' };
  }

  if (paymentMode === 'aa') {
    if (!env.BUNDLER_URL) return { ok: false, code: 'MISSING_BUNDLER', message: 'PAYMENT_MODE=aa 时必须提供 BUNDLER_URL' };
    const { userOpHash, txHash, status } = await sendErc20ViaAA({
      rpcUrl: env.RPC_URL,
      bundlerUrl: env.BUNDLER_URL,
      ownerWallet: wallet!,
      token: env.SETTLEMENT_TOKEN_ADDRESS,
      to: recipient,
      amount,
      paymasterAddress: env.PAYMASTER_ADDRESS
    });
    if (status !== 'success') {
      return { ok: false, code: 'AA_FAILED', message: `AA 执行失败: ${status}` };
    }
    await addSpentToday(env.STATE_PATH, amount);
    return { ok: true, txHash: txHash ?? userOpHash, userOpHash };
  }

  const { txHash } = await transferErc20({
    token: env.SETTLEMENT_TOKEN_ADDRESS,
    signer: wallet!,
    to: recipient,
    amount
  });
  await addSpentToday(env.STATE_PATH, amount);
  return { ok: true, txHash };
}
