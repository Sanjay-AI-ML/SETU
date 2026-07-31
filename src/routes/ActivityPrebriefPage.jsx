import { useNavigate } from 'react-router-dom';
import activities from '../data/activities.json';
import strings from '../i18n/en.json';

const bubbleTime = activities.find((activity) => activity.id === 'bubble-time');

export default function ActivityPrebriefPage() {
  const navigate = useNavigate();

  return (
    <main>
      <h1>{bubbleTime.name}</h1>
      <p>{bubbleTime.parentScript}</p>
      <h2>{strings.activityPrebrief.materialsLabel}</h2>
      <ul>
        {bubbleTime.materials.map((material) => (
          <li key={material}>{material}</li>
        ))}
      </ul>
      <button onClick={() => navigate('/session/activity/run')}>
        {strings.activityPrebrief.startButton}
      </button>
    </main>
  );
}
