import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import '../models/auth_session.dart';
import '../models/material_item.dart';
import '../models/notification_item.dart';
import '../models/site_plan_item.dart';
import '../models/site_summary.dart';
import '../models/transport_request_item.dart';
import '../models/truck_item.dart';
import '../models/user_item.dart';

class ApiService {
  ApiService({http.Client? client})
      : _client = client ?? http.Client(),
        _baseUrls = _buildBaseUrls();

  final http.Client _client;
  static const String _cloudFallbackBaseUrl = 'https://matflow-production.up.railway.app';
  static const String _configuredBaseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: '');
  final List<String> _baseUrls;
  String? _activeBaseUrl;

  Future<AuthSession> login({required String email, required String password}) async {
    final response = await _requestWithFallback((baseUrl) {
      return _client
          .post(
            Uri.parse('$baseUrl/auth/login'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'email': email, 'password': password}),
          )
          .timeout(const Duration(seconds: 4));
    });

    _throwIfNeeded(response);
    return AuthSession.fromLoginResponse(jsonDecode(response.body) as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> driverLogin({
    required String licensePlate,
  }) async {
    final response = await _requestWithFallback((baseUrl) {
      return _client
          .post(
            Uri.parse('$baseUrl/auth/driver-login'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'licensePlate': licensePlate}),
          )
          .timeout(const Duration(seconds: 4));
    });

    _throwIfNeeded(response);
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> createDriverNote({
    required String token,
    required String vehicleType,
    required String driverName,
    required String fromSiteId,
    required String toSiteId,
    required String signatureSvg,
  }) async {
    final response = await _requestWithFallback((baseUrl) {
      return _client
          .post(
            Uri.parse('$baseUrl/driver-notes'),
            headers: _headers(token),
            body: jsonEncode({
              'vehicleType': vehicleType,
              'driverName': driverName,
              'fromSiteId': fromSiteId,
              'toSiteId': toSiteId,
              'signatureSvg': signatureSvg,
            }),
          )
          .timeout(const Duration(seconds: 10));
    });
    _throwIfNeeded(response);
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  Future<List<MaterialItem>> fetchMaterials(String token) async {
    final response = await _requestWithFallback((baseUrl) {
      return _client
          .get(Uri.parse('$baseUrl/materials?distance=250'), headers: _headers(token))
          .timeout(const Duration(seconds: 4));
    });
    _throwIfNeeded(response);
    return (jsonDecode(response.body) as List<dynamic>)
        .map((entry) => MaterialItem.fromJson(entry as Map<String, dynamic>))
        .toList();
  }

  Future<List<MaterialItem>> fetchMaterialsFiltered(
    String token, {
    String text = '',
    String category = '',
    String status = '',
    int distance = 250,
  }) async {
    final params = <String, String>{'distance': distance.toString()};
    if (text.isNotEmpty) params['text'] = text;
    if (category.isNotEmpty) params['category'] = category;
    if (status.isNotEmpty) params['status'] = status;
    final response = await _requestWithFallback((baseUrl) {
      final uri = Uri.parse('$baseUrl/materials').replace(queryParameters: params);
      return _client.get(uri, headers: _headers(token)).timeout(const Duration(seconds: 4));
    });
    _throwIfNeeded(response);
    return (jsonDecode(response.body) as List<dynamic>)
        .map((entry) => MaterialItem.fromJson(entry as Map<String, dynamic>))
        .toList();
  }

  Future<MaterialItem> reserveMaterial(String token, String materialId) async {
    final response = await _requestWithFallback((baseUrl) {
      return _client
          .post(Uri.parse('$baseUrl/materials/$materialId/reserve'), headers: _headers(token))
          .timeout(const Duration(seconds: 4));
    });
    _throwIfNeeded(response);
    return MaterialItem.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  Future<MaterialItem> updateMaterialStatus(String token, String materialId, String status) async {
    final response = await _requestWithFallback((baseUrl) {
      return _client
          .patch(
            Uri.parse('$baseUrl/materials/$materialId/status'),
            headers: _headers(token),
            body: jsonEncode({'status': status}),
          )
          .timeout(const Duration(seconds: 4));
    });
    _throwIfNeeded(response);
    return MaterialItem.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  Future<void> deleteMaterial(String token, String materialId) async {
    final response = await _requestWithFallback((baseUrl) {
      return _client.delete(Uri.parse('$baseUrl/materials/$materialId'), headers: _headers(token)).timeout(const Duration(seconds: 4));
    });
    _throwIfNeeded(response);
  }

  Future<Map<String, int>> getMaterialDependents(String token, String materialId) async {
    final response = await _requestWithFallback((baseUrl) {
      return _client.get(Uri.parse('$baseUrl/materials/$materialId/dependents'), headers: _headers(token)).timeout(const Duration(seconds: 4));
    });
    _throwIfNeeded(response);
    final json = jsonDecode(response.body) as Map<String, dynamic>;
    return { 'transports': json['transports'] as int, 'zones': json['zones'] as int };
  }

  Future<MaterialItem> createMaterial({
    required String token,
    required String title,
    required String description,
    required String category,
    required double quantity,
    required String condition,
    required String siteId,
    required double latitude,
    required double longitude,
    required File image,
  }) async {
    Object? lastError;
    for (final baseUrl in _orderedBaseUrls()) {
      try {
        final request = http.MultipartRequest('POST', Uri.parse('$baseUrl/materials'));
        request.headers.addAll({'Authorization': 'Bearer $token'});
        request.fields.addAll({
          'title': title,
          'description': description,
          'quantity': quantity.toString(),
          'condition': condition,
          'siteId': siteId,
          'latitude': latitude.toString(),
          'longitude': longitude.toString(),
        });
        if (category.isNotEmpty) {
          request.fields['category'] = category;
        }
        request.files.add(await http.MultipartFile.fromPath('image', image.path));

        final streamedResponse = await request.send().timeout(const Duration(seconds: 10));
        final response = await http.Response.fromStream(streamedResponse);
        _throwIfNeeded(response);
        _activeBaseUrl = baseUrl;
        return MaterialItem.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
      } on SocketException catch (error) {
        lastError = error;
      } on TimeoutException catch (error) {
        lastError = error;
      } on http.ClientException catch (error) {
        lastError = error;
      }
    }

    throw HttpException('API nicht erreichbar (${lastError ?? 'unknown error'})');
  }

  Future<List<TransportRequestItem>> fetchTransports(String token) async {
    final response = await _requestWithFallback((baseUrl) {
      return _client
          .get(Uri.parse('$baseUrl/transport-requests'), headers: _headers(token))
          .timeout(const Duration(seconds: 4));
    });
    _throwIfNeeded(response);
    return (jsonDecode(response.body) as List<dynamic>)
        .map((entry) => TransportRequestItem.fromJson(entry as Map<String, dynamic>))
        .toList();
  }

  Future<TransportRequestItem> createTransport({
    required String token,
    required String materialId,
    required String toSiteId,
    required String truckId,
  }) async {
    final response = await _requestWithFallback((baseUrl) {
      return _client
          .post(
            Uri.parse('$baseUrl/transport-requests'),
            headers: _headers(token),
            body: jsonEncode({
              'materialId': materialId,
              'toSiteId': toSiteId,
              'truckId': truckId,
            }),
          )
          .timeout(const Duration(seconds: 4));
    });
    _throwIfNeeded(response);
    return TransportRequestItem.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  Future<TransportRequestItem> updateTransportStatus(String token, String transportId, String status) async {
    final response = await _requestWithFallback((baseUrl) {
      return _client
          .patch(
            Uri.parse('$baseUrl/transport-requests/$transportId/status'),
            headers: _headers(token),
            body: jsonEncode({'status': status}),
          )
          .timeout(const Duration(seconds: 4));
    });
    _throwIfNeeded(response);
    return TransportRequestItem.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  Future<List<SiteSummary>> fetchSites(String token) async {
    final response = await _requestWithFallback((baseUrl) {
      return _client.get(Uri.parse('$baseUrl/sites'), headers: _headers(token)).timeout(const Duration(seconds: 4));
    });
    _throwIfNeeded(response);
    return (jsonDecode(response.body) as List<dynamic>)
        .map((entry) => SiteSummary.fromJson(entry as Map<String, dynamic>))
        .toList();
  }

  Future<SiteSummary> createSite({
    required String token,
    required String name,
    required double latitude,
    required double longitude,
  }) async {
    final response = await _requestWithFallback((baseUrl) {
      return _client
          .post(
            Uri.parse('$baseUrl/sites'),
            headers: _headers(token),
            body: jsonEncode({
              'name': name,
              'latitude': latitude,
              'longitude': longitude,
            }),
          )
          .timeout(const Duration(seconds: 4));
    });
    _throwIfNeeded(response);
    return SiteSummary.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  Future<void> deleteSite(String token, String siteId) async {
    final response = await _requestWithFallback((baseUrl) {
      return _client.delete(Uri.parse('$baseUrl/sites/$siteId'), headers: _headers(token)).timeout(const Duration(seconds: 4));
    });
    _throwIfNeeded(response);
  }

  Future<Map<String, int>> getSiteDependents(String token, String siteId) async {
    final response = await _requestWithFallback((baseUrl) {
      return _client.get(Uri.parse('$baseUrl/sites/$siteId/dependents'), headers: _headers(token)).timeout(const Duration(seconds: 4));
    });
    _throwIfNeeded(response);
    final json = jsonDecode(response.body) as Map<String, dynamic>;
    return {
      'users': json['users'] as int,
      'materials': json['materials'] as int,
      'trucks': json['trucks'] as int,
      'sitePlans': json['sitePlans'] as int,
      'transports': json['transports'] as int,
    };
  }

  Future<List<TruckItem>> fetchTrucks(String token) async {
    final response = await _requestWithFallback((baseUrl) {
      return _client.get(Uri.parse('$baseUrl/trucks'), headers: _headers(token)).timeout(const Duration(seconds: 4));
    });
    _throwIfNeeded(response);
    return (jsonDecode(response.body) as List<dynamic>)
        .map((entry) => TruckItem.fromJson(entry as Map<String, dynamic>))
        .toList();
  }

  Future<List<UserItem>> fetchUsers(String token) async {
    final response = await _requestWithFallback((baseUrl) {
      return _client.get(Uri.parse('$baseUrl/users'), headers: _headers(token)).timeout(const Duration(seconds: 4));
    });
    _throwIfNeeded(response);
    return (jsonDecode(response.body) as List<dynamic>)
        .map((entry) => UserItem.fromJson(entry as Map<String, dynamic>))
        .toList();
  }

  Future<TransportRequestItem> fetchDriverCurrentTransport(String token) async {
    final response = await _requestWithFallback((baseUrl) {
      return _client
          .get(Uri.parse('$baseUrl/transport-requests/driver/current'), headers: _headers(token))
          .timeout(const Duration(seconds: 4));
    });
    _throwIfNeeded(response);
    return TransportRequestItem.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  Future<TransportRequestItem> confirmDriverLoading(
    String token,
    String transportId, {
    required String qrToken,
    required String signedBy,
    required String signatureSvg,
  }) async {
    final response = await _requestWithFallback((baseUrl) {
      return _client
          .post(
            Uri.parse('$baseUrl/transport-requests/$transportId/driver/loading-scan'),
            headers: _headers(token),
            body: jsonEncode({
              'qrToken': qrToken,
              'signedBy': signedBy,
              'signatureSvg': signatureSvg,
            }),
          )
          .timeout(const Duration(seconds: 4));
    });
    _throwIfNeeded(response);
    return TransportRequestItem.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  Future<TransportRequestItem> confirmDriverUnloading(
    String token,
    String transportId, {
    required String qrToken,
  }) async {
    final response = await _requestWithFallback((baseUrl) {
      return _client
          .post(
            Uri.parse('$baseUrl/transport-requests/$transportId/driver/unloading-scan'),
            headers: _headers(token),
            body: jsonEncode({'qrToken': qrToken}),
          )
          .timeout(const Duration(seconds: 4));
    });
    _throwIfNeeded(response);
    return TransportRequestItem.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  Future<List<NotificationItem>> fetchNotifications(String token) async {
    final response = await _requestWithFallback((baseUrl) {
      return _client
          .get(Uri.parse('$baseUrl/notifications'), headers: _headers(token))
          .timeout(const Duration(seconds: 4));
    });
    _throwIfNeeded(response);
    return (jsonDecode(response.body) as List<dynamic>)
        .map((entry) => NotificationItem.fromJson(entry as Map<String, dynamic>))
        .toList();
  }

  Future<SitePlanItem> fetchSitePlan(
    String token, {
    required String planDate,
    String? siteId,
  }) async {
    final params = <String, String>{'planDate': planDate};
    if (siteId != null && siteId.isNotEmpty) {
      params['siteId'] = siteId;
    }

    final response = await _requestWithFallback((baseUrl) {
      final uri = Uri.parse('$baseUrl/site-plans').replace(queryParameters: params);
      return _client.get(uri, headers: _headers(token)).timeout(const Duration(seconds: 4));
    });
    _throwIfNeeded(response);
    return SitePlanItem.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  Future<SitePlanItem> upsertSitePlan(
    String token, {
    required String planDate,
    required String status,
    required String shiftStatus,
    required String briefing,
    required String safetyNotes,
    required List<Map<String, dynamic>> zones,
    String? siteId,
  }) async {
    final params = <String, String>{};
    if (siteId != null && siteId.isNotEmpty) {
      params['siteId'] = siteId;
    }

    final response = await _requestWithFallback((baseUrl) {
      final uri = Uri.parse('$baseUrl/site-plans').replace(queryParameters: params);
      return _client
          .put(
            uri,
            headers: _headers(token),
            body: jsonEncode({
              'planDate': planDate,
              'status': status,
              'shiftStatus': shiftStatus,
              'briefing': briefing,
              'safetyNotes': safetyNotes,
              'briefings': [],
              'zones': zones,
            }),
          )
          .timeout(const Duration(seconds: 4));
    });
    _throwIfNeeded(response);
    return SitePlanItem.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  static List<String> _buildBaseUrls() {
    if (_configuredBaseUrl.isNotEmpty) {
      return _uniqueUrls([_configuredBaseUrl, _cloudFallbackBaseUrl]);
    }

    if (kIsWeb) {
      return _uniqueUrls([_cloudFallbackBaseUrl, 'http://localhost:3000']);
    }

    if (Platform.isAndroid) {
      return _uniqueUrls([_cloudFallbackBaseUrl, 'http://10.0.2.2:3000', 'http://127.0.0.1:3000']);
    }

    return _uniqueUrls([_cloudFallbackBaseUrl, 'http://localhost:3000']);
  }

  static List<String> _uniqueUrls(List<String> urls) {
    final seen = <String>{};
    final result = <String>[];
    for (final url in urls) {
      final trimmed = url.trim();
      if (trimmed.isEmpty || seen.contains(trimmed)) {
        continue;
      }
      seen.add(trimmed);
      result.add(trimmed);
    }
    return result;
  }

  List<String> _orderedBaseUrls() {
    if (_activeBaseUrl == null) {
      return _baseUrls;
    }

    final reordered = <String>[_activeBaseUrl!, ..._baseUrls.where((url) => url != _activeBaseUrl)];
    return reordered;
  }

  Future<http.Response> _requestWithFallback(Future<http.Response> Function(String baseUrl) request) async {
    Object? lastError;

    for (final baseUrl in _orderedBaseUrls()) {
      try {
        final response = await request(baseUrl);
        _activeBaseUrl = baseUrl;
        return response;
      } on SocketException catch (error) {
        lastError = error;
      } on TimeoutException catch (error) {
        lastError = error;
      } on http.ClientException catch (error) {
        lastError = error;
      }
    }

    throw HttpException('API nicht erreichbar (${lastError ?? 'unknown error'})');
  }

  Map<String, String> _headers(String token) => {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      };

  void _throwIfNeeded(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return;
    }

    throw HttpException(response.body.isEmpty ? 'Request failed' : response.body);
  }
}
