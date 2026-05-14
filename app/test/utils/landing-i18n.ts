import i18n from 'i18next';

/**
 * Switch the test i18n instance to a given locale, returning a restore function.
 * Use in landing tests that need to assert PL copy.
 *
 * Example:
 *   const restore = await useLocale('pl');
 *   render(<HeroSection />);
 *   expect(screen.getByText(/trenuj świadomie/i)).toBeInTheDocument();
 *   await restore();
 */
export async function useLocale(lng: 'en' | 'pl'): Promise<() => Promise<void>> {
  const prev = i18n.language;
  await i18n.changeLanguage(lng);
  return async () => {
    await i18n.changeLanguage(prev);
  };
}
