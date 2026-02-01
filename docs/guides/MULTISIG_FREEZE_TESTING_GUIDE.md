# 🧪 多签钱包、冻结与提案现场测试指南

## 📋 配置合理性分析

### ✅ 当前配置评估

| 配置项 | 当前值 | 合理性 | 说明 |
|--------|--------|--------|------|
| **多签阈值** | 2/3 | ✅ 合理 | 平衡安全性和可用性，防止单点故障 |
| **Owner 数量** | 3个 | ✅ 合理 | 适合小型团队，便于管理 |
| **冻结合约所有权** | 多签控制 | ✅ 合理 | 确保冻结操作需要多数人同意 |
| **冻结检查时机** | 支付前检查 | ✅ 合理 | 执行前拦截，而非事后追责 |
| **提案流程** | 提交→确认→执行 | ✅ 合理 | 标准多签流程，支持撤销 |

### ⚠️ 潜在问题

1. **Owner 地址硬编码**：3个 owner 地址未在代码中明确，需要确认
2. **测试地址缺失**：`test-freeze.ts` 中使用的测试地址可能未实际冻结
3. **提案执行需要2个钱包**：现场演示需要至少2个多签 owner 钱包

---

## 🎯 现场测试方案

### 方案A：完整流程测试（推荐，需要2个多签钱包）

#### 前置准备

1. **确认多签 Owner 地址**
   ```bash
   # 在 KiteScan 查询多签合约
   # https://testnet.kitescan.ai/address/0xa5Ec521A237Eb44F7713399f8ee26FA7F423D4e9
   # 调用 getOwners() 查看3个owner地址
   ```

2. **准备2个多签 Owner 钱包**
   - Owner 1: 钱包A（MetaMask/其他）
   - Owner 2: 钱包B（MetaMask/其他）
   - 确保两个钱包都已连接到 Kite 测试网
   - 确保两个钱包都有少量 KITE 代币（用于 gas）

3. **准备测试地址**
   - 测试地址：任意一个地址（可以是白名单中的地址）
   - 目的：测试冻结后支付被拦截

---

### 测试步骤

#### Step 1: 查询当前冻结状态

**方式1：命令行测试**
```bash
pnpm demo:freeze
```

**方式2：前端界面**
1. 启动前端：`cd frontend && npm run dev`
2. 访问 `http://localhost:8080/freeze`
3. 输入测试地址，点击 "SCAN"
4. 查看状态：应该显示 "ACTIVE"（未冻结）

#### Step 2: 提交冻结提案（Owner 1）

**使用前端界面：**
1. 用 Owner 1 钱包连接前端
2. 在 Freeze 页面输入要冻结的地址
3. 点击 "SUBMIT FREEZE PROPOSAL"
4. 确认交易（这会调用 `submitAndConfirm()`，自动确认一次）
5. 记录交易哈希

**预期结果：**
- ✅ 提案创建成功
- ✅ 确认数量：1/2（Owner 1 已确认）
- ✅ 状态：Pending（等待第二个确认）

#### Step 3: 确认提案（Owner 2）

**使用前端界面：**
1. **切换钱包**：断开 Owner 1，连接 Owner 2 钱包
2. 访问 `http://localhost:8080/proposals`
3. 找到刚才创建的提案（ID 应该是最新的）
4. 点击 "CONFIRM" 按钮
5. 确认交易

**预期结果：**
- ✅ 确认数量：2/2（达到阈值）
- ✅ "EXECUTE" 按钮变为可用状态

#### Step 4: 执行提案（任意 Owner）

**使用前端界面：**
1. 在 Proposals 页面，找到达到阈值的提案
2. 点击 "EXECUTE" 按钮
3. 确认交易

**预期结果：**
- ✅ 提案状态变为 "EXECUTED"
- ✅ 链上冻结生效

#### Step 5: 验证冻结效果

**方式1：前端验证**
1. 回到 Freeze 页面
2. 输入刚才冻结的地址
3. 点击 "SCAN"
4. 应该显示 "FROZEN"（已冻结）

