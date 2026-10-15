import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Search, Shield, BarChart3, TrendingUp, CheckCircle, AlertCircle, History } from 'lucide-react';
import { healthApi } from '../api/client';
import { formatNumber, formatCurrency } from '../utils/formatters';

export const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total: 0,
    verified: 0,
    review: 0,
    highRisk: 0,
  });
  const [loading, setLoading] = useState(false);
  const [backendConnected, setBackendConnected] = useState(null);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        await healthApi.check();
        setBackendConnected(true);
      } catch {
        setBackendConnected(false);
      }
    };
    checkBackend();
  }, []);

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">VeriFy</h1>
        <p className="page-subtitle">Independent intelligence for banking verification.</p>
      </header>

      <div className="page-content">
        <div className="section">
          <h2 className="section-title">How VeriFy Works</h2>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              VeriFy compares decisions from your Bank AI against an independent verification engine.
              The independent engine evaluates loan applications and financial transactions using
              transparent risk rules, then compares its assessment against the Bank AI recommendation.
            </p>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2rem',
              flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--brand-light)',
                  color: 'var(--brand-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Shield size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600' }}>Bank AI</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>XGBoost Model + Fallback</div>
                </div>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '1.5rem' }}>
                vs
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--risk-low-bg)',
                  color: 'var(--risk-low)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <CheckCircle size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600' }}>Independent Verification</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rule-based Risk Engine</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {!backendConnected && backendConnected !== null && (
          <div className="card" style={{
            marginBottom: '2rem',
            background: 'var(--risk-high-bg)',
            border: '1px solid var(--risk-high)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertCircle size={20} color="var(--risk-high)" />
              <div>
                <div style={{ fontWeight: '600', color: 'var(--risk-high)', marginBottom: '0.25rem' }}>
                  Backend Not Reachable
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  The API server at <code style={{ background: 'var(--bg-primary)', padding: '0.125rem 0.375rem', borderRadius: 'var(--radius-sm)' }}>
                    {import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}
                  </code> could not be reached.
                  Check that the backend is running and CORS is configured.
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="section">
          <h2 className="section-title">Summary</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon total">
                <BarChart3 />
              </div>
              <div className="stat-content">
                <div className="stat-value">{formatNumber(stats.total)}</div>
                <div className="stat-label">Total Verifications</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon verified">
                <CheckCircle />
              </div>
              <div className="stat-content">
                <div className="stat-value">{formatNumber(stats.verified)}</div>
                <div className="stat-label">Verified Cases</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon review">
                <AlertCircle />
              </div>
              <div className="stat-content">
                <div className="stat-value">{formatNumber(stats.review)}</div>
                <div className="stat-label">Needs Human Review</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon high-risk">
                <TrendingUp />
              </div>
              <div className="stat-content">
                <div className="stat-value">{formatNumber(stats.highRisk)}</div>
                <div className="stat-label">High Risk Cases</div>
              </div>
            </div>
          </div>

          <div className="empty-state" style={{ padding: '3rem 2rem' }}>
            <div className="empty-state-icon">
              <BarChart3 size={48} />
            </div>
            <h3 className="empty-state-title">Statistics Not Available</h3>
            <p className="empty-state-text">
              The backend does not currently expose a dashboard statistics or verification
              history endpoint. These summary cards will populate once the backend provides
              aggregate data.
            </p>
          </div>
        </div>

        <div className="section">
          <h2 className="section-title">Quick Actions</h2>
          <div style={{
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
          }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => navigate('/loan')}
            >
              <FileText size={20} />
              Verify Loan Application
            </button>
            <button
              className="btn btn-secondary btn-lg"
              onClick={() => navigate('/fraud')}
            >
              <Search size={20} />
              Analyze Transaction
            </button>
          </div>
        </div>

        <div className="section">
          <h2 className="section-title">Recent Results</h2>
          <div className="empty-state" style={{ padding: '2rem 1rem' }}>
            <div className="empty-state-icon">
              <History size={48} />
            </div>
            <h3 className="empty-state-title">No Recent Verifications</h3>
            <p className="empty-state-text">
              Start by verifying a loan application or analyzing a transaction.
              Results from this session will appear here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};