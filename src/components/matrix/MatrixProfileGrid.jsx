import { Fragment, useState } from 'react';

const STATE_LABELS = {
  'not-used': 'Not used',
  emerging: 'Emerging',
  mastered: 'Mastered',
  surpassed: 'Surpassed',
};

const STATE_SHORT_LABELS = {
  'not-used': '—',
  emerging: 'E',
  mastered: 'M',
  surpassed: 'S',
};

const STATE_VARS = {
  'not-used': {
    bg: '#f1f5f9',
    fg: '#475569',
    border: '#cbd5e1',
    badgeBg: '#e2e8f0',
  },
  emerging: {
    bg: '#fef3c7',
    fg: '#92400e',
    border: '#f59e0b',
    badgeBg: '#d97706',
    badgeFg: '#ffffff',
  },
  mastered: {
    bg: '#d1fae5',
    fg: '#065f46',
    border: '#10b981',
    badgeBg: '#059669',
    badgeFg: '#ffffff',
  },
  surpassed: {
    bg: '#ede9fe',
    fg: '#5b21b6',
    border: '#8b5cf6',
    badgeBg: '#7c3aed',
    badgeFg: '#ffffff',
  },
};

export default function MatrixProfileGrid({ cells, taxonomy }) {
  const [expandedKey, setExpandedKey] = useState(null);

  function cellKey(level, purpose) {
    return `${level}-${purpose}`;
  }

  function findCell(level, purposeId) {
    return cells.find((c) => c.level === level && c.purpose === purposeId);
  }

  // Count states for quick summary bar
  const counts = cells.reduce(
    (acc, cell) => {
      acc[cell.state] = (acc[cell.state] || 0) + 1;
      return acc;
    },
    { mastered: 0, emerging: 0, surpassed: 0, 'not-used': 0 }
  );

  return (
    <div className="matrix-container">
      {/* High-level Summary Bar */}
      <div className="matrix-summary-bar">
        <div className="matrix-stat-pill stat-mastered">
          <span className="stat-badge">M</span>
          <span className="stat-count">{counts.mastered}</span>
          <span className="stat-label">Mastered</span>
        </div>
        <div className="matrix-stat-pill stat-emerging">
          <span className="stat-badge">E</span>
          <span className="stat-count">{counts.emerging}</span>
          <span className="stat-label">Emerging</span>
        </div>
        <div className="matrix-stat-pill stat-surpassed">
          <span className="stat-badge">S</span>
          <span className="stat-count">{counts.surpassed}</span>
          <span className="stat-label">Surpassed</span>
        </div>
        <div className="matrix-stat-pill stat-notused">
          <span className="stat-badge">—</span>
          <span className="stat-count">{counts['not-used']}</span>
          <span className="stat-label">Not used</span>
        </div>
      </div>

      <div className="matrix-wrap">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `110px repeat(${taxonomy.purposes.length}, minmax(72px, 1fr))`,
            gap: '8px',
            minWidth: 460,
          }}
        >
          {/* Header corner */}
          <div className="matrix-header-cell corner">
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--ink-soft)' }}>LEVEL / PURPOSE</span>
          </div>

          {/* Purpose Column Headers */}
          {taxonomy.purposes.map((purpose) => (
            <div key={purpose.id} className="matrix-header-cell purpose">
              <span className="purpose-title">{purpose.name}</span>
            </div>
          ))}

          {/* Level Rows */}
          {taxonomy.levels.map((level) => (
            <Fragment key={level.level}>
              <div className="matrix-header-cell level">
                <span className="level-num">Level {level.level}</span>
                <span className="level-name">{level.name}</span>
              </div>

              {taxonomy.purposes.map((purpose) => {
                const cell = findCell(level.level, purpose.id);
                const key = cellKey(level.level, purpose.id);
                const isExpanded = expandedKey === key;
                const colors = STATE_VARS[cell.state];
                const shortLabel = STATE_SHORT_LABELS[cell.state];

                return (
                  <div key={key} style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => setExpandedKey(isExpanded ? null : key)}
                      aria-label={`${purpose.name} ${level.name}: ${STATE_LABELS[cell.state]}`}
                      aria-expanded={isExpanded}
                      className={`matrix-cell-btn state-${cell.state} ${isExpanded ? 'active' : ''}`}
                      style={{
                        backgroundColor: colors.bg,
                        borderColor: colors.border,
                        color: colors.fg,
                      }}
                    >
                      <span
                        className="cell-badge-dot"
                        style={{
                          backgroundColor: colors.badgeBg || colors.fg,
                          color: colors.badgeFg || colors.fg,
                        }}
                      >
                        {shortLabel}
                      </span>
                      <span className="cell-state-name">{STATE_LABELS[cell.state]}</span>
                    </button>

                    {/* Evidence Drawer Popup */}
                    {isExpanded && (
                      <div className="matrix-evidence-card">
                        <div className="evidence-header">
                          <span
                            className="evidence-badge"
                            style={{
                              backgroundColor: colors.badgeBg || colors.fg,
                              color: colors.badgeFg || '#ffffff',
                            }}
                          >
                            {STATE_LABELS[cell.state]}
                          </span>
                          <span className="evidence-title">
                            Level {level.level} • {purpose.name}
                          </span>
                        </div>
                        {cell.evidence.length === 0 ? (
                          <p className="evidence-empty">No direct evidence observed in session.</p>
                        ) : (
                          <div className="evidence-list">
                            {cell.evidence.map((e, i) => (
                              <div key={i} className="evidence-item">
                                <span className="evidence-code">[{e.observationCode}]</span>
                                <span className="evidence-rule">Rule {e.ruleId}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      <p className="matrix-caption">
        Mapped to Charity Rowland's Communication Matrix framework (OHSU, communicationmatrix.org).
        SETU maps observations to this framework to support screening.
      </p>

      {/* Legend */}
      <ul className="matrix-legend">
        {Object.entries(STATE_LABELS).map(([state, label]) => {
          const colors = STATE_VARS[state];
          return (
            <li key={state}>
              <span
                className="dot-badge"
                style={{ backgroundColor: colors.badgeBg || colors.fg, color: colors.badgeFg || '#fff' }}
              >
                {STATE_SHORT_LABELS[state]}
              </span>
              <span className="legend-label">{label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
