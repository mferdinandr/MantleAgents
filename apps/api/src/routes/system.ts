import type { FastifyInstance } from 'fastify';
import { MANTLE_NETWORK } from '../lib/chains.js';
import { isRealClawConfigured } from '../services/realclaw-executor.js';

export async function systemRoutes(app: FastifyInstance) {
  app.get('/api/system/status', async () => {
    return {
      realClawConfigured: isRealClawConfigured(),
      network: MANTLE_NETWORK,
    };
  });
}
