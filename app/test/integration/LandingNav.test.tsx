/**
 * LandingNav tests (rewritten for landing redesign v2 with i18n).
 *
 * The new nav reads its locale from useParams() and its copy from
 * useTranslation('landing'). Tests render inside a matched Route so useParams
 * resolves, and switch i18n.language for the PL assertion.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { LandingNav } from '~/components/shared/LandingNav';
import { useLocale } from '~/test/utils/landing-i18n';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path=":locale" element={<LandingNav />} />
      </Routes>
    </MemoryRouter>,
  );
}

let restore: (() => Promise<void>) | null = null;

afterEach(async () => {
  if (restore) {
    await restore();
    restore = null;
  }
});

describe('LandingNav (v2)', () => {
  it('renders brand link, Sign in, and Get started CTA (PL)', async () => {
    restore = await useLocale('pl');
    renderAt('/pl');
    expect(screen.getByText('SYNEK')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /zaloguj/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /rozpocznij/i })).toBeInTheDocument();
  });

  it('routes Sign in to /<locale>/login', () => {
    renderAt('/en');
    const signIn = screen.getByRole('link', { name: /sign in/i });
    expect(signIn.getAttribute('href')).toBe('/en/login');
  });

  it('routes Get started to /<locale>/register', () => {
    renderAt('/en');
    const get = screen.getByRole('link', { name: /get started/i });
    expect(get.getAttribute('href')).toBe('/en/register');
  });

  it('renders section anchor links with hash hrefs', () => {
    renderAt('/en');
    const why = screen.getByRole('link', { name: /^why$/i });
    expect(why.getAttribute('href')).toBe('#why');
    expect(screen.getByRole('link', { name: /features/i }).getAttribute('href')).toBe('#features');
    expect(screen.getByRole('link', { name: /coach & athlete/i }).getAttribute('href')).toBe(
      '#perspectives',
    );
  });

  it('toggles the mobile menu when the hamburger is clicked', async () => {
    const user = userEvent.setup();
    renderAt('/en');
    await user.click(screen.getByRole('button', { name: /open menu/i }));
    expect(screen.getByRole('button', { name: /close menu/i })).toBeInTheDocument();
  });
});
