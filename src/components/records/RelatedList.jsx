import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import './RelatedList.css';

export function RelatedList({ parentSchema, parentId, relationshipName, relatedSchema }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadRelatedRecords();
  }, [parentSchema, parentId, relationshipName]);

  const loadRelatedRecords = async () => {
    try {
      setLoading(true);
      setError('');

      // Use Find API to query related records
      const data = await api.find.search(relatedSchema, {
        where: { [`${parentSchema.slice(0, -1)}_id`]: parentId },
        order: ['created_at desc'],
        limit: 5
      });

      setRecords(Array.isArray(data) ? data : []);
      setTotalCount(Array.isArray(data) ? data.length : 0);
    } catch (err) {
      console.error(`Failed to load ${relationshipName}:`, err);
      setError(err.message || 'Failed to load related records');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const getDisplayColumns = () => {
    if (!records || records.length === 0) return [];

    const firstRecord = records[0];
    const allKeys = Object.keys(firstRecord);

    const columns = [];

    // Add important fields (max 4 columns total for related lists)
    const priorityFields = ['name', 'title', 'text', 'content', 'email', 'status', 'author'];
    priorityFields.forEach(field => {
      if (columns.length >= 4) return;
      if (allKeys.includes(field) && !columns.includes(field)) {
        columns.push(field);
      }
    });

    // Add remaining fields
    allKeys.forEach(key => {
      if (columns.length >= 4) return;
      if (key === 'id' || key.startsWith('access_')) return;
      if (!key.startsWith('_') &&
          !key.includes('created_at') &&
          !key.includes('updated_at') &&
          !key.includes('trashed_at') &&
          !key.includes('deleted_at') &&
          !key.endsWith('_id') &&
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
    if (typeof value === 'string' && value.length > 30) {
      return value.substring(0, 30) + '...';
    }
    return String(value);
  };

  const displayColumns = getDisplayColumns();

  if (loading) {
    return (
      <div className="related-list">
        <h3>{relationshipName} ({relatedSchema})</h3>
        <div className="related-list-loading">
          <span className="loading"></span>
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="related-list">
        <h3>{relationshipName} ({relatedSchema})</h3>
        <div className="related-list-error">
          {error}
        </div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="related-list">
        <h3>{relationshipName} ({relatedSchema})</h3>
        <p className="related-list-empty">No related records found</p>
      </div>
    );
  }

  return (
    <div className="related-list">
      <div className="related-list-header">
        <h3>
          {relationshipName} ({relatedSchema}) - {totalCount} record{totalCount !== 1 ? 's' : ''}
        </h3>
      </div>

      <div className="related-list-table">
        <table>
          <thead>
            <tr>
              <th>Actions</th>
              {displayColumns.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id}>
                <td>
                  <Link
                    to={`/data/${relatedSchema}/${record.id}`}
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
    </div>
  );
}
