# Role A 指南：链上多签与权限冻结

> **📌 声明**：本指南仅为参考。Role A 可以选择使用任何支持多签和权限控制的合约方案（不限于本指南提及的工具）。关键是完成多签钱包部署和冻结操作，具体实现方式完全由你们决定。

本指南为 Role A (链上/多签负责人) 提供完整的部署、配置和演示步骤。

---

## 概览

### 目标

在 Kite 测试网上实现"权限控制"赛道要求：

1. **多签钱包部署** - 创建 2/3 或 3/5 多签，作为权限管理入口
2. **冻结操作演示** - 执行一笔"冻结"交易，暂停特定账户（AA account）的 ERC-20 转账能力
3. **链上证据收集** - 获得多签地址、冻结 Tx Hash，供 C 在 `for_judge.md` 中展示

### 赛道要求对应

| 赛道要求 | 实现方案 | 交付物 |
|---------|--------|-------|
| 权限控制 | 多签钱包 + 冻结合约 | 多签地址 + 冻结 Tx Hash |
| 高可信度 | 链上执行，可在 Kite 浏览器验证 | 交易 Hash 和链接 |
| 可复现 | 完整的部署和操作步骤 | 本指南 + 每一步的 Tx 链接 |

---

## 前置条件

### 1. 环境准备

```bash
# 确保有以下工具
node --version       # v20+
npm install -g hardhat  # 或 foundry
git --version
```

### 2. Kite 测试网资金

- 需要 2-3 个 Owner EOA 钱包（多签成员）
- 每个钱包需要 5+ KITE 代币（用于 gas）
- 获取方式：https://faucet.gokite.ai/

### 3. 选择多签方案

#### 方案 A：Gnosis Safe（推荐）
- 优点：成熟稳定，支持多个区块链
- 缺点：部署成本相对高
- Kite 支持：✅（确认最新版本）

#### 方案 B：自建多签合约
- 优点：完全控制，可优化成本
- 缺点：需要审计安全性
- 示例：参考 OpenZeppelin 的 `MultiSig` 合约模板

#### 方案 C：Ash Wallet（Kite 官方）
- 优点：原生支持，与 AA 无缝集成
- 缺点：文档可能较少
- 参考：查询 Kite 官方文档

**建议**：从 Gnosis Safe  开始，KITE官方推荐

---

## 部署步骤

### Step 1: 创建多签钱包

#### 使用 Gnosis Safe

1. **访问 Gnosis Safe UI（Kite 测试网）**
   ```
   https://app.safe.global/
   （选择 Kite 测试网）
   ```

2. **创建新 Safe**
   - 给 Safe 命名（例如："AgentPayGuard-MultiSig"）
   - 选择多签策略：例如 2/3（3 个成员中需要 2 个签名）
   - 添加成员地址：
     - Member 1: `0xAAAA...` (你的 EOA)
     - Member 2: `0xBBBB...` (队友 1 的 EOA)
     - Member 3: `0xCCCC...` (队友 2 的 EOA)

3. **部署（需要 gas）**
   - 审核参数无误
   - 点击"创建"，确认交易
   - 等待 1-2 分钟，得到 Safe 地址：`0xSAFE...`
   - **记录此地址**

**预期输出**：
```
✓ Safe created at: 0xSAFE1234567890ABCDEF...
✓ Members: 0xAAAA, 0xBBBB, 0xCCCC (threshold: 2/3)
✓ Status: Active
```

**验证**：
```bash
# 在 Kite 浏览器查询
# https://testnet.kite.ai/address/0xSAFE...
# 应该看到 Safe 合约代码和成员列表
```

---

### Step 2: 创建冻结合约（权限管理）

冻结操作需要一个合约来实现"暂停转账"的逻辑。

#### 选项 A：使用 OpenZeppelin 的 AccessControl + Pausable

创建文件 `contracts/TokenGuard.sol`：

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * Token Guard：由多签控制，可冻结特定账户的代币转账
 */
