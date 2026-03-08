import { Navigate } from 'react-router';
import { getCurrentWeekId } from '~/lib/utils/date';

export default function AthleteWeekIndex() {
  return <Navigate to={`/athlete/week/${getCurrentWeekId()}`} replace />;
}
