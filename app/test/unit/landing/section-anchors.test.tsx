import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { SECTIONS } from '~/components/landing/constants';
import { useSmoothScroll } from '~/components/landing/hooks/useSmoothScroll';

describe('SECTIONS constant', () => {
  it('has expected section keys', () => {
    const keys = SECTIONS.map((s) => s.key);
    expect(keys).toContain('why');
    expect(keys).toContain('features');
    expect(keys).toContain('perspectives');
    expect(keys).toContain('contact');
  });

  it('each section has href starting with #', () => {
    SECTIONS.forEach((s) => {
      expect(s.href).toMatch(/^#/);
    });
  });

  it('href matches #key for each section', () => {
    SECTIONS.forEach((s) => {
      expect(s.href).toBe(`#${s.key}`);
    });
  });
});

describe('useSmoothScroll', () => {
  let scrollToSpy: ReturnType<typeof vi.fn>;
  let querySelectorSpy: ReturnType<typeof vi.fn>;
  let mockEl: { getBoundingClientRect: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    scrollToSpy = vi.fn();
    window.scrollTo = scrollToSpy as unknown as typeof window.scrollTo;

    mockEl = {
      getBoundingClientRect: vi.fn().mockReturnValue({ top: 200 }),
    };
    querySelectorSpy = vi
      .spyOn(document, 'querySelector')
      .mockReturnValue(mockEl as unknown as Element);

    Object.defineProperty(window, 'scrollY', { value: 100, configurable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a scroll handler function', () => {
    const { result } = renderHook(() => useSmoothScroll());
    expect(typeof result.current).toBe('function');
  });

  it('calls document.querySelector with href', () => {
    const { result } = renderHook(() => useSmoothScroll());
    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.MouseEvent<HTMLAnchorElement>;
    result.current(fakeEvent, '#why');
    expect(querySelectorSpy).toHaveBeenCalledWith('#why');
  });

  it('calls window.scrollTo with smooth behavior when element found', () => {
    const { result } = renderHook(() => useSmoothScroll());
    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.MouseEvent<HTMLAnchorElement>;
    result.current(fakeEvent, '#why');
    expect(scrollToSpy).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
  });

  it('prevents default on click', () => {
    const { result } = renderHook(() => useSmoothScroll());
    const preventDefault = vi.fn();
    const fakeEvent = { preventDefault } as unknown as React.MouseEvent<HTMLAnchorElement>;
    result.current(fakeEvent, '#features');
    expect(preventDefault).toHaveBeenCalled();
  });

  it('does not throw when element not found', () => {
    querySelectorSpy.mockReturnValue(null);
    const { result } = renderHook(() => useSmoothScroll());
    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.MouseEvent<HTMLAnchorElement>;
    expect(() => result.current(fakeEvent, '#missing')).not.toThrow();
  });
});
