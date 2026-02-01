# 🔍 如何查询多签钱包的 Owner

本文档介绍查询多签钱包 owner 的多种方法。

---

## 方法1: 使用命令行工具（推荐，最简单）

### 快速查询

```bash
pnpm demo:multisig-info
```

**输出示例**：
```
=== 🔍 多签钱包信息查询 ===

📋 多签合约信息:
   地址: 0xa5Ec521A237Eb44F7713399f8ee26FA7F423D4e9
   阈值: 2/3
   提案总数: 5

👥 Owners:
   1. 0x1234567890123456789012345678901234567890
   2. 0xabcdefabcdefabcdefabcdefabcdefabcdefabcd
   3. 0x9876543210987654321098765432109876543210

🔑 当前钱包 (0x...): ✅ 是多签 Owner
```

### 代码实现

查看 `src/demo-multisig-info.ts`：

```typescript
const multisig = new ethers.Contract(MULTISIG, MULTISIG_ABI, provider);
const owners = await multisig.getOwners();
console.log('Owners:', owners);
```

---

## 方法2: 使用前端界面

### Dashboard 页面

1. 启动前端：`cd frontend && npm run dev`
2. 访问：http://localhost:5173/dashboard
3. 连接钱包（MetaMask）
4. 在 Dashboard 页面查看 "Multi-Sig Wallet" 面板
5. 查看 "Authorized Owners (On-Chain)" 部分

**显示内容**：
- 3 个 owner 地址
- 当前钱包是否是 owner（显示 "OWNER" 标签）
- 每个 owner 的区块浏览器链接

### 代码实现

前端使用 `useMultiSigOwners()` hook：

```typescript
// frontend/src/lib/web3/hooks.ts
export function useMultiSigOwners() {
  const { data: owners, isLoading, error } = useReadContract({
    address: CONTRACTS.MULTISIG,
    abi: simpleMultiSigAbi,
    functionName: 'getOwners',
  });
  return {
    owners: owners as readonly [`0x${string}`, `0x${string}`, `0x${string}`] | undefined,
    isLoading,
    error,
  };
}
```

---

## 方法3: 使用 Foundry cast（命令行）

### 安装 Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### 查询 owners

```bash
cast call \
  --rpc-url https://rpc-testnet.gokite.ai/ \
  0xa5Ec521A237Eb44F7713399f8ee26FA7F423D4e9 \
  "getOwners()(address[3])"
```

**输出示例**：
```
[0x1234567890123456789012345678901234567890, 0xabcdefabcdefabcdefabcdefabcdefabcdefabcd, 0x9876543210987654321098765432109876543210]
```

### 查询单个 owner

```bash
# 查询第 0 个 owner
cast call \
  --rpc-url https://rpc-testnet.gokite.ai/ \
  0xa5Ec521A237Eb44F7713399f8ee26FA7F423D4e9 \
  "owners(uint256)(address)" \
  0

# 查询第 1 个 owner
cast call \
  --rpc-url https://rpc-testnet.gokite.ai/ \
  0xa5Ec521A237Eb44F7713399f8ee26FA7F423D4e9 \
  "owners(uint256)(address)" \
  1

# 查询第 2 个 owner
cast call \
  --rpc-url https://rpc-testnet.gokite.ai/ \
  0xa5Ec521A237Eb44F7713399f8ee26FA7F423D4e9 \
  "owners(uint256)(address)" \
  2
```

### 检查地址是否是 owner

```bash
cast call \
  --rpc-url https://rpc-testnet.gokite.ai/ \
  0xa5Ec521A237Eb44F7713399f8ee26FA7F423D4e9 \
  "isOwner(address)(bool)" \
  0x你的地址
```

**输出**：`true` 或 `false`

---

## 方法4: 使用 ethers.js（Node.js/TypeScript）

### 基本查询

