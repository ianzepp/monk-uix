import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Header } from '../components/layout/Header';
import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import './ProjectView.css';

export function ProjectView() {
  const { projectId } = useParams();
  const [schemas, setSchemas] = useState([]);
  const [selectedSchema, setSelectedSchema] = useState(null);
  const [records, setRecords] = useState([]);

  const [loading, setLoading] = useState(true);
  // Future-proofing: Schema definition will be used for displaying field metadata, validation rules, etc.
  // eslint-disable-next-line
  const [schemaDefinition, setSchemaDefinition] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSchemas();
  }, []);

  useEffect(() => {
    if (selectedSchema) {
      loadRecords(selectedSchema);
      loadSchemaDefinition(selectedSchema);
    }
  }, [selectedSchema]);

  const loadSchemas = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.schemas.list();
      const schemaList = Array.isArray(data) ? data : [];
      setSchemas(schemaList);
      if (schemaList.length > 0) {
        setSelectedSchema(schemaList[0]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load schemas');
    } finally {
      setLoading(false);
    }
  };

  const loadSchemaDefinition = async (schema) => {
    try {
      const definition = await api.schemas.get(schema);
      setSchemaDefinition(definition);
    } catch (err) {
      console.error('Failed to load schema definition:', err);
    }
  };

  const loadRecords = async (schema) => {
    try {
      setLoading(true);
      setError('');
      const data = await api.data.list(schema, { limit: 50 });
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load records');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const getDisplayColumns = () => {
    if (!records || records.length === 0) return [];

    const firstRecord = records[0];
    const allKeys = Object.keys(firstRecord);

    // Always show ID first
    const columns = ['id'];

    // Add other important fields
    const priorityFields = ['name', 'title', 'email', 'status', 'type'];
    priorityFields.forEach(field => {
      if (allKeys.includes(field) && !columns.includes(field)) {
        columns.push(field);
      }
    });

    // Add remaining fields (up to 6 total columns)
    allKeys.forEach(key => {
      if (columns.length >= 6) return;
      if (!key.startsWith('_') &&
          !key.includes('created_at') &&
          !key.includes('updated_at') &&
          !key.includes('trashed_at') &&
          !key.includes('deleted_at') &&
          !columns.includes(key)) {
        columns.push(key);
      }
    });

    return columns;
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'string' && value.length > 50) {
      return value.substring(0, 50) + '...';
    }
    return String(value);
  };

  const breadcrumbs = [
    { label: 'Home', path: '/' },
    { label: projectId, path: null },
  ];

  const displayColumns = getDisplayColumns();

  return (
    <>
      <Header />
      <div className="container">
        <Breadcrumbs items={breadcrumbs} />

        <h1>{projectId}</h1>

        {error && <div className="error-message">{error}</div>}

        {schemas.length === 0 && !loading ? (
          <div className="card">
            <p>No schemas found in this project</p>
          </div>
        ) : (
          <>
            <div className="schema-tabs">
              {schemas.map((schema) => (
                <button
                  key={schema}
                  className={`schema-tab ${selectedSchema === schema ? 'active' : ''}`}
                  onClick={() => setSelectedSchema(schema)}
                >
                  {schema}
                </button>
              ))}
            </div>

            <div className="schema-content">
              {loading ? (
                <div className="loading-container">
                  <span className="loading"></span>
                  <span>Loading records...</span>
                </div>
              ) : (
                <>
                  <div className="schema-header">
                    <h2>{selectedSchema}</h2>
                    <div className="schema-stats">
                      {records.length} record{records.length !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {records.length === 0 ? (
                    <div className="card">
                      <p>No records found</p>
                    </div>
                  ) : (
                    <div className="table-container">
                      <table>
                        <thead>
                          <tr>
                            {displayColumns.map((col) => (
                              <th key={col}>{col}</th>
                            ))}
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {records.map((record) => (
                            <tr key={record.id}>
                              {displayColumns.map((col) => (
                                <td key={col}>{formatValue(record[col])}</td>
                              ))}
                              <td>
                                <Link
                                  to={`/project/${projectId}/${selectedSchema}/${record.id}`}
                                  className="btn btn-sm btn-secondary"
                                >
                                  View
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
