import { useNavigate, Navigate } from 'react-router-dom';
import { useSessionState } from '../state/SessionContext.jsx';
import { matchRules, mergeCells, applySurpassed } from '../core/matrix/index.js';
import { computeFlags } from '../core/matrix/flags.js';
import ResponseTimeRibbon from '../components/ribbon/ResponseTimeRibbon.jsx';
import MatrixProfileGrid from '../components/matrix/MatrixProfileGrid.jsx';
import rulesConfig from '../data/matrix-rules.json';
import taxonomy from '../data/matrix-taxonomy.json';
import latencyBandsConfig from '../data/latency-bands.json';
import strings from '../i18n/en.json';

export default function SessionResultsPage() {
  const navigate = useNavigate();
  const { session } = useSessionState();

  if (!session?.activityRuns?.length) {
    return <Navigate to="/" replace />;
  }

  // Aggregate across every completed activity run in the session, not just
  // the most recent one — a full session covers all 4 activities, and each
  // contributes its own trials (for the Ribbon) and matrix cells (merged to
  // the highest state observed per cell, via mergeCells).
  const allTrials = session.activityRuns.flatMap((run) => run.trials);
  const cellsPerRun = session.activityRuns.map((run) =>
    matchRules(run.observations, rulesConfig, { sessionId: session.id, activityRunId: run.id })
  );
  const cells = applySurpassed(mergeCells(cellsPerRun));
  const flags = computeFlags({ trials: allTrials, cells, latencyBandsConfig });

  return (
    <main className="screen-wide">
      <div className="screen-head">
        <p className="eyebrow">Session complete</p>
        <h1>{strings.sessionResults.title}</h1>
      </div>
      <div className="section card">
        <ResponseTimeRibbon trials={allTrials} bands={latencyBandsConfig} />
        <p className="matrix-caption" style={{ margin: '10px 0 0' }}>{latencyBandsConfig.disclaimer}</p>
      </div>
      <div className="section">
        <h2>Communication Matrix profile</h2>
        <MatrixProfileGrid cells={cells} taxonomy={taxonomy} />
      </div>
      <div className="section">
        <h2>{strings.sessionResults.flagsTitle}</h2>
        {flags.length === 0 ? (
          <p className="empty-note">{strings.sessionResults.noFlags}</p>
        ) : (
          <ul className="card-list">
            {flags.map((flag) => (
              <li key={flag.id} className="flag-card">{flag.label}</li>
            ))}
          </ul>
        )}
      </div>
      <div className="actions">
        <button className="btn btn-primary" onClick={() => navigate('/session/report')}>{strings.sessionResults.reportButton}</button>
      </div>
    </main>
  );
}