```typescript
import { ethers } from 'ethers';

const MULTISIG = '0xa5Ec521A237Eb44F7713399f8ee26FA7F423D4e9';
const RPC_URL = 'https://rpc-testnet.gokite.ai/';

const MULTISIG_ABI = [
  'function getOwners() view returns (address[3])',
  'function owners(uint256) view returns (address)',
  'function isOwner(address) view returns (bool)',
];

async function queryOwners() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const multisig = new ethers.Contract(MULTISIG, MULTISIG_ABI, provider);
  
  // 方法1: 获取所有 owners
  const owners = await multisig.getOwners();
  console.log('Owners:', owners);
  
  // 方法2: 逐个查询
  const owner0 = await multisig.owners(0);
  const owner1 = await multisig.owners(1);
  const owner2 = await multisig.owners(2);
  console.log('Owner 0:', owner0);
  console.log('Owner 1:', owner1);
  console.log('Owner 2:', owner2);
  
  // 检查地址是否是 owner
  const address = '0x你的地址';
  const isOwner = await multisig.isOwner(address);
  console.log(`Is ${address} an owner?`, isOwner);
}

queryOwners();
```

---

## 方法5: 使用区块浏览器（KiteScan）

### 在线查询

1. 访问：https://testnet.kitescan.ai/address/0xa5Ec521A237Eb44F7713399f8ee26FA7F423D4e9
2. 点击 "Contract" 标签
3. 在 "Read Contract" 部分找到 `getOwners` 函数
4. 点击 "Read" 按钮查看结果

**注意**：需要合约已验证源代码才能看到 Read Contract 功能。

---

## 方法6: 使用 viem（前端/后端）

### 前端示例（React）

```typescript
import { createPublicClient, http } from 'viem';
import { kiteTestnet } from './config';

const MULTISIG_ABI = [
  {
    name: 'getOwners',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address[3]' }],
  },
] as const;

const client = createPublicClient({
  chain: kiteTestnet,
  transport: http('https://rpc-testnet.gokite.ai/'),
});

async function getOwners() {
  const owners = await client.readContract({
    address: '0xa5Ec521A237Eb44F7713399f8ee26FA7F423D4e9',
    abi: MULTISIG_ABI,
    functionName: 'getOwners',
  });
  return owners;
}
```

---

## 📋 合约函数说明

### SimpleMultiSig.sol 中的相关函数

```solidity
// 获取所有 owners（返回数组）
function getOwners() public view returns (address[3] memory) {
    return owners;
}

// 获取单个 owner（通过索引）
address public owners[3];  // 公共变量，可以直接访问

// 检查地址是否是 owner
function isOwner(address _address) public view returns (bool) {
    for (uint256 i = 0; i < 3; i++) {
        if (owners[i] == _address) {
            return true;
        }
    }
    return false;
}
```

---

## 🎯 使用场景

### 场景1: 快速检查配置

```bash
# 使用命令行工具
pnpm demo:multisig-info
```

### 场景2: 前端显示

```typescript
// 在 React 组件中
const { owners, isLoading } = useMultiSigOwners();
if (owners) {
  owners.forEach((owner, i) => {
    console.log(`Owner ${i}: ${owner}`);
  });
}
```

### 场景3: 验证当前钱包是否是 owner

```typescript
// 前端
const { isOwner } = useIsMultiSigOwner();
console.log('Is current wallet an owner?', isOwner);

// 命令行
const wallet = new ethers.Wallet(PRIVATE_KEY);
const address = await wallet.getAddress();
const isOwner = await multisig.isOwner(address);
```

### 场景4: 脚本自动化

```typescript
// 在部署脚本或测试脚本中
const owners = await multisig.getOwners();
console.log('Multisig owners:', owners);
```

---

## ⚠️ 注意事项

1. **网络连接**：确保 RPC URL 正确且可访问
2. **合约地址**：确认多签合约地址正确
3. **网络匹配**：确保查询的网络与合约部署的网络一致（Kite Testnet）
4. **权限**：`getOwners()` 是 view 函数，任何人都可以调用，无需权限

---

## 🔗 相关资源

- 多签合约：`contracts/SimpleMultiSig.sol`
- 查询工具：`src/demo-multisig-info.ts`
- 前端 Hook：`frontend/src/lib/web3/hooks.ts` - `useMultiSigOwners()`
- 前端页面：`frontend/src/pages/Dashboard.tsx`

---

**最后更新**: 2026-02-01
