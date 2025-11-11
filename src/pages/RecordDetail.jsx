import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { authService } from '../services/auth';
import { Header } from '../components/layout/Header';
import { RelatedList } from '../components/records/RelatedList';
import './RecordDetail.css';

export function RecordDetail() {
  const { schema, recordId } = useParams();
  const { tenant } = authService.getAuthData();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [schemaDefinition, setSchemaDefinition] = useState(null);
  const [allSchemas, setAllSchemas] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showJson, setShowJson] = useState(false);

  const loadRecord = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.data.get(schema, recordId);
      setRecord(data);
    } catch (err) {
      setError(err.message || 'Failed to load record');
      setRecord(null);
    } finally {
      setLoading(false);
    }
  }, [schema, recordId]);

  const loadSchemaDefinition = useCallback(async () => {
    try {
      const definition = await api.schemas.get(schema);
      setSchemaDefinition(definition);
    } catch {
      setSchemaDefinition(null);
    }
  }, [schema]);

  const loadAllSchemas = useCallback(async () => {
    try {
      const schemaNames = await api.schemas.list();
      const schemas = [];

      for (const name of schemaNames) {
        try {
          const definition = await api.schemas.get(name);
          schemas.push({ name, definition });
        } catch {
          // Ignore failures for individual schema loads
        }
      }

      setAllSchemas(schemas);
    } catch {
      setAllSchemas([]);
    }
  }, []);

  const findRelationships = useCallback(() => {
    const foundRelationships = [];

    allSchemas.forEach(({ name, definition }) => {
      if (name === schema) return;

      const properties = definition?.properties || {};

      Object.entries(properties).forEach(([fieldName, fieldDef]) => {
        const relationship = fieldDef?.['x-monk-relationship'] || fieldDef?.relationship;

        if (relationship && relationship.schema === schema) {
          foundRelationships.push({
            relationshipName: relationship.name || name,
            relatedSchema: name,
            foreignKeyField: fieldName,
          });
        }
      });
    });

    setRelationships(foundRelationships);
  }, [allSchemas, schema]);

  useEffect(() => {
    loadRecord();
    loadSchemaDefinition();
    loadAllSchemas();
  }, [loadRecord, loadSchemaDefinition, loadAllSchemas]);

  useEffect(() => {
    findRelationships();
  }, [findRelationships]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this record?')) {
      return;
    }

    try {
      await api.data.delete(schema, recordId);
      navigate('/data');
    } catch (err) {
      setError(err.message || 'Failed to delete record');
    }
  };

  const formatValue = useCallback((fieldName, value) => {
    if (value === null || value === undefined) return '-';

    const fieldDefinition = schemaDefinition?.properties?.[fieldName];
    const relationship = fieldDefinition?.['x-monk-relationship'] || fieldDefinition?.relationship;

    if (relationship && relationship.schema && typeof value === 'string') {
      return (
        <Link to={`/data/${relationship.schema}/${value}`} className="field-link">
          {value.substring(0, 8)}...
        </Link>
      );
    }

    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') {
      return <pre className="json-value">{JSON.stringify(value, null, 2)}</pre>;
    }
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T/)) {
      return new Date(value).toLocaleString();
    }
    return String(value);
  }, [schemaDefinition]);

  const fieldGroups = useMemo(() => {
    if (!record) {
      return [];
    }

    const systemFields = ['created_at', 'updated_at', 'trashed_at', 'deleted_at'];
    const userFields = [];
    const metaFields = [];

    Object.keys(record).forEach((key) => {
      if (key === 'id') return;
      if (systemFields.includes(key) || key.startsWith('access_')) {
        metaFields.push(key);
      } else {
        userFields.push(key);
      }
    });

    return [
      { title: 'Details', fields: userFields },
      { title: 'System', fields: metaFields, id: record.id },
    ];
  }, [record]);

  const shortRecordId = useMemo(() => (recordId ? recordId.substring(0, 8) : ''), [recordId]);

  return (
    <>
      <Header />
      <div className="container">
        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="loading-container">
            <span className="loading"></span>
            <span>Loading record...</span>
          </div>
        ) : record ? (
          <>
            <div className="record-header">
              <h1>{schema} #{shortRecordId}</h1>
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
                    <div className="field-group-header">
                      <h3>{group.title}</h3>
                      {group.id && <span className="field-group-id">ID: {group.id}</span>}
                    </div>
                    <div className="field-grid">
                      {group.fields.map((field) => (
                        <div key={field} className="field-item">
                          <label className="field-label">{field}</label>
                          <div className="field-value">
                            {formatValue(field, record[field])}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {relationships.length > 0 && (
                  <div className="related-lists-section">
                    {relationships.map((rel) => (
                      <RelatedList
                        key={rel.relatedSchema}
                        parentSchema={schema}
                        parentId={recordId}
                        relationshipName={rel.relationshipName}
                        relatedSchema={rel.relatedSchema}
                      />
                    ))}
                  </div>
                )}
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
