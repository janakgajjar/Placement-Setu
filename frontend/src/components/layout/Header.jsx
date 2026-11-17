import Button from '../ui/Button';

export default function Header() {
  return <>
    <div className="institutional-bar">
      <div className="container institutional-bar__inner">
        <span>Gujarat Vidyapith · Placement Cell</span>
        <a href="#footer">Support &amp; Contact</a>
      </div>
    </div>
    <header className="site-header">
      <div className="container nav-wrap">
        <a className="brand" href="#top" aria-label="Placement Setu home">
          <span className="brand__mark" aria-hidden="true">PS</span>
          <span><strong>Placement Setu</strong><small>Gujarat Vidyapith</small></span>
        </a>
        <nav className="main-nav" aria-label="Primary navigation">
          <a href="#top">Home</a><a href="#about">About</a><a href="#how-it-works">How It Works</a><a href="#features">Features</a>
        </nav>
        <div className="nav-actions">
          <a className="login-link" href="#roles">Login</a>
          <Button href="#roles" className="nav-register">Register</Button>
        </div>
      </div>
    </header>
  </>;
}
