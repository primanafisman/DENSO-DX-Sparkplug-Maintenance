import { QueryClient } from '@tanstack/react-query';
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15000,
      gcTime: 120000,
      retry: (count, error) =>
        count < 1 &&
        !('status' in error && Number(error.status) >= 400 && Number(error.status) < 500),
    },
    mutations: { retry: false },
  },
});
