import { useState, useEffect } from 'react'
import { DownloadCloud, Printer, Eye, Save, ToggleLeft, ToggleRight, Users, UserPlus, Trash2, Edit2, Lock } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const DEFAULT_CONFIG = {
    shopName: 'Hypertech Digital',
    shopAddress: '',
    shopPhone: '',
    shopEmail: '',
    showLogo: false,
    showCustomerPhone: true,
    showCustomerEmail: false,
    showSerialNo: true,
    showTechnician: true,
    showServiceMode: true,
    showDeviceIntaken: true,
    invoiceTerms: 'Thank you for choosing Hypertech Digital.\nAll repairs come with a standard 30-day warranty unless otherwise stated.',
    intakeTerms: 'By leaving your device, you agree to our standard terms of service.\nNot responsible for data loss.',
    activeTab: 'intake'
};

function Toggle({ label, description, checked, onChange }) {
    return (
        <div
            onClick={onChange}
            style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.75rem 1rem', marginBottom: '0.5rem',
                background: checked ? 'rgba(187,134,252,0.08)' : '#f6f3eb',
                border: `1px solid ${checked ? 'rgba(187,134,252,0.4)' : 'var(--border-color)'}`,
                borderRadius: '8px', cursor: 'pointer',
                transition: 'all 0.2s ease'
            }}
        >
            <div>
                <div style={{ fontWeight: '600', fontSize: '0.9rem', color: checked ? '#e0e0e0' : 'var(--text-secondary)' }}>{label}</div>
                {description && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{description}</div>}
            </div>
            {checked
                ? <ToggleRight size={28} color="var(--accent)" />
                : <ToggleLeft size={28} color="#555" />
            }
        </div>
    );
}

function IntakePreview({ config }) {
    const today = new Date().toLocaleString();
    return (
        <div style={{
            background: '#fff', color: '#000',
            padding: '20px', borderRadius: '0',
            fontFamily: "'Courier New', monospace", fontSize: '12px',
            width: '280px', margin: '0 auto',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
        }}>
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '12px', marginBottom: '12px' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{config.shopName || 'Your Shop Name'}</div>
                {config.shopAddress && <div style={{ fontSize: '10px', marginTop: '4px', whiteSpace: 'pre-line' }}>{config.shopAddress}</div>}
                {config.shopPhone && <div style={{ fontSize: '10px' }}>Tel: {config.shopPhone}</div>}
                {config.shopEmail && <div style={{ fontSize: '10px' }}>{config.shopEmail}</div>}
                <div style={{ marginTop: '8px', fontWeight: 'bold' }}>SERVICE REQUEST SLIP</div>
            </div>

            <div style={{ marginBottom: '10px' }}>
                <div><b>Date:</b> {today}</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '4px' }}>CSR #: 789012</div>
            </div>

            <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '8px 0', margin: '8px 0' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Customer</div>
                <div>John Smith</div>
                {config.showCustomerPhone && <div>Tel: 055-1234567</div>}
                {config.showCustomerEmail && <div>john@example.com</div>}
            </div>

            <div style={{ margin: '8px 0' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Device</div>
                <div>MacBook Pro 2021</div>
                {config.showSerialNo && <div>S/N: C02XY1234</div>}
                {config.showServiceMode && <div>Mode: On Center</div>}
                {config.showDeviceIntaken && <div>Intaken: Yes</div>}
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '10px 0', paddingTop: '8px', fontSize: '10px', textAlign: 'center', whiteSpace: 'pre-line' }}>
                {config.intakeTerms || 'Your footer terms here.'}
            </div>
        </div>
    );
}

