import 'package:flutter/foundation.dart';

import '../models/auth_session.dart';
import '../models/site_summary.dart';
import '../models/transport_request_item.dart';
import '../models/truck_item.dart';
import '../services/api_service.dart';
import '../services/cache_service.dart';

class TransportProvider extends ChangeNotifier {
  TransportProvider({required ApiService apiService, required CacheService cacheService})
      : _apiService = apiService,
        _cacheService = cacheService;

  final ApiService _apiService;
  final CacheService _cacheService;

  List<TransportRequestItem> _transports = const [];
  List<SiteSummary> _sites = const [];
  List<TruckItem> _trucks = const [];
  bool _isLoading = false;
  String? _errorMessage;

  List<TransportRequestItem> get transports => _transports;
  List<SiteSummary> get sites => _sites;
  List<TruckItem> get trucks => _trucks;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> restoreCache() async {
    _transports = _cacheService.readTransports().map(TransportRequestItem.fromJson).toList();
    notifyListeners();
  }

  Future<void> refresh(AuthSession session) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final results = await Future.wait([
        _apiService.fetchTransports(session.token),
        _apiService.fetchSites(session.token),
        _apiService.fetchTrucks(session.token),
      ]);
      _transports = results[0] as List<TransportRequestItem>;
      _sites = results[1] as List<SiteSummary>;
      _trucks = results[2] as List<TruckItem>;
      await _cacheService.writeTransports(_transports.map((item) => item.toJson()).toList());
    } catch (error) {
      _errorMessage = error.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> createTransport({
    required AuthSession session,
    required String materialId,
    required String toSiteId,
    required String truckId,
  }) async {
    await _apiService.createTransport(
      token: session.token,
      materialId: materialId,
      toSiteId: toSiteId,
      truckId: truckId,
    );
    await refresh(session);
  }

  Future<void> updateStatus({
    required AuthSession session,
    required String transportId,
    required String status,
  }) async {
    await _apiService.updateTransportStatus(session.token, transportId, status);
    await refresh(session);
  }

  Future<void> createSite({
    required AuthSession session,
    required String name,
    required double latitude,
    required double longitude,
  }) async {
    await _apiService.createSite(
      token: session.token,
      name: name,
      latitude: latitude,
      longitude: longitude,
    );
    await refresh(session);
  }

  Future<void> deleteSite({
    required AuthSession session,
    required String siteId,
  }) async {
    await _apiService.deleteSite(session.token, siteId);
    await refresh(session);
  }
}
