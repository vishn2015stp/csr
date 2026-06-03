import { useState } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { Menu, Plus } from 'lucide-react'
import Sidebar from './components/Sidebar'
import Intake from './pages/Intake'
import Settings from './pages/Settings'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Requests from './pages/Requests'
import { useAuth } from './context/AuthContext'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  const { user, loading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const navigate = useNavigate();
  const location = useLocation();

  if (loading) return null;

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <>
      <header className={`app-header ${isSidebarOpen ? '' : 'full-width'}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={{ background: 'transparent', padding: '0.25rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', margin: 0 }}>
            <Menu size={24} color="var(--text-primary)" />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)', fontWeight: 'bold', fontSize: '1.25rem' }}>
            <img src="/logo.png" alt="Logo" style={{ height: '28px', width: '28px', borderRadius: '4px', objectFit: 'cover' }} /> Hyper-CSR
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: '#f6f3eb', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.85rem', border: '1px solid var(--border-color)', fontWeight: 'bold' }}>
            User: <span style={{ color: '#35a7e6' }}>{user?.username}</span>
          </div>
        </div>
      </header>

      <Sidebar isOpen={isSidebarOpen} closeSidebar={() => setIsSidebarOpen(false)} />
      
      <div className={`mobile-overlay ${isSidebarOpen ? 'show' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>

      <main className={`main-content ${isSidebarOpen ? '' : 'full-width'}`}>
        <Routes>
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/intake" element={<ProtectedRoute><Intake /></ProtectedRoute>} />
          <Route path="/requests" element={<ProtectedRoute><Requests /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {location.pathname !== '/intake' && (
        <button onClick={() => navigate('/intake')} className="floating-add-btn" title="Add New Service Request">
          <Plus size={20} />
          <span>Add New</span>
        </button>
      )}
    </>
  )
}

export default App
