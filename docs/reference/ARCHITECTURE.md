# 架构对比与实现指南

## 整体架构图

```
┌──────────────────────────────────────────────────────────────┐
│                    AgentPayGuard Demo                        │
│                    (demo-pay.ts)                             │
└─────────────┬──────────────────────────────────────────────┘
              │
        ┌─────┴──────┐
        ▼             ▼
   ┌─────────┐   ┌─────────┐
   │  EOA    │   │   AA    │
   │ 路径    │   │ 路径    │
   └────┬────┘   └────┬────┘
        │             │
        ▼             ▼
   ┌──────────┐  ┌──────────────────────┐
   │erc20.ts  │  │kite-aa.ts (需实现)   │
   │          │  │                      │
   │transfer()│  │sendErc20ViaAA()      │
   └────┬─────┘  └────┬─────────────────┘
        │             │
        ▼             ▼
   ┌──────────┐  ┌──────────────────┐
   │ethers.js │  │GokiteAASDK       │
   │Contract  │  │  ↓               │
   │.transfer │  │sendUserOp[AndWait]
   └────┬─────┘  └────┬──────────────┘
        │             │
        ▼             ▼
   ┌──────────┐  ┌──────────────┐
   │RPC       │  │Bundler       │
   │          │  │Service       │
   └────┬─────┘  └────┬─────────┘
        │             │
        └─────┬───────┘
              ▼
        ┌───────────────┐
        │Kite Testnet L1│
        │               │
        │✅ txHash      │
        └───────────────┘
```

---

## 代码流程对比

### EOA 路径（已完成）

```typescript
// demo-pay.ts
const { txHash } = await transferErc20({
  token: SETTLEMENT_TOKEN_ADDRESS,
  signer: wallet,
  to: RECIPIENT,
  amount
});

// erc20.ts
const c = new ethers.Contract(token, ERC20_ABI, signer);
const tx = await c.transfer(to, amount);
const receipt = await tx.wait();
return { txHash: receipt.hash };

// 输出：[EOA] txHash: 0x...
// 完全透明的链上交易 ✅
```

### AA 路径（需实现）

```typescript
// demo-pay.ts
const { userOpHash, status } = await sendErc20ViaAA({
  rpcUrl: RPC_URL,
  bundlerUrl: BUNDLER_URL,      // ⚠️ 需要配置
  ownerWallet: wallet,
  token: SETTLEMENT_TOKEN_ADDRESS,
  to: RECIPIENT,
  amount,
  paymasterAddress: PAYMASTER_ADDRESS
});

// kite-aa.ts (需补完)
const sdk = new GokiteAASDK('kite_testnet', rpcUrl, bundlerUrl);
const signerAddress = await ownerWallet.getAddress();

// 方案 A（推荐）
const result = await sdk.sendUserOperationAndWait(
  signerAddress,
  {
    target: token,
    value: 0n,
    callData: erc20Interface.encodeFunctionData('transfer', [to, amount])
  },
  async (userOpHash) => ownerWallet.signMessage(ethers.getBytes(userOpHash))
);

return {
  userOpHash: result?.userOpHash || 'unknown',
  txHash: result?.status?.transactionHash || null,
  status: result?.status?.status || 'failed'
};

// 输出：
// [AA] userOpHash: 0x...
// [AA] status: { status: 'success', transactionHash: '0x...' }
// 通过 bundler 的 ERC-4337 UserOperation ✅
```

---

## 关键对象结构

### sendErc20ViaAA 的参数

```typescript
interface SendErc20ViaAAArgs {
  rpcUrl: string;              // "https://rpc-testnet.gokite.ai/"
  bundlerUrl: string;          // "https://bundler-service.staging.gokite.ai/rpc/"
  ownerWallet: ethers.Wallet;  // 私钥钱包实例
  token: string;               // "0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63"
  to: string;                  // 收款地址
  amount: bigint;              // 转账金额（已转换为 token units）
  paymasterAddress?: string;   // 可选：gasless 服务方
}
```

### sendErc20ViaAA 的返回值

```typescript
interface SendErc20ViaAAResult {
  userOpHash: string;                    // UserOperation 哈希
  txHash: string | null;                 // 最终交易哈希
  status: 'success' | 'failed' | 'pending';
  reason?: string;                       // 失败原因（可选）
}
```

---

## GokiteAASDK API 猜测

根据官方文档与当前代码框架，可能的 API：

```typescript
class GokiteAASDK {
  constructor(
    network: 'kite_testnet',
    rpcUrl: string,
    bundlerUrl: string
  );

  // 获取 AA 钱包地址
  getAccountAddress(signerAddress: string): string;

  // 方案 A：一步完成（最可能）
  async sendUserOperationAndWait(
    signerAddress: string,
    request: {
      target: string;    // 合约地址
      value: bigint;     // ETH 值
      callData: string;  // 编码后的函数调用
    },
    signFunction: (userOpHash: string) => Promise<string>,
    ?opts?: unknown,
    ?paymaster?: string
  ): Promise<{
    userOpHash?: string;
    status: {
      status: 'success' | 'failed' | 'pending';
      transactionHash?: string;
      reason?: string;
    };
  }>;

  // 方案 B：分步调用
  async sendUserOperation(
    signerAddress: string,
    request: { target, value, callData },
    signFunction,
    ?opts,
    ?paymaster
  ): Promise<string>;  // userOpHash

  async pollUserOperationStatus(
    userOpHash: string
  ): Promise<{
    status: 'success' | 'failed' | 'pending';
    transactionHash?: string;
    reason?: string;
  }>;
}
```

