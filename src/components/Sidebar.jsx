import { NavLink, useNavigate } from 'react-router-dom'
import { Database, LayoutDashboard, LogOut, X, History } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Sidebar({ isOpen, closeSidebar }) {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    }

    // Close sidebar when user clicks a nav link (overlay mode on all screens)
    const handleNavClick = () => {
        closeSidebar();
    };

    return (
        <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`} style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img src="/logo.png" alt="Logo" style={{ height: '32px', width: '32px', borderRadius: '6px', objectFit: 'cover' }} />
                    Hyper-CSR
                </div>
                <button className="mobile-close-btn" onClick={closeSidebar} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', padding: 0, cursor: 'pointer' }}>
                    <X size={24} />
                </button>
            </div>
            <nav className="nav-links" style={{ flexGrow: 1 }}>
                <NavLink to="/" end onClick={handleNavClick} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <LayoutDashboard size={20} />
                    Dashboard
                </NavLink>
                <NavLink to="/requests" onClick={handleNavClick} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <History size={20} />
                    All Requests
                </NavLink>
                <NavLink to="/settings" onClick={handleNavClick} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <Database size={20} />
                    Settings
                </NavLink>
            </nav>
            <div style={{ padding: '0.5rem 1rem', borderTop: '1px solid var(--border-color)' }}>
                <button onClick={handleLogout} className="nav-item" style={{ background: 'transparent', border: 'none', color: '#c53030', width: '100%', cursor: 'pointer', textAlign: 'left', fontWeight: 'bold' }}>
                    <LogOut size={20} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
                    <span style={{ verticalAlign: 'middle' }}>Logout</span>
                </button>
            </div>
        </aside>
    )
}
