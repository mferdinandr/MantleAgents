import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export const nativePriceKeys = {
  all: ['native-token-price'] as const,
};

export function useNativePrice() {
  return useQuery({
    queryKey: nativePriceKeys.all,
    queryFn: async () => {
      const res = await api.get<{ priceUsd: number; updatedAt: string }>(
        '/api/market/native-price',
      );
      return res;
    },
    staleTime: 60_000, // 1 minute
  });
}
