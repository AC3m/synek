import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { WhyRow } from '~/components/landing/why/WhyRow';
import { FragAuto } from '~/components/landing/why/fragments/FragAuto';
import { FragColumn } from '~/components/landing/why/fragments/FragColumn';
import { FragSync } from '~/components/landing/why/fragments/FragSync';
import { FragCoDesign } from '~/components/landing/why/fragments/FragCoDesign';
import { WhySection } from '~/components/landing/WhySection';
import { useLocale } from '~/test/utils/landing-i18n';

let restore: (() => Promise<void>) | null = null;

afterEach(async () => {
  if (restore) {
    await restore();
    restore = null;
  }
});

describe('WhyRow', () => {
  const baseProps = {
    index: 0,
    total: 4,
    title: 'Stop logging. Start training.',
    body: 'Strava, Garmin, COROS push activities in automatically.',
    art: <div data-testid="art" />,
  };

  it('renders title, body and art', () => {
    render(<WhyRow {...baseProps} />);
    expect(screen.getByText(baseProps.title)).toBeInTheDocument();
    expect(screen.getByText(baseProps.body)).toBeInTheDocument();
    expect(screen.getByTestId('art')).toBeInTheDocument();
  });

  it('renders a numeric badge in NN / NN format', () => {
    render(<WhyRow {...baseProps} index={0} total={4} />);
    expect(screen.getByText('01 / 04')).toBeInTheDocument();
  });

  it('keeps text first in DOM (a11y reading order) regardless of flip', () => {
    const { container } = render(<WhyRow {...baseProps} flip={false} />);
    const row = container.querySelector('[data-testid="why-row"]')!;
    const text = within(row as HTMLElement).getByText(baseProps.title);
    const art = within(row as HTMLElement).getByTestId('art');
    expect(text.compareDocumentPosition(art) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('marks visual flip via data-flip attribute', () => {
    const { rerender } = render(<WhyRow {...baseProps} flip={false} />);
    expect(screen.getByTestId('why-row').dataset.flip).toBe('false');
    rerender(<WhyRow {...baseProps} flip={true} />);
    expect(screen.getByTestId('why-row').dataset.flip).toBe('true');
  });
});

describe('Why fragments', () => {
  it('FragAuto renders an auto-import surface (toggle or badge)', () => {
    render(<FragAuto />);
    expect(screen.getByTestId('frag-auto')).toBeInTheDocument();
  });

  it('FragColumn renders 3 day columns', () => {
    render(<FragColumn />);
    expect(screen.getAllByTestId('frag-column-day')).toHaveLength(3);
  });

  it('FragSync renders sync feed entries with no Strava branding', () => {
    const { container } = render(<FragSync />);
    expect(screen.getByTestId('frag-sync')).toBeInTheDocument();
    expect(container.textContent?.toLowerCase()).not.toContain('strava');
  });

  it('FragCoDesign renders 3+ roadmap items', () => {
    render(<FragCoDesign />);
    expect(screen.getAllByTestId('frag-codesign-item').length).toBeGreaterThanOrEqual(3);
  });
});

describe('WhySection', () => {
  it('renders 4 rows with alternating flip', () => {
    render(<WhySection />);
    const rows = screen.getAllByTestId('why-row');
    expect(rows).toHaveLength(4);
    expect(rows[0].dataset.flip).toBe('false');
    expect(rows[1].dataset.flip).toBe('true');
    expect(rows[2].dataset.flip).toBe('false');
    expect(rows[3].dataset.flip).toBe('true');
  });

  it('renders heading + lede', () => {
    render(<WhySection />);
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    expect(screen.getByText(/anti-spreadsheet/i)).toBeInTheDocument();
  });

  it('renders all 4 row titles (EN)', () => {
    render(<WhySection />);
    expect(screen.getByText(/Stop logging/i)).toBeInTheDocument();
    expect(screen.getByText(/One weekly view. Both sides./i)).toBeInTheDocument();
    expect(screen.getByText(/Full control. Zero chaos./i)).toBeInTheDocument();
    expect(screen.getByText(/Built with the people using it./i)).toBeInTheDocument();
  });

  it('renders no Strava text anywhere', () => {
    const { container } = render(<WhySection />);
    expect(container.textContent?.toLowerCase()).not.toContain('strava');
  });

  it('localizes content (PL)', async () => {
    restore = await useLocale('pl');
    render(<WhySection />);
    expect(screen.getByText(/Przestań logować/i)).toBeInTheDocument();
  });
});
