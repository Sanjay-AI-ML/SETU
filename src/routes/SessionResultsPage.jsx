import { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useSessionState } from '../state/SessionContext.jsx';
import { saveSession, clearActiveSession, getChildProfile } from '../core/storage/index.js';
import { matchRules, mergeCells, applySurpassed } from '../core/matrix/index.js';
import { computeFlags } from '../core/matrix/flags.js';
import { computeAgeGap } from '../core/ageGap/index.js';
import ResponseTimeRibbon from '../components/ribbon/ResponseTimeRibbon.jsx';
import MatrixProfileGrid from '../components/matrix/MatrixProfileGrid.jsx';
import ClinicianShareModal from '../components/common/ClinicianShareModal.jsx';
import ShareButton from '../components/common/ShareButton.jsx';
import SmsReportButton from '../components/common/SmsReportButton.jsx';
import rulesConfig from '../data/matrix-rules.json';
import taxonomy from '../data/matrix-taxonomy.json';
import latencyBandsConfig from '../data/latency-bands.json';
import ageNormsConfig from '../data/age-norms.json';
import { useLanguage } from '../i18n/index.jsx';
import { generateStrategies } from '../core/strategies/index.js';

// ── Colour cycle for strategy cards ─────────────────────────────────────────
const STRATEGY_COLOURS = [
  { bg: '#e8f4fd', accent: '#1a6fa0', border: '#b3d9f0' },
  { bg: '#fef9ec', accent: '#9a6c10', border: '#f0d98a' },
  { bg: '#eef7ee', accent: '#2a6a40', border: '#a8d9b0' },
  { bg: '#f4edf8', accent: '#6a3a8a', border: '#cba8e0' },
];

