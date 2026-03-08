import { Navigate } from 'react-router';
import { getCurrentWeekId } from '~/lib/utils/date';

export default function CoachWeekIndex() {
  return <Navigate to={`/coach/week/${getCurrentWeekId()}`} replace />;
}
