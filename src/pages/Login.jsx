import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e, force = false) => {
        if (e) e.preventDefault();
        setError('');
        const res = await login(username, password, force);
        if (res.success) {
            navigate('/');
        } else if (res.alreadyLoggedIn) {
            const confirmLogout = window.confirm(
                "You are currently logged in on another device. Do you want to terminate that session and log in here?"
            );
            if (confirmLogout) {
                handleSubmit(null, true);
            }
        } else {
            setError(res.error || 'Invalid username or password');
        }
    };

    return (
        <div className="login-container">
            <form onSubmit={handleSubmit} className="login-card">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
                    <img src="/logo.png" alt="Hypertech Digital Logo" style={{ height: '64px', width: '64px', borderRadius: '12px', marginBottom: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }} />
                    <h2 style={{ margin: 0, color: '#35a7e6' }}>Hyper-CSR</h2>
                </div>
                {error && <p style={{ color: '#ff6b6b', background: 'rgba(255,0,0,0.1)', padding: '0.5rem', borderRadius: '4px', textAlign: 'center' }}>{error}</p>}
                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Username</label>
                    <input type="text" value={username} onChange={e => setUsername(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', boxSizing: 'border-box' }} required />
                </div>
                <div style={{ marginBottom: '2rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Password</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', boxSizing: 'border-box' }} required />
                </div>
                <button 
                    type="submit" 
                    style={{ 
                        width: '100%', 
                        padding: '0.75rem', 
                        borderRadius: '6px', 
                        background: '#35a7e6', 
                        color: 'white', 
                        border: 'none', 
                        fontWeight: 'bold', 
                        fontSize: '1rem', 
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#1d8fcc'}
                    onMouseLeave={e => e.currentTarget.style.background = '#35a7e6'}
                >
                    Login
                </button>
            </form>
        </div>
    );
}
