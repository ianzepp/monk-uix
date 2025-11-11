import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { authService } from '../services/auth';
import { Header } from '../components/layout/Header';
import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import './RecordDetail.css';

export function RecordDetail() {
  const { schema, recordId } = useParams();
  const { tenant } = authService.getAuthData();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [schemaDefinition, setSchemaDefinition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showJson, setShowJson] = useState(false);

  useEffect(() => {
    loadRecord();
    loadSchemaDefinition();
  }, [schema, recordId]);

  const loadRecord = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.data.get(schema, recordId);
      setRecord(data);
    } catch (err) {
      setError(err.message || 'Failed to load record');
    } finally {
      setLoading(false);
    }
  };

  const loadSchemaDefinition = async () => {
    try {
      const definition = await api.schemas.get(schema);
      setSchemaDefinition(definition);
    } catch (err) {
      console.error('Failed to load schema definition:', err);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this record?')) {
      return;
    }

    try {
      await api.data.delete(schema, recordId);
      navigate('/schemas');
    } catch (err) {
      setError(err.message || 'Failed to delete record');
    }
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') {
      return <pre className="json-value">{JSON.stringify(value, null, 2)}</pre>;
    }
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T/)) {
      return new Date(value).toLocaleString();
    }
    return String(value);
  };

  const getFieldGroups = () => {
    if (!record) return [];

    const systemFields = ['id', 'created_at', 'updated_at', 'trashed_at', 'deleted_at'];
    const userFields = [];
    const metaFields = [];

    Object.keys(record).forEach(key => {
      if (systemFields.includes(key)) {
        metaFields.push(key);
      } else {
        userFields.push(key);
      }
    });

    return [
      { title: 'Details', fields: userFields },
      { title: 'System', fields: metaFields },
    ];
  };

  const breadcrumbs = [
    { label: 'Home', path: '/schemas' },
    { label: tenant, path: '/schemas' },
    { label: schema, path: '/schemas' },
    { label: `#${recordId.substring(0, 8)}`, path: null },
  ];

  const fieldGroups = getFieldGroups();

  return (
    <>
      <Header />
      <div className="container">
        <Breadcrumbs items={breadcrumbs} />

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="loading-container">
            <span className="loading"></span>
            <span>Loading record...</span>
          </div>
        ) : record ? (
          <>
            <div className="record-header">
              <h1>{schema} #{recordId.substring(0, 8)}</h1>
              <div className="record-actions">
                <button
                  onClick={() => setShowJson(!showJson)}
                  className="btn btn-secondary"
                >
                  {showJson ? 'Hide JSON' : 'View JSON'}
                </button>
                <button onClick={handleDelete} className="btn btn-danger">
                  Delete
                </button>
              </div>
            </div>

            {showJson ? (
              <div className="card">
                <pre className="json-display">{JSON.stringify(record, null, 2)}</pre>
              </div>
            ) : (
              <>
                {fieldGroups.map((group) => (
                  <div key={group.title} className="field-group">
                    <h3>{group.title}</h3>
                    <div className="field-grid">
                      {group.fields.map((field) => (
                        <div key={field} className="field-item">
                          <label className="field-label">{field}</label>
                          <div className="field-value">
                            {formatValue(record[field])}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        ) : (
          <div className="card">
            <p>Record not found</p>
          </div>
        )}
      </div>
    </>
  );
}
