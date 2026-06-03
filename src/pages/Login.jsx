import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const res = await login(username, password);
        if (res.success) {
            navigate('/');
        } else {
            setError(res.error || 'Invalid username or password');
        }
    };

    return (
        <div className="login-container">
            <form onSubmit={handleSubmit} className="login-card">
                <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: '#ff4d4d' }}>Hyper-CSR</h2>
                {error && <p style={{ color: '#ff6b6b', background: 'rgba(255,0,0,0.1)', padding: '0.5rem', borderRadius: '4px', textAlign: 'center' }}>{error}</p>}
                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc' }}>Username</label>
                    <input type="text" value={username} onChange={e => setUsername(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #444', background: '#222', color: 'white', boxSizing: 'border-box' }} required />
                </div>
                <div style={{ marginBottom: '2rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc' }}>Password</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #444', background: '#222', color: 'white', boxSizing: 'border-box' }} required />
                </div>
                <button type="submit" style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', background: '#e53e3e', color: 'white', border: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}>Login</button>
            </form>
        </div>
    );
}
