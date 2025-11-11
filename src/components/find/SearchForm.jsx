import { useState } from 'react';

export function SearchForm({ 
  schemas, 
  selectedSchema, 
  onSchemaChange, 
  onSearch, 
  onClear, 
  loading 
}) {
  const [filterJson, setFilterJson] = useState(JSON.stringify({
    where: {},
    order: [],
    limit: 50,
    offset: 0
  }, null, 2));
  const [jsonError, setJsonError] = useState('');

  const validateJson = (jsonString) => {
    try {
      const parsed = JSON.parse(jsonString);
      setJsonError('');
      return parsed;
    } catch (err) {
      setJsonError('Invalid JSON: ' + err.message);
      return null;
    }
  };

  const handleJsonChange = (value) => {
    setFilterJson(value);
    validateJson(value);
  };

  const handleSearch = () => {
    const query = validateJson(filterJson);
    if (query && selectedSchema) {
      onSearch(selectedSchema, query);
    }
  };

  const handleClear = () => {
    setFilterJson(JSON.stringify({
      where: {},
      order: [],
      limit: 50,
      offset: 0
    }, null, 2));
    setJsonError('');
    onClear();
  };

  const insertExample = (example) => {
    const exampleQueries = {
      'Basic Filter': {
        where: { status: "active" },
        order: ["created_at desc"],
        limit: 50
      },
      'Date Range': {
        where: {
          created_at: {
            "$gte": "2024-01-01T00:00:00Z"
          }
        },
        order: ["created_at desc"],
        limit: 50
      },
      'Complex Logic': {
        where: {
          "$and": [
            { status: { "$in": ["active", "pending"] } },
            { 
              "$or": [
                { priority: { "$gte": 8 } },
                { tags: { "$any": ["urgent"] } }
              ]
            }
          ]
        },
        order: ["priority desc", "created_at desc"],
        limit: 25
      },
      'Text Search': {
        where: {
          "$or": [
            { name: { "$like": "%test%" } },
            { description: { "$like": "%test%" } }
          ]
        },
        order: ["name asc"],
        limit: 50
      }
    };

    const query = exampleQueries[example];
    if (query) {
      setFilterJson(JSON.stringify(query, null, 2));
      setJsonError('');
    }
  };

  return (
    <div className="search-form">
      <div className="search-form-header">
        <h3>Search Criteria</h3>
        <div className="search-examples">
          <span>Examples:</span>
          {['Basic Filter', 'Date Range', 'Complex Logic', 'Text Search'].map(example => (
            <button
              key={example}
              type="button"
              className="example-btn"
              onClick={() => insertExample(example)}
              title={`Insert ${example} example`}
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="schema-select">Schema:</label>
          <select
            id="schema-select"
            value={selectedSchema}
            onChange={(e) => onSchemaChange(e.target.value)}
            disabled={loading}
          >
            <option value="">Select a schema</option>
            {schemas.map((schema) => (
              <option key={schema} value={schema}>
                {schema}
              </option>
            ))}
          </select>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSearch}
            disabled={loading || !selectedSchema || jsonError}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleClear}
            disabled={loading}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="filter-json">Filter Query (JSON):</label>
        <textarea
          id="filter-json"
          value={filterJson}
          onChange={(e) => handleJsonChange(e.target.value)}
          disabled={loading}
          placeholder='{"where": {}, "order": [], "limit": 50}'
          rows={8}
          className={`json-textarea ${jsonError ? 'error' : ''}`}
        />
        {jsonError && (
          <div className="json-error">{jsonError}</div>
        )}
      </div>

      <div className="form-help">
        <details>
          <summary>Query Syntax Help</summary>
          <div className="help-content">
            <h4>Basic Operators:</h4>
            <ul>
              <li><code>{"$eq"}</code> - Equals (default)</li>
              <li><code>{"$ne"}</code> - Not equals</li>
              <li><code>{"$gt"}</code>, <code>{"$gte"}</code> - Greater than, greater than or equal</li>
              <li><code>{"$lt"}</code>, <code>{"$lte"}</code> - Less than, less than or equal</li>
              <li><code>{"$in"}</code> - Value in array</li>
              <li><code>{"$like"}</code> - Pattern matching (SQL LIKE)</li>
            </ul>
            
            <h4>Logical Operators:</h4>
            <ul>
              <li><code>{"$and"}</code> - All conditions must match</li>
              <li><code>{"$or"}</code> - Any condition must match</li>
              <li><code>{"$not"}</code> - Condition must not match</li>
            </ul>

            <h4>Array Operators:</h4>
            <ul>
              <li><code>{"$any"}</code> - Array contains any value</li>
              <li><code>{"$all"}</code> - Array contains all values</li>
            </ul>
          </div>
        </details>
      </div>
    </div>
  );
}