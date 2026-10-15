import { useEffect, useState } from 'react';
import { Clock, Trash2, Info } from 'lucide-react';
import { getRiskScoreClass, getRiskLevelClass, getVerificationResultClass, getFinalStatusClass } from '../utils/formatters';

export const VerificationHistory = () => {
  const [sessionResults, setSessionResults] = useState([]);

  useEffect(() => {
    const stored = sessionStorage.getItem('verify_session_results');
    if (stored) {
      try {
        setSessionResults(JSON.parse(stored));
      } catch {
        setSessionResults([]);
      }
    }
  }, []);

  const saveToSession = (results) => {
    sessionStorage.setItem('verify_session_results', JSON.stringify(results));
    setSessionResults(results);
  };

  const clearSession = () => {
    sessionStorage.removeItem('verify_session_results');
    setSessionResults([]);
  };

  if (sessionResults.length === 0) {
    return (
      <div className="page">
        <header className="page-header">
          <div>
            <h1 className="page-title">Verification History</h1>
            <p className="page-subtitle">Session-based verification results.</p>
          </div>
        </header>

        <div className="page-content">
          <div className="card" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <Info size={20} color="var(--brand-primary)" style={{ marginTop: '0.125rem', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
                  Backend History Unavailable
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  The backend does not currently expose a verification history or analytics
                  endpoint. This page only shows results generated during the current browser
                  session and is not persisted to the database.
                </div>
              </div>
            </div>
          </div>

          <div className="empty-state">
            <div className="empty-state-icon">
              <Clock size={48} />
            </div>
            <h3 className="empty-state-title">No Verifications Yet</h3>
            <p className="empty-state-text">
              No verification results have been recorded during this session. Start by
              verifying a loan application or analyzing a transaction.
            </p>
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
              <a href="/loan" className="btn btn-primary">
                Verify Loan
              </a>
              <a href="/fraud" className="btn btn-secondary">
                Analyze Transaction
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <div className="flex-between">
          <div>
            <h1 className="page-title">Verification History</h1>
            <p className="page-subtitle">Session-based verification results ({sessionResults.length} records).</p>
          </div>
          <button className="btn btn-danger btn-sm" onClick={clearSession}>
            <Trash2 size={16} />
            Clear Session
          </button>
        </div>
      </header>

      <div className="page-content">
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <Info size={20} color="var(--brand-primary)" style={{ marginTop: '0.125rem', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
                Notice: This is session-only data
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                These results were generated during the current browser session and are not persisted
                to the backend database. This is not authoritative backend history.
              </div>
            </div>
          </div>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Type</th>
                <th>Bank AI</th>
                <th>Result</th>
                <th>Risk Score</th>
                <th>Status</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {sessionResults.map((result, index) => {
                const id = result.application_id || result.transaction_id || `result-${index}`;
                const caseType = result.application_id ? 'Loan' : 'Fraud';
                const isLoan = !!result.application_id;
                const bankDecision = result.bank_ai_decision || '—';
                const riskScore = result.risk_score ?? '—';
                const riskLevel = result.risk_level || '—';
                const verificationResult = result.verification_result || '—';
                const finalStatus = result.final_status || '—';

                let timeStr = '—';
                if (result._timestamp) {
                  const date = new Date(result._timestamp);
                  if (!isNaN(date.getTime())) {
                    timeStr = date.toLocaleString('en-IN', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                  }
                }

                return (
                  <tr key={index}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>{id}</td>
                    <td>{caseType}</td>
                    <td>
                      <span className={`badge ${isLoan ? 'badge-approved' : 'badge-genuine'}`}>
                        {bankDecision}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getVerificationResultClass(verificationResult)}`}>
                        {verificationResult}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className={`badge ${getRiskLevelClass(riskLevel)}`}>{riskLevel}</span>
                        {typeof riskScore === 'number' && (
                          <span style={{
                            fontSize: '0.8125rem',
                            fontWeight: '600',
                            color: typeof riskScore === 'number'
                              ? (riskScore <= 30 ? 'var(--risk-low)' : riskScore <= 70 ? 'var(--risk-medium)' : 'var(--risk-high)')
                              : 'var(--text-secondary)',
                          }}>{riskScore}/100</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${getFinalStatusClass(finalStatus)}`}>{finalStatus.replace('_', ' ')}</span>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{timeStr}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const saveResultToSession = (result, caseType) => {
  const stored = sessionStorage.getItem('verify_session_results');
  let results = [];
  if (stored) {
    try {
      results = JSON.parse(stored);
    } catch {
      results = [];
    }
  }
  results.unshift({ ...result, case_type: caseType, _timestamp: new Date().toISOString() });
  sessionStorage.setItem('verify_session_results', JSON.stringify(results));
};