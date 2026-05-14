import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { Logo } from '~/components/shared/Logo';
import { useSmoothScroll } from '../hooks/useSmoothScroll';

const FOOTER_ANCHORS = [
  { href: '#why', labelKey: 'landingFooter.product' },
  { href: '#features', labelKey: 'landingFooter.features' },
  { href: '#perspectives', labelKey: 'landingFooter.perspectives' },
  { href: '#join', labelKey: 'landingFooter.beta' },
  { href: '#contact', labelKey: 'landingFooter.contact' },
] as const;

export function LandingFooter() {
  const { t } = useTranslation('landing');
  const { locale = 'pl' } = useParams<{ locale: string }>();
  const smoothScroll = useSmoothScroll();

  return (
    <footer className="border-t border-white/10 px-5 py-8 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-3 text-[13px]">
          <Logo size="sm" />
          <span className="landing-mono text-[11px] opacity-50">{t('landingFooter.meta')}</span>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12.5px] opacity-70">
          {FOOTER_ANCHORS.map(({ href, labelKey }) => (
            <a key={href} href={href} onClick={(e) => smoothScroll(e, href)}>
              {t(labelKey as never)}
            </a>
          ))}
          <Link to={`/${locale}/privacy-policy`}>{t('landingFooter.privacy')}</Link>
          <Link to={`/${locale}/terms`}>{t('landingFooter.terms')}</Link>
        </nav>
      </div>
    </footer>
  );
}
