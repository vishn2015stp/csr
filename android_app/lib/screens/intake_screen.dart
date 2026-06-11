import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../models/customer.dart';
import '../theme.dart';
import '../widgets/app_drawer.dart';

class IntakeScreen extends StatefulWidget {
  const IntakeScreen({super.key});

  @override
  State<IntakeScreen> createState() => _IntakeScreenState();
}

class _IntakeScreenState extends State<IntakeScreen> {
  final _api = ApiService();
  final _formKey = GlobalKey<FormState>();

  // Customer fields
  final _phoneCtrl = TextEditingController();
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  final _locationCtrl = TextEditingController();
  final _csrNumberCtrl = TextEditingController();

  // Device fields
  final _itemNameCtrl = TextEditingController();
  final _serialCtrl = TextEditingController();
  final _problemCtrl = TextEditingController();
  final _warrantyDetailsCtrl = TextEditingController();

  String _serviceMode = 'On Center'; // matches web: 'On Center' or 'Onsite'
  bool _isWarranty = false;
  bool _submitting = false;
  String? _error;

  // Customer autofill
  List<Customer> _allCustomers = [];
  List<Customer> _matchedCustomers = [];
  bool _loadingCustomers = false;

  @override
  void initState() {
    super.initState();
    _loadCustomers();
  }

  @override
  void dispose() {
    _phoneCtrl.dispose();
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _addressCtrl.dispose();
    _locationCtrl.dispose();
    _csrNumberCtrl.dispose();
    _itemNameCtrl.dispose();
    _serialCtrl.dispose();
    _problemCtrl.dispose();
    _warrantyDetailsCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadCustomers() async {
    setState(() => _loadingCustomers = true);
    try {
      final customers = await _api.getCustomers();
      setState(() { _allCustomers = customers; _loadingCustomers = false; });
    } catch (_) {
      setState(() => _loadingCustomers = false);
    }
  }

  void _onPhoneChanged(String value) {
    final clean = value.trim();
    if (clean.length >= 4) {
      final matches = _allCustomers
          .where((c) => c.phone != null && c.phone!.trim() == clean)
          .toList();
      setState(() => _matchedCustomers = matches);
    } else {
      setState(() => _matchedCustomers = []);
    }
  }

  void _autofill(Customer cust) {
    _nameCtrl.text = cust.name ?? '';
    _emailCtrl.text = cust.email ?? '';
    _addressCtrl.text = cust.address ?? '';
    setState(() => _matchedCustomers = []);
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _submitting = true; _error = null; });

