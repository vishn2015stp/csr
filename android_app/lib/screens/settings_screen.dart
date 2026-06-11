import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../models/user.dart';
import '../theme.dart';
import '../widgets/app_drawer.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _api = ApiService();
  List<UserModel> _users = [];
  bool _loadingUsers = true;
  Map<String, dynamic> _settings = {};

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loadingUsers = true);
    try {
      final users = await _api.getUsers();
      final settings = await _api.getSettings();
      setState(() {
        _users = users;
        _settings = settings;
        _loadingUsers = false;
      });
    } catch (e) {
      setState(() => _loadingUsers = false);
    }
  }

  Future<void> _createUser() async {
    final usernameCtrl = TextEditingController();
    final passwordCtrl = TextEditingController();
    String role = 'USER';

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          backgroundColor: kPanelDark,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          title: const Text('Create User', style: TextStyle(color: kTextPrimary)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: usernameCtrl,
                style: const TextStyle(color: kTextPrimary),
                decoration: const InputDecoration(labelText: 'Username'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: passwordCtrl,
                obscureText: true,
                style: const TextStyle(color: kTextPrimary),
                decoration: const InputDecoration(labelText: 'Password'),
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                value: role,
                dropdownColor: kPanelDark2,
                style: const TextStyle(color: kTextPrimary),
                decoration: const InputDecoration(labelText: 'Role'),
                items: ['USER', 'ADMIN']
                    .map((r) => DropdownMenuItem(value: r, child: Text(r)))
                    .toList(),
                onChanged: (v) { if (v != null) setDialogState(() => role = v); },
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
            ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Create')),
          ],
        ),
      ),
    );

    if (confirmed == true) {
      try {
        await _api.createUser(usernameCtrl.text.trim(), passwordCtrl.text, role);
        await _loadData();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('User created'), backgroundColor: kStatusDelivered),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error: $e'), backgroundColor: kStatusPending),
          );
        }
      }
    }
  }

  Future<void> _deleteUser(UserModel user) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: kPanelDark,
        title: const Text('Delete User', style: TextStyle(color: kTextPrimary)),
        content: Text('Are you sure you want to delete "${user.username}"?',
            style: const TextStyle(color: kTextSecondary)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: kStatusPending),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      try {
        await _api.deleteUser(user.id);
        await _loadData();
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error: $e'), backgroundColor: kStatusPending),
          );
        }
      }
    }
  }

  Future<void> _changePassword() async {
    final auth = context.read<AuthProvider>();
    final currCtrl = TextEditingController();
    final newCtrl = TextEditingController();
    final confirmCtrl = TextEditingController();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: kPanelDark,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        title: const Text('Change Password', style: TextStyle(color: kTextPrimary)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: currCtrl, obscureText: true, style: const TextStyle(color: kTextPrimary),
                decoration: const InputDecoration(labelText: 'Current Password')),
            const SizedBox(height: 10),
            TextField(controller: newCtrl, obscureText: true, style: const TextStyle(color: kTextPrimary),
                decoration: const InputDecoration(labelText: 'New Password')),
            const SizedBox(height: 10),
            TextField(controller: confirmCtrl, obscureText: true, style: const TextStyle(color: kTextPrimary),
                decoration: const InputDecoration(labelText: 'Confirm Password')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(onPressed: () => Navigator.pop(context, true), child: const Text('Change')),
        ],
      ),
    );

    if (confirmed == true && auth.user != null) {
      if (newCtrl.text != confirmCtrl.text) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Passwords do not match'), backgroundColor: kStatusPending),
        );
        return;
      }
      try {
        await _api.changePassword(auth.user!.id, currCtrl.text, newCtrl.text);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Password changed successfully'), backgroundColor: kStatusDelivered),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error: $e'), backgroundColor: kStatusPending),
          );
        }
      }
    }
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
        title: const Text('Settings'),
      ),
      drawer: const AppDrawer(currentRoute: '/settings'),
      body: _loadingUsers
          ? const Center(child: CircularProgressIndicator(color: kAccent))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // My Account
                _SettingsSection(
                  title: 'My Account',
                  icon: Icons.manage_accounts_rounded,
                  child: Column(
                    children: [
                      ListTile(
                        leading: const Icon(Icons.person_rounded, color: kAccent),
                        title: const Text('Username', style: TextStyle(color: kTextSecondary, fontSize: 13)),
                        subtitle: Text(auth.user?.username ?? '—', style: const TextStyle(color: kTextPrimary, fontWeight: FontWeight.w600)),
                        contentPadding: EdgeInsets.zero,
                      ),
                      ListTile(
                        leading: const Icon(Icons.badge_rounded, color: kAccent),
                        title: const Text('Role', style: TextStyle(color: kTextSecondary, fontSize: 13)),
                        subtitle: Text(auth.user?.role ?? '—', style: const TextStyle(color: kTextPrimary, fontWeight: FontWeight.w600)),
                        contentPadding: EdgeInsets.zero,
                      ),
                      const Divider(color: kBorderColor),
                      ListTile(
                        leading: const Icon(Icons.lock_reset_rounded, color: kAccent),
                        title: const Text('Change Password', style: TextStyle(color: kTextPrimary)),
                        trailing: const Icon(Icons.chevron_right_rounded, color: kTextSecondary),
                        onTap: _changePassword,
                        contentPadding: EdgeInsets.zero,
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 16),

                if (auth.isAdmin) ...[
                  // User Management
                  _SettingsSection(
                    title: 'User Management',
                    icon: Icons.group_rounded,
                    trailing: IconButton(
                      icon: const Icon(Icons.person_add_rounded, color: kAccent),
                      onPressed: _createUser,
                      tooltip: 'Add User',
                    ),
                    child: Column(
                      children: _users.map((u) => _UserTile(
                        user: u,
                        isSelf: u.id == auth.user?.id,
                        onDelete: () => _deleteUser(u),
                      )).toList(),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // App Info
                _SettingsSection(
                  title: 'About',
                  icon: Icons.info_outline_rounded,
                  child: Column(
                    children: [
                      _AboutRow('App', 'Hyper-Care'),
                      _AboutRow('Backend', 'csrhypertech.vercel.app'),
                      _AboutRow('Version', '1.0.0'),
                      _AboutRow('Developer', 'Hypertech Digital'),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // Logout
                ElevatedButton.icon(
                  onPressed: () async {
                    await auth.logout();
                    if (mounted) Navigator.of(context).pushReplacementNamed('/login');
                  },
                  icon: const Icon(Icons.logout_rounded),
                  label: const Text('Logout'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: kStatusPending,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                ),
              ],
            ),
    );
  }
}

class _SettingsSection extends StatelessWidget {
  final String title;
  final IconData icon;
  final Widget child;
  final Widget? trailing;

  const _SettingsSection({required this.title, required this.icon, required this.child, this.trailing});

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
            padding: const EdgeInsets.fromLTRB(16, 12, 8, 8),
            child: Row(
              children: [
                Icon(icon, color: kAccent, size: 16),
                const SizedBox(width: 8),
                Text(title, style: const TextStyle(color: kAccent, fontSize: 13, fontWeight: FontWeight.w600)),
                const Spacer(),
                if (trailing != null) trailing!,
              ],
            ),
          ),
          const Divider(color: kBorderColor, height: 1),
          Padding(padding: const EdgeInsets.all(16), child: child),
        ],
      ),
    );
  }
}

