# Role B 测试指南

> **📌 声明**：本指南提供了参考性的测试步骤和演讲框架。Role B 可以根据实际时间和想法选择自己的测试方案和演讲方式。演讲脚本仅为参考，欢迎发挥个人风格和创意。

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

## Role B 演讲准备指南 ⭐ **新增**

### 目标

准备 5-10 分钟的现场演讲，清晰地展示：
1. 代码实现的精妙之处
2. 支付和拒绝演示的实时反馈
3. 链上证据（Tx Hash 和浏览器验证）
4. 系统架构和安全设计

### 演讲脚本框架

#### 部分 1：问题与解决方案（1 分钟）

```
"大家好，我们的项目 AgentPayGuard 解决的核心问题是：
 如何在链上实现 Agent 自主支付，同时保证风险控制？
 
 我们的解决方案包括三个关键部分：
 1. 使用 ERC-4337 AA 标准实现 Agent 身份管理
 2. 通过策略引擎（白名单、金额限额）控制权限
 3. 多签智能合约冻结高风险操作
 
 接下来我'll展示完整的代码实现和链上验证。"
```

#### 部分 2：代码讲解（2-3 分钟）

```
"首先看核心实现：src/lib/kite-aa.ts

【打开编辑器，指向函数】
sendErc20ViaAA() 函数，共 104 行，完成以下流程：

[指向相应代码行]
1. 初始化 SDK（0x...AA Account）
2. 编码调用数据（ERC-20 transfer）
3. 签名 UserOperation（owner 钱包）
4. 提交 Bundler 执行
5. 轮询状态（确认上链）
6. 返回最终 Tx Hash

【强调要点】
- ERC-4337 兼容：使用标准 UserOp 格式
- 安全签名：owner 私钥不泄露给 Bundler
- 自动轮询：避免手动查询状态

接下来看策略引擎 src/lib/policy.ts：

【指向 validatePayment 函数】
三层检查：
- 白名单校验：收款地址必须在允许列表
- 金额限制：单笔不超过 1000 USDC，日总额有限
- 有效期检查：策略有过期机制

这样即使 Agent 被攻击，也只能向预授权地址转账。"
```

#### 部分 3：演示 1 - 正常支付（1.5 分钟）

```
"现在演示正常的支付流程。

【运行命令】
$ PAYMENT_MODE=eoa EXECUTE_ONCHAIN=0 pnpm demo:pay

【讲解输出】
看到这几行关键输出：
- [POLICY_VALIDATION] ✓ - 策略检查通过
- [DRY_RUN] Would transfer... - 干运行，验证逻辑正确

再运行真实链上版本：
$ PAYMENT_MODE=eoa EXECUTE_ONCHAIN=1 pnpm demo:pay

【讲解结果】
这会产生一个真实的链上交易。
得到的 Tx Hash 是：0xABCD1234... [在浏览器中打开]

在 Kite 浏览器中可以看到：
- 交易状态：Success
- 发送方：我们的 Owner EOA 钱包
- 接收方：Target 地址
- 金额：100 USDC
- 区块号和确认数

【强调】
这是真实的链上交易，完全透明可验证。"
```

#### 部分 4：演示 2 - 拒绝机制（1 分钟）

```
"现在演示策略拒绝的情况。

假设有一个非白名单的地址试图接收资金。

【修改 demo-reject.ts 配置，或直接运行】
$ pnpm demo:reject

【讲解输出】
关键行：
[POLICY_VALIDATION] ✗ NOT_IN_ALLOWLIST

支付被拒绝了。这就是我们的风险控制机制在起作用。
即使 Agent 代码被劫持，也无法向未授权地址发送资金。

【展示代码】
这个检查在 src/lib/policy.ts 的 validatePayment 函数，
只需一个简单的 allowlist 映射就实现了安全控制。"
```

#### 部分 5：链上架构与多签冻结（1.5-2 分钟）

```
"除了支付层的策略控制，我们还在合约层实现了多签冻结机制。

【切换到 Role A 的演讲内容或展示截图】
- Gnosis Safe 多签钱包（2/3 阈值）
- TokenGuard 权限管理合约
- 冻结交易哈希：0xFREEZE1234...

【打开浏览器链接】
在 Kite 浏览器中，可以看到冻结操作的完整执行：
- 多个成员的签名
- 交易提交和确认
- 当前资产冻结状态

这形成了三层防护：
1. 策略引擎：应用层白名单检查
2. AA 身份：ERC-4337 UserOperation 隔离
3. 多签冻结：合约层最终风控

【总结】
三层防护确保即使 Agent 在应用层或链上被攻击，
风险也能被有效控制。"
```

#### 部分 6：总结与 Q&A 准备（30 秒）

