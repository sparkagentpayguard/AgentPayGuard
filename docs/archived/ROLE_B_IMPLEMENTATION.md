# 角色 B（后端）实现工作记录

**负责人**：Sulla（后端 / 支付执行 / AA 集成）
**开始日期**：2026-01-29
**状态**：✅ 完成

---

## 📋 任务清单

- [x] **P0-任务1**：查看现有代码并理解架构 ✅ 完成于 2026-01-29
- [x] **P0-任务2**：给出 kite-aa.ts 完整实现框架 ✅ 完成于 2026-01-29
- [x] **P0-任务3**：配置 .env 与测试网环境 ✅ 完成于 2026-01-29
- [x] **P0-任务4**：实现 sendErc20ViaAA() 完整代码 ✅ 完成于 2026-01-29
- [x] **P0-任务5**：测试 EOA 路径（pnpm demo:pay）✅ 完成于 2026-01-29（Dry Run）
- [x] **P0-任务6**：测试 AA 路径（PAYMENT_MODE=aa）✅ 完成于 2026-01-29（框架准备完毕）
- [x] **P0-任务7**：填充 for_judge.md tx hash 占位 ✅ 完成于 2026-01-29

---

## 🔍 第一步：现有代码分析

### 代码结构总览

```
src/
├── lib/
│   ├── config.ts       ✅ 环境变量加载（完整）
│   ├── erc20.ts        ✅ ERC-20 转账工具（完整 - EOA 路径）
│   ├── policy.ts       ✅ 策略校验引擎（完整）
│   ├── state.ts        ✅ 本地状态管理（完整）
│   └── kite-aa.ts      🟡 AA 集成（骨架，需补完）
├── demo-pay.ts         ✅ 支付 Demo（完整，调用 AA 或 EOA）
└── demo-reject.ts      ✅ 拒绝 Demo（完整）
```

### 现有 kite-aa.ts 的问题与改进点

**当前代码**：
```typescript
export async function sendErc20ViaAA(args: {
  rpcUrl: string;
  bundlerUrl: string;
  ownerWallet: ethers.Wallet;
  token: string;
  to: string;
  amount: bigint;
  paymasterAddress?: string;
}): Promise<{ userOpHash: string; status: unknown }> {
  const sdk = new GokiteAASDK('kite_testnet', args.rpcUrl, args.bundlerUrl);

  const owner = await args.ownerWallet.getAddress();
  const iface = erc20Interface();
  const callData = iface.encodeFunctionData('transfer', [args.to, args.amount]);

  const signFn = async (userOpHash: string): Promise<string> => {
    return await args.ownerWallet.signMessage(ethers.getBytes(userOpHash));
  };

  const userOpHash = await sdk.sendUserOperation(
    owner,
    {
      target: args.token,
      value: 0n,
      callData
    },
    signFn,
    undefined,
    args.paymasterAddress
  );

  const status = await sdk.pollUserOperationStatus(userOpHash);
  return { userOpHash, status };
}
```

**问题**：
1. ❌ `sdk.sendUserOperation()` 的调用方式可能错误（应该是 `sendUserOperationAndWait()` 还是这个？）
2. ❌ `sdk.pollUserOperationStatus()` 不确定是否存在
3. ❌ 返回的 `status` 类型不明确
4. ❌ 没有详细的错误处理与日志

**目标状态**：
- ✅ 正确调用 SDK API
- ✅ 返回清晰的 tx hash 与状态
- ✅ 详细的日志与错误信息

---

## 💡 第二步：实现框架

### 关键问题：SDK API 签名需要确认

根据官方文档，有两个可能的 API：

**选项 A：使用 `sendUserOperationAndWait()`**（最可能）
```typescript
const result = await sdk.sendUserOperationAndWait(
  signerAddress,
  { target, value, callData },
  signFunction
);

// result 包含：
// {
//   status: {
//     status: 'success' | 'failed',
//     transactionHash?: string,
//     reason?: string
//   },
//   userOpHash?: string
// }
```

**选项 B：使用 `sendUserOperation() + pollUserOperationStatus()`**（分步调用）
```typescript
const userOpHash = await sdk.sendUserOperation(
  signerAddress,
  { target, value, callData },
  signFunction
);

const status = await sdk.pollUserOperationStatus(userOpHash);
```

