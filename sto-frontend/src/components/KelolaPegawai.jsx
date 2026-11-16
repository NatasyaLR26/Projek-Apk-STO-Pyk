import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import {
  Users,
  UserPlus,
  Shield,
  Wrench,
  Package,
  Phone,
  Mail,
  BadgeCheck,
  Lock,
  Trash2,
  X,
  Clock,
  Key,
  Check,
  CheckCircle2
} from 'lucide-react';

export default function KelolaPegawai() {
  const { isDark } = useTheme();
  const { users, addUser, approveUser, rejectUser, showToast } = useApp();

  const [showAddModal, setShowAddModal] = useState(false);
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [role, setRole] = useState('teknisi');
  const [submitting, setSubmitting] = useState(false);
  const [filterRole, setFilterRole] = useState('all');

  const pendingUsers = users.filter(u => u.status_verifikasi === 'Pending Approval');

  const handleSubmitUser = async (e) => {
    e.preventDefault();
    if (!nama.trim() || !email.trim() || !password.trim()) {
      showToast('Nama, email, dan kata sandi wajib diisi!', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await addUser({
        nama_lengkap: nama.trim(),
        email: email.toLowerCase().trim(),
        password,
        role
      });

      setShowAddModal(false);
      setNama('');
      setEmail('');
      setPassword('password123');
      showToast(`Akun pegawai ${nama} berhasil ditambahkan ke database!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal menambahkan pegawai', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter(u => {
    if (filterRole === 'all') return true;
    return u.role === filterRole;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className={`p-6 rounded-3xl border ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      } flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-burgundy-600/20 text-burgundy-500 border border-burgundy-500/30">
              <Users className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black">Kelola Akun & Hak Akses Pegawai</h1>
          </div>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Pimpinan dapat mendaftarkan akun baru, mengatur role (Teknisi / Gudang / Pimpinan), dan memantau status staf di STO Payakumbuh.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-burgundy-600 hover:bg-burgundy-700 text-white font-bold text-xs shadow-lg shadow-burgundy-600/30 transition cursor-pointer active:scale-95 whitespace-nowrap"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Akun Pegawai</span>
        </button>
      </div>

      {/* Persetujuan Registrasi Pegawai Baru (Pending Approval) */}
      {pendingUsers.length > 0 && (
        <div className="p-5 rounded-3xl bg-linear-to-r from-amber-500/15 via-purple-500/10 to-transparent border border-amber-500/30 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Clock className="w-5 h-5 animate-pulse" />
              </span>
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-amber-400 flex items-center gap-2">
                  <span>Persetujuan Registrasi Pegawai Baru (Pending Approval)</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-mono">
                    {pendingUsers.length} Permintaan
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Calon pegawai mendaftar tanpa kode otorisasi dan memerlukan verifikasi manual dari Pimpinan STO sebelum dapat login.
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/80 border border-slate-700 text-xs font-mono text-amber-300">
              <Key className="w-3.5 h-3.5" />
              <span>Token Aktif: STO-PYK-2026</span>
            </div>
          </div>

          <div className="space-y-2">
            {pendingUsers.map(pu => (
              <div
                key={pu.id}
                className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center border border-amber-500/30">
                    {pu.nama_lengkap?.charAt(0) || 'P'}
                  </div>
                  <div>
                    <div className="font-extrabold text-sm text-white flex items-center gap-2">
                      <span>{pu.nama_lengkap}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        {pu.role?.toUpperCase() || 'TEKNISI'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{pu.email}</span>
                      <span>&bull;</span>
                      <span className="font-mono text-[10px] text-slate-500">OTP Input: {pu.kode_otorisasi || '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => approveUser(pu.id)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    <span>Setujui Akun</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => rejectUser(pu.id)}
                    className="px-3 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 font-bold text-xs transition cursor-pointer flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Tolak</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Corporate OTP Banner */}
      <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <Key className="w-4 h-4 text-blue-400 shrink-0" />
          <div>
            <span className="font-bold text-blue-400">Kode Otorisasi Korporat Internal STO Payakumbuh:</span>
            <span className="ml-2 font-mono font-black text-amber-400 bg-black/40 px-2 py-0.5 rounded border border-amber-500/40">STO-PYK-2026</span>
          </div>
        </div>
        <p className="text-[11px] text-slate-400">
          Berikan kode ini kepada teknisi baru agar registrasi langsung aktif tanpa menunggu approval manual.
        </p>
      </div>

      {/* Role Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: 'all', label: `Semua Pegawai (${users.length})` },
          { key: 'teknisi', label: `Teknisi Lapangan (${users.filter(u => u.role === 'teknisi').length})` },
          { key: 'gudang', label: `Petugas Gudang (${users.filter(u => u.role === 'gudang').length})` },
          { key: 'pimpinan', label: `Pimpinan (${users.filter(u => u.role === 'pimpinan').length})` }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterRole(tab.key)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              filterRole === tab.key
                ? 'bg-burgundy-600 text-white shadow-md'
                : isDark ? 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white' : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Employee List Table */}
      <div className={`p-6 rounded-3xl border ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="overflow-x-auto">
          <table className={`w-full text-left text-xs ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
            <thead className={`${isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'} uppercase text-[10px] tracking-wider border-b`}>
              <tr>
                <th className="px-4 py-3">Nama Pegawai</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Peran / Role</th>
                <th className="px-4 py-3">ID Akun</th>
                <th className="px-4 py-3 text-center">Status Database</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
              {filteredUsers.map(u => (
                <tr key={u.id} className={`${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}`}>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-white shadow ${
                        u.role === 'pimpinan' ? 'bg-rose-700' : u.role === 'teknisi' ? 'bg-blue-600' : 'bg-emerald-600'
                      }`}>
                        {u.nama_lengkap?.charAt(0) || 'U'}
                      </div>
                      <div className="font-extrabold text-slate-900 dark:text-white">{u.nama_lengkap}</div>
                    </div>
                  </td>

                  <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {u.email}</span>
                  </td>

                  <td className="px-4 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      u.role === 'pimpinan' ? 'bg-burgundy-600/20 text-burgundy-500 border-burgundy-500/30' :
                      u.role === 'teknisi' ? 'bg-blue-600/20 text-blue-500 border-blue-500/30' :
                      'bg-emerald-600/20 text-emerald-500 border-emerald-500/30'
                    }`}>
                      {u.role}
                    </span>
                  </td>

                  <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-400">
                    #{u.id}
                  </td>

                  <td className="px-4 py-3.5">
                    {u.jabatan || (u.role === 'pimpinan' ? 'Manager STO' : u.role === 'teknisi' ? 'Teknisi Lapangan' : 'Staff Gudang')}
                  </td>

                  <td className="px-4 py-3.5 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${
                      u.status_verifikasi === 'Pending Approval'
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {u.status_verifikasi === 'Pending Approval' ? (
                        <>
                          <Clock className="w-3 h-3" />
                          <span>Pending Approval</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Aktif (Verified)</span>
                        </>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Pegawai Baru */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl border ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          } animate-in zoom-in-95 duration-200`}>
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-burgundy-500" />
                <h3 className="font-extrabold text-base">Tambah Akun Pegawai STO</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={e => setNama(e.target.value)}
                  placeholder="Contoh: Rahmat Hidayat"
                  className={`w-full p-2.5 rounded-xl border text-xs outline-none ${
                    isDark ? 'bg-slate-950 border-slate-700' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Email Resmi Pegawai</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="nama@telkomakses.co.id"
                  className={`w-full p-2.5 rounded-xl border text-xs outline-none ${
                    isDark ? 'bg-slate-950 border-slate-700' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Peran / Role Pengguna</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'teknisi', label: 'Teknisi', icon: Wrench },
                    { id: 'gudang', label: 'Gudang', icon: Package },
                    { id: 'pimpinan', label: 'Pimpinan', icon: Shield }
                  ].map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRole(r.id)}
                      className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition ${
                        role === r.id
                          ? 'bg-burgundy-600 text-white border-burgundy-500 shadow'
                          : isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-600'
                      }`}
                    >
                      <r.icon className="w-3.5 h-3.5" />
                      <span>{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Kata Sandi</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full p-2.5 rounded-xl border text-xs outline-none ${
                    isDark ? 'bg-slate-950 border-slate-700' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-burgundy-600 hover:bg-burgundy-700 text-white font-bold text-xs shadow-lg shadow-burgundy-600/30 cursor-pointer disabled:opacity-60"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

