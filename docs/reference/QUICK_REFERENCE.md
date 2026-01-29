# 快速参考：角色 B 实现清单

## 🚀 立即执行（第一步）

```bash
cd /home/user/AgentPayGuard
PROBE_KITE_AA=1 pnpm demo:pay
```

**记录输出的 SDK 导出列表**，然后决定使用哪个实现方案。

---

## 📋 核心代码位置

| 文件 | 行数 | 用途 |
|------|------|------|
| [src/lib/kite-aa.ts](src/lib/kite-aa.ts) | 47 | **🔴 需实现** AA 支付 |
| [src/lib/erc20.ts](src/lib/erc20.ts) | 30 | ✅ EOA 参考实现 |
| [src/demo-pay.ts](src/demo-pay.ts) | 96 | ✅ 主入口（已调用 AA） |
| [src/lib/policy.ts](src/lib/policy.ts) | 61 | ✅ 策略校验 |
| [src/lib/state.ts](src/lib/state.ts) | 49 | ✅ 状态管理 |

---

## 🎯 两个实现方案

### **方案 A：sendUserOperationAndWait()** ⭐ 推荐

**适用**：如果 SDK 提供该方法（一步完成）

```typescript
const result = await sdk.sendUserOperationAndWait(
  signerAddress,
  { target, value, callData },
  signFunction
);
// result.status.transactionHash === txHash
```

**返回值**：
```typescript
{
  userOpHash: string;
  txHash: string | null;
  status: 'success' | 'failed';
  reason?: string;
}
```

### **方案 B：sendUserOperation() + poll** 

**适用**：如果 SDK 只有该方法（分步完成）

```typescript
const userOpHash = await sdk.sendUserOperation(...);
let status = await sdk.pollUserOperationStatus(userOpHash);
while (status?.status === 'pending') {
  await sleep(1000);
  status = await sdk.pollUserOperationStatus(userOpHash);
}
```

---

## ✅ 测试命令速查

### 1️⃣ 探测 SDK（了解 API）

```bash
PROBE_KITE_AA=1 pnpm demo:pay
```

### 2️⃣ Dry run（无链上交易）

```bash
pnpm demo:pay
```

### 3️⃣ EOA 真实测试（需要配置 .env）

```bash
EXECUTE_ONCHAIN=1 pnpm demo:pay
```

**期望输出**：
```
[EOA] txHash: 0x<32字符hex>
```

### 4️⃣ AA 真实测试（需要 bundler）

```bash
PAYMENT_MODE=aa \
BUNDLER_URL=https://bundler-service.staging.gokite.ai/rpc/ \
EXECUTE_ONCHAIN=1 \
pnpm demo:pay
```

**期望输出**：
```
[AA] userOpHash: 0x...
[AA] status: {
  status: 'success',
  transactionHash: '0x...'
}
```

### 5️⃣ 拒绝演示（演示风控）

```bash
pnpm demo:reject
```

### 6️⃣ 类型检查

```bash
pnpm typecheck
```

---

## 📝 .env 配置模板

```bash
# 必需
PRIVATE_KEY=0x<你的测试网私钥>
RECIPIENT=0x<收款地址>

# 可选（已有默认值）
RPC_URL=https://rpc-testnet.gokite.ai/
CHAIN_ID=2368
SETTLEMENT_TOKEN_ADDRESS=0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63
AMOUNT=0.01

# AA 相关
PAYMENT_MODE=eoa                    # 改为 aa 时启用 AA 路径
BUNDLER_URL=https://bundler-service.staging.gokite.ai/rpc/
PAYMASTER_ADDRESS=                  # 可选

# 执行
EXECUTE_ONCHAIN=0                   # 改为 1 时真实发送
PROBE_KITE_AA=0                     # 改为 1 时输出 SDK 导出

# 策略（可选）
ALLOWLIST=0x<地址1>,0x<地址2>
MAX_AMOUNT=100
DAILY_LIMIT=1000
```

---

## 🔑 关键返回值

### EOA 路径

```typescript
interface EOAResult {
  txHash: string;  // 可直接在链浏览器查看
}
```

**链浏览器**：`https://explorer-testnet.gokite.ai/tx/{txHash}`

### AA 路径

```typescript
interface AAResult {
  userOpHash: string;           // UserOperation 哈希
  txHash: string | null;        // 最终交易哈希（可能为 null）
  status: 'success' | 'failed' | 'pending';
  reason?: string;              // 失败原因
}
```

**说明**：
- `userOpHash`：bundler 处理的操作哈希
- `txHash`：最终打包上链的交易哈希（等于 `result.status.transactionHash`）

---

## 🐛 常见错误速查

| 错误信息 | 原因 | 解决 |
|---------|------|------|
| `GokiteAASDK is not a class` | 导入错误 | 检查 `import { GokiteAASDK }` |
| `Cannot find module 'gokite-aa-sdk'` | 未安装 | `pnpm install` |
| `sendUserOperationAndWait is not a function` | API 不存在 | 运行 PROBE 确认实际 API |
| `BUNDLER_URL required` | 缺少 bundler | 设置 `BUNDLER_URL` 环境变量 |
| `Transaction reverted` | 合约执行失败 | 检查 callData 编码或 token balance |
| `TS Error: Cannot assign type unknown` | 类型问题 | 检查 status 类型定义 |

---

## 📊 进度追踪

### 当前状态：🟡 进行中

```
[✅] Phase 1: 代码分析与框架设计
[⏳] Phase 2: SDK 探测与确认
[⏳] Phase 3: 实现 sendErc20ViaAA()
[⏳] Phase 4: 测试 EOA 路径
[⏳] Phase 5: 测试 AA 路径
[⏳] Phase 6: 填充证据
```

---

## 🔗 相关文档

- 📄 [ROLE_B_IMPLEMENTATION.md](ROLE_B_IMPLEMENTATION.md) - 完整实现指南
- 📄 [README.md](README.md) - 项目概述
- 📄 [for_judge.md](for_judge.md) - 评委判定表（需填 tx hash）
- 📄 [allocation.md](allocation.md) - 分工说明

---

**下一步**：现在就执行探测命令，并记录结果！ 🚀
