import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../models/material_item.dart';
import '../models/site_summary.dart';

class MapScreen extends StatelessWidget {
  const MapScreen({super.key, required this.materials, required this.sites});

  final List<MaterialItem> materials;
  final List<SiteSummary> sites;

  @override
  Widget build(BuildContext context) {
    final center = materials.isNotEmpty
        ? LatLng(materials.first.latitude, materials.first.longitude)
        : (sites.isNotEmpty ? LatLng(sites.first.latitude, sites.first.longitude) : const LatLng(51.1657, 10.4515));

    return FlutterMap(
      options: MapOptions(initialCenter: center, initialZoom: 6.2),
      children: [
        TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          userAgentPackageName: 'matflow_mobile',
        ),
        MarkerLayer(
          markers: [
            ...sites.map(
              (site) => Marker(
                point: LatLng(site.latitude, site.longitude),
                width: 42,
                height: 42,
                child: Container(
                  decoration: const BoxDecoration(color: Color(0xFF111111), shape: BoxShape.circle),
                  child: const Icon(Icons.apartment, color: Color(0xFFF5BF18), size: 22),
                ),
              ),
            ),
            ...materials.map(
              (material) => Marker(
                point: LatLng(material.latitude, material.longitude),
                width: 38,
                height: 38,
                child: Container(
                  decoration: const BoxDecoration(color: Color(0xFFF5BF18), shape: BoxShape.circle),
                  child: const Icon(Icons.inventory_2_outlined, color: Color(0xFF111111), size: 20),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
