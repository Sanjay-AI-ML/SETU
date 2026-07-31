import { Fragment, useState } from 'react';

const STATE_LABELS = {
  'not-used': 'Not used',
  emerging: 'Emerging',
  mastered: 'Mastered',
  surpassed: 'Surpassed',
};

const STATE_COLORS = {
  'not-used': '#e0e0e0',
  emerging: '#ffca28',
  mastered: '#43a047',
  surpassed: '#1976d2',
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
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `120px repeat(${taxonomy.purposes.length}, 1fr)`,
          gap: '4px',
        }}
      >
        <div />
        {taxonomy.purposes.map((purpose) => (
          <div key={purpose.id}>{purpose.name}</div>
        ))}
        {taxonomy.levels.map((level) => (
          <Fragment key={level.level}>
            <div>{level.name}</div>
            {taxonomy.purposes.map((purpose) => {
              const cell = findCell(level.level, purpose.id);
              const key = cellKey(level.level, purpose.id);
              const isExpanded = expandedKey === key;
              return (
                <div key={key}>
                  <button
                    type="button"
                    onClick={() => setExpandedKey(isExpanded ? null : key)}
                    style={{ background: STATE_COLORS[cell.state], width: '100%', height: '32px' }}
                    aria-label={`${purpose.name} ${level.name}: ${STATE_LABELS[cell.state]}`}
                  />
                  {isExpanded && (
                    <div>
                      <p>{STATE_LABELS[cell.state]}</p>
                      {cell.evidence.length === 0 && <p>No direct evidence.</p>}
                      {cell.evidence.map((e, i) => (
                        <p key={i}>{`${e.observationCode} → ${e.ruleId}`}</p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
      <p>
        Mapped to Charity Rowland's Communication Matrix framework (OHSU, communicationmatrix.org).
        SETU maps to this framework — it is not the Communication Matrix itself.
      </p>
      <ul>
        {Object.entries(STATE_LABELS).map(([state, label]) => (
          <li key={state}>
            <span style={{ background: STATE_COLORS[state], display: 'inline-block', width: '12px', height: '12px' }} />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
