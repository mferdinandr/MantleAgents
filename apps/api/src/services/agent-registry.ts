import {
  createPublicClient,
  createWalletClient,
  http,
  encodeFunctionData,
  decodeEventLog,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { identityAbi } from '../abis/identity.js';
import { reputationAbi } from '../abis/reputation.js';
import {
  MANTLE_CHAIN,
  MANTLE_CHAIN_ID,
  mantleRpcUrl,
  getIdentityRegistryAddress,
  getReputationRegistryAddress,
} from '../lib/chains.js';

/**
 * Get a viem walletClient backed by EVM_SIGNER_PRIVATE_KEY, targeting Mantle
 * (mainnet or testnet, controlled by MANTLE_NETWORK).
 * Used for all on-chain registration calls (no Thirdweb bundler required).
 */
function getEvmWalletClient() {
  const pk = process.env.EVM_SIGNER_PRIVATE_KEY as `0x${string}` | undefined;
  if (!pk) throw new Error('EVM_SIGNER_PRIVATE_KEY is required for on-chain registration');
  const account = privateKeyToAccount(pk);
  const client = createWalletClient({ account, chain: MANTLE_CHAIN, transport: http(mantleRpcUrl()) });
  return { client, account };
}

async function sendTx(to: `0x${string}`, data: `0x${string}`): Promise<`0x${string}`> {
  const { client, account } = getEvmWalletClient();
  return client.sendTransaction({ to, data, chain: MANTLE_CHAIN, account });
}

const IDENTITY_REGISTRY_ADDRESS = getIdentityRegistryAddress();
const REPUTATION_REGISTRY_ADDRESS = getReputationRegistryAddress();

const publicClient = createPublicClient({
  chain: MANTLE_CHAIN,
  transport: http(mantleRpcUrl()),
});

/**
 * Register an agent on-chain via ERC-8004 IdentityRegistry.
 * Flow:
 *   1. Server wallet calls register(agentURI) → mints NFT, returns agentId
 *   2. Server wallet calls setAgentWallet(agentId, serverWalletAddress, deadline, signature)
 *      where signature is EIP-712 from serverWallet authorising itself as the agent wallet
 */
export async function registerAgentOnChain(params: {
  userWalletAddress: string;
  serverWalletId: string;
  serverWalletAddress: string;
  metadataUrl: string;
}): Promise<{ agentId: bigint; registerTxHash: string; linkTxHash: string }> {
  const { serverWalletAddress, metadataUrl } = params;

  // Step 1: register(agentURI)
  const registerData = encodeFunctionData({
    abi: identityAbi,
    functionName: 'register',
    args: [metadataUrl],
  });

  const registerTxHash = await sendTx(IDENTITY_REGISTRY_ADDRESS, registerData);

  // Parse Registered event to get agentId
  const receipt = await publicClient.waitForTransactionReceipt({ hash: registerTxHash });
  let agentId: bigint | undefined;

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== IDENTITY_REGISTRY_ADDRESS.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({
        abi: identityAbi,
        eventName: 'Registered',
        data: log.data,
        topics: log.topics,
        strict: false,
      });
      agentId = (decoded.args as unknown as { agentId: bigint }).agentId;
      if (agentId !== undefined) break;
    } catch {
      // fallback: agentId is topics[1] for Registered event
      if (log.topics[1]) {
        agentId = BigInt(log.topics[1]);
        break;
      }
    }
  }

  if (agentId === undefined) {
    throw new Error('Failed to parse agentId from Registered event');
  }

  // Step 2: setAgentWallet — link EVM wallet as execution wallet (best-effort)
  let linkTxHash = '';
  try {
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60); // 60s — contract has tight window
    const evmAddress = getEvmWalletClient().account.address;
    const { signature } = await prepareAgentWalletLink('', evmAddress, agentId, evmAddress);
    const linkData = encodeFunctionData({
      abi: identityAbi,
      functionName: 'setAgentWallet',
      args: [agentId, evmAddress, deadline, signature],
    });
    linkTxHash = await sendTx(IDENTITY_REGISTRY_ADDRESS, linkData);
  } catch (err) {
    // Non-fatal: agent is registered on-chain, wallet link can be retried later
    console.warn('[8004] setAgentWallet failed (non-fatal):', err instanceof Error ? err.message : err);
  }

  return { agentId, registerTxHash, linkTxHash };
}

