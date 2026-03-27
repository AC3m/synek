import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useAsyncAction } from '~/lib/hooks/useAsyncAction';

describe('useAsyncAction', () => {
  it('calls fn with the provided id', async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAsyncAction(fn));
    await act(async () => { await result.current.trigger('s1'); });
    expect(fn).toHaveBeenCalledWith('s1');
  });

  it('isPending is false initially', () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAsyncAction(fn));
    expect(result.current.isPending).toBe(false);
  });

  it('isPending becomes true while fn is in flight, then false after resolution', async () => {
    let resolve!: () => void;
    const fn = vi.fn(() => new Promise<void>((r) => { resolve = r; }));
    const { result } = renderHook(() => useAsyncAction(fn));

    act(() => { void result.current.trigger('s1'); });
    expect(result.current.isPending).toBe(true);

    await act(async () => { resolve(); });
    expect(result.current.isPending).toBe(false);
  });

  it('isPending becomes false after rejection', async () => {
    let reject!: (e: Error) => void;
    const fn = vi.fn(() => new Promise<void>((_r, rej) => { reject = rej; }).catch(() => {}));
    const { result } = renderHook(() => useAsyncAction(fn));

    act(() => { void result.current.trigger('s1'); });
    expect(result.current.isPending).toBe(true);

    await act(async () => { reject(new Error('fail')); });
    expect(result.current.isPending).toBe(false);
  });

  it('trigger is a no-op when already pending', async () => {
    let resolve!: () => void;
    const fn = vi.fn(() => new Promise<void>((r) => { resolve = r; }));
    const { result } = renderHook(() => useAsyncAction(fn));

    act(() => { void result.current.trigger('s1'); });
    act(() => { void result.current.trigger('s2'); });

    await act(async () => { resolve(); });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('trigger is a no-op when fn is undefined', async () => {
    const { result } = renderHook(() => useAsyncAction(undefined));
    await act(async () => { await result.current.trigger('s1'); });
    expect(result.current.isPending).toBe(false);
  });

  it('trigger reference is stable when isPending flips', async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAsyncAction(fn));

    const triggerBefore = result.current.trigger;
    await act(async () => { await result.current.trigger('s1'); });
    const triggerAfter = result.current.trigger;

    expect(triggerBefore).toBe(triggerAfter);
  });

  it('completion of a replaced fn does not invoke the new fn', async () => {
    let resolveOld!: () => void;
    const oldFn = vi.fn(() => new Promise<void>((r) => { resolveOld = r; }));
    const newFn = vi.fn().mockResolvedValue(undefined);

    const { result, rerender } = renderHook(
      ({ fn }: { fn: (id: string) => Promise<void> }) => useAsyncAction(fn),
      { initialProps: { fn: oldFn } }
    );

    // Start flight with oldFn
    act(() => { void result.current.trigger('s1'); });
    expect(oldFn).toHaveBeenCalledTimes(1);

    // Swap fn reference mid-flight
    rerender({ fn: newFn });

    // Complete oldFn's promise
    await act(async () => { resolveOld(); });

    // newFn should NOT have been called automatically
    expect(newFn).not.toHaveBeenCalled();
  });
});
