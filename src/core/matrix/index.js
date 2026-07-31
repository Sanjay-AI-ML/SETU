import taxonomy from '../../data/matrix-taxonomy.json';

export function buildEmptyCells() {
  const cells = [];
  for (const level of taxonomy.levels) {
    for (const purpose of taxonomy.purposes) {
      cells.push({ level: level.level, purpose: purpose.id, state: 'not-used', evidence: [] });
    }
  }
  return cells;
}

export function applyRules(observations, rulesConfig, context = {}) {
  const cells = buildEmptyCells();
  const observedCodes = observations.map((observation) => observation.code);

  for (const rule of rulesConfig.rules) {
    const satisfied = rule.requiredObservations.every((code) => observedCodes.includes(code));
    if (!satisfied) continue;

    const cell = cells.find((c) => c.level === rule.level && c.purpose === rule.purpose);
    cell.state = rule.state;
    cell.evidence.push({
      sessionId: context.sessionId ?? null,
      activityRunId: context.activityRunId ?? null,
      observationCode: rule.requiredObservations[0],
      ruleId: rule.id,
    });
  }

  return applySurpassed(cells);
}

export function applySurpassed(cells) {
  const purposes = [...new Set(cells.map((c) => c.purpose))];

  for (const purpose of purposes) {
    const columnCells = cells.filter((c) => c.purpose === purpose);
    const masteredLevels = columnCells.filter((c) => c.state === 'mastered').map((c) => c.level);
    if (masteredLevels.length === 0) continue;

    const highestMastered = Math.max(...masteredLevels);
    for (const cell of columnCells) {
      if (cell.level < highestMastered && cell.state === 'not-used') {
        cell.state = 'surpassed';
      }
    }
  }

  return cells;
}
