import 'package:flutter/foundation.dart';

import '../models/auth_session.dart';
import '../models/user_item.dart';
import '../services/api_service.dart';

class UsersProvider extends ChangeNotifier {
  UsersProvider({required ApiService apiService}) : _apiService = apiService;

  final ApiService _apiService;

  List<UserItem> _users = const [];
  bool _isLoading = false;
  String? _errorMessage;

  List<UserItem> get users => _users;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> refresh(AuthSession session) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _users = await _apiService.fetchUsers(session.token);
    } catch (error) {
      _errorMessage = error.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
