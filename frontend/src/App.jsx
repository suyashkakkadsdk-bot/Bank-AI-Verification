import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ToastContainer } from './components/ToastContainer';
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute';
import { MainLayout, AuthLayout } from './layouts/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { LoanVerification } from './pages/LoanVerification';
import { FraudDetection } from './pages/FraudDetection';
import { VerificationResult } from './pages/VerificationResult';
import { VerificationHistory } from './pages/VerificationHistory';
import { AdminLogin } from './pages/AdminLogin';
import { ChangePassword } from './pages/ChangePassword';
import { PolicyManagement } from './pages/PolicyManagement';
import { healthApi } from './api/client';
import './styles/global.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route element={<PublicOnlyRoute />}>
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<AdminLogin />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route element={<AuthLayout />}>
                <Route path="/admin/change-password" element={<ChangePassword />} />
              </Route>
              <Route element={<MainLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/loan" element={<LoanVerification />} />
                <Route path="/fraud" element={<FraudDetection />} />
                <Route path="/result" element={<VerificationResult />} />
                <Route path="/history" element={<VerificationHistory />} />
                <Route path="/admin/policies" element={<PolicyManagement />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <ToastContainer />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
