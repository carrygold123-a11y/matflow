import 'package:flutter/material.dart';

import '../models/material_item.dart';

const _apiBaseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'https://matflow-production.up.railway.app');

class MaterialCard extends StatelessWidget {
  const MaterialCard({
    super.key,
    required this.material,
    required this.onTap,
  });

  final MaterialItem material;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final imageUrl = material.imageUrl.startsWith('http') ? material.imageUrl : '$_apiBaseUrl${material.imageUrl}';
    final statusLabel = material.status == 'available'
        ? 'Verfugbar'
        : material.status == 'reserved'
            ? 'Reserviert'
            : 'Abgeholt';
    final statusColor = material.status == 'available'
        ? const Color(0xFF4ADE80)
        : material.status == 'reserved'
            ? const Color(0xFFF5BF18)
            : const Color(0xFF94A3B8);

    return Card(
      margin: EdgeInsets.zero,
      color: const Color(0xFF131A24),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
                  child: Image.network(
                    imageUrl,
                    height: 172,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      height: 172,
                      color: const Color(0xFF0D131D),
                      alignment: Alignment.center,
                      child: const Icon(Icons.photo_size_select_actual_outlined, size: 40, color: Color(0xFFF5BF18)),
                    ),
                  ),
                ),
                Positioned(
                  top: 10,
                  right: 10,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0D131D),
                      border: Border.all(color: const Color(0xFF253042)),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      statusLabel,
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: statusColor),
                    ),
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF5BF18).withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          material.category,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFFB45309),
                          ),
                        ),
                      ),
                      const Spacer(),
                      Text(
                        '${material.distanceKm.toStringAsFixed(1)} km',
                        style: const TextStyle(
                          color: Color(0xFF91A0B8),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    material.title,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFFE8EDF4),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    material.description,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Color(0xFF91A0B8), height: 1.35),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      const Icon(Icons.location_on_outlined, size: 18, color: Color(0xFF91A0B8)),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          material.site?.name ?? material.siteId,
                          style: const TextStyle(color: Color(0xFFE8EDF4), fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
