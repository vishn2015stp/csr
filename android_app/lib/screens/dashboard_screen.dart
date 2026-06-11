import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../models/complaint.dart';
import '../theme.dart';
import '../widgets/status_badge.dart';
import '../widgets/app_drawer.dart';
import 'job_detail_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final _api = ApiService();
  List<Complaint> _allComplaints = [];
  bool _loading = true;
  String _searchQuery = '';
  final _searchCtrl = TextEditingController();

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
      final data = await _api.getDashboardStats();
      final rawList = (data['complaints'] as List<dynamic>?) ?? [];
      setState(() {
        _allComplaints = rawList.map((j) => Complaint.fromJson(j)).toList();
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  List<Complaint> get _filtered {
    final q = _searchQuery.trim().toLowerCase();
    if (q.isEmpty) return _allComplaints;
    return _allComplaints.where((c) =>
      (c.customerName?.toLowerCase().contains(q) ?? false) ||
      (c.customerPhone?.toLowerCase().contains(q) ?? false) ||
      (c.csrNumber?.toLowerCase().contains(q) ?? false) ||
      (c.itemName?.toLowerCase().contains(q) ?? false) ||
      c.id.toLowerCase().contains(q)
    ).toList();
  }

  List<Complaint> get _pendingInShop {
    return _filtered.where((c) => c.isPending && !c.isOnSite).toList();
  }

  List<Complaint> get _pendingOnSite {
    return _filtered.where((c) => c.isPending && c.isOnSite).toList();
  }

  List<Complaint> get _recentActive {
    final active = _filtered.where((c) => c.isPending).toList()
      ..sort((a, b) => (b.createdAt ?? DateTime(0)).compareTo(a.createdAt ?? DateTime(0)));
    return _searchQuery.isEmpty ? active.take(8).toList() : active;
  }

  void _openJob(String id) {
    Navigator.push(context, MaterialPageRoute(
      builder: (_) => JobDetailScreen(jobId: id, onRefresh: _load),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    return Scaffold(
      backgroundColor: kBgDark,
      appBar: AppBar(
        backgroundColor: kPanelDark,
        leading: Builder(builder: (ctx) => IconButton(
          icon: const Icon(Icons.menu_rounded, color: kTextPrimary),
          onPressed: () => Scaffold.of(ctx).openDrawer(),
        )),
        title: Row(
          children: [
            Image.asset('assets/images/logo.png', width: 22, height: 22),
            const SizedBox(width: 8),
            const Text('Hyper-Care', style: TextStyle(color: kAccent, fontWeight: FontWeight.bold)),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: kPanelDark2,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: kBorderColor),
              ),
              child: Text(auth.user?.username ?? '', style: const TextStyle(color: kAccent, fontSize: 13, fontWeight: FontWeight.w600)),
            ),
          ),
        ],
      ),
      drawer: const AppDrawer(currentRoute: '/'),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.pushNamed(context, '/intake').then((_) => _load()),
        backgroundColor: kAccent,
        icon: const Icon(Icons.add_rounded, color: Colors.white),
        label: const Text('New Intake', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        color: kAccent,
        backgroundColor: kPanelDark,
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: kAccent))
            : CustomScrollView(
                slivers: [
                  // Search bar
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                      child: Container(
                        decoration: BoxDecoration(
                          color: kPanelDark,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: kBorderColor),
                        ),
                        child: TextField(
                          controller: _searchCtrl,
                          style: const TextStyle(color: kTextPrimary),
                          decoration: InputDecoration(
                            hintText: 'Search by customer, phone, CSR #...',
                            prefixIcon: const Icon(Icons.search_rounded, color: kTextSecondary),
                            suffixIcon: _searchQuery.isNotEmpty
                                ? IconButton(
                                    icon: const Icon(Icons.close_rounded, color: kTextSecondary),
                                    onPressed: () {
                                      _searchCtrl.clear();
                                      setState(() => _searchQuery = '');
                                    },
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
                  ),

                  // Stats row
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                      child: Row(
                        children: [
                          _StatCard(
                            label: 'In-Shop',
                            value: _pendingInShop.length,
                            sub: '${_pendingInShop.where((c) => c.status == 'Ready for Delivery' || c.status == 'Ready').length} ready',
                            icon: Icons.computer_rounded,
                            color: kAccent,
                          ),
                          const SizedBox(width: 12),
                          _StatCard(
                            label: 'On-Site',
                            value: _pendingOnSite.length,
                            sub: '${_pendingOnSite.where((c) => c.status == 'In Progress').length} in progress',
                            icon: Icons.location_on_rounded,
                            color: kStatusOther,
                          ),
                          const SizedBox(width: 12),
                          _StatCard(
                            label: 'Total',
                            value: _allComplaints.length,
                            sub: 'all records',
                            icon: Icons.assignment_rounded,
                            color: kStatusDelivered,
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Pending In-Shop
                  SliverToBoxAdapter(
                    child: _SectionHeader(
                      title: 'Pending In-Shop Work',
                      icon: Icons.computer_rounded,
                      badge: '${_pendingInShop.where((c) => c.status == 'Ready for Delivery' || c.status == 'Ready').length}/${_pendingInShop.length}',
                    ),
                  ),
                  _pendingInShop.isEmpty
                      ? SliverToBoxAdapter(child: _EmptyCard(message: 'All queues clear! 🎉'))
                      : SliverList(
                          delegate: SliverChildBuilderDelegate(
                            (_, i) => _ComplaintTile(complaint: _pendingInShop[i], onTap: () => _openJob(_pendingInShop[i].id)),
                            childCount: _pendingInShop.length,
                          ),
                        ),

                  // Pending On-Site
                  SliverToBoxAdapter(
                    child: _SectionHeader(
                      title: 'Pending Field Tasks (On-Site)',
                      icon: Icons.location_on_rounded,
                      badge: '${_pendingOnSite.where((c) => c.status == 'In Progress').length}/${_pendingOnSite.length}',
                    ),
                  ),
                  _pendingOnSite.isEmpty
                      ? SliverToBoxAdapter(child: _EmptyCard(message: 'No pending on-site tasks.'))
                      : SliverList(
                          delegate: SliverChildBuilderDelegate(
                            (_, i) => _ComplaintTile(complaint: _pendingOnSite[i], onTap: () => _openJob(_pendingOnSite[i].id)),
                            childCount: _pendingOnSite.length,
                          ),
                        ),

                  // Recent
                  SliverToBoxAdapter(
                    child: _SectionHeader(
                      title: 'Recent Service Requests',
                      icon: Icons.history_rounded,
                    ),
                  ),
                  _recentActive.isEmpty
                      ? SliverToBoxAdapter(child: _EmptyCard(message: 'No active service requests.'))
                      : SliverList(
                          delegate: SliverChildBuilderDelegate(
                            (_, i) => _ComplaintTile(complaint: _recentActive[i], onTap: () => _openJob(_recentActive[i].id)),
                            childCount: _recentActive.length,
                          ),
                        ),

                  const SliverToBoxAdapter(child: SizedBox(height: 100)),
                ],
              ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final int value;
  final String sub;
  final IconData icon;
  final Color color;

  const _StatCard({required this.label, required this.value, required this.sub, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: kPanelDark,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.25)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(height: 8),
            Text(value.toString(), style: TextStyle(color: color, fontSize: 24, fontWeight: FontWeight.bold)),
            const SizedBox(height: 2),
            Text(label, style: const TextStyle(color: kTextPrimary, fontSize: 12, fontWeight: FontWeight.w600)),
            Text(sub, style: const TextStyle(color: kTextSecondary, fontSize: 10)),
          ],
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final IconData icon;
  final String? badge;

  const _SectionHeader({required this.title, required this.icon, this.badge});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
      child: Row(
        children: [
          Icon(icon, color: kAccent, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(title, style: const TextStyle(color: kTextPrimary, fontSize: 15, fontWeight: FontWeight.w600)),
          ),
          if (badge != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
              decoration: BoxDecoration(
                color: kAccent.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: kAccent.withValues(alpha: 0.3)),
              ),
              child: Text(badge!, style: const TextStyle(color: kAccent, fontSize: 12, fontWeight: FontWeight.bold)),
            ),
        ],
      ),
    );
  }
}

class _EmptyCard extends StatelessWidget {
  final String message;
  const _EmptyCard({required this.message});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: kPanelDark,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: kBorderColor, style: BorderStyle.solid),
        ),
        child: Center(
          child: Text(message, style: const TextStyle(color: kTextSecondary, fontSize: 13)),
        ),
      ),
    );
  }
}

class _ComplaintTile extends StatelessWidget {
  final Complaint complaint;
  final VoidCallback onTap;

  const _ComplaintTile({required this.complaint, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final borderColor = complaint.status == 'Ready for Delivery' || complaint.status == 'Ready'
        ? kStatusReady
        : complaint.status == 'In Progress'
            ? kAccent
            : complaint.status == 'Pending'
                ? kStatusPending
                : kBorderColor;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Material(
        color: kPanelDark,
        borderRadius: BorderRadius.circular(10),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(10),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(10),
              border: Border(left: BorderSide(color: borderColor, width: 3)),
              color: Colors.transparent,
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            complaint.displayId,
                            style: const TextStyle(color: kAccent, fontWeight: FontWeight.bold, fontSize: 13),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              complaint.itemName ?? '—',
                              style: const TextStyle(color: kTextPrimary, fontWeight: FontWeight.w600, fontSize: 14),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        complaint.isOnSite
                            ? '${complaint.customerName ?? '—'} · ${complaint.customerPhone ?? '—'}'
                            : 'S/N: ${complaint.serialNo ?? '—'}',
                        style: const TextStyle(color: kTextSecondary, fontSize: 12),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                StatusBadge(status: complaint.status),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
