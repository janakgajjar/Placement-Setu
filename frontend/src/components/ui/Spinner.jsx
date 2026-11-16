export default function Spinner({ size = 'md', text = 'Loading...' }) {
  const sizeMap = {
    sm: 'spinner--sm',
    md: 'spinner--md',
    lg: 'spinner--lg',
  };

  return (
    <div className="spinner-wrap" role="status" aria-label={text}>
      <div className={`spinner ${sizeMap[size] || 'spinner--md'}`} />
      {text ? <span className="spinner-text">{text}</span> : null}
    </div>
  );
}
