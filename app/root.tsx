import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from 'react-router';
import { useTranslation } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '~/components/ui/tooltip';
import { Toaster } from '~/components/ui/sonner';
import { AuthProvider, useAuth } from '~/lib/context/AuthContext';
import { ThemeProvider } from '~/lib/context/ThemeContext';
import { AppLoader } from '~/components/ui/app-loader';

import type { Route } from './+types/root';
import './app.css';
import '~/i18n/config';

function GlobalLoader() {
  const { isLoading } = useAuth();
  return isLoading ? <AppLoader /> : null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme')||'dark';if(t==='dark')document.documentElement.classList.add('dark');})();`,
          }}
        />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function HydrateFallback() {
  return <AppLoader />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <GlobalLoader />
            <Outlet />
            <Toaster position="bottom-right" richColors />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const { t } = useTranslation('common');
  let message = 'Oops!';
  let details = t('errors.generic');
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : t('errors.error');
    details = error.status === 404 ? t('errors.404') : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
      <div className="mb-4 text-6xl font-bold text-muted-foreground/40">{message}</div>
      <p className="mb-6 text-lg text-muted-foreground">{details}</p>
      <a
        href="/"
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {t('errors.goHome')}
      </a>
      {stack && (
        <pre className="mt-8 w-full max-w-2xl overflow-x-auto rounded-lg bg-muted p-4 text-left text-xs">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
