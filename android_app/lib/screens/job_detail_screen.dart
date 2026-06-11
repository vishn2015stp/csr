import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../models/complaint.dart';
import '../models/customer.dart';
import '../theme.dart';
import '../widgets/status_badge.dart';
import '../widgets/app_drawer.dart';

class JobDetailScreen extends StatefulWidget {
  final String jobId;
  final VoidCallback? onRefresh;

  const JobDetailScreen({super.key, required this.jobId, this.onRefresh});

  @override
  State<JobDetailScreen> createState() => _JobDetailScreenState();
}

class _JobDetailScreenState extends State<JobDetailScreen> with SingleTickerProviderStateMixin {
  final _api = ApiService();
  Complaint? _complaint;
  Customer? _customer;
  List<ServiceRecord> _serviceRecords = [];
  List<StatusLog> _statusLogs = [];
  List<Invoice> _invoices = [];
  bool _loading = true;
  late TabController _tabCtrl;

  static const _statuses = [
    'Pending', 'Intaken', 'In Progress', 'Ready', 'Ready for Delivery', 'Delivered', 'Completed'
  ];

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 4, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final c = await _api.getComplaint(widget.jobId);
      if (c == null) { setState(() => _loading = false); return; }

      Customer? customer;
      if (c.customerId != null) {
        customer = await _api.getCustomer(c.customerId!);
      }
      final records = await _api.getServiceRecords(complaintId: widget.jobId);
      final logs = await _api.getStatusLogs(complaintId: widget.jobId);
      final invoices = await _api.getInvoices(complaintId: widget.jobId);

      if (mounted) {
        setState(() {
          _complaint = c;
          _customer = customer;
          _serviceRecords = records;
          _statusLogs = logs;
          _invoices = invoices;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _updateStatus(String newStatus) async {
    if (_complaint == null) return;
    final auth = context.read<AuthProvider>();
    try {
      await _api.updateComplaint(_complaint!.id, {'status': newStatus});
      await _api.createStatusLog({
        'complaint_id': _complaint!.id,
        'status': newStatus,
        'changed_by': auth.user?.username ?? 'unknown',
      });
      widget.onRefresh?.call();
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: kStatusPending),
        );
      }
    }
  }

  Future<void> _addServiceRecord() async {
    final techCtrl = TextEditingController();
    final workCtrl = TextEditingController();
    final partsCtrl = TextEditingController();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: kPanelDark,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        title: const Text('Add Service Record', style: TextStyle(color: kTextPrimary)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: techCtrl,
              style: const TextStyle(color: kTextPrimary),
              decoration: const InputDecoration(labelText: 'Technician'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: workCtrl,
              style: const TextStyle(color: kTextPrimary),
              decoration: const InputDecoration(labelText: 'Work Done'),
              maxLines: 3,
            ),
            const SizedBox(height: 10),
            TextField(
              controller: partsCtrl,
              style: const TextStyle(color: kTextPrimary),
              decoration: const InputDecoration(labelText: 'Parts Used'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(onPressed: () => Navigator.pop(context, true), child: const Text('Save')),
        ],
      ),
    );

    if (confirmed == true && _complaint != null) {
      await _api.createServiceRecord({
        'complaint_id': _complaint!.id,
        'technician': techCtrl.text,
        'issues': workCtrl.text,
        'resolution_status': partsCtrl.text,
      });
      await _load();
    }
  }

