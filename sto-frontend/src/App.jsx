import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import DashboardPimpinan from './pages/DashboardPimpinan';
import DashboardTeknisi from './pages/DashboardTeknisi';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard-pimpinan" element={<DashboardPimpinan />} />
        <Route path="/dashboard-teknisi" element={<DashboardTeknisi />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;