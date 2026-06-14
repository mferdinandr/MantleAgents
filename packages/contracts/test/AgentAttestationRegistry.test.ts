import { randomUUID } from 'node:crypto';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  http,
  keccak256,
  stringToBytes,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { foundry } from 'viem/chains';
import { compileContract } from '../scripts/compile.js';

const ANVIL_PORT = 8547;
const ANVIL_URL = `http://127.0.0.1:${ANVIL_PORT}`;
const DEFAULT_PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const;
const EVENTS_HASH =
  '0x1111111111111111111111111111111111111111111111111111111111111111' as const;
const DECISION_HASH =
  '0x2222222222222222222222222222222222222222222222222222222222222222' as const;

let anvilProcess: ChildProcessWithoutNullStreams | null = null;

async function waitForAnvil() {
  const publicClient = createPublicClient({
    chain: foundry,
    transport: http(ANVIL_URL),
  });

  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      await publicClient.getBlockNumber();
      return;
    } catch {
      await delay(250);
    }
  }

  throw new Error('Timed out waiting for anvil to start');
}

beforeAll(async () => {
  anvilProcess = spawn(
    'anvil',
    ['--host', '127.0.0.1', '--port', String(ANVIL_PORT)],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  anvilProcess.stdout.on('data', () => {});
  anvilProcess.stderr.on('data', () => {});

  await waitForAnvil();
});

afterAll(async () => {
  if (!anvilProcess) return;
  anvilProcess.kill('SIGTERM');
  await delay(250);
  if (!anvilProcess.killed) {
    anvilProcess.kill('SIGKILL');
  }
});

describe('AgentAttestationRegistry', () => {
  it('stores decisionHash, emits it in the event, and rejects duplicate runIds', async () => {
    const account = privateKeyToAccount(DEFAULT_PRIVATE_KEY);
    const publicClient = createPublicClient({
      chain: foundry,
      transport: http(ANVIL_URL),
    });
    const walletClient = createWalletClient({
      account,
      chain: foundry,
      transport: http(ANVIL_URL),
    });
    const { abi, bytecode } = await compileContract(
      'AgentAttestationRegistry.sol',
      'AgentAttestationRegistry',
    );

    const deployHash = await walletClient.deployContract({
      abi,
      bytecode,
      args: [],
      account,
      chain: foundry,
    });
    const deployReceipt = await publicClient.waitForTransactionReceipt({
      hash: deployHash,
    });

    const contractAddress = deployReceipt.contractAddress;
    expect(contractAddress).toBeDefined();

    const agentId = 42n;
    const runId = randomUUID();
    const runIdHash = keccak256(stringToBytes(runId));

    const commitHash = await walletClient.writeContract({
      address: contractAddress!,
      abi,
      functionName: 'commitAttestation',
      args: [agentId, runIdHash, EVENTS_HASH, DECISION_HASH, 3n],
      account,
      chain: foundry,
    });
    const commitReceipt = await publicClient.waitForTransactionReceipt({
      hash: commitHash,
    });

    const emittedEvent = commitReceipt.logs
      .filter((log) => log.address.toLowerCase() === contractAddress!.toLowerCase())
      .map((log) =>
        decodeEventLog({
          abi,
          eventName: 'AttestationCommitted',
          data: log.data,
          topics: log.topics,
        }),
      )[0];

    expect(emittedEvent.args.decisionHash).toBe(DECISION_HASH);

    const attestation = await publicClient.readContract({
      address: contractAddress!,
      abi,
      functionName: 'getAttestation',
      args: [agentId, runIdHash],
    });

    expect(attestation).toEqual([
      EVENTS_HASH,
      DECISION_HASH,
      3n,
      expect.any(BigInt),
      true,
    ]);

    await expect(
      walletClient.writeContract({
        address: contractAddress!,
        abi,
        functionName: 'commitAttestation',
        args: [agentId, runIdHash, EVENTS_HASH, DECISION_HASH, 3n],
        account,
        chain: foundry,
      }),
    ).rejects.toThrow(/AlreadyCommitted/);
  });
});
