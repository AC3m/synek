import { useParams } from 'react-router';
import { StrengthLibraryView } from '~/components/strength/StrengthLibraryView';
import { useAuth } from '~/lib/context/AuthContext';

export default function CoachStrengthLibrary() {
  const { locale = 'pl' } = useParams<{ locale?: string }>();
  const { user, effectiveAthleteId } = useAuth();
  const userId = effectiveAthleteId ?? user?.id ?? '';
  return (
    <StrengthLibraryView
      userId={userId}
      canManage={!effectiveAthleteId}
      baseRoute={`/${locale}/coach/strength`}
    />
  );
}
