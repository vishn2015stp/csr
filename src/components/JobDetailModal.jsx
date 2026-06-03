import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { X, Save, Printer, ArrowLeftRight } from 'lucide-react';

export default function JobDetailModal({ jobId, onClose, onRefresh }) {
    const { user } = useAuth();
    const [job, setJob] = useState(null);
    const [customer, setCustomer] = useState(null);
    const [newLog, setNewLog] = useState('');
    const [logs, setLogs] = useState([]);
    const [showInvoice, setShowInvoice] = useState(false);
    const [invoice, setInvoice] = useState({
        service_fees: 0,
        part_costs: 0,
        spares: '',
        warranty: '',
        total: 0
    });

    const isDelivered = job?.status?.trim().toLowerCase() === 'delivered';

    useEffect(() => {
        const load = async () => {
            const j = await api.getComplaint(jobId);
            if (j) {
                setJob(j);
                const c = await api.getCustomer(j.customer_id);
                setCustomer(c);
            }
            const sLogs = await api.getServiceRecords(jobId);
            setLogs(sLogs); // api returns desc

            // Fetch invoice/billing records
            try {
                const invoices = await api.getInvoices(jobId);
                if (invoices && invoices.length > 0) {
                    setInvoice(invoices[0]);
                }
            } catch (err) {
                console.error('Error fetching invoice:', err);
            }
        };
        load();
    }, [jobId]);

    const handleStatusChange = async (e) => {
        if (isDelivered) {
            alert("This job is already delivered and cannot be edited.");
            return;
        }
        const newStatus = e.target.value;
        await api.updateComplaint(jobId, { status: newStatus });
        setJob(prev => ({ ...prev, status: newStatus }));
        
        await api.createStatusLog({
            complaint_id: jobId,
            status: newStatus,
            technician: user?.username || 'Unknown'
        });

        await api.createServiceRecord({
            complaint_id: jobId,
            technician: user?.username || 'Unknown',
            issues: `Status updated to: ${newStatus}`,
            resolution_status: newStatus
        });
        
        const sLogs = await api.getServiceRecords(jobId);
        setLogs(sLogs);

        if (onRefresh) onRefresh();
    };

    const handleAddLog = async () => {
        if (isDelivered) {
            alert("This job is already delivered and cannot be edited.");
            return;
        }
        if (!newLog.trim()) return;
        await api.createServiceRecord({
            complaint_id: jobId,
            technician: user?.username || 'Unknown',
            issues: newLog,
            resolution_status: 'Update'
        });
        setNewLog('');
        const sLogs = await api.getServiceRecords(jobId);
        setLogs(sLogs);
    };

    const handleSaveInvoice = async () => {
        if (isDelivered) {
            alert("This job is already delivered and cannot be edited.");
            return;
        }
        try {
            const serviceFees = parseFloat(invoice.service_fees) || 0;
            const partCosts = parseFloat(invoice.part_costs) || 0;
            const totalVal = serviceFees + partCosts;

            const saved = await api.createInvoice({
                complaint_id: jobId,
                service_fees: serviceFees,
                part_costs: partCosts,
                spares: invoice.spares || '',
                warranty: invoice.warranty || '',
                total: totalVal
            });
            
            setInvoice(saved);
            alert("Billing & warranty details saved successfully!");
        } catch (err) {
            alert("Failed to save billing details: " + err.message);
        }
    };

    const markAsReturned = async () => {
        if (window.confirm("Mark this device as returned to the customer?")) {
            await api.updateComplaint(jobId, { flag_r: true, status: 'Delivered' });
            setJob(prev => ({ ...prev, status: 'Delivered' }));

            // Log completion timestamp
            await api.createStatusLog({
                complaint_id: jobId,
                status: 'Delivered',
                technician: user?.username || 'Unknown'
            });

            await api.createServiceRecord({
                complaint_id: jobId,
                technician: user?.username || 'Unknown',
                issues: `Device returned to customer (Status: Delivered)`,
                resolution_status: 'Delivered'
            });

            const sLogs = await api.getServiceRecords(jobId);
            setLogs(sLogs);

            if (onRefresh) onRefresh();
            alert("Returned successfully.");
            onClose();
        }
    };

    if (!job || !customer) return null;

    if (showInvoice) {
        return (
            <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, right: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ background: 'white', color: 'black', padding: '2rem', width: '500px', maxWidth: '100%', borderRadius: '4px' }}>
                    <div className="non-print" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                        <button onClick={() => window.print()} style={{ marginRight: '1rem', background: '#444' }}><Printer size={16} /> Print</button>
                        <button onClick={() => setShowInvoice(false)} style={{ background: '#e53e3e' }}>Close</button>
                    </div>
                    <div className="invoice-print-area">
                        <h1 style={{ textAlign: 'center', borderBottom: '2px solid black', paddingBottom: '0.5rem' }}>Hypertech Digital</h1>
                        <p style={{ textAlign: 'center' }}>Service Invoice</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
                            <div>
                                <p><strong>Receipt #:</strong> {invoice.receipt_number || 'Pending'}</p>
                                <p><strong>CSR #:</strong> {job.csr_number || job.id.split('-')[0].toUpperCase()}</p>
                                <p><strong>Customer:</strong> {customer.name}</p>
                                <p><strong>Product:</strong> {job.item_name}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                                <p><strong>Phone:</strong> {customer.phone}</p>
                            </div>
                        </div>
                        <table style={{ width: '100%', marginTop: '2rem', borderCollapse: 'collapse' }}>
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
                                        <div style={{ fontSize: '0.85rem', color: '#555', marginTop: '4px' }}>({job.issue})</div>
                                    </td>
                                    <td style={{ textAlign: 'right', padding: '0.5rem', fontWeight: 'bold' }}>₹{invoice.service_fees || 0}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '0.5rem' }}>
                                        <strong>Spare Parts Charge</strong>
                                        {invoice.spares && <div style={{ fontSize: '0.85rem', color: '#555', marginTop: '4px' }}>Spares used: {invoice.spares}</div>}
                                        {invoice.warranty && <div style={{ fontSize: '0.85rem', color: '#555', marginTop: '4px' }}>Warranty: {invoice.warranty}</div>}
                                    </td>
                                    <td style={{ textAlign: 'right', padding: '0.5rem', fontWeight: 'bold' }}>₹{invoice.part_costs || 0}</td>
                                </tr>
                                <tr style={{ borderTop: '2px solid black', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                    <td style={{ padding: '0.5rem' }}>Total Amount</td>
                                    <td style={{ textAlign: 'right', padding: '0.5rem' }}>₹{invoice.total || (parseFloat(invoice.service_fees || 0) + parseFloat(invoice.part_costs || 0))}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, right: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ background: '#2e3440', border: '1px solid #3b4252', borderRadius: '8px', width: '900px', maxWidth: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>

                {/* Header */}
                <div style={{ padding: '1rem', borderBottom: '1px solid #3b4252', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#242933', borderRadius: '8px 8px 0 0' }}>
                    <h2 style={{ margin: 0, color: '#eceff4' }}>PENDING BOOK DETAIL</h2>
                    <button onClick={onClose} style={{ background: 'transparent', color: '#eceff4', border: 'none', cursor: 'pointer', padding: '0.5rem' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="modal-body-grid" style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, color: '#d8dee9' }}>

                    {/* Left Column - Details */}
                    <div>
                        <div style={{ background: '#3b4252', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
                                <strong style={{ color: '#88c0d0' }}>Tracking ID:</strong> <span>{job.csr_number || job.id.split('-')[0].toUpperCase()}</span>
                                <strong style={{ color: '#88c0d0' }}>Date Rcvd:</strong> <span>{new Date(job.created_at).toLocaleDateString()}</span>
                                <strong style={{ color: '#88c0d0' }}>Customer:</strong> <span>{customer.name}</span>
                                <strong style={{ color: '#88c0d0' }}>Mobile:</strong> <span>{customer.phone}</span>
                                {customer.address && <><strong style={{ color: '#88c0d0' }}>Address:</strong> <span>{customer.address}</span></>}
                            </div>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ borderBottom: '1px solid #4c566a', paddingBottom: '0.5rem', color: '#ebcb8b' }}>Product & Complaint</h3>
                            <p style={{ background: '#242933', padding: '1rem', borderRadius: '4px' }}>
                                <strong>{job.item_name}</strong> - S/N: {job.serial_no}<br /><br />
                                {job.issue}
                            </p>
                        </div>

                        <div>
                            <h3 style={{ borderBottom: '1px solid #4c566a', paddingBottom: '0.5rem', color: '#a3be8c' }}>Service Status</h3>
                            <div style={{ background: '#242933', padding: '1rem', borderRadius: '4px' }}>
                                {isDelivered ? (
                                    <div style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        background: '#a3be8c',
                                        color: '#2e3440',
                                        borderRadius: '6px',
                                        fontSize: '1rem',
                                        fontWeight: 'bold',
                                        textAlign: 'center',
                                        textTransform: 'uppercase'
                                    }}>
                                        Delivered (Locked)
                                    </div>
                                ) : (
                                    <select
                                        value={job.status}
                                        onChange={handleStatusChange}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            background: '#2e3440',
                                            border: '1px solid #4c566a',
                                            color: '#eceff4',
                                            borderRadius: '6px',
                                            fontSize: '1rem',
                                            outline: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value="Pending">Pending</option>
                                        <option value="Waiting for Spare">Waiting for Spare</option>
                                        <option value="Replaced">Replaced</option>
                                        <option value="Send to Service Center">Send to Service Center</option>
                                        <option value="Ready">Ready</option>
                                        <option value="Delivered">Delivered</option>
                                    </select>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Logs & Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>

                        <div style={{ background: '#3b4252', padding: '1rem', borderRadius: '4px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ borderBottom: '1px solid #4c566a', paddingBottom: '0.5rem', margin: '0 0 1rem 0' }}>Technician Logs</h3>

                            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem', maxHeight: '200px' }}>
                                {logs.map(lg => (
                                    <div key={lg.id} style={{ background: '#2e3440', padding: '0.5rem', marginBottom: '0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                                        <div style={{ color: '#88c0d0', marginBottom: '2px' }}>{new Date(lg.created_at).toLocaleString()} - {lg.technician}</div>
                                        <div>{lg.issues}</div>
                                    </div>
                                ))}
                                {logs.length === 0 && <div style={{ color: '#4c566a', fontStyle: 'italic' }}>No logs yet...</div>}
                            </div>

                            {!isDelivered && (
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input type="text" value={newLog} onChange={e => setNewLog(e.target.value)} placeholder="Add a log entry..." style={{ flex: 1, padding: '0.5rem', background: '#2e3440', border: '1px solid #4c566a', color: '#eceff4', borderRadius: '4px' }} />
                                    <button onClick={handleAddLog} style={{ padding: '0.5rem 1rem', background: '#88c0d0', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><Save size={16} /></button>
                                </div>
                            )}
                        </div>

                        <div style={{ background: '#3b4252', padding: '1rem', borderRadius: '4px', marginTop: '1.5rem' }}>
                            {isDelivered ? (
                                <>
                                    <h3 style={{ borderBottom: '1px solid #4c566a', paddingBottom: '0.5rem', margin: '0 0 1rem 0', color: '#a3be8c' }}>Billing & Warranty (Locked)</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                                        <div>
                                            <span style={{ color: '#88c0d0', display: 'block', fontSize: '0.8rem' }}>Service Charge</span>
                                            <strong style={{ fontSize: '1.1rem' }}>₹{invoice.service_fees || 0}</strong>
                                        </div>
                                        <div>
                                            <span style={{ color: '#88c0d0', display: 'block', fontSize: '0.8rem' }}>Spare Cost</span>
                                            <strong style={{ fontSize: '1.1rem' }}>₹{invoice.part_costs || 0}</strong>
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                                        <span style={{ color: '#88c0d0', display: 'block', fontSize: '0.8rem' }}>Spares Used</span>
                                        <strong>{invoice.spares || 'None'}</strong>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem', alignItems: 'end' }}>
                                        <div>
                                            <span style={{ color: '#88c0d0', display: 'block', fontSize: '0.8rem' }}>Warranty Period</span>
                                            <strong>{invoice.warranty || 'No warranty'}</strong>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{ color: '#88c0d0', display: 'block', fontSize: '0.8rem' }}>Total Amount</span>
                                            <strong style={{ fontSize: '1.25rem', color: '#a3be8c' }}>₹{invoice.total || (parseFloat(invoice.service_fees || 0) + parseFloat(invoice.part_costs || 0))}</strong>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h3 style={{ borderBottom: '1px solid #4c566a', paddingBottom: '0.5rem', margin: '0 0 1rem 0', color: '#88c0d0' }}>Billing & Warranty</h3>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: '#d8dee9', display: 'block', marginBottom: '4px' }}>Service Charge (₹)</label>
                                            <input 
                                                type="number" 
                                                value={invoice.service_fees || ''} 
                                                onChange={e => setInvoice(prev => ({ ...prev, service_fees: e.target.value }))}
                                                placeholder="0"
                                                style={{ width: '100%', padding: '0.4rem', background: '#2e3440', border: '1px solid #4c566a', color: '#eceff4', borderRadius: '4px', margin: 0 }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: '#d8dee9', display: 'block', marginBottom: '4px' }}>Spare Cost (₹)</label>
                                            <input 
                                                type="number" 
                                                value={invoice.part_costs || ''} 
                                                onChange={e => setInvoice(prev => ({ ...prev, part_costs: e.target.value }))}
                                                placeholder="0"
                                                style={{ width: '100%', padding: '0.4rem', background: '#2e3440', border: '1px solid #4c566a', color: '#eceff4', borderRadius: '4px', margin: 0 }}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '0.75rem' }}>
                                        <label style={{ fontSize: '0.8rem', color: '#d8dee9', display: 'block', marginBottom: '4px' }}>Spares Used</label>
                                        <input 
                                            type="text" 
                                            value={invoice.spares || ''} 
                                            onChange={e => setInvoice(prev => ({ ...prev, spares: e.target.value }))}
                                            placeholder="e.g. 500GB SSD, Keyboard"
                                            style={{ width: '100%', padding: '0.4rem', background: '#2e3440', border: '1px solid #4c566a', color: '#eceff4', borderRadius: '4px', margin: 0 }}
                                        />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.5rem', alignItems: 'end' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: '#d8dee9', display: 'block', marginBottom: '4px' }}>Warranty Period</label>
                                            <input 
                                                type="text" 
                                                value={invoice.warranty || ''} 
                                                onChange={e => setInvoice(prev => ({ ...prev, warranty: e.target.value }))}
                                                placeholder="e.g. 3 Months / No warranty"
                                                style={{ width: '100%', padding: '0.4rem', background: '#2e3440', border: '1px solid #4c566a', color: '#eceff4', borderRadius: '4px', margin: 0 }}
                                            />
                                        </div>
                                        <button 
                                            onClick={handleSaveInvoice} 
                                            style={{ 
                                                width: '100%', 
                                                padding: '0.5rem', 
                                                background: '#88c0d0', 
                                                color: '#2e3440', 
                                                fontWeight: 'bold', 
                                                border: 'none', 
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                                height: '35px',
                                                margin: 0
                                            }}
                                        >
                                            <Save size={16} /> Save Billing
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <button onClick={() => setShowInvoice(true)} style={{ background: '#4c566a', padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                                <Printer size={20} /> Generate & Print Invoice
                            </button>
                            {!isDelivered && (
                                <button onClick={markAsReturned} style={{ background: '#a3be8c', color: 'black', padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                                    <ArrowLeftRight size={20} /> Mark as Returned to Customer
                                </button>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
