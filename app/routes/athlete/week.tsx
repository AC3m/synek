import { Navigate, useParams } from 'react-router';
import { getCurrentWeekId } from '~/lib/utils/date';

export default function AthleteWeekIndex() {
  const { locale = 'pl' } = useParams<{ locale?: string }>();
  return <Navigate to={`/${locale}/athlete/week/${getCurrentWeekId()}`} replace />;
}
