import 'dotenv/config';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import {
  createPublicClient,
  createWalletClient,
  erc20Abi,
  formatUnits,
  http,
  maxUint256,
  parseAbi,
  type Address,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  MANTLE_TESTNET_CHAIN,
  mantleExplorerAddressUrl,
} from '../../../apps/api/src/lib/chains.js';
import { compileContract } from './compile.js';

loadEnv({ path: path.resolve(import.meta.dirname, '../../../apps/api/.env') });

const RPC_URL =
  process.env.MANTLE_RPC_URL || MANTLE_TESTNET_CHAIN.rpcUrls.default.http[0];
const PRIVATE_KEY = process.env.EVM_SIGNER_PRIVATE_KEY as `0x${string}` | undefined;

if (!PRIVATE_KEY) {
  throw new Error(
    'EVM_SIGNER_PRIVATE_KEY is required (deployer wallet, needs MNT testnet gas)',
  );
}

const account = privateKeyToAccount(PRIVATE_KEY);
const transport = http(RPC_URL);
const publicClient = createPublicClient({
  chain: MANTLE_TESTNET_CHAIN,
  transport,
});
const walletClient = createWalletClient({
  account,
  chain: MANTLE_TESTNET_CHAIN,
  transport,
});

const faucetAbi = parseAbi(['function faucet()']);

const SEED_AMOUNTS: Record<string, bigint> = {
  USDC: 25_000n,
  USDT: 25_000n,
  WMNT: 5_000n,
};

type PairSpec = {
  label: string;
  tokenA: { symbol: string; address: Address; decimals: number };
  tokenB: { symbol: string; address: Address; decimals: number };
};

function requireAddress(envVar: string): Address {
  const value = process.env[envVar];
  if (!value) {
    throw new Error(`${envVar} must be set in apps/api/.env before deploying the DEX`);
  }
  return value as Address;
}

function toUnits(symbol: string, decimals: number): bigint {
  const whole = SEED_AMOUNTS[symbol];
  if (whole == null) {
    throw new Error(`No seed amount configured for ${symbol}`);
  }
  return whole * 10n ** BigInt(decimals);
}

async function waitForDeploy(hash: `0x${string}`): Promise<Address> {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== 'success') {
    throw new Error(`Deployment transaction ${hash} reverted`);
  }
  if (!receipt.contractAddress) {
    throw new Error(`Missing contractAddress for deployment tx ${hash}`);
  }
  return receipt.contractAddress;
}

async function waitForPairAddress(
  factoryAddress: Address,
  factoryAbi: any[],
  tokenA: Address,
  tokenB: Address,
): Promise<Address> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const pairAddress = await publicClient.readContract({
      address: factoryAddress,
      abi: factoryAbi,
      functionName: 'getPair',
      args: [tokenA, tokenB],
    });

    if (pairAddress !== '0x0000000000000000000000000000000000000000') {
      return pairAddress;
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error(`Pair creation failed for ${tokenA}/${tokenB}`);
}

async function ensureApproved(token: Address, spender: Address, symbol: string) {
  const allowance = await publicClient.readContract({
    address: token,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [account.address, spender],
  });

  if (allowance >= maxUint256 / 2n) {
    return;
  }

  const approveHash = await walletClient.writeContract({
    address: token,
    abi: erc20Abi,
    functionName: 'approve',
    args: [spender, maxUint256],
    account,
    chain: MANTLE_TESTNET_CHAIN,
  });
  await publicClient.waitForTransactionReceipt({ hash: approveHash });
  console.log(`  approved ${symbol} for router: ${approveHash}`);
}

