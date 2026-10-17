import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Search, Shield, BarChart3, TrendingUp, CheckCircle, AlertCircle, History } from 'lucide-react';
import { healthApi } from '../api/client';

export const Dashboard = () => {
  const navigate = useNavigate();
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
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '2rem',
          }}>
            <h2 className="section-title" style={{ width: '100%', textAlign: 'center' }}>Intelligent Banking Verification</h2>
            <p className="page-subtitle" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
              Independent AI assessment. Configurable verification rules. Human oversight.
            </p>
          </div>

          <div className="features-grid">
            <FeatureCard
              title="Loan Verification"
              description="Evaluate loan applications through independent AI assessment and a configurable verification engine. Identify decision mismatches and flag cases requiring human review."
              icon={<LoanIcon />}
              label="AI-Powered Assessment"
              labelColor="var(--brand-primary)"
              labelBg="var(--brand-light)"
              buttonText="Verify Loan"
              onButtonClick={() => navigate('/loan')}
              cardColor="var(--brand-primary)"
              iconBg="var(--brand-light)"
              iconColor="var(--brand-primary)"
            />

            <FeatureCard
              title="Fraud Detection"
              description="Assess transaction risk, identify potentially suspicious activity, and highlight cases that may require additional investigation."
              icon={<FraudIcon />}
              label="Transaction Risk Analysis"
              labelColor="#0d9488"
              labelBg="#ccfbf1"
              buttonText="Detect Fraud"
              onButtonClick={() => navigate('/fraud')}
              cardColor="var(--brand-primary)"
              iconBg="#ccfbf1"
              iconColor="#0d9488"
            />
          </div>
        </div>

        <div className="section">
          <h2 className="section-title">How VeriFy Works</h2>
          <div className="workflow-strip">
            <WorkflowStep
              number="01"
              title="Submit"
              description="Provide loan application or transaction details."
            />
            <WorkflowStep
              number="02"
              title="Assess"
              description="Run the relevant assessment and verification rules."
            />
            <WorkflowStep
              number="03"
              title="Review"
              description="Present the verification outcome and flag cases requiring human review."
            />
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

const FeatureCard = ({ title, description, icon, label, labelColor, labelBg, buttonText, onButtonClick, cardColor, iconBg, iconColor }) => (
  <div className="feature-card" style={{ borderTop: `4px solid ${cardColor}` }}>
    <div className="feature-card-icon" style={{
      background: iconBg,
      color: iconColor,
    }}>
      {icon}
    </div>
    <div className="feature-card-body">
      <div className="feature-card-label" style={{
        color: labelColor,
        background: labelBg,
      }}>{label}</div>
      <h3 className="feature-card-title">{title}</h3>
      <p className="feature-card-description">{description}</p>
    </div>
    <button
      className="btn btn-primary"
      onClick={onButtonClick}
      style={{ margin: '0 1.5rem 1.5rem' }}
    >
      {buttonText}
    </button>
  </div>
);

const WorkflowStep = ({ number, title, description }) => (
  <div className="workflow-step">
    <div className="workflow-number">{number}</div>
    <div className="workflow-content">
      <div className="workflow-title">{title}</div>
      <div className="workflow-description">{description}</div>
    </div>
  </div>
);

const LoanIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2a4 4 0 0 1 4 4v4a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h4a4 4 0 0 0 4-4V6a2 2 0 0 1 2-2h2z" />
    <path d="M4 20h16" />
    <path d="M9 10h6" />
    <circle cx="8" cy="17" r="1" />
    <circle cx="16" cy="17" r="1" />
  </svg>
);

const FraudIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21.36l-1.41-1.41C5.69 15.5 2 12.03 2 7.5 2 4.42 4.42 2 7.5 2c2.17 0 4.17.83 5.66 2.16L15 6l.59-.59C16.83 4.83 18.83 4 21 4c3.08 0 5.5 2.42 5.5 5.5 0 4.53-3.69 8-8.59 12.96L12 21.36z" />
    <path d="M9 9h6v6H9z" />
    <line x1="12" y1="6" x2="12" y2="12" />
  </svg>
);
