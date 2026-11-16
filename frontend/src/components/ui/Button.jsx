import { Link } from 'react-router-dom';

export default function Button({
  children,
  variant = 'primary',
  className = '',
  href,
  to,
  type = 'button',
  loading = false,
  disabled = false,
  ...props
}) {
  const classes = `button button--${variant} ${loading ? 'button--loading' : ''} ${className}`.trim();

  if (to && !disabled) {
    return (
      <Link className={classes} to={to} {...props}>
        {children}
      </Link>
    );
  }

  if (href && !disabled) {
    return (
      <a className={classes} href={href} {...props}>
        {children}
      </a>
    );
  }

  return (
    <button
      className={classes}
      type={type}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="button__spinner" aria-hidden="true" />
      ) : null}
      <span>{children}</span>
    </button>
  );
}
