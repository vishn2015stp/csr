const { Pool } = require('pg');
const crypto = require('crypto');

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false // Neon serverless Postgres requires SSL connection
    }
});

let dbInitPromise = null;

function ensureInitialized() {
    if (!dbInitPromise) {
        dbInitPromise = (async () => {
            if (!connectionString) {
                throw new Error("DATABASE_URL environment variable is not defined");
            }

            // Create tables in PostgreSQL
            await pool.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    role TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS customers (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    phone TEXT NOT NULL,
                    email TEXT,
                    address TEXT,
                    serial_no TEXT,
                    delivery_date TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS complaints (
                    id TEXT PRIMARY KEY,
                    customer_id TEXT REFERENCES customers(id),
                    item_name TEXT NOT NULL,
                    serial_no TEXT,
                    issue TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'Pending',
                    csr_number TEXT,
                    flag_ok BOOLEAN DEFAULT FALSE,
                    flag_r BOOLEAN DEFAULT FALSE,
                    flag_w BOOLEAN DEFAULT FALSE,
                    flag_p BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    service_type TEXT DEFAULT 'In-Shop',
                    service_mode TEXT DEFAULT 'On Center',
                    is_device_intaken INTEGER DEFAULT 1
                );
                CREATE TABLE IF NOT EXISTS service_records (
                    id TEXT PRIMARY KEY,
                    complaint_id TEXT REFERENCES complaints(id),
                    technician TEXT,
                    issues TEXT,
                    resolution_status TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS status_logs (
                    id TEXT PRIMARY KEY,
                    complaint_id TEXT REFERENCES complaints(id),
                    status TEXT,
                    technician TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS invoices (
                    id TEXT PRIMARY KEY,
                    complaint_id TEXT REFERENCES complaints(id),
                    receipt_number TEXT,
                    service_fees REAL DEFAULT 0,
                    part_costs REAL DEFAULT 0,
                    total REAL DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS settings (
                    setting_key TEXT PRIMARY KEY,
                    setting_value TEXT
                );
            `);

            // Safely add columns if they don't exist
            try {
                await pool.query("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT 'In-Shop';");
            } catch (err) {
                console.error("Error adding service_type:", err.message);
            }

            try {
                await pool.query("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS service_mode TEXT DEFAULT 'On Center';");
                await pool.query("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS is_device_intaken INTEGER DEFAULT 1;");
            } catch (err) {
                console.error("Error adding service request fields:", err.message);
            }

            try {
                await pool.query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT;");
            } catch (err) {
                console.error("Error adding address column:", err.message);
            }

            // Initialize default admin
            const adminUserRes = await pool.query('SELECT * FROM users WHERE username = $1', ['admin']);
            if (adminUserRes.rows.length === 0) {
                await pool.query('INSERT INTO users (id, username, password, role) VALUES ($1, $2, $3, $4)', [
                    crypto.randomUUID(), 'admin', 'password123', 'ADMIN'
                ]);
                console.log('Default admin user created.');
            }
            console.log("Database schema checked and initialized.");
        })();
    }
    return dbInitPromise;
}

module.exports = {
    query: (text, params) => pool.query(text, params),
    ensureInitialized
};
