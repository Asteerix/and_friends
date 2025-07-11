import { QueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'react-query-cache' });

const mmkvPersister = {
  persistClient: async (client: any) => {
    storage.set('react-query-cache', JSON.stringify(client));
  },
  restoreClient: async () => {
    const cache = storage.getString('react-query-cache');
    return cache ? JSON.parse(cache) : undefined;
  },
  removeClient: async () => {
    storage.delete('react-query-cache');
  },
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 24 * 60 * 60 * 1000, // 24 hours
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
});

// Persist the query client
persistQueryClient({
  queryClient,
  persister: mmkvPersister,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
});