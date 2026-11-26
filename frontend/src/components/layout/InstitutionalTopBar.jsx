import { Link } from 'react-router-dom';
import { INSTITUTION } from '../../lib/constants';

export default function InstitutionalTopBar() {
  return (
    <div className="gv-topbar" role="region" aria-label="Gujarat Vidyapith Institutional Info">
      <div className="gv-container gv-topbar__inner">
        <div className="gv-topbar__left">
          <span className="gv-topbar__motto">{INSTITUTION.MOTTO_SANSKRIT}</span>
          <span className="gv-topbar__divider">|</span>
          <span>{INSTITUTION.NAME} · Founded by {INSTITUTION.FOUNDER} (1920)</span>
          <span className="gv-topbar__divider">|</span>
          <span className="gv-naac-badge">{INSTITUTION.NAAC_GRADE.replace('Accredited ', '')}</span>
        </div>
        <div className="gv-topbar__right">
          <a href={`tel:${INSTITUTION.HELPLINE.split(',')[0].trim()}`} className="gv-topbar__link">
            📞 <span>Helpline: {INSTITUTION.HELPLINE.split(',')[0]}</span>
          </a>
          <span className="gv-topbar__divider">|</span>
          <Link to="/policies" className="gv-topbar__link">
            📜 Placement Bylaws
          </Link>
          <span className="gv-topbar__divider">|</span>
          <Link to="/contact" className="gv-topbar__link">
            Help Desk
          </Link>
        </div>
      </div>
    </div>
  );
}
