export default function Footer() {
  return <footer className="site-footer" id="footer">
    <div className="container footer-grid">
      <div><a className="brand brand--footer" href="#top"><span className="brand__mark">PS</span><span><strong>Placement Setu</strong><small>Gujarat Vidyapith</small></span></a><p>A unified placement experience for students, recruiters and the placement team.</p></div>
      <div><h3>Platform</h3><a href="#about">About Placement Setu</a><a href="#features">Features</a><a href="#how-it-works">How it works</a></div>
      <div><h3>Get started</h3><a href="#roles">For students</a><a href="#roles">For companies</a><a href="#roles">For placement teams</a></div>
      <div><h3>Support</h3><p>For account and placement assistance, please contact the Placement Cell through your institution.</p></div>
    </div>
    <div className="container footer-bottom"><span>© {new Date().getFullYear()} Gujarat Vidyapith. All rights reserved.</span><span>Built for purposeful career journeys.</span></div>
  </footer>;
}