/**
 * Prepare EIP-712 typed data signature for setAgentWallet.
 * The server wallet signs to authorise itself as the agent execution wallet.
 */
export async function prepareAgentWalletLink(
  _serverWalletId: string,
  walletAddress: string,
  agentId: bigint,
  _ownerAddress: string,
): Promise<{ signature: `0x${string}`; deadline: bigint; serverWalletAddress: string }> {
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const { client, account } = getEvmWalletClient();

  const signature = await client.signTypedData({
    account,
    domain: {
      name: 'ERC8004IdentityRegistry',
      version: '1',
      chainId: MANTLE_CHAIN_ID,
      verifyingContract: IDENTITY_REGISTRY_ADDRESS,
    },
    types: {
      AgentWalletSet: [
        { name: 'agentId', type: 'uint256' },
        { name: 'newWallet', type: 'address' },
        { name: 'deadline', type: 'uint256' },
      ],
    },
    primaryType: 'AgentWalletSet',
    message: {
      agentId,
      newWallet: walletAddress as `0x${string}`,
      deadline,
    },
  });

  return { signature, deadline, serverWalletAddress: walletAddress };
}

/**
 * Submit trade feedback to the ReputationRegistry.
 */
export async function submitTradeFeedback(params: {
  serverWalletId: string;
  serverWalletAddress: string;
  agentId: bigint;
  reasoning: string;
  currency: string;
  direction: string;
  tradeTxHash: string;
}): Promise<string> {
  const { serverWalletAddress, agentId, currency, direction, tradeTxHash } = params;

  // value: +1 for buy/long, -1 for sell/short (scaled by 1e2)
  const value = direction === 'buy' ? BigInt(100) : BigInt(-100);
  const feedbackHash = tradeTxHash as `0x${string}`;

  const data = encodeFunctionData({
    abi: reputationAbi,
    functionName: 'giveFeedback',
    args: [
      agentId,
      value,
      2, // valueDecimals = 2 (value is x100)
      currency,
      direction,
      '', // endpoint
      '', // feedbackURI
      feedbackHash,
    ],
  });

  const txHash = await sendTx(REPUTATION_REGISTRY_ADDRESS, data);

  return txHash;
}

/**
 * Read on-chain reputation summary for an agent.
 */
export async function getAgentReputation(_agentId: bigint): Promise<{
  feedbackCount: number;
  summaryValue: number;
  summaryDecimals: number;
}> {
  try {
    const result = await publicClient.readContract({
      address: REPUTATION_REGISTRY_ADDRESS,
      abi: reputationAbi,
      functionName: 'getSummary',
      args: [_agentId, [], '', ''],
    }) as [bigint, bigint, number];

    return {
      feedbackCount: Number(result[0]),
      summaryValue: Number(result[1]),
      summaryDecimals: result[2],
    };
  } catch {
    return { feedbackCount: 0, summaryValue: 0, summaryDecimals: 0 };
  }
}

/**
 * Read on-chain identity information for an agent.
 */
export async function getAgentOnChainInfo(_agentId: bigint): Promise<{
  owner: string;
  metadataUri: string;
  agentWallet: string;
}> {
  const [owner, metadataUri, agentWallet] = await Promise.all([
    publicClient.readContract({
      address: IDENTITY_REGISTRY_ADDRESS,
      abi: identityAbi,
      functionName: 'ownerOf',
      args: [_agentId],
    }) as Promise<string>,
    publicClient.readContract({
      address: IDENTITY_REGISTRY_ADDRESS,
      abi: identityAbi,
      functionName: 'tokenURI',
      args: [_agentId],
    }) as Promise<string>,
    publicClient.readContract({
      address: IDENTITY_REGISTRY_ADDRESS,
      abi: identityAbi,
      functionName: 'getAgentWallet',
      args: [_agentId],
    }) as Promise<string>,
  ]);

  return { owner, metadataUri, agentWallet };
}
