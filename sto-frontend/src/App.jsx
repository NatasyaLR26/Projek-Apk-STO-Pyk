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
        <Route path="/dashboard-pimpinan" element={<DashboardPimpinan />} />
        <Route path="/dashboard-teknisi" element={<DashboardTeknisi />} />
        <Route path="/dashboard-gudang" element={<GudangDashboard />} />
        <Route path="/laporan-audit" element={<AuditReportPage />} />
        <Route path="/tiket/:id" element={<DetailTiketTelegram />} />
        <Route path="/magic-login" element={<MagicLogin />} />
        <Route path="*" element={<Navigate to={activeDashboard || "/"} replace />} />
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