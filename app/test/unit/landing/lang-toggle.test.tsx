import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { LandingLangToggle } from '~/components/landing/layout/LandingLangToggle';

function PathProbe() {
  const { pathname } = useLocation();
  return <div data-testid="path">{pathname}</div>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path=":locale/*"
          element={
            <>
              <LandingLangToggle />
              <PathProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('LandingLangToggle', () => {
  it('renders EN and PL buttons inside a labeled group', () => {
    renderAt('/en');
    const group = screen.getByRole('group', { name: /language/i });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'PL' })).toBeInTheDocument();
  });

  it('marks the current locale button with aria-pressed=true', () => {
    renderAt('/pl');
    expect(screen.getByRole('button', { name: 'PL' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'EN' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('navigates path with locale segment replaced when other locale is clicked', async () => {
    const user = userEvent.setup();
    renderAt('/en');
    await user.click(screen.getByRole('button', { name: 'PL' }));
    expect(screen.getByTestId('path').textContent).toBe('/pl');
  });

  it('preserves trailing path segments when switching locale', async () => {
    const user = userEvent.setup();
    renderAt('/en/landing-preview');
    await user.click(screen.getByRole('button', { name: 'PL' }));
    expect(screen.getByTestId('path').textContent).toBe('/pl/landing-preview');
  });

  it('persists selected locale to localStorage', async () => {
    const user = userEvent.setup();
    renderAt('/en');
    await user.click(screen.getByRole('button', { name: 'PL' }));
    expect(localStorage.getItem('locale')).toBe('pl');
  });

  it('no-ops when current locale button is clicked again', async () => {
    const user = userEvent.setup();
    renderAt('/en');
    await user.click(screen.getByRole('button', { name: 'EN' }));
    expect(screen.getByTestId('path').textContent).toBe('/en');
  });
});
