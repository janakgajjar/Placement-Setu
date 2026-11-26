/**
 * Institutional Status Badge
 */
export default function Badge({ status, text }) {
  const normStatus = (status || '').toUpperCase();
  const displayText = text || normStatus.replace(/_/g, ' ');

  let badgeClass = 'gv-badge--pending';

  if (['ACTIVE', 'APPROVED', 'PUBLISHED', 'COMPLETED', 'SELECTED'].includes(normStatus)) {
    badgeClass = 'gv-badge--active';
  } else if (['REJECTED', 'CLOSED', 'SUSPENDED', 'FAILED'].includes(normStatus)) {
    badgeClass = 'gv-badge--rejected';
  } else if (['DRAFT', 'PENDING', 'IN_PROGRESS'].includes(normStatus)) {
    badgeClass = 'gv-badge--pending';
  }

  return (
    <span className={`gv-badge ${badgeClass}`}>
      {displayText}
    </span>
  );
}
