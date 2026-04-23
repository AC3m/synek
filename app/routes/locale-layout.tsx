import { Outlet } from 'react-router';
import { Header } from '~/components/layout/Header';
import { BottomNav } from '~/components/layout/BottomNav';
import { InstallPrompt } from '~/components/layout/InstallPrompt';

export default function LocaleLayout() {
  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-6 pb-24 md:pb-6">
        <Outlet />
      </main>
      <BottomNav />
      <InstallPrompt />
    </>
  );
}
