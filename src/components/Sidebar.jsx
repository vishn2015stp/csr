import { NavLink, useNavigate } from 'react-router-dom'
import { ClipboardList, Database, Wrench, LayoutDashboard, LogOut, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Sidebar({ isOpen, closeSidebar }) {
    const { isAdmin, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    }

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Wrench size={24} />
                    Hyper-CSR
                </div>
                <button className="mobile-close-btn" onClick={closeSidebar} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', padding: 0, cursor: 'pointer' }}>
                    <X size={24} />
                </button>
            </div>
            <nav className="nav-links" style={{ flexGrow: 1 }}>
                <NavLink to="/" end onClick={closeSidebar} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <LayoutDashboard size={20} />
                    Dashboard
                </NavLink>
                <NavLink to="/intake" onClick={closeSidebar} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <ClipboardList size={20} />
                    Service Request
                </NavLink>
                {isAdmin && (
                    <NavLink to="/settings" onClick={closeSidebar} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                        <Database size={20} />
                        Settings
                    </NavLink>
                )}
            </nav>
            <div style={{ padding: '0.5rem 1rem', borderTop: '1px solid #333' }}>
                <button onClick={handleLogout} className="nav-item" style={{ background: 'transparent', border: 'none', color: '#ecc94b', width: '100%', cursor: 'pointer', textAlign: 'left', fontWeight: 'bold' }}>
                    <LogOut size={20} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
                    <span style={{ verticalAlign: 'middle' }}>Logout</span>
                </button>
            </div>
        </aside>
    )
}
