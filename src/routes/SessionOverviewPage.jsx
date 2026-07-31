import { Navigate, useNavigate } from 'react-router-dom';
import activities from '../data/activities.json';
import { useSessionState } from '../state/SessionContext.jsx';
import strings from '../i18n/en.json';

export default function SessionOverviewPage() {
  const navigate = useNavigate();
  const { session } = useSessionState();

  if (!session) {
    return <Navigate to="/" replace />;
  }

  const completedCount = session.activityRuns.length;
  const allDone = completedCount >= activities.length;

  return (
    <main>
      <h1>{strings.sessionOverview.title}</h1>
      <p>
        {strings.sessionOverview.progressLabel
          .replace('{completed}', completedCount)
          .replace('{total}', activities.length)}
      </p>
      <ul>
        {activities.map((activity, index) => (
          <li key={activity.id}>
            {activity.name}
            {index < completedCount ? ` — ${strings.sessionOverview.doneLabel}` : ''}
          </li>
        ))}
      </ul>
      {allDone ? (
        <button onClick={() => navigate('/session/results')}>
          {strings.sessionOverview.seeResultsButton}
        </button>
      ) : (
        <button onClick={() => navigate('/session/activity/prebrief')}>
          {strings.sessionOverview.continueButton}
        </button>
      )}
    </main>
  );
}