  Future<void> _addInvoice() async {
    final amtCtrl = TextEditingController();
    final descCtrl = TextEditingController();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: kPanelDark,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        title: const Text('Add Invoice', style: TextStyle(color: kTextPrimary)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: amtCtrl,
              style: const TextStyle(color: kTextPrimary),
              decoration: const InputDecoration(labelText: 'Amount (₹)'),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 10),
            TextField(
              controller: descCtrl,
              style: const TextStyle(color: kTextPrimary),
              decoration: const InputDecoration(labelText: 'Description'),
              maxLines: 2,
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(onPressed: () => Navigator.pop(context, true), child: const Text('Save')),
        ],
      ),
    );

    if (confirmed == true && _complaint != null) {
      await _api.createInvoice({
        'complaint_id': _complaint!.id,
        'total': double.tryParse(amtCtrl.text) ?? 0,
        'receipt_number': descCtrl.text,
      });
      await _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: kBgDark,
        body: Center(child: CircularProgressIndicator(color: kAccent)),
      );
    }

    if (_complaint == null) {
      return Scaffold(
        backgroundColor: kBgDark,
        appBar: AppBar(backgroundColor: kPanelDark, title: const Text('Job Detail')),
        body: const Center(child: Text('Job not found.', style: TextStyle(color: kTextSecondary))),
      );
    }

    final c = _complaint!;

    return Scaffold(
      backgroundColor: kBgDark,
      appBar: AppBar(
        backgroundColor: kPanelDark,
        title: Text(c.displayId, style: const TextStyle(color: kAccent, fontWeight: FontWeight.bold)),
        actions: [
          // Status update
          PopupMenuButton<String>(
            icon: const Icon(Icons.update_rounded, color: kAccent),
            tooltip: 'Update Status',
            color: kPanelDark2,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            itemBuilder: (_) => _statuses.map((s) => PopupMenuItem(
              value: s,
              child: Row(
                children: [
                  StatusBadge(status: s),
                ],
              ),
            )).toList(),
            onSelected: _updateStatus,
          ),
        ],
        bottom: TabBar(
          controller: _tabCtrl,
          indicatorColor: kAccent,
          labelColor: kAccent,
          unselectedLabelColor: kTextSecondary,
          tabs: const [
            Tab(text: 'Info'),
            Tab(text: 'Service'),
            Tab(text: 'Timeline'),
            Tab(text: 'Invoice'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabCtrl,
        children: [
          _InfoTab(complaint: c, customer: _customer),
          _ServiceTab(records: _serviceRecords, onAdd: _addServiceRecord),
          _TimelineTab(logs: _statusLogs),
          _InvoiceTab(invoices: _invoices, onAdd: _addInvoice),
        ],
      ),
    );
  }
}

// ── Info Tab ─────────────────────────────────────────────────────────────────

class _InfoTab extends StatelessWidget {
  final Complaint complaint;
  final Customer? customer;

  const _InfoTab({required this.complaint, this.customer});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Status header
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: kPanelDark,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: kBorderColor),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(complaint.itemName ?? '—', style: const TextStyle(color: kTextPrimary, fontSize: 18, fontWeight: FontWeight.bold)),
                      if (complaint.brand != null || complaint.model != null)
                        Text('${complaint.brand ?? ''} ${complaint.model ?? ''}'.trim(), style: const TextStyle(color: kTextSecondary, fontSize: 13)),
                    ],
                  ),
                ),
                StatusBadge(status: complaint.status, fontSize: 12),
              ],
            ),
          ),
          const SizedBox(height: 12),

          _InfoCard(
            title: 'Device Information',
            icon: Icons.computer_rounded,
            children: [
              _InfoRow('Item', complaint.itemName),
              _InfoRow('Brand', complaint.brand),
              _InfoRow('Model', complaint.model),
              _InfoRow('Serial No.', complaint.serialNo),
              _InfoRow('Service', [
                complaint.serviceType,
                if (complaint.serviceMode != null && complaint.serviceMode != complaint.serviceType) complaint.serviceMode,
              ].whereType<String>().join(' · ')),
              if (complaint.password != null && complaint.password!.isNotEmpty)
                _InfoRow('Device Password', complaint.password),
            ],
          ),
          const SizedBox(height: 12),

          _InfoCard(
            title: 'Problem Description',
            icon: Icons.bug_report_rounded,
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Text(
                  complaint.problemDescription ?? 'No description provided.',
                  style: const TextStyle(color: kTextPrimary, fontSize: 14, height: 1.5),
                ),
              ),
              if (complaint.accessories != null && complaint.accessories!.isNotEmpty) ...[
                const Divider(color: kBorderColor),
                _InfoRow('Accessories', complaint.accessories),
              ],
            ],
          ),
          const SizedBox(height: 12),

          _InfoCard(
            title: 'Customer',
            icon: Icons.person_rounded,
            children: [
              _InfoRow('Name', customer?.name ?? complaint.customerName),
              _InfoRow('Phone', customer?.phone ?? complaint.customerPhone),
              _InfoRow('Address', customer?.address ?? complaint.customerAddress),
              _InfoRow('Email', customer?.email),
            ],
          ),

          const SizedBox(height: 12),
          if (complaint.createdAt != null)
            _InfoCard(
              title: 'Timestamps',
              icon: Icons.schedule_rounded,
              children: [
                _InfoRow('Created', _fmt(complaint.createdAt)),
                _InfoRow('Updated', _fmt(complaint.updatedAt)),
              ],
            ),
        ],
      ),
    );
  }

  String? _fmt(DateTime? d) {
    if (d == null) return null;
    return '${d.day}/${d.month}/${d.year} ${d.hour.toString().padLeft(2,'0')}:${d.minute.toString().padLeft(2,'0')}';
  }
}

class _InfoCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final List<Widget> children;

  const _InfoCard({required this.title, required this.icon, required this.children});

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
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Row(
              children: [
                Icon(icon, color: kAccent, size: 16),
                const SizedBox(width: 8),
                Text(title, style: const TextStyle(color: kAccent, fontSize: 13, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
          const Divider(color: kBorderColor, height: 1),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: children),
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String? value;

  const _InfoRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    if (value == null || value!.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(label, style: const TextStyle(color: kTextSecondary, fontSize: 13)),
          ),
          Expanded(
            child: Text(value!, style: const TextStyle(color: kTextPrimary, fontSize: 13, fontWeight: FontWeight.w500)),
          ),
        ],
      ),
    );
  }
}

// ── Service Tab ───────────────────────────────────────────────────────────────

class _ServiceTab extends StatelessWidget {
  final List<ServiceRecord> records;
  final VoidCallback onAdd;

