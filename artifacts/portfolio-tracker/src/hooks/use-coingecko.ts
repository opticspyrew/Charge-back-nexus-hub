import { useQuery, keepPreviousData } from "@tanstack/react-query";

export interface CoinMarketData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h_in_currency: number;
  market_cap: number;
}

export function useCoinPrices(coinIds: string[]) {
  return useQuery({
    queryKey: ["coinPrices", coinIds.sort().join(",")],
    queryFn: async () => {
      if (!coinIds.length) return [];
      
      const ids = coinIds.join(",");
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&price_change_percentage=24h`
      );
      
      if (!res.ok) {
        throw new Error("Failed to fetch coin prices");
      }
      
      return res.json() as Promise<CoinMarketData[]>;
    },
    enabled: coinIds.length > 0,
    staleTime: 60000, // 1 minute
    refetchInterval: 60000,
    retry: 2,
    // Keep the last successful prices visible while refetching or when the
    // set of held coins changes, so values never flash to zero.
    placeholderData: keepPreviousData,
  });
}

export interface CoinSearchResult {
  id: string;
  name: string;
  symbol: string;
  thumb: string;
  large: string;
}

export function useCoinSearch(query: string) {
  return useQuery({
    queryKey: ["coinSearch", query],
    queryFn: async () => {
      if (!query || query.length < 2) return { coins: [] };
      const res = await fetch(
        `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`
      );
      if (!res.ok) throw new Error("Search failed");
      return res.json() as Promise<{ coins: CoinSearchResult[] }>;
    },
    enabled: query.length >= 2,
    staleTime: 300000, // 5 minutes
  });
}

export function useSimplePrice(coinId: string | null) {
  return useQuery({
    queryKey: ["simplePrice", coinId],
    queryFn: async () => {
      if (!coinId) return null;
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`
      );
      if (!res.ok) throw new Error("Price fetch failed");
      const data = await res.json();
      return data[coinId]?.usd || null;
    },
    enabled: !!coinId,
    staleTime: 60000,
  });
}
