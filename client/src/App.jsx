import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import Navbar from './components/Navbar';
import PimpinanDashboard from './pages/PimpinanDashboard';
import TeknisiDashboard from './pages/TeknisiDashboard';
import GudangDashboard from './pages/GudangDashboard';

function App() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    if (user?.role === 'gudang') return 'stok';
    if (user?.role === 'teknisi') return 'tugas';
    return 'gis';
  });

  useEffect(() => {
    if (user?.role === 'gudang') {
      setActiveTab('stok');
    } else if (user?.role === 'teknisi') {
      setActiveTab('tugas');
    } else if (user?.role === 'pimpinan') {
      setActiveTab('gis');
    }
  }, [user?.role]);

  if (!isAuthenticated) {
    return (
      <>
        <Toaster position="top-right" reverseOrder={false} toastOptions={{ duration: 3500 }} />
        <LoginPage />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100">
      <Toaster position="top-right" reverseOrder={false} toastOptions={{ duration: 3500 }} />
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {user.role === 'pimpinan' && (
          <PimpinanDashboard activeTab={activeTab} setActiveTab={setActiveTab} />
        )}

        {user.role === 'teknisi' && (
          <TeknisiDashboard />
        )}

        {user.role === 'gudang' && (
          <GudangDashboard activeTab={activeTab} setActiveTab={setActiveTab} />
        )}
      </main>
    </div>
  );
}

export default App;