---

## ERC-20 callData 编码

```typescript
// 关键：正确编码 ERC-20 transfer 调用

import { ethers } from 'ethers';

function encodeERC20Transfer(recipientAddress: string, amount: bigint): string {
  const iface = new ethers.Interface([
    'function transfer(address to, uint256 amount) returns (bool)'
  ]);
  
  return iface.encodeFunctionData('transfer', [
    recipientAddress,
    amount
  ]);
}

// 使用示例
const callData = encodeERC20Transfer('0x...', ethers.parseUnits('0.01', 18));
// callData = "0xa9059cbb000000000000000000000000..."

// 这个 callData 会被传给 SDK：
const result = await sdk.sendUserOperationAndWait(
  signerAddress,
  {
    target: tokenAddress,
    value: 0n,              // ERC-20 转账不需要 ETH
    callData
  },
  signFunction
);
```

---

## 签名函数

```typescript
// SDK 需要一个签名函数来签署 UserOperation 哈希

const signFunction = async (userOpHash: string): Promise<string> => {
  // userOpHash: UserOperation 的 Keccak256 哈希（hex 字符串）
  
  // 方式 1：使用 ethers.Wallet.signMessage
  const signature = await ownerWallet.signMessage(
    ethers.getBytes(userOpHash)
  );
  
  // 返回签名字符串（0x 开头的 hex）
  return signature;
};
```

**重要**：`signMessage` 需要的是字节数组，所以使用 `ethers.getBytes(userOpHash)` 转换。

---

## 完整的实现框架（参考）

```typescript
// src/lib/kite-aa.ts

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
    console.log('[AA] 初始化 SDK');
    const sdk = new GokiteAASDK('kite_testnet', args.rpcUrl, args.bundlerUrl);

    const signerAddress = await args.ownerWallet.getAddress();
    console.log('[AA] Signer:', signerAddress);

    const iface = erc20Interface();
    const callData = iface.encodeFunctionData('transfer', [args.to, args.amount]);
    console.log('[AA] CallData:', callData);

    const signFunction = async (userOpHash: string): Promise<string> => {
      console.log('[AA] 签名中...');
      return args.ownerWallet.signMessage(ethers.getBytes(userOpHash));
    };

    // 假设 SDK 提供 sendUserOperationAndWait
    console.log('[AA] 发送 UserOperation...');
    const result = await sdk.sendUserOperationAndWait(
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

    console.log('[AA] 结果:', result);

    const userOpHash = result?.userOpHash || 'unknown';
    const txHash = result?.status?.transactionHash || null;
    const status = (result?.status?.status || 'failed') as 'success' | 'failed' | 'pending';
    const reason = result?.status?.reason;

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

---

## 测试流程图

```
┌─ PROBE_KITE_AA=1 ────────────────────┐
│  pnpm demo:pay                       │
│                                      │
│  输出：SDK 导出列表                  │
│  确认：实际 API 名称                 │
└──────────────────┬───────────────────┘
                   │
         ┌─────────┴──────────┐
         ▼                    ▼
     方案 A                方案 B
     (推荐)            (备选)
     
┌─ EOA 路径 ────────────┐
│ pnpm demo:pay         │
│ (EXECUTE_ONCHAIN=1)   │
│                       │
│ 输出：txHash          │
│ 验证：链浏览器        │
└───────────┬───────────┘
            │
            ▼
┌─ AA 路径 ─────────────────────┐
│ PAYMENT_MODE=aa pnpm demo:pay │
│ (需 BUNDLER_URL)              │
│                               │
│ 输出：userOpHash + txHash     │
│ 验证：链浏览器                │
└───────────┬───────────────────┘
            │
            ▼
┌─ 填充 for_judge.md ──┐
│ 记录 tx hash         │
│ 完成评审表           │
└──────────────────────┘
```

---

## 当前关键文件清单

| 文件 | 责任 | 状态 |
|------|------|------|
| src/demo-pay.ts | 主入口，调用 EOA 或 AA | ✅ 完成 |
| src/lib/erc20.ts | EOA 转账参考实现 | ✅ 完成 |
| **src/lib/kite-aa.ts** | **AA 支付实现** | 🔴 **需完成** |
| src/lib/policy.ts | 风控策略 | ✅ 完成 |
| src/lib/state.ts | 状态管理 | ✅ 完成 |
| src/lib/config.ts | 环境变量 | ✅ 完成 |

---

**现在的任务**：

1. ✅ 理解架构（已完成）
2. ⏳ 运行 `PROBE_KITE_AA=1 pnpm demo:pay`
3. ⏳ 根据 SDK 导出列表选择实现方案
4. ⏳ 补完 src/lib/kite-aa.ts
5. ⏳ 测试并获取 tx hash
