'use client';

import { type ComponentProps, type ReactNode } from 'react';
import { useSiweAuth } from '@/hooks/use-siwe-auth';
import { Button } from '@/components/ui/button';

interface ConnectCTAProps extends Omit<ComponentProps<typeof Button>, 'onClick'> {
  children: ReactNode;
}

export function ConnectCTA({ children, ...buttonProps }: ConnectCTAProps) {
  const { connectors, signIn, isPending } = useSiweAuth();

  const handleClick = async () => {
    // Prefer the injected (MetaMask) connector for the marketing CTA; fall back
    // to whatever connector is available first.
    const connector =
      connectors.find((c) => c.type === 'injected') ?? connectors[0];
    if (!connector) return;
    await signIn(connector);
  };

  return (
    <Button
      {...buttonProps}
      onClick={handleClick}
      disabled={isPending || buttonProps.disabled}
    >
      {children}
    </Button>
  );
}
