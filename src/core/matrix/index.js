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

export function matchRules(observations, rulesConfig, context = {}) {
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

  return cells;
}

export function applyRules(observations, rulesConfig, context = {}) {
  return applySurpassed(matchRules(observations, rulesConfig, context));
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

const STATE_RANK = { 'not-used': 0, emerging: 1, mastered: 2 };

export function mergeCells(cellsArrays) {
  const merged = buildEmptyCells();

  for (const cells of cellsArrays) {
    for (const cell of cells) {
      const target = merged.find((c) => c.level === cell.level && c.purpose === cell.purpose);
      if (STATE_RANK[cell.state] > STATE_RANK[target.state]) {
        target.state = cell.state;
      }
      target.evidence.push(...cell.evidence);
    }
  }

  return merged;
}
