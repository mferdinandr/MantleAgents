import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyJwt } from '../lib/auth.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      walletAddress: string;
    };
  }
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing authorization token' });
  }

  const jwt = authHeader.slice(7);

  const result = await verifyJwt(jwt);
  if (!result.valid || !result.sub) {
    return reply.status(401).send({ error: 'Invalid token' });
  }

  request.user = {
    walletAddress: result.sub,
  };
}
