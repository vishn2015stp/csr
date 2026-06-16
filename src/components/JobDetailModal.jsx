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
    const [printConfig, setPrintConfig] = useState({
        shopName: 'Hypertech Digital',
        shopAddress: '',
        shopPhone: '',
        showTechnician: true,
        showSerialNo: true,
        showCustomerPhone: true,
        invoiceTerms: 'Thank you for choosing Hypertech Digital.\nAll repairs come with a standard 30-day warranty unless otherwise stated.'
    });

    // Product editing states
    const [isEditingProduct, setIsEditingProduct] = useState(false);
    const [editItemName, setEditItemName] = useState('');
    const [editSerialNo, setEditSerialNo] = useState('');
    const [editBrand, setEditBrand] = useState('');
    const [editModel, setEditModel] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [editAccessories, setEditAccessories] = useState('');
    const [editIssue, setEditIssue] = useState('');
    const [editIsIntaken, setEditIsIntaken] = useState(false);

    // Multiple spares and warranty states
    const [newSpareName, setNewSpareName] = useState('');
    const [newSpareCost, setNewSpareCost] = useState('');

    const isDelivered = job?.status?.trim().toLowerCase() === 'delivered' || job?.status?.trim().toLowerCase() === 'completed' || job?.status?.trim().toLowerCase() === 'returned';

    useEffect(() => {
        const load = async () => {
            const j = await api.getComplaint(jobId);
            if (j) {
                setJob(j);
                const c = await api.getCustomer(j.customer_id);
                setCustomer(c);
                setEditItemName(j.item_name || '');
                setEditSerialNo(j.serial_no || '');
                setEditBrand(j.brand || '');
                setEditModel(j.model || '');
                setEditPassword(j.password || '');
                setEditAccessories(j.accessories || '');
                setEditIssue(j.issue || '');
                setEditIsIntaken(j.is_device_intaken === 1);
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

            try {
                const settings = await api.getSettings();
                if (settings.print_settings) {
                    setPrintConfig(JSON.parse(settings.print_settings));
                }
            } catch (e) {}
        };
        load();
    }, [jobId]);

    const handleSaveProduct = async () => {
        try {
            const updates = {
                item_name: editItemName,
                serial_no: editSerialNo,
                brand: editBrand || null,
                model: editModel || null,
                password: editPassword || null,
                accessories: editAccessories || null,
                issue: editIssue,
                is_device_intaken: job.is_device_intaken === 1 ? 1 : (editIsIntaken ? 1 : 0)
            };

            const justIntaken = job.is_device_intaken === 0 && updates.is_device_intaken === 1;
            if (justIntaken) {
                updates.status = 'Intaken';
            }

            // Detect and log edited fields
            const changes = [];
            if ((job.item_name || '').trim() !== (editItemName || '').trim()) {
                changes.push(`Item Name from "${job.item_name || '—'}" to "${editItemName}"`);
            }
            if ((job.serial_no || '').trim() !== (editSerialNo || '').trim()) {
                changes.push(`Serial No from "${job.serial_no || '—'}" to "${editSerialNo}"`);
            }
            if ((job.brand || '').trim() !== (editBrand || '').trim()) {
                changes.push(`Brand from "${job.brand || '—'}" to "${editBrand}"`);
            }
            if ((job.model || '').trim() !== (editModel || '').trim()) {
                changes.push(`Model from "${job.model || '—'}" to "${editModel}"`);
            }
            if ((job.password || '').trim() !== (editPassword || '').trim()) {
                changes.push(`Password updated`);
            }
            if ((job.accessories || '').trim() !== (editAccessories || '').trim()) {
                changes.push(`Accessories from "${job.accessories || '—'}" to "${editAccessories}"`);
            }
            if ((job.issue || '').trim() !== (editIssue || '').trim()) {
                changes.push(`Issue Description from "${job.issue || '—'}" to "${editIssue}"`);
            }
            if (job.is_device_intaken === 0 && editIsIntaken) {
                changes.push('Device Intaken from "No" to "Yes"');
            }

            await api.updateComplaint(jobId, updates);
            setJob(prev => ({
                ...prev,
                ...updates
            }));
            setIsEditingProduct(false);

            if (changes.length > 0) {
                await api.createServiceRecord({
                    complaint_id: jobId,
                    technician: user?.username || 'Unknown',
                    issues: `Edited request details: ${changes.join(', ')}`,
                    resolution_status: 'Details Updated'
                });
            }

            if (justIntaken) {
                await api.createStatusLog({
                    complaint_id: jobId,
                    status: 'Intaken',
                    technician: user?.username || 'Unknown'
                });

                await api.createServiceRecord({
                    complaint_id: jobId,
                    technician: user?.username || 'Unknown',
                    issues: `Device intaken for service (Status: Intaken)`,
                    resolution_status: 'Intaken'
                });
            }

            const sLogs = await api.getServiceRecords(jobId);
            setLogs(sLogs);

            if (onRefresh) onRefresh();
            alert("Product details updated successfully!");
        } catch (err) {
            alert("Failed to update product details: " + err.message);
        }
    };

    const handleQuickIntake = async () => {
        try {
            const updates = {
                is_device_intaken: 1,
                status: 'Intaken'
            };
            await api.updateComplaint(jobId, updates);
            setJob(prev => ({
                ...prev,
                is_device_intaken: 1,
                status: 'Intaken'
            }));
            setEditIsIntaken(true);

            await api.createStatusLog({
                complaint_id: jobId,
                status: 'Intaken',
                technician: user?.username || 'Unknown'
            });

            await api.createServiceRecord({
                complaint_id: jobId,
                technician: user?.username || 'Unknown',
                issues: `Device intaken for service (Status: Intaken)`,
                resolution_status: 'Intaken'
            });

            const sLogs = await api.getServiceRecords(jobId);
            setLogs(sLogs);

            if (onRefresh) onRefresh();
            alert("Device marked as Taken for Service! Status updated to Intaken.");
        } catch (err) {
            alert("Failed to update status: " + err.message);
        }
    };

    const handleStatusChange = async (e) => {
        if (isDelivered) {
            alert("This job is already completed/delivered and cannot be edited.");
            return;
        }
        let newStatus = e.target.value;
        
        if (newStatus === 'Delivered' && job?.status?.trim().toLowerCase() === 'return') {
            newStatus = 'Returned';
        }

        if (newStatus === 'Delivered' || newStatus === 'Completed' || newStatus === 'Returned') {
            const confirmMsg = newStatus === 'Completed'
                ? "Are you sure you want to mark this request as Completed? Once marked as Completed, you will no longer be able to edit this request or its billing."
                : `Are you sure you want to mark this request as ${newStatus}? Once marked as ${newStatus}, you will no longer be able to edit this request or its billing.`;
            const confirmAction = window.confirm(confirmMsg);
            if (!confirmAction) {
                e.target.value = job.status;
                return;
            }
            const captchaCode = Math.floor(1000 + Math.random() * 9000).toString();
            const captchaPrompt = window.prompt(`To confirm marking as ${newStatus}, please type the verification code: ${captchaCode}`);
            if (captchaPrompt !== captchaCode) {
                alert("Verification failed. Action cancelled.");
                e.target.value = job.status;
                return;
            }
        }
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

    const handleWarrantyStatusChange = async (e) => {
        const newWStatus = e.target.value;
        try {
            await api.updateComplaint(jobId, { warranty_status: newWStatus });
            setJob(prev => ({ ...prev, warranty_status: newWStatus }));

            await api.createStatusLog({
                complaint_id: jobId,
                status: `Warranty (${newWStatus})`,
                technician: user?.username || 'Unknown'
            });

            await api.createServiceRecord({
                complaint_id: jobId,
                technician: user?.username || 'Unknown',
                issues: `Warranty status updated to: ${newWStatus}`,
                resolution_status: `Warranty: ${newWStatus}`
            });

            const sLogs = await api.getServiceRecords(jobId);
            setLogs(sLogs);

            if (onRefresh) onRefresh();
        } catch (err) {
            alert("Failed to update warranty status: " + err.message);
        }
    };

    const getSparesList = () => {
        if (!invoice.spares) return [];
        if (invoice.spares.startsWith('[')) {
            try {
                return JSON.parse(invoice.spares);
            } catch (e) {
                return [{ name: invoice.spares, cost: parseFloat(invoice.part_costs) || 0 }];
            }
        }
        return [{ name: invoice.spares, cost: parseFloat(invoice.part_costs) || 0 }];
    };

    const sparesList = getSparesList();

    const handleAddSpare = () => {
        if (!newSpareName.trim()) return;
        const costVal = parseFloat(newSpareCost) || 0;
        const newSpare = { name: newSpareName.trim(), cost: costVal };
        const updatedList = [...sparesList, newSpare];
        const newPartCosts = updatedList.reduce((sum, s) => sum + s.cost, 0);

        setInvoice(prev => ({
            ...prev,
            spares: JSON.stringify(updatedList),
            part_costs: newPartCosts,
            total: (parseFloat(prev.service_fees) || 0) + newPartCosts
        }));
        setNewSpareName('');
        setNewSpareCost('');
    };

    const handleRemoveSpare = (index) => {
        const updatedList = sparesList.filter((_, idx) => idx !== index);
        const newPartCosts = updatedList.reduce((sum, s) => sum + s.cost, 0);

        setInvoice(prev => ({
            ...prev,
            spares: updatedList.length > 0 ? JSON.stringify(updatedList) : '',
            part_costs: newPartCosts,
            total: (parseFloat(prev.service_fees) || 0) + newPartCosts
        }));
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
            const captchaCode = Math.floor(1000 + Math.random() * 9000).toString();
            const captchaPrompt = window.prompt(`To confirm returning this device, please type the verification code: ${captchaCode}`);
            if (captchaPrompt !== captchaCode) {
                alert("Verification failed. Action cancelled.");
                return;
            }
            await api.updateComplaint(jobId, { flag_r: true, status: 'Returned' });
            setJob(prev => ({ ...prev, status: 'Returned' }));

            // Log completion timestamp
            await api.createStatusLog({
                complaint_id: jobId,
                status: 'Returned',
                technician: user?.username || 'Unknown'
            });

            await api.createServiceRecord({
                complaint_id: jobId,
                technician: user?.username || 'Unknown',
                issues: `Device returned to customer (Status: Returned)`,
                resolution_status: 'Returned'
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
                <div style={{ background: 'white', color: 'black', padding: '1.5rem 1rem', width: '500px', maxWidth: '95%', borderRadius: '4px', boxSizing: 'border-box' }}>
                    <div className="non-print" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                        <button onClick={() => window.print()} style={{ marginRight: '1rem', background: 'var(--border-color)' }}><Printer size={16} /> Print</button>
                        <button onClick={() => setShowInvoice(false)} style={{ background: '#e53e3e' }}>Close</button>
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
                            <div style={{ marginTop: '10px', fontSize: '15px', fontWeight: 'bold', letterSpacing: '1px' }}>TAX INVOICE</div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '12px' }}>
                            <div>
                                <div><b>Receipt #:</b> {invoice.receipt_number || 'Pending'}</div>
                                <div><b>Date:</b> {new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div><b>CSR #:</b> {job.csr_number || job.id.split('-')[0].toUpperCase()}</div>
                                {printConfig.showTechnician && <div><b>Tech:</b> {user?.username || 'Admin'}</div>}
                            </div>
                        </div>

                        <div style={{ background: '#f5f5f5', padding: '8px 10px', borderRadius: '4px', marginBottom: '12px', fontSize: '12px' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Customer</div>
                            <div>{customer.name}</div>
                            {printConfig.showCustomerPhone && <div>{customer.phone}</div>}
                            <div style={{ marginTop: '4px' }}><b>Device:</b> {job.item_name}</div>
                            {printConfig.showSerialNo && <div><b>S/N:</b> {job.serial_no || '—'}</div>}
                        </div>

                        <div style={{ marginBottom: '12px', fontSize: '12px' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Work Performed</div>
                            <div style={{ background: '#f9f9f9', padding: '6px', border: '1px solid #ddd' }}>
                                {job.issue}
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
                                    <td style={{ padding: '5px 8px', textAlign: 'right' }}>₹{invoice.service_fees || 0}</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #ddd' }}>
                                    <td style={{ padding: '5px 8px' }}>
                                        Spare Parts
                                        {invoice.spares && (
                                            <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>
                                                {(() => {
                                                    if (invoice.spares.startsWith('[')) {
                                                        try {
                                                            return JSON.parse(invoice.spares).map(s => `${s.name}`).join(', ');
                                                        } catch (e) {
                                                            return invoice.spares;
                                                        }
                                                    }
                                                    return invoice.spares;
                                                })()}
                                            </div>
                                        )}
                                        {invoice.warranty && <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>Warranty: {invoice.warranty}</div>}
                                    </td>
                                    <td style={{ padding: '5px 8px', textAlign: 'right' }}>₹{invoice.part_costs || 0}</td>
                                </tr>
                                <tr style={{ fontWeight: 'bold', background: '#f0f0f0' }}>
                                    <td style={{ padding: '8px' }}>TOTAL</td>
                                    <td style={{ padding: '8px', textAlign: 'right' }}>₹{invoice.total || (parseFloat(invoice.service_fees || 0) + parseFloat(invoice.part_costs || 0))}</td>
                                </tr>
                            </tbody>
                        </table>

                    <div style={{ textAlign: 'center', fontSize: '10px', color: '#555', borderTop: '1px dashed var(--text-secondary)', paddingTop: '8px', whiteSpace: 'pre-line' }}>
                        {printConfig.invoiceTerms || 'Your footer terms here.'}
                    </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, right: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1100, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', width: '900px', maxWidth: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>

                {/* Header */}
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-color)', borderRadius: '8px 8px 0 0' }}>
                    <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>PENDING BOOK DETAIL</h2>
                    <button onClick={onClose} style={{ background: 'transparent', color: 'var(--text-primary)', border: 'none', cursor: 'pointer', padding: '0.5rem' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="modal-body-grid" style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, color: 'var(--text-primary)' }}>

                    {/* Left Column - Details */}
                    <div>
                        <div style={{ background: '#f6f3eb', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
                                <strong style={{ color: '#35a7e6' }}>Tracking ID:</strong> <span>{job.csr_number || job.id.split('-')[0].toUpperCase()}</span>
                                <strong style={{ color: '#35a7e6' }}>Date Rcvd:</strong> <span>{new Date(job.created_at).toLocaleDateString('en-GB').replace(/\//g, '-')}</span>
                                <strong style={{ color: '#35a7e6' }}>Created By:</strong> <span style={{ textTransform: 'capitalize' }}>{job.created_by || 'Admin'}</span>
                                <strong style={{ color: '#35a7e6' }}>Customer:</strong> <span>{customer.name}</span>
                                <strong style={{ color: '#35a7e6' }}>Mobile:</strong> <span>{customer.phone}</span>
                                {customer.address && <><strong style={{ color: '#35a7e6' }}>Address:</strong> <span>{customer.address}</span></>}
                                {customer.location && (job.service_mode || 'On Center') !== 'On Center' && <><strong style={{ color: '#35a7e6' }}>Location:</strong> <span>{customer.location}</span></>}
                            </div>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                                <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Product & Complaint</h3>
                                {!isDelivered && (
                                    <button 
                                        onClick={() => {
                                            if (isEditingProduct) {
                                                // Reset to actual job values on cancel
                                                setEditItemName(job.item_name || '');
                                                setEditSerialNo(job.serial_no || '');
                                                setEditIssue(job.issue || '');
                                                setEditIsIntaken(job.is_device_intaken === 1);
                                            }
                                            setIsEditingProduct(!isEditingProduct);
                                        }}
                                        style={{ 
                                            background: '#4c566a', 
                                            color: '#fff', 
                                            padding: '2px 8px', 
                                            fontSize: '0.8rem', 
                                            border: 'none', 
                                            borderRadius: '4px', 
                                            cursor: 'pointer' 
                                        }}
                                    >
                                        {isEditingProduct ? 'Cancel' : 'Edit Details'}
                                    </button>
                                )}
                            </div>

                            {isEditingProduct ? (
                                <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Item Name *</label>
                                        <input 
                                            type="text" 
                                            value={editItemName} 
                                            onChange={e => setEditItemName(e.target.value)} 
                                            style={{ width: '100%', padding: '0.4rem', background: 'var(--panel-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }} 
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Serial Number</label>
                                        <input 
                                            type="text" 
                                            value={editSerialNo} 
                                            onChange={e => setEditSerialNo(e.target.value)} 
                                            style={{ width: '100%', padding: '0.4rem', background: 'var(--panel-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }} 
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Brand</label>
                                        <input 
                                            type="text" 
                                            value={editBrand} 
                                            onChange={e => setEditBrand(e.target.value)} 
                                            style={{ width: '100%', padding: '0.4rem', background: 'var(--panel-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }} 
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Model</label>
                                        <input 
                                            type="text" 
                                            value={editModel} 
                                            onChange={e => setEditModel(e.target.value)} 
                                            style={{ width: '100%', padding: '0.4rem', background: 'var(--panel-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }} 
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Device Password / PIN</label>
                                        <input 
                                            type="text" 
                                            value={editPassword} 
                                            onChange={e => setEditPassword(e.target.value)} 
                                            style={{ width: '100%', padding: '0.4rem', background: 'var(--panel-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }} 
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Accessories</label>
                                        <input 
                                            type="text" 
                                            value={editAccessories} 
                                            onChange={e => setEditAccessories(e.target.value)} 
                                            style={{ width: '100%', padding: '0.4rem', background: 'var(--panel-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }} 
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Issue Description *</label>
                                        <textarea 
                                            value={editIssue} 
                                            onChange={e => setEditIssue(e.target.value)} 
                                            rows="3"
                                            style={{ width: '100%', padding: '0.4rem', background: 'var(--panel-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }}
                                        ></textarea>
                                    </div>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
                                        <input 
                                            type="checkbox" 
                                            id="editIsIntaken" 
                                            checked={editIsIntaken} 
                                            onChange={e => setEditIsIntaken(e.target.checked)} 
                                            disabled={job.is_device_intaken === 1}
                                            style={{ cursor: job.is_device_intaken === 1 ? 'not-allowed' : 'pointer' }}
                                        />
                                        <label htmlFor="editIsIntaken" style={{ fontSize: '0.9rem', color: job.is_device_intaken === 1 ? '#777' : 'var(--text-primary)', cursor: job.is_device_intaken === 1 ? 'not-allowed' : 'pointer' }}>
                                            Device Taken for Service (Intaken) {job.is_device_intaken === 1 && "(Locked)"}
                                        </label>
                                    </div>

                                    <button 
                                        onClick={handleSaveProduct} 
                                        style={{ 
                                            padding: '0.5rem', 
                                            background: '#35a7e6', 
                                            color: 'var(--panel-bg)', 
                                            fontWeight: 'bold', 
                                            border: 'none', 
                                            borderRadius: '4px', 
                                            cursor: 'pointer',
                                            marginTop: '4px'
                                        }}
                                    >
                                        Save Details
                                    </button>
                                </div>
                            ) : (
                                <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '4px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                        <div>
                                            <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{job.item_name}</strong>
                                            {job.brand && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Brand: {job.brand}</div>}
                                            {job.model && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Model: {job.model}</div>}
                                            {job.serial_no && <div style={{ fontSize: '0.85rem', color: '#35a7e6', marginTop: '2px' }}>S/N: {job.serial_no}</div>}
                                            {job.password && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Password: {job.password}</div>}
                                            {job.accessories && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Accessories: {job.accessories}</div>}
                                        </div>
                                        <div>
                                            {job.is_device_intaken === 1 ? (
                                                <span style={{ background: 'rgba(163, 190, 140, 0.2)', color: '#a3be8c', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid #a3be8c' }}>
                                                    Intaken (Taken for Service)
                                                </span>
                                            ) : (
                                                <span style={{ background: 'rgba(235, 203, 139, 0.2)', color: '#ebcb8b', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid #ebcb8b' }}>
                                                    On-Site (Not Taken)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <p style={{ margin: '0 0 1rem 0', whiteSpace: 'pre-line', fontSize: '0.95rem' }}>
                                        {job.issue}
                                    </p>

                                    {job.is_device_intaken !== 1 && !isDelivered && (
                                        <button 
                                            onClick={handleQuickIntake} 
                                            style={{ 
                                                width: '100%', 
                                                padding: '0.5rem', 
                                                background: '#ebcb8b', 
                                                color: 'var(--panel-bg)', 
                                                fontWeight: 'bold', 
                                                border: 'none', 
                                                borderRadius: '4px', 
                                                cursor: 'pointer',
                                                fontSize: '0.85rem'
                                            }}
                                        >
                                            Mark as Taken for Service (Intake Device)
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        <div>
                            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', color: '#a3be8c' }}>Service Status</h3>
                            <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '4px' }}>
                                {isDelivered ? (
                                    <div style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        background: '#a3be8c',
                                        color: 'var(--panel-bg)',
                                        borderRadius: '6px',
                                        fontSize: '1rem',
                                        fontWeight: 'bold',
                                        textAlign: 'center',
                                        textTransform: 'uppercase'
                                    }}>
                                        {job.status === 'Completed' ? 'Completed (Locked)' : job.status === 'Returned' ? 'Returned (Locked)' : 'Delivered (Locked)'}
                                    </div>
                                ) : (
                                    <select
                                        value={job.status}
                                        onChange={handleStatusChange}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            background: 'var(--panel-bg)',
                                            border: '1px solid var(--border-color)',
                                            color: 'var(--text-primary)',
                                            borderRadius: '6px',
                                            fontSize: '1rem',
                                            outline: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {(job.service_mode || 'On Center') === 'Onsite' && job.is_device_intaken !== 1 ? (
                                            <>
                                                <option value="Pending">Pending</option>
                                                <option value="In Progress">In Progress</option>
                                                <option value="Completed">Completed</option>
                                                <option value="Warranty">Warranty</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="Pending">Pending</option>
                                                <option value="Intaken">Intaken</option>
                                                <option value="Waiting for Spare">Waiting for Spare</option>
                                                <option value="Replaced">Replaced</option>
                                                <option value="Send to Service Center">Send to Service Center</option>
                                                <option value="Ready">Ready</option>
                                                <option value="Return">Return</option>
                                                <option value="Warranty">Warranty</option>
                                                <option value="Delivered">Delivered</option>
                                            </>
                                        )}
                                    </select>
                                )}
                            </div>

                            {/* Warranty Status Update Option */}
                            {job.status === 'Warranty' && (
                                <div style={{ background: '#f6f3eb', padding: '1rem', borderRadius: '4px', marginTop: '1rem', border: '1px solid var(--border-color)' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--accent)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Warranty Tracking</h4>
                                    
                                    {job.warranty_details && (
                                        <div style={{ marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                                            <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Warranty Details</span>
                                            <strong>{job.warranty_details}</strong>
                                        </div>
                                    )}

                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Warranty Status</label>
                                        {isDelivered ? (
                                            <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--accent)' }}>
                                                {job.warranty_status || 'Packed'}
                                            </strong>
                                        ) : (
                                            <select
                                                value={job.warranty_status || 'Packed'}
                                                onChange={handleWarrantyStatusChange}
                                                style={{
                                                    width: '100%',
                                                    padding: '0.4rem',
                                                    background: 'var(--panel-bg)',
                                                    border: '1px solid var(--border-color)',
                                                    color: 'var(--text-primary)',
                                                    borderRadius: '4px',
                                                    fontSize: '0.9rem',
                                                    cursor: 'pointer',
                                                    margin: 0
                                                }}
                                            >
                                                <option value="Packed">Packed</option>
                                                <option value="Sent">Sent</option>
                                                <option value="Delivered">Delivered</option>
                                                <option value="Item Returned">Item Returned</option>
                                                <option value="Warranty Rejected">Warranty Rejected</option>
                                            </select>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column - Logs & Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>

                        <div style={{ background: '#f6f3eb', padding: '1rem', borderRadius: '4px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', margin: '0 0 1rem 0' }}>Technician Logs</h3>

                            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem', maxHeight: '200px' }}>
                                {logs.map(lg => (
                                    <div key={lg.id} style={{ background: 'var(--panel-bg)', padding: '0.5rem', marginBottom: '0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                                        <div style={{ color: '#35a7e6', marginBottom: '2px' }}>{new Date(lg.created_at).toLocaleString('en-GB').replace(/\//g, '-')} - {lg.technician}</div>
                                        <div>{lg.issues}</div>
                                    </div>
                                ))}
                                {logs.length === 0 && <div style={{ color: '#4c566a', fontStyle: 'italic' }}>No logs yet...</div>}
                            </div>

                            {!isDelivered && (
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input type="text" value={newLog} onChange={e => setNewLog(e.target.value)} placeholder="Add a log entry..." style={{ flex: 1, padding: '0.5rem', background: 'var(--panel-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }} />
                                    <button onClick={handleAddLog} style={{ padding: '0.5rem 1rem', background: '#35a7e6', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><Save size={16} /></button>
                                </div>
                            )}
                        </div>

                        <div style={{ background: '#f6f3eb', padding: '1rem', borderRadius: '4px', marginTop: '1.5rem' }}>
                            {isDelivered ? (
                                <>
                                    <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', margin: '0 0 1rem 0', color: '#a3be8c' }}>Billing & Warranty (Locked)</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                                        <div>
                                            <span style={{ color: '#35a7e6', display: 'block', fontSize: '0.8rem' }}>Service Charge</span>
                                            <strong style={{ fontSize: '1.1rem' }}>₹{invoice.service_fees || 0}</strong>
                                        </div>
                                        <div>
                                            <span style={{ color: '#35a7e6', display: 'block', fontSize: '0.8rem' }}>Spare Cost</span>
                                            <strong style={{ fontSize: '1.1rem' }}>₹{invoice.part_costs || 0}</strong>
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                                        <span style={{ color: '#35a7e6', display: 'block', fontSize: '0.8rem' }}>Spares Used</span>
                                        {sparesList.length > 0 ? (
                                            <div style={{ marginTop: '4px' }}>
                                                {sparesList.map((s, idx) => (
                                                    <div key={idx} style={{ display: 'inline-block', background: '#f2f2f2', padding: '2px 8px', borderRadius: '4px', marginRight: '6px', marginBottom: '4px', fontSize: '0.85rem', border: '1px solid var(--border-color)' }}>
                                                        {s.name} (₹{s.cost})
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <strong>None</strong>
                                        )}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem', alignItems: 'end' }}>
                                        <div>
                                            <span style={{ color: '#35a7e6', display: 'block', fontSize: '0.8rem' }}>Warranty Period</span>
                                            <strong>{invoice.warranty || 'No warranty'}</strong>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{ color: '#35a7e6', display: 'block', fontSize: '0.8rem' }}>Total Amount</span>
                                            <strong style={{ fontSize: '1.25rem', color: '#a3be8c' }}>₹{invoice.total || (parseFloat(invoice.service_fees || 0) + parseFloat(invoice.part_costs || 0))}</strong>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', margin: '0 0 1rem 0', color: '#35a7e6' }}>Billing & Warranty</h3>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Service Charge (₹)</label>
                                            <input 
                                                type="number" 
                                                value={invoice.service_fees || ''} 
                                                onChange={e => setInvoice(prev => ({ ...prev, service_fees: e.target.value }))}
                                                placeholder="0"
                                                style={{ width: '100%', padding: '0.4rem', background: 'var(--panel-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', margin: 0 }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Spare Cost (₹)</label>
                                            <input 
                                                type="number" 
                                                disabled
                                                value={invoice.part_costs || 0} 
                                                style={{ width: '100%', padding: '0.4rem', background: '#f2f2f2', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', margin: 0, cursor: 'not-allowed' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Total Bill (₹)</label>
                                            <input 
                                                type="number" 
                                                disabled
                                                value={(parseFloat(invoice.service_fees) || 0) + (parseFloat(invoice.part_costs) || 0)} 
                                                style={{ width: '100%', padding: '0.4rem', background: '#f2f2f2', border: '1px solid var(--border-color)', color: 'var(--accent)', borderRadius: '4px', margin: 0, cursor: 'not-allowed', fontWeight: 'bold' }}
                                            />
                                        </div>
                                    </div>

                                    {/* Multiple Spares List */}
                                    <div style={{ marginBottom: '0.75rem' }}>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Spares Used</label>
                                        
                                        {sparesList.map((spare, index) => (
                                            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f6f3eb', padding: '4px 8px', borderRadius: '4px', marginBottom: '4px', fontSize: '0.85rem', border: '1px solid var(--border-color)' }}>
                                                <span>{spare.name}</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <strong>₹{spare.cost}</strong>
                                                    <button type="button" onClick={() => handleRemoveSpare(index)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0 4px', fontSize: '1rem', fontWeight: 'bold' }}>✕</button>
                                                </div>
                                            </div>
                                        ))}

                                        <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                                            <input 
                                                type="text" 
                                                value={newSpareName}
                                                onChange={e => setNewSpareName(e.target.value)}
                                                placeholder="Part name..."
                                                style={{ flex: 2, padding: '0.4rem', background: 'var(--panel-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', margin: 0 }}
                                            />
                                            <input 
                                                type="number" 
                                                value={newSpareCost}
                                                onChange={e => setNewSpareCost(e.target.value)}
                                                placeholder="Cost..."
                                                style={{ flex: 1, padding: '0.4rem', background: 'var(--panel-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', margin: 0 }}
                                            />
                                            <button 
                                                type="button" 
                                                onClick={handleAddSpare}
                                                style={{ background: 'var(--accent)', color: 'black', padding: '0 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
                                            >
                                                Add
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.5rem', alignItems: 'end' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Warranty Period</label>
                                            <input 
                                                type="text" 
                                                value={invoice.warranty || ''} 
                                                onChange={e => setInvoice(prev => ({ ...prev, warranty: e.target.value }))}
                                                placeholder="e.g. 3 Months / No warranty"
                                                style={{ width: '100%', padding: '0.4rem', background: 'var(--panel-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', margin: 0 }}
                                            />
                                        </div>
                                        <button 
                                            onClick={handleSaveInvoice} 
                                            style={{ 
                                                width: '100%', 
                                                padding: '0.5rem', 
                                                background: '#35a7e6', 
                                                color: 'var(--panel-bg)', 
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
                            <button onClick={() => setShowInvoice(true)} style={{ background: '#4c566a', color: '#fff', padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                <Printer size={20} /> Generate & Print Invoice
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
