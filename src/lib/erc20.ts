import { ethers } from 'ethers';

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

export function erc20Interface(): ethers.Interface {
  return new ethers.Interface(ERC20_ABI);
}

export async function getTokenDecimals(provider: ethers.Provider, token: string): Promise<number> {
  const c = new ethers.Contract(token, ERC20_ABI, provider);
  const d: number = await c.decimals();
  return Number(d);
}

/** 查询某地址的 ERC20 余额（用于风控上下文） */
export async function getTokenBalance(
  provider: ethers.Provider,
  token: string,
  account: string
): Promise<bigint> {
  const c = new ethers.Contract(token, ERC20_ABI, provider);
  const balance: bigint = await c.balanceOf(account);
  return balance;
}

export async function transferErc20(args: {
  token: string;
  signer: ethers.Signer;
  to: string;
  amount: bigint;
}): Promise<{ txHash: string }> {
  const c = new ethers.Contract(args.token, ERC20_ABI, args.signer);
  const tx = await c.transfer(args.to, args.amount);
  const receipt = await tx.wait();
  if (!receipt) throw new Error('交易未返回 receipt（可能未被打包）');
  return { txHash: receipt.hash };
}

