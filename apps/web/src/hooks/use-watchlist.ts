import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';

// Types
export interface WatchlistRiskScore {
  risk_level: string;
  honeypot: boolean;
  buy_tax: number;
  sell_tax: number;
}

export interface WatchlistItem {
  id: string;
  wallet_address: string;
  chain: string;
  token_address: string;
  token_symbol: string;
  risk_score: WatchlistRiskScore | null;
  added_at: string;
  current_price: number;
}

// Query keys
export const watchlistKeys = {
  all: ['watchlist'] as const,
  list: () => [...watchlistKeys.all, 'list'] as const,
};

// GET /api/monitor/watchlist
export function useWatchlist() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: watchlistKeys.list(),
    queryFn: () => api.get<{ watchlist: WatchlistItem[] }>('/api/monitor/watchlist'),
    enabled: isAuthenticated,
    refetchInterval: 30000,
    select: (data) => data.watchlist,
  });
}

// POST /api/monitor/watchlist
export function useAddToWatchlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { chain: string; token_address: string; token_symbol: string }) =>
      api.post<{ item: WatchlistItem }>('/api/monitor/watchlist', params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: watchlistKeys.all });
    },
  });
}

// DELETE /api/monitor/watchlist/:id
export function useRemoveFromWatchlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ success: boolean }>(`/api/monitor/watchlist/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: watchlistKeys.all });
    },
  });
}
