const API_URL = '/api';

export const api = {
    // ---- USERS ----
    async login(username, password) {
        const res = await fetch(`${API_URL}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            let message = 'Invalid credentials';
            try {
                const errData = JSON.parse(text);
                message = errData.error || errData.message || message;
                if (errData.details) {
                    message = `${message} (${errData.details})`;
                }
            } catch (e) {
                message = `Server Error (${res.status}): ${text.substring(0, 100)}`;
            }
            throw new Error(message);
        }
        const data = await res.json();
        return data.user;
    },
    async getUser(id) {
        const res = await fetch(`${API_URL}/users/${id}`);
        if (!res.ok) return null;
        return res.json();
    },

    // ---- CUSTOMERS ----
    async createCustomer(customer) {
        const res = await fetch(`${API_URL}/customers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(customer)
        });
        return res.json();
    },
    async getCustomer(id) {
        if (!id) return null;
        const res = await fetch(`${API_URL}/customers/${id}`);
        if (!res.ok) return null;
        return res.json();
    },
    async updateCustomer(customer) {
        const res = await fetch(`${API_URL}/customers`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(customer)
        });
        return res.json();
    },

    // ---- COMPLAINTS ----
    async createComplaint(complaint) {
        const res = await fetch(`${API_URL}/complaints`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(complaint)
        });
        return res.json();
    },
    async getComplaints(orderDesc = false) {
        const res = await fetch(`${API_URL}/complaints?orderDesc=${orderDesc}`);
        return res.json();
    },
    async getComplaint(id) {
        const res = await fetch(`${API_URL}/complaints/${id}`);
        if (!res.ok) return null;
        return res.json();
    },
    async updateComplaint(id, updates) {
        const res = await fetch(`${API_URL}/complaints/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        return res.json();
    },

    // ---- SERVICE RECORDS ----
    async createServiceRecord(record) {
        const res = await fetch(`${API_URL}/service_records`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record)
        });
        return res.json();
    },
    async getServiceRecords(complaint_id) {
        const url = complaint_id 
            ? `${API_URL}/service_records?complaint_id=${complaint_id}`
            : `${API_URL}/service_records`;
        const res = await fetch(url);
        return res.json();
    },

    // ---- STATUS LOGS ----
    async createStatusLog(log) {
        const res = await fetch(`${API_URL}/status_logs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(log)
        });
        return res.json();
    },
    async getStatusLogs(complaint_id) {
        const url = complaint_id 
            ? `${API_URL}/status_logs?complaint_id=${complaint_id}`
            : `${API_URL}/status_logs`;
        const res = await fetch(url);
        return res.json();
    },

    // ---- INVOICES ----
    async createInvoice(invoice) {
        const res = await fetch(`${API_URL}/invoices`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(invoice)
        });
        return res.json();
    },
    async getInvoices(complaint_id) {
        const url = complaint_id 
            ? `${API_URL}/invoices?complaint_id=${complaint_id}`
            : `${API_URL}/invoices`;
        const res = await fetch(url);
        return res.json();
    },

    // ---- DAHSBOARD ----
    async getDashboardStats() {
        const res = await fetch(`${API_URL}/dashboard`);
        return res.json();
    },
    // ---- SETTINGS ----
    getSettings: async () => {
        const res = await fetch(`${API_URL}/settings`);
        if (!res.ok) throw new Error('Failed to fetch settings');
        return res.json();
    },
    updateSetting: async (key, value) => {
        const res = await fetch(`${API_URL}/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ setting_key: key, setting_value: value })
        });
        if (!res.ok) throw new Error('Failed to update setting');
        return res.json();
    },
    // ---- USERS (MANAGEMENT) ----
    async getUsers() {
        const res = await fetch(`${API_URL}/users`);
        if (!res.ok) throw new Error('Failed to fetch users');
        return res.json();
    },
    async createUser(user) {
        const res = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to create user');
        }
        return res.json();
    },
    async deleteUser(id) {
        const res = await fetch(`${API_URL}/users/${id}`, {
            method: 'DELETE'
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to delete user');
        }
        return res.json();
    }
};
