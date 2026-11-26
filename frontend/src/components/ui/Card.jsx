/**
 * Institutional Card Container with Optional Watermark Emblem
 */
export default function Card({ title, badge, watermark = false, children, className = '', footer }) {
  return (
    <div className={`gv-portal-card ${className}`}>
      {watermark && (
        <img
          src="/images/gujarat-vidyapith-logo.png"
          alt=""
          className="gv-portal-card__watermark"
          aria-hidden="true"
        />
      )}

      {(title || badge) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid var(--gv-border)' }}>
          {title && <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--gv-primary-brown)', margin: 0 }}>{title}</h3>}
          {badge}
        </div>
      )}

      <div>{children}</div>

      {footer && (
        <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid var(--gv-border)' }}>
          {footer}
        </div>
      )}
    </div>
  );
}
