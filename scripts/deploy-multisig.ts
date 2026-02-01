/**
 * 现场部署多签钱包和冻结合约脚本
 * 
 * 使用方法：
 * 1. 准备3个测试钱包地址（可以是任意地址，包括 MetaMask 生成的）
 * 2. 设置环境变量或直接修改脚本中的 OWNERS 数组
 * 3. 运行: pnpm deploy:multisig
 * 
 * 注意：
 * - 部署者需要有足够的 KITE 代币支付 gas
 * - 部署后会自动将 Freeze 合约的 owner 转移给多签地址
 */

import { ethers } from 'ethers';
import { loadEnv } from '../src/lib/config.js';
import * as fs from 'fs';
import * as path from 'path';

// 合约 ABI（简化版，仅用于部署）
const SIMPLE_MULTISIG_ABI = [
  'constructor(address[3] _owners)',
  'function getOwners() view returns (address[3])',
  'function REQUIRED() view returns (uint256)',
  'function isOwner(address) view returns (bool)',
];

const SIMPLE_FREEZE_ABI = [
  'constructor()',
  'function owner() view returns (address)',
  'function transferOwnership(address)',
  'function isFrozen(address) view returns (bool)',
];

// 合约字节码（需要先编译）
// 如果使用 Foundry，运行: forge build
// 然后从 artifacts 目录读取字节码
async function getContractBytecode(contractName: string): Promise<string> {
  // 尝试从 Foundry artifacts 读取
  const foundryPath = path.join(process.cwd(), 'out', contractName, `${contractName}.sol`, `${contractName}.json`);
  if (fs.existsSync(foundryPath)) {
    const artifact = JSON.parse(fs.readFileSync(foundryPath, 'utf-8'));
    return artifact.bytecode.object;
  }
  
  // 如果找不到，提示用户编译
  throw new Error(
    `未找到合约字节码。请先编译合约：\n` +
    `  1. 安装 Foundry: curl -L https://foundry.paradigm.xyz | bash && foundryup\n` +
    `  2. 编译合约: forge build\n` +
    `  3. 或使用 Remix IDE 编译后复制字节码`
  );
}

