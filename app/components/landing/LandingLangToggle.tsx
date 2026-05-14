import { useLocation, useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { SegmentedToggle } from './shared/SegmentedToggle';

type Locale = 'en' | 'pl';

const LOCALE_OPTIONS = [
  { value: 'en' as const, label: 'EN' },
  { value: 'pl' as const, label: 'PL' },
] as const;

interface LandingLangToggleProps {
  className?: string;
}

export function LandingLangToggle({ className }: LandingLangToggleProps) {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { locale } = useParams<{ locale: string }>();
  const { pathname } = useLocation();
  const current: Locale = locale === 'pl' ? 'pl' : 'en';

  const handleChange = (next: Locale) => {
    try {
      localStorage.setItem('locale', next);
    } catch {
      // Ignore storage errors (private mode, etc.) — navigation still works.
    }
    void i18n.changeLanguage(next);
    if (locale) {
      navigate(pathname.replace(/^\/[^/]+/, `/${next}`));
    } else {
      navigate(`/${next}`);
    }
  };

  return (
    <SegmentedToggle
      options={LOCALE_OPTIONS}
      value={current}
      onChange={handleChange}
      label="Language"
      className={className}
    />
  );
}
