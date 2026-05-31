const express = require('express');
const cors = require('cors');
const { setupDB } = require('./db.js');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve static frontend files from 'dist'
app.use(express.static(path.join(__dirname, '../dist')));

let db;

async function startServer() {
    db = await setupDB();

    // =============== USERS ===============
    app.post('/api/users/login', async (req, res) => {
        const { username, password } = req.body;
        const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
        if (user && user.password === password) {
            res.json({ success: true, user });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    });

    app.get('/api/users/:id', async (req, res) => {
        const user = await db.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    });

    app.get('/api/users', async (req, res) => {
        try {
            const users = await db.all('SELECT id, username, role FROM users');
            res.json(users);
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
            await db.run(
                'INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)',
                [id, username, password, role]
            );
            res.status(201).json({ id, username, role });
        } catch (err) {
            if (err.message.includes('UNIQUE')) {
                res.status(400).json({ error: 'Username already exists' });
            } else {
                res.status(500).json({ error: err.message });
            }
        }
    });

    app.delete('/api/users/:id', async (req, res) => {
        try {
            const user = await db.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
            if (user && user.username === 'admin') {
                return res.status(400).json({ error: 'Cannot delete default admin user' });
            }
            await db.run('DELETE FROM users WHERE id = ?', [req.params.id]);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // =============== CUSTOMERS ===============
    app.post('/api/customers', async (req, res) => {
        const id = req.body.id || uuidv4();
        const { name, phone, email, address, serial_no, delivery_date } = req.body;
        await db.run(
            'INSERT INTO customers (id, name, phone, email, address, serial_no, delivery_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, name, phone, email, address, serial_no, delivery_date]
        );
        const customer = await db.get('SELECT * FROM customers WHERE id = ?', [id]);
        res.json(customer);
    });

    app.put('/api/customers', async (req, res) => {
        // Upsert style
        const { id, name, phone, email, address, serial_no, delivery_date } = req.body;
        const existing = await db.get('SELECT * FROM customers WHERE id = ?', [id]);
        if (existing) {
            await db.run(
                'UPDATE customers SET name = ?, phone = ?, email = ?, address = ?, serial_no = ?, delivery_date = ? WHERE id = ?',
                [name, phone, email, address, serial_no, delivery_date, id]
            );
            const customer = await db.get('SELECT * FROM customers WHERE id = ?', [id]);
            res.json(customer);
        } else {
            await db.run(
                'INSERT INTO customers (id, name, phone, email, address, serial_no, delivery_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [id, name, phone, email, address, serial_no, delivery_date]
            );
            const customer = await db.get('SELECT * FROM customers WHERE id = ?', [id]);
            res.json(customer);
        }
    });

    app.get('/api/customers', async (req, res) => {
        const customers = await db.all('SELECT * FROM customers');
        res.json(customers);
    });

    app.get('/api/customers/:id', async (req, res) => {
        const customer = await db.get('SELECT * FROM customers WHERE id = ?', [req.params.id]);
        res.json(customer || null);
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
        const finalIsDeviceIntaken = is_device_intaken === false ? 0 : 1;

        await db.run(`
            INSERT INTO complaints 
            (id, customer_id, item_name, serial_no, issue, status, csr_number, flag_ok, flag_r, flag_w, flag_p, created_at, service_type, service_mode, is_device_intaken)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            id, customer_id, item_name, serial_no, issue, status || 'Pending', csr_number, 
            flag_ok ? 1 : 0, flag_r ? 1 : 0, flag_w ? 1 : 0, flag_p ? 1 : 0, ts, finalServiceType, finalServiceMode, finalIsDeviceIntaken
        ]);
        const complaint = await db.get('SELECT * FROM complaints WHERE id = ?', [id]);
        res.json(complaint);
    });

    app.get('/api/complaints', async (req, res) => {
        const { orderDesc } = req.query;
        let query = `
            SELECT c.*, cust.name as customerName, cust.phone as customerPhone 
            FROM complaints c 
            LEFT JOIN customers cust ON c.customer_id = cust.id
        `;
        if (orderDesc === 'true') {
            query += ' ORDER BY c.created_at DESC';
        }
        const complaints = await db.all(query);
        res.json(complaints);
    });

    app.get('/api/complaints/:id', async (req, res) => {
        const complaint = await db.get('SELECT * FROM complaints WHERE id = ?', [req.params.id]);
        res.json(complaint || null);
    });

    app.put('/api/complaints/:id', async (req, res) => {
        const keys = Object.keys(req.body);
        const values = Object.values(req.body);
        if (keys.length === 0) return res.json({});
        const setClause = keys.map(k => `${k} = ?`).join(', ');
        values.push(req.params.id);
        await db.run(`UPDATE complaints SET ${setClause} WHERE id = ?`, values);
        const complaint = await db.get('SELECT * FROM complaints WHERE id = ?', [req.params.id]);
        res.json(complaint);
    });

    // =============== SERVICE RECORDS ===============
    app.post('/api/service_records', async (req, res) => {
        const id = req.body.id || uuidv4();
        const { complaint_id, technician, issues, resolution_status, created_at } = req.body;
        const ts = created_at || new Date().toISOString();
        await db.run(
            'INSERT INTO service_records (id, complaint_id, technician, issues, resolution_status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [id, complaint_id, technician, issues, resolution_status, ts]
        );
        res.json({ id });
    });

    app.get('/api/service_records', async (req, res) => {
        const { complaint_id } = req.query;
        if (complaint_id) {
            const records = await db.all('SELECT * FROM service_records WHERE complaint_id = ? ORDER BY created_at DESC', [complaint_id]);
            res.json(records);
        } else {
            const records = await db.all('SELECT * FROM service_records');
            res.json(records);
        }
    });

    // =============== STATUS LOGS ===============
    app.post('/api/status_logs', async (req, res) => {
        const id = req.body.id || uuidv4();
        const { complaint_id, status, technician, created_at } = req.body;
        const ts = created_at || new Date().toISOString();
        await db.run(
            'INSERT INTO status_logs (id, complaint_id, status, technician, created_at) VALUES (?, ?, ?, ?, ?)',
            [id, complaint_id, status, technician, ts]
        );
        res.json({ id });
    });

    app.get('/api/status_logs', async (req, res) => {
        const { complaint_id } = req.query;
        if (complaint_id) {
            const logs = await db.all('SELECT * FROM status_logs WHERE complaint_id = ? ORDER BY created_at DESC', [complaint_id]);
            res.json(logs);
        } else {
            const logs = await db.all('SELECT * FROM status_logs');
            res.json(logs);
        }
    });

    // =============== INVOICES ===============
    app.post('/api/invoices', async (req, res) => {
        const id = req.body.id || uuidv4();
        const { complaint_id, receipt_number, service_fees, part_costs, total, created_at } = req.body;
        const ts = created_at || new Date().toISOString();
        const existing = await db.get('SELECT * FROM invoices WHERE complaint_id = ?', [complaint_id]);
        if (existing) {
            return res.json(existing);
        }
        await db.run(
            'INSERT INTO invoices (id, complaint_id, receipt_number, service_fees, part_costs, total, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, complaint_id, receipt_number, service_fees || 0, part_costs || 0, total || 0, ts]
        );
        res.json({ id });
    });

    app.get('/api/invoices', async (req, res) => {
        const { complaint_id } = req.query;
        if (complaint_id) {
            const row = await db.get('SELECT * FROM invoices WHERE complaint_id = ?', [complaint_id]);
            res.json(row ? [row] : []);
        } else {
            const rows = await db.all('SELECT * FROM invoices');
            res.json(rows);
        }
    });

    // =============== ANALYTICS / DASHBOARD ===============
    app.get('/api/dashboard', async (req, res) => {
        const total = await db.get('SELECT COUNT(*) as count FROM complaints');
        const pending = await db.get("SELECT COUNT(*) as count FROM complaints WHERE status = 'Pending'");
        const repairing = await db.get("SELECT COUNT(*) as count FROM complaints WHERE status = 'Repairing'");
        const ready = await db.get("SELECT COUNT(*) as count FROM complaints WHERE status = 'Ready'");
        const delivered = await db.get("SELECT COUNT(*) as count FROM complaints WHERE status = 'Delivered'");

        // Let's return all logs and complaints linked
        // Use LEFT JOIN similarly so Dashboard can see names too
        let query = `
            SELECT c.*, cust.name as customerName, cust.phone as customerPhone 
            FROM complaints c 
            LEFT JOIN customers cust ON c.customer_id = cust.id
        `;
        const complaints = await db.all(query);
        const status_logs = await db.all('SELECT * FROM status_logs');

        res.json({
            total: total.count,
            pending: pending.count,
            repairing: repairing.count,
            ready: ready.count,
            delivered: delivered.count,
            complaints,
            status_logs
        });
    });

    // =============== SETTINGS DOWNLOAD DB & TEMPLATES ===============
    app.get('/api/download-db', (req, res) => {
        const file = path.join(__dirname, 'database.sqlite');
        res.download(file, `hypertech_backup_${new Date().toISOString().split('T')[0]}.sqlite`);
    });

    app.get('/api/settings', async (req, res) => {
        const settings = await db.all('SELECT * FROM settings');
        const result = {};
        settings.forEach(s => result[s.setting_key] = s.setting_value);
        res.json(result);
    });

    app.put('/api/settings', async (req, res) => {
        const { setting_key, setting_value } = req.body;
        const existing = await db.get('SELECT * FROM settings WHERE setting_key = ?', [setting_key]);
        if (existing) {
            await db.run('UPDATE settings SET setting_value = ? WHERE setting_key = ?', [setting_value, setting_key]);
        } else {
            await db.run('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)', [setting_key, setting_value]);
        }
        res.json({ success: true });
    });

    // =============== FALLBACK FOR REACT ROUTER ===============
    app.use((req, res, next) => {
        if (req.method === 'GET' && !req.path.startsWith('/api')) {
            res.sendFile(path.join(__dirname, '../dist/index.html'));
        } else {
            next();
        }
    });

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Hyper-CSR Server running on port ${PORT}`);
        console.log(`Access locally: http://localhost:${PORT}`);
        console.log(`Access on network: http://<YOUR_IP_ADDRESS>:${PORT}`);
    });
}

startServer().catch(console.error);