    try {
      final auth = context.read<AuthProvider>();
      final phone = _phoneCtrl.text.trim();
      final name = _nameCtrl.text.trim();

      // Find or create customer
      Customer customer;
      final existing = _allCustomers.firstWhere(
        (c) => c.phone?.trim() == phone && c.name?.toLowerCase().trim() == name.toLowerCase(),
        orElse: () => Customer(id: ''),
      );

      if (existing.id.isNotEmpty) {
        customer = await _api.updateCustomer({
          'id': existing.id,
          'name': name,
          'phone': phone,
          'email': _emailCtrl.text.trim(),
          'address': _addressCtrl.text.trim(),
        });
      } else {
        customer = await _api.createCustomer({
          'name': name,
          'phone': phone,
          'email': _emailCtrl.text.trim(),
          'address': _addressCtrl.text.trim(),
        });
      }

      final isOnCenter = _serviceMode == 'On Center';
      final csrNum = _csrNumberCtrl.text.trim();

      await _api.createComplaint({
        'customer_id': customer.id,
        'csr_number': csrNum.isNotEmpty ? csrNum : null,
        'item_name': _itemNameCtrl.text.trim().isNotEmpty
            ? _itemNameCtrl.text.trim()
            : 'Onsite Service Request',
        'serial_no': _serialCtrl.text.trim().isNotEmpty ? _serialCtrl.text.trim() : '—',
        'issue': _problemCtrl.text.trim().isNotEmpty
            ? _problemCtrl.text.trim()
            : 'Onsite service request logged.',
        'status': _isWarranty ? 'Warranty' : 'Pending',
        'service_mode': _serviceMode,
        'is_device_intaken': isOnCenter ? 1 : 0,
        'created_by': auth.user?.username ?? 'admin',
        'warranty_details': _isWarranty ? _warrantyDetailsCtrl.text.trim() : '',
        'warranty_status': _isWarranty ? 'Packed' : null,
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✓ Service request created successfully'),
            backgroundColor: kStatusDelivered,
          ),
        );
        _resetForm();
      }
    } catch (e) {
      setState(() {
        _submitting = false;
        _error = e.toString().replaceFirst('Exception: ', '');
      });
      return;
    }
    setState(() => _submitting = false);
  }

  void _resetForm() {
    _phoneCtrl.clear(); _nameCtrl.clear(); _emailCtrl.clear();
    _addressCtrl.clear(); _locationCtrl.clear(); _csrNumberCtrl.clear();
    _itemNameCtrl.clear(); _serialCtrl.clear(); _problemCtrl.clear();
    _warrantyDetailsCtrl.clear();
    setState(() {
      _serviceMode = 'On Center';
      _isWarranty = false;
      _matchedCustomers = [];
      _submitting = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final isOnsite = _serviceMode == 'Onsite';

    return Scaffold(
      backgroundColor: kBgDark,
      appBar: AppBar(
        backgroundColor: kPanelDark,
        leading: Builder(builder: (ctx) => IconButton(
          icon: const Icon(Icons.menu_rounded, color: kTextPrimary),
          onPressed: () => Scaffold.of(ctx).openDrawer(),
        )),
        title: const Text('New Service Intake'),
      ),
      drawer: const AppDrawer(currentRoute: '/intake'),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Error banner
              if (_error != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: kStatusPending.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: kStatusPending.withValues(alpha: 0.3)),
                  ),
                  child: Text(_error!, style: const TextStyle(color: kStatusPending)),
                ),
                const SizedBox(height: 16),
              ],

              // ── Customer Details ──────────────────────────────────────
              _SectionCard(
                title: 'Customer Details',
                icon: Icons.person_rounded,
                children: [
                  // Phone
                  TextFormField(
                    controller: _phoneCtrl,
                    style: const TextStyle(color: kTextPrimary),
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(
                      labelText: 'Phone Number *',
                      prefixIcon: Icon(Icons.phone_outlined, size: 18),
                    ),
                    validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                    onChanged: _onPhoneChanged,
                  ),

                  // Matched customers autofill
                  if (_matchedCustomers.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: kAccent.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: kAccent.withValues(alpha: 0.3)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.person_search_rounded, color: kAccent, size: 14),
                              const SizedBox(width: 6),
                              const Expanded(
                                child: Text('Previous customer records found:',
                                    style: TextStyle(color: kAccent, fontSize: 12, fontWeight: FontWeight.w600)),
                              ),
                              GestureDetector(
                                onTap: () => setState(() => _matchedCustomers = []),
                                child: const Icon(Icons.close_rounded, color: kTextSecondary, size: 16),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          ..._matchedCustomers.map((cust) => Padding(
                            padding: const EdgeInsets.only(bottom: 6),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(cust.name ?? '—', style: const TextStyle(color: kTextPrimary, fontSize: 13, fontWeight: FontWeight.w600)),
                                      if (cust.address != null && cust.address!.isNotEmpty)
                                        Text(cust.address!, style: const TextStyle(color: kTextSecondary, fontSize: 11)),
                                    ],
                                  ),
                                ),
                                TextButton(
                                  onPressed: () => _autofill(cust),
                                  style: TextButton.styleFrom(
                                    backgroundColor: kAccent.withValues(alpha: 0.15),
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                    minimumSize: Size.zero,
                                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                  ),
                                  child: const Text('Autofill', style: TextStyle(color: kAccent, fontSize: 12, fontWeight: FontWeight.w600)),
                                ),
                              ],
                            ),
                          )),
                        ],
                      ),
                    ),
                  ],

                  const SizedBox(height: 12),

                  // Full Name
                  TextFormField(
                    controller: _nameCtrl,
                    style: const TextStyle(color: kTextPrimary),
                    decoration: const InputDecoration(
                      labelText: 'Full Name *',
                      prefixIcon: Icon(Icons.person_outline, size: 18),
                    ),
                    validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                  ),
                  const SizedBox(height: 12),

                  // Email
                  TextFormField(
                    controller: _emailCtrl,
                    style: const TextStyle(color: kTextPrimary),
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      labelText: 'Email',
                      prefixIcon: Icon(Icons.email_outlined, size: 18),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Address
                  TextFormField(
                    controller: _addressCtrl,
                    style: const TextStyle(color: kTextPrimary),
                    decoration: InputDecoration(
                      labelText: isOnsite ? 'Address *' : 'Address (Optional)',
                      prefixIcon: const Icon(Icons.location_on_outlined, size: 18),
                      hintText: isOnsite ? 'Enter full address (Required for Onsite)' : 'Street, City (Optional)',
                    ),
                    validator: isOnsite ? (v) => v == null || v.isEmpty ? 'Required for Onsite' : null : null,
                    maxLines: 2,
                  ),

                  // Location — only for Onsite
                  if (isOnsite) ...[
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _locationCtrl,
                      style: const TextStyle(color: kTextPrimary),
                      decoration: const InputDecoration(
                        labelText: 'Location (Map Link / Landmark)',
                        prefixIcon: Icon(Icons.map_outlined, size: 18),
                        hintText: 'e.g. Near metro station or landmarks',
                      ),
                    ),
                  ],

                  const SizedBox(height: 16),
                  const Divider(color: kBorderColor),
                  const SizedBox(height: 12),

                  // Custom CSR Number
                  TextFormField(
                    controller: _csrNumberCtrl,
                    style: const TextStyle(color: kTextPrimary),
                    decoration: const InputDecoration(
                      labelText: 'Custom CSR Number',
                      prefixIcon: Icon(Icons.tag_rounded, size: 18),
                      hintText: 'Leave blank to auto-generate number',
                    ),
                  ),

                  const SizedBox(height: 16),
                  const Divider(color: kBorderColor),
                  const SizedBox(height: 12),

                  // Device Under Warranty
                  GestureDetector(
                    onTap: () => setState(() => _isWarranty = !_isWarranty),
                    child: Row(
                      children: [
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          width: 22, height: 22,
                          decoration: BoxDecoration(
                            color: _isWarranty ? kAccent : Colors.transparent,
                            borderRadius: BorderRadius.circular(4),
                            border: Border.all(color: _isWarranty ? kAccent : kBorderColor, width: 2),
                          ),
                          child: _isWarranty
                              ? const Icon(Icons.check_rounded, color: Colors.white, size: 14)
                              : null,
                        ),
                        const SizedBox(width: 10),
                        const Text('Device Under Warranty',
                            style: TextStyle(color: kTextPrimary, fontWeight: FontWeight.w600, fontSize: 14)),
                      ],
                    ),
                  ),

                  if (_isWarranty) ...[
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _warrantyDetailsCtrl,
                      style: const TextStyle(color: kTextPrimary),
                      decoration: const InputDecoration(
                        labelText: 'Warranty Details',
                        prefixIcon: Icon(Icons.verified_outlined, size: 18),
                        hintText: 'e.g. Purchase date, brand warranty details...',
                      ),
                    ),
                  ],

                  const SizedBox(height: 16),
                  const Divider(color: kBorderColor),
                  const SizedBox(height: 12),

                  // Mode of Service
                  Text('Mode of Service', style: const TextStyle(color: kAccent, fontSize: 13, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 10),
                  Row(
                    children: ['On Center', 'Onsite'].asMap().entries.map((entry) {
                      final isLast = entry.key == 1;
                      final mode = entry.value;
                      final isSelected = _serviceMode == mode;
                      return Expanded(
                        child: Padding(
                          padding: EdgeInsets.only(right: isLast ? 0 : 10),
                          child: GestureDetector(
                            onTap: () => setState(() => _serviceMode = mode),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              decoration: BoxDecoration(
                                color: isSelected ? kAccent.withValues(alpha: 0.15) : Colors.transparent,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: isSelected ? kAccent : kBorderColor),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    mode == 'On Center' ? Icons.computer_rounded : Icons.location_on_rounded,
                                    color: isSelected ? kAccent : kTextSecondary,
                                    size: 16,
                                  ),
                                  const SizedBox(width: 6),
                                  Text(mode,
                                      style: TextStyle(
                                        color: isSelected ? kAccent : kTextSecondary,
                                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                                        fontSize: 13,
                                      )),
                                ],
                              ),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ),

              const SizedBox(height: 16),

              // ── Device Details ────────────────────────────────────────
              _SectionCard(
                title: 'Device Details',
                icon: Icons.devices_rounded,
                children: [
                  TextFormField(
                    controller: _itemNameCtrl,
                    style: const TextStyle(color: kTextPrimary),
                    decoration: InputDecoration(
                      labelText: isOnsite ? 'Item Name (Optional)' : 'Item Name *',
                      prefixIcon: const Icon(Icons.devices_other_rounded, size: 18),
                      hintText: 'e.g. MacBook Pro 2021',
                    ),
                    validator: isOnsite ? null : (v) => v == null || v.isEmpty ? 'Required' : null,
                  ),
                  const SizedBox(height: 12),

                  TextFormField(
                    controller: _serialCtrl,
                    style: const TextStyle(color: kTextPrimary),
                    decoration: InputDecoration(
                      labelText: isOnsite ? 'Serial Number (Optional)' : 'Serial Number *',
                      prefixIcon: const Icon(Icons.qr_code_rounded, size: 18),
                      hintText: 'e.g. C02...',
                    ),
                    validator: isOnsite ? null : (v) => v == null || v.isEmpty ? 'Required' : null,
                  ),
                  const SizedBox(height: 12),

                  TextFormField(
                    controller: _problemCtrl,
                    style: const TextStyle(color: kTextPrimary),
                    decoration: InputDecoration(
                      labelText: isOnsite ? 'Issue Description (Optional)' : 'Issue Description *',
                      alignLabelWithHint: true,
                      prefixIcon: const Padding(
                        padding: EdgeInsets.only(bottom: 48),
                        child: Icon(Icons.description_outlined, size: 18),
                      ),
                      hintText: 'Describe the problem...',
                    ),
                    maxLines: 4,
                    validator: isOnsite ? null : (v) => v == null || v.isEmpty ? 'Required' : null,
                  ),
                ],
              ),

              const SizedBox(height: 24),

              SizedBox(
                height: 52,
                child: ElevatedButton.icon(
                  onPressed: _submitting ? null : _submit,
                  icon: _submitting
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Icon(Icons.save_rounded, size: 18),
                  label: Text(_submitting ? 'Submitting...' : 'Submit Request'),
                  style: ElevatedButton.styleFrom(
                    textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                ),
              ),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Section Card ─────────────────────────────────────────────────────────────

class _SectionCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final List<Widget> children;

  const _SectionCard({required this.title, required this.icon, required this.children});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: kPanelDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: kBorderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
            child: Row(
              children: [
                Icon(icon, color: kAccent, size: 18),
                const SizedBox(width: 8),
                Text(title, style: const TextStyle(color: kAccent, fontSize: 15, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
          const Divider(color: kBorderColor, height: 1),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: children,
            ),
          ),
        ],
      ),
    );
  }
}
