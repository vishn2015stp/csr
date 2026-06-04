import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { HardDrive, Server, Activity, Users, AlertCircle, CheckCircle, Clock, FileText, Search, X } from 'lucide-react';
import JobDetailModal from '../components/JobDetailModal';

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


    const refreshDashboard = async () => {
        const statsData = await api.getDashboardStats();
        // Since we don't have customers count quickly, we'll just show total complaints
        const complaints = statsData.complaints || [];
        setAllComplaints(complaints);

        const pending = complaints.filter(c => c.status !== 'Delivered' && c.status !== 'Completed');
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
        const sorted = [...complaints].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setRecentRequests(sorted.slice(0, 8));
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
    const filteredPending = filteredComplaints.filter(c => c.status !== 'Delivered' && c.status !== 'Completed');
    const filteredPendingWorks = filteredPending.filter(c => c.service_type !== 'On-Site' && c.service_mode !== 'Onsite');
    const filteredPendingOnSite = filteredPending.filter(c => c.service_type === 'On-Site' || c.service_mode === 'Onsite');
    
    // Calculate onsite stats for the header badge
    const readyOnsiteCount = filteredPendingOnSite.filter(w => w.status === 'In Progress' || w.status === 'Ready' || w.status === 'Ready for Delivery').length;
    const totalOnsiteCount = filteredPendingOnSite.length;
    
    // For recent requests, if searching, show all matching. Otherwise, show the top 8 (excluding delivered/completed).
    const activeComplaints = filteredComplaints.filter(c => c.status !== 'Delivered' && c.status !== 'Completed');
    const sortedFiltered = [...activeComplaints].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const displayedRecentRequests = query ? sortedFiltered : sortedFiltered.slice(0, 8);

    const WidgetHeader = ({ title, icon: Icon }) => (
        <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
            <Icon size={18} style={{ marginRight: '8px', color: '#35a7e6' }} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '500' }}>{title}</h3>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
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
                        <div style={{ overflowX: 'auto' }}>
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
                                        else if (work.status === 'Delivered' || work.status === 'Completed') statusColor = '#a3be8c';
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
                                                    {new Date(work.created_at).toLocaleDateString()}
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
                                        else if (item.status === 'Delivered' || item.status === 'Completed') statusColor = '#a3be8c';
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
                <div style={{ background: '#f6f3eb', padding: '0.5rem 1rem', borderRadius: '4px', fontSize: '0.9rem', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                    User: <span style={{ color: '#35a7e6', fontWeight: 'bold' }}>{user?.username}</span> | Host: Hyper-CSR
                </div>
            </div>

            <div style={{ padding: '0 1rem' }}>

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
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.9rem', maxHeight: '300px', overflowY: 'auto' }}>
                            {filteredPendingWorks.map(work => (
                                <li
                                    key={work.id}
                                    onClick={() => setViewingJob(work.id)}
                                    style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: '#f6f3eb', marginBottom: '0.5rem', borderRadius: '4px', borderLeft: `3px solid ${work.status === 'Ready for Delivery' ? '#8fbcbb' : '#ebcb8b'}`, cursor: 'pointer' }}>
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
                            {filteredPendingWorks.length === 0 && (
                                <li style={{ padding: '2rem 1rem', textAlign: 'center', color: '#4c566a', border: '1px dashed #4c566a', borderRadius: '4px' }}>
                                    All diagnostic queues are clear.
                                </li>
                            )}
                        </ul>
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
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.9rem', maxHeight: '300px', overflowY: 'auto' }}>
                            {filteredPendingOnSite.map(work => {
                                let borderLeftColor = 'var(--danger)'; // Pending
                                if (work.status === 'In Progress') borderLeftColor = '#35a7e6'; // Blue
                                
                                return (
                                    <li
                                        key={work.id}
                                        onClick={() => setViewingJob(work.id)}
                                        style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: '#f6f3eb', marginBottom: '0.5rem', borderRadius: '4px', borderLeft: `3px solid ${borderLeftColor}`, cursor: 'pointer' }}>
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
                            {filteredPendingOnSite.length === 0 && (
                                <li style={{ padding: '2rem 1rem', textAlign: 'center', color: '#4c566a', border: '1px dashed #4c566a', borderRadius: '4px' }}>
                                    No pending on-site requests.
                                </li>
                            )}
                        </ul>
                    </div>
                </div>

                {/* Recent Service Requests Widget */}
                <div style={{ ...widgetStyle, marginTop: '1.5rem' }}>
                    <WidgetHeader title="Recent Service Requests" icon={FileText} />
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', fontSize: '0.9rem', borderCollapse: 'collapse', minWidth: '500px' }}>
                            <thead>
                                <tr style={{ background: '#f6f3eb', textAlign: 'left' }}>
                                    <th style={{ padding: '0.5rem 0.75rem', borderRadius: '4px 0 0 4px', fontWeight: '600', color: '#35a7e6' }}>CSR #</th>
                                    <th style={{ padding: '0.5rem 0.75rem', fontWeight: '600' }}>Customer</th>
                                    <th style={{ padding: '0.5rem 0.75rem', fontWeight: '600' }}>Item</th>
                                    <th style={{ padding: '0.5rem 0.75rem', fontWeight: '600' }}>Status</th>
                                    <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right', borderRadius: '0 4px 4px 0', fontWeight: '600' }}>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayedRecentRequests.map(req => {
                                    let statusColor = 'var(--text-primary)';
                                    if (req.status === 'Pending') statusColor = '#bf616a';
                                    else if (req.status === 'Delivered' || req.status === 'Completed') statusColor = '#a3be8c';
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
                                            <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.8rem', color: '#35a7e6' }}>
                                                {new Date(req.created_at).toLocaleString()}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {displayedRecentRequests.length === 0 && (
                                    <tr>
                                        <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#4c566a' }}>No service requests logged yet.</td>
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
