require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const db = require('./db.js');
const { randomUUID: uuidv4 } = require('crypto');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve static frontend files from 'dist' (used for local runs)
app.use(express.static(path.join(__dirname, '../dist')));

// Middleware to ensure database connection and schemas are initialized before query processing
app.use(async (req, res, next) => {
    try {
        const initResult = await db.ensureInitialized();
        if (initResult && !initResult.success) {
            return res.status(500).json({ error: 'Database initialization failed: ' + initResult.error });
        }
        next();
    } catch (err) {
        res.status(500).json({ error: 'Database initialization middleware error: ' + err.message });
    }
});

// =============== USERS ===============
app.post('/api/users/login', async (req, res) => {
    const { username, password, force } = req.body;
    try {
        const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];
        if (!user) {
            return res.status(401).json({ success: false, message: `User "${username}" not found in database` });
        }
        if (user.password !== password) {
            return res.status(401).json({ success: false, message: 'Password incorrect' });
        }

        // Check if user is active
        if (user.is_active === false || user.is_active === 0 || user.is_active === '0') {
            return res.status(403).json({ success: false, message: 'This account has been deactivated. Please contact your administrator.' });
        }

        // If user already has a session and login is not forced, alert client
        if (user.session_id && !force) {
            return res.json({ 
                success: false, 
                alreadyLoggedIn: true, 
                message: 'This user is already logged in on another device. Do you want to log out the other device and continue here?' 
            });
        }

        // Generate a new unique session ID
        const newSessionId = uuidv4();
        await db.query('UPDATE users SET session_id = $1 WHERE id = $2', [newSessionId, user.id]);

        const userObj = { ...user, password: undefined, session_id: newSessionId };
        res.json({ success: true, user: userObj, sessionId: newSessionId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users/logout', async (req, res) => {
    const { userId } = req.body;
    try {
        if (userId) {
            await db.query('UPDATE users SET session_id = NULL WHERE id = $1', [userId]);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users/change-password', async (req, res) => {
    const { userId, currentPassword, newPassword } = req.body;
    try {
        const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
        const user = result.rows[0];
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (user.password !== currentPassword) {
            return res.status(400).json({ error: 'Current password incorrect' });
        }
        await db.query('UPDATE users SET password = $1 WHERE id = $2', [newPassword, userId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/users/:id', async (req, res) => {
    const { sessionId } = req.query;
    try {
        const result = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
        const user = result.rows[0];
        if (user) {
            if (sessionId && user.session_id !== sessionId) {
                return res.status(401).json({ error: 'Session terminated. Access denied.' });
            }
            res.json(user);
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { password, role, is_active } = req.body;
    try {
        if (password) {
            await db.query(
                'UPDATE users SET password = $1, role = $2, is_active = $3 WHERE id = $4',
                [password, role, is_active, id]
            );
        } else {
            await db.query(
                'UPDATE users SET role = $1, is_active = $2 WHERE id = $3',
                [role, is_active, id]
            );
        }

        // Security override: if deactivated, terminate session
        if (is_active === false) {
            await db.query('UPDATE users SET session_id = NULL WHERE id = $1', [id]);
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const result = await db.query('SELECT id, username, role, is_active FROM users');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users', async (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
        const id = uuidv4();
        await db.query(
            'INSERT INTO users (id, username, password, role, is_active) VALUES ($1, $2, $3, $4, true)',
            [id, username, password, role]
        );
        res.status(201).json({ id, username, role, is_active: true });
    } catch (err) {
        if (err.message.includes('UNIQUE') || err.code === '23505') {
            res.status(400).json({ error: 'Username already exists' });
        } else {
            res.status(500).json({ error: err.message });
        }
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
        const user = result.rows[0];
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (user.username === 'admin') {
            return res.status(400).json({ error: 'Cannot delete default admin user' });
        }

        const username = user.username;

        // Count actions in status logs
        const statusLogsRes = await db.query('SELECT COUNT(*) FROM status_logs WHERE technician = $1', [username]);
        const statusLogsCount = parseInt(statusLogsRes.rows[0].count || statusLogsRes.rows[0].count_all || 0);

        // Count actions in service records
        const serviceRecordsRes = await db.query('SELECT COUNT(*) FROM service_records WHERE technician = $1', [username]);
        const serviceRecordsCount = parseInt(serviceRecordsRes.rows[0].count || serviceRecordsRes.rows[0].count_all || 0);

        // Count complaints created_by logs
        const createdCountRes = await db.query(
            "SELECT COUNT(*) FROM status_logs WHERE technician = $1 AND status LIKE '%Request Created%'",
            [username]
        );
        const createdCount = parseInt(createdCountRes.rows[0].count || createdCountRes.rows[0].count_all || 0);

        if (statusLogsCount > 0 || serviceRecordsCount > 0 || createdCount > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete this user because they have active logs or requests associated with their account. You can deactivate their account instead.' 
            });
        }

        await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =============== CUSTOMERS ===============
app.post('/api/customers', async (req, res) => {
    const id = req.body.id || uuidv4();
    const { name, phone, email, address, location, serial_no, delivery_date } = req.body;
    try {
        await db.query(
            'INSERT INTO customers (id, name, phone, email, address, location, serial_no, delivery_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [id, name, phone, email, address, location || '', serial_no, delivery_date]
        );
        const result = await db.query('SELECT * FROM customers WHERE id = $1', [id]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/customers', async (req, res) => {
    const { id, name, phone, email, address, location, serial_no, delivery_date } = req.body;
    try {
        const resExist = await db.query('SELECT * FROM customers WHERE id = $1', [id]);
        const existing = resExist.rows[0];
        if (existing) {
            await db.query(
                'UPDATE customers SET name = $1, phone = $2, email = $3, address = $4, location = $5, serial_no = $6, delivery_date = $7 WHERE id = $8',
                [name, phone, email, address, location || '', serial_no, delivery_date, id]
            );
        } else {
            await db.query(
                'INSERT INTO customers (id, name, phone, email, address, location, serial_no, delivery_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                [id, name, phone, email, address, location || '', serial_no, delivery_date]
            );
        }
        const result = await db.query('SELECT * FROM customers WHERE id = $1', [id]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/customers', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM customers');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/customers/:id', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
        res.json(result.rows[0] || null);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =============== COMPLAINTS ===============
app.post('/api/complaints', async (req, res) => {
    const id = req.body.id || uuidv4();
    const {
        customer_id, item_name, serial_no, issue, status, csr_number, flag_ok, flag_r, flag_w, flag_p, created_at, service_type, service_mode, is_device_intaken
    } = req.body;
    const ts = created_at || new Date().toISOString();
    const finalServiceType = service_type || 'In-Shop';
    const finalServiceMode = service_mode || 'On Center';
    let finalIsDeviceIntaken = 1;
    if (is_device_intaken !== undefined && is_device_intaken !== null) {
        finalIsDeviceIntaken = (is_device_intaken === 1 || is_device_intaken === true || is_device_intaken === '1') ? 1 : 0;
    } else {
        finalIsDeviceIntaken = finalServiceMode === 'Onsite' ? 0 : 1;
    }

    try {
        await db.query(`
            INSERT INTO complaints 
            (id, customer_id, item_name, serial_no, issue, status, csr_number, flag_ok, flag_r, flag_w, flag_p, created_at, service_type, service_mode, is_device_intaken)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        `, [
            id, customer_id, item_name, serial_no, issue, status || 'Pending', csr_number, 
            !!flag_ok, !!flag_r, !!flag_w, !!flag_p, ts, finalServiceType, finalServiceMode, finalIsDeviceIntaken
        ]);

        // Audit Log: Record request creation event and user in status_logs
        if (req.body.created_by) {
            const logId = uuidv4();
            await db.query(`
                INSERT INTO status_logs (id, complaint_id, status, technician, created_at)
                VALUES ($1, $2, $3, $4, $5)
            `, [logId, id, 'Pending (Request Created)', req.body.created_by, ts]);
        }

        const result = await db.query('SELECT * FROM complaints WHERE id = $1', [id]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/complaints', async (req, res) => {
    const { orderDesc } = req.query;
    let query = `
        SELECT c.*, cust.name as "customerName", cust.phone as "customerPhone" 
        FROM complaints c 
        LEFT JOIN customers cust ON c.customer_id = cust.id
    `;
    if (orderDesc === 'true') {
        query += ' ORDER BY c.created_at DESC';
    }
    try {
        const result = await db.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/complaints/:id', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM complaints WHERE id = $1', [req.params.id]);
        res.json(result.rows[0] || null);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/complaints/:id', async (req, res) => {
    try {
        const keys = Object.keys(req.body);
        const values = Object.values(req.body);
        if (keys.length === 0) return res.json({});

        // Block editing if already delivered or completed, and prevent reverting intaken status
        const currentComplaint = await db.query('SELECT status, is_device_intaken FROM complaints WHERE id = $1', [req.params.id]);
        if (currentComplaint.rows[0]) {
            const statusLower = currentComplaint.rows[0].status.trim().toLowerCase();
            if (statusLower === 'delivered' || statusLower === 'completed') {
                return res.status(400).json({ error: 'This service request is completed/delivered and is locked for editing.' });
            }
            if (currentComplaint.rows[0].is_device_intaken === 1 && req.body.is_device_intaken === 0) {
                return res.status(400).json({ error: 'Once a device is intaken for service, it cannot be changed back to not taken.' });
            }
        }
        
        const mappedValues = values.map((val, idx) => {
            const key = keys[idx];
            if (['flag_ok', 'flag_r', 'flag_w', 'flag_p'].includes(key)) {
                return !!val;
            }
            return val;
        });
        const setClause = keys.map((k, index) => `${k} = $${index + 1}`).join(', ');
        mappedValues.push(req.params.id);
        
        await db.query(`UPDATE complaints SET ${setClause} WHERE id = $${keys.length + 1}`, mappedValues);
        const result = await db.query('SELECT * FROM complaints WHERE id = $1', [req.params.id]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =============== SERVICE RECORDS ===============
app.post('/api/service_records', async (req, res) => {
    const id = req.body.id || uuidv4();
    const { complaint_id, technician, issues, resolution_status, created_at } = req.body;
    const ts = created_at || new Date().toISOString();
    try {
        await db.query(
            'INSERT INTO service_records (id, complaint_id, technician, issues, resolution_status, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, complaint_id, technician, issues, resolution_status, ts]
        );
        res.json({ id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/service_records', async (req, res) => {
    const { complaint_id } = req.query;
    try {
        if (complaint_id) {
            const result = await db.query('SELECT * FROM service_records WHERE complaint_id = $1 ORDER BY created_at DESC', [complaint_id]);
            res.json(result.rows);
        } else {
            const result = await db.query('SELECT * FROM service_records');
            res.json(result.rows);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =============== STATUS LOGS ===============
app.post('/api/status_logs', async (req, res) => {
    const id = req.body.id || uuidv4();
    const { complaint_id, status, technician, created_at } = req.body;
    const ts = created_at || new Date().toISOString();
    try {
        await db.query(
            'INSERT INTO status_logs (id, complaint_id, status, technician, created_at) VALUES ($1, $2, $3, $4, $5)',
            [id, complaint_id, status, technician, ts]
        );
        res.json({ id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/status_logs', async (req, res) => {
    const { complaint_id } = req.query;
    try {
        if (complaint_id) {
            const result = await db.query('SELECT * FROM status_logs WHERE complaint_id = $1 ORDER BY created_at DESC', [complaint_id]);
            res.json(result.rows);
        } else {
            const result = await db.query('SELECT * FROM status_logs');
            res.json(result.rows);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =============== INVOICES ===============
app.post('/api/invoices', async (req, res) => {
    const id = req.body.id || uuidv4();
    const { complaint_id, receipt_number, service_fees, part_costs, total, spares, warranty, created_at } = req.body;
    const ts = created_at || new Date().toISOString();
    try {
        // Block billing updates if the complaint is already delivered or completed
        const currentComplaint = await db.query('SELECT status FROM complaints WHERE id = $1', [complaint_id]);
        if (currentComplaint.rows[0]) {
            const statusLower = currentComplaint.rows[0].status.trim().toLowerCase();
            if (statusLower === 'delivered' || statusLower === 'completed') {
                return res.status(400).json({ error: 'This service request is already completed/delivered and billing is locked.' });
            }
        }

        const resExist = await db.query('SELECT * FROM invoices WHERE complaint_id = $1', [complaint_id]);
        const existing = resExist.rows[0];
        if (existing) {
            await db.query(
                'UPDATE invoices SET receipt_number = $1, service_fees = $2, part_costs = $3, total = $4, spares = $5, warranty = $6 WHERE complaint_id = $7',
                [receipt_number || existing.receipt_number, service_fees ?? 0, part_costs ?? 0, total ?? 0, spares || '', warranty || '', complaint_id]
            );
            const updated = await db.query('SELECT * FROM invoices WHERE complaint_id = $1', [complaint_id]);
            return res.json(updated.rows[0]);
        }
        
        const invoiceNum = receipt_number || ('INV-' + Date.now().toString().slice(-6));
        await db.query(
            'INSERT INTO invoices (id, complaint_id, receipt_number, service_fees, part_costs, total, spares, warranty, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [id, complaint_id, invoiceNum, service_fees ?? 0, part_costs ?? 0, total ?? 0, spares || '', warranty || '', ts]
        );
        const created = await db.query('SELECT * FROM invoices WHERE id = $1', [id]);
        res.json(created.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/invoices', async (req, res) => {
    const { complaint_id } = req.query;
    try {
        if (complaint_id) {
            const result = await db.query('SELECT * FROM invoices WHERE complaint_id = $1', [complaint_id]);
            res.json(result.rows[0] ? [result.rows[0]] : []);
        } else {
            const result = await db.query('SELECT * FROM invoices');
            res.json(result.rows);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =============== ANALYTICS / DASHBOARD ===============
app.get('/api/dashboard', async (req, res) => {
    try {
        const [
            totalRes,
            pendingRes,
            repairingRes,
            readyRes,
            deliveredRes,
            complaintsRes,
            logsRes
        ] = await Promise.all([
            db.query('SELECT COUNT(*) as count FROM complaints'),
            db.query("SELECT COUNT(*) as count FROM complaints WHERE status = 'Pending'"),
            db.query("SELECT COUNT(*) as count FROM complaints WHERE status = 'Repairing'"),
            db.query("SELECT COUNT(*) as count FROM complaints WHERE status = 'Ready'"),
            db.query("SELECT COUNT(*) as count FROM complaints WHERE status = 'Delivered'"),
            db.query(`
                SELECT c.*, cust.name as "customerName", cust.phone as "customerPhone" 
                FROM complaints c 
                LEFT JOIN customers cust ON c.customer_id = cust.id
            `),
            db.query('SELECT * FROM status_logs')
        ]);

        res.json({
            total: parseInt(totalRes.rows[0].count, 10),
            pending: parseInt(pendingRes.rows[0].count, 10),
            repairing: parseInt(repairingRes.rows[0].count, 10),
            ready: parseInt(readyRes.rows[0].count, 10),
            delivered: parseInt(deliveredRes.rows[0].count, 10),
            complaints: complaintsRes.rows,
            status_logs: logsRes.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =============== SETTINGS DOWNLOAD DB & TEMPLATES ===============
app.get('/api/download-db', async (req, res) => {
    try {
        const tables = ['users', 'customers', 'complaints', 'service_records', 'status_logs', 'invoices', 'settings'];
        const backup = {};
        for (const table of tables) {
            const result = await db.query(`SELECT * FROM ${table}`);
            backup[table] = result.rows;
        }
        res.setHeader('Content-Type', 'application/json');
        res.attachment(`hypertech_backup_${new Date().toISOString().split('T')[0]}.json`);
        res.send(JSON.stringify(backup, null, 2));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/settings', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM settings');
        const settingsObj = {};
        result.rows.forEach(s => settingsObj[s.setting_key] = s.setting_value);
        res.json(settingsObj);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/settings', async (req, res) => {
    const { setting_key, setting_value } = req.body;
    try {
        const resExist = await db.query('SELECT * FROM settings WHERE setting_key = $1', [setting_key]);
        const existing = resExist.rows[0];
        if (existing) {
            await db.query('UPDATE settings SET setting_value = $1 WHERE setting_key = $2', [setting_value, setting_key]);
        } else {
            await db.query('INSERT INTO settings (setting_key, setting_value) VALUES ($1, $2)', [setting_key, setting_value]);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =============== FALLBACK FOR REACT ROUTER ===============
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../dist/index.html'));
    } else {
        next();
    }
});

// Start local listener if not running as a Vercel Serverless Function
if (!process.env.VERCEL) {
    db.ensureInitialized().then(() => {
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Hyper-CSR Server running on port ${PORT}`);
            console.log(`Access locally: http://localhost:${PORT}`);
        });
    }).catch(console.error);
}

module.exports = app;
