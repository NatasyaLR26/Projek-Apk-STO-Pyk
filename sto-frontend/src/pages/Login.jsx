import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosInstance';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await api.post('/auth/login', { email, password });
      const user = res.data.user;

      localStorage.setItem('user', JSON.stringify(user));

      if (user.role === 'pimpinan') navigate('/dashboard-pimpinan');
      else if (user.role === 'teknisi') navigate('/dashboard-teknisi');
      else if (user.role === 'gudang') navigate('/dashboard-gudang');
    } catch (err) {
      setError(err.response?.data?.message || 'Login gagal');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-dark">
      <form
        onSubmit={handleLogin}
        className="bg-bg-dark-2 p-8 rounded-xl w-80 flex flex-col gap-4"
      >
        <h1 className="text-xl font-bold text-center mb-2">Masuk ke Sistem</h1>

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}

        <div>
          <label className="text-sm text-gray-400">Email Pegawai</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mt-1 p-2 rounded bg-slate-800 text-white outline-none"
            required
          />
        </div>

        <div>
          <label className="text-sm text-gray-400">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mt-1 p-2 rounded bg-slate-800 text-white outline-none"
            required
          />
        </div>

        <button
          type="submit"
          className="bg-telkom-red hover:opacity-90 text-white py-2 rounded font-semibold mt-2"
        >
          Masuk
        </button>
      </form>
    </div>
  );
}

export default Login;