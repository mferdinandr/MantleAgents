import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';

// Types
export interface PriceAlert {
  id: string;
  chain: string;
  token_address: string;
  token_symbol: string;
  condition: 'above' | 'below';
  threshold: number;
  triggered: boolean;
  triggered_at: string | null;
  triggered_price: number | null;
  created_at: string;
}

// Query keys
export const alertKeys = {
  all: ['alerts'] as const,
  list: () => [...alertKeys.all, 'list'] as const,
};

// GET /api/monitor/alerts
export function useAlerts() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: alertKeys.list(),
    queryFn: () => api.get<{ alerts: PriceAlert[] }>('/api/monitor/alerts'),
    enabled: isAuthenticated,
    select: (data) => data.alerts,
  });
}

// POST /api/monitor/alerts
export function useCreateAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      chain: string;
      token_address: string;
      token_symbol: string;
      condition: 'above' | 'below';
      threshold: number;
    }) => api.post<{ alert: PriceAlert }>('/api/monitor/alerts', params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertKeys.all });
    },
  });
}

// DELETE /api/monitor/alerts/:id
export function useDeleteAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ success: boolean }>(`/api/monitor/alerts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertKeys.all });
    },
  });
}
