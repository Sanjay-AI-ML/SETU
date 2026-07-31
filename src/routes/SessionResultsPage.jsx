import { useNavigate } from 'react-router-dom';
import { useSessionState } from '../state/SessionContext.jsx';
import { applyRules } from '../core/matrix/index.js';
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
  const activityRun = session.activityRuns[session.activityRuns.length - 1];

  const cells = applyRules(activityRun.observations, rulesConfig, {
    sessionId: session.id,
    activityRunId: activityRun.id,
  });
  const flags = computeFlags({ trials: activityRun.trials, cells, latencyBandsConfig });

  return (
    <main>
      <h1>{strings.sessionResults.title}</h1>
      <ResponseTimeRibbon trials={activityRun.trials} bands={latencyBandsConfig} />
      <MatrixProfileGrid cells={cells} taxonomy={taxonomy} />
      <h2>{strings.sessionResults.flagsTitle}</h2>
      {flags.length === 0 && <p>{strings.sessionResults.noFlags}</p>}
      <ul>
        {flags.map((flag) => (
          <li key={flag.id}>{flag.label}</li>
        ))}
      </ul>
      <button onClick={() => navigate('/session/report')}>{strings.sessionResults.reportButton}</button>
    </main>
  );
}
