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
import { AuthProvider } from '~/lib/context/AuthContext';
import { ThemeProvider } from '~/lib/context/ThemeContext';

import type { Route } from './+types/root';
import './app.css';
import '~/i18n/config';

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
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('theme')||'dark';if(t==='dark')document.documentElement.classList.add('dark');})();` }} />
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
  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
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
    details =
      error.status === 404
        ? t('errors.404')
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-[60vh] p-4 container mx-auto text-center">
      <div className="text-6xl font-bold text-muted-foreground/40 mb-4">
        {message}
      </div>
      <p className="text-lg text-muted-foreground mb-6">{details}</p>
      <a
        href="/"
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        {t('errors.goHome')}
      </a>
      {stack && (
        <pre className="mt-8 w-full max-w-2xl p-4 overflow-x-auto text-left text-xs bg-muted rounded-lg">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
