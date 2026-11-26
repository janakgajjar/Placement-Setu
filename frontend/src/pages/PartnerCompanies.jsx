import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../lib/routes';
import { api } from '../lib/api';

export default function PartnerCompanies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  const fallbackCompanies = [
    { companyName: 'Tata Consultancy Services (TCS)', website: 'https://tcs.com', address: 'Gandhinagar / Mumbai' },
    { companyName: 'Infosys Limited', website: 'https://infosys.com', address: 'Gift City, Gujarat' },
    { companyName: 'Adani Group', website: 'https://adani.com', address: 'Ahmedabad, Gujarat' },
    { companyName: 'Aga Khan Rural Support Programme', website: 'https://akrspindia.org', address: 'Ahmedabad, Gujarat' },
    { companyName: 'Gujarat State Fertilizers & Chemicals (GSFC)', website: 'https://gsfclimited.com', address: 'Vadodara, Gujarat' },
    { companyName: 'HDFC Bank Ltd.', website: 'https://hdfcbank.com', address: 'Ahmedabad / Mumbai' },
    { companyName: 'Navajivan Trust', website: 'https://navajivantrust.org', address: 'Ahmedabad, Gujarat' },
    { companyName: 'Amul (GCMMF)', website: 'https://amul.com', address: 'Anand, Gujarat' },
  ];

  useEffect(() => {
    let isMounted = true;
    api.public
      .getCompanies('?page=0&size=50')
      .then((res) => {
        if (isMounted && res?.data?.content && res.data.content.length > 0) {
          setCompanies(res.data.content);
        } else if (isMounted) {
          setCompanies(fallbackCompanies);
        }
      })
      .catch(() => {
        if (isMounted) setCompanies(fallbackCompanies);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div>
      <section
        style={{
          backgroundColor: 'var(--gv-primary-brown-dark)',
          color: '#FFFFFF',
          padding: '45px 0',
          borderBottom: '4px solid var(--gv-sage-green)',
        }}
      >
        <div className="gv-container">
          <div style={{ fontSize: '0.82rem', color: 'var(--gv-linen)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Home | Corporate Recruiters
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 700, margin: 0 }}>
            Our Recruiting Partners &amp; Industry Network
          </h1>
          <p style={{ color: '#E2D9D2', marginTop: '8px', fontSize: '1rem' }}>
            Partnering with India’s leading technology enterprises, developmental NGOs, and public institutions.
          </p>
        </div>
      </section>

      <section className="gv-section gv-section--sand">
        <div className="gv-container">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              Loading partner recruiters directory...
            </div>
          ) : (
            <div className="gv-card-grid">
              {companies.map((c, i) => (
                <div key={c.id || i} className="gv-card">
                  <h3 className="gv-card__title" style={{ fontSize: '1.2rem', marginBottom: '6px' }}>
                    {c.companyName}
                  </h3>
                  {c.address && (
                    <p style={{ fontSize: '0.84rem', color: 'var(--gv-text-subtle)', marginTop: '4px' }}>
                      📍 {c.address}
                    </p>
                  )}
                  {c.website && (
                    <p style={{ marginTop: '8px' }}>
                      <a
                        href={c.website.startsWith('http') ? c.website : `https://${c.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '0.82rem', color: 'var(--gv-portal-cyan-dark)', textDecoration: 'underline' }}
                      >
                        Visit Corporate Website ↗
                      </a>
                    </p>
                  )}
                  <div className="gv-card__footer" style={{ marginTop: '18px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--gv-primary-brown)', fontWeight: 700 }}>
                      ✓ Verified Employer
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--gv-text-muted)' }}>
                      Active Partner
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              padding: '36px',
              marginTop: '45px',
              textAlign: 'center',
              border: '1px solid var(--gv-border)',
            }}
          >
            <h2 style={{ fontSize: '1.5rem', color: 'var(--gv-primary-brown)', marginBottom: '10px' }}>
              Want to Recruit from Gujarat Vidyapith?
            </h2>
            <p style={{ color: 'var(--gv-text-muted)', maxWidth: '650px', margin: '0 auto 24px' }}>
              Corporate recruiters are provisioned directly by the Gujarat Vidyapith Placement Office. Contact our Placement Cell to schedule on-campus or virtual campus recruitment drives.
            </p>
            <Link to={ROUTES.CONTACT} className="gv-btn gv-btn--primary gv-btn--lg">
              Contact Placement Cell →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
