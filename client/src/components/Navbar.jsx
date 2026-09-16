import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from './ConfirmDialog';
import { showInfo } from '../utils/toast';
import { LogOut, MapPin, Package, FileText, Smartphone } from 'lucide-react';

const Navbar = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  if (!user) return null;

  return (
    <header className="no-print bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center font-black text-white text-lg tracking-wider shadow-lg shadow-red-600/30 border border-red-400/40">
              STO
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base tracking-tight">TelkomAkses</span>
                <span className="text-xs px-2 py-0.5 rounded bg-red-600/20 text-red-400 font-semibold border border-red-600/30">
                  STO PYK
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Sistem WebGIS & Inventaris Material</p>
            </div>
          </div>

          {/* Navigation Links (Role based) */}
          <nav className="hidden md:flex items-center gap-1">
            {user.role === 'pimpinan' && (
              <>
                <button
                  onClick={() => setActiveTab('gis')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'gis'
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  WebGIS Tracking
                </button>
                <button
                  onClick={() => setActiveTab('tugas')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'tugas'
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Tiket Tugas
                </button>
                <button
                  onClick={() => setActiveTab('approval')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'approval'
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  Approval Material
                </button>
                <button
                  onClick={() => setActiveTab('audit')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'audit'
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Laporan Audit
                </button>
              </>
            )}

            {user.role === 'teknisi' && (
              <>
                <button
                  onClick={() => setActiveTab('tugas')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'tugas'
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  Tugas Lapangan
                </button>
              </>
            )}

            {user.role === 'gudang' && (
              <>
                <button
                  onClick={() => setActiveTab('stok')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'stok'
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  Inventaris Stok
                </button>
                <button
                  onClick={() => setActiveTab('serah-terima')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'serah-terima'
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Serah Terima Material
                </button>
              </>
            )}
          </nav>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60">
              <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center font-bold text-xs border border-red-500/30">
                {user.nama_lengkap.charAt(0)}
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-slate-200 leading-tight">{user.nama_lengkap}</p>
                <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  {user.role}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowLogoutConfirm(true)}
              title="Keluar (Logout)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-red-600/20 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-500/40 text-xs font-semibold transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          logout();
          showInfo('Sesi Berakhir', 'Anda telah berhasil keluar dari sistem.');
        }}
        title="Konfirmasi Keluar Akun"
        message={`Apakah Anda yakin ingin keluar dari sesi operasional ${user.nama_lengkap} (${user.role.toUpperCase()})? Anda harus masuk kembali untuk mengakses dashboard.`}
        confirmText="Keluar dari Sistem"
        cancelText="Batal"
        type="danger"
      />
    </header>
  );
};

export default Navbar;
