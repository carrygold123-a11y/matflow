import 'dart:io';

import 'package:flutter/foundation.dart';

import '../models/auth_session.dart';
import '../models/material_item.dart';
import '../services/api_service.dart';
import '../services/cache_service.dart';

class MaterialsProvider extends ChangeNotifier {
  MaterialsProvider({required ApiService apiService, required CacheService cacheService})
      : _apiService = apiService,
        _cacheService = cacheService;

  final ApiService _apiService;
  final CacheService _cacheService;

  List<MaterialItem> _materials = const [];
  bool _isLoading = false;
  String? _errorMessage;

  List<MaterialItem> get materials => _materials;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> restoreCache() async {
    final cachedMaterials = _cacheService.readMaterials();
    _materials = cachedMaterials.map(MaterialItem.fromJson).toList();
    notifyListeners();
  }

  Future<void> refresh(AuthSession session) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _materials = await _apiService.fetchMaterials(session.token);
      await _cacheService.writeMaterials(_materials.map((item) => item.toJson()).toList());
    } catch (error) {
      _errorMessage = error.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> reserve(AuthSession session, String materialId) async {
    await _apiService.reserveMaterial(session.token, materialId);
    await refresh(session);
  }

  Future<void> updateStatus(AuthSession session, String materialId, String status) async {
    await _apiService.updateMaterialStatus(session.token, materialId, status);
    await refresh(session);
  }

  Future<void> deleteMaterial(AuthSession session, String materialId) async {
    await _apiService.deleteMaterial(session.token, materialId);
    await refresh(session);
  }

  Future<void> refreshFiltered(
    AuthSession session, {
    String text = '',
    String category = '',
    String status = '',
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      _materials = await _apiService.fetchMaterialsFiltered(
        session.token,
        text: text,
        category: category,
        status: status,
      );
    } catch (error) {
      _errorMessage = error.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> createMaterial({
    required AuthSession session,
    required String title,
    required String description,
    required String category,
    required double quantity,
    required String condition,
    required String siteId,
    required double latitude,
    required double longitude,
    required File imageFile,
  }) async {
    await _apiService.createMaterial(
      token: session.token,
      title: title,
      description: description,
      category: category,
      quantity: quantity,
      condition: condition,
      siteId: siteId,
      latitude: latitude,
      longitude: longitude,
      image: imageFile,
    );
    await refresh(session);
  }
}
