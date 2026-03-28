import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '~/lib/context/AuthContext';
import { LandingNav } from '~/components/landing/LandingNav';
import { HeroSection } from '~/components/landing/HeroSection';
import { WhySynekSection } from '~/components/landing/WhySynekSection';
import { FeaturesSection } from '~/components/landing/FeaturesSection';
import { JoinBetaSection } from '~/components/landing/JoinBetaSection';
import { ContactSection } from '~/components/landing/ContactSection';
import { AppLoader } from '~/components/ui/app-loader';

export function meta() {
  return [
    { title: 'Synek — Training planning for coaches and athletes' },
    {
      name: 'description',
      content:
        "Synek gives coaches a structured way to plan weekly training and gives athletes full visibility into what's ahead. Free during public beta.",
    },
  ];
}

export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { locale = 'pl' } = useParams<{ locale: string }>();

  useEffect(() => {
    if (!isLoading && user) {
      navigate(`/${locale}/${user.role}`, { replace: true });
    }
  }, [user, isLoading, navigate, locale]);

  if (isLoading) return null; // GlobalLoader in root.tsx covers this
  if (user) return <AppLoader />;

  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <main>
        <HeroSection />
        <WhySynekSection />
        <FeaturesSection />
        <JoinBetaSection />
        <ContactSection />
      </main>
    </div>
  );
}
