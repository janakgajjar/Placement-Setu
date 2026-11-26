/**
 * Floating Social Media Pill (As seen in Gujarat Vidyapith Website Screenshots)
 */
export default function SocialPill() {
  return (
    <div className="gv-social-pill" aria-label="Gujarat Vidyapith Social Media Channels">
      <a
        href="https://facebook.com"
        target="_blank"
        rel="noopener noreferrer"
        title="Facebook"
      >
        <img src="/images/facebook.svg" alt="Facebook" width="18" height="18" />
      </a>
      <a
        href="https://twitter.com"
        target="_blank"
        rel="noopener noreferrer"
        title="X (Twitter)"
      >
        <img src="/images/twitter.svg" alt="Twitter" width="18" height="18" />
      </a>
      <a
        href="https://instagram.com"
        target="_blank"
        rel="noopener noreferrer"
        title="Instagram"
      >
        <img src="/images/instagram.svg" alt="Instagram" width="18" height="18" />
      </a>
      <a
        href="https://youtube.com"
        target="_blank"
        rel="noopener noreferrer"
        title="YouTube"
      >
        <img src="/images/youtube.svg" alt="YouTube" width="18" height="18" />
      </a>
      <a
        href="https://whatsapp.com"
        target="_blank"
        rel="noopener noreferrer"
        title="WhatsApp Channel"
      >
        <img src="/images/whatsapp.svg" alt="WhatsApp" width="18" height="18" />
      </a>
    </div>
  );
}