function InvoicePreview({ config }) {
    const today = new Date().toLocaleDateString();
    return (
        <div style={{
            background: '#fff', color: '#000',
            padding: '24px', borderRadius: '0',
            fontFamily: 'Arial, sans-serif', fontSize: '13px',
            width: '320px', margin: '0 auto',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
        }}>
            <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '14px', marginBottom: '14px' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{config.shopName || 'Your Shop Name'}</div>
                {config.shopAddress && <div style={{ fontSize: '11px', marginTop: '4px', whiteSpace: 'pre-line' }}>{config.shopAddress}</div>}
                {config.shopPhone && <div style={{ fontSize: '11px' }}>Tel: {config.shopPhone}</div>}
                <div style={{ marginTop: '10px', fontSize: '15px', fontWeight: 'bold', letterSpacing: '1px' }}>TAX INVOICE</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '12px' }}>
                <div>
                    <div><b>Receipt #:</b> INV-5821</div>
                    <div><b>Date:</b> {today}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div><b>CSR #:</b> 789012</div>
                    {config.showTechnician && <div><b>Tech:</b> Admin</div>}
                </div>
            </div>

            <div style={{ background: '#f5f5f5', padding: '8px 10px', borderRadius: '4px', marginBottom: '12px', fontSize: '12px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Customer</div>
                <div>John Smith</div>
                {config.showCustomerPhone && <div>055-1234567</div>}
                <div style={{ marginTop: '4px' }}><b>Device:</b> MacBook Pro 2021</div>
                {config.showSerialNo && <div><b>S/N:</b> C02XY1234</div>}
            </div>

            <div style={{ marginBottom: '12px', fontSize: '12px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Work Performed</div>
                <div style={{ background: '#f9f9f9', padding: '6px', border: '1px solid #ddd' }}>
                    Screen replacement and full system diagnostic.
                </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '12px' }}>
                <thead>
                    <tr style={{ background: 'var(--border-color)', color: 'var(--text-primary)' }}>
                        <th style={{ padding: '5px 8px', textAlign: 'left' }}>Description</th>
                        <th style={{ padding: '5px 8px', textAlign: 'right' }}>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style={{ borderBottom: '1px solid #ddd' }}>
                        <td style={{ padding: '5px 8px' }}>Service & Labor</td>
                        <td style={{ padding: '5px 8px', textAlign: 'right' }}>$80.00</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #ddd' }}>
                        <td style={{ padding: '5px 8px' }}>Spare Parts</td>
                        <td style={{ padding: '5px 8px', textAlign: 'right' }}>$120.00</td>
                    </tr>
                    <tr style={{ fontWeight: 'bold', background: '#f0f0f0' }}>
                        <td style={{ padding: '8px' }}>TOTAL</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>$200.00</td>
                    </tr>
                </tbody>
            </table>

            <div style={{ textAlign: 'center', fontSize: '10px', color: '#555', borderTop: '1px dashed var(--text-secondary)', paddingTop: '8px', whiteSpace: 'pre-line' }}>
                {config.invoiceTerms || 'Your footer terms here.'}
            </div>
        </div>
    );
}