  const _ServiceTab({required this.records, required this.onAdd});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBgDark,
      floatingActionButton: FloatingActionButton(
        onPressed: onAdd,
        backgroundColor: kAccent,
        child: const Icon(Icons.add_rounded, color: Colors.white),
      ),
      body: records.isEmpty
          ? const Center(child: Text('No service records yet.', style: TextStyle(color: kTextSecondary)))
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: records.length,
              itemBuilder: (_, i) {
                final r = records[i];
                return Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.build_rounded, color: kAccent, size: 16),
                            const SizedBox(width: 6),
                            Text(r.technician ?? 'Unknown Technician',
                                style: const TextStyle(color: kAccent, fontWeight: FontWeight.w600)),
                            const Spacer(),
                            if (r.createdAt != null)
                              Text(_fmt(r.createdAt!), style: const TextStyle(color: kTextSecondary, fontSize: 11)),
                          ],
                        ),
                        if (r.issues != null && r.issues!.isNotEmpty) ...[
                          const SizedBox(height: 8),
                          Text(r.issues!, style: const TextStyle(color: kTextPrimary, fontSize: 13)),
                        ],
                        if (r.resolutionStatus != null && r.resolutionStatus!.isNotEmpty) ...[
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              const Icon(Icons.hardware_rounded, color: kTextSecondary, size: 13),
                              const SizedBox(width: 4),
                              Text('Resolution/Parts: ${r.resolutionStatus}', style: const TextStyle(color: kTextSecondary, fontSize: 12)),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }

  String _fmt(DateTime d) => '${d.day}/${d.month}/${d.year}';
}

// ── Timeline Tab ──────────────────────────────────────────────────────────────

class _TimelineTab extends StatelessWidget {
  final List<StatusLog> logs;
  const _TimelineTab({required this.logs});

  @override
  Widget build(BuildContext context) {
    if (logs.isEmpty) {
      return const Center(child: Text('No status history.', style: TextStyle(color: kTextSecondary)));
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: logs.length,
      itemBuilder: (_, i) {
        final log = logs[i];
        final color = log.status != null ? statusColor(log.status!) : kTextSecondary;
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Column(
              children: [
                Container(
                  width: 12, height: 12,
                  decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                ),
                if (i < logs.length - 1)
                  Container(width: 2, height: 50, color: kBorderColor),
              ],
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (log.status != null) StatusBadge(status: log.status!),
                    if (log.note != null && log.note!.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(log.note!, style: const TextStyle(color: kTextPrimary, fontSize: 13)),
                    ],
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        if (log.changedBy != null)
                          Text('by ${log.changedBy}', style: const TextStyle(color: kTextSecondary, fontSize: 11)),
                        if (log.createdAt != null) ...[
                          const Spacer(),
                          Text(_fmt(log.createdAt!), style: const TextStyle(color: kTextSecondary, fontSize: 11)),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  String _fmt(DateTime d) => '${d.day}/${d.month}/${d.year} ${d.hour.toString().padLeft(2,'0')}:${d.minute.toString().padLeft(2,'0')}';
}

// ── Invoice Tab ───────────────────────────────────────────────────────────────

class _InvoiceTab extends StatelessWidget {
  final List<Invoice> invoices;
  final VoidCallback onAdd;

  const _InvoiceTab({required this.invoices, required this.onAdd});

  Widget build(BuildContext context) {
    final total = invoices.fold(0.0, (sum, inv) => sum + (inv.total ?? 0));

    return Scaffold(
      backgroundColor: kBgDark,
      floatingActionButton: FloatingActionButton(
        onPressed: onAdd,
        backgroundColor: kAccent,
        child: const Icon(Icons.add_rounded, color: Colors.white),
      ),
      body: Column(
        children: [
          if (invoices.isNotEmpty)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: kAccent.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: kAccent.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.receipt_rounded, color: kAccent),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Total Amount', style: TextStyle(color: kTextSecondary, fontSize: 12)),
                        Text('₹${total.toStringAsFixed(2)}',
                            style: const TextStyle(color: kAccent, fontSize: 22, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          Expanded(
            child: invoices.isEmpty
                ? const Center(child: Text('No invoices yet.', style: TextStyle(color: kTextSecondary)))
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: invoices.length,
                    itemBuilder: (_, i) {
                      final inv = invoices[i];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          leading: const Icon(Icons.receipt_long_rounded, color: kAccent),
                          title: Text('₹${(inv.total ?? 0).toStringAsFixed(2)}',
                              style: const TextStyle(color: kTextPrimary, fontWeight: FontWeight.bold)),
                          subtitle: Text(inv.receiptNumber ?? '—', style: const TextStyle(color: kTextSecondary)),
                          trailing: inv.createdAt != null
                              ? Text(_fmt(inv.createdAt!), style: const TextStyle(color: kTextSecondary, fontSize: 11))
                              : null,
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  String _fmt(DateTime d) => '${d.day}/${d.month}/${d.year}';
}
