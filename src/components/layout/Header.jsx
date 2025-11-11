import { Link } from 'react-router-dom';
import { authService } from '../../services/auth';
import './Header.css';

export function Header() {
  const { tenant, user } = authService.getAuthData();
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

        <div className="header-right">
          {isAuthenticated && (
            <>
              <span className="header-user">
                {user} @ {tenant}
              </span>
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
