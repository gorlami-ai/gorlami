import { useState, useCallback, useRef, useEffect } from 'react';

interface AsyncState<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
}

interface UseAsyncReturn<T> extends AsyncState<T> {
  execute: (...args: any[]) => Promise<T | null>;
  reset: () => void;
}

export function useAsync<T>(
  asyncFunction: (...args: any[]) => Promise<T>,
  immediate = false
): UseAsyncReturn<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    loading: immediate,
  });

  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const execute = useCallback(
    async (...args: any[]) => {
      setState({ data: null, error: null, loading: true });

      try {
        const result = await asyncFunction(...args);
        
        if (isMountedRef.current) {
          setState({ data: result, error: null, loading: false });
        }
        
        return result;
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        
        if (isMountedRef.current) {
          setState({ data: null, error: errorObj, loading: false });
        }
        
        return null;
      }
    },
    [asyncFunction]
  );

  const reset = useCallback(() => {
    setState({ data: null, error: null, loading: false });
  }, []);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return { ...state, execute, reset };
}

export function useAsyncCallback<T extends (...args: any[]) => Promise<any>>(
  callback: T
): [(...args: Parameters<T>) => Promise<void>, AsyncState<Awaited<ReturnType<T>>>] {
  const { data, error, loading, execute } = useAsync(callback);

  const wrappedExecute = useCallback(
    async (...args: Parameters<T>) => {
      await execute(...args);
    },
    [execute]
  );

  return [wrappedExecute, { data, error, loading }];
}