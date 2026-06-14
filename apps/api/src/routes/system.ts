import type { FastifyInstance } from 'fastify';
import { isMantleDexConfigured, MANTLE_NETWORK } from '../lib/chains.js';

export async function systemRoutes(app: FastifyInstance) {
  app.get('/api/system/status', async () => {
    return {
      dexConfigured: isMantleDexConfigured(),
      network: MANTLE_NETWORK,
    };
  });
}
