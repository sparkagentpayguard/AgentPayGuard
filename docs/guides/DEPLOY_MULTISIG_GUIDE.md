# 🚀 现场部署多签钱包指南

本指南介绍如何现场使用三个测试 owner 生成多签钱包和冻结合约。

---

## 📋 前置准备

### 1. 准备3个测试钱包地址

**方式A: 使用 MetaMask 生成（推荐）**
1. 打开 MetaMask，切换到 Kite Testnet
2. 创建3个新账户（或使用现有账户）
3. 记录每个账户的地址

**方式B: 使用命令行生成**
```bash
# 使用 ethers.js 生成（需要 Node.js）
node -e "const { ethers } = require('ethers'); for(let i=0; i<3; i++) { const w = ethers.Wallet.createRandom(); console.log(`Owner ${i+1}: ${w.address} | 私钥: ${w.privateKey}`); }"
```

**方式C: 使用 Foundry cast**
```bash
cast wallet new  # 运行3次，每次生成一个新钱包
```

### 2. 确保部署者钱包有 KITE 代币

部署者钱包需要支付 gas 费用，确保有足够的 KITE 代币（建议至少 0.1 KITE）。

---

## 🎯 部署方法

### 方法A: 使用 Foundry（推荐，最简单）

#### 步骤1: 安装 Foundry

```bash
# Linux/Mac
curl -L https://foundry.paradigm.xyz | bash
foundryup

# 验证安装
forge --version
cast --version
```

#### 步骤2: 初始化项目（如果未初始化）

```bash
# 在项目根目录
forge init --force --no-git
forge install OpenZeppelin/openzeppelin-contracts --no-commit
```

#### 步骤3: 设置环境变量

```bash
export RPC_URL=https://rpc-testnet.gokite.ai/
export CHAIN_ID=2368
export PRIVATE_KEY=0x你的部署者私钥
export OWNER1=0x第一个owner地址
export OWNER2=0x第二个owner地址
export OWNER3=0x第三个owner地址
```

#### 步骤4: 运行部署脚本

```bash
chmod +x scripts/deploy-with-foundry.sh
./scripts/deploy-with-foundry.sh
```

**或直接使用 forge 命令：**

```bash
# 1. 编译合约
forge build

# 2. 部署 SimpleMultiSig
forge create \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  contracts/SimpleMultiSig.sol:SimpleMultiSig \
  --constructor-args $OWNER1 $OWNER2 $OWNER3

# 记录返回的多签地址 MULTISIG_ADDRESS

# 3. 部署 SimpleFreeze
forge create \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  contracts/SimpleFreeze.sol:SimpleFreeze

# 记录返回的冻结地址 FREEZE_ADDRESS

# 4. 转移 Freeze 合约所有权给多签
cast send \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  $FREEZE_ADDRESS \
  "transferOwnership(address)" \
  $MULTISIG_ADDRESS
```

---

### 方法B: 使用 Remix IDE（无需本地安装）

#### 步骤1: 打开 Remix IDE

访问 https://remix.ethereum.org/

#### 步骤2: 创建合约文件

1. 在 Remix 中创建 `SimpleMultiSig.sol`
2. 复制 `contracts/SimpleMultiSig.sol` 的内容
3. 创建 `SimpleFreeze.sol`
4. 复制 `contracts/SimpleFreeze.sol` 的内容

#### 步骤3: 安装依赖

1. 在 Remix 文件浏览器中，右键点击 `contracts` 文件夹
2. 选择 "New Folder"，创建 `@openzeppelin`
3. 在 `@openzeppelin` 下创建 `contracts` 文件夹
4. 创建 `utils/cryptography/ECDSA.sol` 和 `utils/cryptography/MessageHashUtils.sol`
5. 从 OpenZeppelin GitHub 复制这些文件的内容

**或使用 Remix 的 GitHub 导入功能：**
- 在 Remix 中点击 "GitHub" 标签
- 输入: `OpenZeppelin/openzeppelin-contracts`
- 选择版本: `v5.0.0`

#### 步骤4: 编译合约

1. 切换到 "Solidity Compiler" 标签
2. 选择编译器版本: `0.8.20` (SimpleMultiSig) 或 `0.8.0` (SimpleFreeze)
3. 点击 "Compile SimpleMultiSig.sol"
4. 点击 "Compile SimpleFreeze.sol"

#### 步骤5: 部署合约

1. 切换到 "Deploy & Run Transactions" 标签
2. 选择环境: "Injected Provider - MetaMask"（连接到 Kite Testnet）
3. 选择账户: 部署者钱包
4. 部署 SimpleMultiSig:
   - 选择合约: `SimpleMultiSig`
   - 在构造函数参数中输入: `["0xowner1","0xowner2","0xowner3"]`（替换为实际地址）
   - 点击 "Deploy"
   - 记录部署的多签地址
