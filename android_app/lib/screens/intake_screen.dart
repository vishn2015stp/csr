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
  final _addressCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  Customer? _foundCustomer;
  bool _lookingUp = false;

  // Device fields
  final _itemNameCtrl = TextEditingController();
  final _brandCtrl = TextEditingController();
  final _modelCtrl = TextEditingController();
  final _serialCtrl = TextEditingController();
  final _problemCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _accessoriesCtrl = TextEditingController();

  String _serviceType = 'In-Shop';
  bool _submitting = false;
  String? _error;
  bool _success = false;

  @override
  void dispose() {
    _phoneCtrl.dispose(); _nameCtrl.dispose(); _addressCtrl.dispose();
    _emailCtrl.dispose(); _itemNameCtrl.dispose(); _brandCtrl.dispose();
    _modelCtrl.dispose(); _serialCtrl.dispose(); _problemCtrl.dispose();
    _passwordCtrl.dispose(); _accessoriesCtrl.dispose();
    super.dispose();
  }

  Future<void> _lookupCustomer() async {
    final phone = _phoneCtrl.text.trim();
    if (phone.isEmpty) return;
    setState(() { _lookingUp = true; _foundCustomer = null; });
    try {
      // Search by fetching all complaints and extracting unique customers
      // We'll try finding by phone via customers endpoint (if supported)
      // For now, we pre-fill empty fields
      setState(() => _lookingUp = false);
    } catch (_) {
      setState(() => _lookingUp = false);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _submitting = true; _error = null; });

    try {
      final auth = context.read<AuthProvider>();

      // Create or update customer
      final customerData = {
        'name': _nameCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
        'address': _addressCtrl.text.trim(),
        'email': _emailCtrl.text.trim(),
      };

      Customer customer;
      if (_foundCustomer != null) {
        customer = await _api.updateCustomer({...customerData, 'id': _foundCustomer!.id});
      } else {
        customer = await _api.createCustomer(customerData);
      }

      // Create complaint
      await _api.createComplaint({
        'customer_id': customer.id,
        'item_name': _itemNameCtrl.text.trim(),
        'brand': _brandCtrl.text.trim(),
        'model': _modelCtrl.text.trim(),
        'serial_no': _serialCtrl.text.trim(),
        'problem_description': _problemCtrl.text.trim(),
        'password': _passwordCtrl.text.trim(),
        'accessories': _accessoriesCtrl.text.trim(),
        'service_type': _serviceType,
        'status': 'Intaken',
        'assigned_to': auth.user?.username,
      });

      setState(() { _submitting = false; _success = true; });
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
    }
  }

  void _resetForm() {
    _phoneCtrl.clear(); _nameCtrl.clear(); _addressCtrl.clear();
    _emailCtrl.clear(); _itemNameCtrl.clear(); _brandCtrl.clear();
    _modelCtrl.clear(); _serialCtrl.clear(); _problemCtrl.clear();
    _passwordCtrl.clear(); _accessoriesCtrl.clear();
    setState(() { _foundCustomer = null; _serviceType = 'In-Shop'; _success = false; });
  }

  @override
  Widget build(BuildContext context) {
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

              // ── Customer Section ──
              _SectionLabel(title: 'Customer Information', icon: Icons.person_rounded),
              const SizedBox(height: 12),

              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _phoneCtrl,
                      style: const TextStyle(color: kTextPrimary),
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(
                        labelText: 'Phone Number *',
                        prefixIcon: Icon(Icons.phone_outlined, size: 18),
                      ),
                      validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                      onChanged: (_) => setState(() {}),
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: _lookingUp ? null : _lookupCustomer,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
                    ),
                    child: _lookingUp
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Text('Find'),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              TextFormField(
                controller: _nameCtrl,
                style: const TextStyle(color: kTextPrimary),
                decoration: const InputDecoration(
                  labelText: 'Customer Name *',
                  prefixIcon: Icon(Icons.person_outline, size: 18),
                ),
                validator: (v) => v == null || v.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _addressCtrl,
                style: const TextStyle(color: kTextPrimary),
                decoration: const InputDecoration(
                  labelText: 'Address',
                  prefixIcon: Icon(Icons.location_on_outlined, size: 18),
                ),
                maxLines: 2,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _emailCtrl,
                style: const TextStyle(color: kTextPrimary),
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  prefixIcon: Icon(Icons.email_outlined, size: 18),
                ),
              ),

              const SizedBox(height: 24),

              // ── Device Section ──
              _SectionLabel(title: 'Device Information', icon: Icons.devices_rounded),
              const SizedBox(height: 12),

              // Service Type
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: kPanelDark,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: kBorderColor),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Service Type', style: TextStyle(color: kTextSecondary, fontSize: 13)),
                    const SizedBox(height: 8),
                    Row(
                      children: ['In-Shop', 'On-Site'].asMap().entries.map((entry) {
                        final i = entry.key;
                        final type = entry.value;
                        final isSelected = _serviceType == type;
                        final isLast = i == 1;
                        return Expanded(
                          child: Padding(
                            padding: EdgeInsets.only(right: isLast ? 0 : 8),
                            child: GestureDetector(
                              onTap: () => setState(() => _serviceType = type),
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
                                      type == 'In-Shop' ? Icons.computer_rounded : Icons.location_on_rounded,
                                      color: isSelected ? kAccent : kTextSecondary,
                                      size: 16,
                                    ),
                                    const SizedBox(width: 6),
                                    Text(type, style: TextStyle(color: isSelected ? kAccent : kTextSecondary, fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal, fontSize: 13)),
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
              ),
              const SizedBox(height: 12),

              TextFormField(
                controller: _itemNameCtrl,
                style: const TextStyle(color: kTextPrimary),
                decoration: const InputDecoration(
                  labelText: 'Item Name *',
                  prefixIcon: Icon(Icons.devices_other_rounded, size: 18),
                ),
                validator: (v) => v == null || v.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _brandCtrl,
                      style: const TextStyle(color: kTextPrimary),
                      decoration: const InputDecoration(labelText: 'Brand'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _modelCtrl,
                      style: const TextStyle(color: kTextPrimary),
                      decoration: const InputDecoration(labelText: 'Model'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _serialCtrl,
                style: const TextStyle(color: kTextPrimary),
                decoration: const InputDecoration(
                  labelText: 'Serial Number / IMEI',
                  prefixIcon: Icon(Icons.qr_code_rounded, size: 18),
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _passwordCtrl,
                style: const TextStyle(color: kTextPrimary),
                decoration: const InputDecoration(
                  labelText: 'Device Password / PIN',
                  prefixIcon: Icon(Icons.lock_outline, size: 18),
                ),
              ),

              const SizedBox(height: 24),

              // ── Problem Section ──
              _SectionLabel(title: 'Problem Details', icon: Icons.bug_report_rounded),
              const SizedBox(height: 12),

              TextFormField(
                controller: _problemCtrl,
                style: const TextStyle(color: kTextPrimary),
                decoration: const InputDecoration(
                  labelText: 'Problem Description *',
                  alignLabelWithHint: true,
                  prefixIcon: Padding(
                    padding: EdgeInsets.only(bottom: 48),
                    child: Icon(Icons.description_outlined, size: 18),
                  ),
                ),
                maxLines: 5,
                validator: (v) => v == null || v.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _accessoriesCtrl,
                style: const TextStyle(color: kTextPrimary),
                decoration: const InputDecoration(
                  labelText: 'Accessories (bag, charger, etc.)',
                  prefixIcon: Icon(Icons.inventory_2_outlined, size: 18),
                ),
                maxLines: 2,
              ),

              const SizedBox(height: 32),

              SizedBox(
                height: 52,
                child: ElevatedButton.icon(
                  onPressed: _submitting ? null : _submit,
                  icon: _submitting
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Icon(Icons.save_rounded, size: 18),
                  label: Text(_submitting ? 'Creating...' : 'Create Service Request'),
                  style: ElevatedButton.styleFrom(textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
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

class _SectionLabel extends StatelessWidget {
  final String title;
  final IconData icon;

  const _SectionLabel({required this.title, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, color: kAccent, size: 18),
        const SizedBox(width: 8),
        Text(title, style: const TextStyle(color: kAccent, fontSize: 14, fontWeight: FontWeight.w600)),
        const Expanded(child: Divider(color: kBorderColor, indent: 12)),
      ],
    );
  }
}