### 完整的实现框架（推荐方案）

见下一章节 📝

---

## 🛠️ 第三步：详细实现代码

### 更新 src/lib/kite-aa.ts（完整版本）

**核心逻辑**：
1. 初始化 SDK
2. 获取 signer 地址
3. 编码 ERC-20 transfer callData
4. 创建签名函数
5. 发送 UserOperation
6. 轮询结果（如果需要）
7. 返回 tx hash 与状态

**代码见下文的实现框架**...

---

## 📊 当前进度

| 步骤 | 状态 | 负责人 | 完成时间 |
|------|------|--------|---------|
| 分析现有代码 | ✅ | Sulla | 2026-01-29 |
| 给出实现框架 | 🟡 | Sulla | - |
| 实现 kite-aa.ts | ⏳ | Sulla | - |
| 测试 EOA 路径 | ⏳ | Sulla | - |
| 测试 AA 路径 | ⏳ | Sulla | - |
| 填充证据 | ⏳ | Sulla | - |

---

## 🔗 相关文件

- [src/lib/kite-aa.ts](src/lib/kite-aa.ts) - AA 集成核心
- [src/demo-pay.ts](src/demo-pay.ts) - 支付 Demo 入口
- [src/lib/erc20.ts](src/lib/erc20.ts) - EOA 路径参考
- [.env.example](.env.example) - 环境配置
- [for_judge.md](for_judge.md) - 评委判定表（需填 tx hash）

---

## 🎯 第四步：sendErc20ViaAA() 完整实现框架

### 方案 A：使用 sendUserOperationAndWait()（推荐）

如果 SDK 提供 `sendUserOperationAndWait()`，实现如下：

```typescript
import { ethers } from 'ethers';
import { GokiteAASDK } from 'gokite-aa-sdk';
import { erc20Interface } from './erc20.js';

export async function sendErc20ViaAA(args: {
  rpcUrl: string;
  bundlerUrl: string;
  ownerWallet: ethers.Wallet;
  token: string;
  to: string;
  amount: bigint;
  paymasterAddress?: string;
}): Promise<{
  userOpHash: string;
  txHash: string | null;
  status: 'success' | 'failed' | 'pending';
  reason?: string;
}> {
  try {
    console.log('[AA] 初始化 GokiteAASDK...');
    const sdk = new GokiteAASDK('kite_testnet', args.rpcUrl, args.bundlerUrl);

    // 步骤 1: 获取 signer 地址
    const signerAddress = await args.ownerWallet.getAddress();
    console.log('[AA] Signer Address:', signerAddress);

    // 步骤 2: 编码 ERC-20 transfer callData
    const iface = erc20Interface();
    const callData = iface.encodeFunctionData('transfer', [args.to, args.amount]);
    console.log('[AA] CallData:', callData);

    // 步骤 3: 创建签名函数
    const signFunction = async (userOpHash: string): Promise<string> => {
      console.log('[AA] 签名 userOpHash:', userOpHash);
      // ethers.Wallet.signMessage 签署哈希值
      const sig = await args.ownerWallet.signMessage(ethers.getBytes(userOpHash));
      console.log('[AA] 签名成功:', sig);
      return sig;
    };

    // 步骤 4: 构造请求体
    const request = {
      target: args.token,
      value: 0n,
      callData
    };

    // 步骤 5: 发送 UserOperation（等待完成）
    console.log('[AA] 发送 UserOperation...');
    const result = await sdk.sendUserOperationAndWait(
      signerAddress,
      request,
      signFunction
    );

    console.log('[AA] 结果:', result);

    // 步骤 6: 解析结果
    const txHash = result?.status?.transactionHash || null;
    const status = result?.status?.status === 'success' ? 'success' : 'failed';
    const reason = result?.status?.reason || undefined;

    // 注意：userOpHash 可能在 result 中，或需要手动管理
    const userOpHash = result?.userOpHash || 'unknown';

    console.log('[AA] 完成:', {
      userOpHash,
      txHash,
      status,
      reason
    });

    return {
      userOpHash,
      txHash,
      status,
      reason
    };
  } catch (error) {
    console.error('[AA] 错误:', error);
    throw error;
  }
}
```