async function ensureFaucetClaim(token: Address, symbol: string) {
  try {
    const hash = await walletClient.writeContract({
      address: token,
      abi: faucetAbi,
      functionName: 'faucet',
      args: [],
      account,
      chain: MANTLE_TESTNET_CHAIN,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`  faucet claim for ${symbol}: ${hash}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`  faucet skipped for ${symbol}: ${message}`);
  }
}

async function main() {
  console.log(`Deployer: ${account.address}`);
  console.log(`RPC:      ${RPC_URL} (chainId ${MANTLE_TESTNET_CHAIN.id})`);

  const nativeBalance = await publicClient.getBalance({ address: account.address });
  console.log(`Balance:  ${nativeBalance} wei MNT`);

  const usdc = requireAddress('MANTLE_USDC_ADDRESS');
  const usdt = requireAddress('MANTLE_USDT_ADDRESS');
  const wmnt = requireAddress('MANTLE_WMNT_ADDRESS');

  const tokens = {
    USDC: { symbol: 'USDC', address: usdc, decimals: 6 },
    USDT: { symbol: 'USDT', address: usdt, decimals: 6 },
    WMNT: { symbol: 'WMNT', address: wmnt, decimals: 18 },
  } as const;

  const pairs: PairSpec[] = [
    { label: 'USDC/WMNT', tokenA: tokens.USDC, tokenB: tokens.WMNT },
    { label: 'USDT/WMNT', tokenA: tokens.USDT, tokenB: tokens.WMNT },
    { label: 'USDC/USDT', tokenA: tokens.USDC, tokenB: tokens.USDT },
  ];

  const [factoryCompiled, routerCompiled, pairCompiled, wethCompiled] = await Promise.all([
    compileContract('UniswapV2Factory.sol', 'UniswapV2Factory'),
    compileContract('UniswapV2Router02.sol', 'UniswapV2Router02'),
    compileContract('UniswapV2Pair.sol', 'UniswapV2Pair'),
    compileContract('WETH9.sol', 'WETH9'),
  ]);

  console.log('\nDeploying WETH9...');
  const wethHash = await walletClient.deployContract({
    abi: wethCompiled.abi,
    bytecode: wethCompiled.bytecode,
    args: [],
    account,
    chain: MANTLE_TESTNET_CHAIN,
  });
  const wethAddress = await waitForDeploy(wethHash);
  console.log(`  WETH9:    ${wethAddress}`);
  console.log(`  explorer: ${mantleExplorerAddressUrl(wethAddress)}`);

  console.log('\nDeploying UniswapV2Factory...');
  const factoryHash = await walletClient.deployContract({
    abi: factoryCompiled.abi,
    bytecode: factoryCompiled.bytecode,
    args: [account.address],
    account,
    chain: MANTLE_TESTNET_CHAIN,
  });
  const factoryAddress = await waitForDeploy(factoryHash);
  console.log(`  Factory:  ${factoryAddress}`);
  console.log(`  explorer: ${mantleExplorerAddressUrl(factoryAddress)}`);

  console.log('\nDeploying UniswapV2Router02...');
  const routerHash = await walletClient.deployContract({
    abi: routerCompiled.abi,
    bytecode: routerCompiled.bytecode,
    args: [factoryAddress, wethAddress],
    account,
    chain: MANTLE_TESTNET_CHAIN,
  });
  const routerAddress = await waitForDeploy(routerHash);
  console.log(`  Router:   ${routerAddress}`);
  console.log(`  explorer: ${mantleExplorerAddressUrl(routerAddress)}`);

  try {
    const routerFactory = await publicClient.readContract({
      address: routerAddress,
      abi: routerCompiled.abi,
      functionName: 'factory',
      args: [],
    });
    const routerWeth = await publicClient.readContract({
      address: routerAddress,
      abi: routerCompiled.abi,
      functionName: 'WETH',
      args: [],
    });

    console.log(`  Router factory(): ${routerFactory}`);
    console.log(`  Router WETH():    ${routerWeth}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`  Router getter verification skipped: ${message}`);
  }

  console.log('\nPreparing mock-token liquidity...');
  for (const token of Object.values(tokens)) {
    await ensureFaucetClaim(token.address, token.symbol);
    await ensureApproved(token.address, routerAddress, token.symbol);
    const balance = await publicClient.readContract({
      address: token.address,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [account.address],
    });
    console.log(
      `  ${token.symbol} balance: ${formatUnits(balance, token.decimals)} ${token.symbol}`,
    );
  }

  for (const pair of pairs) {
    const amountA = toUnits(pair.tokenA.symbol, pair.tokenA.decimals);
    const amountB = toUnits(pair.tokenB.symbol, pair.tokenB.decimals);

    console.log(`\nSeeding ${pair.label}...`);
    const hash = await walletClient.writeContract({
      address: routerAddress,
      abi: routerCompiled.abi,
      functionName: 'addLiquidity',
      args: [
        pair.tokenA.address,
        pair.tokenB.address,
        amountA,
        amountB,
        0n,
        0n,
        account.address,
        BigInt(Math.floor(Date.now() / 1000) + 60 * 10),
      ],
      account,
      chain: MANTLE_TESTNET_CHAIN,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`  addLiquidity tx: ${hash}`);

    const pairAddress = await waitForPairAddress(
      factoryAddress,
      factoryCompiled.abi,
      pair.tokenA.address,
      pair.tokenB.address,
    );

    const reserves = await publicClient.readContract({
      address: pairAddress,
      abi: pairCompiled.abi,
      functionName: 'getReserves',
      args: [],
    });

    if (reserves[0] === 0n || reserves[1] === 0n) {
      throw new Error(`Pair ${pair.label} has zero reserves`);
    }

    console.log(`  pair:     ${pairAddress}`);
    console.log(`  explorer: ${mantleExplorerAddressUrl(pairAddress)}`);
    console.log(
      `  reserves: ${formatUnits(reserves[0], pair.tokenA.decimals)} ${pair.tokenA.symbol} / ` +
        `${formatUnits(reserves[1], pair.tokenB.decimals)} ${pair.tokenB.symbol}`,
    );
  }

  console.log('\n--- Add these to apps/api/.env ---\n');
  console.log(`MANTLE_DEX_ROUTER_ADDRESS=${routerAddress}`);
  console.log(`MANTLE_DEX_FACTORY_ADDRESS=${factoryAddress}`);
  console.log(`# Informational only: deployed WETH9 address = ${wethAddress}`);
  console.log('\nKeep the relayer funded with Mantle Sepolia MNT so swaps can keep paying gas.');
}

main().catch((error) => {
  console.error('Deploy failed:', error);
  process.exit(1);
});