5. 部署 SimpleFreeze:
   - 选择合约: `SimpleFreeze`
   - 点击 "Deploy"
   - 记录部署的冻结地址
6. 转移所有权:
   - 在已部署的 SimpleFreeze 合约下，找到 `transferOwnership` 函数
   - 输入多签地址
   - 点击 "transact"

---

### 方法C: 使用 TypeScript 脚本（需要编译合约）

#### 步骤1: 编译合约

使用 Foundry 或 Remix 编译合约，获取字节码。

#### 步骤2: 运行部署脚本

```bash
# 方式1: 环境变量
export MULTISIG_OWNERS=0xowner1,0xowner2,0xowner3
pnpm deploy:multisig

# 方式2: 命令行参数
pnpm deploy:multisig 0xowner1 0xowner2 0xowner3
```

**注意**: 此方法需要合约字节码，如果未编译会提示使用其他方法。

---

## ✅ 部署后验证

### 1. 查询多签信息

```bash
pnpm demo:multisig-info
```

或使用 cast:
```bash
cast call $MULTISIG_ADDRESS "getOwners()(address[3])" --rpc-url $RPC_URL
cast call $MULTISIG_ADDRESS "REQUIRED()(uint256)" --rpc-url $RPC_URL
```

### 2. 验证冻结合约所有权

```bash
cast call $FREEZE_ADDRESS "owner()(address)" --rpc-url $RPC_URL
# 应该返回多签地址
```

### 3. 更新配置文件

**更新 `.env`:**
```bash
MULTISIG_ADDRESS=0x新部署的多签地址
FREEZE_ADDRESS=0x新部署的冻结地址
```

**更新前端配置 (`frontend/src/lib/web3/config.ts`):**
```typescript
export const CONTRACTS = {
  MULTISIG: '0x新部署的多签地址' as const,
  FREEZE: '0x新部署的冻结地址' as const,
} as const;
```

---

## 🧪 测试部署的多签

### 1. 使用前端界面测试

1. 启动前端: `cd frontend && npm run dev`
2. 用其中一个 owner 钱包连接
3. 访问 `http://localhost:8080/freeze`
4. 提交冻结提案
5. 用另一个 owner 钱包确认
6. 执行提案

### 2. 使用命令行测试

```bash
# 查询多签信息
pnpm demo:multisig-info

# 查询冻结状态
pnpm demo:freeze
```

---

## ⚠️ 常见问题

### Q1: 部署失败，提示 "insufficient funds"

**A:** 部署者钱包余额不足，请充值 KITE 代币。

### Q2: 部署失败，提示 "invalid owner address"

**A:** 检查 owner 地址格式是否正确（0x开头，42字符），且不能为零地址或重复。

### Q3: 转移所有权失败

**A:** 
- 确认 Freeze 合约已成功部署
- 确认部署者钱包是 Freeze 合约的当前 owner
- 确认多签地址正确

### Q4: 如何确认部署成功？

**A:** 
1. 在 KiteScan 查询合约地址: https://testnet.kitescan.ai/address/合约地址
2. 运行 `pnpm demo:multisig-info` 验证
3. 尝试提交一个提案测试

---

## 📝 部署信息记录模板

部署完成后，记录以下信息：

```
=== 多签钱包部署信息 ===
部署时间: YYYY-MM-DD HH:MM:SS
网络: Kite Testnet (Chain ID: 2368)

多签合约:
  地址: 0x...
  阈值: 2/3
  Owners:
    1. 0x...
    2. 0x...
    3. 0x...

冻结合约:
  地址: 0x...
  Owner: 0x... (应该是多签地址)

部署者:
  地址: 0x...
  交易哈希:
    - SimpleMultiSig: 0x...
    - SimpleFreeze: 0x...
    - transferOwnership: 0x...

区块浏览器:
  多签: https://testnet.kitescan.ai/address/0x...
  冻结: https://testnet.kitescan.ai/address/0x...
```

---

## 🎬 现场演示建议

### 快速演示流程（5分钟）

1. **准备阶段（提前）**
   - 准备3个测试钱包
   - 确保部署者钱包有 KITE 代币

2. **部署阶段（现场）**
   - 使用 Foundry 脚本快速部署（1-2分钟）
   - 展示部署过程

3. **验证阶段（现场）**
   - 运行 `pnpm demo:multisig-info` 展示多签信息
   - 在 KiteScan 查看合约

4. **测试阶段（现场）**
   - 用前端界面提交提案
   - 展示多签确认和执行流程

---

**最后更新**: 2026-02-01
