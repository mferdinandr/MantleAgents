import { createConfig, http, type CreateConnectorFn } from 'wagmi';
import { mantle, mantleSepoliaTestnet } from 'wagmi/chains';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';

function normalizeNetwork(network: string | undefined): 'mainnet' | 'testnet' {
  const value = network?.toLowerCase();
  return value === 'mainnet' || value === 'mantle' || value === 'mantle-mainnet'
    ? 'mainnet'
    : 'testnet';
}

const network = normalizeNetwork(process.env.NEXT_PUBLIC_MANTLE_NETWORK);
// Active network first — wagmi treats chains[0] as the default.
const chains =
  network === 'mainnet'
    ? ([mantle, mantleSepoliaTestnet] as const)
    : ([mantleSepoliaTestnet, mantle] as const);

const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

// MetaMask (injected) + Coinbase Wallet always available. WalletConnect is
// gated on a project id — omitted gracefully when unset.
const connectors: CreateConnectorFn[] = [
  injected(),
  coinbaseWallet({ appName: 'MantleAgents' }),
];

if (walletConnectProjectId) {
  connectors.push(walletConnect({ projectId: walletConnectProjectId }));
}

export const wagmiConfig = createConfig({
  chains,
  connectors,
  transports: {
    [mantle.id]: http(),
    [mantleSepoliaTestnet.id]: http(),
  },
  ssr: true,
});

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
}
