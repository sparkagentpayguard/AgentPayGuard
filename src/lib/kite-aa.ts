import { ethers } from 'ethers';
import { GokiteAASDK } from 'gokite-aa-sdk';
import { erc20Interface } from './erc20.js';

export async function probeKiteAASdk() {
  // For debugging only: help quickly understand module exports on the judge machine
  const mod: any = await import('gokite-aa-sdk');
  const keys = Object.keys(mod).sort();
  return { keys };
}

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
    // Sign the AA userOpHash with the EOA (for demo; production typically uses social login SDK)
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

