import type { FastifyInstance } from 'fastify';
import { erc20Abi, formatUnits, parseUnits, type Address } from 'viem';
import { authMiddleware } from '../middleware/auth.js';
import { createSupabaseAdmin, type Database } from '@mantleagents/db';
import {
  BASE_TOKENS,
  STABLE_TOKENS,
  COMMODITY_TOKENS,
} from '@mantleagents/shared';
import { executeSwap, sendTokens } from '../services/trade-executor.js';
import { getUniswapQuote } from '../services/uniswap-swap.js';
import { chainClient } from '../lib/chain-client.js';
import {
  findMantleTokenByAddress,
  getMantleTokenBySymbol,
} from '../lib/chains.js';

const supabaseAdmin = createSupabaseAdmin(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const ALL_SWAP_TOKENS = new Set<string>([...BASE_TOKENS, ...STABLE_TOKENS, ...COMMODITY_TOKENS]);
const SEND_TOKENS = new Set<string>([
  ...ALL_SWAP_TOKENS,
  'WETH',
  'WBTC',
  'NATIVE',
  'stNATIVE',
]);
const VALID_FROM_TOKENS = new Set<string>(BASE_TOKENS);
const VALID_TO_TOKENS = new Set<string>([...STABLE_TOKENS, ...COMMODITY_TOKENS]);

function isValidFromToken(token: string): boolean {
  return VALID_FROM_TOKENS.has(token);
}

function isValidToToken(token: string): boolean {
  return VALID_TO_TOKENS.has(token);
}

function isValidTxHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

type ResolvedMantleToken = {
  symbol: string;
  address: Address;
  decimals: number;
};

function resolveMantleToken(input: string | undefined): ResolvedMantleToken | null {
  if (!input) return null;

  if (/^0x[a-fA-F0-9]{40}$/.test(input)) {
    const byAddress = findMantleTokenByAddress(input);
    if (!byAddress) return null;
    return byAddress;
  }

  const bySymbol = getMantleTokenBySymbol(input);
  if (!bySymbol) return null;
  return bySymbol;
}

export async function tradeRoutes(app: FastifyInstance) {
  // POST /api/trade/quote
  app.post(
    '/api/trade/quote',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const body = request.body as {
        from?: string;
        to?: string;
        amount?: string;
        slippage?: number;
        tokenIn?: string;
        tokenOut?: string;
        amountIn?: string;
      };

      const tokenIn = resolveMantleToken(body.tokenIn ?? body.from);
      const tokenOut = resolveMantleToken(body.tokenOut ?? body.to);
      const amount = body.amountIn ?? body.amount;
      const slippagePct = body.slippage ?? 0.5;

      if (!tokenIn || !tokenOut || !amount || Number(amount) <= 0) {
        return reply.status(400).send({
          error: 'Valid token pair and positive amount are required',
        });
      }

      try {
        const amountIn = parseUnits(amount, tokenIn.decimals);
        const quote = await getUniswapQuote({
          tokenIn: tokenIn.address,
          tokenOut: tokenOut.address,
          amountIn,
        });

        if (!quote) {
          return reply.status(404).send({
            error: 'No route or liquidity available for this pair',
          });
        }

        const minimumAmountOut =
          (quote.amountOut * BigInt(10_000 - Math.round(slippagePct * 100))) / 10_000n;

        return {
          estimatedAmountOut: formatUnits(quote.amountOut, tokenOut.decimals),
          minimumAmountOut: formatUnits(minimumAmountOut, tokenOut.decimals),
          exchangeRate:
            (Number(formatUnits(quote.amountOut, tokenOut.decimals)) /
              Math.max(Number(amount), Number.EPSILON)).toFixed(6),
          priceImpact: 0,
          path: quote.path,
        };
      } catch (error) {
        request.log.error({ err: error }, '[trade] quote failed');
        return reply.status(500).send({
          error: error instanceof Error ? error.message : 'Failed to quote trade',
        });
      }
    },
  );

  // POST /api/trade/execute — record a completed swap
  app.post(
    '/api/trade/execute',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const walletAddress = request.user!.walletAddress;
      const body = request.body as {
        txHash?: string;
        from?: string;
        to?: string;
        amountIn?: string;
        amountOut?: string;
        exchangeRate?: string;
      };

      const { txHash, from, to, amountIn, amountOut, exchangeRate } = body;

      if (!txHash || !isValidTxHash(txHash)) {
        return reply.status(400).send({ error: 'Invalid transaction hash' });
      }

      if (!from || !to || !amountIn || !amountOut) {
        return reply
          .status(400)
          .send({ error: 'Missing required fields: from, to, amountIn, amountOut' });
      }

      try {
        // Look up user
        const { data: user, error: userError } = await supabaseAdmin
          .from('user_profiles')
          .select('id')
          .eq('wallet_address', walletAddress)
          .single();

        if (userError || !user) {
          return reply.status(404).send({ error: 'User profile not found' });
        }

        // Insert transaction record
        const { data, error } = await supabaseAdmin
          .from('transactions')
          .insert({
            user_id: user.id,
            type: 'swap' as const,
            source_token: from,
            target_token: to,
            source_amount: parseFloat(amountIn),
            target_amount: parseFloat(amountOut),
            exchange_rate: exchangeRate ? parseFloat(exchangeRate) : null,
            tx_hash: txHash,
            status: 'confirmed' as const,
          })
          .select('id')
          .single();

        if (error) {
          console.error('Failed to record transaction:', error);
          return reply
            .status(500)
            .send({ error: 'Failed to record transaction' });
        }

        return { id: data.id, status: 'confirmed' };
      } catch (err) {
        console.error('Execute error:', err);
        return reply
          .status(500)
          .send({ error: 'Failed to record transaction' });
      }
    },
  );

  // GET /api/trade/history
  app.get(
    '/api/trade/history',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const walletAddress = request.user!.walletAddress;
      const query = request.query as {
        page?: string;
        limit?: string;
        token?: string;
        status?: string;
      };

      const page = Math.max(1, parseInt(query.page || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(query.limit || '50', 10)));
      const offset = (page - 1) * limit;

      try {
        // Look up user
        const { data: user, error: userError } = await supabaseAdmin
          .from('user_profiles')
          .select('id')
          .eq('wallet_address', walletAddress)
          .single();

        if (userError || !user) {
          return reply.status(404).send({ error: 'User profile not found' });
        }

        // Build query
        let dbQuery = supabaseAdmin
          .from('transactions')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('type', 'swap')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (query.token) {
          // Validate token against known symbols to prevent injection
          const validTokens: Set<string> = new Set([...BASE_TOKENS, ...STABLE_TOKENS, ...COMMODITY_TOKENS]);
          if (!validTokens.has(query.token as string)) {
            return reply.status(400).send({ error: `Invalid token filter: ${query.token}` });
          }
          dbQuery = dbQuery.or(
            `source_token.eq.${query.token},target_token.eq.${query.token}`,
          );
        }

        if (query.status != null && query.status !== '') {
          const status = query.status as string;
          dbQuery = dbQuery.eq('status', status);
        }

        const { data, error, count } = await dbQuery;

        if (error) {
          console.error('Failed to fetch trade history:', error);
          return reply
            .status(500)
            .send({ error: 'Failed to fetch trade history' });
        }

        const total = count ?? 0;

        type TransactionRow = Database['public']['Tables']['transactions']['Row'];
        return {
          transactions: ((data ?? []) as TransactionRow[]).map((tx) => ({
            id: tx.id,
            type: tx.type,
            sourceToken: tx.source_token,
            targetToken: tx.target_token,
            sourceAmount: String(tx.source_amount),
            targetAmount: String(tx.target_amount),
            exchangeRate: tx.exchange_rate ? String(tx.exchange_rate) : null,
            txHash: tx.tx_hash,
            status: tx.status,
            createdAt: tx.created_at,
          })),
          pagination: {
            page,
            limit,
            total,
            hasMore: offset + limit < total,
          },
        };
      } catch (err) {
        console.error('History error:', err);
        return reply
          .status(500)
          .send({ error: 'Failed to fetch trade history' });
      }
    },
  );

  // POST /api/trade/swap — execute a swap via the agent's server wallet
  app.post(
    '/api/trade/swap',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const walletAddress = request.user!.walletAddress;
      const body = request.body as {
        from?: string;
        to?: string;
        amount?: string;
        slippage?: number;
        agent_type?: 'fx' | 'yield';
      };

      const { from, to, amount, slippage = 0.5, agent_type: requestedAgentType = 'fx' } = body;

      if (!from || !ALL_SWAP_TOKENS.has(from)) {
        return reply.status(400).send({
          error: `Invalid 'from' token. Must be one of: ${[...ALL_SWAP_TOKENS].join(', ')}`,
        });
      }
      if (!to || !ALL_SWAP_TOKENS.has(to)) {
        return reply.status(400).send({
          error: `Invalid 'to' token. Must be one of: ${[...ALL_SWAP_TOKENS].join(', ')}`,
        });
      }
      if (from === to) {
        return reply.status(400).send({ error: 'Cannot swap a token to itself' });
      }
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        return reply.status(400).send({ error: "'amount' must be a positive number" });
      }

      const agentType = requestedAgentType === 'yield' ? 'yield' : 'fx';

      try {
        const { data: agent, error: agentError } = await supabaseAdmin
          .from('agent_configs')
          .select('server_wallet_id, server_wallet_address')
          .eq('wallet_address', walletAddress)
          .eq('agent_type', agentType)
          .maybeSingle();

        if (agentError || !agent?.server_wallet_id || !agent?.server_wallet_address) {
          return reply.status(400).send({
            error: `${agentType === 'yield' ? 'Yield' : 'FX'} agent wallet not configured. Complete onboarding first.`,
          });
        }

        const result = await executeSwap({
          serverWalletId: agent.server_wallet_id,
          serverWalletAddress: agent.server_wallet_address,
          from,
          to,
          amount,
          slippagePct: slippage,
          chain: 'mantle',
          inTokenAddress: resolveMantleToken(from)?.address,
          outTokenAddress: resolveMantleToken(to)?.address,
        });

        if (!result.success) {
          return reply.status(400).send({
            error: result.reason,
            failureCategory: result.failureCategory,
          });
        }

        const direction = VALID_FROM_TOKENS.has(from) || from === 'USDm' ? 'buy' : 'sell';
        const currency = direction === 'buy' ? to : from;
        const timelineTable = agentType === 'yield' ? 'yield_agent_timeline' : 'fx_agent_timeline';
        await supabaseAdmin.from(timelineTable).insert({
          wallet_address: walletAddress,
          event_type: 'trade',
          summary: `Manual swap: ${amount} ${from} → ${to}`,
          detail: {
            source: 'manual_swap',
            from,
            to,
            amountIn: result.amountIn.toString(),
            amountOut: result.amountOut.toString(),
            rate: result.rate,
          },
          currency,
          amount_usd: parseFloat(amount),
          direction,
          tx_hash: result.txHash,
        });

        return {
          txHash: result.txHash,
          amountIn: result.amountIn,
          amountOut: result.amountOut,
          exchangeRate: result.rate.toFixed(6),
        };
      } catch (err) {
        console.error('Swap error:', err);
        const message = err instanceof Error ? err.message : 'Swap failed';
        return reply.status(500).send({ error: message });
      }
    },
  );

  // GET /api/trade/balance
  app.get(
    '/api/trade/balance',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const walletAddress = request.user!.walletAddress;
      const query = request.query as {
        token?: string;
        agent_type?: 'fx' | 'yield';
      };

      const token = resolveMantleToken(query.token);
      if (!token) {
        return reply.status(400).send({ error: 'Unsupported Mantle token' });
      }

      const agentType = query.agent_type === 'yield' ? 'yield' : 'fx';

      try {
        const { data: agent, error: agentError } = await supabaseAdmin
          .from('agent_configs')
          .select('server_wallet_address')
          .eq('wallet_address', walletAddress)
          .eq('agent_type', agentType)
          .maybeSingle();

        if (agentError || !agent?.server_wallet_address) {
          return reply.status(404).send({
            error: `${agentType === 'yield' ? 'Yield' : 'FX'} agent wallet not configured. Complete onboarding first.`,
          });
        }

        const balance = await chainClient.readContract({
          address: token.address,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [agent.server_wallet_address as Address],
        });

        return {
          balance: Number(formatUnits(balance, token.decimals)),
          rawBalance: balance.toString(),
          decimals: token.decimals,
        };
      } catch (error) {
        request.log.error({ err: error }, '[trade] balance failed');
        return reply.status(500).send({
          error: error instanceof Error ? error.message : 'Failed to fetch balance',
        });
      }
    },
  );

  // POST /api/trade/send — send tokens from agent wallet to recipient
  app.post(
    '/api/trade/send',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const walletAddress = request.user!.walletAddress;
      const body = request.body as {
        token?: string;
        amount?: number;
        recipient?: string;
        agent_type?: 'fx' | 'yield';
      };

      const { token, amount, recipient, agent_type: requestedAgentType = 'fx' } = body;

      if (!token || !SEND_TOKENS.has(token)) {
        return reply.status(400).send({
          error: `Invalid token. Must be one of: ${[...SEND_TOKENS].join(', ')}`,
        });
      }
      if (amount == null || isNaN(amount) || amount <= 0) {
        return reply.status(400).send({ error: "'amount' must be a positive number" });
      }
      if (!recipient || !/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
        return reply.status(400).send({ error: 'Invalid recipient address' });
      }

      const agentType = requestedAgentType === 'yield' ? 'yield' : 'fx';

      try {
        const { data: agent, error: agentError } = await supabaseAdmin
          .from('agent_configs')
          .select('server_wallet_id, server_wallet_address')
          .eq('wallet_address', walletAddress)
          .eq('agent_type', agentType)
          .maybeSingle();

        if (agentError || !agent?.server_wallet_id || !agent?.server_wallet_address) {
          return reply.status(400).send({
            error: `${agentType === 'yield' ? 'Yield' : 'FX'} agent wallet not configured. Complete onboarding first.`,
          });
        }

        const result = await sendTokens({
          serverWalletId: agent.server_wallet_id,
          serverWalletAddress: agent.server_wallet_address,
          token,
          amount: String(amount),
          recipient,
        });

        return { txHash: result.txHash };
      } catch (err) {
        console.error('Send error:', err);
        const message = err instanceof Error ? err.message : 'Send failed';
        return reply.status(500).send({ error: message });
      }
    },
  );
}
