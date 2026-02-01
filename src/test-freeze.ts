import { ethers } from 'ethers';
import { loadEnv } from './lib/config.js';
import { evaluatePolicy } from './lib/policy.js';

async function main() {
  const env = loadEnv();
  const provider = new ethers.JsonRpcProvider(env.RPC_URL, env.CHAIN_ID);
  
  // 冻结合约地址（来自 Role A 交付）
  const FREEZE_CONTRACT = '0x2D274B8e53DEF4389a9590A7F6e323D3b8763189';
  
  // 测试目标：使用 Owner 2 地址（Role A 文档提到它可能被用于测试冻结）
  // 该地址在 Role A 的交付文档中标记为 "Owner 2"，并用于冻结演示
  const targetAddress = '0xb89Ffb647Bc1D12eDcf7b0C13753300e17F2d6e9'; 

  console.log('--- AgentPayGuard demo:freeze ---');
  console.log('network:', { rpc: env.RPC_URL, chainId: env.CHAIN_ID });
  console.log('contract:', FREEZE_CONTRACT);
  console.log('target:', targetAddress);

  const policy = {
    allowlist: [targetAddress], // 故意加到白名单，测试是否被链上拦截
    maxAmount: ethers.parseEther('100'),
  };

  try {
    const decision = await evaluatePolicy({
      policy,
      recipient: targetAddress,
      amount: ethers.parseEther('1'),
      provider,
      freezeContractAddress: FREEZE_CONTRACT
    });

    if (decision.ok) {
      console.log('[PASS] 地址未被冻结，允许支付。');
      console.log('注意：这说明该地址目前状态为 Unfrozen。如需测试拦截，请联系 Role A 冻结此地址。');
    } else {
      console.log('[REJECT] 拦截成功！');
      console.log(`[${decision.code}] ${decision.message}`);
      
      if (decision.code === 'RECIPIENT_FROZEN') {
        console.log('[SUCCESS] 链上冻结风控生效 ✅');
      }
    }
  } catch (error: any) {
    console.error('[ERROR] 检查过程发生错误:', error.message);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