async function main() {
  const env = loadEnv();
  const provider = new ethers.JsonRpcProvider(env.RPC_URL, env.CHAIN_ID);
  
  // 检查私钥
  if (!env.PRIVATE_KEY) {
    throw new Error('请设置 PRIVATE_KEY 环境变量（部署者钱包私钥）');
  }
  
  const deployer = new ethers.Wallet(env.PRIVATE_KEY, provider);
  const deployerAddress = await deployer.getAddress();
  
  console.log('=== 🚀 部署多签钱包和冻结合约 ===\n');
  console.log('网络:', { rpc: env.RPC_URL, chainId: env.CHAIN_ID });
  console.log('部署者:', deployerAddress);
  
  // 检查余额
  const balance = await provider.getBalance(deployerAddress);
  console.log('余额:', ethers.formatEther(balance), 'ETH/KITE');
  if (balance === 0n) {
    console.warn('⚠️  警告: 余额为 0，请先充值 KITE 代币用于支付 gas');
  }
  
  // 获取3个 owner 地址
  // 方式1: 从环境变量读取
  const ownersFromEnv = process.env.MULTISIG_OWNERS?.split(',').map(addr => addr.trim()).filter(Boolean);
  
  // 方式2: 从命令行参数读取
  const ownersFromArgs = process.argv.slice(2).filter(arg => arg.startsWith('0x') && arg.length === 42);
  
  // 方式3: 使用默认测试地址（需要用户替换）
  const defaultOwners = [
    '0x0000000000000000000000000000000000000001',
    '0x0000000000000000000000000000000000000002',
    '0x0000000000000000000000000000000000000003',
  ];
  
  let owners: string[] = ownersFromEnv || ownersFromArgs || [];
  
  if (owners.length === 0) {
    console.log('\n📝 未提供 owner 地址，请选择：');
    console.log('  方式1: 设置环境变量 MULTISIG_OWNERS=0xaddr1,0xaddr2,0xaddr3');
    console.log('  方式2: 命令行参数: pnpm deploy:multisig 0xaddr1 0xaddr2 0xaddr3');
    console.log('  方式3: 使用默认地址（需要替换）');
    console.log('\n⚠️  使用默认地址将导致部署失败（地址无效）');
    console.log('   请至少提供一个有效的 owner 地址\n');
    
    // 交互式输入（简化版，实际使用时建议用 readline）
    owners = defaultOwners;
  }
  
  // 验证地址
  if (owners.length !== 3) {
    throw new Error(`需要3个 owner 地址，当前提供 ${owners.length} 个`);
  }
  
  for (let i = 0; i < owners.length; i++) {
    if (!ethers.isAddress(owners[i])) {
      throw new Error(`第 ${i + 1} 个地址无效: ${owners[i]}`);
    }
    if (owners[i] === '0x0000000000000000000000000000000000000000') {
      throw new Error(`第 ${i + 1} 个地址为零地址`);
    }
  }
  
  // 检查重复
  const uniqueOwners = new Set(owners.map(addr => addr.toLowerCase()));
  if (uniqueOwners.size !== 3) {
    throw new Error('Owner 地址不能重复');
  }
  
  console.log('\n👥 Owner 地址:');
  owners.forEach((addr, i) => {
    console.log(`  ${i + 1}. ${addr}`);
  });
  
  // 检查是否包含部署者
  const deployerIsOwner = owners.some(addr => addr.toLowerCase() === deployerAddress.toLowerCase());
  if (!deployerIsOwner) {
    console.warn('\n⚠️  警告: 部署者不是 owner 之一，部署后无法直接操作多签');
  }
  
  try {
    // 1. 部署 SimpleMultiSig
    console.log('\n📦 步骤 1/3: 部署 SimpleMultiSig 合约...');
    
    let multisigBytecode: string;
    let multisigAbi: any[];
    
    try {
      multisigBytecode = await getContractBytecode('SimpleMultiSig');
      multisigAbi = SIMPLE_MULTISIG_ABI;
    } catch (error: any) {
      console.error('\n❌ 无法读取合约字节码:', error.message);
      console.log('\n💡 解决方案：');
      console.log('  方案A: 使用 Remix IDE 编译后手动部署');
      console.log('    1. 访问 https://remix.ethereum.org/');
      console.log('    2. 创建文件 SimpleMultiSig.sol，复制 contracts/SimpleMultiSig.sol 内容');
      console.log('    3. 安装 @openzeppelin/contracts 依赖');
      console.log('    4. 编译后复制字节码和 ABI');
      console.log('    5. 使用 Remix 的部署功能部署');
      console.log('\n  方案B: 使用 Foundry（推荐）');
      console.log('    1. 安装: curl -L https://foundry.paradigm.xyz | bash && foundryup');
      console.log('    2. 初始化: forge init --force');
      console.log('    3. 安装依赖: forge install OpenZeppelin/openzeppelin-contracts');
      console.log('    4. 编译: forge build');
      console.log('    5. 运行: ./scripts/deploy-with-foundry.sh 0xowner1 0xowner2 0xowner3');
      throw error;
    }
    
    const multisigFactory = new ethers.ContractFactory(multisigAbi, multisigBytecode, deployer);
    const ownersArray = owners as [string, string, string];
    const multisig = await multisigFactory.deploy(ownersArray);
    await multisig.waitForDeployment();
    const multisigAddress = await multisig.getAddress();
    
    console.log('✅ SimpleMultiSig 部署成功!');
    console.log('   地址:', multisigAddress);
    console.log('   交易哈希:', multisig.deploymentTransaction()?.hash);
    
    // 验证部署
    const deployedOwners = await multisig.getOwners();
    const required = await multisig.REQUIRED();
    console.log('   阈值:', `${required}/3`);
    console.log('   Owners:', deployedOwners);
    
    // 2. 部署 SimpleFreeze
    console.log('\n📦 步骤 2/3: 部署 SimpleFreeze 合约...');
    
    let freezeBytecode: string;
    let freezeAbi: any[];
    
    try {
      freezeBytecode = await getContractBytecode('SimpleFreeze');
      freezeAbi = SIMPLE_FREEZE_ABI;
    } catch (error: any) {
      console.error('\n❌ 无法读取合约字节码:', error.message);
      throw error;
    }
    
    const freezeFactory = new ethers.ContractFactory(freezeAbi, freezeBytecode, deployer);
    const freeze = await freezeFactory.deploy();
    await freeze.waitForDeployment();
    const freezeAddress = await freeze.getAddress();
    
    console.log('✅ SimpleFreeze 部署成功!');
    console.log('   地址:', freezeAddress);
    console.log('   交易哈希:', freeze.deploymentTransaction()?.hash);
    
    // 验证部署
    const freezeOwner = await freeze.owner();
    console.log('   当前 Owner:', freezeOwner);
    console.log('   应该是部署者:', freezeOwner.toLowerCase() === deployerAddress.toLowerCase() ? '✅' : '❌');
    
    // 3. 转移 Freeze 合约所有权给多签
    console.log('\n📦 步骤 3/3: 转移 Freeze 合约所有权给多签...');
    
    const freezeContract = new ethers.Contract(freezeAddress, freezeAbi, deployer);
    const transferTx = await freezeContract.transferOwnership(multisigAddress);
    await transferTx.wait();
    
    console.log('✅ 所有权转移成功!');
    console.log('   交易哈希:', transferTx.hash);
    
    // 验证转移
    const newOwner = await freezeContract.owner();
    console.log('   新 Owner:', newOwner);
    console.log('   是否是多签地址:', newOwner.toLowerCase() === multisigAddress.toLowerCase() ? '✅' : '❌');
    
    // 输出总结
    console.log('\n=== ✅ 部署完成 ===\n');
    console.log('📋 部署信息:');
    console.log(`   多签地址: ${multisigAddress}`);
    console.log(`   冻结合约: ${freezeAddress}`);
    console.log(`   阈值: 2/3`);
    console.log(`   Owners:`);
    owners.forEach((addr, i) => {
      console.log(`     ${i + 1}. ${addr}`);
    });
    
    console.log('\n📝 下一步操作:');
    console.log('  1. 更新 .env 文件:');
    console.log(`     MULTISIG_ADDRESS=${multisigAddress}`);
    console.log(`     FREEZE_ADDRESS=${freezeAddress}`);
    console.log('  2. 更新前端配置 (frontend/src/lib/web3/config.ts)');
    console.log('  3. 使用多签 owner 钱包测试冻结功能');
    console.log('  4. 运行: pnpm demo:multisig-info 验证部署');
    
    console.log('\n🔗 区块浏览器链接:');
    const explorerUrl = `https://testnet.kitescan.ai`;
    console.log(`   多签: ${explorerUrl}/address/${multisigAddress}`);
    console.log(`   冻结: ${explorerUrl}/address/${freezeAddress}`);
    
  } catch (error: any) {
    console.error('\n❌ 部署失败:', error.message);
    if (error.transaction) {
      console.error('   交易哈希:', error.transaction.hash);
    }
    if (error.reason) {
      console.error('   原因:', error.reason);
    }
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
