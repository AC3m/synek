import { useEffect } from 'react';
import { Navigate, Outlet, useLocation, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Header } from '~/components/layout/Header';

const SUPPORTED_LOCALES = ['pl', 'en'] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function isSupportedLocale(v: string): v is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(v);
}

export default function LocaleLayout() {
  const { locale } = useParams<{ locale: string }>();
  const { pathname } = useLocation();
  const { i18n } = useTranslation();

  useEffect(() => {
    if (locale && isSupportedLocale(locale)) {
      i18n.changeLanguage(locale);
      localStorage.setItem('locale', locale);
    }
  }, [locale, i18n]);

  if (!locale || !isSupportedLocale(locale)) {
    // Strip the unsupported locale segment and redirect to /pl/...
    const pathAfterLocale = pathname.replace(/^\/[^/]*/, '');
    return <Navigate to={`/pl${pathAfterLocale}`} replace />;
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </>
  );
}
