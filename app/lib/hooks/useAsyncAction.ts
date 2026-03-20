import { useState, useCallback } from 'react';

export function useAsyncAction(fn: ((id: string) => Promise<void>) | undefined) {
  const [isPending, setIsPending] = useState(false);
  const trigger = useCallback(async (id: string) => {
    if (!fn || isPending) return;
    setIsPending(true);
    try {
      await fn(id);
    } finally {
      setIsPending(false);
    }
  }, [fn, isPending]);
  return { trigger, isPending } as const;
}
