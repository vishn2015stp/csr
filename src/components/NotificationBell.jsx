import { useState, useEffect, useRef } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function NotificationBell() {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUnread = async () => {
            try {
                const count = await api.getUnreadNotificationCount();
                setUnreadCount(count);
            } catch (e) { /* ignore */ }
        };
        fetchUnread();
        const interval = setInterval(fetchUnread, 15000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleToggle = async () => {
        if (!isOpen) {
            try {
                const data = await api.getNotifications();
                setNotifications(data);
                await api.markAllNotificationsRead();
                setUnreadCount(0);
            } catch (e) { /* ignore */ }
        }
        setIsOpen(!isOpen);
    };

    const handleNotificationClick = (complaintId) => {
        setIsOpen(false);
        navigate('/requests', { state: { openJobId: complaintId } });
    };

    const timeAgo = (dateStr) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    return (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button onClick={handleToggle} style={{
                background: isOpen ? 'rgba(53, 167, 230, 0.15)' : 'transparent',
                border: isOpen ? '1px solid rgba(53, 167, 230, 0.3)' : '1px solid transparent',
                borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', transition: 'all 0.2s', flexShrink: 0
            }}
                onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = 'rgba(53, 167, 230, 0.1)'; }}
                onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent'; }}>
                <Bell size={18} color="var(--text-primary)" />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute', top: '-2px', right: '-2px',
                        background: '#bf616a', color: '#fff', borderRadius: '50%', width: '18px', height: '18px',
                        fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute', right: 0, top: '100%', marginTop: '8px', width: '400px', maxHeight: '480px',
                    background: 'var(--panel-bg)', border: '1px solid var(--border-color)',
                    borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 9999,
                    overflow: 'hidden', display: 'flex', flexDirection: 'column'
                }}>
                    <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                        Notifications
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        {notifications.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#4c566a' }}>
                                <BellOff size={24} style={{ marginBottom: '8px', opacity: 0.5 }} />
                                <div style={{ fontSize: '0.9rem' }}>No notifications</div>
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    onClick={() => handleNotificationClick(n.complaint_id)}
                                    style={{
                                        padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)',
                                        cursor: 'pointer', transition: 'background 0.15s', color: 'var(--text-primary)',
                                        background: n.is_read ? 'transparent' : 'rgba(53, 167, 230, 0.05)'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#f6f3eb'}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.background = n.is_read ? 'transparent' : 'rgba(53, 167, 230, 0.05)';
                                    }}
                                >
                                    <div style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>{n.message}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#35a7e6', marginTop: '4px' }}>{timeAgo(n.created_at)}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
