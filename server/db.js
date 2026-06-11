const { Pool } = require('pg');
const crypto = require('crypto');

// Supabase PostgreSQL connection
// Use the pooler connection string (port 6543, transaction mode) for serverless
const connectionString = process.env.SUPABASE_DB_URL
    || process.env.DATABASE_URL
    || process.env.POSTGRES_URL;

const pool = new Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false // Supabase requires SSL
    }
});

// Avoid process crashes on unexpected idle connection drops
pool.on('error', (err) => {
    console.error('Unexpected error on idle pg client:', err.message);
});

let dbInitPromise = null;

function ensureInitialized() {
    if (!dbInitPromise) {
        dbInitPromise = (async () => {
            try {
                if (!connectionString) {
                    throw new Error("SUPABASE_DB_URL / DATABASE_URL environment variable is not defined. Set your Supabase PostgreSQL connection string.");
                }

                // Create tables in Supabase PostgreSQL
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
                        location TEXT,
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
                        csr_number TEXT UNIQUE NOT NULL,
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
                        spares TEXT,
                        warranty TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                    CREATE TABLE IF NOT EXISTS settings (
                        setting_key TEXT PRIMARY KEY,
                        setting_value TEXT
                    );
                `);

                // Safely add columns if they don't exist
                try {
                    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS session_id TEXT;");
                } catch (err) {
                    console.error("Error adding session_id to users:", err.message);
                }

                try {
                    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;");
                } catch (err) {
                    console.error("Error adding is_active to users:", err.message);
                }

                try {
                    await pool.query("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT 'In-Shop';");
                } catch (err) {
                    console.error("Error adding service_type:", err.message);
                }

                try {
                    await pool.query("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS warranty_details TEXT;");
                    await pool.query("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS warranty_status TEXT;");
                } catch (err) {
                    console.error("Error adding warranty fields:", err.message);
                }

                try {
                    await pool.query("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS service_mode TEXT DEFAULT 'On Center';");
                    await pool.query("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS is_device_intaken INTEGER DEFAULT 1;");
                    await pool.query("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS created_by TEXT;");
                    
                    // Backfill created_by from status_logs for existing records
                    await pool.query(`
                        UPDATE complaints c
                        SET created_by = sl.technician
                        FROM status_logs sl
                        WHERE c.id = sl.complaint_id 
                        AND sl.status = 'Pending (Request Created)'
                        AND c.created_by IS NULL;
                    `);
                } catch (err) {
                    console.error("Error adding service request fields:", err.message);
                }

                try {
                    await pool.query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT;");
                    await pool.query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS location TEXT;");
                } catch (err) {
                    console.error("Error adding customer address/location columns:", err.message);
                }

                try {
                    await pool.query("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS spares TEXT;");
                    await pool.query("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS warranty TEXT;");
                } catch (err) {
                    console.error("Error adding invoice billing columns:", err.message);
                }

                // Ensure csr_number is UNIQUE and NOT NULL
                try {
                    // Backfill any NULL csr_number values
                    await pool.query(`
                        UPDATE complaints 
                        SET csr_number = CAST(100000 + FLOOR(RANDOM() * 900000) AS TEXT) || '-' || SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 4)
                        WHERE csr_number IS NULL OR csr_number = ''
                    `);
                    // Deduplicate csr_number values
                    await pool.query(`
                        UPDATE complaints c
                        SET csr_number = c.id
                        WHERE csr_number IN (
                            SELECT csr_number FROM (
                                SELECT csr_number FROM complaints GROUP BY csr_number HAVING COUNT(*) > 1
                            ) dup
                        )
                    `);
                    // Add NOT NULL constraint if not already set
                    await pool.query("ALTER TABLE complaints ALTER COLUMN csr_number SET NOT NULL;");
                } catch (err) {
                    console.error("Error setting csr_number NOT NULL:", err.message);
                }

                try {
                    // Add UNIQUE constraint if not already present
                    await pool.query(`
                        DO $$
                        BEGIN
                            IF NOT EXISTS (
                                SELECT 1 FROM pg_constraint 
                                WHERE conname = 'complaints_csr_number_key'
                            ) THEN
                                ALTER TABLE complaints ADD CONSTRAINT complaints_csr_number_key UNIQUE (csr_number);
                            END IF;
                        END $$;
                    `);
                } catch (err) {
                    console.error("Error adding UNIQUE constraint on csr_number:", err.message);
                }

                // Initialize default admin
                const adminUserRes = await pool.query('SELECT * FROM users WHERE username = $1', ['admin']);
                if (adminUserRes.rows.length === 0) {
                    await pool.query('INSERT INTO users (id, username, password, role) VALUES ($1, $2, $3, $4)', [
                        crypto.randomUUID(), 'admin', 'password123', 'ADMIN'
                    ]);
                    console.log('Default admin user created.');
                }
                
                console.log("Supabase database schema checked and initialized.");
                return { success: true };
            } catch (err) {
                console.error("Database initialization failed:", err.message);
                return { success: false, error: err.message };
            }
        })();
    }
    return dbInitPromise;
}

module.exports = {
    query: (text, params) => pool.query(text, params),
    ensureInitialized
};