export default function Settings() {
    const { user, isAdmin } = useAuth();
    const [loadingConfig, setLoadingConfig] = useState(false)
    const [message, setMessage] = useState({ text: '', type: '' })
    const [printConfig, setPrintConfig] = useState(DEFAULT_CONFIG);
    const [activeTab, setActiveTab] = useState('intake');

    // User management states
    const [users, setUsers] = useState([]);
    const [newUser, setNewUser] = useState({ username: '', password: '', role: 'STAFF' });
    const [userMessage, setUserMessage] = useState({ text: '', type: '' });

    // Password change states
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
    const [passwordMessage, setPasswordMessage] = useState({ text: '', type: '' })

    // User editing states
    const [editingUser, setEditingUser] = useState(null)
    const [editUserPassword, setEditUserPassword] = useState('')
    const [editUserRole, setEditUserRole] = useState('STAFF')
    const [editUserActive, setEditUserActive] = useState(true)

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordMessage({ text: '', type: '' });
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordMessage({ text: 'New passwords do not match', type: 'error' });
            return;
        }
        try {
            await api.changePassword(user.id, passwordData.currentPassword, passwordData.newPassword);
            setPasswordMessage({ text: '✓ Password updated successfully!', type: 'success' });
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setTimeout(() => setPasswordMessage({ text: '', type: '' }), 3000);
        } catch (err) {
            setPasswordMessage({ text: err.message || 'Failed to update password', type: 'error' });
        }
    }

    const handleStartEditUser = (u) => {
        setEditingUser(u);
        setEditUserPassword('');
        setEditUserRole(u.role);
        setEditUserActive(u.is_active !== false);
    }

    const handleCancelEditUser = () => {
        setEditingUser(null);
    }

    const handleSaveEditUser = async (e) => {
        e.preventDefault();
        setUserMessage({ text: '', type: '' });
        try {
            await api.updateUser(editingUser.id, {
                password: editUserPassword || undefined,
                role: editUserRole,
                is_active: editUserActive
            });
            setUserMessage({ text: '✓ User account updated successfully!', type: 'success' });
            setEditingUser(null);
            loadUsers();
            setTimeout(() => setUserMessage({ text: '', type: '' }), 3000);
        } catch (err) {
            setUserMessage({ text: err.message || 'Failed to update user', type: 'error' });
        }
    }

    const loadUsers = async () => {
        try {
            const data = await api.getUsers();
            setUsers(data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const settings = await api.getSettings();
                if (settings.print_settings) {
                    setPrintConfig({ ...DEFAULT_CONFIG, ...JSON.parse(settings.print_settings) });
                }
            } catch (err) {
                console.error(err);
            }
        };
        loadSettings();
        loadUsers();
    }, []);

    const set = (key, val) => setPrintConfig(prev => ({ ...prev, [key]: val }));

    const handleCreateUser = async (e) => {
        e.preventDefault();
        if (!newUser.username.trim() || !newUser.password.trim()) return;
        try {
            await api.createUser(newUser);
            setUserMessage({ text: '✓ User created successfully!', type: 'success' });
            setNewUser({ username: '', password: '', role: 'STAFF' });
            loadUsers();
            setTimeout(() => setUserMessage({ text: '', type: '' }), 3000);
        } catch (err) {
            setUserMessage({ text: err.message, type: 'error' });
        }
    };

    const handleDeleteUser = async (id) => {
        if (window.confirm("Are you sure you want to delete this user?")) {
            try {
                await api.deleteUser(id);
                loadUsers();
            } catch (err) {
                alert(err.message);
            }
        }
    };

    const handleSave = async () => {
        setLoadingConfig(true);
        try {
            await api.updateSetting('print_settings', JSON.stringify(printConfig));
            setMessage({ text: '✓ Configuration saved successfully!', type: 'success' });
            setTimeout(() => setMessage({ text: '', type: '' }), 3000);
        } catch (err) {
            setMessage({ text: 'Failed to save: ' + err.message, type: 'error' });
        }
        setLoadingConfig(false);
    }

    const handleBackup = async () => {
        setLoadingConfig(true)
        try {
            const a = document.createElement('a')
            a.href = '/api/download-db'
            a.download = `hypertech_backup_${new Date().toISOString().split('T')[0]}.json`
            a.click()
            setMessage({ text: '✓ Backup downloaded!', type: 'success' });
            setTimeout(() => setMessage({ text: '', type: '' }), 3000);
        } catch (error) {
            setMessage({ text: `Backup failed: ${error.message}`, type: 'error' })
        } finally {
            setLoadingConfig(false)
        }
    }

    const sectionStyle = { marginBottom: '1.5rem' };
    const sectionTitleStyle = {
        fontSize: '0.7rem', fontWeight: '700', letterSpacing: '1.5px',
        textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.75rem'
    };
    const inputStyle = {
        width: '100%', padding: '0.6rem 0.75rem', marginBottom: '0.75rem',
        background: '#f6f3eb', border: '1px solid var(--border-color)', color: 'var(--text-primary)',
        borderRadius: '6px', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '0.9rem'
    };

    return (
        <div className="container" style={{ maxWidth: '1400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 style={{ margin: 0 }}>Settings</h1>
                {isAdmin && (
                    <button onClick={handleBackup} disabled={loadingConfig} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--panel-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                        <DownloadCloud size={16} color="var(--accent)" /> Backup Database
                    </button>
                )}
            </div>

            {message.text && (
                <div style={{
                    padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.5rem',
                    background: message.type === 'success' ? 'rgba(3,218,198,0.1)' : 'rgba(207,102,121,0.1)',
                    color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
                    border: `1px solid ${message.type === 'success' ? 'rgba(3,218,198,0.3)' : 'rgba(207,102,121,0.3)'}`
                }}>
                    {message.text}
                </div>
            )}

            {/* ── PRINT LAYOUT CARD ── */}
            {isAdmin && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    {/* Card header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: '#f6f3eb' }}>
                        <Printer size={22} color="var(--accent)" />
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Print Layout Designer</h2>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Changes update the live preview instantly</p>
                        </div>
                    </div>

                    <div className="settings-designer">

                        {/* ── LEFT PANEL: Controls ── */}
                        <div className="settings-left-panel">

                            {/* Shop Identity */}
                            <div style={sectionStyle}>
                                <div style={sectionTitleStyle}>Shop Identity</div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Shop Name</label>
                                <input style={inputStyle} value={printConfig.shopName} onChange={e => set('shopName', e.target.value)} placeholder="Hypertech Digital" />
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Address</label>
                                <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} value={printConfig.shopAddress} onChange={e => set('shopAddress', e.target.value)} placeholder={"224 Park Dr.\nGotham City"} />
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Phone</label>
                                <input style={inputStyle} value={printConfig.shopPhone} onChange={e => set('shopPhone', e.target.value)} placeholder="055-000-0000" />
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Email</label>
                                <input style={inputStyle} value={printConfig.shopEmail} onChange={e => set('shopEmail', e.target.value)} placeholder="info@shop.com" />
                            </div>

                            {/* Visibility */}
                            <div style={sectionStyle}>
                                <div style={sectionTitleStyle}>Show / Hide Fields</div>
                                <Toggle label="Customer Phone" checked={printConfig.showCustomerPhone} onChange={() => set('showCustomerPhone', !printConfig.showCustomerPhone)} />
                                <Toggle label="Customer Email" checked={printConfig.showCustomerEmail} onChange={() => set('showCustomerEmail', !printConfig.showCustomerEmail)} />
                                <Toggle label="Device Serial Number" checked={printConfig.showSerialNo} onChange={() => set('showSerialNo', !printConfig.showSerialNo)} />
                                <Toggle label="Service Mode" description="On Center / On-Site" checked={printConfig.showServiceMode} onChange={() => set('showServiceMode', !printConfig.showServiceMode)} />
                                <Toggle label="Device Intaken status" checked={printConfig.showDeviceIntaken} onChange={() => set('showDeviceIntaken', !printConfig.showDeviceIntaken)} />
                                <Toggle label="Technician Name on Invoice" checked={printConfig.showTechnician} onChange={() => set('showTechnician', !printConfig.showTechnician)} />
                            </div>

                            {/* Footer Text */}
                            <div style={sectionStyle}>
                                <div style={sectionTitleStyle}>Footer / Terms Text</div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Intake Slip Footer</label>
                                <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} value={printConfig.intakeTerms} onChange={e => set('intakeTerms', e.target.value)} />
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Invoice Footer</label>
                                <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} value={printConfig.invoiceTerms} onChange={e => set('invoiceTerms', e.target.value)} />
                            </div>

                            <button onClick={handleSave} disabled={loadingConfig} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0.85rem', borderRadius: '8px', fontSize: '1rem', fontWeight: '700' }}>
                                <Save size={18} />
                                {loadingConfig ? 'Saving...' : 'Save Configuration'}
                            </button>
                        </div>

                        {/* ── RIGHT PANEL: Live Preview ── */}
                        <div className="settings-right-panel">
                            {/* Tab switcher */}
                            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
                                {['intake', 'invoice'].map(tab => (
                                    <button key={tab} onClick={() => setActiveTab(tab)} style={{
                                        flex: 1, padding: '0.85rem', background: 'transparent', border: 'none',
                                        borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                                        color: activeTab === tab ? 'var(--accent)' : 'var(--text-secondary)',
                                        fontWeight: activeTab === tab ? '700' : '400',
                                        cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                        transition: 'all 0.2s'
                                    }}>
                                        <Eye size={16} />
                                        {tab === 'intake' ? 'Intake Slip Preview' : 'Invoice Preview'}
                                    </button>
                                ))}
                            </div>

                            {/* Preview area */}
                            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem', overflowY: 'auto' }}>
                                <div>
                                    <div style={{ textAlign: 'center', marginBottom: '1rem', fontSize: '0.75rem', color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                        Live Preview · Not actual size
                                    </div>
                                    {activeTab === 'intake'
                                        ? <IntakePreview config={printConfig} />
                                        : <InvoicePreview config={printConfig} />
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* ── USER MANAGEMENT CARD ── */}
            {isAdmin && (
                <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: '#f6f3eb' }}>
                        <Users size={22} color="var(--accent)" />
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>User Management</h2>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Manage system access and assign roles</p>
                        </div>
                    </div>

                    {userMessage.text && (
                        <div style={{
                            margin: '1.5rem 1.5rem 0 1.5rem',
                            padding: '0.75rem 1rem', borderRadius: '6px',
                            background: userMessage.type === 'success' ? 'rgba(3,218,198,0.1)' : 'rgba(207,102,121,0.1)',
                            color: userMessage.type === 'success' ? 'var(--success)' : 'var(--danger)',
                            border: `1px solid ${userMessage.type === 'success' ? 'rgba(3,218,198,0.3)' : 'rgba(207,102,121,0.3)'}`
                        }}>
                            {userMessage.text}
                        </div>
                    )}

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', padding: '1.5rem' }}>
                        {/* User List Panel */}
                        <div style={{ flex: '1 1 45%', minWidth: '300px' }}>
                            <h3 style={{ fontSize: '0.85rem', color: '#35a7e6', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>Active Accounts</h3>
                            <div className="table-responsive">
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                                            <th style={{ padding: '0.5rem' }}>Username</th>
                                            <th style={{ padding: '0.5rem' }}>Access Role</th>
                                            <th style={{ padding: '0.5rem' }}>Status</th>
                                            <th style={{ padding: '0.5rem', textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map(u => (
                                            <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <td style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold' }}>{u.username}</td>
                                                <td style={{ padding: '0.75rem 0.5rem' }}>
                                                    <span style={{
                                                        fontSize: '0.75rem',
                                                        padding: '2px 8px',
                                                        borderRadius: '12px',
                                                        background: u.role === 'ADMIN' ? 'rgba(187,134,252,0.15)' : 'rgba(0, 0, 0, 0.03)',
                                                        color: u.role === 'ADMIN' ? 'var(--accent)' : 'var(--text-secondary)',
                                                        fontWeight: 'bold'
                                                    }}>{u.role}</span>
                                                </td>
                                                <td style={{ padding: '0.75rem 0.5rem' }}>
                                                    <span style={{
                                                        fontSize: '0.75rem',
                                                        padding: '2px 8px',
                                                        borderRadius: '12px',
                                                        background: u.is_active !== false ? 'rgba(3,218,198,0.15)' : 'rgba(207,102,121,0.15)',
                                                        color: u.is_active !== false ? 'var(--success)' : 'var(--danger)',
                                                        fontWeight: 'bold'
                                                    }}>{u.is_active !== false ? 'Active' : 'Inactive'}</span>
                                                </td>
                                                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                                                    <button
                                                        onClick={() => handleStartEditUser(u)}
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: 'var(--text-secondary)',
                                                            cursor: 'pointer',
                                                            padding: '4px',
                                                            marginRight: '8px'
                                                        }}
                                                        title="Edit User"
                                                    >
                                                        <Edit2 size={16} color="var(--accent)" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(u.id)}
                                                        disabled={u.username === 'admin'}
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: 'var(--danger)',
                                                            cursor: u.username === 'admin' ? 'not-allowed' : 'pointer',
                                                            padding: '4px'
                                                        }}
                                                        title="Delete User"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Edit or Create User Form Panel */}
                        <div style={{ flex: '1 1 45%', minWidth: '300px', background: '#f6f3eb', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            {editingUser ? (
                                <>
                                    <h3 style={{ fontSize: '0.85rem', color: '#35a7e6', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', marginTop: 0 }}>Edit User: {editingUser.username}</h3>
                                    <form onSubmit={handleSaveEditUser}>
                                        <div style={{ marginBottom: '1rem' }}>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Password (leave blank to keep current)</label>
                                            <input
                                                type="password"
                                                value={editUserPassword}
                                                onChange={e => setEditUserPassword(e.target.value)}
                                                placeholder="Enter new password (optional)..."
                                                style={{
                                                    width: '100%', padding: '0.6rem 0.75rem',
                                                    background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)',
                                                    borderRadius: '6px', boxSizing: 'border-box'
                                                }}
                                            />
                                        </div>
                                        <div style={{ marginBottom: '1rem' }}>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Access Role</label>
                                            <select
                                                value={editUserRole}
                                                disabled={editingUser.username === 'admin'}
                                                onChange={e => setEditUserRole(e.target.value)}
                                                style={{
                                                    width: '100%', padding: '0.6rem 0.75rem',
                                                    background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)',
                                                    borderRadius: '6px', boxSizing: 'border-box', cursor: editingUser.username === 'admin' ? 'not-allowed' : 'pointer'
                                                }}
                                            >
                                                <option value="STAFF">STAFF (Read & Service Actions)</option>
                                                <option value="ADMIN">ADMIN (Full Control & Settings)</option>
                                            </select>
                                        </div>
                                        <div style={{ marginBottom: '1.5rem' }}>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Status</label>
                                            <select
                                                value={editUserActive ? "true" : "false"}
                                                disabled={editingUser.username === 'admin'}
                                                onChange={e => setEditUserActive(e.target.value === "true")}
                                                style={{
                                                    width: '100%', padding: '0.6rem 0.75rem',
                                                    background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)',
                                                    borderRadius: '6px', boxSizing: 'border-box', cursor: editingUser.username === 'admin' ? 'not-allowed' : 'pointer'
                                                }}
                                            >
                                                <option value="true">Active</option>
                                                <option value="false">Inactive</option>
                                            </select>
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button type="submit" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0.75rem' }}>
                                                <Save size={18} />
                                                Save Changes
                                            </button>
                                            <button type="button" onClick={handleCancelEditUser} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0.75rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                </>
                            ) : (
                                <>
                                    <h3 style={{ fontSize: '0.85rem', color: '#35a7e6', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', marginTop: 0 }}>Create User Account</h3>
                                    <form onSubmit={handleCreateUser}>
                                        <div style={{ marginBottom: '1rem' }}>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Username</label>
                                            <input
                                                type="text"
                                                required
                                                value={newUser.username}
                                                onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                                                placeholder="Enter username..."
                                                style={{
                                                    width: '100%', padding: '0.6rem 0.75rem',
                                                    background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)',
                                                    borderRadius: '6px', boxSizing: 'border-box'
                                                }}
                                            />
                                        </div>
                                        <div style={{ marginBottom: '1rem' }}>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Password</label>
                                            <input
                                                type="password"
                                                required
                                                value={newUser.password}
                                                onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                                placeholder="Enter password..."
                                                style={{
                                                    width: '100%', padding: '0.6rem 0.75rem',
                                                    background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)',
                                                    borderRadius: '6px', boxSizing: 'border-box'
                                                }}
                                            />
                                        </div>
                                        <div style={{ marginBottom: '1.5rem' }}>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Access Role</label>
                                            <select
                                                value={newUser.role}
                                                onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                                                style={{
                                                    width: '100%', padding: '0.6rem 0.75rem',
                                                    background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)',
                                                    borderRadius: '6px', boxSizing: 'border-box', cursor: 'pointer'
                                                }}
                                            >
                                                <option value="STAFF">STAFF (Read & Service Actions)</option>
                                                <option value="ADMIN">ADMIN (Full Control & Settings)</option>
                                            </select>
                                        </div>
                                        <button type="submit" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0.75rem' }}>
                                            <UserPlus size={18} />
                                            Create User
                                        </button>
                                    </form>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── CHANGE PASSWORD CARD ── */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: '#f6f3eb' }}>
                    <Lock size={22} color="var(--accent)" />
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Change Password</h2>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Update your account password for security</p>
                    </div>
                </div>

                {passwordMessage.text && (
                    <div style={{
                        margin: '1.5rem 1.5rem 0 1.5rem',
                        padding: '0.75rem 1rem', borderRadius: '6px',
                        background: passwordMessage.type === 'success' ? 'rgba(3,218,198,0.1)' : 'rgba(207,102,121,0.1)',
                        color: passwordMessage.type === 'success' ? 'var(--success)' : 'var(--danger)',
                        border: `1px solid ${passwordMessage.type === 'success' ? 'rgba(3,218,198,0.3)' : 'rgba(207,102,121,0.3)'}`
                    }}>
                        {passwordMessage.text}
                    </div>
                )}

                <div style={{ padding: '1.5rem', maxWidth: '500px' }}>
                    <form onSubmit={handleChangePassword}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Current Password</label>
                            <input
                                type="password"
                                required
                                value={passwordData.currentPassword}
                                onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                placeholder="Enter current password..."
                                style={{
                                    width: '100%', padding: '0.6rem 0.75rem',
                                    background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)',
                                    borderRadius: '6px', boxSizing: 'border-box'
                                }}
                            />
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>New Password</label>
                            <input
                                type="password"
                                required
                                value={passwordData.newPassword}
                                onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                placeholder="Enter new password..."
                                style={{
                                    width: '100%', padding: '0.6rem 0.75rem',
                                    background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)',
                                    borderRadius: '6px', boxSizing: 'border-box'
                                }}
                            />
                        </div>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Confirm New Password</label>
                            <input
                                type="password"
                                required
                                value={passwordData.confirmPassword}
                                onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                placeholder="Confirm new password..."
                                style={{
                                    width: '100%', padding: '0.6rem 0.75rem',
                                    background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)',
                                    borderRadius: '6px', boxSizing: 'border-box'
                                }}
                            />
                        </div>
                        <button type="submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0.75rem 1.5rem' }}>
                            <Save size={18} />
                            Change Password
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
