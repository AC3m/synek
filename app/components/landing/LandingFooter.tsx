import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';

export function LandingFooter() {
  const { t } = useTranslation('landing');
  const { locale = 'pl' } = useParams<{ locale: string }>();

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <p className="text-xs font-medium tracking-widest text-muted-foreground/50 uppercase">
            © {new Date().getFullYear()} SYNEK
          </p>
          <nav className="flex items-center gap-6">
            <Link
              to={`/${locale}/support`}
              className="text-xs font-medium tracking-wider text-muted-foreground/60 uppercase transition-colors hover:text-foreground"
            >
              {t('footer.support')}
            </Link>
            <span className="text-border" aria-hidden>
              ·
            </span>
            <Link
              to={`/${locale}/privacy-policy`}
              className="text-xs font-medium tracking-wider text-muted-foreground/60 uppercase transition-colors hover:text-foreground"
            >
              {t('footer.privacyPolicy')}
            </Link>
            <span className="text-border" aria-hidden>
              ·
            </span>
            <Link
              to={`/${locale}/terms`}
              className="text-xs font-medium tracking-wider text-muted-foreground/60 uppercase transition-colors hover:text-foreground"
            >
              {t('footer.terms')}
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
