import 'package:flutter/foundation.dart';

import '../models/auth_session.dart';
import '../services/api_service.dart';
import '../services/cache_service.dart';

class SessionProvider extends ChangeNotifier {
  SessionProvider({required ApiService apiService, required CacheService cacheService})
      : _apiService = apiService,
        _cacheService = cacheService;

  final ApiService _apiService;
  final CacheService _cacheService;

  AuthSession? _session;
  bool _isLoading = false;

  AuthSession? get session => _session;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _session != null;

  Future<void> restore() async {
    final cachedSession = _cacheService.readSession();
    if (cachedSession != null) {
      _session = AuthSession.fromJson(cachedSession);
      notifyListeners();
    }
  }

  Future<void> login({required String email, required String password}) async {
    _isLoading = true;
    notifyListeners();
    try {
      _session = await _apiService.login(email: email, password: password);
      await _cacheService.writeSession(_session!.toJson());
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    _session = null;
    await _cacheService.writeSession(null);
    notifyListeners();
  }
}
