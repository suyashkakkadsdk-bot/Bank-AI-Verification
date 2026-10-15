import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  FileText,
  Search,
  Clock,
  BarChart3,
  Shield,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import {
  getRiskScoreClass,
  getRiskLevelClass,
  getVerificationResultClass,
  getDecisionClass,
  getFinalStatusClass,
} from '../utils/formatters';

export const VerificationResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const result = location.state?.result;
  const caseType = location.state?.caseType;
  const isLoan = caseType === 'loan';

  useEffect(() => {
    if (!result) {
      navigate('/');
    }
  }, [result, navigate]);

  if (!result) {
    return (
      <div className="page">
        <div className="page-content">
          <div className="empty-state">
            <div className="empty-state-icon">
              <HelpCircle size={48} />
            </div>
            <h3 className="empty-state-title">No Result Found</h3>
            <p className="empty-state-text">
              Navigate to this page by submitting a verification request.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const bankDecision = result.bank_ai_decision || '—';
  const verificationResult = result.verification_result || '—';
  const riskScore = result.risk_score ?? '—';
  const riskLevel = result.risk_level || '—';
  const reasons = result.reasons || [];
  const recommendation = result.recommendation || '—';
  const finalStatus = result.final_status || '—';
  const modelProbability = result.model_probability;
  const usedFallback = result.used_fallback;

  const getRiskScoreBackgroundColor = (score) => {
    if (score <= 30) return 'var(--risk-low)';
    if (score <= 70) return 'var(--risk-medium)';
    return 'var(--risk-high)';
  };

  return (
    <div className="page">
      <header className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate(`/${isLoan ? 'loan' : 'fraud'}`)}
            aria-label="Back to verification form"
          >
            <ArrowLeft size={16} />
            New Verification
          </button>
          <div>
            <h1 className="page-title">
              {isLoan ? 'Loan Verification Result' : 'Fraud Detection Result'}
            </h1>
            <p className="page-subtitle">
              {isLoan ? `Application ${result.application_id || ''}` : `Transaction ${result.transaction_id || ''}`}
            </p>
          </div>
        </div>
      </header>

      <div className="page-content">
        <div className="section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <span className={`badge ${getVerificationResultClass(verificationResult)}`} style={{ fontSize: '0.875rem' }}>
              {verificationResult}
            </span>
            <span className={`badge ${getFinalStatusClass(finalStatus)}`} style={{ fontSize: '0.875rem' }}>
              {finalStatus === 'VERIFIED' ? 'Verified' : 'Human Review Required'}
            </span>
          </div>

          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <div>
                <div className="card-title">Comparison</div>
                <div className="card-subtitle">
                  Bank AI vs. Independent Verification Engine
                </div>
              </div>
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}>
              <CompareRow
                label="Bank AI Decision"
                value={bankDecision}
                valueClass={getDecisionClass(bankDecision, caseType)}
                icon={<Shield size={20} />}
                color="var(--brand-primary)"
                note={usedFallback ? 'Used fallback path' : modelProbability !== undefined && `Confidence: ${(modelProbability * 100).toFixed(1)}%`}
              />

              <CompareRow
                label="Independent Assessment"
                value={result.independent_decision || '—'}
                valueClass={getDecisionClass(result.independent_decision || '', caseType)}
                icon={<CheckCircle size={20} />}
                color="var(--risk-low)"
                note="Rule-based risk engine"
              />

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
                borderTop: '2px dashed var(--border-primary)',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1.5rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-full)',
                }}>
                  <HelpCircle size={16} color="var(--text-secondary)" />
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    Verification Result:
                  </span>
                  <span className={`badge ${getVerificationResultClass(verificationResult)}`} style={{ fontSize: '0.875rem' }}>
                    {verificationResult}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <div>
                <div className="card-title">Risk Assessment</div>
                <div className="card-subtitle">Independent risk score and level</div>
              </div>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.5rem',
              flexWrap: 'wrap',
            }}>
              <div className="risk-score" style={{ gap: '1rem' }}>
                <div
                  className={`risk-score-circle ${typeof riskScore === 'number' ? getRiskScoreClass(riskScore) : ''}`}
                  style={{
                    width: '72px',
                    height: '72px',
                    fontSize: '1.5rem',
                    background: typeof riskScore === 'number' ? getRiskScoreBackgroundColor(riskScore) : 'var(--text-muted)',
                  }}
                  aria-label={`Risk score: ${riskScore}`}
                >
                  {typeof riskScore === 'number' ? `${riskScore}` : '—'}
                </div>
                <div className="risk-score-info">
                  <div className="risk-score-label">Risk Score</div>
                  <div className="risk-score-value">/ 100</div>
                </div>
              </div>
              <div>
                <div className="risk-score-label">Risk Level</div>
                <div style={{ marginTop: '0.25rem' }}>
                  <span className={`badge ${getRiskLevelClass(riskLevel)}`}>{riskLevel}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <div>
                <div className="card-title">Key Factors</div>
                <div className="card-subtitle">Reasons from the independent verification engine</div>
              </div>
            </div>
            {reasons.length > 0 ? (
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
              }}>
                {reasons.map((reason, index) => (
                  <li key={index} style={{
                    padding: '0.625rem 0',
                    borderBottom: index < reasons.length - 1 ? '1px solid var(--border-primary)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.9375rem',
                    color: 'var(--text-primary)',
                  }}>
                    <AlertTriangle size={16} color="var(--risk-medium)" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state" style={{ padding: '1.5rem' }}>
                <p style={{ color: 'var(--text-secondary)' }}>No reasons provided.</p>
              </div>
            )}
          </div>

          <div className="card">
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Recommendation
              </div>
              <div style={{
                padding: '1rem',
                background: verificationResult === 'VERIFIED' && riskLevel === 'LOW'
                  ? 'var(--status-verified-bg)'
                  : 'var(--status-review-bg)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
              }}>
                <div style={{ flexShrink: 0, marginTop: '0.125rem' }}>
                  {verificationResult === 'VERIFIED' && riskLevel === 'LOW' ? (
                    <CheckCircle size={20} color="var(--status-verified)" />
                  ) : (
                    <AlertCircle size={20} color="var(--status-review)" />
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                    {recommendation}
                  </div>
                  {recommendation === 'Human review recommended' && (
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      A human reviewer should examine this case before making a final decision.
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  <AlertCircle size={14} style={{ marginRight: '0.375rem', verticalAlign: 'middle' }} />
                  A VERIFIED result means the Bank AI decision is confirmed by the independent engine.
                  It does not automatically mean the loan is approved or the transaction is guaranteed safe.
                </div>
              </div>
            </div>
          </div>

          <div className="section" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button className="btn btn-secondary" onClick={() => navigate(`/${isLoan ? 'loan' : 'fraud'}`)}>
              {isLoan ? <FileText size={20} /> : <Search size={20} />}
              Verify Another
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/')}>
              <BarChart3 size={20} />
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CompareRow = ({ label, value, valueClass, icon, color, note }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem',
    background: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-md)',
    gap: '1rem',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
      <div style={{ color, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
          {label}
        </div>
        <div style={{ fontSize: '1.125rem', fontWeight: '600', color: 'var(--text-primary)', marginTop: '0.25rem' }}>
          <span className={`badge ${valueClass}`}>{value}</span>
        </div>
      </div>
    </div>
    {note && (
      <div style={{
        fontSize: '0.8125rem',
        color: 'var(--text-secondary)',
        textAlign: 'right',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: '200px',
      }}>
        {note}
      </div>
    )}
  </div>
);