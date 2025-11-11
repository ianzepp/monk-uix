import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/auth';
import './Login.css';

export function Register() {
  const navigate = useNavigate();
  const [tenant, setTenant] = useState('');
  const [user, setUser] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!tenant.trim() || !user.trim()) {
      setError('Both tenant and username are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authService.register(tenant.trim(), user.trim());
      navigate('/data');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Monk UI</h1>
        <p className="login-subtitle">Create a new tenant</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="tenant">Tenant Name</label>
            <input
              id="tenant"
              type="text"
              value={tenant}
              onChange={(e) => setTenant(e.target.value)}
              placeholder="Enter tenant name"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="user">Username</label>
            <input
              id="user"
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="Enter username"
              disabled={loading}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Tenant'}
          </button>
        </form>

        <div className="login-footer">
          <Link to="/login" className="btn-link">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}