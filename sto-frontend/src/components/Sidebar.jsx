function Sidebar({ menuItems, activeMenu, onMenuClick, roleName }) {
  const user = JSON.parse(localStorage.getItem('user'));

  const handleLogout = () => {
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  return (
    <div className="w-64 min-h-screen bg-bg-dark-2 flex flex-col justify-between p-4">
      <div>
        <h2 className="text-telkom-red font-bold text-lg mb-1">{roleName}</h2>
        <p className="text-gray-400 text-sm mb-6">{user?.nama_lengkap}</p>

        <nav className="flex flex-col gap-1">
          {menuItems.map((item) => (
            <button
              key={item.key}
              onClick={() => onMenuClick(item.key)}
              className={`text-left px-3 py-2 rounded text-sm ${
                activeMenu === item.key
                  ? 'bg-telkom-red text-white'
                  : 'text-gray-300 hover:bg-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <button
        onClick={handleLogout}
        className="text-left px-3 py-2 rounded text-sm text-red-400 hover:bg-slate-800"
      >
        Keluar (Logout)
      </button>
    </div>
  );
}

export default Sidebar;