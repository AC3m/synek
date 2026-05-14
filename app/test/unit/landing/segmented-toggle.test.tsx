import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SegmentedToggle } from '~/components/landing/primitives/SegmentedToggle';

const OPTIONS = [
  { value: 'en', label: 'EN' },
  { value: 'pl', label: 'PL' },
] as const;

describe('SegmentedToggle', () => {
  it('renders all option labels', () => {
    render(<SegmentedToggle options={OPTIONS} value="en" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'PL' })).toBeInTheDocument();
  });

  it('wraps in a group with aria-label when label given', () => {
    render(<SegmentedToggle options={OPTIONS} value="en" onChange={() => {}} label="Language" />);
    expect(screen.getByRole('group', { name: 'Language' })).toBeInTheDocument();
  });

  it('marks active option with aria-pressed=true', () => {
    render(<SegmentedToggle options={OPTIONS} value="pl" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'PL' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'EN' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('calls onChange with the new value on click', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SegmentedToggle options={OPTIONS} value="en" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'PL' }));
    expect(onChange).toHaveBeenCalledWith('pl');
  });

  it('does not call onChange when clicking already-active option', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SegmentedToggle options={OPTIONS} value="en" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'EN' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('accepts className for container', () => {
    const { container } = render(
      <SegmentedToggle options={OPTIONS} value="en" onChange={() => {}} className="my-toggle" />,
    );
    expect(container.querySelector('.my-toggle')).not.toBeNull();
  });

  it('works with 3 options', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const opts = [
      { value: 'coach', label: 'Coach' },
      { value: 'athlete', label: 'Athlete' },
      { value: 'other', label: 'Other' },
    ] as const;
    render(<SegmentedToggle options={opts} value="coach" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Other' }));
    expect(onChange).toHaveBeenCalledWith('other');
  });
});