export default function SessionResultsPage() {
  const navigate = useNavigate();
  const { session } = useSessionState();
  const { strings } = useLanguage();
  const [showClinicianModal, setShowClinicianModal] = useState(false);
  const [childAgeMonths, setChildAgeMonths] = useState(null);

  useEffect(() => {
    if (session?.activityRuns?.length) {
      saveSession(session);
      clearActiveSession();
    }
  }, [session]);

  useEffect(() => {
    getChildProfile().then((profile) => setChildAgeMonths(profile?.ageMonths ?? null));
  }, []);

  if (!session?.activityRuns?.length) {
    return <Navigate to="/" replace />;
  }

  const allTrials = session.activityRuns.flatMap((run) => run.trials);
  const cellsPerRun = session.activityRuns.map((run) =>
    matchRules(run.observations, rulesConfig, { sessionId: session.id, activityRunId: run.id })
  );
  const cells = applySurpassed(mergeCells(cellsPerRun));
  const ranActivityIds = session.activityRuns.map((run) => run.activityId);
  const flags = computeFlags({ trials: allTrials, cells, latencyBandsConfig, ranActivityIds });
  const ageGap = computeAgeGap({ ageMonths: childAgeMonths, cells, ageNormsConfig });

  // ── Generate personalized home strategies ──────────────────────────────
  const strategies = generateStrategies(cells, 4);

  return (
    <main className="screen-wide">
      <div className="screen-head">
        <p className="eyebrow">{strings.sessionResults?.eyebrow || 'Session complete'}</p>
        <h1>{strings.sessionResults.title}</h1>
      </div>

      {/* ── Response time ribbon ─────────────────────────────────────── */}
      <div className="section card">
        <ResponseTimeRibbon trials={allTrials} bands={latencyBandsConfig} />
        <p className="matrix-caption" style={{ margin: '10px 0 0' }}>
          {latencyBandsConfig.disclaimer}
        </p>
      </div>

      {/* ── Age-referenced developmental gap ─────────────────────────── */}
      <div className="section card">
        <h2 style={{ marginTop: 0 }}>🎯 {strings.sessionResults?.ageCheckTitle || 'Developmental age check'}</h2>
        {ageGap.status === 'insufficient-data' ? (
          <p className="empty-note">{strings.sessionResults?.ageCheckInsufficient || 'Not enough observations yet to estimate a developmental level.'}</p>
        ) : (
          <>
            <p style={{ margin: '0 0 6px' }}>
              {(strings.sessionResults?.ageCheckStrongest || 'Strongest observed level: Level {level} ({note}) — typically seen at {min}–{max} months.')
                .replace('{level}', ageGap.functionalLevel)
                .replace('{note}', ageGap.note)
                .replace('{min}', ageGap.expectedRange.minMonths)
                .replace('{max}', ageGap.expectedRange.maxMonths)}
            </p>
            {ageGap.status === 'on-track' && (
              <p className="chip" style={{ background: 'var(--mastered)' }}>
                {strings.sessionResults?.ageCheckOnTrack || 'On track for stated age ✅'}
              </p>
            )}
            {ageGap.status === 'ahead' && (
              <p className="chip" style={{ background: 'var(--emerging)' }}>
                {(strings.sessionResults?.ageCheckAhead || 'Performing ~{months} months ahead of stated age 🌟').replace('{months}', ageGap.gapMonths)}
              </p>
            )}
            {ageGap.status === 'delayed' && (
              <p className="chip" style={{ background: 'var(--concern)' }}>
                {(strings.sessionResults?.ageCheckDelayed || '~{months} months behind the typical range for stated age — discuss with a clinician 🔶').replace('{months}', ageGap.gapMonths)}
              </p>
            )}
          </>
        )}
        <p className="matrix-caption" style={{ margin: '10px 0 0' }}>{ageGap.disclaimer}</p>
      </div>

      {/* ── Communication Matrix profile ─────────────────────────────── */}
      <div className="section">
        <h2>{strings.sessionResults?.matrixTitle || 'Communication Matrix profile'}</h2>
        <MatrixProfileGrid cells={cells} taxonomy={taxonomy} />
      </div>

      {/* ── Clinical Flags ───────────────────────────────────────────── */}
      <div className="section">
        <h2>{strings.sessionResults.flagsTitle}</h2>
        {flags.length === 0 ? (
          <p className="empty-note">{strings.sessionResults.noFlags}</p>
        ) : (
          <ul className="card-list">
            {flags.map((flag) => (
              <li key={flag.id} className="flag-card">
                <strong>{flag.label}</strong>
                {flag.detail && <p className="matrix-caption" style={{ margin: '4px 0 0' }}>{flag.detail}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Personalized Home Strategies ─────────────────────────────── */}
      {strategies.length > 0 && (
        <div className="section">
          <div className="strategies-header">
            <h2>🏠 {strings.sessionResults?.strategiesTitle || 'What To Do Tomorrow'}</h2>
            <p className="strategies-subtitle">
              {strings.sessionResults?.strategiesSubtitle || "Personalized home strategies based on today's observations — try these during your everyday routines."}
            </p>
          </div>
          <div className="strategies-list">
            {strategies.map((strategy, i) => {
              const col = STRATEGY_COLOURS[i % STRATEGY_COLOURS.length];
              return (
                <div
                  key={strategy.id}
                  className="strategy-card"
                  style={{
                    '--str-bg': col.bg,
                    '--str-accent': col.accent,
                    '--str-border': col.border,
                  }}
                >
                  <div className="strategy-card-header">
                    <span className="strategy-icon">{strategy.icon}</span>
                    <div className="strategy-card-title-col">
                      <span className="strategy-title">{strategy.title}</span>
                      <div className="strategy-routines">
                        {strategy.routines.slice(0, 2).map((r) => (
                          <span key={r} className="strategy-routine-tag">
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="strategy-priority-dot" title={`Priority ${strategy.priority}`}>
                      {'●'.repeat(4 - strategy.priority)}
                    </span>
                  </div>
                  <p className="strategy-desc">{strategy.description}</p>
                  <div className="strategy-example">
                    <span className="strategy-example-label">💡 Example</span>
                    <p className="strategy-example-text">{strategy.example}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Action buttons ───────────────────────────────────────────── */}
      <div className="actions inline" style={{ flexWrap: 'wrap', gap: 10 }}>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/session/report')}
        >
          {strings.sessionResults.reportButton}
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => setShowClinicianModal(true)}
        >
          🩺 {strings.sessionResults?.shareSpecialist || 'Share with Specialist'}
        </button>
        <ShareButton
          title="SETU Communication Assessment Results"
          text={`Assessment complete with ${session.activityRuns.length} activities and ${allTrials.length} response trials.`}
        />
        <SmsReportButton flags={flags} ageGap={ageGap} activityCount={session.activityRuns.length} />
      </div>

      {/* ── Clinician Share Modal ─────────────────────────────────────── */}
      {showClinicianModal && (
        <ClinicianShareModal
          session={session}
          cells={cells}
          onClose={() => setShowClinicianModal(false)}
        />
      )}
    </main>
  );
}
