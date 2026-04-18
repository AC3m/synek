/**
 * LandingNav navigation tests
 *
 * Covers:
 * - Auth links (logIn → /pl/login, joinBeta → /pl/register) always present with correct hrefs
 * - On landing page (/pl): marketing items render as <a> anchor tags with #hash hrefs
 * - On non-landing page (/pl/login): marketing items render as <Link> with full paths
 * - Mobile hamburger opens/closes and shows all links
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { LandingNav } from '~/components/landing/LandingNav';

// ---------------------------------------------------------------------------
// Mocks for context-dependent layout widgets
// ---------------------------------------------------------------------------

vi.mock('~/components/layout/ThemeToggle', () => ({
  ThemeToggle: () => <button aria-label="toggle theme" />,
}));

vi.mock('~/components/layout/LanguageToggle', () => ({
  LanguageToggle: () => <button aria-label="toggle language" />,
}));

// Control pathname + params per test
const mockLocation = { pathname: '/pl' };
const mockParams = { locale: 'pl' };

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useLocation: () => mockLocation,
    useParams: () => mockParams,
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderNav() {
  return render(
    <MemoryRouter>
      <LandingNav />
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LandingNav — auth links', () => {
  beforeEach(() => {
    mockLocation.pathname = '/pl';
    mockParams.locale = 'pl';
  });

  it('renders a Log In link pointing to /pl/login', () => {
    renderNav();
    const loginLinks = screen.getAllByRole('link', { name: 'nav.logIn' });
    // At least one (desktop); href must be /pl/login
    expect(loginLinks[0]).toHaveAttribute('href', '/pl/login');
  });

  it('renders a Join Beta link pointing to /pl/register', () => {
    renderNav();
    const betaLinks = screen.getAllByRole('link', { name: 'nav.joinBeta' });
    expect(betaLinks[0]).toHaveAttribute('href', '/pl/register');
  });

  it('uses the locale param in auth link hrefs — en locale', () => {
    mockParams.locale = 'en';
    mockLocation.pathname = '/en';
    renderNav();
    const loginLinks = screen.getAllByRole('link', { name: 'nav.logIn' });
    expect(loginLinks[0]).toHaveAttribute('href', '/en/login');
    const betaLinks = screen.getAllByRole('link', { name: 'nav.joinBeta' });
    expect(betaLinks[0]).toHaveAttribute('href', '/en/register');
  });
});

describe('LandingNav — marketing links on landing page (/pl)', () => {
  beforeEach(() => {
    mockLocation.pathname = '/pl';
    mockParams.locale = 'pl';
  });

  it('renders marketing items as anchor tags with hash hrefs', () => {
    renderNav();
    // anchor tags — not router Links (no /pl prefix)
    expect(screen.getByRole('link', { name: 'nav.getStarted' })).toHaveAttribute(
      'href',
      '#get-started',
    );
    expect(screen.getByRole('link', { name: 'nav.whySynek' })).toHaveAttribute(
      'href',
      '#why-synek',
    );
    expect(screen.getByRole('link', { name: 'nav.features' })).toHaveAttribute('href', '#features');
    expect(screen.getByRole('link', { name: 'nav.contact' })).toHaveAttribute('href', '#contact');
  });
});

describe('LandingNav — marketing links on non-landing page (/pl/login)', () => {
  beforeEach(() => {
    mockLocation.pathname = '/pl/login';
    mockParams.locale = 'pl';
  });

  it('renders marketing items as router Links with full paths', async () => {
    const user = userEvent.setup();
    renderNav();
    // Marketing links on non-landing pages are only in the mobile dropdown
    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    // resolveHref prepends /${locale} to the anchor href
    expect(screen.getByRole('link', { name: 'nav.getStarted' })).toHaveAttribute(
      'href',
      '/pl#get-started',
    );
    expect(screen.getByRole('link', { name: 'nav.whySynek' })).toHaveAttribute(
      'href',
      '/pl#why-synek',
    );
  });

  it('auth links still point to /pl/login and /pl/register', () => {
    renderNav();
    const loginLinks = screen.getAllByRole('link', { name: 'nav.logIn' });
    expect(loginLinks[0]).toHaveAttribute('href', '/pl/login');
    const betaLinks = screen.getAllByRole('link', { name: 'nav.joinBeta' });
    expect(betaLinks[0]).toHaveAttribute('href', '/pl/register');
  });
});

describe('LandingNav — mobile hamburger menu', () => {
  beforeEach(() => {
    mockLocation.pathname = '/pl';
    mockParams.locale = 'pl';
  });

  it('mobile menu is hidden by default', () => {
    renderNav();
    // Desktop nav has one auth link; mobile header always renders a second icon login link
    // Mobile dropdown is not rendered until menuOpen === true
    const loginLinks = screen.getAllByRole('link', { name: 'nav.logIn' });
    expect(loginLinks).toHaveLength(2);
  });

  it('opens mobile menu on hamburger click and shows all links', async () => {
    const user = userEvent.setup();
    renderNav();

    await user.click(screen.getByRole('button', { name: 'Open menu' }));

    // After open, each nav link appears twice (desktop hidden + mobile visible)
    const loginLinks = screen.getAllByRole('link', { name: 'nav.logIn' });
    expect(loginLinks.length).toBeGreaterThanOrEqual(2);

    const betaLinks = screen.getAllByRole('link', { name: 'nav.joinBeta' });
    expect(betaLinks.length).toBeGreaterThanOrEqual(2);
  });

  it('closes mobile menu on hamburger click when already open', async () => {
    const user = userEvent.setup();
    renderNav();

    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    await user.click(screen.getByRole('button', { name: 'Close menu' }));

    // Back to desktop + mobile icon (mobile dropdown closed)
    expect(screen.getAllByRole('link', { name: 'nav.logIn' })).toHaveLength(2);
  });
});
