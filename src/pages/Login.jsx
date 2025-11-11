import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import './Login.css';

export function Login() {
  const navigate = useNavigate();
  const [tenant, setTenant] = useState(import.meta.env.VITE_DEFAULT_TENANT || '');
  const [user, setUser] = useState(import.meta.env.VITE_DEFAULT_USER || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authService.login(tenant, user);
      navigate('/data');
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Monk UI</h1>
        <p className="login-subtitle">Sign in to your tenant</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="tenant">Tenant</label>
            <input
              id="tenant"
              type="text"
              value={tenant}
              onChange={(e) => setTenant(e.target.value)}
              placeholder="Enter tenant name"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="user">User</label>
            <input
              id="user"
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="Enter username"
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? <span className="loading"></span> : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
