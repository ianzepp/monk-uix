import { Link } from 'react-router-dom';
import './Breadcrumbs.css';

export function Breadcrumbs({ items = [] }) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <nav className="breadcrumbs">
      {items.map((item, index) => (
        <span key={index} className="breadcrumb-item">
          {index > 0 && <span className="breadcrumb-separator"> &gt; </span>}
          {item.path ? (
            <Link to={item.path} className="breadcrumb-link">
              {item.label}
            </Link>
          ) : (
            <span className="breadcrumb-current">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
