import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { LandingNav } from '~/components/landing/LandingNav';

export function meta() {
  return [{ title: 'Terms & Conditions — SYNEK' }];
}

const SECTIONS = [
  'section1',
  'section2',
  'section3',
  'section4',
  'section5',
  'section6',
  'section7',
  'section8',
  'section9',
] as const;

export default function TermsPage() {
  const { t } = useTranslation('legal');
  const { locale = 'pl' } = useParams<{ locale: string }>();

  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <main className="mx-auto max-w-2xl px-6 pt-28 pb-24">
        {/* Back link */}
        <Link
          to={`/${locale}`}
          className="mb-10 inline-flex items-center gap-1.5 text-xs font-medium tracking-wider text-muted-foreground uppercase transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          {t('backToHome')}
        </Link>

        {/* Header */}
        <header className="mb-12 border-b border-border pb-8">
          <p className="mb-3 text-xs font-semibold tracking-widest text-muted-foreground/60 uppercase">
            {t('lastUpdated')}
          </p>
          <h1 className="text-3xl font-black tracking-tight uppercase italic">
            {t('terms.title')}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t('terms.intro')}</p>
        </header>

        {/* Sections */}
        <div className="space-y-10">
          {SECTIONS.map((key) => (
            <section key={key}>
              <h2 className="mb-3 text-xs font-bold tracking-widest text-foreground/50 uppercase">
                {t(`terms.${key}.title`)}
              </h2>
              <p className="text-sm leading-7 whitespace-pre-line text-muted-foreground">
                {t(`terms.${key}.body`)}
              </p>
            </section>
          ))}

          <div className="border-t border-border pt-10">
            <h2 className="mb-3 text-xs font-bold tracking-widest text-foreground/50 uppercase">
              {t('terms.contact.title')}
            </h2>
            <p className="text-sm leading-7 text-muted-foreground">{t('terms.contact.body')}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
