import { useState, useEffect, useCallback, useRef } from 'react';

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

  // Use refs to prevent infinite render loops when anonymous functions are passed directly
  const apiFunctionRef = useRef(apiFunction);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    apiFunctionRef.current = apiFunction;
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  });

  const serializedArgs = JSON.stringify(args);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiFunctionRef.current(...args);
      if (response.errors && response.errors.length > 0) {
        throw new Error(response.errors[0].message || 'API Error');
      }
      setData(response.data);
      if (onSuccessRef.current && response.data) {
        onSuccessRef.current(response.data);
      }
    } catch (err: any) {
      const formattedError = err instanceof Error ? err : new Error(err.message || 'Unknown error');
      setError(formattedError);
      if (onErrorRef.current) {
        onErrorRef.current(formattedError);
      }
    } finally {
      setIsLoading(false);
    }
  }, [serializedArgs]); // Only recreate when args values change

  useEffect(() => {
    if (enabled) {
      fetch();
    }
  }, [fetch, enabled]);

  return { data, isLoading, error, refetch: fetch };
}

