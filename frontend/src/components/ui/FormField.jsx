export default function FormField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  error,
  hint,
  required = false,
  placeholder = '',
  disabled = false,
  rows = 3,
  options = [],
  children,
  ...props
}) {
  const inputId = id || (label ? `field-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}` : undefined);
  const errorId = error ? `${inputId}-error` : undefined;
  const hintId = hint ? `${inputId}-hint` : undefined;

  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`form-field ${error ? 'form-field--error' : ''}`}>
      {label && (
        <label className="form-label" htmlFor={inputId}>
          {label}
          {required && <span className="form-required" aria-hidden="true"> *</span>}
        </label>
      )}

      {children ? (
        children
      ) : type === 'textarea' ? (
        <textarea
          id={inputId}
          className="form-control form-control--textarea"
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          required={required}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          {...props}
        />
      ) : type === 'select' ? (
        <select
          id={inputId}
          className="form-control form-control--select"
          value={value ?? ''}
          onChange={onChange}
          disabled={disabled}
          required={required}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          {...props}
        >
          {options.map((opt) => {
            const val = typeof opt === 'object' ? opt.value : opt;
            const lbl = typeof opt === 'object' ? opt.label : opt;
            return (
              <option key={val} value={val}>
                {lbl}
              </option>
            );
          })}
        </select>
      ) : (
        <input
          id={inputId}
          type={type}
          className="form-control"
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          {...props}
        />
      )}

      {hint && !error && (
        <span id={hintId} className="form-hint">
          {hint}
        </span>
      )}

      {error && (
        <span id={errorId} className="form-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
