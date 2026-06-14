'use client';

import { useCallback, useState } from 'react';
import { useConnect, useSignMessage, type Connector } from 'wagmi';
import { generatePayload, login } from '@/lib/auth';
import { useAuth } from '@/providers/auth-provider';

/** Shape returned by POST /api/auth/payload (see API lib/auth.ts). */
interface SiwePayload {
  message: string;
  address: string;
  nonce: string;
}

/**
 * Wallet connect + SIWE sign-in flow shared by the connect button and CTA.
 *
 * connect (wagmi) → request SIWE payload → sign the message → exchange it for a
 * JWT at /api/auth/login → update auth state via handleLogin. Reuses the
 * existing lib/auth.ts helpers unchanged. On user rejection or failure no token
 * is stored and the session stays unauthenticated.
 */
export function useSiweAuth() {
  const { connectors, connectAsync } = useConnect();
  const { signMessageAsync } = useSignMessage();
  const { handleLogin } = useAuth();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(
    async (connector: Connector) => {
      setIsPending(true);
      setError(null);
      try {
        const { accounts } = await connectAsync({ connector });
        const address = accounts[0];
        if (!address) throw new Error('No account returned from wallet');

        const payload = (await generatePayload({ address })) as SiwePayload;
        const signature = await signMessageAsync({
          account: address,
          message: payload.message,
        });

        const jwt = await login({ payload, signature });
        await handleLogin(jwt, payload.address);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Connection failed');
      } finally {
        setIsPending(false);
      }
    },
    [connectAsync, signMessageAsync, handleLogin],
  );

  return { connectors, signIn, isPending, error };
}
