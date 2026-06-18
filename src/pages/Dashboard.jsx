import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { HardDrive, Server, Activity, Users, AlertCircle, CheckCircle, Clock, FileText, Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import JobDetailModal from '../components/JobDetailModal';
import NotificationBell from '../components/NotificationBell';

function getStatusColor(status) {
    switch (status) {
        case 'Pending': return '#bf616a';
        case 'Ready for Delivery':
        case 'Ready': return '#8fbcbb';
        case 'In Progress': return '#35a7e6';
        case 'Intaken': return '#b48ead';
        case 'Delivered':
        case 'Completed':
        case 'Returned': return '#a3be8c';
        default: return '#ebcb8b';
    }
}

function DonutChart({ data, size = 130 }) {
    const total = data.reduce((s, d) => s + d.count, 0);
    if (total === 0) return null;
    const r = size * 0.4;
    const sw = size * 0.14;
    const circ = 2 * Math.PI * r;
    let cumulative = 0;

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <g transform={`rotate(-90 ${size/2} ${size/2})`}>
                {data.filter(d => d.count > 0).map((d, i) => {
                    const length = (d.count / total) * circ;
                    const dashArray = `${Math.max(length, 0.5)} ${circ - length}`;
                    const dashOffset = -cumulative;
                    cumulative += length;
                    return (
                        <circle key={i} cx={size/2} cy={size/2} r={r} fill="none" stroke={d.color} strokeWidth={sw} strokeDasharray={dashArray} strokeDashoffset={dashOffset} />
                    );
                })}
                <circle cx={size/2} cy={size/2} r={r * 0.65} fill="var(--panel-bg)" />
            </g>
            <text x={size/2} y={size/2 - 6} textAnchor="middle" dominantBaseline="central" fontSize={size * 0.24} fontWeight="bold" fill="var(--text-primary)">{total}</text>
            <text x={size/2} y={size/2 + 14} textAnchor="middle" dominantBaseline="central" fontSize={size * 0.09} fill="var(--text-secondary)">Total</text>
        </svg>
    );
}

