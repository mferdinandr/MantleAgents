import { randomUUID } from 'node:crypto';
import { createPublicClient, http, keccak256, stringToBytes } from 'viem';
import { attestationRegistryAbi } from '../abis/attestation-registry.js';
import {
  MANTLE_CHAIN,
  getAttestationRegistryAddress,
  mantleExplorerTxUrl,
  mantleRpcUrl,
} from '../lib/chains.js';
import { commitAttestationOnChain } from './attestation-service.js';

const shouldRun =
  process.env.RUN_MANTLE_INTEGRATION === '1' && Boolean(process.env.ATTESTATION_TEST_AGENT_ID);

describe.skipIf(!shouldRun)('attestation on-chain integration', () => {
  it('commits a dummy attestation and reads it back from Mantle', async () => {
    const agentId = BigInt(process.env.ATTESTATION_TEST_AGENT_ID!);
    const runId = `integration-${randomUUID()}`;
    const eventsHash = 'a'.repeat(64);
    const decisionHash = 'b'.repeat(64);

    const commitTxHash = await commitAttestationOnChain({
      agentId,
      runId,
      eventsHash,
      decisionHash,
      tradeCount: 1,
    });

    expect(commitTxHash).toMatch(/^0x[a-fA-F0-9]{64}$/);

    const publicClient = createPublicClient({
      chain: MANTLE_CHAIN,
      transport: http(mantleRpcUrl()),
    });
    const runIdHash = keccak256(stringToBytes(runId));

    const attestation = await publicClient.readContract({
      address: getAttestationRegistryAddress(),
      abi: attestationRegistryAbi,
      functionName: 'getAttestation',
      args: [agentId, runIdHash],
    });

    expect(attestation).toEqual([
      `0x${eventsHash}`,
      `0x${decisionHash}`,
      1n,
      expect.any(BigInt),
      true,
    ]);

    console.log('Mantle explorer tx:', mantleExplorerTxUrl(commitTxHash!));
  });
});
