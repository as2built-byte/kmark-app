import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Timbratura from './pages/Timbratura';
import Dipendenti from './pages/Dipendenti';
import TimbratureAdmin from './pages/TimbratureAdmin';
import AdminPresenze from './pages/AdminPresenze';
import BustePaga from './pages/BustePaga';
import Spese from './pages/Spese';
import Presenze from './pages/Presenze';
import Bacheca from './pages/Bacheca';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { user, userRole } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (userRole !== 'admin') return <Navigate to="/timbratura" replace />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/timbratura" replace />} />
          <Route path="timbratura" element={<Timbratura />} />
          <Route path="dipendenti" element={<AdminRoute><Dipendenti /></AdminRoute>} />
          <Route path="timbrature-admin" element={<AdminRoute><TimbratureAdmin /></AdminRoute>} />
          <Route path="presenze-admin" element={<AdminRoute><AdminPresenze /></AdminRoute>} />
          <Route path="buste-paga" element={<BustePaga />} />
          <Route path="spese" element={<Spese />} />
          <Route path="presenze" element={<Presenze />} />
          <Route path="bacheca" element={<Bacheca />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