contract TokenGuard is Ownable {
    
    // 冻结列表
    mapping(address => bool) public frozen;
    
    // 事件
    event FrozenAccount(address indexed target, uint256 timestamp);
    event UnfrozenAccount(address indexed target, uint256 timestamp);
    
    // 构造函数：owner 设置为 Safe 多签地址
    constructor(address multiSigAddress) {
        transferOwnership(multiSigAddress);
    }
    
    /**
     * 冻结账户（仅多签可调用）
     */
    function freeze(address account) public onlyOwner {
        require(account != address(0), "Invalid account");
        frozen[account] = true;
        emit FrozenAccount(account, block.timestamp);
    }
    
    /**
     * 解冻账户
     */
    function unfreeze(address account) public onlyOwner {
        require(account != address(0), "Invalid account");
        frozen[account] = false;
        emit UnfrozenAccount(account, block.timestamp);
    }
    
    /**
     * 检查账户是否被冻结
     */
    function isFrozen(address account) public view returns (bool) {
        return frozen[account];
    }
}
```

#### 部署合约

使用 Hardhat：

```bash
# 安装依赖
npm install --save-dev hardhat @nomiclabs/hardhat-ethers ethers

# 编写部署脚本 scripts/deployTokenGuard.js
cat > scripts/deployTokenGuard.js << 'EOF'
async function main() {
  const multiSigAddress = "0xSAFE..."; // 替换为你的 Safe 地址
  
  const TokenGuard = await ethers.getContractFactory("TokenGuard");
  const guard = await TokenGuard.deploy(multiSigAddress);
  await guard.deployed();
  
  console.log("TokenGuard deployed at:", guard.address);
}

main().catch(console.error);
EOF

# 部署到 Kite 测试网
npx hardhat run scripts/deployTokenGuard.js --network kiteTestnet
```

**预期输出**：
```
TokenGuard deployed at: 0xGUARD1234567890ABCDEF...
```

**记录此地址**：`0xGUARD...`

---

### Step 3: 执行冻结操作（多签交易）

现在从多签钱包向 TokenGuard 发送"冻结"交易。

#### 在 Gnosis Safe UI 中

1. **进入 Safe 钱包**
   ```
   https://app.safe.global/ (选择你的 Safe)
   ```

2. **创建新交易**
   - 点击"New Transaction" → "Contract Interaction"
   - 填入 TokenGuard 合约地址：`0xGUARD...`
   - 选择方法：`freeze(address account)`
   - 参数：输入要冻结的账户地址（例如 Role B 的 AA 账户）
     ```
     account: 0xAA1234567890ABCDEF... (这是 Role B 的 AA 账户)
     ```

3. **审核交易**
   - 检查目标合约、方法、参数无误
   - 点击"Review Transaction"

4. **多签批准**
   - Member 1（你）：签名并提交
   - Member 2：签名（现在达到 2/3，交易执行）
   - 等待 1-2 分钟，交易确认

**预期输出**：
```
✓ Transaction Hash: 0xFREEZE1234567890ABCDEF...
✓ Status: Confirmed in block 12345
✓ Method: freeze(0xAA1234...)
✓ Events:
  - FrozenAccount(0xAA1234..., 1706520000)
```

**记录此 Tx Hash**：`0xFREEZE...` ← **这是交付给 C 的冻结 Tx Hash**

---

## 验证步骤

### 验证 1：多签钱包

在 Kite 浏览器中检查：

```bash
# URL: https://testnet.kite.ai/address/0xSAFE...
# 检查：
# - 合约代码是否显示为 MultiSig/Safe
# - 成员列表和阈值是否正确
# - 交易历史中是否显示了冻结交易
```

**预期**：
- ✅ 合约类型：MultiSigWallet（或 Safe）
- ✅ Members: 3, Threshold: 2
- ✅ 最新交易：0xFREEZE... (freeze 方法)

### 验证 2：冻结合约

在 Kite 浏览器中检查：

```bash
# URL: https://testnet.kite.ai/address/0xGUARD...
# 检查：
# - 合约是否部署成功
# - 是否有 frozen 映射的状态变化
```

**预期**：
- ✅ 合约类型：TokenGuard
- ✅ Owner: 0xSAFE... (多签地址)
- ✅ isFrozen(0xAA...) 返回 true

### 验证 3：冻结状态

```bash
# 调用合约的 read 方法
# isFrozen(0xAA1234...)
# 应该返回 true
```

---

## 解冻操作（可选演示）

如果要演示"风险恢复"，执行解冻：

1. **在 Safe 中创建新交易**
   - 方法：`unfreeze(address account)`
   - 参数：`0xAA1234...`

2. **多签批准** → 执行

3. **记录解冻 Tx Hash**：`0xUNFREEZE...`

**预期输出**：
```
✓ Transaction Hash: 0xUNFREEZE1234567890ABCDEF...
✓ Events:
  - UnfrozenAccount(0xAA1234..., 1706520100)
