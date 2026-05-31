-- Hypertech Digital Database Schema

-- 1. Customers Table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Complaints Table
CREATE TABLE complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  serial_no TEXT NOT NULL,
  issue TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending', -- Can be: Pending, Repairing, Ready, Delivered
  service_mode TEXT DEFAULT 'On Center',
  is_device_intaken BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Service Records Table
CREATE TABLE service_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
  work_done TEXT,
  cost DECIMAL(10, 2),
  warranty_expiry DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
