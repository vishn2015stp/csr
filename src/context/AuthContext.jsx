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
                const storedSessionId = localStorage.getItem('sessionId');
                if (storedUserId) {
                    const u = await api.getUser(storedUserId, storedSessionId);
                    if (u) {
                        setUser(u);
                    } else {
                        setUser(null);
                        localStorage.removeItem('userId');
                        localStorage.removeItem('sessionId');
                    }
                }
            } catch (e) {
                console.error("Initialization error:", e);
                setUser(null);
                localStorage.removeItem('userId');
                localStorage.removeItem('sessionId');
            } finally {
                setLoading(false);
            }
        };
        initAuth();
    }, []);

    // Periodically poll to check if session was overridden on another device
    useEffect(() => {
        if (!user) return;
        const checkSession = async () => {
            try {
                const storedUserId = localStorage.getItem('userId');
                const storedSessionId = localStorage.getItem('sessionId');
                if (storedUserId) {
                    const u = await api.getUser(storedUserId, storedSessionId);
                    if (!u) {
                        alert("Session terminated: You have logged in from another device.");
                        setUser(null);
                        localStorage.removeItem('userId');
                        localStorage.removeItem('sessionId');
                    }
                }
            } catch (e) {
                console.error("Session check error:", e);
            }
        };
        const interval = setInterval(checkSession, 10000);
        return () => clearInterval(interval);
    }, [user]);

    const login = async (username, password, force = false) => {
        try {
            const data = await api.login(username, password, force);
            if (data.success) {
                setUser(data.user);
                localStorage.setItem('userId', data.user.id);
                localStorage.setItem('sessionId', data.sessionId);
                return { success: true };
            } else if (data.alreadyLoggedIn) {
                return { success: false, alreadyLoggedIn: true, message: data.message };
            }
        } catch (e) {
            console.error(e);
            return { success: false, error: e.message };
        }
        return { success: false, error: 'Invalid username or password' };
    };

    const logout = async () => {
        try {
            const storedUserId = localStorage.getItem('userId');
            if (storedUserId) {
                await api.logout(storedUserId).catch(() => {});
            }
        } catch (e) {
            console.error("Logout API error:", e);
        } finally {
            setUser(null);
            localStorage.removeItem('userId');
            localStorage.removeItem('sessionId');
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, isAdmin: user?.role === 'ADMIN' }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
