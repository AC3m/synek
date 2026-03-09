import { useNavigate, useParams, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import { Languages } from 'lucide-react';

export function LanguageToggle() {
  const navigate = useNavigate();
  const { locale } = useParams<{ locale?: string }>();
  const { pathname } = useLocation();
  const { i18n } = useTranslation();

  const currentLocale = locale ?? (localStorage.getItem('locale') ?? 'pl');
  const newLocale = currentLocale === 'en' ? 'pl' : 'en';

  const toggleLanguage = () => {
    localStorage.setItem('locale', newLocale);
    if (locale) {
      // Inside a locale route — navigate by replacing the locale segment
      const newPath = pathname.replace(/^\/[^/]+/, `/${newLocale}`);
      navigate(newPath);
    } else {
      // Outside locale routes (e.g. login page) — just change i18n language
      i18n.changeLanguage(newLocale);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="gap-1.5"
    >
      <Languages className="h-4 w-4" />
      {currentLocale === 'en' ? 'PL' : 'EN'}
    </Button>
  );
}
