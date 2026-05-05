import { Outlet, useNavigation } from 'react-router';
import { Header } from '~/components/layout/Header';
import { BottomNav } from '~/components/layout/BottomNav';
import { InstallPrompt } from '~/components/layout/InstallPrompt';
import { AppLoader } from '~/components/ui/app-loader';

export default function LocaleLayout() {
  const navigation = useNavigation();

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Header />
      <main className="container mx-auto flex-1 px-4 py-6 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-6">
        <Outlet />
      </main>
      <BottomNav />
      <InstallPrompt />
      {navigation.state === 'loading' && <AppLoader />}
    </div>
  );
}
