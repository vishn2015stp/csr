import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/user.dart';
import '../models/complaint.dart';
import '../models/customer.dart';

const _baseUrl = 'https://csr.hypertechdigital.com/api';

class ApiService {
  // ── USERS ──────────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> login(String username, String password, {bool force = false}) async {
    final res = await http.post(
      Uri.parse('$_baseUrl/users/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'username': username, 'password': password, 'force': force, 'platform': 'app'}),
    );
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (!res.statusCode.toString().startsWith('2')) {
      throw Exception(data['message'] ?? data['error'] ?? 'Server error');
    }
    return data;
  }

  Future<UserModel?> getUser(String userId, {String? sessionId}) async {
    final url = sessionId != null
        ? '$_baseUrl/users/$userId?sessionId=$sessionId&platform=app'
        : '$_baseUrl/users/$userId';
    final res = await http.get(Uri.parse(url));
    if (res.statusCode != 200) return null;
    return UserModel.fromJson(jsonDecode(res.body));
  }

  Future<void> logout(String userId) async {
    await http.post(
      Uri.parse('$_baseUrl/users/logout'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'userId': userId, 'platform': 'app'}),
    );
  }

  Future<List<UserModel>> getUsers() async {
    final res = await http.get(Uri.parse('$_baseUrl/users'));
    if (res.statusCode != 200) throw Exception('Failed to fetch users');
    final List<dynamic> list = jsonDecode(res.body);
    return list.map((j) => UserModel.fromJson(j)).toList();
  }

  Future<UserModel> createUser(String username, String password, String role) async {
    final res = await http.post(
      Uri.parse('$_baseUrl/users'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'username': username, 'password': password, 'role': role}),
    );
    final data = jsonDecode(res.body);
    if (res.statusCode != 200 && res.statusCode != 201) {
      throw Exception(data['error'] ?? 'Failed to create user');
    }
    return UserModel.fromJson(data);
  }

  Future<void> deleteUser(String userId) async {
    final res = await http.delete(Uri.parse('$_baseUrl/users/$userId'));
    if (res.statusCode != 200) {
      final data = jsonDecode(res.body);
      throw Exception(data['error'] ?? 'Failed to delete user');
    }
  }

  Future<void> changePassword(String userId, String currentPassword, String newPassword) async {
    final res = await http.post(
      Uri.parse('$_baseUrl/users/change-password'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'userId': userId, 'currentPassword': currentPassword, 'newPassword': newPassword}),
    );
    final data = jsonDecode(res.body);
    if (res.statusCode != 200) {
      throw Exception(data['message'] ?? data['error'] ?? 'Failed to change password');
    }
  }

  // ── DASHBOARD ──────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getDashboardStats() async {
    final res = await http.get(Uri.parse('$_baseUrl/dashboard'));
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  // ── COMPLAINTS ─────────────────────────────────────────────────────────────

  Future<List<Complaint>> getComplaints({bool orderDesc = false}) async {
    final res = await http.get(Uri.parse('$_baseUrl/complaints?orderDesc=$orderDesc'));
    final List<dynamic> list = jsonDecode(res.body);
    return list.map((j) => Complaint.fromJson(j)).toList();
  }

  Future<Complaint?> getComplaint(String id) async {
    final res = await http.get(Uri.parse('$_baseUrl/complaints/$id'));
    if (res.statusCode != 200) return null;
    return Complaint.fromJson(jsonDecode(res.body));
  }

  Future<Complaint> createComplaint(Map<String, dynamic> data) async {
    final res = await http.post(
      Uri.parse('$_baseUrl/complaints'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(data),
    );
    return Complaint.fromJson(jsonDecode(res.body));
  }

  Future<Complaint> updateComplaint(String id, Map<String, dynamic> updates) async {
    final res = await http.put(
      Uri.parse('$_baseUrl/complaints/$id'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(updates),
    );
    return Complaint.fromJson(jsonDecode(res.body));
  }

  // ── CUSTOMERS ──────────────────────────────────────────────────────────────

  Future<Customer?> getCustomer(String id) async {
    final res = await http.get(Uri.parse('$_baseUrl/customers/$id'));
    if (res.statusCode != 200) return null;
    return Customer.fromJson(jsonDecode(res.body));
  }

  Future<List<Customer>> getCustomers() async {
    final res = await http.get(Uri.parse('$_baseUrl/customers'));
    if (res.statusCode != 200) return [];
    final List<dynamic> list = jsonDecode(res.body);
    return list.map((j) => Customer.fromJson(j)).toList();
  }

  Future<Customer> createCustomer(Map<String, dynamic> data) async {
    final res = await http.post(
      Uri.parse('$_baseUrl/customers'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(data),
    );
    return Customer.fromJson(jsonDecode(res.body));
  }

  Future<Customer> updateCustomer(Map<String, dynamic> data) async {
    final res = await http.put(
      Uri.parse('$_baseUrl/customers'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(data),
    );
    return Customer.fromJson(jsonDecode(res.body));
  }

  // ── SERVICE RECORDS ────────────────────────────────────────────────────────

  Future<List<ServiceRecord>> getServiceRecords({String? complaintId}) async {
    final url = complaintId != null
        ? '$_baseUrl/service_records?complaint_id=$complaintId'
        : '$_baseUrl/service_records';
    final res = await http.get(Uri.parse(url));
    final List<dynamic> list = jsonDecode(res.body);
    return list.map((j) => ServiceRecord.fromJson(j)).toList();
  }

  Future<ServiceRecord> createServiceRecord(Map<String, dynamic> data) async {
    final res = await http.post(
      Uri.parse('$_baseUrl/service_records'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(data),
    );
    return ServiceRecord.fromJson(jsonDecode(res.body));
  }

  // ── STATUS LOGS ────────────────────────────────────────────────────────────

  Future<List<StatusLog>> getStatusLogs({String? complaintId}) async {
    final url = complaintId != null
        ? '$_baseUrl/status_logs?complaint_id=$complaintId'
        : '$_baseUrl/status_logs';
    final res = await http.get(Uri.parse(url));
    final List<dynamic> list = jsonDecode(res.body);
    return list.map((j) => StatusLog.fromJson(j)).toList();
  }

  Future<StatusLog> createStatusLog(Map<String, dynamic> data) async {
    final res = await http.post(
      Uri.parse('$_baseUrl/status_logs'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(data),
    );
    return StatusLog.fromJson(jsonDecode(res.body));
  }

  // ── INVOICES ───────────────────────────────────────────────────────────────

  Future<List<Invoice>> getInvoices({String? complaintId}) async {
    final url = complaintId != null
        ? '$_baseUrl/invoices?complaint_id=$complaintId'
        : '$_baseUrl/invoices';
    final res = await http.get(Uri.parse(url));
    final List<dynamic> list = jsonDecode(res.body);
    return list.map((j) => Invoice.fromJson(j)).toList();
  }

  Future<Invoice> createInvoice(Map<String, dynamic> data) async {
    final res = await http.post(
      Uri.parse('$_baseUrl/invoices'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(data),
    );
    return Invoice.fromJson(jsonDecode(res.body));
  }

  // ── SETTINGS ───────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getSettings() async {
    final res = await http.get(Uri.parse('$_baseUrl/settings'));
    if (res.statusCode != 200) throw Exception('Failed to fetch settings');
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<void> updateSetting(String key, String value) async {
    final res = await http.put(
      Uri.parse('$_baseUrl/settings'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'setting_key': key, 'setting_value': value}),
    );
    if (res.statusCode != 200) throw Exception('Failed to update setting');
  }
}
