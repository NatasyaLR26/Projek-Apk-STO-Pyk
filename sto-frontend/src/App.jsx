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

function AppContent() {
  const { notification, setNotification } = useApp();
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

  return (
    <>
      {showSplash && (
        <SplashScreen onFinish={handleSplashFinish} duration={1900} />
      )}

      <Routes>
        <Route
          path="/"
          element={<Login onTriggerSplash={handleTriggerSplash} />}
        />
        <Route
          path="/login"
          element={<Login onTriggerSplash={handleTriggerSplash} />}
        />
        <Route path="/dashboard-pimpinan" element={<DashboardPimpinan />} />
        <Route path="/dashboard-teknisi" element={<DashboardTeknisi />} />
        <Route path="/dashboard-gudang" element={<GudangDashboard />} />
        <Route path="/laporan-audit" element={<AuditReportPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
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