**方式2：命令行验证**
```bash
pnpm demo:freeze
# 如果测试地址被冻结，应该显示 [REJECT] 和 [RECIPIENT_FROZEN]
```

**方式3：尝试支付（验证拦截）**
```bash
# 修改 .env 中的 RECIPIENT 为被冻结的地址
RECIPIENT=0x被冻结的地址

# 尝试支付
pnpm demo:pay

# 预期：应该被拒绝，显示 "收款地址已被多签冻结"
```

#### Step 6: 解冻测试（可选）

1. 用 Owner 1 提交解冻提案
2. Owner 2 确认
3. 任意 Owner 执行
4. 验证地址恢复为 "ACTIVE"
5. 再次尝试支付，应该成功

---

### 方案B：简化测试（仅需1个多签钱包，但需要预先准备）

#### 前置准备

**提前准备一个已冻结的地址：**
1. 在演示前，用2个钱包完成一次冻结操作
2. 记录被冻结的地址
3. 演示时只展示查询和支付拦截效果

#### 演示步骤

1. **展示冻结状态查询**
   ```bash
   pnpm demo:freeze
   # 或使用前端界面查询已冻结地址
   ```

2. **展示支付拦截**
   ```bash
   # 设置被冻结地址为 RECIPIENT
   RECIPIENT=0x已冻结的地址
   pnpm demo:pay
   # 预期：显示 "收款地址已被多签冻结"
   ```

3. **展示前端界面**
   - Freeze 页面：显示冻结状态
   - Proposals 页面：显示历史提案
   - Dashboard：显示多签信息

---

## 🔍 快速诊断命令

### 查询多签信息

```bash
# 使用 cast（Foundry）或 ethers.js 脚本
# 查询 owners
cast call 0xa5Ec521A237Eb44F7713399f8ee26FA7F423D4e9 "getOwners()" --rpc-url https://rpc-testnet.gokite.ai/

# 查询阈值
cast call 0xa5Ec521A237Eb44F7713399f8ee26FA7F423D4e9 "REQUIRED()" --rpc-url https://rpc-testnet.gokite.ai/

# 查询提案数量
cast call 0xa5Ec521A237Eb44F7713399f8ee26FA7F423D4e9 "transactionCount()" --rpc-url https://rpc-testnet.gokite.ai/
```

### 查询冻结状态

```bash
# 查询地址是否被冻结
cast call 0x2D274B8e53DEF4389a9590A7F6e323D3b8763189 "isFrozen(address)" 0x目标地址 --rpc-url https://rpc-testnet.gokite.ai/

# 查询冻结合约 owner（应该是多签地址）
cast call 0x2D274B8e53DEF4389a9590A7F6e323D3b8763189 "owner()" --rpc-url https://rpc-testnet.gokite.ai/
```

---

## 📝 测试脚本增强版

创建一个更完整的测试脚本：

```typescript
// src/demo-multisig-test.ts
import { ethers } from 'ethers';
import { loadEnv } from './lib/config.js';

const MULTISIG = '0xa5Ec521A237Eb44F7713399f8ee26FA7F423D4e9';
const FREEZE = '0x2D274B8e53DEF4389a9590A7F6e323D3b8763189';

async function main() {
  const env = loadEnv();
  const provider = new ethers.JsonRpcProvider(env.RPC_URL, env.CHAIN_ID);
  
  console.log('=== 多签钱包信息查询 ===\n');
  
  // 查询 owners
  const multisigAbi = ['function getOwners() view returns (address[3])', 'function REQUIRED() view returns (uint256)'];
  const multisig = new ethers.Contract(MULTISIG, multisigAbi, provider);
  
  const owners = await multisig.getOwners();
  const required = await multisig.REQUIRED();
  
  console.log('多签地址:', MULTISIG);
  console.log('阈值:', `${required}/3`);
  console.log('Owners:');
  owners.forEach((addr: string, i: number) => {
    console.log(`  ${i + 1}. ${addr}`);
  });
  
  // 查询冻结状态
  console.log('\n=== 冻结状态查询 ===\n');
  const freezeAbi = ['function isFrozen(address) view returns (bool)', 'function owner() view returns (address)'];
  const freeze = new ethers.Contract(FREEZE, freezeAbi, provider);
  
  const freezeOwner = await freeze.owner();
  console.log('冻结合约地址:', FREEZE);
  console.log('冻结合约 Owner:', freezeOwner);
  console.log('是否由多签控制:', freezeOwner.toLowerCase() === MULTISIG.toLowerCase() ? '✅ 是' : '❌ 否');
  
  // 测试地址冻结状态
  const testAddress = '0xb89Ffb647Bc1D12eDcf7b0C13753300e17F2d6e9';
  const isFrozen = await freeze.isFrozen(testAddress);
  console.log(`\n测试地址 ${testAddress}:`, isFrozen ? '🔴 已冻结' : '🟢 未冻结');
}

main().catch(console.error);
```

