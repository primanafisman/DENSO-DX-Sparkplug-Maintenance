import { useQuery } from '@tanstack/react-query';
import { capabilitiesApi } from '../lib/capabilities';

export function useCapabilities() {
  return useQuery({
    queryKey: ['capabilities'],
    queryFn: ({ signal }) => capabilitiesApi.read(signal),
    staleTime: 60_000,
  });
}
