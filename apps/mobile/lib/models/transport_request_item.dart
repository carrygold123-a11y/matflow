import 'material_item.dart';
import 'site_summary.dart';
import 'truck_item.dart';

class DriverAccessInfo {
  const DriverAccessInfo({
    required this.loginPlate,
    this.accessCode,
    this.driverName,
    this.driverCompany,
    this.loadingQrToken,
    this.unloadingQrToken,
    this.loadingScannedAt,
    this.unloadingScannedAt,
    this.loadingSignedAt,
    this.loadingSignedBy,
    this.loadingSignaturePath,
    this.deliveryNotePath,
  });

  final String loginPlate;
  final String? accessCode;
  final String? driverName;
  final String? driverCompany;
  final String? loadingQrToken;
  final String? unloadingQrToken;
  final String? loadingScannedAt;
  final String? unloadingScannedAt;
  final String? loadingSignedAt;
  final String? loadingSignedBy;
  final String? loadingSignaturePath;
  final String? deliveryNotePath;

  factory DriverAccessInfo.fromJson(Map<String, dynamic> json) {
    return DriverAccessInfo(
      loginPlate: (json['loginPlate'] as String?) ?? '',
      accessCode: json['accessCode'] as String?,
      driverName: json['driverName'] as String?,
      driverCompany: json['driverCompany'] as String?,
      loadingQrToken: json['loadingQrToken'] as String?,
      unloadingQrToken: json['unloadingQrToken'] as String?,
      loadingScannedAt: json['loadingScannedAt'] as String?,
      unloadingScannedAt: json['unloadingScannedAt'] as String?,
      loadingSignedAt: json['loadingSignedAt'] as String?,
      loadingSignedBy: json['loadingSignedBy'] as String?,
      loadingSignaturePath: json['loadingSignaturePath'] as String?,
      deliveryNotePath: json['deliveryNotePath'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'loginPlate': loginPlate,
        'accessCode': accessCode,
        'driverName': driverName,
        'driverCompany': driverCompany,
        'loadingQrToken': loadingQrToken,
        'unloadingQrToken': unloadingQrToken,
        'loadingScannedAt': loadingScannedAt,
        'unloadingScannedAt': unloadingScannedAt,
        'loadingSignedAt': loadingSignedAt,
        'loadingSignedBy': loadingSignedBy,
        'loadingSignaturePath': loadingSignaturePath,
        'deliveryNotePath': deliveryNotePath,
      };
}

class TransportRequestItem {
  const TransportRequestItem({
    required this.id,
    required this.materialId,
    required this.fromSiteId,
    required this.toSiteId,
    required this.truckId,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    this.material,
    this.fromSite,
    this.toSite,
    this.truck,
    this.driverAccess,
  });

  final String id;
  final String materialId;
  final String fromSiteId;
  final String toSiteId;
  final String truckId;
  final String status;
  final DateTime createdAt;
  final DateTime updatedAt;
  final MaterialItem? material;
  final SiteSummary? fromSite;
  final SiteSummary? toSite;
  final TruckItem? truck;
  final DriverAccessInfo? driverAccess;

  factory TransportRequestItem.fromJson(Map<String, dynamic> json) {
    return TransportRequestItem(
      id: json['id'] as String,
      materialId: json['materialId'] as String,
      fromSiteId: json['fromSiteId'] as String,
      toSiteId: json['toSiteId'] as String,
      truckId: json['truckId'] as String,
      status: json['status'] as String,
      createdAt: DateTime.tryParse((json['createdAt'] as String?) ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse((json['updatedAt'] as String?) ?? '') ?? DateTime.now(),
      material: json['material'] == null ? null : MaterialItem.fromJson(json['material'] as Map<String, dynamic>),
      fromSite: json['fromSite'] == null ? null : SiteSummary.fromJson(json['fromSite'] as Map<String, dynamic>),
      toSite: json['toSite'] == null ? null : SiteSummary.fromJson(json['toSite'] as Map<String, dynamic>),
      truck: json['truck'] == null ? null : TruckItem.fromJson(json['truck'] as Map<String, dynamic>),
      driverAccess: json['driverAccess'] == null ? null : DriverAccessInfo.fromJson(json['driverAccess'] as Map<String, dynamic>),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'materialId': materialId,
        'fromSiteId': fromSiteId,
        'toSiteId': toSiteId,
        'truckId': truckId,
        'status': status,
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
        'material': material?.toJson(),
        'fromSite': fromSite?.toJson(),
        'toSite': toSite?.toJson(),
        'truck': truck?.toJson(),
        'driverAccess': driverAccess?.toJson(),
      };
}
