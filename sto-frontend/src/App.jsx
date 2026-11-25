import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AppProvider, useApp } from './context/AppContext';
import SplashScreen from './components/SplashScreen';
import Snackbar from './components/Snackbar';

import Login from './pages/Login';
import DashboardPimpinan from './pages/DashboardPimpinan';
import DashboardTeknisi from './pages/DashboardTeknisi';
import GudangDashboard from './pages/GudangDashboard';
import AuditReportPage from './pages/AuditReportPage';
import DetailTiketTelegram from './pages/DetailTiketTelegram';
import MagicLogin from './pages/MagicLogin';

// Komponen Pelindung Rute
function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser } = useApp();
  const sessionUser = typeof window !== 'undefined' ? (() => {
    try {
      const s = sessionStorage.getItem('sto_active_user');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  })() : null;

  const activeUser = currentUser || sessionUser;

  if (!activeUser || !activeUser.role) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(activeUser.role)) {
    if (activeUser.role === 'teknisi') return <Navigate to="/dashboard-teknisi" replace />;
    if (activeUser.role === 'gudang') return <Navigate to="/dashboard-gudang" replace />;
    return <Navigate to="/dashboard-pimpinan" replace />;
  }

  return children;
}

function AppContent() {
  const { notification, setNotification, currentUser } = useApp();
  const [showSplash, setShowSplash] = useState(() => {
    try {
      if (window.location.pathname === '/magic-login') return false;
      const seen = sessionStorage.getItem('sto_splash_seen');
      return !seen;
    } catch {
      return true;
    }
  });

  const handleSplashFinish = () => {
    try {
      sessionStorage.setItem('sto_splash_seen', 'true');
    } catch {}
    setShowSplash(false);
  };

  const handleTriggerSplash = () => {
    setShowSplash(true);
  };

  // Evaluasi sesi aktif dari sessionStorage agar saat F5/refresh tetap berada di dashboard aktif
  const getAuthenticatedDashboard = () => {
    try {
      const s = sessionStorage.getItem('sto_active_user');
      const activeUser = currentUser || (s ? JSON.parse(s) : null);
      if (activeUser && activeUser.role) {
        if (activeUser.role === 'teknisi') return '/dashboard-teknisi';
        if (activeUser.role === 'gudang') return '/dashboard-gudang';
        return '/dashboard-pimpinan';
      }
    } catch {}
    return null;
  };

  const activeDashboard = getAuthenticatedDashboard();

  return (
    <>
      {showSplash && (
        <SplashScreen onFinish={handleSplashFinish} duration={1000} />
      )}

      <Routes>
        <Route
          path="/"
          element={
            activeDashboard ? (
              <Navigate to={activeDashboard} replace />
            ) : (
              <Login onTriggerSplash={handleTriggerSplash} />
            )
          }
        />
        <Route
          path="/login"
          element={
            activeDashboard ? (
              <Navigate to={activeDashboard} replace />
            ) : (
              <Login onTriggerSplash={handleTriggerSplash} />
            )
          }
        />
        <Route
          path="/dashboard-pimpinan"
          element={
            <ProtectedRoute allowedRoles={['pimpinan']}>
              <DashboardPimpinan />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard-teknisi"
          element={
            <ProtectedRoute allowedRoles={['teknisi']}>
              <DashboardTeknisi />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard-gudang"
          element={
            <ProtectedRoute allowedRoles={['gudang']}>
              <GudangDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/laporan-audit"
          element={
            <ProtectedRoute allowedRoles={['pimpinan']}>
              <AuditReportPage />
            </ProtectedRoute>
          }
        />
        <Route path="/tiket/:id" element={<DetailTiketTelegram />} />
        <Route path="/magic-login" element={<MagicLogin />} />
        <Route path="*" element={<Navigate to={activeDashboard || "/login"} replace />} />
      </Routes>

      <Snackbar
        notification={notification}
        onClose={() => setNotification(null)}
      />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AppProvider>
    </ThemeProvider>
  );
}