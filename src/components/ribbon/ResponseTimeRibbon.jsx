const BAND_COLORS = { within: '#2a6a57', borderline: '#a9811c', delayed: '#a3453f' };
const HEIGHT = 90;
const TRACK_Y = HEIGHT / 2 + 6;

function bandColor(bandId) {
  return BAND_COLORS[bandId] ?? '#948f80';
}

function classifyForDisplay(latencyMs, bands) {
  for (const band of bands.bands) {
    if (band.maxMs === null || latencyMs <= band.maxMs) return band.id;
  }
  return bands.bands[bands.bands.length - 1].id;
}

export default function ResponseTimeRibbon({ trials, bands, width = 320 }) {
  const maxMs = Math.max(...trials.map((t) => t.latencyMs ?? 0), 1000);
  const slotWidth = width / trials.length;

  return (
    <svg width={width} height={HEIGHT} role="img" aria-label="Response time ribbon">
      <line x1={4} y1={TRACK_Y} x2={width - 4} y2={TRACK_Y} stroke="#ddd8c7" strokeWidth={2} strokeLinecap="round" />
      {trials.map((trial, index) => {
        const slotCenter = slotWidth * index + slotWidth / 2;
        if (!trial.responded) {
          return (
            <circle
              key={index}
              cx={slotCenter}
              cy={TRACK_Y}
              r={8}
              fill="none"
              stroke="#948f80"
              strokeDasharray="3,3"
              strokeWidth={2}
            >
              <title>{`Trial ${index + 1}: no response`}</title>
            </circle>
          );
        }
        const bandId = classifyForDisplay(trial.latencyMs, bands);
        const dotY = TRACK_Y - Math.min((trial.latencyMs / maxMs) * (HEIGHT / 2 - 10), HEIGHT / 2 - 10);
        return (
          <g key={index}>
            <line x1={slotCenter} y1={TRACK_Y} x2={slotCenter} y2={dotY} stroke={bandColor(bandId)} strokeWidth={2.5} strokeLinecap="round" />
            {trial.returnSource === 'audio-onset' && (
              <circle cx={slotCenter} cy={dotY} r={9.5} fill="none" stroke="#17231d" strokeWidth={1.5} />
            )}
            <circle cx={slotCenter} cy={dotY} r={6} fill={bandColor(bandId)} stroke="#ffffff" strokeWidth={1.5}>
              <title>{`Trial ${index + 1}: ${trial.latencyMs}ms (${bandId}, ${trial.returnSource})`}</title>
            </circle>
          </g>
        );
      })}
    </svg>
  );
}
