import { Link } from 'react-router-dom';
import { authService } from '../../services/auth';
import { TenantSelector } from './TenantSelector';
import './Header.css';

export function Header() {
  const isAuthenticated = authService.isAuthenticated();

  const handleLogout = () => {
    authService.logout();
    window.location.href = '/login';
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <Link to="/data" className="header-logo">
            Monk
          </Link>
        </div>

        <div className="header-center">
          {isAuthenticated && (
            <nav className="header-nav">
              <Link to="/data" className="nav-link">Data</Link>
              <Link to="/find" className="nav-link">Search</Link>
            </nav>
          )}
        </div>

        <div className="header-right">
          {isAuthenticated && (
            <>
              <TenantSelector />
              <button onClick={handleLogout} className="btn btn-secondary btn-sm">
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
