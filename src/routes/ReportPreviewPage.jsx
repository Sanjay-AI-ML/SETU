import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { registerPlugin } from '@capacitor/core';
import { useSessionState } from '../state/SessionContext.jsx';

const Printer = registerPlugin('Printer');
import { getChildProfile } from '../core/storage/index.js';
import { matchRules, mergeCells, applySurpassed } from '../core/matrix/index.js';
import { computeFlags } from '../core/matrix/flags.js';
import { generateReport } from '../core/report/index.js';
import MatrixProfileGrid from '../components/matrix/MatrixProfileGrid.jsx';
import ResponseTimeRibbon from '../components/ribbon/ResponseTimeRibbon.jsx';
import rulesConfig from '../data/matrix-rules.json';
import latencyBandsConfig from '../data/latency-bands.json';
import taxonomy from '../data/matrix-taxonomy.json';
import { useLanguage } from '../i18n/index.jsx';

import ShareButton from '../components/common/ShareButton.jsx';
import SmsReportButton from '../components/common/SmsReportButton.jsx';

export default function ReportPreviewPage() {
  const { session } = useSessionState();
  const { strings } = useLanguage();
  const [report, setReport] = useState(null);

  useEffect(() => {
    if (!session?.activityRuns?.length) return;
    getChildProfile().then((child) => {
      const allTrials = session.activityRuns.flatMap((run) => run.trials);
      const cellsPerRun = session.activityRuns.map((run) =>
        matchRules(run.observations, rulesConfig, { sessionId: session.id, activityRunId: run.id })
      );
      const cells = applySurpassed(mergeCells(cellsPerRun));
      const ranActivityIds = session.activityRuns.map((run) => run.activityId);
      const flags = computeFlags({ trials: allTrials, cells, latencyBandsConfig, ranActivityIds });
      setReport(generateReport({ session, child, cells, flags, trials: allTrials }));
    });
  }, [session]);

  if (!session?.activityRuns?.length) {
    return <Navigate to="/" replace />;
  }

  if (!report) return null;

  const allTrials = session.activityRuns.flatMap((run) => run.trials);

  return (
    <main className="screen-wide">
      <div className="screen-head">
        <p className="eyebrow">{strings.reportPreview?.eyebrow || 'Clinician-facing document'}</p>
        <h1>{strings.reportPreview.title}</h1>
        <p className="subtitle">
          {report.sections.child.displayName}, {report.sections.child.ageMonths} months
        </p>
        <p className="matrix-caption" style={{ margin: '2px 0 0' }}>
          {strings.reportPreview.generatedLabel.replace('{date}', new Date(report.generatedAt).toLocaleString())}
        </p>
      </div>

      <div className="section">
        <h2>{strings.reportPreview.disclaimersTitle}</h2>
        <ul className="card-list">
          {report.disclaimers.map((disclaimer, index) => (
            <li key={index} className="callout plain" style={{ borderLeftColor: 'var(--concern)' }}>
              <p>{disclaimer}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="section card">
        <h2 style={{ marginTop: 0 }}>{strings.reportPreview.ribbonTitle}</h2>
        <ResponseTimeRibbon trials={allTrials} bands={latencyBandsConfig} />
        <p className="matrix-caption" style={{ margin: '10px 0 0' }}>{latencyBandsConfig.disclaimer}</p>
      </div>

      <div className="section">
        <h2>{strings.reportPreview.matrixTitle}</h2>
        <MatrixProfileGrid cells={report.sections.matrixProfile} taxonomy={taxonomy} />
      </div>

      <div className="section card">
        <h2 style={{ marginTop: 0 }}>🎯 {strings.reportPreview?.ageCheckTitle || 'Developmental age check'}</h2>
        {report.sections.ageGap.status === 'insufficient-data' ? (
          <p className="empty-note">Not enough observations yet to estimate a developmental level.</p>
        ) : (
          <p style={{ margin: 0 }}>
            Strongest observed level: <strong>Level {report.sections.ageGap.functionalLevel}</strong> ({report.sections.ageGap.note}),
            typically seen at {report.sections.ageGap.expectedRange.minMonths}–{report.sections.ageGap.expectedRange.maxMonths} months.{' '}
            {report.sections.ageGap.status === 'delayed' &&
              `~${report.sections.ageGap.gapMonths} months behind the typical range for stated age.`}
            {report.sections.ageGap.status === 'ahead' &&
              `~${report.sections.ageGap.gapMonths} months ahead of the typical range for stated age.`}
            {report.sections.ageGap.status === 'on-track' && 'On track for stated age.'}
          </p>
        )}
        <p className="matrix-caption" style={{ margin: '10px 0 0' }}>{report.sections.ageGap.disclaimer}</p>
      </div>

      <div className="section">
        <h2>{strings.reportPreview.flagsTitle}</h2>
        {report.sections.flags.length === 0 ? (
          <p className="empty-note">{strings.reportPreview.noFlags}</p>
        ) : (
          <ul className="card-list">
            {report.sections.flags.map((flag) => (
              <li key={flag.id} className="flag-card">
                <strong>{flag.label}</strong>
                {flag.detail && <p className="matrix-caption" style={{ margin: '4px 0 0' }}>{flag.detail}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="actions inline">
        <button
          className="btn btn-primary"
          onClick={async () => {
            try {
              await Printer.print();
            } catch (error) {
              console.warn('Native printing not available or failed, falling back to window.print()', error);
              window.print();
            }
          }}
        >
          {strings.reportPreview.printButton}
        </button>
        <ShareButton
          title={`SETU Report: ${report.sections.child.displayName}`}
          text={`Clinician Report for ${report.sections.child.displayName} (${report.sections.child.ageMonths} months). Mapped to Communication Matrix.`}
        />
        <SmsReportButton
          flags={report.sections.flags}
          ageGap={report.sections.ageGap}
          activityCount={session.activityRuns.length}
        />
      </div>
    </main>
  );
}

