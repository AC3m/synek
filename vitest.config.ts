import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    // Do NOT include tailwindcss() — no-op in jsdom, can cause transform errors
    // Do NOT include reactRouter() — breaks Vitest module resolution
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./app/test/setup.ts'],
    onConsoleLog(log) {
      if (log.includes('i18next is maintained')) return false;
    },
    include: ['app/test/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Spec SC-002: coverage applies to non-UI, non-generated source files only
      include: ['app/lib/**'],
      exclude: [
        'app/test/**',
        // Context providers — tested via vi.mock, not direct instantiation
        'app/lib/context/**',
        // Auth helpers — mock-mode only infrastructure
        'app/lib/auth.ts',
        // Real Supabase query functions — require live credentials (FR-010 explicitly prohibits this)
        // The mapper functions (toSession, toWeekPlan) are unit-tested separately
        'app/lib/queries/sessions.ts',
        'app/lib/queries/weeks.ts',
        // Out of scope for P1 test story (profile + strava)
        'app/lib/queries/profile.ts',
        'app/lib/queries/strava-connection.ts',
        'app/lib/hooks/useProfile.ts',
        'app/lib/hooks/useStravaConnection.ts',
        // Pure config declaration — no executable statements to cover
        'app/lib/utils/training-types.ts',
      ],
      thresholds: {
        lines: 60,
        functions: 60,
      },
    },
  },
});
