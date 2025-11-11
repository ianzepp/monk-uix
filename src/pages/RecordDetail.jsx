import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { authService } from '../services/auth';
import { Header } from '../components/layout/Header';
import { Breadcrumbs } from '../components/layout/Breadcrumbs';
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

  useEffect(() => {
    loadRecord();
    loadSchemaDefinition();
    loadAllSchemas();
  }, [schema, recordId]);

  useEffect(() => {
    if (allSchemas.length > 0) {
      findRelationships();
    }
  }, [allSchemas, schema]);

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

  const loadAllSchemas = async () => {
    try {
      const schemaNames = await api.schemas.list();
      const schemas = [];

      for (const name of schemaNames) {
        try {
          const def = await api.schemas.get(name);
          schemas.push({ name, definition: def });
        } catch (err) {
          console.error(`Failed to load schema ${name}:`, err);
        }
      }

      setAllSchemas(schemas);
    } catch (err) {
      console.error('Failed to load schemas:', err);
    }
  };

  const findRelationships = () => {
    const foundRelationships = [];

    // Find schemas that have fields pointing to the current schema
    allSchemas.forEach(({ name, definition }) => {
      if (name === schema) return; // Skip self

      const properties = definition.properties || {};

      Object.entries(properties).forEach(([fieldName, fieldDef]) => {
        const relationship = fieldDef['x-monk-relationship'] || fieldDef['relationship'];

        if (relationship && relationship.schema === schema) {
          foundRelationships.push({
            relationshipName: relationship.name || name,
            relatedSchema: name,
            foreignKeyField: fieldName
          });
        }
      });
    });

    setRelationships(foundRelationships);
  };

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

  const formatValue = (fieldName, value) => {
    if (value === null || value === undefined) return '-';

    // Check if this field has a relationship defined
    if (schemaDefinition && schemaDefinition.properties) {
      const fieldDef = schemaDefinition.properties[fieldName];
      const relationship = fieldDef?.['x-monk-relationship'] || fieldDef?.['relationship'];

      if (relationship && relationship.schema && typeof value === 'string') {
        return (
          <Link to={`/data/${relationship.schema}/${value}`} className="field-link">
            {value.substring(0, 8)}...
          </Link>
        );
      }
    }

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

    const systemFields = ['created_at', 'updated_at', 'trashed_at', 'deleted_at'];
    const userFields = [];
    const metaFields = [];

    Object.keys(record).forEach(key => {
      if (key === 'id') return; // Skip ID, will show in header
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
  };

  const breadcrumbs = [
    { label: 'Home', path: '/data' },
    { label: tenant, path: '/data' },
    { label: schema, path: '/data' },
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
