import { QueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'react-query-cache';

const asyncStoragePersister = {
  persistClient: async (client: any) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(client));
    } catch (error) {
      console.error('Error persisting query client:', error);
    }
  },
  restoreClient: async () => {
    try {
      const cache = await AsyncStorage.getItem(STORAGE_KEY);
      return cache ? JSON.parse(cache) : undefined;
    } catch (error) {
      console.error('Error restoring query client:', error);
      return undefined;
    }
  },
  removeClient: async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error removing query client:', error);
    }
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
  persister: asyncStoragePersister,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
});