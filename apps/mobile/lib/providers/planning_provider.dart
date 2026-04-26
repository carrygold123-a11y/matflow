import 'package:flutter/foundation.dart';

import '../models/auth_session.dart';
import '../models/site_plan_item.dart';
import '../services/api_service.dart';

class PlanningProvider extends ChangeNotifier {
  PlanningProvider({required ApiService apiService}) : _apiService = apiService;

  final ApiService _apiService;

  SitePlanItem? _plan;
  SitePlanItem? _draft;
  bool _isLoading = false;
  bool _isSaving = false;
  String? _errorMessage;

  SitePlanItem? get plan => _plan;
  SitePlanItem? get draft => _draft;
  bool get isLoading => _isLoading;
  bool get isSaving => _isSaving;
  String? get errorMessage => _errorMessage;

  Future<void> refresh(AuthSession session, {DateTime? date}) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final activeDate = date ?? DateTime.now();
    final planDate = _formatDate(activeDate);

    try {
      _plan = await _apiService.fetchSitePlan(
        session.token,
        planDate: planDate,
        siteId: session.siteId,
      );
      _draft = null;
    } catch (error) {
      _errorMessage = error.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void edit(SitePlanItem plan) {
    _draft = plan;
    notifyListeners();
  }

  void cancelEdit() {
    _draft = null;
    notifyListeners();
  }

  Future<void> upsert(AuthSession session, SitePlanItem draft) async {
    _isSaving = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final zones = draft.zones.map((z) => z.toJson()).toList();
      final updated = await _apiService.upsertSitePlan(
        session.token,
        planDate: draft.planDate,
        status: draft.status,
        shiftStatus: draft.shiftStatus,
        briefing: draft.briefing,
        safetyNotes: draft.safetyNotes,
        zones: zones,
        siteId: session.siteId,
      );
      _plan = updated;
      _draft = null;
    } catch (error) {
      _errorMessage = error.toString();
    } finally {
      _isSaving = false;
      notifyListeners();
    }
  }

  String _formatDate(DateTime date) {
    final month = date.month.toString().padLeft(2, '0');
    final day = date.day.toString().padLeft(2, '0');
    return '${date.year}-$month-$day';
  }
}
