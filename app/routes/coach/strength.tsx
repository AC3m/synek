import { useParams } from 'react-router';
import { StrengthLibraryView } from '~/components/strength/StrengthLibraryView';
import { useAuth } from '~/lib/context/AuthContext';

export default function CoachStrengthLibrary() {
  const { locale = 'pl' } = useParams<{ locale?: string }>();
  const { user } = useAuth();
  return (
    <StrengthLibraryView
      userId={user?.id ?? ''}
      canManage={true}
      baseRoute={`/${locale}/coach/strength`}
    />
  );
}