---

## 🎬 现场演示最佳实践

### 演示前检查清单

- [ ] 确认多签合约已部署且可访问
- [ ] 确认冻结合约 owner 是多签地址
- [ ] 准备至少2个多签 owner 钱包（或提前冻结一个地址）
- [ ] 确保钱包有足够的 KITE 代币（gas）
- [ ] 测试网络连接稳定
- [ ] 准备备用方案（如果现场网络问题）

### 演示流程建议

1. **先展示查询功能**（无需交易）
   - 查询多签信息
   - 查询冻结状态
   - 展示前端界面

2. **再展示完整流程**（需要2个钱包）
   - 提交提案
   - 确认提案
   - 执行提案
   - 验证效果

3. **最后展示拦截效果**
   - 尝试向冻结地址支付
   - 展示被拒绝的结果

---

## ⚠️ 常见问题与解决方案

### Q1: 如何知道我的钱包是不是多签 owner？

**A:** 使用前端界面：
1. 连接钱包
2. 访问 Dashboard 页面
3. 查看 "Multi-Sig Wallet" 部分
4. 如果显示 "You are an owner" ✅，说明是 owner

**或使用命令行：**
```bash
# 创建查询脚本
cast call 0xa5Ec521A237Eb44F7713399f8ee26FA7F423D4e9 "isOwner(address)" 你的地址 --rpc-url https://rpc-testnet.gokite.ai/
```

### Q2: 提案提交后找不到？

**A:** 
- 检查是否在正确的网络（Kite Testnet）
- 刷新 Proposals 页面
- 检查交易是否成功（在 KiteScan 查看）

### Q3: 执行提案失败？

**A:** 检查：
- 确认数量是否达到 2/2
- 检查 gas 是否充足
- 检查目标地址是否正确
- 查看错误信息（可能是冻结合约调用失败）

### Q4: 如何快速测试（不需要2个钱包）？

**A:** 使用方案B：
- 提前准备一个已冻结的地址
- 演示时只展示查询和拦截效果
- 说明完整流程，但不现场执行

---

## 📊 配置优化建议

### 当前配置：✅ 合理

**优点：**
- 2/3 阈值平衡安全性和可用性
- 冻结检查在支付前执行（强一致性）
- 提案流程清晰，支持撤销

**可改进点：**
1. **添加环境变量配置**：将多签和冻结合约地址移到 `.env`
2. **添加 Owner 地址查询工具**：创建脚本快速查询 owners
3. **添加测试数据准备脚本**：自动创建测试提案

---

## 🚀 快速测试命令总结

```bash
# 1. 查询冻结状态
pnpm demo:freeze

# 2. 前端界面测试（需要启动前端）
cd frontend && npm run dev
# 访问 http://localhost:8080/freeze
# 访问 http://localhost:8080/proposals

# 3. 验证支付拦截（需要先冻结地址）
# 修改 .env: RECIPIENT=被冻结的地址
pnpm demo:pay
```

---

**最后更新**: 2026-02-01
