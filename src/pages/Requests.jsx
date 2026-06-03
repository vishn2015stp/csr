import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Search, Filter, Printer, FileText, X, Eye } from 'lucide-react';
import JobDetailModal from '../components/JobDetailModal';

export default function Requests() {
    const { user } = useAuth();
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
        showTechnician: true,
        showSerialNo: true,
        intakeTerms: 'Not responsible for data loss.\nEstimate valid for 7 days.'
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
    });

    // Load full details for Intake Slip printing
    const handlePrintIntake = async (req) => {
        // Find or build intake print payload
        setPrintIntakeData({
            date: new Date(req.created_at).toLocaleString(),
            csrNumber: req.csr_number || req.id.split('-')[0].toUpperCase(),
            customerName: req.customerName,
            customerPhone: req.customerPhone,
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
        <div className="container" style={{ padding: '2rem 1rem' }}>
            
            {/* Standard non-print content */}
            <div className="non-print">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#eceff4' }}>Service Request Directory</h1>
                    <div style={{ background: '#3b4252', padding: '0.5rem 1rem', borderRadius: '4px', fontSize: '0.9rem', border: '1px solid #4c566a' }}>
                        Total Records: <span style={{ color: '#88c0d0', fontWeight: 'bold' }}>{filteredRequests.length}</span>
                    </div>
                </div>

                {/* Filters card */}
                <div style={{ background: '#2e3440', borderRadius: '6px', padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid #3b4252', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    
                    {/* Search */}
                    <div style={{ flex: '1 1 300px', position: 'relative' }}>
                        <div style={{
                            background: '#242933',
                            border: '1px solid #4c566a',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0.5rem 1rem',
                            gap: '10px',
                        }}>
                            <Search size={18} color="#88c0d0" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search by name, phone, item, CSR #..."
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    color: '#eceff4',
                                    fontSize: '0.9rem',
                                    width: '100%',
                                    margin: 0,
                                    padding: 0
                                }}
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} style={{ background: 'transparent', border: 'none', color: '#88c0d0', cursor: 'pointer', display: 'flex' }}>
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Status filter */}
                    <div style={{ flex: '0 1 200px' }}>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.55rem 0.75rem',
                                background: '#242933',
                                border: '1px solid #4c566a',
                                color: '#eceff4',
                                borderRadius: '4px',
                                fontSize: '0.9rem',
                                outline: 'none',
                                margin: 0
                            }}
                        >
                            <option value="All">All Statuses</option>
                            <option value="Pending">Pending</option>
                            <option value="Waiting for Spare">Waiting for Spare</option>
                            <option value="Replaced">Replaced</option>
                            <option value="Send to Service Center">Send to Service Center</option>
                            <option value="Ready">Ready</option>
                            <option value="Delivered">Delivered</option>
                        </select>
                    </div>

                    {/* Mode filter */}
                    <div style={{ flex: '0 1 200px' }}>
                        <select
                            value={modeFilter}
                            onChange={e => setModeFilter(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.55rem 0.75rem',
                                background: '#242933',
                                border: '1px solid #4c566a',
                                color: '#eceff4',
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
                <div style={{ background: '#2e3440', borderRadius: '6px', border: '1px solid #3b4252', padding: '1.25rem' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', fontSize: '0.9rem', borderCollapse: 'collapse', minWidth: '900px' }}>
                            <thead>
                                <tr style={{ background: '#3b4252', textAlign: 'left' }}>
                                    <th style={{ padding: '0.75rem 1rem', borderRadius: '4px 0 0 4px', fontWeight: '600', color: '#88c0d0' }}>CSR #</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Customer</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Contact Phone</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Device</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Status</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Logged Date</th>
                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', borderRadius: '0 4px 4px 0', fontWeight: '600' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRequests.map(req => {
                                    let statusColor = '#d8dee9';
                                    if (req.status === 'Pending') statusColor = '#bf616a';
                                    else if (req.status === 'Delivered') statusColor = '#a3be8c';
                                    else if (req.status === 'Ready for Delivery' || req.status === 'Ready') statusColor = '#8fbcbb';
                                    else statusColor = '#ebcb8b';
                                    
                                    return (
                                        <tr 
                                            key={req.id}
                                            style={{ borderBottom: '1px solid #3b4252', transition: 'background 0.15s' }}
                                        >
                                            <td style={{ padding: '0.85rem 1rem', fontWeight: 'bold', color: '#88c0d0' }}>#{req.csr_number || req.id.split('-')[0].toUpperCase()}</td>
                                            <td style={{ padding: '0.85rem 1rem', color: '#eceff4', fontWeight: '500' }}>{req.customerName || '—'}</td>
                                            <td style={{ padding: '0.85rem 1rem', color: '#d8dee9' }}>{req.customerPhone || '—'}</td>
                                            <td style={{ padding: '0.85rem 1rem', color: '#eceff4' }}>{req.item_name}</td>
                                            <td style={{ padding: '0.85rem 1rem' }}>
                                                <span style={{ 
                                                    background: 'rgba(255,255,255,0.08)', 
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
                                            <td style={{ padding: '0.85rem 1rem', color: '#88c0d0', fontSize: '0.85rem' }}>
                                                {new Date(req.created_at).toLocaleDateString()}
                                            </td>
                                            <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                    <button 
                                                        onClick={() => setViewingJobId(req.id)}
                                                        title="View Details"
                                                        style={{ background: '#4c566a', color: '#eceff4', padding: '0.35rem 0.6rem', borderRadius: '4px', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center' }}
                                                    >
                                                        <Eye size={15} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handlePrintIntake(req)}
                                                        title="Print Intake Slip"
                                                        style={{ background: '#88c0d0', color: '#2e3440', padding: '0.35rem 0.6rem', borderRadius: '4px', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center' }}
                                                    >
                                                        <Printer size={15} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handlePrintInvoice(req)}
                                                        title="Print Invoice"
                                                        style={{ background: '#a3be8c', color: '#2e3440', padding: '0.35rem 0.6rem', borderRadius: '4px', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center' }}
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
                                        <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: '#4c566a' }}>
                                            No matching service request records found.
                                        </td>
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
                    <div style={{ background: 'white', color: 'black', padding: '2rem', width: '500px', maxWidth: '100%', borderRadius: '4px' }}>
                        <div className="non-print" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', gap: '0.5rem' }}>
                            <button onClick={triggerPrint} style={{ background: '#444', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Printer size={16} /> Print</button>
                            <button onClick={() => setPrintIntakeData(null)} style={{ background: '#e53e3e', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>Close</button>
                        </div>
                        <div className="print-receipt" style={{ color: 'black' }}>
                            <div className="print-header" style={{ textAlign: 'center', borderBottom: '1px dashed black', paddingBottom: '10px', marginBottom: '15px' }}>
                                <h2 style={{ color: 'black', margin: '0 0 5px 0' }}>{printConfig.shopName}</h2>
                                {printConfig.shopAddress && <p style={{ fontSize: '0.8rem', margin: '5px 0', whiteSpace: 'pre-line' }}>{printConfig.shopAddress}</p>}
                                <p style={{ fontSize: '0.9rem', margin: '5px 0 0 0', fontWeight: 'bold' }}>Service Request Receipt</p>
                            </div>
                            <p style={{ margin: '4px 0' }}><strong>Date:</strong> {printIntakeData.date}</p>
                            <p style={{ margin: '4px 0' }}><strong>Request ID:</strong> <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>#{printIntakeData.csrNumber}</span></p>
                            <br />
                            <p style={{ margin: '4px 0' }}><strong>Customer:</strong> {printIntakeData.customerName}</p>
                            <p style={{ margin: '4px 0' }}><strong>Phone:</strong> {printIntakeData.customerPhone}</p>
                            <br />
                            <p style={{ margin: '4px 0' }}><strong>Item:</strong> {printIntakeData.itemName}</p>
                            {printConfig.showSerialNo && <p style={{ margin: '4px 0' }}><strong>S/N:</strong> {printIntakeData.serialNo}</p>}
                            <p style={{ margin: '4px 0' }}><strong>Service Mode:</strong> {printIntakeData.serviceMode}</p>
                            <p style={{ margin: '4px 0' }}><strong>Device Intaken:</strong> {printIntakeData.isDeviceIntaken ? 'Yes' : 'No'}</p>
                            <div className="print-terms" style={{ marginTop: '20px', borderTop: '1px dashed black', paddingTop: '10px', fontSize: '8pt', textAlign: 'center', whiteSpace: 'pre-line' }}>
                                {printConfig.intakeTerms}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Print Invoice Overlay (triggered via print buttons) */}
            {printInvoiceData && (
                <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, right: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ background: 'white', color: 'black', padding: '2rem', width: '500px', maxWidth: '100%', borderRadius: '4px' }}>
                        <div className="non-print" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', gap: '0.5rem' }}>
                            <button onClick={triggerPrint} style={{ background: '#444', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Printer size={16} /> Print</button>
                            <button onClick={() => setPrintInvoiceData(null)} style={{ background: '#e53e3e', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>Close</button>
                        </div>
                        <div className="invoice-print-area" style={{ color: 'black' }}>
                            <div style={{ textAlign: 'center', borderBottom: '2px solid black', paddingBottom: '0.5rem', marginBottom: '15px' }}>
                                <h1 style={{ color: 'black', margin: 0, fontSize: '1.6rem' }}>{printConfig.shopName}</h1>
                                <p style={{ margin: '2px 0', fontSize: '0.9rem' }}>Service Invoice</p>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', fontSize: '0.95rem' }}>
                                <div>
                                    <p style={{ margin: '4px 0' }}><strong>Receipt #:</strong> {printInvoiceData.invoice.receipt_number || 'Pending'}</p>
                                    <p style={{ margin: '4px 0' }}><strong>CSR #:</strong> {printInvoiceData.job.csr_number || printInvoiceData.job.id.split('-')[0].toUpperCase()}</p>
                                    <p style={{ margin: '4px 0' }}><strong>Customer:</strong> {printInvoiceData.customer.name}</p>
                                    <p style={{ margin: '4px 0' }}><strong>Product:</strong> {printInvoiceData.job.item_name}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ margin: '4px 0' }}><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                                    <p style={{ margin: '4px 0' }}><strong>Phone:</strong> {printInvoiceData.customer.phone}</p>
                                </div>
                            </div>
                            <table style={{ width: '100%', marginTop: '1.5rem', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid black' }}>
                                        <th style={{ textAlign: 'left', padding: '0.5rem' }}>Description</th>
                                        <th style={{ textAlign: 'right', padding: '0.5rem' }}>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ padding: '0.5rem' }}>
                                            <strong>Service & Repair Fee</strong>
                                            <div style={{ fontSize: '0.8rem', color: '#555', marginTop: '2px' }}>({printInvoiceData.job.issue})</div>
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '0.5rem', fontWeight: 'bold' }}>₹{printInvoiceData.invoice.service_fees || 0}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '0.5rem' }}>
                                            <strong>Spare Parts Charge</strong>
                                            {printInvoiceData.invoice.spares && <div style={{ fontSize: '0.8rem', color: '#555', marginTop: '2px' }}>Spares used: {printInvoiceData.invoice.spares}</div>}
                                            {printInvoiceData.invoice.warranty && <div style={{ fontSize: '0.8rem', color: '#555', marginTop: '2px' }}>Warranty: {printInvoiceData.invoice.warranty}</div>}
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '0.5rem', fontWeight: 'bold' }}>₹{printInvoiceData.invoice.part_costs || 0}</td>
                                    </tr>
                                    <tr style={{ borderTop: '2px solid black', fontWeight: 'bold', fontSize: '1.05rem' }}>
                                        <td style={{ padding: '0.5rem' }}>Total Amount</td>
                                        <td style={{ textAlign: 'right', padding: '0.5rem' }}>₹{printInvoiceData.invoice.total || (parseFloat(printInvoiceData.invoice.service_fees || 0) + parseFloat(printInvoiceData.invoice.part_costs || 0))}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
