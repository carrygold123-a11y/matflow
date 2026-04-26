import 'package:flutter/foundation.dart';

import '../models/auth_session.dart';
import '../models/notification_item.dart';
import '../services/api_service.dart';

class NotificationsProvider extends ChangeNotifier {
  NotificationsProvider({required ApiService apiService}) : _apiService = apiService;

  final ApiService _apiService;

  List<NotificationItem> _notifications = const [];
  bool _isLoading = false;

  List<NotificationItem> get notifications => _notifications;
  bool get isLoading => _isLoading;

  Future<void> refresh(AuthSession session) async {
    _isLoading = true;
    notifyListeners();
    try {
      _notifications = await _apiService.fetchNotifications(session.token);
    } catch (_) {
      // ignore network errors — show cached/empty
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
