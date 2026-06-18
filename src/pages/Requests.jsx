import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { Search, Filter, Printer, FileText, X, Eye } from 'lucide-react';
import JobDetailModal from '../components/JobDetailModal';

export default function Requests() {
    const { user } = useAuth();
    const location = useLocation();
    const [requests, setRequests] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [modeFilter, setModeFilter] = useState('All');
    
    // Modals & print states
    const [viewingJobId, setViewingJobId] = useState(null);
    const [printIntakeData, setPrintIntakeData] = useState(null);
    const [printInvoiceData, setPrintInvoiceData] = useState(null);
    const [printConfig, setPrintConfig] = useState({
        shopName: 'Hypertech Digital',
        shopAddress: '',
        shopPhone: '',
        shopEmail: '',
        showCustomerPhone: true,
        showCustomerEmail: false,
        showSerialNo: true,
        showTechnician: true,
        showServiceMode: true,
        showDeviceIntaken: true,
        intakeTerms: 'By leaving your device, you agree to our standard terms of service.\nNot responsible for data loss.',
        invoiceTerms: 'Thank you for choosing Hypertech Digital.\nAll repairs come with a standard 30-day warranty unless otherwise stated.'
    });

    const loadRequests = async () => {
        const complaintsList = await api.getComplaints(true); // orderDesc = true
        setRequests(complaintsList);
        try {
            const settings = await api.getSettings();
            if (settings.print_settings) {
                setPrintConfig(JSON.parse(settings.print_settings));
            }
        } catch (e) {}
    };

    useEffect(() => {
        loadRequests();
    }, []);

    // Auto-open job modal when navigated from notification
    useEffect(() => {
        if (location.state?.openJobId) {
            setViewingJobId(location.state.openJobId);
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // Filter requests
    const filteredRequests = requests.filter(req => {
        const query = searchQuery.trim().toLowerCase();
        const matchesSearch = !query || 
            (req.customerName && req.customerName.toLowerCase().includes(query)) ||
            (req.customerPhone && req.customerPhone.toLowerCase().includes(query)) ||
            (req.csr_number && req.csr_number.toLowerCase().includes(query)) ||
            (req.item_name && req.item_name.toLowerCase().includes(query)) ||
            (req.id && req.id.toLowerCase().includes(query));

        const matchesStatus = statusFilter === 'All' || req.status === statusFilter;
        
        let matchesMode = true;
        if (modeFilter !== 'All') {
            if (modeFilter === 'In-Shop') {
                matchesMode = req.service_type !== 'On-Site' && req.service_mode !== 'Onsite';
            } else if (modeFilter === 'On-Site') {
                matchesMode = req.service_type === 'On-Site' || req.service_mode === 'Onsite';
            }
        }

        return matchesSearch && matchesStatus && matchesMode;
    }).sort((a, b) => {
        const aNum = parseInt(a.csr_number) || 0;
        const bNum = parseInt(b.csr_number) || 0;
        return bNum - aNum;
    });

    // Load full details for Intake Slip printing
    const handlePrintIntake = async (req) => {
        let customerEmail = '';
        try {
            const cust = await api.getCustomer(req.customer_id);
            customerEmail = cust?.email || '';
        } catch (e) {}
        setPrintIntakeData({
            date: new Date(req.created_at).toLocaleString('en-GB').replace(/\//g, '-'),
            csrNumber: req.csr_number || req.id.split('-')[0].toUpperCase(),
            customerName: req.customerName,
            customerPhone: req.customerPhone,
            customerEmail,
            itemName: req.item_name,
            serialNo: req.serial_no || '—',
            serviceMode: req.service_mode || req.service_type || 'On Center',
            isDeviceIntaken: req.is_device_intaken !== 0
        });
    };

    // Load full details for Invoice printing
    const handlePrintInvoice = async (req) => {
        try {
            const cust = await api.getCustomer(req.customer_id);
            const invoices = await api.getInvoices(req.id);
            const inv = (invoices && invoices.length > 0) ? invoices[0] : {
                service_fees: 0,
                part_costs: 0,
                spares: '',
                warranty: '',
                total: 0
            };
            
            setPrintInvoiceData({
                job: req,
                customer: cust || { name: req.customerName || 'Customer', phone: req.customerPhone || '—' },
                invoice: inv
            });
        } catch (err) {
            alert('Failed to load invoice details: ' + err.message);
        }
    };

    // Quick print utility
    const triggerPrint = () => {
        window.print();
    };

    return (
        <div className="container">
            
            {/* Standard non-print content */}
            <div className="non-print">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--text-primary)' }}>Service Request Directory</h1>
                    <div style={{ background: '#f6f3eb', padding: '0.5rem 1rem', borderRadius: '4px', fontSize: '0.9rem', border: '1px solid var(--border-color)' }}>
                        Total Records: <span style={{ color: '#35a7e6', fontWeight: 'bold' }}>{filteredRequests.length}</span>
                    </div>
                </div>

                {/* Filters card */}
                <div style={{ background: 'var(--panel-bg)', borderRadius: '6px', padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid var(--border-color)', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    
                    {/* Search */}
                    <div style={{ flex: '1 1 300px', position: 'relative' }}>
                        <div style={{
                            background: 'var(--bg-color)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0.5rem 1rem',
                            gap: '10px',
                        }}>
                            <Search size={18} color="#35a7e6" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search by name, phone, item, CSR #..."
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
                                <button onClick={() => setSearchQuery('')} style={{ background: 'transparent', border: 'none', color: '#35a7e6', cursor: 'pointer', display: 'flex' }}>
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Status filter */}
                    <div style={{ flex: '1 1 180px' }}>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.55rem 0.75rem',
                                background: 'var(--bg-color)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-primary)',
                                borderRadius: '4px',
                                fontSize: '0.9rem',
                                outline: 'none',
                                margin: 0
                            }}
                        >
                            <option value="All">All Statuses</option>
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Intaken">Intaken</option>
                            <option value="Waiting for Spare">Waiting for Spare</option>
                            <option value="Replaced">Replaced</option>
                            <option value="Send to Service Center">Send to Service Center</option>
                            <option value="Ready">Ready</option>
                            <option value="Completed">Completed</option>
                            <option value="Return">Return</option>
                            <option value="Warranty">Warranty</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Returned">Returned</option>
                        </select>
                    </div>

                    {/* Mode filter */}
                    <div style={{ flex: '1 1 180px' }}>
                        <select
                            value={modeFilter}
                            onChange={e => setModeFilter(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.55rem 0.75rem',
                                background: 'var(--bg-color)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-primary)',
                                borderRadius: '4px',
                                fontSize: '0.9rem',
                                outline: 'none',
                                margin: 0
                            }}
                        >
                            <option value="All">All Service Types</option>
                            <option value="In-Shop">In-Shop</option>
                            <option value="On-Site">On-Site</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div style={{ background: 'var(--panel-bg)', borderRadius: '6px', border: '1px solid var(--border-color)', padding: '1.25rem' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', fontSize: '0.9rem', borderCollapse: 'collapse', minWidth: '900px' }}>
                            <thead>
                                <tr style={{ background: '#f6f3eb', textAlign: 'left' }}>
                                    <th style={{ padding: '0.75rem 1rem', borderRadius: '4px 0 0 4px', fontWeight: '600', color: '#35a7e6' }}>CSR #</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Customer</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Contact Phone</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Device</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Status</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Logged Date</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Logged By</th>
                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', borderRadius: '0 4px 4px 0', fontWeight: '600' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRequests.map(req => {
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
                                            style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}
                                        >
                                            <td style={{ padding: '0.85rem 1rem', fontWeight: 'bold', color: '#35a7e6' }}>#{req.csr_number || req.id.split('-')[0].toUpperCase()}</td>
                                            <td style={{ padding: '0.85rem 1rem', color: 'var(--text-primary)', fontWeight: '500' }}>{req.customerName || '—'}</td>
                                            <td style={{ padding: '0.85rem 1rem', color: 'var(--text-primary)' }}>{req.customerPhone || '—'}</td>
                                            <td style={{ padding: '0.85rem 1rem', color: 'var(--text-primary)' }}>{req.item_name}</td>
                                            <td style={{ padding: '0.85rem 1rem' }}>
                                                <span style={{ 
                                                    background: 'rgba(0, 0, 0, 0.04)', 
                                                    padding: '3px 8px', 
                                                    borderRadius: '12px', 
                                                    color: statusColor, 
                                                    fontSize: '0.75rem', 
                                                    fontWeight: 'bold', 
                                                    textTransform: 'uppercase',
                                                    border: `1px solid ${statusColor}40`
                                                }}>
                                                    {req.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.85rem 1rem', color: '#35a7e6', fontSize: '0.85rem' }}>
                                                {new Date(req.created_at).toLocaleDateString('en-GB').replace(/\//g, '-')}
                                            </td>
                                            <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'capitalize' }}>
                                                {req.created_by || 'Admin'}
                                            </td>
                                            <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                    <button 
                                                        onClick={() => setViewingJobId(req.id)}
                                                        title="View Details"
                                                        style={{ background: '#4c566a', color: '#fff', padding: '0.35rem 0.6rem', borderRadius: '4px', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center' }}
                                                    >
                                                        <Eye size={15} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handlePrintIntake(req)}
                                                        title="Print Intake Slip"
                                                        style={{ background: '#35a7e6', color: 'var(--panel-bg)', padding: '0.35rem 0.6rem', borderRadius: '4px', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center' }}
                                                    >
                                                        <Printer size={15} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handlePrintInvoice(req)}
                                                        title="Print Service Report"
                                                        style={{ background: '#a3be8c', color: 'var(--panel-bg)', padding: '0.35rem 0.6rem', borderRadius: '4px', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center' }}
                                                    >
                                                        <FileText size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredRequests.length === 0 && (
                                    <tr>
                                        <td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: '#4c566a' }}>No requests match the current filters.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal for Job details editing */}
            {viewingJobId && (
                <JobDetailModal
                    jobId={viewingJobId}
                    onClose={() => {
                        setViewingJobId(null);
                        loadRequests();
                    }}
                    onRefresh={loadRequests}
                />
            )}

            {/* Print Slip Overlay (triggered via print buttons) */}
            {printIntakeData && (
                <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, right: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ background: 'white', color: 'black', padding: '1.5rem 1rem', width: '500px', maxWidth: '95%', borderRadius: '4px', boxSizing: 'border-box' }}>
                        <div className="non-print" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', gap: '0.5rem' }}>
                            <button onClick={triggerPrint} style={{ background: 'var(--border-color)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Printer size={16} /> Print</button>
                            <button onClick={() => setPrintIntakeData(null)} style={{ background: '#e53e3e', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>Close</button>
                        </div>
                        <div className="print-receipt" style={{
                            background: '#fff', color: '#000',
                            padding: '20px', borderRadius: '0',
                            fontFamily: "'Courier New', monospace", fontSize: '12px',
                            width: '100%', margin: '0 auto',
                        }}>
                            <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '12px', marginBottom: '12px' }}>
                                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{printConfig.shopName || 'Your Shop Name'}</div>
                                {printConfig.shopAddress && <div style={{ fontSize: '10px', marginTop: '4px', whiteSpace: 'pre-line' }}>{printConfig.shopAddress}</div>}
                                {printConfig.shopPhone && <div style={{ fontSize: '10px' }}>Tel: {printConfig.shopPhone}</div>}
                                {printConfig.shopEmail && <div style={{ fontSize: '10px' }}>{printConfig.shopEmail}</div>}
                                <div style={{ marginTop: '8px', fontWeight: 'bold' }}>SERVICE REQUEST SLIP</div>
                            </div>

                            <div style={{ marginBottom: '10px' }}>
                                <div><b>Date:</b> {printIntakeData.date}</div>
                                <div style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '4px' }}>CSR #: {printIntakeData.csrNumber}</div>
                            </div>

                            <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '8px 0', margin: '8px 0' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Customer</div>
                                <div>{printIntakeData.customerName}</div>
                                {printConfig.showCustomerPhone && <div>Tel: {printIntakeData.customerPhone}</div>}
                                {printConfig.showCustomerEmail && printIntakeData.customerEmail && <div>{printIntakeData.customerEmail}</div>}
                            </div>

                            <div style={{ margin: '8px 0' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Device</div>
                                <div>{printIntakeData.itemName}</div>
                                {printConfig.showSerialNo && <div>S/N: {printIntakeData.serialNo}</div>}
                                {printConfig.showServiceMode && <div>Mode: {printIntakeData.serviceMode}</div>}
                                {printConfig.showDeviceIntaken && <div>Intaken: {printIntakeData.isDeviceIntaken ? 'Yes' : 'No'}</div>}
                            </div>

                            <div style={{ borderTop: '1px dashed #000', margin: '10px 0', paddingTop: '8px', fontSize: '10px', textAlign: 'center', whiteSpace: 'pre-line' }}>
                                {printConfig.intakeTerms || 'Your footer terms here.'}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Print Invoice Overlay (triggered via print buttons) */}
            {printInvoiceData && (
                <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, right: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ background: 'white', color: 'black', padding: '1.5rem 1rem', width: '500px', maxWidth: '95%', borderRadius: '4px', boxSizing: 'border-box' }}>
                        <div className="non-print" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', gap: '0.5rem' }}>
                            <button onClick={triggerPrint} style={{ background: 'var(--border-color)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Printer size={16} /> Print</button>
                            <button onClick={() => setPrintInvoiceData(null)} style={{ background: '#e53e3e', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>Close</button>
                        </div>
                        <div className="invoice-print-area" style={{
                            background: '#fff', color: '#000',
                            padding: '24px', borderRadius: '0',
                            fontFamily: 'Arial, sans-serif', fontSize: '13px',
                            width: '100%', margin: '0 auto',
                        }}>
                            <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '14px', marginBottom: '14px' }}>
                                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{printConfig.shopName || 'Your Shop Name'}</div>
                                {printConfig.shopAddress && <div style={{ fontSize: '11px', marginTop: '4px', whiteSpace: 'pre-line' }}>{printConfig.shopAddress}</div>}
                                {printConfig.shopPhone && <div style={{ fontSize: '11px' }}>Tel: {printConfig.shopPhone}</div>}
                                {printConfig.shopEmail && <div style={{ fontSize: '11px' }}>{printConfig.shopEmail}</div>}
                                <div style={{ marginTop: '10px', fontSize: '15px', fontWeight: 'bold', letterSpacing: '1px' }}>SERVICE REPORT</div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '12px' }}>
                                <div>
                                    <div><b>Receipt #:</b> {printInvoiceData.invoice.receipt_number || 'Pending'}</div>
                                    <div><b>Date:</b> {new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div><b>CSR #:</b> {printInvoiceData.job.csr_number || printInvoiceData.job.id.split('-')[0].toUpperCase()}</div>
                                    {printConfig.showTechnician && <div><b>Tech:</b> {user?.username || 'Admin'}</div>}
                                </div>
                            </div>

                            <div style={{ background: '#f5f5f5', padding: '8px 10px', borderRadius: '4px', marginBottom: '12px', fontSize: '12px' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Customer</div>
                                <div>{printInvoiceData.customer.name}</div>
                                {printConfig.showCustomerPhone && <div>{printInvoiceData.customer.phone}</div>}
                                <div style={{ marginTop: '4px' }}><b>Device:</b> {printInvoiceData.job.item_name}</div>
                                {printConfig.showSerialNo && <div><b>S/N:</b> {printInvoiceData.job.serial_no || '—'}</div>}
                            </div>

                            <div style={{ marginBottom: '12px', fontSize: '12px' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Work Performed</div>
                                <div style={{ background: '#f9f9f9', padding: '6px', border: '1px solid #ddd' }}>
                                    {printInvoiceData.job.issue}
                                </div>
                            </div>

                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '12px' }}>
                                <thead>
                                    <tr style={{ background: 'var(--border-color)', color: 'var(--text-primary)' }}>
                                        <th style={{ padding: '5px 8px', textAlign: 'left', borderBottom: '1px solid #000' }}>Description</th>
                                        <th style={{ padding: '5px 8px', textAlign: 'right', borderBottom: '1px solid #000' }}>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style={{ borderBottom: '1px solid #ddd' }}>
                                        <td style={{ padding: '5px 8px' }}>Service & Labor</td>
                                        <td style={{ padding: '5px 8px', textAlign: 'right' }}>₹{printInvoiceData.invoice.service_fees || 0}</td>
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid #ddd' }}>
                                        <td style={{ padding: '5px 8px' }}>
                                            Spare Parts
                                            {printInvoiceData.invoice.spares && (
                                                <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>
                                                    {(() => {
                                                        const sparesStr = printInvoiceData.invoice.spares;
                                                        if (sparesStr.startsWith('[')) {
                                                            try {
                                                                return JSON.parse(sparesStr).map(s => `${s.name}`).join(', ');
                                                            } catch (e) {
                                                                return sparesStr;
                                                            }
                                                        }
                                                        return sparesStr;
                                                    })()}
                                                </div>
                                            )}
                                            {printInvoiceData.invoice.warranty && <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>Warranty: {printInvoiceData.invoice.warranty}</div>}
                                        </td>
                                        <td style={{ padding: '5px 8px', textAlign: 'right' }}>₹{printInvoiceData.invoice.part_costs || 0}</td>
                                    </tr>
                                    <tr style={{ fontWeight: 'bold', background: '#f0f0f0' }}>
                                        <td style={{ padding: '8px' }}>TOTAL</td>
                                        <td style={{ padding: '8px', textAlign: 'right' }}>₹{printInvoiceData.invoice.total || (parseFloat(printInvoiceData.invoice.service_fees || 0) + parseFloat(printInvoiceData.invoice.part_costs || 0))}</td>
                                    </tr>
                                </tbody>
                            </table>

                            <div style={{ textAlign: 'center', fontSize: '10px', color: '#555', borderTop: '1px dashed var(--text-secondary)', paddingTop: '8px', whiteSpace: 'pre-line' }}>
                                {printConfig.invoiceTerms || 'Your footer terms here.'}
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
