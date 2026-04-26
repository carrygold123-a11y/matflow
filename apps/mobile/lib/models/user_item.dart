import 'site_summary.dart';

class UserItem {
  const UserItem({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.siteId,
    this.site,
  });

  final String id;
  final String name;
  final String email;
  final String role;
  final String siteId;
  final SiteSummary? site;

  factory UserItem.fromJson(Map<String, dynamic> json) {
    return UserItem(
      id: (json['id'] as String?) ?? '',
      name: (json['name'] as String?) ?? '',
      email: (json['email'] as String?) ?? '',
      role: (json['role'] as String?) ?? 'worker',
      siteId: (json['siteId'] as String?) ?? '',
      site: json['site'] == null ? null : SiteSummary.fromJson(json['site'] as Map<String, dynamic>),
    );
  }
}
