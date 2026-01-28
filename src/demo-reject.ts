import { ethers } from 'ethers';
import { loadEnv } from './lib/config.js';
import { getTokenDecimals } from './lib/erc20.js';
import { normalizeAddresses, evaluatePolicy } from './lib/policy.js';
import { readSpentToday } from './lib/state.js';

async function main() {
  const env = loadEnv();
  const provider = new ethers.JsonRpcProvider(env.RPC_URL, env.CHAIN_ID);

  const decimals = env.TOKEN_DECIMALS ?? (await getTokenDecimals(provider, env.SETTLEMENT_TOKEN_ADDRESS));

  // 故意触发：用一个非白名单地址（dead address）
  const badRecipient = ethers.getAddress('0x000000000000000000000000000000000000dEaD');

  // 如果你没配置 MAX_AMOUNT，这里也会用一个很大的 amount 触发（双保险）
  const normalAmount = ethers.parseUnits(env.AMOUNT, decimals);
  const hugeAmount = ethers.parseUnits('1000000', decimals);
  const amount = env.MAX_AMOUNT ? normalAmount : hugeAmount;

  const allowlist = normalizeAddresses(env.ALLOWLIST.split(',').filter(Boolean));
  const policy = {
    allowlist: allowlist.length ? allowlist : undefined,
    maxAmount: env.MAX_AMOUNT ? ethers.parseUnits(env.MAX_AMOUNT, decimals) : undefined,
    dailyLimit: env.DAILY_LIMIT ? ethers.parseUnits(env.DAILY_LIMIT, decimals) : undefined
  };

  const spentToday = await readSpentToday(env.STATE_PATH);
  const decision = evaluatePolicy({
    policy,
    recipient: badRecipient,
    amount,
    spentToday
  });

  console.log('--- AgentPayGuard demo:reject ---');
  console.log('recipient(bad):', badRecipient);
  console.log('amount:', amount.toString(), `(decimals=${decimals})`);
  console.log('policy:', {
    allowlist: policy.allowlist,
    maxAmount: policy.maxAmount?.toString(),
    dailyLimit: policy.dailyLimit?.toString(),
    spentToday: spentToday.toString()
  });

  if (decision.ok) {
    console.error('[UNEXPECTED] 策略居然通过了：请检查 ALLOWLIST/MAX_AMOUNT/DAILY_LIMIT 配置');
    process.exitCode = 3;
    return;
  }

  console.log('[EXPECTED_REJECT]', decision.code, decision.message);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

