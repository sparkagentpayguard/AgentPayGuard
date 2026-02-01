import { ethers } from 'ethers';
import { loadEnv } from './lib/config.js';
import { getTokenDecimals, transferErc20 } from './lib/erc20.js';
import { parseAllowlist, evaluatePolicy } from './lib/policy.js';
import { addSpentToday, readSpentToday } from './lib/state.js';
import { probeKiteAASdk, sendErc20ViaAA } from './lib/kite-aa.js';

async function main() {
  const env = loadEnv();

  if (env.PROBE_KITE_AA) {
    const { keys } = await probeKiteAASdk();
    console.log('[probe] gokite-aa-sdk exports:', keys);
  }

  const provider = new ethers.JsonRpcProvider(env.RPC_URL, env.CHAIN_ID);
  const needsSigner = env.EXECUTE_ONCHAIN || env.PAYMENT_MODE === 'aa';
  if (needsSigner && !env.PRIVATE_KEY) {
    throw new Error('需要签名私钥：请在 .env 中配置 PRIVATE_KEY（测试网）');
  }
  const wallet = env.PRIVATE_KEY ? new ethers.Wallet(env.PRIVATE_KEY, provider) : undefined;

  const decimals = env.TOKEN_DECIMALS ?? (await getTokenDecimals(provider, env.SETTLEMENT_TOKEN_ADDRESS));
  const amount = ethers.parseUnits(env.AMOUNT, decimals);

  const allowlist = parseAllowlist(env.ALLOWLIST);
  const policy = {
    allowlist: allowlist.length ? allowlist : undefined,
    maxAmount: env.MAX_AMOUNT ? ethers.parseUnits(env.MAX_AMOUNT, decimals) : undefined,
    dailyLimit: env.DAILY_LIMIT ? ethers.parseUnits(env.DAILY_LIMIT, decimals) : undefined
  };

  const spentToday = await readSpentToday(env.STATE_PATH);
  
  // Role B Integration: Check on-chain freeze status if available
  // Freeze contract address from Role A delivery
  const FREEZE_CONTRACT = '0x2D274B8e53DEF4389a9590A7F6e323D3b8763189'; 
  
  const decision = await evaluatePolicy({
    policy,
    recipient: env.RECIPIENT,
    amount,
    spentToday,
    provider,
    freezeContractAddress: FREEZE_CONTRACT
  });

  console.log('--- AgentPayGuard demo:pay ---');
  console.log('network:', { rpc: env.RPC_URL, chainId: env.CHAIN_ID });
  console.log('mode:', env.PAYMENT_MODE);
  console.log('token:', env.SETTLEMENT_TOKEN_ADDRESS);
  console.log('recipient:', env.RECIPIENT);
  console.log('amount:', env.AMOUNT, `(units=${amount.toString()}, decimals=${decimals})`);
  console.log('policy:', {
    allowlist: policy.allowlist,
    maxAmount: policy.maxAmount?.toString(),
    dailyLimit: policy.dailyLimit?.toString(),
    spentToday: spentToday.toString()
  });

  if (!decision.ok) {
    console.error('[REJECT]', decision.code, decision.message);
    process.exitCode = 2;
    return;
  }

  if (!env.EXECUTE_ONCHAIN) {
    console.log('[DRY_RUN] 通过策略校验，但未发送链上交易（把 EXECUTE_ONCHAIN=1 才会发送）');
    return;
  }

  if (env.PAYMENT_MODE === 'aa') {
    if (!env.BUNDLER_URL) throw new Error('PAYMENT_MODE=aa 时必须提供 BUNDLER_URL');
    const { userOpHash, status } = await sendErc20ViaAA({
      rpcUrl: env.RPC_URL,
      bundlerUrl: env.BUNDLER_URL,
      ownerWallet: wallet!,
      token: env.SETTLEMENT_TOKEN_ADDRESS,
      to: env.RECIPIENT,
      amount,
      paymasterAddress: env.PAYMASTER_ADDRESS
    });
    console.log('[AA] userOpHash:', userOpHash);
    console.log('[AA] status:', status);
  } else {
    const { txHash } = await transferErc20({
      token: env.SETTLEMENT_TOKEN_ADDRESS,
      signer: wallet!,
      to: env.RECIPIENT,
      amount
    });
    console.log('[EOA] txHash:', txHash);
    console.log('[tip] 把 txHash 填到 for_judge.md 的占位里。');
  }

  await addSpentToday(env.STATE_PATH, amount);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

