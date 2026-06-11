import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'screens/login_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/requests_screen.dart';
import 'screens/intake_screen.dart';
import 'screens/settings_screen.dart';
import 'theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Lock to portrait
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);
  // Transparent status bar
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
  ));
  runApp(
    ChangeNotifierProvider(
      create: (_) => AuthProvider(),
      child: const HyperCareApp(),
    ),
  );
}

class HyperCareApp extends StatelessWidget {
  const HyperCareApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Hyper-Care',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      initialRoute: '/splash',
      routes: {
        '/splash': (_) => const _SplashScreen(),
        '/login': (_) => const LoginScreen(),
        '/': (_) => const _AuthGuard(child: DashboardScreen()),
        '/requests': (_) => const _AuthGuard(child: RequestsScreen()),
        '/intake': (_) => const _AuthGuard(child: IntakeScreen()),
        '/settings': (_) => const _AdminGuard(child: SettingsScreen()),
      },
    );
  }
}

// Splash while auth initializes
class _SplashScreen extends StatefulWidget {
  const _SplashScreen();

  @override
  State<_SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<_SplashScreen> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _scale;
  late Animation<double> _fade;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 800));
    _scale = Tween(begin: 0.7, end: 1.0).animate(CurvedAnimation(parent: _ctrl, curve: Curves.elasticOut));
    _fade = CurvedAnimation(parent: _ctrl, curve: Curves.easeOut);
    _ctrl.forward();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    if (!auth.loading) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        if (auth.isAuthenticated) {
          Navigator.of(context).pushReplacementNamed('/');
        } else {
          Navigator.of(context).pushReplacementNamed('/login');
        }
      });
    }

    return Scaffold(
      backgroundColor: kBgDark,
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [kBgDark, Color(0xFF0D1B2A)],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: Center(
          child: FadeTransition(
            opacity: _fade,
            child: ScaleTransition(
              scale: _scale,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.all(22),
                    decoration: BoxDecoration(
                      color: kAccent.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(28),
                      border: Border.all(color: kAccent.withValues(alpha: 0.3)),
                      boxShadow: [
                        BoxShadow(color: kAccent.withValues(alpha: 0.2), blurRadius: 40),
                      ],
                    ),
                    child: Image.asset('assets/images/logo.png', width: 60, height: 60),
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    'Hyper-Care',
                    style: TextStyle(
                      color: kAccent,
                      fontSize: 36,
                      fontWeight: FontWeight.bold,
                      letterSpacing: -1,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Customer Service Management',
                    style: TextStyle(color: kTextSecondary, fontSize: 14),
                  ),
                  const SizedBox(height: 48),
                  const SizedBox(
                    width: 28,
                    height: 28,
                    child: CircularProgressIndicator(
                      color: kAccent,
                      strokeWidth: 2.5,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// Route guards
class _AuthGuard extends StatelessWidget {
  final Widget child;
  const _AuthGuard({required this.child});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    if (!auth.isAuthenticated) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Navigator.of(context).pushReplacementNamed('/login');
      });
      return const Scaffold(
        backgroundColor: kBgDark,
        body: Center(child: CircularProgressIndicator(color: kAccent)),
      );
    }
    return child;
  }
}

class _AdminGuard extends StatelessWidget {
  final Widget child;
  const _AdminGuard({required this.child});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    if (!auth.isAuthenticated) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Navigator.of(context).pushReplacementNamed('/login');
      });
      return const Scaffold(backgroundColor: kBgDark, body: SizedBox.shrink());
    }
    if (!auth.isAdmin) {
      return Scaffold(
        backgroundColor: kBgDark,
        appBar: AppBar(backgroundColor: kPanelDark, title: const Text('Settings')),
        body: const Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.lock_rounded, color: kStatusPending, size: 48),
              SizedBox(height: 12),
              Text('Admin access required', style: TextStyle(color: kTextSecondary)),
            ],
          ),
        ),
      );
    }
    return child;
  }
}
