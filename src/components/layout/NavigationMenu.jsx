import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './NavigationMenu.css';

const NAV_ITEMS = [
  { label: 'Data', path: '/data' },
  { label: 'Search', path: '/find' },
  { label: 'File', path: '/file' },
];

export function NavigationMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const activeItem = useMemo(() => {
    return NAV_ITEMS.find(({ path }) => location.pathname === path || location.pathname.startsWith(`${path}/`));
  }, [location.pathname]);

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

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const handleSelect = (path) => {
    setIsOpen(false);

    if (location.pathname !== path) {
      navigate(path);
    }
  };

  const toggleMenu = () => {
    setIsOpen((prev) => !prev);
  };

  const currentLabel = activeItem?.label ?? 'Navigate';

  return (
    <div className="nav-menu" ref={dropdownRef}>
      <div className="nav-dropdown">
        <button
          type="button"
          className="nav-current"
          onClick={toggleMenu}
          aria-haspopup="true"
          aria-expanded={isOpen}
        >
          {currentLabel}
          <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
        </button>

        {isOpen && (
          <ul className="nav-menu-list" role="menu">
            {NAV_ITEMS.map(({ label, path }) => (
              <li
                key={path}
                className={`nav-option ${activeItem?.path === path ? 'current' : ''}`}
                onClick={() => handleSelect(path)}
                role="menuitem"
              >
                {label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
