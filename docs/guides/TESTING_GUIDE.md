# Role B 测试指南

本指南提供了完整的 AgentPayGuard Role B (后端 / AA 集成) 功能测试步骤。

---

## 前置条件

### 1. 环境检查

```bash
# 检查 Node.js 和 pnpm
node --version  # v20+
pnpm --version  # v9+

# 检查代码编译
pnpm typecheck  # 应该输出 0 errors
```

### 2. Kite 测试网络钱包准备

需要一个 Kite 测试网络的钱包，包含：
- **Owner EOA**: 拥有私钥，用于签署 UserOperation
- **测试资金**: 足够的测试 USDC (0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63)
  - 建议最少 10 USDC 用于多次测试

**获取测试资金**:
```bash
# 访问 Kite 测试网水龙头
# https://faucet.gokite.ai/ (需确认最新地址)
# 请求 10-20 USDC 到你的 Owner EOA 地址
```

### 3. 创建配置文件

复制模板并填入真实私钥:

```bash
cp .env.example .env
```

编辑 `.env`:

```env
# Kite 测试网配置
KITE_RPC_URL=https://rpc-testnet.gokite.ai/
KITE_BUNDLER_URL=https://bundler-service.staging.gokite.ai/rpc/
KITE_SETTLEMENT_TOKEN=0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63

# Owner EOA 私钥（从钱包导出，带或不带 0x 前缀均可）
OWNER_PRIVATE_KEY=your_private_key_here

# 支付模式：eoa (直接转账) 或 aa (UserOperation)
PAYMENT_MODE=eoa

# 执行开关：0 (干运行) 或 1 (真实链上执行)
EXECUTE_ONCHAIN=0

# Paymaster 地址（可选，测试时使用默认）
# PAYMASTER_ADDRESS=0x...
```

**⚠️ 安全提醒**: 
- `.env` 不要提交到 Git
- 权限设置: `chmod 600 .env`
- 不要分享 `OWNER_PRIVATE_KEY`

---

## 测试场景

### 场景 1: 干运行 (Dry Run) - EOA 支付

不修改区块链状态，验证逻辑。

```bash
# 保持默认配置
PAYMENT_MODE=eoa EXECUTE_ONCHAIN=0 pnpm demo:pay
```

**预期输出**:
```
[CONFIG_LOADED] ✓ Environment variables validated
[PAYMENT_CONFIG] Mode: eoa | OnChain: false (DRY_RUN)
[POLICY_VALIDATION] ✓ Recipient 0x... is in allowlist
[POLICY_VALIDATION] ✓ Amount 100 <= limit 1000
[POLICY_VALIDATION] ✓ Within valid period
[DRY_RUN] Would transfer 100 to 0x... via EOA
[DEMO_RESULT] ✓ Demo completed successfully
```

**检查项**:
- ✓ 配置加载无误
- ✓ 策略验证通过
- ✓ 未产生链上交易

---

### 场景 2: 干运行 (Dry Run) - AA 支付

验证 UserOperation 构建流程。

```bash
PAYMENT_MODE=aa EXECUTE_ONCHAIN=0 pnpm demo:pay
```

**预期输出**:
```
[CONFIG_LOADED] ✓ Environment variables validated
[PAYMENT_CONFIG] Mode: aa | OnChain: false (DRY_RUN)
[AA_FLOW] Initializing GokiteAASDK...
[AA_FLOW] ✓ SDK initialized
[AA_FLOW] Owner address: 0x...
[AA_FLOW] AA account address: 0x...
[POLICY_VALIDATION] ✓ Recipient 0x... is in allowlist
[POLICY_VALIDATION] ✓ Amount 100 <= limit 1000
[POLICY_VALIDATION] ✓ Within valid period
[AA_DRY_RUN] Would create and send UserOperation
[AA_DRY_RUN] UserOp Structure:
  - target: 0x0fF539... (USDC token)
  - callData: 0xa9... (transfer function)
  - nonce: 0
[DEMO_RESULT] ✓ Demo completed successfully
```

**检查项**:
- ✓ AA 账户地址正确派生
- ✓ UserOperation 数据结构完整
- ✓ 未向区块链发送任何内容

---

### 场景 3: 真实 EOA 支付 (链上执行)

实际转账测试。

