import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import DashboardPimpinan from './pages/DashboardPimpinan';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard-pimpinan" element={<DashboardPimpinan />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;