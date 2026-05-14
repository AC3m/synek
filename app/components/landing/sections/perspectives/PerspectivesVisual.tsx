import { CoachBoard } from './CoachBoard';
import { AthletePhone } from './AthletePhone';
import { SyncLine } from './SyncLine';

export function PerspectivesVisual() {
  return (
    <div
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: '1.6fr 0.4fr',
        alignItems: 'center',
        gap: 32,
      }}
    >
      <CoachBoard />
      <SyncLine />
      <AthletePhone />
    </div>
  );
}
