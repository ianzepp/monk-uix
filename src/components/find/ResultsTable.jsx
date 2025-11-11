import { Link } from 'react-router-dom';

export function ResultsTable({ records, schema }) {
  const getDisplayColumns = () => {
    if (!records || records.length === 0) return [];

    const firstRecord = records[0];
    const allKeys = Object.keys(firstRecord);

    const columns = [];

    // Add important fields (excluding ID since it's in Actions column)
    const priorityFields = ['name', 'title', 'email', 'status', 'type', 'author', 'text', 'content'];
    priorityFields.forEach(field => {
      if (allKeys.includes(field) && !columns.includes(field)) {
        columns.push(field);
      }
    });

    // Add remaining fields (up to 6 total columns)
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

  const displayColumns = getDisplayColumns();

  return (
    <div className="table-container">
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
                  to={`/data/${schema}/${record.id}`}
                  className="btn btn-sm btn-secondary"
                  title={`View record ${record.id}`}
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
  );
}