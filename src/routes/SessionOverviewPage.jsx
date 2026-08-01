import { Navigate, useNavigate } from 'react-router-dom';
import activities from '../data/activities.json';
import { useSessionState } from '../state/SessionContext.jsx';
import { useLanguage } from '../i18n/index.jsx';

export default function SessionOverviewPage() {
  const navigate = useNavigate();
  const { session } = useSessionState();
  const { strings } = useLanguage();

  if (!session) {
    return <Navigate to="/" replace />;
  }

  const completedCount = session.activityRuns.length;
  const allDone = completedCount >= activities.length;

  return (
    <main>
      <div className="screen-head">
        <p className="eyebrow">{strings.sessionOverview?.eyebrow || 'Session in progress'}</p>
        <h1>{strings.sessionOverview.title}</h1>
        <p className="subtitle">
          {strings.sessionOverview.progressLabel
            .replace('{completed}', completedCount)
            .replace('{total}', activities.length)}
        </p>
      </div>
      <div className="progress-track">
        {activities.map((activity, index) => (
          <span key={activity.id} className={index < completedCount ? 'filled' : ''} />
        ))}
      </div>
      <ul className="card-list">
        {activities.map((activity, index) => {
          const isDone = index < completedCount;
          const isCurrent = index === completedCount;
          return (
            <li key={activity.id} className={`activity-card${isDone ? ' done' : ''}${isCurrent ? ' current' : ''}`}>
              <span className="idx">{isDone ? '✓' : index + 1}</span>
              <span className="name">{activity.name}</span>
              {isDone && <span className="status">{strings.sessionOverview.doneLabel}</span>}
            </li>
          );
        })}
      </ul>
      <div className="actions">
        {allDone ? (
          <button className="btn btn-primary" onClick={() => navigate('/session/results')}>
            {strings.sessionOverview.seeResultsButton}
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => navigate('/session/activity/prebrief')}>
            {strings.sessionOverview.continueButton}
          </button>
        )}
      </div>
    </main>
  );
}
