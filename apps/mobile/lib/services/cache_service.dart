import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

class CacheService {
  static const _sessionKey = 'matflow.session';
  static const _materialsKey = 'matflow.materials';
  static const _transportsKey = 'matflow.transports';

  SharedPreferences? _preferences;

  Future<void> initialize() async {
    _preferences = await SharedPreferences.getInstance();
  }

  Map<String, dynamic>? readSession() {
    final rawValue = _preferences?.getString(_sessionKey);
    return rawValue == null ? null : jsonDecode(rawValue) as Map<String, dynamic>;
  }

  Future<void> writeSession(Map<String, dynamic>? value) async {
    if (value == null) {
      await _preferences?.remove(_sessionKey);
      return;
    }
    await _preferences?.setString(_sessionKey, jsonEncode(value));
  }

  List<Map<String, dynamic>> readMaterials() {
    final rawValue = _preferences?.getString(_materialsKey);
    if (rawValue == null) {
      return const [];
    }
    return (jsonDecode(rawValue) as List<dynamic>).cast<Map<String, dynamic>>();
  }

  Future<void> writeMaterials(List<Map<String, dynamic>> value) async {
    await _preferences?.setString(_materialsKey, jsonEncode(value));
  }

  List<Map<String, dynamic>> readTransports() {
    final rawValue = _preferences?.getString(_transportsKey);
    if (rawValue == null) {
      return const [];
    }
    return (jsonDecode(rawValue) as List<dynamic>).cast<Map<String, dynamic>>();
  }

  Future<void> writeTransports(List<Map<String, dynamic>> value) async {
    await _preferences?.setString(_transportsKey, jsonEncode(value));
  }
}
