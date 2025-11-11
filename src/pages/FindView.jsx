import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { authService } from '../services/auth';
import { Header } from '../components/layout/Header';
import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { SearchForm } from '../components/find/SearchForm';
import { ResultsTable } from '../components/find/ResultsTable';
import './FindView.css';

const getTenantStorageKey = (key) => {
  const currentTenant = authService.getCurrentTenant() || 'default';
  return `findView.${currentTenant}.${key}`;
};

const SEARCH_RESULTS_KEY = getTenantStorageKey('searchResults');
const SEARCH_SCHEMA_KEY = getTenantStorageKey('selectedSchema');
const SEARCH_PERFORMED_KEY = getTenantStorageKey('searchPerformed');

export function FindView() {
  const [schemas, setSchemas] = useState([]);
  const [selectedSchema, setSelectedSchema] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchPerformed, setSearchPerformed] = useState(false);

  const loadSchemas = async () => {
    try {
      setError('');
      const data = await api.schemas.list();
      const schemaList = Array.isArray(data) ? data : [];
      setSchemas(schemaList);
      
      // Only set default schema if we don't have a saved one
      const savedSchema = sessionStorage.getItem(SEARCH_SCHEMA_KEY);
      if (schemaList.length > 0 && !selectedSchema && !savedSchema) {
        setSelectedSchema(schemaList[0]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load schemas');
    }
  };

  useEffect(() => {
    const initializeComponent = async () => {
      await loadSchemas();
      // Small delay to ensure state is set after schemas load
      setTimeout(() => {
        restoreSearchState();
      }, 100);
    };
    
    initializeComponent();
  }, []);

  // Clear search state when tenant changes
  useEffect(() => {
    const handleTenantChange = () => {
      setResults([]);
      setSearchPerformed(false);
      setSelectedSchema('');
      setError('');
      // Reload schemas for new tenant
      loadSchemas();
    };

    // Listen for tenant changes (custom event)
    window.addEventListener('tenantChanged', handleTenantChange);
    
    return () => {
      window.removeEventListener('tenantChanged', handleTenantChange);
    };
  }, [loadSchemas]);

  useEffect(() => {
    saveSearchState();
  }, [results, selectedSchema, searchPerformed]);

  useEffect(() => {
    // Ensure saved schema is valid when schemas are loaded
    if (schemas.length > 0 && selectedSchema && !schemas.includes(selectedSchema)) {
      console.log('Saved schema not found, switching to first available');
      setSelectedSchema(schemas[0]);
    }
  }, [schemas, selectedSchema]);

  const restoreSearchState = () => {
    try {
      const savedResults = sessionStorage.getItem(SEARCH_RESULTS_KEY);
      const savedSchema = sessionStorage.getItem(SEARCH_SCHEMA_KEY);
      const savedPerformed = sessionStorage.getItem(SEARCH_PERFORMED_KEY);

      console.log('Restoring search state:', { savedResults, savedSchema, savedPerformed });

      if (savedResults) {
        const parsedResults = JSON.parse(savedResults);
        setResults(parsedResults);
        console.log('Restored results:', parsedResults.length, 'records');
      }
      if (savedSchema) {
        setSelectedSchema(savedSchema);
        console.log('Restored schema:', savedSchema);
      }
      if (savedPerformed) {
        setSearchPerformed(JSON.parse(savedPerformed));
        console.log('Restored search performed:', JSON.parse(savedPerformed));
      }
    } catch (err) {
      console.warn('Failed to restore search state:', err);
    }
  };

  const saveSearchState = () => {
    try {
      if (results.length > 0) {
        sessionStorage.setItem(SEARCH_RESULTS_KEY, JSON.stringify(results));
        console.log('Saved results:', results.length, 'records');
      }
      if (selectedSchema) {
        sessionStorage.setItem(SEARCH_SCHEMA_KEY, selectedSchema);
        console.log('Saved schema:', selectedSchema);
      }
      sessionStorage.setItem(SEARCH_PERFORMED_KEY, JSON.stringify(searchPerformed));
      console.log('Saved search performed:', searchPerformed);
    } catch (err) {
      console.warn('Failed to save search state:', err);
    }
  };

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
    // Clear saved state
    sessionStorage.removeItem(SEARCH_RESULTS_KEY);
    sessionStorage.removeItem(SEARCH_PERFORMED_KEY);
  };

  const breadcrumbs = [
    { label: 'Home', path: '/data' },
    { label: 'Search', path: null },
  ];

  // Debug: Log current state for debugging
  console.log('FindView render state:', {
    results: results.length,
    selectedSchema,
    searchPerformed,
    loading
  });

  return (
    <>
      <Header />
      <div className="container">
        <Breadcrumbs items={breadcrumbs} />

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