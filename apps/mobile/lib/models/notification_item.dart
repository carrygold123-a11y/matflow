class NotificationItem {
  const NotificationItem({
    required this.id,
    required this.type,
    required this.message,
    required this.createdAt,
  });

  final String id;
  final String type;
  final String message;
  final DateTime createdAt;

  factory NotificationItem.fromJson(Map<String, dynamic> json) {
    return NotificationItem(
      id: json['id'] as String,
      type: json['type'] as String,
      message: json['message'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  String get typeLabel {
    switch (type) {
      case 'material.created':
        return 'Material';
      case 'material.reserved':
        return 'Reservierung';
      case 'material.status.changed':
        return 'Status';
      case 'transport.created':
        return 'Transport';
      case 'transport.status.changed':
        return 'Transport';
      default:
        return type;
    }
  }
}
