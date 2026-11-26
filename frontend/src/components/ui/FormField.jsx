import { useState } from 'react';

/**
 * Reusable Form Input Field
 * - Displays error message directly ABOVE the field
 * - Highlights input box in red with .gv-input--error
 * - Includes eye icon toggle for password fields
 */
export default function FormField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  onKeyDown,
  placeholder,
  required = false,
  error,
  disabled = false,
  as = 'input', // 'input', 'textarea', 'select'
  children,
  rows = 3,
  helpText,
  maxLength,
  minLength,
  style = {},
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = type === 'password';
  const effectiveType = isPasswordField && showPassword ? 'text' : type;

  return (
    <div className="gv-form-group" style={{ marginBottom: '18px', ...style }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <label htmlFor={id} className="gv-label" style={{ marginBottom: 0 }}>
            {label} {required && <span className="required" style={{ color: '#D32F2F', fontWeight: 'bold' }}>*</span>}
          </label>
        </div>
      )}

      {as === 'textarea' ? (
        <textarea
          id={id}
          className={`gv-textarea ${error ? 'gv-input--error' : ''}`}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          rows={rows}
          maxLength={maxLength}
          minLength={minLength}
          {...props}
        />
      ) : as === 'select' ? (
        <select
          id={id}
          className={`gv-select ${error ? 'gv-input--error' : ''}`}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          required={required}
          disabled={disabled}
          {...props}
        >
          {children}
        </select>
      ) : isPasswordField ? (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
          <input
            id={id}
            type={effectiveType}
            className={`gv-input ${error ? 'gv-input--error' : ''}`}
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            maxLength={maxLength}
            minLength={minLength}
            style={{ paddingRight: '44px' }}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.15rem',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: showPassword ? 'var(--gv-primary-brown)' : '#757575',
              lineHeight: 1,
              userSelect: 'none',
            }}
            title={showPassword ? 'Hide password' : 'Show password'}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {showPassword ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>
      ) : (
        <input
          id={id}
          type={type}
          className={`gv-input ${error ? 'gv-input--error' : ''}`}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          maxLength={maxLength}
          minLength={minLength}
          {...props}
        />
      )}

      {/* Inline error text displayed directly UNDER the field */}
      {error && (
        <div
          className="gv-form-error"
          role="alert"
          style={{
            fontSize: '0.8rem',
            color: '#D32F2F',
            fontWeight: 600,
            marginTop: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {helpText && !error && (
        <span style={{ fontSize: '0.75rem', color: 'var(--gv-text-subtle)', marginTop: '4px', display: 'block' }}>
          {helpText}
        </span>
      )}
    </div>
  );
}
