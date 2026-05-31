import Dexie from 'dexie';

export const db = new Dexie('HyperCSRDatabase');

// Define the database schema
// uuid strings are standard, so we specify 'id' as the primary key.
// We also index properties that we will search on.
db.version(5).stores({
    users: 'id, username, role', // role: ADMIN or STAFF
    customers: 'id, phone, name, email, serial_no, delivery_date',
    complaints: 'id, customer_id, serial_no, item_name, status, created_at, csr_number, flag_ok, flag_r, flag_w, flag_p',
    service_records: 'id, complaint_id, created_at, technician, issues, resolution_status',
    status_logs: 'id, complaint_id, status, technician, created_at',
    invoices: 'id, complaint_id, receipt_number, created_at'
});

// Initialize default Super Admin if no users exist
db.on('populate', async () => {
    await db.users.add({
        id: crypto.randomUUID(),
        username: 'admin',
        password: 'password123', // In a real app this should be hashed, keeping simple for local
        role: 'ADMIN'
    });
});
