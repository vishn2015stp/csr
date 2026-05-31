const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const crypto = require('crypto');

async function setupDB() {
    const db = await open({
      filename: './database.sqlite',
      driver: sqlite3.Database
    });

    await db.exec(`
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
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS complaints (
            id TEXT PRIMARY KEY,
            customer_id TEXT,
            item_name TEXT NOT NULL,
            serial_no TEXT,
            issue TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Pending',
            csr_number TEXT,
            flag_ok BOOLEAN DEFAULT 0,
            flag_r BOOLEAN DEFAULT 0,
            flag_w BOOLEAN DEFAULT 0,
            flag_p BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(customer_id) REFERENCES customers(id)
        );
        CREATE TABLE IF NOT EXISTS service_records (
            id TEXT PRIMARY KEY,
            complaint_id TEXT,
            technician TEXT,
            issues TEXT,
            resolution_status TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(complaint_id) REFERENCES complaints(id)
        );
        CREATE TABLE IF NOT EXISTS status_logs (
            id TEXT PRIMARY KEY,
            complaint_id TEXT,
            status TEXT,
            technician TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(complaint_id) REFERENCES complaints(id)
        );
        CREATE TABLE IF NOT EXISTS invoices (
            id TEXT PRIMARY KEY,
            complaint_id TEXT,
            receipt_number TEXT,
            service_fees REAL DEFAULT 0,
            part_costs REAL DEFAULT 0,
            total REAL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(complaint_id) REFERENCES complaints(id)
        );
        CREATE TABLE IF NOT EXISTS settings (
            setting_key TEXT PRIMARY KEY,
            setting_value TEXT
        );
    `);

    // Safely add service_type column if it doesn't already exist
    try {
        await db.exec("ALTER TABLE complaints ADD COLUMN service_type TEXT DEFAULT 'In-Shop';");
        console.log("Added service_type column to complaints.");
    } catch (err) {}

    // Add new service request fields
    try {
        await db.exec("ALTER TABLE complaints ADD COLUMN service_mode TEXT DEFAULT 'On Center';");
        await db.exec("ALTER TABLE complaints ADD COLUMN is_device_intaken INTEGER DEFAULT 1;");
        console.log("Added service_mode and is_device_intaken columns to complaints.");
    } catch (err) {}

    // Add address column to customers if it doesn't exist
    try {
        await db.exec("ALTER TABLE customers ADD COLUMN address TEXT;");
        console.log("Added address column to customers.");
    } catch (err) {}

    // Initialize default admin
    const adminUser = await db.get('SELECT * FROM users WHERE username = ?', ['admin']);
    if (!adminUser) {
        await db.run('INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)', [
            crypto.randomUUID(), 'admin', 'password123', 'ADMIN'
        ]);
        console.log('Default admin user created.');
    }

    return db;
}

module.exports = { setupDB };
