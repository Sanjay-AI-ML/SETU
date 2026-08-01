import { useEffect, useState } from 'react';
import { useLanguage } from '../../i18n/index.jsx';

/**
 * LongitudinalProgressCard
 * Renders a longitudinal view of a child's Communication Matrix progress across
 * multiple saved sessions — heatmap of level growth + small-wins timeline.
 */
export default function LongitudinalProgressCard({ sessions }) {
  const { strings, lang } = useLanguage();
  const localeMap = { en: 'en-GB', ta: 'ta-IN', hi: 'hi-IN' };
  const activeLocale = localeMap[lang] ?? 'en-GB';
  const [milestones, setMilestones] = useState([]);
  const [levelHistory, setLevelHistory] = useState([]);

  useEffect(() => {
    if (!sessions || sessions.length === 0) return;

    // ── Build level history from sessions ─────────────────────────────────
    const history = sessions.map((s) => {
      const dateStr = s.startedAt
        ? new Date(s.startedAt).toLocaleDateString(activeLocale, { day: 'numeric', month: 'short' })
        : '?';
      const runs = s.activityRuns ?? [];
      const totalTrials = runs.reduce((acc, r) => acc + (r.trials?.length ?? 0), 0);
      const avgResponseMs = (() => {
        const rtList = runs
          .flatMap((r) => r.trials ?? [])
          .map((t) => t.responseTimeMs)
          .filter((v) => typeof v === 'number' && v > 0);
        return rtList.length > 0
          ? Math.round(rtList.reduce((a, b) => a + b, 0) / rtList.length)
          : null;
      })();
      return { date: dateStr, totalTrials, avgResponseMs, sessionId: s.id };
    });
    setLevelHistory(history);

    // ── Extract small-win milestones ─────────────────────────────────────
    const wins = [];
    sessions.forEach((s, idx) => {
      const dateStr = s.startedAt
        ? new Date(s.startedAt).toLocaleDateString(activeLocale, { day: 'numeric', month: 'short' })
        : '?';

      // First session ever
      if (idx === 0) {
        wins.push({
          date: dateStr,
          icon: '🌟',
          label: strings.longitudinal?.firstAssessment || 'First assessment completed',
        });
      }

      // Trial count milestones
      const totalTrials = (s.activityRuns ?? []).reduce(
        (acc, r) => acc + (r.trials?.length ?? 0),
        0
      );
      if (totalTrials >= 10) {
        wins.push({
          date: dateStr,
          icon: '🎯',
          label: (strings.longitudinal?.responsesRecorded || '{count} responses recorded').replace('{count}', totalTrials),
        });
      }

      // Behaviour-specific milestones from observations
      const allObs = (s.activityRuns ?? []).flatMap((r) => r.observations ?? []);
      const hasFinger = allObs.some((o) =>
        ['point', 'pointed-at-food', 'pointed-at-toy', 'pointed-at-picture'].includes(o.behavior)
      );
      const hasWord = allObs.some((o) =>
        ['word', 'said-word', 'named-picture', 'named-toy'].includes(o.behavior)
      );
      if (hasFinger) {
        wins.push({
          date: dateStr,
          icon: '☝️',
          label: strings.longitudinal?.fingerPoint || 'Index finger point observed',
        });
      }
      if (hasWord) {
        wins.push({
          date: dateStr,
          icon: '🗣️',
          label: strings.longitudinal?.firstWord || 'First word / vocal label recorded',
        });
      }
    });

    // Deduplicate by label (keep earliest date)
    const dedupedWins = [];
    const seen = new Set();
    wins.forEach((w) => {
      if (!seen.has(w.label)) {
        seen.add(w.label);
        dedupedWins.push(w);
      }
    });
    setMilestones(dedupedWins.slice(0, 6));
  }, [sessions, strings, lang]);

  if (!sessions || sessions.length === 0) return null;

  const maxTrials = Math.max(...levelHistory.map((h) => h.totalTrials), 1);

  return (
    <div className="longitudinal-card card" aria-label="Longitudinal progress summary">
      <div className="longitudinal-header">
        <h2 className="longitudinal-title">📊 {strings.longitudinal?.title || 'Progress Over Time'}</h2>
        <p className="longitudinal-sub">
          {(strings.longitudinal?.trackingSub || '{count} assessment session(s) · Tracking growth').replace('{count}', sessions.length)}
        </p>
      </div>

      {/* ── Trial Count Bar Chart ────────────────────────────────────────── */}
      <div className="longitudinal-section">
        <p className="longitudinal-section-label">
          {strings.longitudinal?.activitySection || 'Session Activity'}
        </p>
        <div className="longitudinal-bars" style={{ marginBottom: '8px' }}>
          {levelHistory.map((h) => {
            const pct = Math.max(8, Math.round((h.totalTrials / maxTrials) * 100));
            const suffix = strings.longitudinal?.trialsSuffix ?? 'T';
            return (
              <div key={h.sessionId} className="lbar-col">
                <div className="lbar-track">
                  <div
                    className="lbar-fill"
                    style={{ height: `${pct}%` }}
                    data-count={`${h.totalTrials}${suffix}`}
                    title={`${h.totalTrials} ${strings.longitudinal?.trialsLabel ?? 'trials'}`}
                  />
                </div>
                <span className="lbar-label">{h.date}</span>
                <span className="lbar-count">{h.totalTrials}{suffix}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Avg Response Speed trend ────────────────────────────────────── */}
      {levelHistory.some((h) => h.avgResponseMs) && (
        <div className="longitudinal-section">
          <p className="longitudinal-section-label">
            {strings.longitudinal?.speedSection || 'Avg. Response Speed (ms)'}
          </p>
          <div className="longitudinal-speed-list">
            {levelHistory.map((h) =>
              h.avgResponseMs ? (
                <div key={h.sessionId} className="speed-row">
                  <span className="speed-date">{h.date}</span>
                  <div className="speed-track">
                    <div
                      className="speed-fill"
                      style={{
                        width: `${Math.min(100, Math.round((h.avgResponseMs / 6000) * 100))}%`,
                        background:
                          h.avgResponseMs < 2000
                            ? 'var(--mastered)'
                            : h.avgResponseMs < 4000
                            ? 'var(--emerging)'
                            : 'var(--concern)',
                      }}
                    />
                  </div>
                  <span className="speed-value">{(h.avgResponseMs / 1000).toFixed(1)}{strings.longitudinal?.secondsSuffix ?? 's'}</span>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* ── Small Wins Timeline ──────────────────────────────────────────── */}
      {milestones.length > 0 && (
        <div className="longitudinal-section">
          <p className="longitudinal-section-label">
            🏅 {strings.longitudinal?.milestonesSection || 'Milestone Highlights'}
          </p>
          <div className="milestone-timeline">
            {milestones.map((m, i) => (
              <div key={i} className="milestone-row">
                <div className="milestone-dot">{m.icon}</div>
                <div className="milestone-body">
                  <span className="milestone-label">{m.label}</span>
                  <span className="milestone-date">{m.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