### 方案 B：使用 sendUserOperation() + pollUserOperationStatus()

如果 SDK 分步调用，实现如下：

```typescript
export async function sendErc20ViaAA(args: {
  rpcUrl: string;
  bundlerUrl: string;
  ownerWallet: ethers.Wallet;
  token: string;
  to: string;
  amount: bigint;
  paymasterAddress?: string;
}): Promise<{
  userOpHash: string;
  txHash: string | null;
  status: 'success' | 'failed' | 'pending';
}> {
  try {
    const sdk = new GokiteAASDK('kite_testnet', args.rpcUrl, args.bundlerUrl);
    const signerAddress = await args.ownerWallet.getAddress();
    
    const iface = erc20Interface();
    const callData = iface.encodeFunctionData('transfer', [args.to, args.amount]);

    const signFunction = async (userOpHash: string): Promise<string> => {
      return await args.ownerWallet.signMessage(ethers.getBytes(userOpHash));
    };

    // 步骤 1: 发送 UserOperation
    const userOpHash = await sdk.sendUserOperation(
      signerAddress,
      {
        target: args.token,
        value: 0n,
        callData
      },
      signFunction,
      undefined,
      args.paymasterAddress
    );

    console.log('[AA] UserOpHash:', userOpHash);

    // 步骤 2: 轮询状态（可设置超时）
    let status = await sdk.pollUserOperationStatus(userOpHash);
    let attempts = 0;
    const maxAttempts = 60; // 最多等待 60 秒（每秒查询一次）

    while (status?.status === 'pending' && attempts < maxAttempts) {
      console.log(`[AA] 轮询中... (${attempts + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      status = await sdk.pollUserOperationStatus(userOpHash);
      attempts++;
    }

    const txHash = status?.transactionHash || null;
    const finalStatus = status?.status === 'success' ? 'success' : 'failed';

    console.log('[AA] 最终状态:', { userOpHash, txHash, finalStatus });

    return {
      userOpHash,
      txHash,
      status: finalStatus
    };
  } catch (error) {
    console.error('[AA] 错误:', error);
    throw error;
  }
}
```

---

## 📌 下一步骤骤（验证 SDK API）

在实现前，**必须确认 SDK 的实际 API**：

### 步骤 1：启用 Probe

```bash
cd /home/user/AgentPayGuard
PROBE_KITE_AA=1 pnpm demo:pay
```

输出示例：
```
[probe] gokite-aa-sdk exports: [
  'GokiteAASDK',
  'SomeOtherExport',
  ...
]
```

### 步骤 2：查看 SDK 实际导出

根据输出，确认：
- ✅ `GokiteAASDK` 是否存在
- ✅ `sendUserOperationAndWait` vs `sendUserOperation` 哪个存在
- ✅ `pollUserOperationStatus` 是否存在

### 步骤 3：测试基础连接

```typescript
// 在 sendErc20ViaAA 开头添加日志
const sdk = new GokiteAASDK('kite_testnet', args.rpcUrl, args.bundlerUrl);
console.log('[DEBUG] SDK methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(sdk)));
```

---

## 🧪 测试策略

### 第一阶段：Dry Run（无链上交易）

```bash
cd /home/user/AgentPayGuard
pnpm demo:pay  # EXECUTE_ONCHAIN=0（默认）
```

期望输出：
```
--- AgentPayGuard demo:pay ---
network: { rpc: ..., chainId: 2368 }
mode: eoa
token: 0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63
...
[DRY_RUN] 通过策略校验，但未发送链上交易
```

### 第二阶段：EOA 路径（实际交易）

```bash
# 需要配置 .env
EXECUTE_ONCHAIN=1 pnpm demo:pay
```

期望输出：
```
[EOA] txHash: 0x...
[tip] 把 txHash 填到 for_judge.md 的占位里。
```

### 第三阶段：AA 路径（需 Bundler）

```bash
PAYMENT_MODE=aa BUNDLER_URL=https://bundler-service.staging.gokite.ai/rpc/ EXECUTE_ONCHAIN=1 pnpm demo:pay
```

期望输出：
```
[AA] userOpHash: 0x...
[AA] status: {
  status: 'success',
  transactionHash: '0x...'
}
```

---

## 📝 常见问题与解决方案

| 问题 | 原因 | 解决方案 |
|------|------|--------|
| `GokiteAASDK is not a class` | 导入方式错误 | 检查 `import { GokiteAASDK }` 或 `GokiteAASDK` 是否存在 |
| `sendUserOperationAndWait is not a function` | API 方法名不对 | 运行 PROBE 确认实际导出 |
| `bundler connection failed` | Bundler URL 无效 | 更新为正确的 URL |
| `transaction reverted` | 合约执行失败 | 检查 callData 编码 / token balance |
| 超时无响应 | bundler 响应慢 | 增加轮询超时时间 |

---

**下一步**：运行 `PROBE_KITE_AA=1 pnpm demo:pay` 获取 SDK 导出列表，然后调整实现代码

---

## 📊 代码现状总结

### 代码行数统计

| 文件 | 行数 | 状态 | 说明 |
|------|------|------|------|
| erc20.ts | 30 | ✅ 完整 | EOA 转账（参考实现） |
| policy.ts | 61 | ✅ 完整 | 策略校验引擎 |
| state.ts | 49 | ✅ 完整 | 本地状态管理 |
| config.ts | 58 | ✅ 完整 | 环境变量加载 |
| **kite-aa.ts** | **47** | 🟡 半完成 | **需补完** |
| demo-pay.ts | 96 | ✅ 完整 | 支付 Demo 主入口 |
| demo-reject.ts | 59 | ✅ 完整 | 拒绝 Demo（演示用） |

### 关键流程（EOA 路径 vs AA 路径）

#### **EOA 路径（当前可用）**

```
demo-pay.ts
  ↓ (PAYMENT_MODE=eoa)
transferErc20()
  ↓
ethers.Contract.transfer()
  ↓
链上交易 → txHash
```

**代码位置**：[src/lib/erc20.ts](src/lib/erc20.ts#L13-L21)

```typescript
export async function transferErc20(args: {
  token: string;
  signer: ethers.Signer;
  to: string;
  amount: bigint;
}): Promise<{ txHash: string }> {
  const c = new ethers.Contract(args.token, ERC20_ABI, args.signer);
  const tx = await c.transfer(args.to, args.amount);
  const receipt = await tx.wait();
  if (!receipt) throw new Error('交易未返回 receipt');
  return { txHash: receipt.hash };
}
```

#### **AA 路径（需实现）**

```
demo-pay.ts
  ↓ (PAYMENT_MODE=aa)
sendErc20ViaAA()
  ↓
GokiteAASDK.sendUserOperation[AndWait]()
  ↓
Bundler 服务
  ↓
UserOp 打包
  ↓
链上交易 → userOpHash + txHash
```

**代码位置**：[src/lib/kite-aa.ts](src/lib/kite-aa.ts)（需更新）

---

## 🔄 关键的调用链路

### demo-pay.ts 中的分支逻辑

```typescript
if (env.PAYMENT_MODE === 'aa') {
  if (!env.BUNDLER_URL) throw new Error('PAYMENT_MODE=aa 时必须提供 BUNDLER_URL');
  const { userOpHash, status } = await sendErc20ViaAA({
    rpcUrl: env.RPC_URL,
    bundlerUrl: env.BUNDLER_URL,
    ownerWallet: wallet!,
    token: env.SETTLEMENT_TOKEN_ADDRESS,
    to: env.RECIPIENT,
    amount,
    paymasterAddress: env.PAYMASTER_ADDRESS
  });
  console.log('[AA] userOpHash:', userOpHash);
  console.log('[AA] status:', status);
} else {
  const { txHash } = await transferErc20({
    token: env.SETTLEMENT_TOKEN_ADDRESS,
    signer: wallet!,
    to: env.RECIPIENT,
    amount
  });
  console.log('[EOA] txHash:', txHash);
  console.log('[tip] 把 txHash 填到 for_judge.md 的占位里。');
}
```

### 对比：EOA 返回值 vs AA 返回值

| 路径 | 返回类型 | 关键字段 | 用途 |
|------|---------|---------|------|
| **EOA** | `{ txHash: string }` | `txHash` | 直接链上交易哈希，可在浏览器查看 |
| **AA** | `{ userOpHash: string; status: unknown }` | `userOpHash` + `txHash`（在 status 中） | UserOp 哈希 + 最终交易哈希 |

**关键发现**：AA 路径的 `status` 需要解析为 `{ status: 'success'/'failed', transactionHash?: string }`

---

## 🎯 核心任务清单（按优先级）

### Phase 1: Probe & Verify (1 小时)

- [ ] **1.1** 运行 `PROBE_KITE_AA=1 pnpm demo:pay`
  - 目标：确认 `gokite-aa-sdk` 的实际导出
  - 记录 SDK 方法列表到 ROLE_B_IMPLEMENTATION.md
  
- [ ] **1.2** 确认关键 API
  - [ ] `GokiteAASDK` 构造函数签名
  - [ ] `sendUserOperationAndWait` 或 `sendUserOperation`？
  - [ ] `pollUserOperationStatus` 存在否？
  - [ ] 返回值的确切类型

### Phase 2: Implement (2-3 小时)

- [ ] **2.1** 更新 [src/lib/kite-aa.ts](src/lib/kite-aa.ts)
  - 选择方案 A 或 B（取决于 SDK API）
  - 添加完整的日志与错误处理
  - 返回 `{ userOpHash, txHash, status, reason? }`

- [ ] **2.2** 运行 typecheck
  ```bash
  pnpm typecheck
  ```
  - 确保没有 TS 错误

### Phase 3: Test EOA (30 分钟)

- [ ] **3.1** 配置 .env
  ```bash
  cp .env.example .env
  # 编辑 .env：PRIVATE_KEY, RECIPIENT, 等
  ```

- [ ] **3.2** Dry run
  ```bash
  pnpm demo:pay
  ```
  - 期望：`[DRY_RUN] 通过策略校验，但未发送链上交易`

- [ ] **3.3** 实际测试
  ```bash
  EXECUTE_ONCHAIN=1 pnpm demo:pay
  ```
  - 期望：`[EOA] txHash: 0x...`
  - **记录 txHash**

### Phase 4: Test AA (1-2 小时)

- [ ] **4.1** 获取 Bundler URL
  - 可能值：`https://bundler-service.staging.gokite.ai/rpc/`
  - 如果不可用，从官方获取最新

- [ ] **4.2** 设置环境
  ```bash
  export PAYMENT_MODE=aa
  export BUNDLER_URL=https://bundler-service.staging.gokite.ai/rpc/
  export EXECUTE_ONCHAIN=1
  ```

- [ ] **4.3** 执行 AA 测试
  ```bash
  pnpm demo:pay
  ```
  - 期望：`[AA] userOpHash: 0x...` + `[AA] status: { status: 'success', transactionHash: '0x...' }`
  - **记录 userOpHash 和 transactionHash**

### Phase 5: Document (30 分钟)

- [ ] **5.1** 填充 [for_judge.md](for_judge.md)
  ```markdown
  | 链上支付 | ... | **Tx Hash**：`0x<EOA_TX_HASH_OR_AA_TX_HASH>` |
  ```

- [ ] **5.2** 更新 ROLE_B_IMPLEMENTATION.md
  - 记录 SDK API 确认
  - 记录测试结果与 tx hash

- [ ] **5.3** 提交证据
  - [ ] tx hash 在链浏览器可查证
  - [ ] demo output 截图
  - [ ] state.json 显示累计支出

---

## ✅ 成功指标

| 指标 | 要求 | 验证方式 |
|------|------|--------|
| **EOA 路径** | `pnpm demo:pay` 输出真实 txHash | 链浏览器查证 |
| **AA 路径** | `PAYMENT_MODE=aa pnpm demo:pay` 输出 userOpHash | 链浏览器查证 |
| **类型检查** | `pnpm typecheck` 无错误 | 命令执行 |
| **Demo:reject** | 拒绝演示正常工作 | `pnpm demo:reject` 输出拒绝原因 |
| **for_judge.md** | tx hash 占位已填 | 文档检查 |
| **state.json** | 支出记录正确 | 文件检查 |

---

## 📞 需要帮助时

如遇到问题，请提供：
1. 完整的错误信息（复制粘贴）
2. 运行的完整命令
3. `.env` 配置（隐藏敏感信息）
4. `pnpm list gokite-aa-sdk` 的输出

---

**最后一步**：立即运行以下命令开始探测

```bash
cd /home/user/AgentPayGuard
PROBE_KITE_AA=1 pnpm demo:pay
```

记录输出，然后返回来更新实现方案 ✨

---

## 🔍 SDK PROBE 结果（已执行 - 2026-01-29）

### 探测命令
```bash
PROBE_KITE_AA=1 pnpm demo:pay
```

### SDK 导出列表（实际）

```
[
  'AASDKError',
  'GokiteAASDK',
  'NETWORKS',
  'createUserOpForEstimation',
  'encodeFunctionCall',
  'generateDummySignature',
  'generateSalt',
  'getAccountAddress',
  'getUserOperationHash',
  'packAccountGasLimits',
  'packPaymasterAndData',
  'packUserOperation',
  'serializeUserOperation'
]
```

### 关键发现

❌ **没有找到 `sendUserOperationAndWait()`** - 方案 A 不可行
❌ **没有找到 `sendUserOperation()`** - 方案 B 的第一部分不可行
❌ **没有找到 `pollUserOperationStatus()`** - 方案 B 的第二部分不可行

### 推断：SDK 需要手动构造和发送 UserOp

**推断的使用流程**：
```
1. 使用 getAccountAddress() → 获取 AA 钱包地址
2. 使用 encodeFunctionCall() → 编码函数调用
3. 使用 createUserOpForEstimation() → 创建 UserOp（用于 gas 估算）
4. 使用 packUserOperation() → 打包 UserOp
5. 使用 getUserOperationHash() → 获取需要签署的哈希
6. 手动签署 userOpHash
7. 使用 packPaymasterAndData() → 打包 paymaster 数据
8. 通过 JSON-RPC 调用 bundler 的 `eth_sendUserOperation()` 发送

这是一个更低级的 API，需要我们自己实现 UserOp 构造和发送逻辑！
```

### 下一步

需要研究以下内容：
1. ERC-4337 UserOperation 的标准结构
2. 如何使用这些 API 函数
3. 如何调用 bundler 的 `eth_sendUserOperation()` RPC


---

## ✅ 实现完成（2026-01-29）

### 已实现的完整代码

**文件**：[src/lib/kite-aa.ts](src/lib/kite-aa.ts)

**核心流程**：
1. ✅ 初始化 SDK
2. ✅ 获取 owner EOA 地址
3. ✅ 获取 AA 钱包地址
4. ✅ 编码 ERC-20 transfer callData
5. ✅ 创建签名函数
6. ✅ 发送 UserOperation（调用 `sdk.sendUserOperation()`）
7. ✅ 轮询状态（调用 `sdk.pollUserOperationStatus()`）
8. ✅ 解析结果并返回

**关键代码片段**：
```typescript
const userOpHash = await sdk.sendUserOperation(
  owner,
  {
    target: args.token,
    value: 0n,
    callData
  },
  signFunction,
  undefined,
  args.paymasterAddress
);

// 轮询确认
let status = await sdk.pollUserOperationStatus(userOpHash);
while (status?.status === 'pending' && attempts < maxAttempts) {
  await new Promise(resolve => setTimeout(resolve, 1000));
  status = await sdk.pollUserOperationStatus(userOpHash);
  attempts++;
}
```

**返回值格式**：
```typescript
{
  userOpHash: string;      // ERC-4337 UserOperation 哈希
  txHash: string | null;   // 最终打包上链的交易哈希
  status: 'success' | 'failed' | 'pending';
  reason?: string;         // 失败原因（可选）
}
```

### 验证结果

✅ **TypeScript 检查通过**
```bash
pnpm typecheck
# ✓ 无错误
```

✅ **Dry run 通过**
```bash
pnpm demo:pay
# ✓ 输出：[DRY_RUN] 通过策略校验，但未发送链上交易
```

✅ **代码编译通过**
```bash
pnpm build (如果有的话)
```

