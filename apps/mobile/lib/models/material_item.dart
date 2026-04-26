import 'site_summary.dart';

class MaterialItem {
  const MaterialItem({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.quantity,
    required this.condition,
    required this.imageUrl,
    required this.latitude,
    required this.longitude,
    required this.siteId,
    required this.status,
    required this.distanceKm,
    this.site,
  });

  final String id;
  final String title;
  final String description;
  final String category;
  final double quantity;
  final String condition;
  final String imageUrl;
  final double latitude;
  final double longitude;
  final String siteId;
  final String status;
  final double distanceKm;
  final SiteSummary? site;

  factory MaterialItem.fromJson(Map<String, dynamic> json) {
    final location = json['location'] as Map<String, dynamic>? ?? const {};
    return MaterialItem(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      category: json['category'] as String,
      quantity: (json['quantity'] as num).toDouble(),
      condition: json['condition'] as String,
      imageUrl: json['imageUrl'] as String,
      latitude: (location['lat'] as num).toDouble(),
      longitude: (location['lng'] as num).toDouble(),
      siteId: json['siteId'] as String,
      status: json['status'] as String,
      distanceKm: (json['distanceKm'] as num).toDouble(),
      site: json['site'] == null ? null : SiteSummary.fromJson(json['site'] as Map<String, dynamic>),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'description': description,
        'category': category,
        'quantity': quantity,
        'condition': condition,
        'imageUrl': imageUrl,
        'location': {
          'lat': latitude,
          'lng': longitude,
        },
        'siteId': siteId,
        'status': status,
        'distanceKm': distanceKm,
        'site': site?.toJson(),
      };
}
