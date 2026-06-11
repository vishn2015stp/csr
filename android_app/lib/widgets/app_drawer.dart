import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../theme.dart';

class AppDrawer extends StatelessWidget {
  final String currentRoute;
  const AppDrawer({super.key, required this.currentRoute});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Drawer(
      child: Column(
        children: [
          // Header
          Container(
            width: double.infinity,
            padding: EdgeInsets.only(
              top: MediaQuery.of(context).padding.top + 24,
              bottom: 24,
              left: 20,
              right: 20,
            ),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [kPanelDark, kPanelDark2],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              border: Border(bottom: BorderSide(color: kBorderColor)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: kAccent.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: kAccent.withValues(alpha: 0.3)),
                  ),
                  child: Image.asset('assets/images/logo.png', width: 28, height: 28),
                ),
                const SizedBox(height: 14),
                const Text(
                  'Hyper-Care',
                  style: TextStyle(
                    color: kAccent,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.person_outline, color: kTextSecondary, size: 14),
                    const SizedBox(width: 4),
                    Text(
                      auth.user?.username ?? '',
                      style: const TextStyle(color: kTextSecondary, fontSize: 13),
                    ),
                    if (auth.isAdmin) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: kAccent.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text('ADMIN', style: TextStyle(color: kAccent, fontSize: 10, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 8),

          // Nav items
          _NavItem(
            icon: Icons.dashboard_rounded,
            label: 'Dashboard',
            route: '/',
            isActive: currentRoute == '/',
          ),
          _NavItem(
            icon: Icons.list_alt_rounded,
            label: 'All Requests',
            route: '/requests',
            isActive: currentRoute == '/requests',
          ),
          _NavItem(
            icon: Icons.add_circle_outline_rounded,
            label: 'New Intake',
            route: '/intake',
            isActive: currentRoute == '/intake',
          ),
          if (auth.isAdmin)
            _NavItem(
              icon: Icons.settings_rounded,
              label: 'Settings',
              route: '/settings',
              isActive: currentRoute == '/settings',
            ),

          const Spacer(),

          const Divider(color: kBorderColor, height: 1),
          ListTile(
            leading: const Icon(Icons.logout_rounded, color: kStatusPending),
            title: const Text('Logout', style: TextStyle(color: kStatusPending)),
            onTap: () async {
              Navigator.of(context).pop();
              await context.read<AuthProvider>().logout();
            },
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String route;
  final bool isActive;

  const _NavItem({
    required this.icon,
    required this.label,
    required this.route,
    required this.isActive,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
      decoration: BoxDecoration(
        color: isActive ? kAccent.withValues(alpha: 0.12) : Colors.transparent,
        borderRadius: BorderRadius.circular(10),
        border: isActive ? Border.all(color: kAccent.withValues(alpha: 0.25)) : null,
      ),
      child: ListTile(
        leading: Icon(icon, color: isActive ? kAccent : kTextSecondary, size: 22),
        title: Text(
          label,
          style: TextStyle(
            color: isActive ? kAccent : kTextPrimary,
            fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
        onTap: () {
          Navigator.of(context).pop();
          if (!isActive) Navigator.of(context).pushReplacementNamed(route);
        },
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }
}
