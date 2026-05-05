import { Outlet, useNavigation } from 'react-router';
import { Header } from '~/components/layout/Header';
import { BottomNav } from '~/components/layout/BottomNav';
import { InstallPrompt } from '~/components/layout/InstallPrompt';
import { AppLoader } from '~/components/ui/app-loader';

export default function LocaleLayout() {
  const navigation = useNavigation();

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-6 pb-24 md:pb-6">
        <Outlet />
      </main>
      <BottomNav />
      <InstallPrompt />
      {navigation.state === 'loading' && <AppLoader />}
    </>
  );
}
