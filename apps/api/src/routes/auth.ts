import type { FastifyInstance } from 'fastify';
import {
  buildSiwePayload,
  verifySiweMessage,
  issueJwt,
  type SiwePayload,
} from '../lib/auth.js';
import { authMiddleware } from '../middleware/auth.js';
import { createSupabaseAdmin } from '@mantleagents/db';

const supabaseAdmin = createSupabaseAdmin(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function authRoutes(app: FastifyInstance) {
  // Generate SIWE login payload
  app.post('/api/auth/payload', async (request, reply) => {
    const { address, chainId } = request.body as {
      address?: string;
      chainId?: number;
    };
    if (!address) {
      return reply.status(400).send({ error: 'address is required' });
    }
    return buildSiwePayload({ address, chainId });
  });

  // Verify SIWE signature and issue JWT
  app.post('/api/auth/login', async (request, reply) => {
    const { payload, signature } = request.body as {
      payload: SiwePayload;
      signature: string;
    };

    if (!payload?.message || !signature) {
      return reply.status(400).send({ error: 'payload and signature required' });
    }

    const result = await verifySiweMessage({
      message: payload.message,
      signature,
    });

    if (!result.valid || !result.address) {
      return reply.status(401).send({ error: 'Invalid signature' });
    }

    const token = await issueJwt(result.address);
    return { token };
  });

  // Get current user profile (protected)
  app.get(
    '/api/auth/me',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const walletAddress = request.user!.walletAddress;

      // Upsert user profile
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .upsert(
          { wallet_address: walletAddress },
          { onConflict: 'wallet_address' },
        )
        .select()
        .single();

      if (error) {
        return reply.status(500).send({ error: 'Failed to fetch user profile' });
      }

      return data;
    },
  );

  // Stateless JWT — token invalidation happens client-side.
  // For server-side revocation, implement a token blacklist.
  app.post('/api/auth/logout', async () => {
    return { success: true };
  });
}