class _UserTile extends StatelessWidget {
  final UserModel user;
  final bool isSelf;
  final VoidCallback onDelete;

  const _UserTile({required this.user, required this.isSelf, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Container(
            width: 36, height: 36,
            decoration: BoxDecoration(
              color: kAccent.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.person_rounded, color: kAccent, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(user.username, style: const TextStyle(color: kTextPrimary, fontWeight: FontWeight.w600)),
                    if (isSelf) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                        decoration: BoxDecoration(
                          color: kAccent.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text('You', style: TextStyle(color: kAccent, fontSize: 10)),
                      ),
                    ],
                  ],
                ),
                Text(user.role, style: const TextStyle(color: kTextSecondary, fontSize: 12)),
              ],
            ),
          ),
          if (!isSelf)
            IconButton(
              icon: const Icon(Icons.delete_outline_rounded, color: kStatusPending, size: 20),
              onPressed: onDelete,
            ),
        ],
      ),
    );
  }
}

class _AboutRow extends StatelessWidget {
  final String label;
  final String value;

  const _AboutRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          SizedBox(width: 100, child: Text(label, style: const TextStyle(color: kTextSecondary, fontSize: 13))),
          Expanded(child: Text(value, style: const TextStyle(color: kTextPrimary, fontSize: 13, fontWeight: FontWeight.w500))),
        ],
      ),
    );
  }
}
