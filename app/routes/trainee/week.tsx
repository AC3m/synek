import { Navigate } from 'react-router';
import { getCurrentWeekId } from '~/lib/utils/date';

export default function TraineeWeekIndex() {
  return <Navigate to={`/trainee/week/${getCurrentWeekId()}`} replace />;
}
