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

// Komponen Pelindung Rute (Strict Protected Route)
// Menjamin jika link dibagikan ke orang lain / dibuka di browser baru, WAJIB ke halaman Login terlebih dahulu
function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser } = useApp();
  const rawUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  let activeUser = currentUser;
  if (!activeUser && rawUser) {
    try {
      const parsed = JSON.parse(rawUser);
      if (parsed && parsed.id && parsed.role) activeUser = parsed;
    } catch {}
  }

  if (!activeUser) {
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
    // Show splash screen on first visit in the browser session
    const seen = sessionStorage.getItem('sto_splash_seen');
    return !seen;
  });

  const handleSplashFinish = () => {
    sessionStorage.setItem('sto_splash_seen', 'true');
    setShowSplash(false);
  };

  const handleTriggerSplash = () => {
    setShowSplash(true);
  };

  // Evaluasi sesi aktif: mencegah tombol Back browser kembali ke login tanpa logout
  const getAuthenticatedDashboard = () => {
    try {
      const rawUser = localStorage.getItem('user');
      const activeUser = currentUser || (rawUser ? JSON.parse(rawUser) : null);
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
        <SplashScreen onFinish={handleSplashFinish} duration={1900} />
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