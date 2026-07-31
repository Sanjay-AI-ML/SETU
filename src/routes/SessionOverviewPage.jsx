import { useNavigate } from 'react-router-dom';
import activities from '../data/activities.json';
import strings from '../i18n/en.json';

const bubbleTime = activities.find((activity) => activity.id === 'bubble-time');

export default function SessionOverviewPage() {
  const navigate = useNavigate();

  return (
    <main>
      <h1>{strings.sessionOverview.title}</h1>
      <p>{strings.sessionOverview.activityCount}</p>
      <h2>{bubbleTime.name}</h2>
      <button onClick={() => navigate('/session/activity/prebrief')}>
        {strings.sessionOverview.beginButton}
      </button>
    </main>
  );
}
