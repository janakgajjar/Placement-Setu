/**
 * Metric Card Component
 */
export default function StatCard({ label, value, icon, subtext, color }) {
  return (
    <div className="gv-stat-card">
      <div>
        <div className="gv-stat-card__num" style={color ? { color } : {}}>
          {value}
        </div>
        <div className="gv-stat-card__label">{label}</div>
        {subtext && (
          <small style={{ fontSize: '0.75rem', color: 'var(--gv-text-subtle)', marginTop: '4px', display: 'block' }}>
            {subtext}
          </small>
        )}
      </div>
      {icon && <div className="gv-stat-card__icon">{icon}</div>}
    </div>
  );
}
