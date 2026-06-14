/**
 * Relayer wallet for MantleAgents.
 *
 * A single self-hosted relayer wallet, derived from EVM_SIGNER_PRIVATE_KEY via
 * viem, signs and broadcasts all execution-layer transactions and pays their
 * gas on Mantle (see chains.ts). This replaces Thirdweb's managed per-user
 * server wallets and sponsored (EIP-7702) transactions — there is no external
 * provisioning and no paid relayer.
 *
 * The private key never leaves this module.
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  type PrivateKeyAccount,
  type PublicClient,
  type WalletClient,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { MANTLE_CHAIN, mantleRpcUrl } from './chains.js';

export interface Relayer {
  account: PrivateKeyAccount;
  walletClient: WalletClient;
  publicClient: PublicClient;
  address: `0x${string}`;
}

let _relayer: Relayer | undefined;

/**
 * Memoized relayer backed by EVM_SIGNER_PRIVATE_KEY, targeting the configured
 * Mantle network. Throws if the key is unset (fail-loud).
 */
export function getRelayer(): Relayer {
  if (_relayer) return _relayer;

  const pk = process.env.EVM_SIGNER_PRIVATE_KEY as `0x${string}` | undefined;
  if (!pk) {
    throw new Error('EVM_SIGNER_PRIVATE_KEY is required for the relayer wallet');
  }

  const account = privateKeyToAccount(pk);
  const transport = http(mantleRpcUrl());
  const walletClient = createWalletClient({
    account,
    chain: MANTLE_CHAIN,
    transport,
  });
  const publicClient = createPublicClient({
    chain: MANTLE_CHAIN,
    transport,
  });

  _relayer = { account, walletClient, publicClient, address: account.address };
  return _relayer;
}

/**
 * Broadcast an execution-layer transaction through the relayer (which signs and
 * pays gas), wait for the receipt, and return the on-chain transaction hash.
 *
 * Drop-in replacement for the old `sendTransactionFromServerWallet(addr, tx)` —
 * callers no longer pass a per-user wallet address.
 */
export async function sendRelayerTransaction(tx: {
  to: string;
  data: string;
  value?: bigint | string;
}): Promise<`0x${string}`> {
  const { walletClient, publicClient, account } = getRelayer();

  const value =
    tx.value === undefined
      ? 0n
      : typeof tx.value === 'bigint'
        ? tx.value
        : BigInt(tx.value);

  const hash = await walletClient.sendTransaction({
    account,
    chain: MANTLE_CHAIN,
    to: tx.to as `0x${string}`,
    data: tx.data as `0x${string}`,
    value,
  });

  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export interface CreateServerWalletResult {
  address: string;
}

/**
 * Replacement for Thirdweb's `createServerWallet(identifier)`: returns the
 * shared relayer address without provisioning any external wallet. Call sites
 * keep storing a wallet address against the user; that address is now the
 * relayer's.
 */
export async function createServerWallet(
  _identifier: string,
): Promise<CreateServerWalletResult> {
  return { address: getRelayer().address };
}
