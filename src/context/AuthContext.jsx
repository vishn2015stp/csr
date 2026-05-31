import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            try {
                const storedUserId = localStorage.getItem('userId');
                if (storedUserId) {
                    const u = await api.getUser(storedUserId);
                    setUser(u || null);
                }
            } catch (e) {
                console.error("Initialization error:", e);
            } finally {
                setLoading(false);
            }
        };
        initAuth();
    }, []);

    const login = async (username, password) => {
        try {
            const u = await api.login(username, password);
            if (u) {
                setUser(u);
                localStorage.setItem('userId', u.id);
                return { success: true };
            }
        } catch (e) {
            console.error(e);
            return { success: false, error: e.message };
        }
        return { success: false, error: 'Invalid username or password' };
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('userId');
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, isAdmin: user?.role === 'ADMIN' }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
