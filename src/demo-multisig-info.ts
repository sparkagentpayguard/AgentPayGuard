/**
 * 多签钱包信息查询工具
 * 用于现场演示前快速检查多签配置
 */
import { ethers } from 'ethers';
import { loadEnv } from './lib/config.js';

const MULTISIG = '0xa5Ec521A237Eb44F7713399f8ee26FA7F423D4e9';
const FREEZE = '0x2D274B8e53DEF4389a9590A7F6e323D3b8763189';

const MULTISIG_ABI = [
  'function getOwners() view returns (address[3])',
  'function REQUIRED() view returns (uint256)',
  'function transactionCount() view returns (uint256)',
  'function isOwner(address) view returns (bool)',
];

const FREEZE_ABI = [
  'function isFrozen(address) view returns (bool)',
  'function owner() view returns (address)',
];

async function main() {
  const env = loadEnv();
  const provider = new ethers.JsonRpcProvider(env.RPC_URL, env.CHAIN_ID);
  
  console.log('=== 🔍 多签钱包信息查询 ===\n');
  
  try {
    const multisig = new ethers.Contract(MULTISIG, MULTISIG_ABI, provider);
    
    // 查询基本信息
    const owners = await multisig.getOwners();
    const required = await multisig.REQUIRED();
    const txCount = await multisig.transactionCount();
    
    console.log('📋 多签合约信息:');
    console.log(`   地址: ${MULTISIG}`);
    console.log(`   阈值: ${required}/3`);
    console.log(`   提案总数: ${txCount}`);
    console.log('\n👥 Owners:');
    owners.forEach((addr: string, i: number) => {
      console.log(`   ${i + 1}. ${addr}`);
    });
    
    // 检查当前钱包是否是 owner（如果有 PRIVATE_KEY）
    if (env.PRIVATE_KEY) {
      const wallet = new ethers.Wallet(env.PRIVATE_KEY);
      const address = await wallet.getAddress();
      const isOwner = await multisig.isOwner(address);
      console.log(`\n🔑 当前钱包 (${address}):`, isOwner ? '✅ 是多签 Owner' : '❌ 不是多签 Owner');
    }
    
    // 查询冻结合约信息
    console.log('\n=== 🚫 冻结合约信息 ===\n');
    const freeze = new ethers.Contract(FREEZE, FREEZE_ABI, provider);
    const freezeOwner = await freeze.owner();
    const isControlledByMultisig = freezeOwner.toLowerCase() === MULTISIG.toLowerCase();
    
    console.log('📋 冻结合约信息:');
    console.log(`   地址: ${FREEZE}`);
    console.log(`   Owner: ${freezeOwner}`);
    console.log(`   是否由多签控制:`, isControlledByMultisig ? '✅ 是' : '❌ 否');
    
    if (!isControlledByMultisig) {
      console.log('\n⚠️  警告: 冻结合约的 Owner 不是多签地址！');
      console.log('   建议: 调用 freeze.transferOwnership(多签地址) 转移权限');
    }
    
    // 查询测试地址冻结状态
    const testAddress = '0xb89Ffb647Bc1D12eDcf7b0C13753300e17F2d6e9';
    const isFrozen = await freeze.isFrozen(testAddress);
    console.log(`\n🧪 测试地址冻结状态:`);
    console.log(`   地址: ${testAddress}`);
    console.log(`   状态:`, isFrozen ? '🔴 已冻结' : '🟢 未冻结');
    
    // 查询最新提案（如果有）
    if (Number(txCount) > 0) {
      console.log(`\n📝 最新提案信息:`);
      const latestTxId = Number(txCount) - 1;
      const txAbi = ['function getTransaction(uint256) view returns (address to, uint256 value, bytes data, bool executed, uint256 numConfirmations)'];
      const multisigWithTx = new ethers.Contract(MULTISIG, [...MULTISIG_ABI, ...txAbi], provider);
      const tx = await multisigWithTx.getTransaction(latestTxId);
      console.log(`   提案 ID: ${latestTxId}`);
      console.log(`   目标地址: ${tx.to}`);
      console.log(`   确认数: ${tx.numConfirmations}/${required}`);
      console.log(`   状态:`, tx.executed ? '✅ 已执行' : '⏳ 待执行');
    }
    
    console.log('\n=== ✅ 查询完成 ===\n');
    console.log('💡 提示:');
    console.log('   - 使用前端界面可以提交和确认提案');
    console.log('   - 访问 http://localhost:8080/freeze 查看冻结状态');
    console.log('   - 访问 http://localhost:8080/proposals 管理提案');
    
  } catch (error: any) {
    console.error('❌ 查询失败:', error.message);
    if (error.message.includes('network')) {
      console.error('   请检查 RPC_URL 配置和网络连接');
    }
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
