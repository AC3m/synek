import { Navigate, useParams } from 'react-router';
import { getCurrentWeekId } from '~/lib/utils/date';

export default function CoachWeekIndex() {
  const { locale = 'pl' } = useParams<{ locale?: string }>();
  return <Navigate to={`/${locale}/coach/week/${getCurrentWeekId()}`} replace />;
}
