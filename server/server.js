require('dotenv').config();
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
        try {
            const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
            const user = result.rows[0];
            if (user && user.password === password) {
                res.json({ success: true, user });
            } else {
                res.status(401).json({ success: false, message: 'Invalid credentials' });
            }
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.get('/api/users/:id', async (req, res) => {
        try {
            const result = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
            const user = result.rows[0];
            if (user) {
                res.json(user);
            } else {
                res.status(404).json({ error: 'User not found' });
            }
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.get('/api/users', async (req, res) => {
        try {
            const result = await db.query('SELECT id, username, role FROM users');
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
                'INSERT INTO users (id, username, password, role) VALUES ($1, $2, $3, $4)',
                [id, username, password, role]
            );
            res.status(201).json({ id, username, role });
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
            if (user && user.username === 'admin') {
                return res.status(400).json({ error: 'Cannot delete default admin user' });
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
        const { name, phone, email, address, serial_no, delivery_date } = req.body;
        try {
            await db.query(
                'INSERT INTO customers (id, name, phone, email, address, serial_no, delivery_date) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [id, name, phone, email, address, serial_no, delivery_date]
            );
            const result = await db.query('SELECT * FROM customers WHERE id = $1', [id]);
            res.json(result.rows[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.put('/api/customers', async (req, res) => {
        const { id, name, phone, email, address, serial_no, delivery_date } = req.body;
        try {
            const resExist = await db.query('SELECT * FROM customers WHERE id = $1', [id]);
            const existing = resExist.rows[0];
            if (existing) {
                await db.query(
                    'UPDATE customers SET name = $1, phone = $2, email = $3, address = $4, serial_no = $5, delivery_date = $6 WHERE id = $7',
                    [name, phone, email, address, serial_no, delivery_date, id]
                );
            } else {
                await db.query(
                    'INSERT INTO customers (id, name, phone, email, address, serial_no, delivery_date) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [id, name, phone, email, address, serial_no, delivery_date]
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
        const finalIsDeviceIntaken = is_device_intaken === false ? 0 : 1;

        try {
            await db.query(`
                INSERT INTO complaints 
                (id, customer_id, item_name, serial_no, issue, status, csr_number, flag_ok, flag_r, flag_w, flag_p, created_at, service_type, service_mode, is_device_intaken)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            `, [
                id, customer_id, item_name, serial_no, issue, status || 'Pending', csr_number, 
                !!flag_ok, !!flag_r, !!flag_w, !!flag_p, ts, finalServiceType, finalServiceMode, finalIsDeviceIntaken
            ]);
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
        const { complaint_id, receipt_number, service_fees, part_costs, total, created_at } = req.body;
        const ts = created_at || new Date().toISOString();
        try {
            const resExist = await db.query('SELECT * FROM invoices WHERE complaint_id = $1', [complaint_id]);
            const existing = resExist.rows[0];
            if (existing) {
                return res.json(existing);
            }
            await db.query(
                'INSERT INTO invoices (id, complaint_id, receipt_number, service_fees, part_costs, total, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [id, complaint_id, receipt_number, service_fees || 0, part_costs || 0, total || 0, ts]
            );
            res.json({ id });
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
            const totalRes = await db.query('SELECT COUNT(*) as count FROM complaints');
            const pendingRes = await db.query("SELECT COUNT(*) as count FROM complaints WHERE status = 'Pending'");
            const repairingRes = await db.query("SELECT COUNT(*) as count FROM complaints WHERE status = 'Repairing'");
            const readyRes = await db.query("SELECT COUNT(*) as count FROM complaints WHERE status = 'Ready'");
            const deliveredRes = await db.query("SELECT COUNT(*) as count FROM complaints WHERE status = 'Delivered'");

            let query = `
                SELECT c.*, cust.name as "customerName", cust.phone as "customerPhone" 
                FROM complaints c 
                LEFT JOIN customers cust ON c.customer_id = cust.id
            `;
            const complaintsRes = await db.query(query);
            const logsRes = await db.query('SELECT * FROM status_logs');

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

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Hyper-CSR Server running on port ${PORT}`);
        console.log(`Access locally: http://localhost:${PORT}`);
        console.log(`Access on network: http://<YOUR_IP_ADDRESS>:${PORT}`);
    });
}

startServer().catch(console.error);
