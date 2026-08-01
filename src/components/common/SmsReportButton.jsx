// Sends a condensed, offline-friendly summary straight to the native SMS
// composer via the `sms:` URI scheme — no backend, no network required.
// This is the "offline report redirected to SMS" feature: the report itself
// never leaves the device except as a short text the parent chooses to send.

function buildSmsBody({ flags, ageGap, activityCount }) {
  const topFlags = flags.slice(0, 2).map((f) => f.label).join('; ');
  const flagPart = flags.length === 0
    ? 'No concerns flagged.'
    : `${flags.length} flag(s) for clinician review: ${topFlags}${flags.length > 2 ? '…' : ''}`;

  const agePart = ageGap?.status === 'delayed'
    ? `Developmental check: ~${ageGap.gapMonths}mo behind typical range.`
    : ageGap?.status === 'ahead'
    ? `Developmental check: ~${ageGap.gapMonths}mo ahead of typical range.`
    : ageGap?.status === 'on-track'
    ? 'Developmental check: on track.'
    : '';

  return [
    `SETU assessment complete (${activityCount} activities).`,
    flagPart,
    agePart,
    'Not a diagnosis — open the SETU app for the full report to share with a clinician.',
  ].filter(Boolean).join(' ');
}

export default function SmsReportButton({ flags, ageGap, activityCount, className = 'btn btn-ghost' }) {
  function handleSendSms() {
    const body = buildSmsBody({ flags, ageGap, activityCount });
    window.location.href = `sms:?body=${encodeURIComponent(body)}`;
  }

  return (
    <button type="button" onClick={handleSendSms} className={className}>
      💬 Send summary via SMS
    </button>
  );
}
