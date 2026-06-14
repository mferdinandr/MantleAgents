// compile.ts — compiles Solidity contracts with local import resolution and
// the correct solc version for each contract family.

import fs from 'node:fs';
import path from 'node:path';
import solcLatest from 'solc';
import solc05 from 'solc-0-5';
import solc06 from 'solc-0-6';

export interface CompiledContract {
  abi: any[];
  bytecode: `0x${string}`;
}

type SolcCompiler = {
  compile(input: string, callbacks?: { import: (importPath: string) => { contents?: string; error?: string } }): string;
};

const contractsDir = path.resolve(import.meta.dirname, '..', 'contracts');
const packageDir = path.resolve(import.meta.dirname, '..');

function readContractSource(contractFilename: string): string {
  const fullPath = path.join(contractsDir, contractFilename);
  return fs.readFileSync(fullPath, 'utf8');
}

function pickCompiler(source: string): SolcCompiler {
  if (source.includes('pragma solidity =0.5.16;')) {
    return solc05 as unknown as SolcCompiler;
  }

  if (source.includes('pragma solidity =0.6.6;')) {
    return solc06 as unknown as SolcCompiler;
  }

  return solcLatest as unknown as SolcCompiler;
}

function resolveImport(importPath: string): { contents?: string; error?: string } {
  const candidates = [
    path.resolve(contractsDir, importPath),
    path.resolve(packageDir, 'node_modules', importPath),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return { contents: fs.readFileSync(candidate, 'utf8') };
    }
  }

  return { error: `File not found: ${importPath}` };
}

export async function compileContract(
  contractFilename: string,
  contractName: string,
): Promise<CompiledContract> {
  const source = readContractSource(contractFilename);
  const compiler = pickCompiler(source);

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

  const output = JSON.parse(
    compiler.compile(JSON.stringify(input), {
      import: resolveImport,
    }),
  );

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
