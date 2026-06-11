// compile.ts — compiles a .sol file with solc and returns ABI + bytecode
// for deployment via viem.

import fs from 'node:fs';
import path from 'node:path';
import solc from 'solc';

export interface CompiledContract {
  abi: any[];
  bytecode: `0x${string}`;
}

export function compileContract(
  contractFilename: string,
  contractName: string,
): CompiledContract {
  const contractsDir = path.resolve(import.meta.dirname, '..', 'contracts');
  const fullPath = path.join(contractsDir, contractFilename);
  const source = fs.readFileSync(fullPath, 'utf8');

  const input = {
    language: 'Solidity',
    sources: {
      [contractFilename]: { content: source },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode.object'],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const fatal = output.errors.filter((e: any) => e.severity === 'error');
    for (const err of output.errors) {
      console.warn(err.formattedMessage ?? err.message);
    }
    if (fatal.length > 0) {
      throw new Error(`Solidity compilation failed for ${contractFilename}`);
    }
  }

  const contract = output.contracts[contractFilename][contractName];
  return {
    abi: contract.abi,
    bytecode: `0x${contract.evm.bytecode.object}` as `0x${string}`,
  };
}
