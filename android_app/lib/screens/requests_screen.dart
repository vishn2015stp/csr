import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/complaint.dart';
import '../theme.dart';
import '../widgets/status_badge.dart';
import '../widgets/app_drawer.dart';
import 'job_detail_screen.dart';

class RequestsScreen extends StatefulWidget {
  const RequestsScreen({super.key});

  @override
  State<RequestsScreen> createState() => _RequestsScreenState();
}

class _RequestsScreenState extends State<RequestsScreen> {
  final _api = ApiService();
  List<Complaint> _complaints = [];
  bool _loading = true;
  String _searchQuery = '';
  String _statusFilter = 'All';
  final _searchCtrl = TextEditingController();

  static const _statuses = ['All', 'Pending', 'Intaken', 'In Progress', 'Ready', 'Ready for Delivery', 'Delivered', 'Completed'];

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final list = await _api.getComplaints(orderDesc: true);
      setState(() { _complaints = list; _loading = false; });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  List<Complaint> get _filtered {
    final q = _searchQuery.trim().toLowerCase();
    return _complaints.where((c) {
      final matchesStatus = _statusFilter == 'All' || c.status == _statusFilter;
      final matchesQuery = q.isEmpty ||
          (c.customerName?.toLowerCase().contains(q) ?? false) ||
          (c.customerPhone?.toLowerCase().contains(q) ?? false) ||
          (c.csrNumber?.toLowerCase().contains(q) ?? false) ||
          (c.itemName?.toLowerCase().contains(q) ?? false) ||
          c.id.toLowerCase().contains(q);
      return matchesStatus && matchesQuery;
    }).toList();
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
        title: const Text('All Requests'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: kTextSecondary),
            onPressed: _load,
          ),
        ],
      ),
      drawer: const AppDrawer(currentRoute: '/requests'),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.pushNamed(context, '/intake').then((_) => _load()),
        backgroundColor: kAccent,
        icon: const Icon(Icons.add_rounded, color: Colors.white),
        label: const Text('New Intake', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
      ),
      body: Column(
        children: [
          // Search
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
            child: Container(
              decoration: BoxDecoration(
                color: kPanelDark,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: kBorderColor),
              ),
              child: TextField(
                controller: _searchCtrl,
                style: const TextStyle(color: kTextPrimary),
                decoration: InputDecoration(
                  hintText: 'Search requests...',
                  prefixIcon: const Icon(Icons.search_rounded, color: kTextSecondary),
                  suffixIcon: _searchQuery.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.close_rounded, color: kTextSecondary),
                          onPressed: () { _searchCtrl.clear(); setState(() => _searchQuery = ''); },
                        )
                      : null,
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  filled: false,
                ),
                onChanged: (v) => setState(() => _searchQuery = v),
              ),
            ),
          ),

          // Status chips
          SizedBox(
            height: 48,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              itemCount: _statuses.length,
              itemBuilder: (_, i) {
                final s = _statuses[i];
                final isSelected = _statusFilter == s;
                final color = s == 'All' ? kAccent : statusColor(s);
                return Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: FilterChip(
                    label: Text(s),
                    selected: isSelected,
                    onSelected: (_) => setState(() => _statusFilter = s),
                    selectedColor: color.withValues(alpha: 0.2),
                    checkmarkColor: color,
                    side: BorderSide(color: isSelected ? color : kBorderColor),
                    labelStyle: TextStyle(
                      color: isSelected ? color : kTextSecondary,
                      fontSize: 12,
                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                    ),
                    backgroundColor: kPanelDark,
                    padding: EdgeInsets.zero,
                  ),
                );
              },
            ),
          ),

          // Count
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Row(
              children: [
                Text(
                  '${_filtered.length} result${_filtered.length == 1 ? '' : 's'}',
                  style: const TextStyle(color: kTextSecondary, fontSize: 12),
                ),
              ],
            ),
          ),

          // List
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: kAccent))
                : _filtered.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.search_off_rounded, color: kTextSecondary, size: 48),
                            const SizedBox(height: 12),
                            Text('No results found', style: const TextStyle(color: kTextSecondary)),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _load,
                        color: kAccent,
                        backgroundColor: kPanelDark,
                        child: ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                          itemCount: _filtered.length,
                          itemBuilder: (_, i) => _RequestTile(
                            complaint: _filtered[i],
                            onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => JobDetailScreen(jobId: _filtered[i].id, onRefresh: _load)),
                            ),
                          ),
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}

class _RequestTile extends StatelessWidget {
  final Complaint complaint;
  final VoidCallback onTap;

  const _RequestTile({required this.complaint, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(complaint.displayId, style: const TextStyle(color: kAccent, fontWeight: FontWeight.bold, fontSize: 13)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      complaint.itemName ?? '—',
                      style: const TextStyle(color: kTextPrimary, fontWeight: FontWeight.w600, fontSize: 15),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  StatusBadge(status: complaint.status),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.person_outline, size: 14, color: kTextSecondary),
                  const SizedBox(width: 4),
                  Text(complaint.customerName ?? '—', style: const TextStyle(color: kTextSecondary, fontSize: 13)),
                  const SizedBox(width: 12),
                  const Icon(Icons.phone_outlined, size: 14, color: kTextSecondary),
                  const SizedBox(width: 4),
                  Text(complaint.customerPhone ?? '—', style: const TextStyle(color: kTextSecondary, fontSize: 13)),
                ],
              ),
              if (complaint.serialNo != null) ...[
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.qr_code_rounded, size: 14, color: kTextSecondary),
                    const SizedBox(width: 4),
                    Text('S/N: ${complaint.serialNo}', style: const TextStyle(color: kTextSecondary, fontSize: 12, fontFamily: 'monospace')),
                    const Spacer(),
                    if (complaint.createdAt != null)
                      Text(
                        _formatDate(complaint.createdAt!),
                        style: const TextStyle(color: kTextSecondary, fontSize: 11),
                      ),
                  ],
                ),
              ],
              if (complaint.isOnSite) ...[
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: kStatusOther.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: kStatusOther.withValues(alpha: 0.3)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.location_on_rounded, size: 12, color: kStatusOther),
                      SizedBox(width: 4),
                      Text('On-Site', style: TextStyle(color: kStatusOther, fontSize: 11, fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  String _formatDate(DateTime d) {
    return '${d.day}/${d.month}/${d.year}';
  }
}
