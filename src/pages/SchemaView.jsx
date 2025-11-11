import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { authService } from '../services/auth';
import { Header } from '../components/layout/Header';
import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import './ProjectView.css';

const getTenantStorageKey = (key) => {
  const currentTenant = authService.getCurrentTenant() || 'default';
  return `schemaView.${currentTenant}.${key}`;
};

const VISIBLE_SCHEMAS_STORAGE_KEY = getTenantStorageKey('visibleSchemas');
const LAST_SCHEMA_STORAGE_KEY = getTenantStorageKey('lastSelectedSchema');

export function SchemaView() {
  const { tenant } = authService.getAuthData();
  const [schemas, setSchemas] = useState([]);
  const [selectedSchema, setSelectedSchema] = useState(null);
  const [records, setRecords] = useState([]);
  const [sortConfig, setSortConfig] = useState({ column: null, direction: 'asc' });
  const [visibleSchemas, setVisibleSchemas] = useState([]);
  const [pendingSchemaToAdd, setPendingSchemaToAdd] = useState('');
  const [schemaDefinition, setSchemaDefinition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabsInitialized, setTabsInitialized] = useState(false);

  const loadSchemas = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.schemas.list();
      const schemaList = Array.isArray(data) ? data : [];
      setSchemas(schemaList);
      if (schemaList.length > 0) {
        const initialVisible = resolveVisibleSchemas(schemaList);
        setVisibleSchemas(initialVisible);
        const storedSelected = getStoredSelectedSchema(schemaList);
        const preferredSchema = storedSelected && initialVisible.includes(storedSelected)
          ? storedSelected
          : initialVisible.includes(selectedSchema)
            ? selectedSchema
            : initialVisible[0];
        setSelectedSchema(preferredSchema);
        setTabsInitialized(true);
      } else {
        setVisibleSchemas([]);
        setSelectedSchema(null);
        setTabsInitialized(true);
      }
    } catch (err) {
      setError(err.message || 'Failed to load schemas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchemas();
  }, []);

  // Clear schema state when tenant changes
  useEffect(() => {
    const handleTenantChange = () => {
      setSchemas([]);
      setSelectedSchema(null);
      setVisibleSchemas([]);
      setTabsInitialized(false);
      setError('');
      // Reload schemas for new tenant
      loadSchemas();
    };

    // Listen for tenant changes (custom event)
    window.addEventListener('tenantChanged', handleTenantChange);
    
    return () => {
      window.removeEventListener('tenantChanged', handleTenantChange);
    };
  }, []);

  useEffect(() => {
    if (selectedSchema) {
      loadRecords(selectedSchema);
      loadSchemaDefinition(selectedSchema);
    }
  }, [selectedSchema]);

  const resolveVisibleSchemas = (schemaList) => {
    if (schemaList.length === 0) return [];

    if (typeof window === 'undefined') {
      return [schemaList[0]];
    }

    try {
      const stored = window.sessionStorage.getItem(VISIBLE_SCHEMAS_STORAGE_KEY);
      if (!stored) return [schemaList[0]];
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [schemaList[0]];
      const filtered = parsed.filter((schema) => schemaList.includes(schema));
      return filtered.length > 0 ? filtered : [schemaList[0]];
    } catch (err) {
      console.warn('Unable to restore schema tabs from sessionStorage', err);
      return [schemaList[0]];
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

  const getStoredSelectedSchema = (schemaList) => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = window.sessionStorage.getItem(LAST_SCHEMA_STORAGE_KEY);
      if (!stored) return null;
      return schemaList.includes(stored) ? stored : null;
    } catch (err) {
      console.warn('Unable to restore selected schema from sessionStorage', err);
      return null;
    }
  };

  const getDisplayColumns = () => {
    if (!records || records.length === 0) return [];

    const firstRecord = records[0];
    const allKeys = Object.keys(firstRecord);

    const columns = [];

    const priorityFields = ['name', 'title', 'email', 'status', 'type', 'author', 'text', 'content'];
    priorityFields.forEach(field => {
      if (allKeys.includes(field) && !columns.includes(field)) {
        columns.push(field);
      }
    });

    allKeys.forEach(key => {
      if (columns.length >= 6) return;
      if (key === 'id' || key.startsWith('access_')) return;
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

  const sortedRecords = useMemo(() => {
    if (!sortConfig.column) return records;

    const sorted = [...records];
    sorted.sort((a, b) => {
      const aVal = a[sortConfig.column];
      const bVal = b[sortConfig.column];

      if (aVal === bVal) return 0;
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();

      if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [records, sortConfig]);

  const availableSchemas = useMemo(
    () => schemas.filter((schema) => !visibleSchemas.includes(schema)),
    [schemas, visibleSchemas]
  );

  useEffect(() => {
    if (!tabsInitialized || typeof window === 'undefined') return;
    if (visibleSchemas.length > 0) {
      window.sessionStorage.setItem(
        VISIBLE_SCHEMAS_STORAGE_KEY,
        JSON.stringify(visibleSchemas)
      );
    } else {
      window.sessionStorage.removeItem(VISIBLE_SCHEMAS_STORAGE_KEY);
    }
  }, [visibleSchemas, tabsInitialized]);

  useEffect(() => {
    if (!tabsInitialized || typeof window === 'undefined') return;
    if (selectedSchema) {
      window.sessionStorage.setItem(LAST_SCHEMA_STORAGE_KEY, selectedSchema);
    } else {
      window.sessionStorage.removeItem(LAST_SCHEMA_STORAGE_KEY);
    }
  }, [selectedSchema, tabsInitialized]);

  useEffect(() => {
    if (pendingSchemaToAdd && !availableSchemas.includes(pendingSchemaToAdd)) {
      setPendingSchemaToAdd('');
    }
  }, [availableSchemas, pendingSchemaToAdd]);

  useEffect(() => {
    if (selectedSchema || visibleSchemas.length === 0) return;
    setSelectedSchema(visibleSchemas[0]);
  }, [visibleSchemas, selectedSchema]);

  const handleAddSchemaTab = () => {
    if (!pendingSchemaToAdd) return;
    setVisibleSchemas((prev) => {
      if (prev.includes(pendingSchemaToAdd)) return prev;
      return [...prev, pendingSchemaToAdd];
    });
    setSelectedSchema(pendingSchemaToAdd);
    setPendingSchemaToAdd('');
  };

  const handleSort = (column) => {
    setSortConfig((prev) => {
      if (prev.column === column) {
        return {
          column,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }

      return { column, direction: 'asc' };
    });
  };

  const breadcrumbs = [
    { label: 'Home', path: '/data' },
    { label: tenant, path: null },
  ];

  const displayColumns = getDisplayColumns();

  return (
    <>
      <Header />
      <div className="container">
        <Breadcrumbs items={breadcrumbs} />

        <h1>{tenant}</h1>

        {error && <div className="error-message">{error}</div>}

        {schemas.length === 0 && !loading ? (
          <div className="card">
            <p>No schemas found in this project</p>
          </div>
        ) : (
          <>
            <div className="schema-tabs">
              <div className="schema-tabs-list">
                {visibleSchemas.map((schema) => (
                  <button
                    key={schema}
                    className={`schema-tab ${selectedSchema === schema ? 'active' : ''}`}
                    onClick={() => setSelectedSchema(schema)}
                  >
                    {schema}
                  </button>
                ))}
                {visibleSchemas.length === 0 && (
                  <div className="schema-tab placeholder">Schemas</div>
                )}
              </div>
              <div className="schema-tabs-controls">
                <select
                  value={pendingSchemaToAdd}
                  onChange={(event) => setPendingSchemaToAdd(event.target.value)}
                  disabled={availableSchemas.length === 0}
                >
                  <option value="" disabled>
                    {availableSchemas.length === 0 ? 'All schemas pinned' : 'Choose schema'}
                  </option>
                  {availableSchemas.map((schema) => (
                    <option key={schema} value={schema}>
                      {schema}
                    </option>
                  ))}
                </select>
                <button
                  className="schema-tab-add"
                  onClick={handleAddSchemaTab}
                  disabled={!pendingSchemaToAdd}
                  aria-label="Add schema tab"
                >
                  +
                </button>
              </div>
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
                            <th>Actions</th>
                            {displayColumns.map((col) => (
                              <th
                                key={col}
                                onClick={() => handleSort(col)}
                                className={`sortable ${
                                  sortConfig.column === col ? `sorted ${sortConfig.direction}` : ''
                                }`}
                                role="button"
                                tabIndex={0}
                              >
                                {col}
                                {sortConfig.column === col && (
                                  <span className="sort-indicator">{sortConfig.direction === 'asc' ? ' ▲' : ' ▼'}</span>
                                )}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sortedRecords.map((record) => (
                            <tr key={record.id}>
                              <td>
                                <Link
                                  to={`/data/${selectedSchema}/${record.id}`}
                                  className="btn btn-sm btn-secondary"
                                >
                                  View
                                </Link>
                              </td>
                              {displayColumns.map((col) => (
                                <td key={col}>{formatValue(record[col])}</td>
                              ))}
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
