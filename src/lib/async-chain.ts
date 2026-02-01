/**
 * Async chain query optimization
 * 
 * 异步链上查询优化，支持并行查询
 */

import { ethers } from 'ethers';
import { withRetry, CHAIN_RPC_RETRY_OPTIONS } from './retry.js';

/**
 * 并行查询多个地址的冻结状态
 */
export async function queryFreezeStatusBatch(
  provider: ethers.Provider,
  freezeContractAddress: string,
  addresses: string[]
): Promise<Map<string, boolean>> {
  if (addresses.length === 0) {
    return new Map();
  }

  const FREEZE_ABI = ['function isFrozen(address account) view returns (bool)'];
  const freezeContract = new ethers.Contract(freezeContractAddress, FREEZE_ABI, provider);

  // 并行查询所有地址
  const promises = addresses.map(async (address) => {
    try {
      const isFrozen = await withRetry(
        async () => {
          return await freezeContract.isFrozen(address);
        },
        {
          ...CHAIN_RPC_RETRY_OPTIONS,
          onRetry: (attempt: number, error: Error) => {
            console.warn(`[AsyncChain] Retry attempt ${attempt} for freeze check ${address}: ${error.message}`);
          }
        }
      );
      return { address, isFrozen, error: null };
    } catch (error) {
      console.error(`[AsyncChain] Failed to check freeze status for ${address}:`, error);
      // 查询失败时，返回错误信息而不是默认 false（安全策略：无法确认时应该拒绝）
      return { address, isFrozen: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  });

  const results = await Promise.allSettled(promises);
  const freezeMap = new Map<string, boolean>();
  const errors: Map<string, Error> = new Map();

  results.forEach((result, index) => {
    const address = addresses[index];
    if (result.status === 'fulfilled') {
      const value = result.value;
      if (value.error) {
        // 查询失败，记录错误（安全策略：无法确认冻结状态时应该拒绝）
        errors.set(address, value.error);
        console.error(`[AsyncChain] Freeze check failed for ${address}:`, value.error);
      } else {
        freezeMap.set(address, value.isFrozen);
      }
    } else {
      // Promise 被拒绝，记录错误
      errors.set(address, result.reason instanceof Error ? result.reason : new Error(String(result.reason)));
      console.error(`[AsyncChain] Failed to query freeze status for ${address}:`, result.reason);
    }
  });

  // 如果有任何查询失败，抛出异常（Strong Consistency：无法确认冻结状态时拒绝支付）
  if (errors.size > 0) {
    const errorMessages = Array.from(errors.entries()).map(([addr, err]) => `${addr}: ${err.message}`).join('; ');
    throw new Error(`无法查询冻结状态（安全策略：无法确认时拒绝支付）: ${errorMessages}`);
  }

  return freezeMap;
}

/**
 * 并行查询多个地址的余额
 */
export async function queryBalanceBatch(
  provider: ethers.Provider,
  tokenAddress: string,
  addresses: string[]
): Promise<Map<string, bigint>> {
  if (addresses.length === 0) {
    return new Map();
  }

  const ERC20_ABI = ['function balanceOf(address account) view returns (uint256)'];
  const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

  // 并行查询所有地址
  const promises = addresses.map(async (address) => {
    try {
      const balance = await withRetry(
        async () => {
          return await tokenContract.balanceOf(address);
        },
        {
          ...CHAIN_RPC_RETRY_OPTIONS,
          onRetry: (attempt: number, error: Error) => {
            console.warn(`[AsyncChain] Retry attempt ${attempt} for balance check ${address}: ${error.message}`);
          }
        }
      );
      return { address, balance, error: null };
    } catch (error) {
      console.error(`[AsyncChain] Failed to check balance for ${address}:`, error);
      return { address, balance: 0n, error: error instanceof Error ? error : new Error(String(error)) };
    }
  });

  const results = await Promise.allSettled(promises);
  const balanceMap = new Map<string, bigint>();

  results.forEach((result, index) => {
    const address = addresses[index];
    if (result.status === 'fulfilled') {
      balanceMap.set(address, result.value.balance);
    } else {
      // 查询失败时，默认余额为 0
      balanceMap.set(address, 0n);
      console.warn(`[AsyncChain] Failed to query balance for ${address}:`, result.reason);
    }
  });

  return balanceMap;
}

/**
 * 并行查询多个交易的状态
 */
export async function queryTransactionStatusBatch(
  provider: ethers.Provider,
  txHashes: string[]
): Promise<Map<string, ethers.TransactionReceipt | null>> {
  if (txHashes.length === 0) {
    return new Map();
  }

  // 并行查询所有交易
  const promises = txHashes.map(async (txHash) => {
    try {
      const receipt = await withRetry(
        async () => {
          return await provider.getTransactionReceipt(txHash);
        },
        {
          ...CHAIN_RPC_RETRY_OPTIONS,
          onRetry: (attempt: number, error: Error) => {
            console.warn(`[AsyncChain] Retry attempt ${attempt} for tx ${txHash}: ${error.message}`);
          }
        }
      );
      return { txHash, receipt, error: null };
    } catch (error) {
      console.error(`[AsyncChain] Failed to get transaction receipt for ${txHash}:`, error);
      return { txHash, receipt: null, error: error instanceof Error ? error : new Error(String(error)) };
    }
  });

  const results = await Promise.allSettled(promises);
  const receiptMap = new Map<string, ethers.TransactionReceipt | null>();

  results.forEach((result, index) => {
    const txHash = txHashes[index];
    if (result.status === 'fulfilled') {
      receiptMap.set(txHash, result.value.receipt);
    } else {
      receiptMap.set(txHash, null);
      console.warn(`[AsyncChain] Failed to query transaction ${txHash}:`, result.reason);
    }
  });

  return receiptMap;
}
