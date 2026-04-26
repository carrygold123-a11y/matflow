import 'site_summary.dart';

class AuthSession {
  const AuthSession({
    required this.token,
    required this.userId,
    required this.name,
    required this.email,
    required this.role,
    required this.siteId,
    this.site,
  });

  final String token;
  final String userId;
  final String name;
  final String email;
  final String role;
  final String siteId;
  final SiteSummary? site;

  factory AuthSession.fromLoginResponse(Map<String, dynamic> json) {
    final user = json['user'] as Map<String, dynamic>;
    return AuthSession(
      token: json['accessToken'] as String,
      userId: user['id'] as String,
      name: user['name'] as String,
      email: user['email'] as String,
      role: user['role'] as String,
      siteId: user['siteId'] as String,
      site: user['site'] == null ? null : SiteSummary.fromJson(user['site'] as Map<String, dynamic>),
    );
  }

  factory AuthSession.fromJson(Map<String, dynamic> json) {
    return AuthSession(
      token: json['token'] as String,
      userId: json['userId'] as String,
      name: json['name'] as String,
      email: json['email'] as String,
      role: json['role'] as String,
      siteId: json['siteId'] as String,
      site: json['site'] == null ? null : SiteSummary.fromJson(json['site'] as Map<String, dynamic>),
    );
  }

  Map<String, dynamic> toJson() => {
        'token': token,
        'userId': userId,
        'name': name,
        'email': email,
        'role': role,
        'siteId': siteId,
        'site': site?.toJson(),
      };
}
