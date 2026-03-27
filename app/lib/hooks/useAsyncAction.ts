import { useState, useCallback, useRef } from 'react';

export function useAsyncAction(fn: ((id: string) => Promise<void>) | undefined) {
  const [isPending, setIsPending] = useState(false);
  const isExecutingRef = useRef(false);
  const trigger = useCallback(
    async (id: string) => {
      if (!fn || isExecutingRef.current) return;
      isExecutingRef.current = true;
      setIsPending(true);
      try {
        await fn(id);
      } finally {
        setIsPending(false);
        isExecutingRef.current = false;
      }
    },
    [fn],
  );
  return { trigger, isPending } as const;
}
