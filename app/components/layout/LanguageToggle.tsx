import { useNavigate, useParams, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { SegmentedToggle } from '~/components/landing/shared/SegmentedToggle';

type Locale = 'en' | 'pl';

const LOCALE_OPTIONS = [
  { value: 'en' as const, label: 'EN' },
  { value: 'pl' as const, label: 'PL' },
] as const;

export function LanguageToggle() {
  const navigate = useNavigate();
  const { locale } = useParams<{ locale?: string }>();
  const { pathname } = useLocation();
  const { i18n } = useTranslation();

  const current: Locale =
    (locale as Locale | undefined) ?? (localStorage.getItem('locale') as Locale | null) ?? 'pl';

  const handleChange = (next: Locale) => {
    localStorage.setItem('locale', next);
    if (locale) {
      navigate(pathname.replace(/^\/[^/]+/, `/${next}`));
    } else {
      void i18n.changeLanguage(next);
    }
  };

  return (
    <SegmentedToggle
      options={LOCALE_OPTIONS}
      value={current}
      onChange={handleChange}
      label="Language"
      variant="auto"
    />
  );
}
