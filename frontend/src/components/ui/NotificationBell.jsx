import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../../context/NotificationContext';

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          color: '#FFFFFF',
          fontSize: '1.25rem',
          position: 'relative',
          padding: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-label="Campus In-App Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              backgroundColor: '#D32F2F',
              color: '#FFFFFF',
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '2px 5px',
              borderRadius: '10px',
              lineHeight: 1,
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '44px',
            width: '320px',
            backgroundColor: '#FFFFFF',
            borderRadius: '6px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
            border: '1px solid var(--gv-border)',
            zIndex: 110,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#F8F5F2',
              borderBottom: '1px solid var(--gv-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <strong style={{ fontSize: '0.85rem', color: 'var(--gv-primary-brown)' }}>
              Notifications ({unreadCount} new)
            </strong>
          </div>

          <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--gv-text-subtle)', fontSize: '0.82rem' }}>
                No notifications right now.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && markAsRead(n.id)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--gv-border)',
                    backgroundColor: n.isRead ? '#FFFFFF' : '#FAF6F5',
                    cursor: n.isRead ? 'default' : 'pointer',
                    transition: 'background 150ms',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '0.82rem', color: 'var(--gv-primary-brown)' }}>
                      {n.subject}
                    </strong>
                    {!n.isRead && (
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--gv-portal-cyan)', display: 'inline-block' }} />
                    )}
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--gv-text-muted)', margin: 0, lineHeight: 1.4 }}>
                    {n.message}
                  </p>
                  <small style={{ fontSize: '0.7rem', color: 'var(--gv-text-subtle)', marginTop: '4px', display: 'block' }}>
                    {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : ''}
                  </small>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