```bash
PAYMENT_MODE=eoa EXECUTE_ONCHAIN=1 pnpm demo:pay
```

**预期输出**:
```
[CONFIG_LOADED] ✓ Environment variables validated
[PAYMENT_CONFIG] Mode: eoa | OnChain: true (REAL_EXECUTION)
[POLICY_VALIDATION] ✓ Recipient 0x... is in allowlist
[POLICY_VALIDATION] ✓ Amount 100 <= limit 1000
[POLICY_VALIDATION] ✓ Within valid period
[EOA_TX] Sending transaction to recipient...
[EOA_TX] Transaction hash: 0x5a8c9e2d7f4b1a3c8e6d9f2b4a7c1e3d5f8a2b4c6d8e9f1a3b5c7d9e1f3a5
[EOA_TX] ✓ Waiting for confirmation...
[EOA_TX] ✓ Transaction confirmed in block 12345
[DEMO_RESULT] ✓ Payment executed successfully
  - From: 0x... (your wallet)
  - To: 0x... (recipient)
  - Amount: 100 USDC
  - Status: confirmed
```

**检查项**:
- ✓ 获得真实 Tx Hash（以 0x 开头，64 个字符）
- ✓ 交易在 Kite 浏览器中可查
- ✓ 收款地址收到 100 USDC

**记录 Tx Hash**:
```bash
# 复制 Tx Hash（例如: 0x5a8c9e2d...）
# 更新 for_judge.md 第 "Role B - EOA Payment" 行
```

---

### 场景 4: 真实 AA 支付 (链上执行)

通过 ERC-4337 UserOperation 支付。

```bash
PAYMENT_MODE=aa EXECUTE_ONCHAIN=1 pnpm demo:pay
```

**预期输出**:
```
[CONFIG_LOADED] ✓ Environment variables validated
[PAYMENT_CONFIG] Mode: aa | OnChain: true (REAL_EXECUTION)
[AA_FLOW] Initializing GokiteAASDK...
[AA_FLOW] ✓ SDK initialized
[AA_FLOW] Owner address: 0x...
[AA_FLOW] AA account address: 0x...
[POLICY_VALIDATION] ✓ Recipient 0x... is in allowlist
[POLICY_VALIDATION] ✓ Amount 100 <= limit 1000
[POLICY_VALIDATION] ✓ Within valid period
[AA_TX] Sending UserOperation...
[AA_TX] UserOp Hash: 0x... (会发送给 Bundler)
[AA_TX] Waiting for bundler confirmation (max 120 sec)...
[AA_TX] ✓ Bundler accepted UserOp
[AA_TX] ✓ Waiting for settlement transaction...
[AA_TX] Settlement Tx Hash: 0xAABBCCDDEEFF...
[AA_TX] ✓ Transaction confirmed in block 12346
[DEMO_RESULT] ✓ Payment executed successfully
  - UserOp Hash: 0x...
  - Settlement Tx: 0xAABBCCDDEEFF...
  - From AA Account: 0x...
  - To: 0x... (recipient)
  - Amount: 100 USDC
  - Status: confirmed
```

**检查项**:
- ✓ 获得 UserOp Hash 和最终 Tx Hash
- ✓ 交易通过 Bundler 服务处理
- ✓ 收款地址收到 100 USDC
- ✓ AA 账户作为发送方

**记录 Tx Hash**:
```bash
# 复制最终的 Settlement Tx Hash
# 更新 for_judge.md 第 "Role B - AA Payment" 行
```

---

### 场景 5: 政策拒绝 - 非白名单收款方

验证白名单强制。

```bash
# 直接运行拒绝演示
pnpm demo:reject
```

**预期输出**:
```
[CONFIG_LOADED] ✓ Environment variables validated
[POLICY_TEST] Testing rejection scenario...
[POLICY_VALIDATION] ✗ Recipient 0xBADBADBADBAD... NOT in allowlist
[EXPECTED_REJECT] NOT_IN_ALLOWLIST
[DEMO_RESULT] ✓ Demo completed (rejection verified)
```

**检查项**:
- ✓ 拒绝原因为 NOT_IN_ALLOWLIST
- ✓ 未产生任何链上交易
- ✓ 白名单策略生效

---

## 测试结果矩阵