✓ isFrozen(0xAA...) 返回 false
```

---

## 交付清单

完成上述步骤后，向 C 和 B 提供以下内容：

### 交付给 C（for_judge.md）

- [ ] **多签钱包地址**：`0xSAFE...`
- [ ] **冻结 Tx Hash**：`0xFREEZE...`
- [ ] **Kite 浏览器链接**（冻结交易）：
  ```
  https://testnet.kite.ai/tx/0xFREEZE...
  ```
- [ ] **多签成员清单**（截图或表格）：
  ```
  | # | Address | Alias |
  |---|---------|-------|
  | 1 | 0xAAAA... | Member A |
  | 2 | 0xBBBB... | Member B |
  | 3 | 0xCCCC... | Member C |
  
  Threshold: 2/3
  ```

### 交付给 B（可选集成）

- [ ] **TokenGuard 合约地址**：`0xGUARD...`
- [ ] **冻结函数签名**：`freeze(address account)`
- [ ] **合约 ABI**（JSON 格式，供 B 集成）

### 交付给 D（PPT/视频）

- [ ] **架构图**：多签钱包 → TokenGuard → 冻结 AA 账户的流程
- [ ] **演示脚本**：
  ```
  1. 展示多签钱包和成员列表
  2. 创建冻结交易（展示参数）
  3. 多签批准过程（2/3 确认）
  4. 交易确认后验证 isFrozen 状态
  5. （可选）执行解冻和恢复
  ```

---

## 常见问题

### Q1：Gas 费用太高怎么办？

**A**：
- Kite 测试网 gas 相对较低（和以太坊测试网相近）
- 如果超出预算，可以优化合约（减少存储操作）
- 或者考虑使用 Gnosis Safe 而不是自建（Safe 已经过充分优化）

### Q2：多签成员不在线怎么办？

**A**：
- Gnosis Safe 支持"离线签名"：
  - Member 1 创建交易并签名（导出签名）
  - 将签名文件发给 Member 2
  - Member 2 导入签名并再次签名
  - 交易达到阈值后执行（可以由任何人发送）
- 这样不需要所有成员同时在线

### Q3：冻结后如何解冻？

**A**：
- 执行 `unfreeze(address account)` 方法
- 同样需要多签批准
- 会生成新的 Tx Hash（供演示"风险恢复"用）

### Q4：能否冻结其他 Token 而不是 USDC？

**A**：
- 可以，TokenGuard 的 `frozen` 映射是通用的
- 如果要针对特定 Token 冻结，修改合约逻辑
- 当前设计是"冻结账户的所有交易"，更简单通用

---

## 参考链接

- [Gnosis Safe 官方文档](https://docs.safe.global/)
- [Kite 官方文档](https://docs.gokite.ai/)
- [OpenZeppelin 合约库](https://docs.openzeppelin.com/)
- [Kite 浏览器](https://testnet.kite.ai/)
- [Hardhat 文档](https://hardhat.org/)

---

## 工作日志集成

完成后，请通知 Agent 更新 [AGENT_WORKLOG.md](AGENT_WORKLOG.md)：

```
Phase 13: Role A 多签部署与冻结操作

**完成**：
- [ ] Gnosis Safe 多签创建
- [ ] TokenGuard 合约部署
- [ ] 冻结交易执行
- [ ] 解冻操作（可选）

**交付**：
- 多签地址：0xSAFE...
- 冻结 Tx Hash：0xFREEZE...
- 冻结 Tx 浏览器链接
```

---

**指南版本**：1.0
**最后更新**：2026-01-30
**作者**：AI Assistant (Copilot)
