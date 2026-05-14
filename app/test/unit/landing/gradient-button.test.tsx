import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { GradientButton } from '~/components/landing/shared/GradientButton';

describe('GradientButton', () => {
  it('renders as <button> when no href/to', () => {
    render(<GradientButton>Click</GradientButton>);
    expect(screen.getByRole('button', { name: 'Click' })).toBeInTheDocument();
  });

  it('renders as <a> link when "to" prop given', () => {
    render(
      <MemoryRouter>
        <GradientButton to="/register">Sign up</GradientButton>
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Sign up' })).toBeInTheDocument();
  });

  it('href matches "to" prop', () => {
    render(
      <MemoryRouter>
        <GradientButton to="/en/register">Go</GradientButton>
      </MemoryRouter>,
    );
    expect(screen.getByRole('link').getAttribute('href')).toBe('/en/register');
  });

  it('calls onClick when clicked (button mode)', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<GradientButton onClick={onClick}>Act</GradientButton>);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('accepts size prop and applies it', () => {
    const { container } = render(<GradientButton size="lg">x</GradientButton>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toMatch(/h-12/);
  });

  it('accepts size sm', () => {
    const { container } = render(<GradientButton size="sm">x</GradientButton>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toMatch(/h-9/);
  });

  it('disabled button is not clickable', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <GradientButton disabled onClick={onClick}>
        Disabled
      </GradientButton>,
    );
    await user.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('accepts className for overrides', () => {
    const { container } = render(<GradientButton className="extra-class">x</GradientButton>);
    expect(container.querySelector('.extra-class')).not.toBeNull();
  });
});
