import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../lib/api';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = useCallback(async (isFilterChange = false) => {
    try {
      if (isFilterChange) setLoading(true);
      setError(null);

      const response = await api.notifications.getNotifications({
        unread: unreadOnly ? true : undefined,
        page: 0,
        size: 15,
      });

      if (response && response.data) {
        setNotifications(response.data.content || []);
        setUnreadCount(response.data.unreadCount || 0);
      }
    } catch (err) {
      setError(err.message || 'Unable to load notifications');
    } finally {
      if (isFilterChange) setLoading(false);
    }
  }, [unreadOnly]);

  // Initial load and modest 60s background polling
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => {
      fetchNotifications();
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      fetchNotifications(true);
    }
  };

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await api.notifications.markAsRead(id);
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now - date;
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 60) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        type="button"
        id="notification-bell-btn"
        className="notification-bell-btn"
        aria-label={`Notifications (${unreadCount} unread)`}
        aria-expanded={isOpen}
        onClick={handleToggle}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          color: '#334155',
          borderRadius: '6px',
        }}
      >
        {/* Bell Icon SVG */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 && (
          <span
            id="notification-unread-badge"
            className="notification-badge"
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              background: '#dc2626',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: '700',
              lineHeight: '1',
              padding: '2px 5px',
              borderRadius: '999px',
              minWidth: '16px',
              textAlign: 'center',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div
          id="notification-dropdown-panel"
          className="notification-popover"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            width: '360px',
            maxWidth: '90vw',
            background: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0',
            zIndex: 1000,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Popover Header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong style={{ fontSize: '14px', color: '#0f172a' }}>Notifications</strong>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: '#e0e7ff',
                    color: '#3730a3',
                    fontSize: '11px',
                    fontWeight: '600',
                    padding: '1px 6px',
                    borderRadius: '10px',
                  }}
                >
                  {unreadCount} unread
                </span>
              )}
            </div>

            <label
              style={{
                fontSize: '12px',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={(e) => setUnreadOnly(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              Unread only
            </label>
          </div>

          {/* Notification List Body */}
          <div
            style={{
              maxHeight: '380px',
              overflowY: 'auto',
              padding: '4px 0',
            }}
          >
            {loading && (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                Loading updates...
              </div>
            )}

            {!loading && error && (
              <div
                style={{
                  padding: '16px',
                  margin: '8px 12px',
                  background: '#fef2f2',
                  color: '#991b1b',
                  fontSize: '12px',
                  borderRadius: '6px',
                }}
              >
                {error}
                <button
                  type="button"
                  onClick={() => fetchNotifications(true)}
                  style={{
                    display: 'block',
                    marginTop: '6px',
                    color: '#b91c1c',
                    fontWeight: '600',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Retry
                </button>
              </div>
            )}

            {!loading && !error && notifications.length === 0 && (
              <div style={{ padding: '36px 16px', textAlign: 'center', color: '#94a3b8' }}>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#64748b' }}>
                  {unreadOnly ? 'No unread notifications' : 'No notifications yet'}
                </p>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
                  Important platform updates and alerts will appear here.
                </p>
              </div>
            )}

            {!loading &&
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notification-item ${n.isRead ? 'read' : 'unread'}`}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f1f5f9',
                    background: n.isRead ? '#ffffff' : '#f0f9ff',
                    transition: 'background-color 0.2s',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: n.isRead ? '600' : '700',
                          color: '#0f172a',
                          marginBottom: '2px',
                        }}
                      >
                        {n.subject}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#475569',
                          lineHeight: '1.4',
                          marginBottom: '4px',
                        }}
                      >
                        {n.message}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#94a3b8',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span>{formatTime(n.createdAt)}</span>
                        {n.relatedEntityType && (
                          <span
                            style={{
                              background: '#e2e8f0',
                              color: '#475569',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              textTransform: 'uppercase',
                            }}
                          >
                            {n.relatedEntityType}
                          </span>
                        )}
                      </div>
                    </div>

                    {!n.isRead && (
                      <button
                        type="button"
                        onClick={(e) => handleMarkAsRead(n.id, e)}
                        title="Mark as read"
                        aria-label="Mark as read"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#0284c7',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>

          {/* Popover Footer */}
          <div
            style={{
              padding: '8px 16px',
              borderTop: '1px solid #e2e8f0',
              textAlign: 'center',
              background: '#f8fafc',
            }}
          >
            <small style={{ fontSize: '11px', color: '#94a3b8' }}>
              Gujarat Vidyapith · Automated Placement Notifications
            </small>
          </div>
        </div>
      )}
    </div>
  );
}