| 场景 | 命令 | 目标 | 预期结果 | 状态 |
|------|------|------|---------|------|
| 1. 干运行-EOA | `PAYMENT_MODE=eoa EXECUTE_ONCHAIN=0 pnpm demo:pay` | 验证逻辑 | DRY_RUN 输出，无链上交易 | ⏳ 待执行 |
| 2. 干运行-AA | `PAYMENT_MODE=aa EXECUTE_ONCHAIN=0 pnpm demo:pay` | 验证 UO 构建 | AA 数据结构完整，无链上交易 | ⏳ 待执行 |
| 3. 真实-EOA | `PAYMENT_MODE=eoa EXECUTE_ONCHAIN=1 pnpm demo:pay` | 链上转账 | Tx Hash + 确认 | ⏳ 待执行 |
| 4. 真实-AA | `PAYMENT_MODE=aa EXECUTE_ONCHAIN=1 pnpm demo:pay` | AA 支付 | UO Hash + Settlement Tx + 确认 | ⏳ 待执行 |
| 5. 政策拒绝 | `pnpm demo:reject` | 白名单强制 | NOT_IN_ALLOWLIST 拒绝 | ⏳ 待执行 |

---

## 故障排除

### 问题 1: "Module not found: gokite-aa-sdk"

```
Error: Cannot find module 'gokite-aa-sdk'
```

**解决**:
```bash
pnpm install
pnpm typecheck
```

---

### 问题 2: "OWNER_PRIVATE_KEY not found"

```
Error: Missing environment variable: OWNER_PRIVATE_KEY
```

**解决**:
1. 检查 `.env` 文件存在
2. 确认 `OWNER_PRIVATE_KEY=...` 已设置
3. 运行 `source .env` 或重启终端

---

### 问题 3: "Insufficient balance for gas"

```
Error: Insufficient balance for gas fees
```

**解决**:
1. 检查 Owner 钱包有足够 KITE 代币（用于 gas）
2. 访问 https://faucet.gokite.ai/ 获取更多测试资金
3. 等待 1-2 分钟后重试

---

### 问题 4: "Bundler timeout (120 sec exceeded)"

```
Error: UserOperation not confirmed after 120 seconds
```

**解决**:
1. 检查网络连接: `curl https://bundler-service.staging.gokite.ai/rpc/`
2. 减少 Amount（某些 Bundler 有限制）
3. 等待 5 分钟后重试
4. 查看 Bundler 服务状态

---

### 问题 5: "POLICY_VALIDATION failed: NOT_IN_ALLOWLIST"

```
Error: Recipient address not in allowlist
```

**解决**:
1. 检查 `src/lib/policy.ts` 中的 allowlist 配置
2. 确认收款地址已添加到白名单
3. 如需修改 allowlist，编辑 policy.ts 后重新运行

---

## 链上验证

### Kite 区块浏览器

执行链上交易后，验证结果：

**EOA 转账**:
1. 访问 https://testnet.kite.ai/ (确认最新地址)
2. 搜索 Tx Hash
3. 检查：From → To → Amount 匹配预期

**AA 转账**:
1. 访问浏览器并搜索 Settlement Tx Hash
2. 确认发送方为 AA 账户地址
3. 确认接收方为目标地址
4. 确认转移 100 USDC

---

## 日志解读

### 成功执行日志特征

```
[CONFIG_LOADED] ✓
[POLICY_VALIDATION] ✓
[...TX...] ✓
[DEMO_RESULT] ✓ Demo completed successfully
```

### 失败/拒绝日志特征

```
[POLICY_VALIDATION] ✗ (reason)
[EXPECTED_REJECT] (rejection_type)
或
[ERROR] (error message)
```

---

## 下一步

1. **完成所有 5 个场景**: 从场景 1 开始，逐个执行并验证
2. **记录 Tx Hash**: 场景 3 和 4 的真实执行结果
3. **更新 for_judge.md**: 填入实际的 Tx Hash 值
4. **提交结果**: 向 Role C 和 Role A 分享测试结果

---

## 参考

- [Kite 官方文档](https://docs.gokite.ai/)
- [gokite-aa-sdk v1.0.14](https://www.npmjs.com/package/gokite-aa-sdk)
- [ERC-4337 标准](https://eips.ethereum.org/EIPS/eip-4337)
- [项目 README](README.md)
- [安全政策](SECURITY.md)
