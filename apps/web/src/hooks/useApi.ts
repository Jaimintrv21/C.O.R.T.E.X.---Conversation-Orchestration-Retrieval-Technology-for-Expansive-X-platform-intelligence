import { useState, useEffect, useCallback } from 'react';

type ApiFunction<T> = (...args: any[]) => Promise<{ data: T | null; meta?: any; errors?: any[] | null }>;

export function useApiQuery<T>(
  apiFunction: ApiFunction<T>,
  args: any[] = [],
  options: { enabled?: boolean; onSuccess?: (data: T) => void; onError?: (err: any) => void } = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { enabled = true, onSuccess, onError } = options;

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiFunction(...args);
      if (response.errors && response.errors.length > 0) {
        throw new Error(response.errors[0].message || 'API Error');
      }
      setData(response.data);
      if (onSuccess && response.data) onSuccess(response.data);
    } catch (err: any) {
      setError(err instanceof Error ? err : new Error(err.message || 'Unknown error'));
      if (onError) onError(err);
    } finally {
      setIsLoading(false);
    }
  }, [apiFunction, JSON.stringify(args)]);

  useEffect(() => {
    if (enabled) {
      fetch();
    }
  }, [fetch, enabled]);

  return { data, isLoading, error, refetch: fetch };
}
