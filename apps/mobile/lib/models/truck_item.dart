import 'site_summary.dart';

class TruckItem {
  const TruckItem({
    required this.id,
    required this.name,
    required this.siteId,
    required this.available,
    this.site,
  });

  final String id;
  final String name;
  final String siteId;
  final bool available;
  final SiteSummary? site;

  factory TruckItem.fromJson(Map<String, dynamic> json) {
    return TruckItem(
      id: json['id'] as String,
      name: json['name'] as String,
      siteId: json['siteId'] as String,
      available: json['available'] as bool,
      site: json['site'] == null ? null : SiteSummary.fromJson(json['site'] as Map<String, dynamic>),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'siteId': siteId,
        'available': available,
        'site': site?.toJson(),
      };
}
