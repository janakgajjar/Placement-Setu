/**
 * Reusable Button Component with Gujarat Vidyapith Design Language
 */
export default function Button({
  children,
  variant = 'primary', // 'primary' (brown), 'sage' (green), 'secondary', 'outline', 'outline-white'
  size = 'md',        // 'sm', 'md', 'lg'
  fullWidth = false,
  loading = false,
  disabled = false,
  type = 'button',
  onClick,
  className = '',
  ...props
}) {
  const variantClass = `gv-btn--${variant}`;
  const sizeClass = size !== 'md' ? `gv-btn--${size}` : '';
  const fullClass = fullWidth ? 'gv-btn--full' : '';

  return (
    <button
      type={type}
      className={`gv-btn ${variantClass} ${sizeClass} ${fullClass} ${className}`.trim()}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
          <span>Processing...</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
