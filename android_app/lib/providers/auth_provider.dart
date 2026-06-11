import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  UserModel? _user;
  bool _loading = true;
  String? _sessionId;
  Timer? _sessionTimer;

  final ApiService _api = ApiService();

  UserModel? get user => _user;
  bool get loading => _loading;
  bool get isAdmin => _user?.isAdmin ?? false;
  bool get isAuthenticated => _user != null;

  AuthProvider() {
    _init();
  }

  Future<void> _init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userJson = prefs.getString('userJson');
      final sessionId = prefs.getString('sessionId');
      
      if (userJson != null) {
        _user = UserModel.fromJson(jsonDecode(userJson));
        _sessionId = sessionId;
        _startSessionTimer();
        // Fire off a background check immediately
        _checkSession();
      }
    } catch (e) {
      debugPrint('Auth init error: $e');
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>> login(String username, String password, {bool force = false}) async {
    try {
      final data = await _api.login(username, password, force: force);
      if (data['success'] == true) {
        _user = UserModel.fromJson(data['user']);
        _sessionId = data['sessionId']?.toString();

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('userId', _user!.id);
        await prefs.setString('userJson', jsonEncode(data['user']));
        if (_sessionId != null) await prefs.setString('sessionId', _sessionId!);

        _startSessionTimer();
        notifyListeners();
        return {'success': true};
      } else if (data['alreadyLoggedIn'] == true) {
        return {'success': false, 'alreadyLoggedIn': true, 'message': data['message']};
      }
    } catch (e) {
      return {'success': false, 'error': e.toString().replaceFirst('Exception: ', '')};
    }
    return {'success': false, 'error': 'Invalid username or password'};
  }

  Future<void> logout() async {
    _sessionTimer?.cancel();
    try {
      if (_user != null) await _api.logout(_user!.id);
    } catch (_) {}
    _user = null;
    _sessionId = null;
    await _clearSessionPrefs();
    notifyListeners();
  }

  void _startSessionTimer() {
    _sessionTimer?.cancel();
    _sessionTimer = Timer.periodic(const Duration(seconds: 10), (_) async {
      await _checkSession();
    });
  }

  Future<void> _checkSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('userId');
      final sessionId = prefs.getString('sessionId');
      if (userId == null) return;
      final u = await _api.getUser(userId, sessionId: sessionId);
      if (u == null && _user != null) {
        _sessionTimer?.cancel();
        _user = null;
        _sessionId = null;
        await _clearSession(prefs);
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Session check error: $e');
    }
  }

  Future<void> _clearSession(SharedPreferences prefs) async {
    await prefs.remove('userId');
    await prefs.remove('userJson');
    await prefs.remove('sessionId');
  }

  Future<void> _clearSessionPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    await _clearSession(prefs);
  }
}
