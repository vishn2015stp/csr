import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { v4 as uuidv4 } from 'uuid'

export default function Intake() {
    const [formData, setFormData] = useState({
        name: '', phone: '', email: '', address: '',
        itemName: '', serialNo: '', issue: '', csrNumber: '', serviceMode: 'On Center', isDeviceIntaken: true
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [successData, setSuccessData] = useState(null)
    const [recentIntakes, setRecentIntakes] = useState([])
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
    }

    useEffect(() => {
        fetchRecent()
    }, [])

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        try {

            let customerId;
            // Get all customers to find by phone (in a real app, backend would filter)
            // But doing it this way for simplicity as we lack a specific endpoint
            // Wait, we can fetch all or just create
            let existingCust;
            try {
                const res = await fetch('/api/customers');
                const customers = await res.json();
                existingCust = customers.find(c => c.phone === formData.phone);
            } catch(e) {}

            if (existingCust) {
                customerId = existingCust.id;
            } else {
                customerId = uuidv4();
                await api.createCustomer({
                    id: customerId,
                    name: formData.name,
                    phone: formData.phone,
                    email: formData.email,
                    address: formData.address,
                    created_at: new Date().toISOString()
                });
            }

            const complaintId = uuidv4();
            const now = new Date().toISOString();
            const finalCsrNumber = formData.csrNumber.trim() || Math.floor(100000 + Math.random() * 900000).toString();
            await api.createComplaint({
                id: complaintId,
                csr_number: finalCsrNumber,
                customer_id: customerId,
                item_name: formData.itemName,
                serial_no: formData.serialNo,
                issue: formData.issue,
                status: 'Pending',
                service_mode: formData.serviceMode,
                is_device_intaken: formData.isDeviceIntaken,
                created_at: now
            });

            setSuccessData({
                id: complaintId,
                date: new Date(now).toLocaleString(),
                csrNumber: finalCsrNumber,
                customerName: existingCust?.name || formData.name,
                customerPhone: formData.phone,
                itemName: formData.itemName,
                serialNo: formData.serialNo,
                serviceMode: formData.serviceMode,
                isDeviceIntaken: formData.isDeviceIntaken
            })
            setFormData({ name: '', phone: '', email: '', address: '', itemName: '', serialNo: '', issue: '', csrNumber: '', serviceMode: 'On Center', isDeviceIntaken: true })
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
                            <label>Full Name *</label>
                            <input type="text" name="name" required value={formData.name} onChange={handleChange} placeholder="Jane Doe" />
                            <label>Email</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="(Optional)" />
                            <label>Address</label>
                            <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="Street, City (Optional)" />

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

                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', background: '#1a1a1a', padding: '0.75rem', borderRadius: '4px', border: '1px solid #333' }}>
                                <input type="checkbox" name="isDeviceIntaken" checked={formData.isDeviceIntaken} onChange={handleChange} style={{ width: '1.2rem', height: '1.2rem' }} />
                                <strong>Intake Device for Service</strong>
                            </label>
                        </div>

                        <div className="card">
                            <h2>Device Details</h2>
                            <label>Item Name *</label>
                            <input type="text" name="itemName" required value={formData.itemName} onChange={handleChange} placeholder="e.g. MacBook Pro 2021" />
                            <label>Serial Number *</label>
                            <input type="text" name="serialNo" required value={formData.serialNo} onChange={handleChange} placeholder="e.g. C02..." />
                            <label>Issue Description *</label>
                            <textarea name="issue" required value={formData.issue} onChange={handleChange} rows="3" placeholder="Describe the problem..."></textarea>
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
