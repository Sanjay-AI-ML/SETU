import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSessions, deleteSession } from '../core/storage/index.js';
import { useSessionDispatch } from '../state/SessionContext.jsx';
import LongitudinalProgressCard from '../components/history/LongitudinalProgressCard.jsx';
import { useLanguage } from '../i18n/index.jsx';

export default function SessionHistoryPage() {
  const navigate = useNavigate();
  const dispatch = useSessionDispatch();
  const { strings } = useLanguage();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    setLoading(true);
    const list = await getSessions();
    setSessions(list);
    setLoading(false);
  }

  async function handleDelete(sessionId, event) {
    event.stopPropagation();
    const confirmMsg = strings.sessionHistory?.confirmDelete || 'Are you sure you want to delete this session from history?';
    if (window.confirm(confirmMsg)) {
      await deleteSession(sessionId);
      await loadSessions();
    }
  }

  function handleViewResults(session) {
    dispatch({ type: 'LOAD_DEMO_SESSION', session });
    navigate('/session/results');
  }

  function handleViewReport(session) {
    dispatch({ type: 'LOAD_DEMO_SESSION', session });
    navigate('/session/report');
  }

  return (
    <main className="screen-wide">
      <div className="screen-head">
        <p className="eyebrow">{strings.sessionHistory?.eyebrow || 'Assessment records'}</p>
        <h1>{strings.sessionHistory?.title || 'Session History'}</h1>
        <p className="subtitle">{strings.sessionHistory?.subtitle || 'Review and inspect previously saved assessment runs.'}</p>
      </div>

      {/* ── Longitudinal Progress Card ──────────────────────────────── */}
      {!loading && sessions.length > 0 && (
        <LongitudinalProgressCard sessions={sessions} />
      )}

      {loading ? (
        <p className="notice">{strings.sessionHistory?.loading || 'Loading past sessions...'}</p>
      ) : sessions.length === 0 ? (
        <div className="section card" style={{ textAlign: 'center', padding: '32px 16px' }}>
          <p className="empty-note" style={{ margin: 0 }}>{strings.sessionHistory?.noSessions || 'No past sessions found yet.'}</p>
          <p style={{ fontSize: '0.86rem', color: 'var(--ink-soft)', marginTop: 8 }}>
            {strings.sessionHistory?.noSessionsSub || 'Complete an assessment session to automatically save it here.'}
          </p>
        </div>
      ) : (
        <div className="section">
          <p className="history-list-label">
            {strings.sessionHistory?.allSessions || 'All Sessions'}
          </p>
          <div className="card-list">
            {sessions.map((session) => {
              const dateStr = session.startedAt
                ? new Date(session.startedAt).toLocaleString()
                : '?';
              const runsCount = session.activityRuns?.length ?? 0;
              const totalTrials = session.activityRuns?.reduce(
                (acc, run) => acc + (run.trials?.length ?? 0),
                0
              ) ?? 0;
              const isDemo = session.id?.startsWith('demo-');

              return (
                <div
                  key={session.id}
                  className="card"
                  style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 750 }}>
                        {(strings.sessionHistory?.sessionTitle || 'Session {id}').replace('{id}', session.id.slice(0, 8))}
                      </h3>
                      <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--ink-soft)' }}>
                        {dateStr}{' '}
                        {isDemo && (
                          <span
                            className="chip"
                            style={{
                              marginLeft: 6,
                              fontSize: '0.68rem',
                              padding: '2px 6px',
                            }}
                          >
                            DEMO
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      className="btn btn-ghost"
                      onClick={(e) => handleDelete(session.id, e)}
                      style={{ padding: '4px 8px', color: 'var(--concern)', fontSize: '0.8rem', width: 'auto' }}
                      title={strings.sessionHistory?.delete || 'Delete'}
                    >
                      🗑️ {strings.sessionHistory?.delete || 'Delete'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '14px', fontSize: '0.84rem', color: 'var(--ink-soft)' }}>
                    <span>📋 {(strings.sessionHistory?.activities || '{count} Activities').replace('{count}', runsCount)}</span>
                    <span>⏱️ {(strings.sessionHistory?.trials || '{count} Trials').replace('{count}', totalTrials)}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: 4 }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleViewResults(session)}
                      style={{ flex: 1, padding: '9px 12px', fontSize: '0.86rem' }}
                    >
                      {strings.sessionHistory?.viewMatrix || 'View Matrix Results'}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleViewReport(session)}
                      style={{ flex: 1, padding: '9px 12px', fontSize: '0.86rem' }}
                    >
                      {strings.sessionHistory?.viewReport || 'View Report'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="actions" style={{ marginTop: 20 }}>
        <button className="btn btn-ghost" onClick={() => navigate('/')}>
          {strings.sessionHistory?.backHome || 'Back to Home'}
        </button>
      </div>
    </main>
  );
}