```
"总结一下我们的实现：

✓ 完整代码：104 行核心实现 + 50 行策略引擎
✓ 链上验证：2 笔真实交易（EOA + AA）+ 1 笔冻结交易
✓ 可复现性：一键命令即可复现整个流程
✓ 风险控制：白名单 + 金额限制 + 多签冻结

所有代码开源，所有交易可在 Kite 浏览器验证。

感谢，现在可以进行 Q&A 环节。"
```

### 演讲技巧和注意事项

**时间管理**
- 总时长：5-7 分钟（留 3-5 分钟 Q&A）
- 代码讲解：2-3 分钟（指向关键函数，不要逐行读）
- 演示演示：2-3 分钟（让评委看清楚输出）
- 架构部分：1-2 分钟（强调多层防护）

**视觉辅助**
- 放大字体（代码编辑器调到 18pt）
- 用颜色标注（高亮关键代码行）
- 用指针或光标指示讲解内容
- 避免快速滚动或跳转

**声音和语调**
- 语速均匀：给评委记笔记的时间
- 清晰发音：确保"UserOperation"、"Bundler" 等术语发音准确
- 停顿：在关键概念后停顿 2-3 秒
- 热情：展示对项目的信心和理解

**应对 Q&A**

| 可能的问题 | 回答要点 |
|----------|---------|
| "为什么选择 ERC-4337 而不是其他方案？" | ERC-4337 是以太坊标准，跨链通用，Kite 支持，社区成熟 |
| "策略引擎的扩展性如何？" | 白名单、金额、有效期可以动态配置，支持添加更复杂规则 |
| "多签冻结的响应时间？" | 需要 2/3 签名，一般 1-5 分钟（取决于成员在线情况） |
| "如果 Owner 私钥泄露怎么办？" | 可以通过多签冻结操作冻结所有资产，防止进一步损失 |
| "支持哪些 Token？" | 当前演示是 USDC，架构支持任何 ERC-20 token |

### 演讲稿参考（完整版）

```markdown
# AgentPayGuard 完整演讲稿（7-10 分钟）

## 开场（30 秒）
[自我介绍 + 项目名称]

## 问题（30 秒）
[解释链上 Agent 支付的风险]

## 方案（1 分钟）
[介绍 3 层防护]

## 代码演讲（2-3 分钟）
[逐部分讲解 kite-aa.ts 和 policy.ts]

## 现场演示（2-3 分钟）
[运行 pnpm demo:pay 和 demo:reject，展示输出]

## 链上证据（1-2 分钟）
[打开浏览器展示 Tx Hash，讲解多签冻结]

## 总结（30 秒）
[回顾 4 个赛道要求，感谢评委]

## Q&A（3-5 分钟）
[根据上面的表格，准备回答]
```

### 排练计划

```
第 1 天：准备讲稿（1 小时）
- 参考上面的框架，填充自己的语言风格
- 标注重点和停顿位置

第 2 天：代码熟悉（1 小时）
- 逐行阅读 kite-aa.ts 和 policy.ts
- 理解每个函数的作用
- 准备讲解时的指向位置

第 3 天：演示排练（1 小时）
- 运行 pnpm demo:pay/reject 多次
- 熟悉输出内容
- 准备在浏览器中快速打开链接

第 4 天：完整排练（1 小时）
- 从头到尾讲一遍（计时）
- 录制视频，看自己的表现
- 调整节奏和强调点

第 5 天：最终检查（30 分钟）
- 检查所有 Tx Hash 和浏览器链接是否有效
- 准备备用链接（以防网络问题）
- 确认代码编辑器的字体大小和配色
```

### 演讲设备清单

```
- 笔记本电脑（连接网络）
- 外接显示器（可选，便于评委看清）
- 鼠标或触板（避免手忙脚乱）
- 代码编辑器（VSCode 打开项目）
- 浏览器标签页（预先打开关键 Tx 链接）
- 讲稿（打印或在手机中备份）
- 计时工具（确保不超时）
- 水杯（保护嗓子）
```

---

## 下一步

1. **完成所有 5 个场景**: 从场景 1 开始，逐个执行并验证
2. **记录 Tx Hash**: 场景 3 和 4 的真实执行结果
3. **准备演讲稿**: 使用上面的框架，准备 5-7 分钟的讲稿
4. **排练演讲**: 根据排练计划，预演整个演讲过程
5. **更新 for_judge.md**: 填入实际的 Tx Hash 值
6. **提交结果**: 向 Role C、Role A 和 Role D 分享测试结果和演讲稿草稿

---

## 参考

- [Kite 官方文档](https://docs.gokite.ai/)
- [gokite-aa-sdk v1.0.14](https://www.npmjs.com/package/gokite-aa-sdk)
- [ERC-4337 标准](https://eips.ethereum.org/EIPS/eip-4337)
- [项目 README](README.md)
- [安全政策](SECURITY.md)

````