export default function Dashboard() {
    const { isAdmin, loading, user } = useAuth();
    const [stats, setStats] = useState({
        totalProducts: 0,
        pendingWorks: [],
        pendingOnSite: [],
        productStatus: {}
    });
    const [recentRequests, setRecentRequests] = useState([]);
    const [viewingJob, setViewingJob] = useState(null);
    const [allComplaints, setAllComplaints] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [showDetailedTable, setShowDetailedTable] = useState(false);
    const [detailedTableMode, setDetailedTableMode] = useState('in-shop');
    const [recentViewMode, setRecentViewMode] = useState('updates');
    const [expandedWidget, setExpandedWidget] = useState(null);


    const refreshDashboard = async () => {
        const statsData = await api.getDashboardStats();
        // Since we don't have customers count quickly, we'll just show total complaints
        const statusLogs = statsData.status_logs || [];
        const latestUpdates = {};
        statusLogs.forEach(log => {
            const logTime = new Date(log.created_at).getTime();
            if (!latestUpdates[log.complaint_id] || logTime > latestUpdates[log.complaint_id]) {
                latestUpdates[log.complaint_id] = logTime;
            }
        });

        const complaints = (statsData.complaints || []).map(c => ({
            ...c,
            latest_update: latestUpdates[c.id] || new Date(c.created_at).getTime()
        })).sort((a, b) => {
            const aNum = parseInt(a.csr_number) || 0;
            const bNum = parseInt(b.csr_number) || 0;
            return bNum - aNum;
        });
        setAllComplaints(complaints);

        const pending = complaints.filter(c => c.status !== 'Delivered' && c.status !== 'Completed' && c.status !== 'Returned');
        const onSite = pending.filter(c => c.service_type === 'On-Site' || c.service_mode === 'Onsite');

        const statusCounts = {};
        complaints.forEach(c => {
            statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
        });

        setStats({
            totalProducts: statsData.total || 0,
            pendingWorks: pending.filter(c => c.service_type !== 'On-Site' && c.service_mode !== 'Onsite'),
            pendingOnSite: onSite,
            productStatus: statusCounts
        });

        // Most recent 8 complaints for the Recent Requests widget
        setRecentRequests(complaints.slice(0, 8));
    };

    useEffect(() => {
        refreshDashboard();
    }, [isAdmin]);

    if (loading) return null;

    const query = searchQuery.trim().toLowerCase();
    
    // Filter complaints based on query
    const filteredComplaints = query
        ? allComplaints.filter(c => 
            (c.customerName && c.customerName.toLowerCase().includes(query)) ||
            (c.customerPhone && c.customerPhone.toLowerCase().includes(query)) ||
            (c.csr_number && c.csr_number.toLowerCase().includes(query)) ||
            (c.item_name && c.item_name.toLowerCase().includes(query)) ||
            (c.id && c.id.toLowerCase().includes(query))
          )
        : allComplaints;

    // Derived stats lists
    const filteredPending = filteredComplaints.filter(c => c.status !== 'Delivered' && c.status !== 'Completed' && c.status !== 'Returned');
    const filteredPendingWorks = filteredPending.filter(c => c.service_type !== 'On-Site' && c.service_mode !== 'Onsite');
    const filteredPendingOnSite = filteredPending.filter(c => c.service_type === 'On-Site' || c.service_mode === 'Onsite');
    
    // Calculate onsite stats for the header badge
    const readyOnsiteCount = filteredPendingOnSite.filter(w => w.status === 'In Progress' || w.status === 'Ready' || w.status === 'Ready for Delivery').length;
    const totalOnsiteCount = filteredPendingOnSite.length;

    // Donut chart data
    const inShopStatusCounts = {};
    filteredPendingWorks.forEach(w => { inShopStatusCounts[w.status] = (inShopStatusCounts[w.status] || 0) + 1; });
    const inShopDonutData = Object.entries(inShopStatusCounts).map(([status, count]) => ({ label: status, count, color: getStatusColor(status) }));

    const onSiteStatusCounts = {};
    filteredPendingOnSite.forEach(w => { onSiteStatusCounts[w.status] = (onSiteStatusCounts[w.status] || 0) + 1; });
    const onSiteDonutData = Object.entries(onSiteStatusCounts).map(([status, count]) => ({ label: status, count, color: getStatusColor(status) }));

    // For recent requests, if searching, show all matching. Otherwise, show the top 8 (excluding delivered/completed).
    const activeComplaints = filteredComplaints.filter(c => c.status !== 'Delivered' && c.status !== 'Completed' && c.status !== 'Returned');
    const sortedByUpdates = [...activeComplaints].sort((a, b) => {
        return b.latest_update - a.latest_update;
    });
    const displayedRecentUpdates = query ? sortedByUpdates : sortedByUpdates.slice(0, 8);

    const sortedByCsr = [...activeComplaints].sort((a, b) => {
        const aNum = parseInt(a.csr_number) || 0;
        const bNum = parseInt(b.csr_number) || 0;
        return bNum - aNum;
    });
    const displayedRecentRequests = query ? sortedByCsr : sortedByCsr.slice(0, 8);

    const deliveredComplaints = filteredComplaints.filter(c => c.status === 'Delivered' || c.status === 'Completed' || c.status === 'Returned');
    const sortedByDelivered = [...deliveredComplaints].sort((a, b) => {
        return b.latest_update - a.latest_update;
    });
    const displayedRecentDelivered = query ? sortedByDelivered : sortedByDelivered.slice(0, 8);

    const WidgetHeader = ({ title, icon: Icon, children }) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <Icon size={18} style={{ marginRight: '8px', color: '#35a7e6' }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '500' }}>{title}</h3>
            </div>
            {children}
        </div>
    );

    const widgetStyle = {
        background: 'var(--panel-bg)',
        borderRadius: '6px',
        padding: '1.25rem',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
        border: '1px solid var(--border-color)'
    };

    if (showDetailedTable) {
        const isOnsite = detailedTableMode === 'onsite';
        const dataList = isOnsite ? filteredPendingOnSite : filteredPendingWorks;
        const readyCount = isOnsite
            ? dataList.filter(w => w.status === 'In Progress' || w.status === 'Ready' || w.status === 'Ready for Delivery').length
            : dataList.filter(w => w.status === 'Ready for Delivery' || w.status === 'Ready').length;
        const totalCount = dataList.length;
        return (
            <div className="dashboard-container">
            <div style={{ padding: '1.5rem 1rem 1rem 1rem' }}>
                    <div className="dashboard-detailed-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>
                                {isOnsite ? 'Detailed Pending On-Site Queue' : 'Detailed Pending In-Shop Queue'}
                            </h2>
                            <p style={{ margin: '4px 0 0 0', color: '#35a7e6', fontSize: '0.95rem' }}>
                                {isOnsite 
                                    ? `Currently showing ${readyCount} in progress out of ${totalCount} total pending field tasks`
                                    : `Currently showing ${readyCount} ready for delivery out of ${totalCount} total pending in-shop devices`}
                            </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                            <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
                                <div style={{
                                    background: 'var(--panel-bg)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '0.5rem 1rem',
                                    gap: '10px',
                                    width: '100%',
                                }}>
                                    <Search size={16} color="#35a7e6" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        placeholder="Filter queue..."
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            outline: 'none',
                                            color: 'var(--text-primary)',
                                            fontSize: '0.9rem',
                                            width: '100%',
                                            margin: 0,
                                            padding: 0
                                        }}
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#35a7e6',
                                                cursor: 'pointer',
                                                padding: '2px',
                                                display: 'flex',
                                                alignItems: 'center'
                                            }}
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowDetailedTable(false)}
                                style={{
                                    background: 'transparent',
                                    border: '1px solid #35a7e6',
                                    color: '#35a7e6',
                                    padding: '0.6rem 1.2rem',
                                    borderRadius: '24px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s',
                                    flexShrink: 0
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(53, 167, 230, 0.1)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'transparent';
                                }}
                            >
                                ← Back to Dashboard
                            </button>
                        </div>
                    </div>

                    <div style={{ ...widgetStyle, padding: '1.5rem' }}>
                        <div className="dashboard-detailed-table-wrapper" style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', fontSize: '0.95rem', borderCollapse: 'collapse', minWidth: '800px' }}>
                                <thead>
                                    <tr style={{ background: '#f6f3eb', textAlign: 'left' }}>
                                        <th style={{ padding: '0.75rem 1rem', borderRadius: '4px 0 0 4px', fontWeight: '600', color: '#35a7e6' }}>CSR #</th>
                                        <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Customer</th>
                                        <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Phone</th>
                                        <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Device / Item</th>
                                        <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Serial Number</th>
                                        <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Status</th>
                                        <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Received Date</th>
                                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right', borderRadius: '0 4px 4px 0', fontWeight: '600' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dataList.map(work => {
                                        let statusColor = 'var(--text-primary)';
                                        if (work.status === 'Pending') statusColor = '#bf616a';
                                        else if (work.status === 'Delivered' || work.status === 'Completed' || work.status === 'Returned') statusColor = '#a3be8c';
                                        else if (work.status === 'Ready for Delivery' || work.status === 'Ready') statusColor = '#8fbcbb';
                                        else if (work.status === 'In Progress') statusColor = '#35a7e6';
                                        else if (work.status === 'Intaken') statusColor = '#b48ead';
                                        else statusColor = '#ebcb8b';
                                        
                                        return (
                                            <tr 
                                                key={work.id}
                                                style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#f6f3eb'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <td style={{ padding: '1rem', fontWeight: 'bold', color: '#35a7e6' }}>#{work.csr_number || work.id.split('-')[0].toUpperCase()}</td>
                                                <td style={{ padding: '1rem', color: 'var(--text-primary)', fontWeight: '500' }}>{work.customerName || '—'}</td>
                                                <td style={{ padding: '1rem', color: 'var(--text-primary)' }}>{work.customerPhone || '—'}</td>
                                                <td style={{ padding: '1rem', color: 'var(--text-primary)' }}>{work.item_name || '—'}</td>
                                                <td style={{ padding: '1rem', fontFamily: 'monospace' }}>{work.serial_no || '—'}</td>
                                                <td style={{ padding: '1rem' }}>
                                                    <span style={{ 
                                                        background: 'rgba(0, 0, 0, 0.04)', 
                                                        padding: '4px 10px', 
                                                        borderRadius: '12px', 
                                                        color: statusColor, 
                                                        fontSize: '0.75rem', 
                                                        fontWeight: 'bold', 
                                                        textTransform: 'uppercase',
                                                        border: `1px solid ${statusColor}40`
                                                    }}>
                                                        {work.status}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#35a7e6' }}>
                                                    {new Date(work.created_at).toLocaleDateString('en-GB').replace(/\//g, '-')}
                                                </td>
                                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                    <button 
                                                        onClick={() => setViewingJob(work.id)}
                                                        style={{
                                                            background: '#35a7e6',
                                                            color: 'var(--panel-bg)',
                                                            border: 'none',
                                                            padding: '0.4rem 0.8rem',
                                                            borderRadius: '4px',
                                                            fontSize: '0.85rem',
                                                            fontWeight: 'bold',
                                                            cursor: 'pointer',
                                                            transition: 'background 0.2s',
                                                            margin: 0
                                                        }}
                                                        onMouseEnter={e => e.currentTarget.style.background = '#8fbcbb'}
                                                        onMouseLeave={e => e.currentTarget.style.background = '#35a7e6'}
                                                    >
                                                        Details
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {dataList.length === 0 && (
                                        <tr>
                                            <td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: '#4c566a' }}>
                                                {isOnsite ? 'No pending field tasks found.' : 'No pending in-shop works found.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                {viewingJob && (
                    <JobDetailModal
                        jobId={viewingJob}
                        onClose={() => setViewingJob(null)}
                        onRefresh={refreshDashboard}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div className="dashboard-search-container">
                    <div style={{ position: 'relative', width: '100%', maxWidth: '500px', zIndex: 1000 }}>
                        <div style={{
                            background: 'var(--panel-bg)',
                            border: isSearchFocused ? '1px solid #35a7e6' : '1px solid #f6f3eb',
                            borderRadius: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0.6rem 1.2rem',
                            gap: '10px',
                            width: '100%',
                            boxShadow: isSearchFocused ? '0 0 10px rgba(53, 167, 230, 0.3)' : '0 4px 6px rgba(0,0,0,0.15)',
                            transition: 'all 0.2s ease-in-out'
                        }}>
                            <Search size={18} color={isSearchFocused ? '#35a7e6' : '#4c566a'} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                onFocus={() => setIsSearchFocused(true)}
                                onBlur={() => setIsSearchFocused(false)}
                                placeholder="Search by customer name, phone, or CSR #..."
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.95rem',
                                    width: '100%'
                                }}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#35a7e6',
                                        cursor: 'pointer',
                                        padding: '2px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        {/* Dropdown search results list */}
                        {searchQuery && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                marginTop: '8px',
                                background: 'var(--panel-bg)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                                maxHeight: '300px',
                                overflowY: 'auto',
                                padding: '4px 0'
                            }}>
                                {filteredComplaints.length > 0 ? (
                                    filteredComplaints.map(item => {
                                        let statusColor = 'var(--text-primary)';
                                        if (item.status === 'Pending') statusColor = '#bf616a';
                                        else if (item.status === 'Delivered' || item.status === 'Completed' || item.status === 'Returned') statusColor = '#a3be8c';
                                        else if (item.status === 'Ready for Delivery' || item.status === 'Ready') statusColor = '#8fbcbb';
                                        else if (item.status === 'In Progress') statusColor = '#35a7e6';
                                        else if (item.status === 'Intaken') statusColor = '#b48ead';
                                        else statusColor = '#ebcb8b';

                                        return (
                                            <div
                                                key={item.id}
                                                onMouseDown={() => {
                                                    setViewingJob(item.id);
                                                    setSearchQuery('');
                                                }}
                                                style={{
                                                    padding: '0.75rem 1rem',
                                                    borderBottom: '1px solid var(--border-color)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    transition: 'background 0.15s'
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#f6f3eb'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <div>
                                                        <span style={{ color: '#35a7e6', fontWeight: 'bold', marginRight: '8px' }}>#{item.csr_number || item.id.split('-')[0].toUpperCase()}</span>
                                                        <strong style={{ color: 'var(--text-primary)' }}>{item.item_name}</strong>
                                                    </div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                                                        {item.customerName || '—'} · {item.customerPhone || '—'}
                                                    </div>
                                                </div>
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    padding: '3px 8px',
                                                    borderRadius: '12px',
                                                    background: 'rgba(0, 0, 0, 0.04)',
                                                    color: statusColor,
                                                    fontWeight: 'bold',
                                                    textTransform: 'uppercase',
                                                    border: `1px solid ${statusColor}40`
                                                }}>
                                                    {item.status}
                                                </span>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div style={{ padding: '1rem', textAlign: 'center', color: '#4c566a' }}>
                                        No matching service items found.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className="dashboard-top-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                    <NotificationBell />
                    <div className="dashboard-user-badge" style={{ background: '#f6f3eb', padding: '0.5rem 1rem', borderRadius: '4px', fontSize: '0.9rem', border: '1px solid var(--border-color)' }}>
                        User: <span style={{ color: '#35a7e6', fontWeight: 'bold' }}>{user?.username}</span> | Host: Hyper-CSR
                    </div>
                </div>
            </div>

            <div className="dashboard-section-padding" style={{ padding: '0 1rem' }}>

                <div className="dashboard-grid-widgets">



                    {/* Diagnostics / Pending Tasks Widget */}
                    <div style={widgetStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-primary)' }}>
                                <Activity size={18} style={{ marginRight: '8px', color: '#35a7e6' }} />
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '500' }}>Pending In-Shop Work</h3>
                            </div>
                            <button 
                                onClick={() => {
                                    setDetailedTableMode('in-shop');
                                    setShowDetailedTable(true);
                                }}
                                title="View detailed table"
                                style={{
                                    background: 'rgba(53, 167, 230, 0.1)',
                                    color: '#35a7e6',
                                    border: '1px solid rgba(53, 167, 230, 0.3)',
                                    borderRadius: '16px',
                                    padding: '3px 10px',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s',
                                    margin: 0
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(53, 167, 230, 0.2)';
                                    e.currentTarget.style.borderColor = '#35a7e6';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'rgba(53, 167, 230, 0.1)';
                                    e.currentTarget.style.borderColor = 'rgba(53, 167, 230, 0.3)';
                                }}
                            >
                                <span>{filteredPendingWorks.filter(w => w.status === 'Ready for Delivery' || w.status === 'Ready').length}/{filteredPendingWorks.length}</span>
                                <span style={{ fontSize: '0.7rem' }}>➔</span>
                            </button>
                        </div>
                        {filteredPendingWorks.length === 0 ? (
                            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#4c566a', border: '1px dashed #4c566a', borderRadius: '4px' }}>
                                All diagnostic queues are clear.
                            </div>
                        ) : (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', cursor: 'pointer', marginBottom: expandedWidget === 'in-shop' ? '1rem' : 0 }}
                                    onClick={() => setExpandedWidget(expandedWidget === 'in-shop' ? null : 'in-shop')}>
                                    <DonutChart data={inShopDonutData} size={120} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--text-primary)' }}>
                                            {filteredPendingWorks.length} Device{filteredPendingWorks.length !== 1 ? 's' : ''} Waiting
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: '8px' }}>
                                            {inShopDonutData.map(d => (
                                                <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                                                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: d.color, flexShrink: 0 }} />
                                                    {d.label}: <strong>{d.count}</strong>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>
                                        {expandedWidget === 'in-shop' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </div>
                                {expandedWidget === 'in-shop' && (
                                    <ul style={{ listStyle: 'none', padding: 0, margin: '0.5rem 0 0 0', fontSize: '0.9rem', maxHeight: '250px', overflowY: 'auto' }}>
                                        {filteredPendingWorks.map(work => (
                                            <li
                                                key={work.id}
                                                onClick={() => setViewingJob(work.id)}
                                                style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 1rem', background: '#f6f3eb', marginBottom: '0.4rem', borderRadius: '4px', borderLeft: `3px solid ${work.status === 'Ready for Delivery' ? '#8fbcbb' : '#ebcb8b'}`, cursor: 'pointer' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>{work.item_name}</strong>
                                                    <span style={{ fontSize: '0.8rem', color: '#35a7e6', marginTop: '2px' }}>S/N: {work.serial_no}</span>
                                                </div>
                                                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                                    <div style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '0.85rem' }}>{work.status}</div>
                                                    <div style={{ color: '#4c566a', fontSize: '0.75rem', marginTop: '2px' }}>CSR: {work.csr_number || work.id.split('-')[0]}</div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </>
                        )}
                    </div>

                    <div style={widgetStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-primary)' }}>
                                <AlertCircle size={18} style={{ marginRight: '8px', color: '#35a7e6' }} />
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '500' }}>Pending Field Tasks (On-Site)</h3>
                            </div>
                            <button 
                                onClick={() => {
                                    setDetailedTableMode('onsite');
                                    setShowDetailedTable(true);
                                }}
                                title="View detailed table"
                                style={{
                                    background: 'rgba(53, 167, 230, 0.1)',
                                    color: '#35a7e6',
                                    border: '1px solid rgba(53, 167, 230, 0.3)',
                                    borderRadius: '16px',
                                    padding: '3px 10px',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s',
                                    margin: 0
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(53, 167, 230, 0.2)';
                                    e.currentTarget.style.borderColor = '#35a7e6';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'rgba(53, 167, 230, 0.1)';
                                    e.currentTarget.style.borderColor = 'rgba(53, 167, 230, 0.3)';
                                }}
                            >
                                <span>{readyOnsiteCount}/{totalOnsiteCount}</span>
                                <span style={{ fontSize: '0.7rem' }}>➔</span>
                            </button>
                        </div>
                        {filteredPendingOnSite.length === 0 ? (
                            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#4c566a', border: '1px dashed #4c566a', borderRadius: '4px' }}>
                                No pending on-site requests.
                            </div>
                        ) : (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', cursor: 'pointer', marginBottom: expandedWidget === 'onsite' ? '1rem' : 0 }}
                                    onClick={() => setExpandedWidget(expandedWidget === 'onsite' ? null : 'onsite')}>
                                    <DonutChart data={onSiteDonutData} size={120} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--text-primary)' }}>
                                            {totalOnsiteCount} Field Task{totalOnsiteCount !== 1 ? 's' : ''} Pending
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: '8px' }}>
                                            {onSiteDonutData.map(d => (
                                                <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                                                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: d.color, flexShrink: 0 }} />
                                                    {d.label}: <strong>{d.count}</strong>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>
                                        {expandedWidget === 'onsite' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </div>
                                {expandedWidget === 'onsite' && (
                                    <ul style={{ listStyle: 'none', padding: 0, margin: '0.5rem 0 0 0', fontSize: '0.9rem', maxHeight: '250px', overflowY: 'auto' }}>
                                        {filteredPendingOnSite.map(work => {
                                            let borderLeftColor = 'var(--danger)';
                                            if (work.status === 'In Progress') borderLeftColor = '#35a7e6';
                                            return (
                                                <li
                                                    key={work.id}
                                                    onClick={() => setViewingJob(work.id)}
                                                    style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 1rem', background: '#f6f3eb', marginBottom: '0.4rem', borderRadius: '4px', borderLeft: `3px solid ${borderLeftColor}`, cursor: 'pointer' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>{work.item_name}</strong>
                                                        <span style={{ fontSize: '0.8rem', color: '#35a7e6', marginTop: '2px' }}>{work.customerName} - {work.customerPhone}</span>
                                                    </div>
                                                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                                        <div style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '0.85rem' }}>{work.status}</div>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Recent Activity Widget */}
                <div style={{ ...widgetStyle, marginTop: '1.5rem' }}>
                    <WidgetHeader title={recentViewMode === 'updates' ? "Recent Updates" : recentViewMode === 'delivered' ? "Recent Delivered" : "Recent Service Requests"} icon={FileText}>
                        <div className="dashboard-recent-tabs" style={{ display: 'flex', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                            <button
                                onClick={() => setRecentViewMode('updates')}
                                style={{
                                    padding: '0.4rem 0.8rem',
                                    border: 'none',
                                    background: recentViewMode === 'updates' ? '#35a7e6' : 'transparent',
                                    color: recentViewMode === 'updates' ? '#fff' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    fontSize: '0.85rem'
                                }}
                            >
                                Updates
                            </button>
                            <button
                                onClick={() => setRecentViewMode('requests')}
                                style={{
                                    padding: '0.4rem 0.8rem',
                                    border: 'none',
                                    background: recentViewMode === 'requests' ? '#35a7e6' : 'transparent',
                                    color: recentViewMode === 'requests' ? '#fff' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    fontSize: '0.85rem'
                                }}
                            >
                                Requests
                            </button>
                            <button
                                onClick={() => setRecentViewMode('delivered')}
                                style={{
                                    padding: '0.4rem 0.8rem',
                                    border: 'none',
                                    background: recentViewMode === 'delivered' ? '#35a7e6' : 'transparent',
                                    color: recentViewMode === 'delivered' ? '#fff' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    fontSize: '0.85rem'
                                }}
                            >
                                Delivered
                            </button>
                        </div>
                    </WidgetHeader>
                    <div className="dashboard-recent-table-wrapper" style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', fontSize: '0.9rem', borderCollapse: 'collapse', minWidth: '500px' }}>
                            <thead>
                                <tr style={{ background: '#f6f3eb', textAlign: 'left' }}>
                                    <th style={{ padding: '0.5rem 0.75rem', borderRadius: '4px 0 0 4px', fontWeight: '600', color: '#35a7e6' }}>CSR #</th>
                                    <th style={{ padding: '0.5rem 0.75rem', fontWeight: '600' }}>Customer</th>
                                    <th style={{ padding: '0.5rem 0.75rem', fontWeight: '600' }}>Item</th>
                                    <th style={{ padding: '0.5rem 0.75rem', fontWeight: '600' }}>Status</th>
                                    <th style={{ padding: '0.5rem 0.75rem', fontWeight: '600' }}>Logged By</th>
                                    <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right', borderRadius: '0 4px 4px 0', fontWeight: '600' }}>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(recentViewMode === 'updates' ? displayedRecentUpdates : recentViewMode === 'delivered' ? displayedRecentDelivered : displayedRecentRequests).map(req => {
                                    let statusColor = 'var(--text-primary)';
                                    if (req.status === 'Pending') statusColor = '#bf616a';
                                    else if (req.status === 'Delivered' || req.status === 'Completed' || req.status === 'Returned') statusColor = '#a3be8c';
                                    else if (req.status === 'Ready for Delivery' || req.status === 'Ready') statusColor = '#8fbcbb';
                                    else if (req.status === 'In Progress') statusColor = '#35a7e6';
                                    else if (req.status === 'Intaken') statusColor = '#b48ead';
                                    else statusColor = '#ebcb8b';
                                    return (
                                        <tr
                                            key={req.id}
                                            onClick={() => setViewingJob(req.id)}
                                            style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background 0.15s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#f6f3eb'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={{ padding: '0.75rem', fontWeight: 'bold', color: '#35a7e6' }}>#{req.csr_number || req.id.split('-')[0].toUpperCase()}</td>
                                            <td style={{ padding: '0.75rem', color: 'var(--text-primary)' }}>{req.customerName || '—'}</td>
                                            <td style={{ padding: '0.75rem' }}>{req.item_name}</td>
                                            <td style={{ padding: '0.75rem' }}>
                                                <span style={{ background: 'rgba(0, 0, 0, 0.04)', padding: '3px 10px', borderRadius: '12px', color: statusColor, fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', border: `1px solid ${statusColor}40` }}>
                                                    {req.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'capitalize' }}>
                                                {req.created_by || 'Admin'}
                                            </td>
                                            <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.8rem', color: '#35a7e6' }}>
                                                {new Date(recentViewMode === 'updates' ? (req.latest_update || req.created_at) : req.created_at).toLocaleString('en-GB').replace(/\//g, '-')}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {(recentViewMode === 'updates' ? displayedRecentUpdates : recentViewMode === 'delivered' ? displayedRecentDelivered : displayedRecentRequests).length === 0 && (
                                    <tr>
                                        <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#4c566a' }}>No records found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {viewingJob && (
                <JobDetailModal
                    jobId={viewingJob}
                    onClose={() => setViewingJob(null)}
                    onRefresh={refreshDashboard}
                />
            )}
        </div>
    );
}
