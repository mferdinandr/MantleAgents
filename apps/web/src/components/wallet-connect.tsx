'use client';

import { useAccount, useDisconnect } from 'wagmi';
import { useAuth } from '@/providers/auth-provider';
import { useSiweAuth } from '@/hooks/use-siwe-auth';
import { shortenAddress } from '@/lib/format';
import { Button } from '@/components/ui/button';

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { isAuthenticated, handleLogout } = useAuth();
  const { connectors, signIn, isPending } = useSiweAuth();

  // Connected + signed in → show address + disconnect.
  if (isConnected && isAuthenticated) {
    return (
      <div className="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2">
        <span className="font-mono text-sm">
          {address ? shortenAddress(address) : 'Connected'}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            await handleLogout();
            disconnect();
          }}
        >
          Disconnect
        </Button>
      </div>
    );
  }

  // Otherwise present a connector per available wallet.
  return (
    <div className="flex w-full flex-col gap-2">
      {connectors.map((connector) => (
        <Button
          key={connector.uid}
          onClick={() => signIn(connector)}
          disabled={isPending}
          className="!w-full justify-center"
        >
          {isPending ? 'Connecting…' : `Connect ${connector.name}`}
        </Button>
      ))}
    </div>
  );
}
