import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '~/lib/context/AuthContext';
import { LandingNav } from '~/components/landing/LandingNav';
import { HeroSection } from '~/components/landing/HeroSection';
import { WhySection } from '~/components/landing/WhySection';
import { FeaturesSection } from '~/components/landing/FeaturesSection';
import { PerspectivesSection } from '~/components/landing/PerspectivesSection';
import { JoinBetaSection } from '~/components/landing/JoinBetaSection';
import { LandingContactSection } from '~/components/landing/LandingContactSection';
import { LandingFooter } from '~/components/landing/LandingFooter';
import { AppLoader } from '~/components/ui/app-loader';
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
        <LandingContactSection />
      </main>
      <LandingFooter />
    </div>
  );
}
