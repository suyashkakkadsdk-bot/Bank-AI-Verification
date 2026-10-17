import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Search,
  History,
  Shield,
  LogOut,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../styles/global.css';

const NAV_ITEMS = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/loan', label: 'Loan Verification', icon: FileText },
  { path: '/fraud', label: 'Fraud Detection', icon: Search },
  { path: '/history', label: 'Verification History', icon: History },
];

const MANAGER_NAV = {
  path: '/admin/manager',
  label: 'Manager',
  icon: Shield,
};

const hasManagerAccess = (user) => {
  const role = user?.role || 'employee';
  return role === 'admin' || role === 'manager';
};

export const Sidebar = () => {
  const { isAuthenticated, user, logout, passwordChangeRequired } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [...NAV_ITEMS];
  if (isAuthenticated && hasManagerAccess(user)) {
    navItems.push(MANAGER_NAV);
  }

  return (
    <aside
      className={`sidebar ${collapsed ? 'collapsed' : ''}`}
      style={{
        width: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
        flexShrink: 0,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-primary)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        transition: 'width var(--transition-normal)',
        overflow: 'hidden',
      }}
      role="navigation"
      aria-label="Main navigation"
    >
      <div style={{
        padding: '1.25rem',
        borderBottom: '1px solid var(--border-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 'var(--header-height)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-md)',
            background: 'var(--brand-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
          </div>
          {!collapsed && (
            <span style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}>
              VeriFy
            </span>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="btn-ghost"
          style={{ padding: '0.5rem' }}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path ||
                (item.path !== '/' && location.pathname.startsWith(item.path));
              const Icon = item.icon;

              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive: active }) => `nav-link ${active ? 'active' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: collapsed ? 0 : '0.875rem',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      color: isActive ? 'var(--brand-primary)' : 'var(--text-secondary)',
                      textDecoration: 'none',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      transition: 'all var(--transition-fast)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                    }}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon size={20} style={{ flexShrink: 0 }} />
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                </li>
              );
            })}
        </ul>

        {isAuthenticated && (
          <>
            <div style={{ height: '1px', background: 'var(--border-primary)', margin: '1rem 0' }} />
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <li>
                <button
                  onClick={logout}
                  className="nav-link"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: collapsed ? 0 : '0.875rem',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    width: '100%',
                    textAlign: collapsed ? 'center' : 'left',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                  }}
                >
                  <LogOut size={20} style={{ flexShrink: 0 }} />
                  {!collapsed && <span>Sign Out</span>}
                </button>
              </li>
            </ul>
          </>
        )}
      </nav>

      {!collapsed && isAuthenticated && (
        <div style={{
          padding: '1rem',
          borderTop: '1px solid var(--border-primary)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-full)',
              background: 'var(--brand-light)',
              color: 'var(--brand-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <User size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {user?.username || 'Administrator'}
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
              }}>
                Admin
              </div>
            </div>
          </div>
          {passwordChangeRequired && (
            <div style={{
              marginTop: '0.75rem',
              padding: '0.5rem 0.75rem',
              background: 'var(--status-review-bg)',
              border: '1px solid var(--status-review)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.75rem',
              color: 'var(--status-review)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <Shield size={14} />
              <span>Password change required</span>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};