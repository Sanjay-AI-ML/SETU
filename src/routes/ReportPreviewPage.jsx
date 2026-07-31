import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useSessionState } from '../state/SessionContext.jsx';
import { getChildProfile } from '../core/storage/index.js';
import { applyRules } from '../core/matrix/index.js';
import { computeFlags } from '../core/matrix/flags.js';
import { generateReport } from '../core/report/index.js';
import rulesConfig from '../data/matrix-rules.json';
import latencyBandsConfig from '../data/latency-bands.json';
import strings from '../i18n/en.json';

export default function ReportPreviewPage() {
  const { session } = useSessionState();
  const [report, setReport] = useState(null);

  useEffect(() => {
    getChildProfile().then((child) => {
      const activityRun = session.activityRuns[session.activityRuns.length - 1];
      const cells = applyRules(activityRun.observations, rulesConfig, {
        sessionId: session.id,
        activityRunId: activityRun.id,
      });
      const flags = computeFlags({ trials: activityRun.trials, cells, latencyBandsConfig });
      setReport(generateReport({ session, child, cells, flags, trials: activityRun.trials }));
    });
  }, [session]);

  if (!session?.activityRuns?.length) {
    return <Navigate to="/" replace />;
  }

  if (!report) return null;

  return (
    <main>
      <h1>{strings.reportPreview.title}</h1>
      <p>{report.sections.child.displayName} — {report.sections.child.ageMonths} months</p>
      <h2>{strings.reportPreview.disclaimersTitle}</h2>
      <ul>
        {report.disclaimers.map((disclaimer, index) => (
          <li key={index}>{disclaimer}</li>
        ))}
      </ul>
      <button onClick={() => window.print()}>{strings.reportPreview.printButton}</button>
    </main>
  );
}
