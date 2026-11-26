import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import FormField from '../../components/ui/FormField';
import api from '../../lib/api';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Selected Log Details Modal
  const [selectedLog, setSelectedLog] = useState(null);

  const loadAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (actionFilter.trim()) params.append('action', actionFilter.trim());
      if (entityFilter.trim()) params.append('entityType', entityFilter.trim());
      params.append('page', page);
      params.append('size', '20');

      const res = await api.admin.getAuditLogs(`?${params.toString()}`);
      if (res?.data) {
        setLogs(res.data.content || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalElements(res.data.totalElements || 0);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setError(err.message || 'Failed to load system audit logs.');
    } finally {
      setLoading(false);
    }
  }, [actionFilter, entityFilter, page]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setPage(0);
    loadAuditLogs();
  };

  const handleResetFilters = () => {
    setActionFilter('');
    setEntityFilter('');
    setPage(0);
  };

  return (
    <DashboardLayout
      title="System Audit &amp; Governance Logs"
      breadcrumbs={[{ label: 'Administration' }, { label: 'Audit Trail' }]}
    >
      {/* Selected Log Inspector Modal */}
      {selectedLog && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div style={{
            background: '#fff', borderRadius: '8px', maxWidth: '650px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--gv-border)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, color: 'var(--gv-primary-brown)' }}>
                Audit Record: {selectedLog.action}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--gv-text-subtle)' }}
              >
                &times;
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.88rem', marginBottom: '20px' }}>
              <div><strong>Timestamp:</strong> {new Date(selectedLog.timestamp).toLocaleString()}</div>
              <div><strong>Action Type:</strong> <code>{selectedLog.action}</code></div>
              <div><strong>Entity Type:</strong> <code>{selectedLog.entityType || 'SYSTEM'}</code></div>
              <div><strong>Entity ID:</strong> <code>{selectedLog.entityId || 'N/A'}</code></div>
              <div><strong>Actor User ID:</strong> <code>{selectedLog.userId || 'System / Anonymous'}</code></div>
              <div><strong>IP Address:</strong> {selectedLog.ipAddress || '127.0.0.1'}</div>
            </div>

            {selectedLog.details && (
              <div style={{ marginBottom: '20px' }}>
                <strong style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem' }}>Event Details / Payload:</strong>
                <pre style={{
                  backgroundColor: '#FAF6F5',
                  padding: '12px',
                  borderRadius: '4px',
                  border: '1px solid var(--gv-border)',
                  fontSize: '0.82rem',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap',
                }}>
                  {typeof selectedLog.details === 'object' ? JSON.stringify(selectedLog.details, null, 2) : selectedLog.details}
                </pre>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--gv-border)', paddingTop: '16px' }}>
              <Button
                variant="outline"
                onClick={() => setSelectedLog(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Box */}
      <Card title="Filter Audit Trail">
        <form onSubmit={handleFilterSubmit} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px' }}>
            <FormField label="Filter Action" id="actionFilter">
              <input
                type="text"
                id="actionFilter"
                className="gv-input"
                placeholder="e.g. LOGIN_SUCCESS, DRIVE_APPROVED"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
              />
            </FormField>
          </div>

          <div style={{ flex: '1 1 200px' }}>
            <FormField label="Filter Entity Type" id="entityFilter">
              <input
                type="text"
                id="entityFilter"
                className="gv-input"
                placeholder="e.g. APPLICATION, DRIVE, USER"
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
              />
            </FormField>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '2px' }}>
            <Button type="submit" variant="primary">
              Filter Records
            </Button>
            <Button type="button" variant="outline" onClick={handleResetFilters}>
              Reset
            </Button>
          </div>
        </form>
      </Card>

      {error && (
        <div style={{ backgroundColor: '#FFEBEE', border: '1px solid #EF5350', color: '#C62828', padding: '12px', borderRadius: '4px', margin: '20px 0' }}>
          ⚠️ {error}
        </div>
      )}

      <Card title={`System Security & Compliance Logs (${totalElements})`}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gv-text-muted)' }}>
            <span className="gv-spinner" style={{ marginRight: '8px' }}></span>
            Loading audit records...
          </div>
        ) : (
          <>
            <div className="gv-table-responsive">
              <table className="gv-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Target Entity</th>
                    <th>Actor ID</th>
                    <th>IP Address</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length > 0 ? (
                    logs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', color: 'var(--gv-text-subtle)' }}>
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td>
                          <strong style={{ color: 'var(--gv-primary-brown)', fontSize: '0.85rem' }}>
                            {log.action}
                          </strong>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.8rem' }}>
                            {log.entityType ? `${log.entityType} (${log.entityId ? log.entityId.slice(0, 8) + '...' : ''})` : '—'}
                          </span>
                        </td>
                        <td>
                          <code style={{ fontSize: '0.78rem' }}>
                            {log.userId ? log.userId.slice(0, 8) + '...' : 'System'}
                          </code>
                        </td>
                        <td style={{ fontSize: '0.8rem' }}>
                          {log.ipAddress || '127.0.0.1'}
                        </td>
                        <td>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedLog(log)}
                          >
                            Inspect 🔎
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--gv-text-subtle)' }}>
                        No audit records found matching query criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--gv-border)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--gv-text-muted)' }}>
                  Page {page + 1} of {totalPages} ({totalElements} total)
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    ← Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next →
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </DashboardLayout>
  );
}
