class SitePlanAssignmentItem {
  const SitePlanAssignmentItem({
    required this.userId,
    this.userName,
    required this.sortOrder,
  });

  final String userId;
  final String? userName;
  final int sortOrder;

  factory SitePlanAssignmentItem.fromJson(Map<String, dynamic> json) {
    final user = json['user'] as Map<String, dynamic>?;
    return SitePlanAssignmentItem(
      userId: (json['userId'] as String?) ?? '',
      userName: user?['name'] as String?,
      sortOrder: (json['sortOrder'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
    'userId': userId,
    'sortOrder': sortOrder,
  };
}

class SitePlanMaterialNeedItem {
  const SitePlanMaterialNeedItem({
    required this.label,
    required this.quantity,
    required this.unit,
    required this.status,
    required this.notes,
    required this.sortOrder,
  });

  final String label;
  final double quantity;
  final String unit;
  final String status;
  final String notes;
  final int sortOrder;

  factory SitePlanMaterialNeedItem.fromJson(Map<String, dynamic> json) {
    return SitePlanMaterialNeedItem(
      label: (json['label'] as String?) ?? '',
      quantity: (json['quantity'] as num?)?.toDouble() ?? 0,
      unit: (json['unit'] as String?) ?? 'x',
      status: (json['status'] as String?) ?? 'needed',
      notes: (json['notes'] as String?) ?? '',
      sortOrder: (json['sortOrder'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
    'label': label,
    'quantity': quantity,
    'unit': unit,
    'status': status,
    'notes': notes,
    'sortOrder': sortOrder,
  };
}

class SitePlanZoneItem {
  const SitePlanZoneItem({
    required this.id,
    required this.name,
    required this.shiftLabel,
    required this.focus,
    required this.supportCategory,
    required this.priority,
    required this.sortOrder,
    required this.assignments,
    required this.materialNeeds,
  });

  final String id;
  final String name;
  final String shiftLabel;
  final String focus;
  final String supportCategory;
  final String priority;
  final int sortOrder;
  final List<SitePlanAssignmentItem> assignments;
  final List<SitePlanMaterialNeedItem> materialNeeds;

  factory SitePlanZoneItem.fromJson(Map<String, dynamic> json) {
    final assignmentsRaw = json['assignments'] as List<dynamic>? ?? const [];
    final materialNeedsRaw = json['materialNeeds'] as List<dynamic>? ?? const [];
    return SitePlanZoneItem(
      id: (json['id'] as String?) ?? '',
      name: (json['name'] as String?) ?? 'Unbenannte Zone',
      shiftLabel: (json['shiftLabel'] as String?) ?? '',
      focus: (json['focus'] as String?) ?? '',
      supportCategory: (json['supportCategory'] as String?) ?? '',
      priority: (json['priority'] as String?) ?? 'focus',
      sortOrder: (json['sortOrder'] as num?)?.toInt() ?? 0,
      assignments: assignmentsRaw
          .map((item) => SitePlanAssignmentItem.fromJson(item as Map<String, dynamic>))
          .toList()
        ..sort((a, b) => a.sortOrder.compareTo(b.sortOrder)),
      materialNeeds: materialNeedsRaw
          .map((item) => SitePlanMaterialNeedItem.fromJson(item as Map<String, dynamic>))
          .toList()
        ..sort((a, b) => a.sortOrder.compareTo(b.sortOrder)),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'shiftLabel': shiftLabel,
    'focus': focus,
    'supportCategory': supportCategory,
    'priority': priority,
    'sortOrder': sortOrder,
    'assignments': assignments.map((a) => a.toJson()).toList(),
    'materialNeeds': materialNeeds.map((m) => m.toJson()).toList(),
  };
}

class SitePlanItem {
  const SitePlanItem({
    required this.id,
    required this.siteId,
    required this.planDate,
    required this.status,
    required this.shiftStatus,
    required this.briefing,
    required this.safetyNotes,
    required this.zones,
    required this.updatedAt,
  });

  final String id;
  final String siteId;
  final String planDate;
  final String status;
  final String shiftStatus;
  final String briefing;
  final String safetyNotes;
  final List<SitePlanZoneItem> zones;
  final DateTime updatedAt;

  factory SitePlanItem.fromJson(Map<String, dynamic> json) {
    final zonesRaw = json['zones'] as List<dynamic>? ?? const [];
    return SitePlanItem(
      id: (json['id'] as String?) ?? '',
      siteId: (json['siteId'] as String?) ?? '',
      planDate: (json['planDate'] as String?) ?? '',
      status: (json['status'] as String?) ?? 'draft',
      shiftStatus: (json['shiftStatus'] as String?) ?? 'not_ready',
      briefing: (json['briefing'] as String?) ?? '',
      safetyNotes: (json['safetyNotes'] as String?) ?? '',
      zones: zonesRaw.map((item) => SitePlanZoneItem.fromJson(item as Map<String, dynamic>)).toList()
        ..sort((a, b) => a.sortOrder.compareTo(b.sortOrder)),
      updatedAt: DateTime.tryParse((json['updatedAt'] as String?) ?? '') ?? DateTime.now(),
    );
  }
}
