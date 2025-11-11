import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth';
import './TenantSelector.css';

export function TenantSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [sessions, setSessions] = useState({});
  const [currentTenant, setCurrentTenant] = useState('');
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadSessions = () => {
      const allSessions = authService.getAllSessions();
      const current = authService.getCurrentTenant();
      setSessions(allSessions);
      setCurrentTenant(current || '');
    };

    loadSessions();

    // Listen for tenant changes
    const handleTenantChange = () => {
      loadSessions();
    };

    window.addEventListener('tenantChanged', handleTenantChange);
    
    return () => {
      window.removeEventListener('tenantChanged', handleTenantChange);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);



  const handleTenantSelect = (tenant) => {
    if (tenant === currentTenant) {
      setIsOpen(false);
      return;
    }

    const success = authService.switchTenant(tenant);
    if (success) {
      setIsOpen(false);
      // Navigate to data page after switching
      navigate('/data');
    }
  };

  const handleSwitchAccount = () => {
    navigate('/login');
    setIsOpen(false);
  };

  const getCurrentSessionDisplay = () => {
    const currentSession = sessions[currentTenant];
    if (!currentSession) return 'Loading...';
    
    const { tenant, username } = currentSession;
    return `${tenant} (${username})`;
  };

  const getSortedTenants = () => {
    return Object.entries(sessions)
      .sort(([, a], [, b]) => {
        // Sort by lastAccess time, most recent first
        const dateA = new Date(a.lastAccess || 0);
        const dateB = new Date(b.lastAccess || 0);
        return dateB - dateA;
      })
      .map(([tenant, session]) => ({ tenant, ...session }));
  };

  const sortedTenants = getSortedTenants();

  return (
    <div className="tenant-selector" ref={dropdownRef}>
      <div className="tenant-dropdown">
        <button
          className="tenant-current"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          {getCurrentSessionDisplay()}
          <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
        </button>

        {isOpen && (
          <ul className="tenant-menu" role="listbox">
            {sortedTenants.map(({ tenant, username }) => (
              <li
                key={tenant}
                className={`tenant-option ${tenant === currentTenant ? 'current' : ''}`}
                onClick={() => handleTenantSelect(tenant)}
                role="option"
                aria-selected={tenant === currentTenant}
              >
                {tenant} ({username})
              </li>
            ))}
            <li className="tenant-divider" role="separator"></li>
            <li
              className="tenant-option switch-account"
              onClick={handleSwitchAccount}
              role="option"
            >
              Switch Account
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}