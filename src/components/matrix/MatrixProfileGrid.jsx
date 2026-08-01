import { Fragment, useState } from 'react';

const STATE_LABELS = {
  'not-used': 'Not used',
  emerging: 'Emerging',
  mastered: 'Mastered',
  surpassed: 'Surpassed',
};

const STATE_VARS = {
  'not-used': { bg: 'var(--notused-soft)', fg: 'var(--notused)' },
  emerging: { bg: 'var(--emerging-soft)', fg: 'var(--emerging)' },
  mastered: { bg: 'var(--mastered-soft)', fg: 'var(--mastered)' },
  surpassed: { bg: 'var(--surpassed-soft)', fg: 'var(--surpassed)' },
};

export default function MatrixProfileGrid({ cells, taxonomy }) {
  const [expandedKey, setExpandedKey] = useState(null);

  function cellKey(level, purpose) {
    return `${level}-${purpose}`;
  }

  function findCell(level, purposeId) {
    return cells.find((c) => c.level === level && c.purpose === purposeId);
  }

  return (
    <div>
      <div className="matrix-wrap">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `104px repeat(${taxonomy.purposes.length}, minmax(64px, 1fr))`,
            gap: '5px',
            minWidth: 420,
          }}
        >
          <div />
          {taxonomy.purposes.map((purpose) => (
            <div
              key={purpose.id}
              style={{
                fontSize: '0.72rem', fontWeight: 700, color: 'var(--ink-faint)',
                textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.03em',
                padding: '0 0 4px',
              }}
            >
              {purpose.name}
            </div>
          ))}
          {taxonomy.levels.map((level) => (
            <Fragment key={level.level}>
              <div style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                {level.name}
              </div>
              {taxonomy.purposes.map((purpose) => {
                const cell = findCell(level.level, purpose.id);
                const key = cellKey(level.level, purpose.id);
                const isExpanded = expandedKey === key;
                const colors = STATE_VARS[cell.state];
                return (
                  <div key={key}>
                    <button
                      type="button"
                      onClick={() => setExpandedKey(isExpanded ? null : key)}
                      aria-label={`${purpose.name} ${level.name}: ${STATE_LABELS[cell.state]}`}
                      aria-expanded={isExpanded}
                      style={{
                        background: colors.bg,
                        width: '100%',
                        height: '34px',
                        border: isExpanded ? `2px solid ${colors.fg}` : '1px solid transparent',
                        borderRadius: '7px',
                        cursor: 'pointer',
                        transition: 'transform 0.12s ease',
                        margin: 0,
                        display: 'block',
                      }}
                    />
                    {isExpanded && (
                      <div className="card" style={{ marginTop: 6, padding: '10px 12px' }}>
                        <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: colors.fg }}>
                          {STATE_LABELS[cell.state]}
                        </p>
                        {cell.evidence.length === 0 && (
                          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--ink-faint)' }}>No direct evidence.</p>
                        )}
                        {cell.evidence.map((e, i) => (
                          <p key={i} style={{ margin: '4px 0 0', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--ink-soft)' }}>
                            {e.observationCode} → {e.ruleId}
                          </p>
                        ))}
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
        SETU maps to this framework. It is not the Communication Matrix itself.
      </p>
      <ul className="matrix-legend">
        {Object.entries(STATE_LABELS).map(([state, label]) => (
          <li key={state}>
            <span className="dot" style={{ background: STATE_VARS[state].fg }} />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
