import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '~/lib/context/AuthContext';
import { LandingNav } from '~/components/shared/LandingNav';
import { HeroSection } from '~/components/landing/sections/hero/HeroSection';
import { WhySection } from '~/components/landing/sections/why/WhySection';
import { FeaturesSection } from '~/components/landing/sections/features/FeaturesSection';
import { PerspectivesSection } from '~/components/landing/sections/perspectives/PerspectivesSection';
import { JoinBetaSection } from '~/components/landing/sections/join-beta/JoinBetaSection';
import { ContactSection } from '~/components/landing/sections/contact/ContactSection';
import { LandingFooter } from '~/components/landing/layout/LandingFooter';
import { AppLoader } from '~/components/shared/AppLoader';
import '~/components/landing/landing.css';

export function meta() {
  return [
    { title: 'SYNEK — Train with intent. Together.' },
    {
      name: 'description',
      content:
        "SYNEK gives coaches a structured way to plan weekly training and gives athletes full visibility into what's ahead. Free during public beta.",
    },
  ];
}

export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { locale = 'pl' } = useParams<{ locale: string }>();

  useEffect(() => {
    if (!isLoading && user) {
      const target = user.role ? `/${locale}/${user.role}` : `/${locale}/select-role`;
      navigate(target, { replace: true });
    }
  }, [user, isLoading, navigate, locale]);

  useEffect(() => {
    const html = document.documentElement;
    const hadDark = html.classList.contains('dark');
    html.classList.add('dark');
    return () => {
      if (!hadDark) html.classList.remove('dark');
    };
  }, []);

  if (isLoading || user) {
    return <AppLoader />;
  }

  return (
    <div data-landing className="min-h-dvh">
      <LandingNav />
      <main>
        <HeroSection />
        <WhySection />
        <FeaturesSection />
        <PerspectivesSection />
        <JoinBetaSection />
        <ContactSection />
      </main>
      <LandingFooter />
    </div>
  );
}
