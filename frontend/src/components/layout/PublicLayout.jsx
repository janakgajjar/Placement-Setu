import { Outlet } from 'react-router-dom';
import InstitutionalTopBar from './InstitutionalTopBar';
import Header from './Header';
import Footer from './Footer';

/**
 * PublicLayout: Wraps all public visitor-facing institutional pages
 * (Landing page, About, Partner Companies, Drives Explorer, Policies, Contact, Login, Register)
 */
export default function PublicLayout() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FAF6F5' }}>
      <InstitutionalTopBar />
      <Header />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
