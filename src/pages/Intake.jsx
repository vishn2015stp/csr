import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { v4 as uuidv4 } from 'uuid'
import { useAuth } from '../context/AuthContext'

export default function Intake() {
    const { user } = useAuth()
    const [formData, setFormData] = useState({
        name: '', phone: '', email: '', address: '', location: '',
        itemName: '', brand: '', model: '', serialNo: '', issue: '', csrNumber: '', password: '', accessories: '', serviceMode: 'On Center',
        isWarranty: false, warrantyDetails: ''
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [successData, setSuccessData] = useState(null)
    const [recentIntakes, setRecentIntakes] = useState([])
    const [customers, setCustomers] = useState([])
    const [matchedCustomers, setMatchedCustomers] = useState([])
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
                    const matches = customers.filter(c => c.phone && c.phone.trim() === cleanPhone);
                    setMatchedCustomers(matches);
                } else {
                    setMatchedCustomers([]);
                }
            }
            return updated;
        });
    }

    const handleAutofill = (cust) => {
        if (cust) {
            setFormData(prev => ({
                ...prev,
                name: cust.name || '',
                email: cust.email || '',
                address: cust.address || '',
                location: cust.location || ''
            }));
            setMatchedCustomers([]);
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
                existingCust = customersList.find(c => 
                    c.phone && c.phone.trim() === formData.phone.trim() &&
                    c.name && c.name.trim().toLowerCase() === formData.name.trim().toLowerCase()
                );
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
                    location: formData.serviceMode === 'On Center' ? (existingCust.location || '') : formData.location
                });
            } else {
                customerId = uuidv4();
                await api.createCustomer({
                    id: customerId,
                    name: formData.name,
                    phone: formData.phone,
                    email: formData.email,
                    address: formData.address,
                    location: formData.serviceMode === 'On Center' ? '' : formData.location,
                    created_at: new Date().toISOString()
                });
            }

            const complaintId = uuidv4();
            const now = new Date().toISOString();
            const finalCsrNumber = formData.csrNumber.trim() || null;
            
            const isIntaken = formData.serviceMode === 'On Center' ? 1 : 0;
            
            const created = await api.createComplaint({
                id: complaintId,
                csr_number: finalCsrNumber,
                    customer_id: customerId,
                    item_name: formData.itemName || 'Onsite Service Request',
                    brand: formData.brand || null,
                    model: formData.model || null,
                    serial_no: formData.serialNo || '—',
                    password: formData.password || null,
                    accessories: formData.accessories || null,
                    issue: formData.issue || 'Onsite service request logged.',
                status: formData.isWarranty ? 'Warranty' : 'Pending',
                service_mode: formData.serviceMode,
                is_device_intaken: isIntaken,
                created_at: now,
                created_by: user?.username || 'admin',
                warranty_details: formData.isWarranty ? formData.warrantyDetails : '',
                warranty_status: formData.isWarranty ? 'Packed' : null
            });
 
            setSuccessData({
                id: complaintId,
                date: new Date(now).toLocaleString('en-GB').replace(/\//g, '-'),
                csrNumber: created.csr_number,
                customerName: formData.name,
                customerPhone: formData.phone,
                customerEmail: formData.email,
                itemName: formData.itemName || 'Onsite Service Request',
                serialNo: formData.serialNo || '—',
                serviceMode: formData.serviceMode,
                isDeviceIntaken: isIntaken === 1
            })
            setFormData({ name: '', phone: '', email: '', address: '', location: '', itemName: '', brand: '', model: '', serialNo: '', issue: '', csrNumber: '', password: '', accessories: '', serviceMode: 'On Center', isWarranty: false, warrantyDetails: '' })
            setMatchedCustomers([])
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
                            
                            {matchedCustomers.length > 0 && (
                                <div style={{ background: '#f6f3eb', padding: '0.75rem', borderRadius: '4px', marginBottom: '1.25rem', border: '1px solid #35a7e6' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>Previous customer records found:</span>
                                        <button type="button" onClick={() => setMatchedCustomers([])} style={{ background: '#bf616a', color: 'white', padding: '2px 6px', fontSize: '0.7rem', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Dismiss</button>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                                        {matchedCustomers.map((cust, idx) => (
                                            <div key={cust.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--panel-bg)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                                                <div style={{ color: 'var(--text-primary)', flex: 1, paddingRight: '10px' }}>
                                                    <strong>{cust.name}</strong>
                                                    {cust.email && <span style={{ color: '#35a7e6', marginLeft: '6px' }}>({cust.email})</span>}
                                                    {cust.address && <div style={{ color: 'var(--text-primary)', fontSize: '0.75rem', marginTop: '2px' }}>{cust.address}</div>}
                                                </div>
                                                <button type="button" onClick={() => handleAutofill(cust)} style={{ background: '#35a7e6', color: 'black', padding: '3px 8px', fontSize: '0.75rem', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Autofill</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <label>Full Name *</label>
                            <input type="text" name="name" required value={formData.name} onChange={handleChange} placeholder="Kal-El" />
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

                            <hr style={{ margin: '1rem 0', borderColor: 'var(--border-color)' }} />

                            <label>Custom CSR Number</label>
                            <input type="text" name="csrNumber" value={formData.csrNumber} onChange={handleChange} placeholder="Leave blank to auto-generate number" />

                             <hr style={{ margin: '1rem 0', borderColor: 'var(--border-color)' }} />

                             <div style={{ marginBottom: '1rem' }}>
                                 <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}>
                                     <input 
                                         type="checkbox" 
                                         name="isWarranty" 
                                         checked={formData.isWarranty} 
                                         onChange={handleChange} 
                                         style={{ width: 'auto', margin: 0 }}
                                     />
                                     Device Under Warranty
                                 </label>
                             </div>

                             {formData.isWarranty && (
                                 <div style={{ marginBottom: '1rem' }}>
                                     <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Warranty Details</label>
                                     <input 
                                         type="text" 
                                         name="warrantyDetails" 
                                         value={formData.warrantyDetails} 
                                         onChange={handleChange} 
                                         placeholder="e.g. Purchase date, brand warranty details..." 
                                     />
                                 </div>
                             )}

                             <hr style={{ margin: '1rem 0', borderColor: 'var(--border-color)' }} />

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
                            
                            <label>Brand</label>
                            <input type="text" name="brand" value={formData.brand} onChange={handleChange} placeholder="e.g. Apple, Samsung" />

                            <label>Model</label>
                            <input type="text" name="model" value={formData.model} onChange={handleChange} placeholder="e.g. A2338" />

                            <label>Serial Number (Optional)</label>
                            <input type="text" name="serialNo" value={formData.serialNo} onChange={handleChange} placeholder="e.g. C02..." />

                            <label>Device Password / PIN</label>
                            <input type="text" name="password" value={formData.password} onChange={handleChange} placeholder="If applicable" />

                            <label>Accessories</label>
                            <input type="text" name="accessories" value={formData.accessories} onChange={handleChange} placeholder="e.g. Charger, case" />

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
                <div className="print-receipt" style={{
                    color: '#000',
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
                        <div><b>Date:</b> {successData.date}</div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '4px' }}>CSR #: {successData.csrNumber}</div>
                    </div>

                    <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '8px 0', margin: '8px 0' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Customer</div>
                        <div>{successData.customerName}</div>
                        {printConfig.showCustomerPhone && <div>Tel: {successData.customerPhone}</div>}
                        {printConfig.showCustomerEmail && successData.customerEmail && <div>{successData.customerEmail}</div>}
                    </div>

                    <div style={{ margin: '8px 0' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Device</div>
                        <div>{successData.itemName}</div>
                        {printConfig.showSerialNo && <div>S/N: {successData.serialNo}</div>}
                        {printConfig.showServiceMode && <div>Mode: {successData.serviceMode}</div>}
                        {printConfig.showDeviceIntaken && <div>Intaken: {successData.isDeviceIntaken ? 'Yes' : 'No'}</div>}
                    </div>

                    <div style={{ borderTop: '1px dashed #000', margin: '10px 0', paddingTop: '8px', fontSize: '10px', textAlign: 'center', whiteSpace: 'pre-line' }}>
                        {printConfig.intakeTerms || 'Your footer terms here.'}
                    </div>
                </div>
            )}
        </div>
    )
}
