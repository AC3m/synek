import { LandingNav } from '~/components/shared/LandingNav';
import { LandingFooter } from '~/components/landing/layout/LandingFooter';
import { SupportSection } from '~/components/support/SupportSection';

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
