import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useRef } from 'react';
import { useReveal } from '~/components/landing/hooks/useReveal';
import { GradText } from '~/components/landing/primitives/GradText';
import { Eyebrow } from '~/components/landing/primitives/Eyebrow';
import { SectionHead } from '~/components/landing/primitives/SectionHead';

type IOCallback = (entries: Array<{ isIntersecting: boolean; target: Element }>) => void;

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: IOCallback;
  options: IntersectionObserverInit | undefined;
  observed: Element[] = [];
  disconnected = false;
  constructor(cb: IOCallback, options?: IntersectionObserverInit) {
    this.callback = cb;
    this.options = options;
    MockIntersectionObserver.instances.push(this);
  }
  observe(el: Element) {
    this.observed.push(el);
  }
  unobserve(el: Element) {
    this.observed = this.observed.filter((e) => e !== el);
  }
  disconnect() {
    this.disconnected = true;
  }
  trigger(isIntersecting: boolean) {
    this.callback(this.observed.map((target) => ({ isIntersecting, target })));
  }
}

beforeEach(() => {
  MockIntersectionObserver.instances = [];
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function RevealProbe() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} data-testid="probe" className="landing-reveal">
      hello
    </div>
  );
}

describe('useReveal', () => {
  it('adds `in` class once intersection threshold is met', () => {
    render(<RevealProbe />);
    const probe = screen.getByTestId('probe');
    expect(probe.classList.contains('in')).toBe(false);

    const io = MockIntersectionObserver.instances[0];
    act(() => io.trigger(true));

    expect(probe.classList.contains('in')).toBe(true);
  });

  it('does not add `in` class until intersection occurs', () => {
    render(<RevealProbe />);
    expect(screen.getByTestId('probe').classList.contains('in')).toBe(false);
  });

  it('unobserves the element after first intersection (one-shot reveal)', () => {
    render(<RevealProbe />);
    const io = MockIntersectionObserver.instances[0];
    expect(io.observed.length).toBe(1);

    act(() => io.trigger(true));

    expect(io.observed.length).toBe(0);
  });

  it('disconnects the observer on unmount', () => {
    const { unmount } = render(<RevealProbe />);
    const io = MockIntersectionObserver.instances[0];
    unmount();
    expect(io.disconnected).toBe(true);
  });
});

describe('GradText', () => {
  it('renders children verbatim', () => {
    render(<GradText>Together.</GradText>);
    expect(screen.getByText('Together.')).toBeInTheDocument();
  });

  it('applies the landing gradient class', () => {
    render(<GradText>Together.</GradText>);
    expect(screen.getByText('Together.').className).toContain('landing-grad-text');
  });

  it('forwards extra className', () => {
    render(<GradText className="extra">x</GradText>);
    expect(screen.getByText('x').className).toContain('extra');
  });
});

describe('Eyebrow', () => {
  it('renders the label text', () => {
    render(<Eyebrow>Features</Eyebrow>);
    expect(screen.getByText('Features')).toBeInTheDocument();
  });

  it('has a small uppercase tracking style applied via class', () => {
    render(<Eyebrow>Features</Eyebrow>);
    expect(screen.getByText('Features').className).toContain('landing-eyebrow');
  });
});

describe('SectionHead', () => {
  it('renders eyebrow, heading, and lede when all provided', () => {
    render(
      <SectionHead
        eyebrow="Why SYNEK"
        heading={
          <>
            One source, <GradText>two perspectives.</GradText>
          </>
        }
        lede="One weekly view that coach and athlete share."
      />,
    );
    expect(screen.getByText('Why SYNEK')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    expect(screen.getByText('two perspectives.')).toBeInTheDocument();
    expect(screen.getByText(/One weekly view/)).toBeInTheDocument();
  });

  it('omits lede when not provided', () => {
    render(<SectionHead heading={<>Heading</>} />);
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    expect(screen.queryByText(/one weekly view/i)).not.toBeInTheDocument();
  });
});
