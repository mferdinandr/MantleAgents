import { compileContract } from './compile.js';

const CONTRACTS: Array<[string, string]> = [
  ['MockERC20.sol', 'MockERC20'],
  ['AgentAttestationRegistry.sol', 'AgentAttestationRegistry'],
  ['UniswapV2Factory.sol', 'UniswapV2Factory'],
  ['UniswapV2Pair.sol', 'UniswapV2Pair'],
  ['UniswapV2Router02.sol', 'UniswapV2Router02'],
  ['WETH9.sol', 'WETH9'],
];

async function main() {
  for (const [filename, name] of CONTRACTS) {
    const compiled = await compileContract(filename, name);
    console.log(
      `${name}: abiItems=${compiled.abi.length} bytecodeBytes=${(compiled.bytecode.length - 2) / 2}`,
    );
  }
}

main().catch((error) => {
  console.error('Compile failed:', error);
  process.exit(1);
});
