import { useState, useCallback } from 'react';
import { AxiosError } from 'axios';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

/**
 * Custom hook for API calls with loading and error states
 */
export function useApi<T = any>(options?: UseApiOptions) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (apiCall: () => Promise<T>) => {
      setState({ data: null, loading: true, error: null });
      try {
        const result = await apiCall();
        setState({ data: result, loading: false, error: null });
        options?.onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err as AxiosError;
        const errorMessage =
          (error.response?.data as any)?.error ||
          error.message ||
          'An error occurred';
        setState({ data: null, loading: false, error: errorMessage });
        options?.onError?.(errorMessage);
        throw err;
      }
    },
    [options]
  );

  return {
    ...state,
    execute,
  };
}
