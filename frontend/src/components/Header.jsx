import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Shield, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const Header = () => {
  const { isAuthenticated, user, passwordChangeRequired } = useAuth();
  const navigate = useNavigate();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header style={{
      height: 'var(--header-height)',
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.5rem',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 0.75rem',
          background: online ? 'var(--risk-low-bg)' : 'var(--risk-high-bg)',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.75rem',
          fontWeight: '600',
          color: online ? 'var(--risk-low)' : 'var(--risk-high)',
        }}>
          {online ? <Wifi size={14} /> : <WifiOff size={14} />}
          <span>{online ? 'Connected' : 'Offline'}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {isAuthenticated && (
          <div style={{
            position: 'relative',
          }}>
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                background: 'transparent',
                border: '1px solid transparent',
                transition: 'all var(--transition-fast)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-full)',
                background: 'var(--brand-light)',
                color: 'var(--brand-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Shield size={16} />
              </div>
              <span style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                {user?.username || 'Admin'}
              </span>
              <ChevronDown size={16} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};