import { ethers } from 'ethers';

export type Policy = {
  allowlist?: string[];
  maxAmount?: bigint;
  dailyLimit?: bigint;
};

export type PolicyDecision =
  | { ok: true }
  | { ok: false; code: 'NOT_IN_ALLOWLIST' | 'AMOUNT_EXCEEDS_MAX' | 'DAILY_LIMIT_EXCEEDED'; message: string };

export function normalizeAddresses(addrs: string[]): string[] {
  return addrs
    .map((a) => a.trim())
    .filter(Boolean)
    .map((a) => ethers.getAddress(a));
}

export function evaluatePolicy(args: {
  policy: Policy;
  recipient: string;
  amount: bigint;
  spentToday?: bigint; // in token units
}): PolicyDecision {
  const recipient = ethers.getAddress(args.recipient);
  const { policy, amount } = args;

  if (policy.allowlist && policy.allowlist.length > 0) {
    const ok = policy.allowlist.some((a) => ethers.getAddress(a) === recipient);
    if (!ok) {
      return {
        ok: false,
        code: 'NOT_IN_ALLOWLIST',
        message: `收款地址不在白名单：${recipient}`
      };
    }
  }

  if (policy.maxAmount !== undefined && amount > policy.maxAmount) {
    return {
      ok: false,
      code: 'AMOUNT_EXCEEDS_MAX',
      message: `单笔金额超过上限：amount=${amount.toString()} max=${policy.maxAmount.toString()}`
    };
  }

  if (policy.dailyLimit !== undefined) {
    const spent = args.spentToday ?? 0n;
    if (spent + amount > policy.dailyLimit) {
      return {
        ok: false,
        code: 'DAILY_LIMIT_EXCEEDED',
        message: `日累计超过限额：spent=${spent.toString()} + amount=${amount.toString()} > dailyLimit=${policy.dailyLimit.toString()}`
      };
    }
  }

  return { ok: true };
}

