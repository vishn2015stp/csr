import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { v4 as uuidv4 } from 'uuid'

export default function Intake() {
    const [formData, setFormData] = useState({
        name: '', phone: '', email: '', address: '', location: '',
        itemName: '', serialNo: '', issue: '', csrNumber: '', serviceMode: 'On Center'
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [successData, setSuccessData] = useState(null)
    const [recentIntakes, setRecentIntakes] = useState([])
    const [customers, setCustomers] = useState([])
    const [matchedCustomer, setMatchedCustomer] = useState(null)
    const [printConfig, setPrintConfig] = useState({
        shopName: 'Hypertech Digital',
        shopAddress: '',
        showTechnician: true,
        showSerialNo: true,
        intakeTerms: 'Not responsible for data loss.\nEstimate valid for 7 days.'
    })

    const fetchRecent = async () => {
        const complaintsList = await api.getComplaints(true); // orderDesc = true
        setRecentIntakes(complaintsList.slice(0, 5));
        try {
            const settings = await api.getSettings();
            if (settings.print_settings) {
                setPrintConfig(JSON.parse(settings.print_settings));
            }
        } catch (e) {}
        try {
            const res = await fetch('/api/customers');
            const custs = await res.json();
            setCustomers(custs);
        } catch (e) {}
    }

    useEffect(() => {
        fetchRecent()
    }, [])

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData(prev => {
            const updated = { ...prev, [e.target.name]: value };
            if (e.target.name === 'phone') {
                const cleanPhone = value.trim();
                if (cleanPhone.length >= 4) {
                    const match = customers.find(c => c.phone && c.phone.trim() === cleanPhone);
                    if (match) {
                        setMatchedCustomer(match);
                    } else {
                        setMatchedCustomer(null);
                    }
                } else {
                    setMatchedCustomer(null);
                }
            }
            return updated;
        });
    }

    const handleAutofill = () => {
        if (matchedCustomer) {
            setFormData(prev => ({
                ...prev,
                name: matchedCustomer.name || '',
                email: matchedCustomer.email || '',
                address: matchedCustomer.address || '',
                location: matchedCustomer.location || ''
            }));
            setMatchedCustomer(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        try {
            let customerId;
            let existingCust;
            try {
                const res = await fetch('/api/customers');
                const customersList = await res.json();
                existingCust = customersList.find(c => c.phone === formData.phone.trim());
            } catch(e) {}

            if (existingCust) {
                customerId = existingCust.id;
                // Update customer to capture latest details, address, and location
                await api.updateCustomer({
                    id: customerId,
                    name: formData.name,
                    phone: formData.phone,
                    email: formData.email,
                    address: formData.address,
                    location: formData.location
                });
            } else {
                customerId = uuidv4();
                await api.createCustomer({
                    id: customerId,
                    name: formData.name,
                    phone: formData.phone,
                    email: formData.email,
                    address: formData.address,
                    location: formData.location,
                    created_at: new Date().toISOString()
                });
            }

            const complaintId = uuidv4();
            const now = new Date().toISOString();
            const finalCsrNumber = formData.csrNumber.trim() || Math.floor(100000 + Math.random() * 900000).toString();
            
            const isIntaken = formData.serviceMode === 'On Center' ? 1 : 0;
            
            await api.createComplaint({
                id: complaintId,
                csr_number: finalCsrNumber,
                customer_id: customerId,
                item_name: formData.itemName || 'Onsite Service Request',
                serial_no: formData.serialNo || '—',
                issue: formData.issue || 'Onsite service request logged.',
                status: 'Pending',
                service_mode: formData.serviceMode,
                is_device_intaken: isIntaken,
                created_at: now
            });

            setSuccessData({
                id: complaintId,
                date: new Date(now).toLocaleString(),
                csrNumber: finalCsrNumber,
                customerName: formData.name,
                customerPhone: formData.phone,
                itemName: formData.itemName || 'Onsite Service Request',
                serialNo: formData.serialNo || '—',
                serviceMode: formData.serviceMode,
                isDeviceIntaken: isIntaken === 1
            })
            setFormData({ name: '', phone: '', email: '', address: '', location: '', itemName: '', serialNo: '', issue: '', csrNumber: '', serviceMode: 'On Center' })
            setMatchedCustomer(null)
            fetchRecent()
        } catch (err) {
            console.error(err)
            setError("Failed to submit intake: " + err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="container">
            <h1 className="non-print">New Service Request</h1>
            {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem' }} className="non-print">{error}</div>}

            {!successData ? (
                <form onSubmit={handleSubmit} className="non-print">
                    <div className="grid-2">
                        <div className="card">
                            <h2>Customer Details</h2>
                            <label>Phone Number *</label>
                            <input type="tel" name="phone" required value={formData.phone} onChange={handleChange} placeholder="e.g. 555-0100" />
                            
                            {matchedCustomer && (
                                <div style={{ background: '#3b4252', padding: '0.75rem', borderRadius: '4px', marginBottom: '1.25rem', border: '1px solid #88c0d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#eceff4' }}>Previous details found: <strong>{matchedCustomer.name}</strong></span>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button type="button" onClick={handleAutofill} style={{ background: '#88c0d0', color: 'black', padding: '3px 8px', fontSize: '0.75rem', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Autofill</button>
                                        <button type="button" onClick={() => setMatchedCustomer(null)} style={{ background: '#bf616a', color: 'white', padding: '3px 8px', fontSize: '0.75rem', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Dismiss</button>
                                    </div>
                                </div>
                             )}

                            <label>Full Name *</label>
                            <input type="text" name="name" required value={formData.name} onChange={handleChange} placeholder="Jane Doe" />
                            <label>Email</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="(Optional)" />
                            
                            <label>Address {formData.serviceMode === 'Onsite' ? '*' : '(Optional)'}</label>
                            <input type="text" name="address" required={formData.serviceMode === 'Onsite'} value={formData.address} onChange={handleChange} placeholder={formData.serviceMode === 'Onsite' ? "Enter full address (Required for Onsite)" : "Street, City (Optional)"} />
                            
                            {formData.serviceMode === 'Onsite' && (
                                <>
                                    <label>Location (Map Link / Landmark)</label>
                                    <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="e.g. Near metro station or landmarks" />
                                </>
                            )}

                            <hr style={{ margin: '1rem 0', borderColor: '#333' }} />

                            <label>Custom CSR Number</label>
                            <input type="text" name="csrNumber" value={formData.csrNumber} onChange={handleChange} placeholder="Leave blank to auto-generate number" />

                            <hr style={{ margin: '1rem 0', borderColor: '#333' }} />

                            <label style={{ display: 'block', color: 'var(--accent)', marginBottom: '0.5rem' }}>Mode of Service</label>
                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input type="radio" name="serviceMode" value="On Center" checked={formData.serviceMode === 'On Center'} onChange={handleChange} />
                                    On Center
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input type="radio" name="serviceMode" value="Onsite" checked={formData.serviceMode === 'Onsite'} onChange={handleChange} />
                                    Onsite
                                </label>
                            </div>
                        </div>

                        <div className="card">
                            <h2>Device Details</h2>
                            <label>Item Name {formData.serviceMode === 'On Center' ? '*' : '(Optional)'}</label>
                            <input type="text" name="itemName" required={formData.serviceMode === 'On Center'} value={formData.itemName} onChange={handleChange} placeholder="e.g. MacBook Pro 2021" />
                            
                            <label>Serial Number {formData.serviceMode === 'On Center' ? '*' : '(Optional)'}</label>
                            <input type="text" name="serialNo" required={formData.serviceMode === 'On Center'} value={formData.serialNo} onChange={handleChange} placeholder="e.g. C02..." />
                            
                            <label>Issue Description {formData.serviceMode === 'On Center' ? '*' : '(Optional)'}</label>
                            <textarea name="issue" required={formData.serviceMode === 'On Center'} value={formData.issue} onChange={handleChange} rows="3" placeholder="Describe the problem..."></textarea>
                        </div>
                    </div>
                    <button type="submit" disabled={loading} style={{ width: '100%', fontSize: '1.1rem', padding: '1rem' }}>
                        {loading ? 'Submitting...' : 'Submit Request'}
                    </button>
                </form>
            ) : (
                <div className="card non-print">
                    <h2 style={{ color: 'var(--success)' }}>Service Request Logged Successfully!</h2>
                    <p>Request registered for {successData.itemName}.</p>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                        <button onClick={() => window.print()}>Print Receipt</button>
                        <button className="outline" onClick={() => setSuccessData(null)}>Next Request</button>
                    </div>
                </div>
            )}

            {/* Print receipt */}
            {successData && (
                <div className="print-receipt">
                    <div className="print-header">
                        <h2>{printConfig.shopName}</h2>
                        {printConfig.shopAddress && <p style={{ fontSize: '0.8rem', margin: '5px 0', whiteSpace: 'pre-line' }}>{printConfig.shopAddress}</p>}
                        <p style={{ fontSize: '0.9rem', margin: '5px 0 0 0', fontWeight: 'bold' }}>Service Request Receipt</p>
                    </div>
                    <p><strong>Date:</strong> {successData.date}</p>
                    <p><strong>Request ID:</strong> <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>#{successData.csrNumber}</span></p>
                    <br />
                    <p><strong>Customer:</strong> {successData.customerName}</p>
                    <p><strong>Phone:</strong> {successData.customerPhone}</p>
                    <br />
                    <p><strong>Item:</strong> {successData.itemName}</p>
                    {printConfig.showSerialNo && <p><strong>S/N:</strong> {successData.serialNo}</p>}
                    <p><strong>Service Mode:</strong> {successData.serviceMode}</p>
                    <p><strong>Device Intaken:</strong> {successData.isDeviceIntaken ? 'Yes' : 'No'}</p>
                    <div className="print-terms" style={{ whiteSpace: 'pre-line' }}>
                        {printConfig.intakeTerms}
                    </div>
                </div>
            )}
        </div>
    )
}
