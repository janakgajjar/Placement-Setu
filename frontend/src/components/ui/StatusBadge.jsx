export default function StatusBadge({ status, label }) {
  if (!status) return null;

  const rawStatus = String(status).toUpperCase();
  const displayLabel = label || rawStatus.replace(/_/g, ' ');

  // Map backend enum status to badge tone
  let tone = 'neutral';

  switch (rawStatus) {
    case 'ACTIVE':
    case 'PUBLISHED':
    case 'OPEN':
    case 'COMPLETED':
    case 'COMPLETE':
    case 'VERIFIED':
      tone = 'success';
      break;

    case 'PENDING':
    case 'PENDING_APPROVAL':
    case 'PROCESSING':
    case 'INCOMPLETE':
      tone = 'warning';
      break;

    case 'REJECTED':
    case 'FAILED':
    case 'SUSPENDED':
      tone = 'danger';
      break;

    case 'DRAFT':
    case 'CLOSED':
    default:
      tone = 'neutral';
      break;
  }

  return (
    <span className={`status-badge status-badge--${tone}`} data-status={rawStatus}>
      <span className="status-badge__dot" aria-hidden="true" />
      <span>{displayLabel}</span>
    </span>
  );
}
