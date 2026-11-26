/**
 * Institutional Feedback Modal
 * Matches screenshot 2c1c4a48.png:
 * - Green circle checkmark inside mint circle badge
 * - "Success" title
 * - Description message
 * - Clean "OK" button
 */
export default function Modal({
  isOpen,
  title = 'Success',
  message,
  type = 'success', // 'success', 'error', 'confirm', 'warning', 'info'
  onConfirm,
  onClose,
  confirmText = 'OK',
  cancelText = 'Cancel',
  showCancel = false,
  maxWidth = 440,
  children,
}) {
  if (!isOpen) return null;

  return (
    <div className="gv-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="gv-modal-box"
        style={{ maxWidth: `${maxWidth}px`, textAlign: children ? 'left' : 'center' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mint Circle Checkmark Icon for Success (Screenshot 2c1c4a48.png) */}
        {type === 'success' && (
          <div className="gv-modal-success-icon" aria-hidden="true">
            ✓
          </div>
        )}

        {type === 'warning' && (
          <div
            className="gv-modal-success-icon"
            style={{ backgroundColor: '#FFF8E1', borderColor: '#FFB74D', color: '#E65100', fontSize: '1.8rem' }}
            aria-hidden="true"
          >
            ⚠️
          </div>
        )}

        {type === 'error' && (
          <div
            className="gv-modal-success-icon"
            style={{ backgroundColor: '#FFEBEE', borderColor: '#EF5350', color: '#C62828' }}
            aria-hidden="true"
          >
            ✕
          </div>
        )}

        {type === 'confirm' && (
          <div
            className="gv-modal-success-icon"
            style={{ backgroundColor: '#FFF3E0', borderColor: '#FFA726', color: '#E65100' }}
            aria-hidden="true"
          >
            ?
          </div>
        )}

        <h3 className="gv-modal-title" style={{ textAlign: 'center' }}>{title}</h3>
        {message && <p className="gv-modal-message" style={{ textAlign: 'center' }}>{message}</p>}

        {children && <div style={{ marginBottom: '20px' }}>{children}</div>}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          {(type === 'confirm' || showCancel) && (
            <button
              type="button"
              className="gv-btn gv-btn--secondary"
              onClick={onClose}
            >
              {cancelText}
            </button>
          )}

          <button
            type="button"
            className="gv-btn gv-btn--primary"
            style={{ minWidth: '110px' }}
            onClick={onConfirm || onClose}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
