-- Fix: add search_path to SECURITY DEFINER function to prevent search_path injection.
ALTER FUNCTION public.get_analytics_summary(UUID, TEXT, UUID, TEXT, DATE)
  SET search_path = public, auth;
