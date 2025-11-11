import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Header } from '../components/layout/Header';
import './Home.css';

export function Home() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.tenants.list();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load projects');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <div className="container">
        <h1>Your Projects</h1>

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="loading-container">
            <span className="loading"></span>
            <span>Loading projects...</span>
          </div>
        ) : (
          <div className="project-grid">
            {projects.length === 0 ? (
              <div className="card">
                <p>No projects found</p>
              </div>
            ) : (
              projects.map((project) => (
                <Link
                  key={project.id || project.name}
                  to={`/project/${project.id || project.name}`}
                  className="project-card"
                >
                  <h3>{project.name || project.id}</h3>
                  {project.created_at && (
                    <p className="project-meta">
                      Created: {new Date(project.created_at).toLocaleDateString()}
                    </p>
                  )}
                  <button className="btn btn-primary btn-sm">Open Project</button>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}
