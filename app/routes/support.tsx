import { LandingNav } from '~/components/landing/LandingNav';
import { LandingFooter } from '~/components/landing/LandingFooter';
import { SupportSection } from '~/components/landing/SupportSection';

export function meta() {
  return [{ title: 'Support — SYNEK' }];
}

export default function SupportPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LandingNav />
      <main className="flex-1">
        <SupportSection />
      </main>
      <LandingFooter />
    </div>
  );
}
