export default function ErrorBanner({ message, details = null, onDismiss = null }) {
  if (!message) return null;

  return (
    <div className="alert-banner alert-banner--error" role="alert">
      <div className="alert-banner__icon" aria-hidden="true">
        !
      </div>
      <div className="alert-banner__content">
        <p className="alert-banner__title">{message}</p>
        {details && Array.isArray(details) && details.length > 0 && (
          <ul className="alert-banner__list">
            {details.map((d, i) => (
              <li key={i}>{typeof d === 'string' ? d : d.message || JSON.stringify(d)}</li>
            ))}
          </ul>
        )}
      </div>
      {onDismiss && (
        <button
          className="alert-banner__dismiss"
          onClick={onDismiss}
          type="button"
          aria-label="Dismiss error"
        >
          ×
        </button>
      )}
    </div>
  );
}
