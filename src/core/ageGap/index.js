// Compares the child's stated age against the developmental level their
// strongest observed communication behaviour maps to (age-norms.json).
// Deliberately rule-based, not ML — same explainability rationale as the
// Matrix rules engine (see CLAUDE.md). "AI" in the UI means this transparent
// norm-referencing, not a trained model.

function highestObservedLevel(cells) {
  const mastered = cells.filter((c) => c.state === 'mastered').map((c) => c.level);
  if (mastered.length > 0) return { level: Math.max(...mastered), basis: 'mastered' };

  const emerging = cells.filter((c) => c.state === 'emerging').map((c) => c.level);
  if (emerging.length > 0) return { level: Math.max(...emerging), basis: 'emerging' };

  return null;
}

export function computeAgeGap({ ageMonths, cells, ageNormsConfig }) {
  const observed = highestObservedLevel(cells);

  if (!observed || ageMonths == null) {
    return {
      status: 'insufficient-data',
      functionalLevel: null,
      expectedRange: null,
      gapMonths: 0,
      disclaimer: ageNormsConfig.disclaimer,
    };
  }

  const band = ageNormsConfig.levels.find((l) => l.level === observed.level);
  const threshold = ageNormsConfig.gapThresholdMonths ?? 0;

  let status = 'on-track';
  let gapMonths = 0;

  if (ageMonths > band.maxMonths + threshold) {
    status = 'delayed';
    gapMonths = ageMonths - band.maxMonths;
  } else if (ageMonths < band.minMonths) {
    status = 'ahead';
    gapMonths = band.minMonths - ageMonths;
  }

  return {
    status,
    functionalLevel: observed.level,
    basis: observed.basis,
    expectedRange: { minMonths: band.minMonths, maxMonths: band.maxMonths },
    note: band.note,
    gapMonths: Math.round(gapMonths),
    disclaimer: ageNormsConfig.disclaimer,
  };
}
