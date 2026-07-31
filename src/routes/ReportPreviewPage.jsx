import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useSessionState } from '../state/SessionContext.jsx';
import { getChildProfile } from '../core/storage/index.js';
import { matchRules, mergeCells, applySurpassed } from '../core/matrix/index.js';
import { computeFlags } from '../core/matrix/flags.js';
import { generateReport } from '../core/report/index.js';
import MatrixProfileGrid from '../components/matrix/MatrixProfileGrid.jsx';
import ResponseTimeRibbon from '../components/ribbon/ResponseTimeRibbon.jsx';
import rulesConfig from '../data/matrix-rules.json';
import latencyBandsConfig from '../data/latency-bands.json';
import taxonomy from '../data/matrix-taxonomy.json';
import strings from '../i18n/en.json';

export default function ReportPreviewPage() {
  const { session } = useSessionState();
  const [report, setReport] = useState(null);

  useEffect(() => {
    if (!session?.activityRuns?.length) return;
    getChildProfile().then((child) => {
      // Same session-wide aggregation as Session Results: match rules per
      // activity run (no per-run surpassed), merge to the highest state per
      // cell across the whole session, then apply surpassed once globally.
      const allTrials = session.activityRuns.flatMap((run) => run.trials);
      const cellsPerRun = session.activityRuns.map((run) =>
        matchRules(run.observations, rulesConfig, { sessionId: session.id, activityRunId: run.id })
      );
      const cells = applySurpassed(mergeCells(cellsPerRun));
      const flags = computeFlags({ trials: allTrials, cells, latencyBandsConfig });
      setReport(generateReport({ session, child, cells, flags, trials: allTrials }));
    });
  }, [session]);

  if (!session?.activityRuns?.length) {
    return <Navigate to="/" replace />;
  }

  if (!report) return null;

  const allTrials = session.activityRuns.flatMap((run) => run.trials);

  return (
    <main>
      <h1>{strings.reportPreview.title}</h1>
      <p>{report.sections.child.displayName} — {report.sections.child.ageMonths} months</p>
      <p>{strings.reportPreview.generatedLabel.replace('{date}', new Date(report.generatedAt).toLocaleString())}</p>
      <h2>{strings.reportPreview.disclaimersTitle}</h2>
      <ul>
        {report.disclaimers.map((disclaimer, index) => (
          <li key={index}>{disclaimer}</li>
        ))}
      </ul>
      <h2>{strings.reportPreview.ribbonTitle}</h2>
      <ResponseTimeRibbon trials={allTrials} bands={latencyBandsConfig} />
      <p>{latencyBandsConfig.disclaimer}</p>
      <h2>{strings.reportPreview.matrixTitle}</h2>
      <MatrixProfileGrid cells={report.sections.matrixProfile} taxonomy={taxonomy} />
      <h2>{strings.reportPreview.flagsTitle}</h2>
      {report.sections.flags.length === 0 && <p>{strings.reportPreview.noFlags}</p>}
      <ul>
        {report.sections.flags.map((flag) => (
          <li key={flag.id}>{flag.label}</li>
        ))}
      </ul>
      <button onClick={() => window.print()}>{strings.reportPreview.printButton}</button>
    </main>
  );
}
