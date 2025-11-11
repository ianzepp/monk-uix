import { Link } from 'react-router-dom';
import { authService } from '../../services/auth';
import { TenantSelector } from './TenantSelector';
import { NavigationMenu } from './NavigationMenu';
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
        <Link to="/data" className="header-logo">
          Monk
        </Link>

        {isAuthenticated && (
          <div className="header-actions">
            <div className="header-logo-spacer" aria-hidden="true" />
            <TenantSelector />
            <NavigationMenu />
            <div className="header-flex-spacer" aria-hidden="true" />
            <button onClick={handleLogout} className="btn btn-secondary btn-sm">
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
