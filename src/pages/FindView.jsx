import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { authService } from '../services/auth';
import { Header } from '../components/layout/Header';
import { SearchForm } from '../components/find/SearchForm';
import { ResultsTable } from '../components/find/ResultsTable';
import './FindView.css';

const getTenantStorageKey = (tenantId, key) => {
  const safeTenant = tenantId || 'default';
  return `findView.${safeTenant}.${key}`;
};

export function FindView() {
  const [schemas, setSchemas] = useState([]);
  const [selectedSchema, setSelectedSchema] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchPerformed, setSearchPerformed] = useState(false);
  const { tenant } = authService.getAuthData();
  const storageKeys = useMemo(() => ({
    results: getTenantStorageKey(tenant, 'searchResults'),
    schema: getTenantStorageKey(tenant, 'selectedSchema'),
    performed: getTenantStorageKey(tenant, 'searchPerformed'),
  }), [tenant]);

  const loadSchemas = useCallback(async () => {
    try {
      setError('');
      const data = await api.schemas.list();
      const schemaList = Array.isArray(data) ? data : [];
      setSchemas(schemaList);

      if (schemaList.length === 0) {
        setSelectedSchema('');
        return;
      }

      let storedSelection = null;

      if (typeof window !== 'undefined') {
        try {
          storedSelection = window.sessionStorage.getItem(storageKeys.schema);
        } catch {
          // Ignore storage read issues and fall back to defaults
        }
      }

      setSelectedSchema((current) => {
        if (storedSelection && schemaList.includes(storedSelection)) {
          return storedSelection;
        }

        if (current && schemaList.includes(current)) {
          return current;
        }

        return schemaList[0];
      });
    } catch (err) {
      setError(err.message || 'Failed to load schemas');
    }
  }, [storageKeys.schema]);

  const restoreSearchState = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const savedResults = window.sessionStorage.getItem(storageKeys.results);
      if (savedResults) {
        try {
          const parsedResults = JSON.parse(savedResults);
          setResults(Array.isArray(parsedResults) ? parsedResults : []);
        } catch {
          setResults([]);
        }
      }

      const savedSchema = window.sessionStorage.getItem(storageKeys.schema);
      if (savedSchema) {
        setSelectedSchema(savedSchema);
      }

      const savedPerformed = window.sessionStorage.getItem(storageKeys.performed);
      if (savedPerformed) {
        try {
          setSearchPerformed(Boolean(JSON.parse(savedPerformed)));
        } catch {
          setSearchPerformed(false);
        }
      }
    } catch {
      // Ignore restore errors
    }
  }, [storageKeys]);

  useEffect(() => {
    const initializeComponent = async () => {
      await loadSchemas();
      restoreSearchState();
    };

    initializeComponent();
  }, [loadSchemas, restoreSearchState]);

  // Clear search state when tenant changes
  const handleTenantChange = useCallback(() => {
    setResults([]);
    setSearchPerformed(false);
    setSelectedSchema('');
    setError('');
    // Reload schemas for new tenant
    loadSchemas();
  }, [loadSchemas]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    window.addEventListener('tenantChanged', handleTenantChange);

    return () => {
      window.removeEventListener('tenantChanged', handleTenantChange);
    };
  }, [handleTenantChange]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      if (results.length > 0) {
        window.sessionStorage.setItem(storageKeys.results, JSON.stringify(results));
      } else {
        window.sessionStorage.removeItem(storageKeys.results);
      }

      if (selectedSchema) {
        window.sessionStorage.setItem(storageKeys.schema, selectedSchema);
      } else {
        window.sessionStorage.removeItem(storageKeys.schema);
      }

      window.sessionStorage.setItem(storageKeys.performed, JSON.stringify(searchPerformed));
    } catch {
      // Ignore persistence errors
    }
  }, [results, selectedSchema, searchPerformed, storageKeys]);

  useEffect(() => {
    if (schemas.length > 0 && selectedSchema && !schemas.includes(selectedSchema)) {
      setSelectedSchema(schemas[0]);
    }
  }, [schemas, selectedSchema]);

  const handleSearch = async (schema, query) => {
    if (!schema) {
      setError('Please select a schema');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSearchPerformed(true);
      
      const data = await api.find.search(schema, query);
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setResults([]);
    setSearchPerformed(false);
    setError('');

    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(storageKeys.results);
      window.sessionStorage.removeItem(storageKeys.performed);
    }
  };

  return (
    <>
      <Header />
      <div className="container">
        <h1>Advanced Search</h1>

        {error && <div className="error-message">{error}</div>}

        <SearchForm
          schemas={schemas}
          selectedSchema={selectedSchema}
          onSchemaChange={setSelectedSchema}
          onSearch={handleSearch}
          onClear={handleClear}
          loading={loading}
        />

        {(searchPerformed || results.length > 0) && (
          <div className="search-results">
            <div className="results-header">
              <h2>Results</h2>
              <div className="results-stats">
                {results.length} record{results.length !== 1 ? 's' : ''} found
                {!searchPerformed && results.length > 0 && ' (restored)'}
              </div>
            </div>

            {loading ? (
              <div className="loading-container">
                <span className="loading"></span>
                <span>Searching...</span>
              </div>
            ) : results.length === 0 ? (
              <div className="card">
                <p>No records found matching your criteria</p>
              </div>
            ) : (
              <ResultsTable
                records={results}
                schema={selectedSchema}
              />
            )}
          </div>
        )}
      </div>
    </>
  );
}