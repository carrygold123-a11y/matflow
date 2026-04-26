import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/material_item.dart';
import '../providers/materials_provider.dart';
import '../providers/session_provider.dart';

const _apiBaseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://10.0.2.2:3000');

class MaterialDetailScreen extends StatelessWidget {
  const MaterialDetailScreen({super.key, required this.material});

  final MaterialItem material;

  @override
  Widget build(BuildContext context) {
    final session = context.read<SessionProvider>().session!;
    final materialsProvider = context.read<MaterialsProvider>();
    final imageUrl = material.imageUrl.startsWith('http') ? material.imageUrl : '$_apiBaseUrl${material.imageUrl}';
    final statusLabel = material.status == 'available'
        ? 'Verfugbar'
        : material.status == 'reserved'
            ? 'Reserviert'
            : 'Abgeholt';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Material Detail'),
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_outline),
            onPressed: () async {
              final confirmed = await showDialog<bool>(
                context: context,
                builder: (dialogContext) => AlertDialog(
                  title: const Text('Material löschen?'),
                  content: Text('"${material.title}" wird dauerhaft gelöscht.'),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.of(dialogContext).pop(false),
                      child: const Text('Abbrechen'),
                    ),
                    FilledButton(
                      onPressed: () => Navigator.of(dialogContext).pop(true),
                      child: const Text('Löschen'),
                    ),
                  ],
                ),
              );

              if (confirmed != true) {
                return;
              }

              await materialsProvider.deleteMaterial(session, material.id);
              if (context.mounted) {
                Navigator.of(context).pop();
              }
            },
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Stack(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(24),
                child: Image.network(
                  imageUrl,
                  height: 260,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    height: 260,
                    color: const Color(0xFF131A24),
                    alignment: Alignment.center,
                    child: const Icon(Icons.photo_size_select_actual_outlined, color: Color(0xFFF5BF18), size: 46),
                  ),
                ),
              ),
              Positioned(
                top: 12,
                right: 12,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0D131D),
                    border: Border.all(color: const Color(0xFF253042)),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    statusLabel,
                    style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFFF5BF18)),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Container(
            width: 120,
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFFF5BF18).withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(material.category, style: const TextStyle(color: Color(0xFFF5BF18), fontWeight: FontWeight.w700)),
          ),
          const SizedBox(height: 8),
          Text(
            material.title,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  color: const Color(0xFFE8EDF4),
                  fontWeight: FontWeight.w800,
                ),
          ),
          const SizedBox(height: 12),
          Text(material.description, style: const TextStyle(color: Color(0xFF91A0B8), height: 1.35)),
          const SizedBox(height: 16),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              Chip(label: Text('${material.quantity.toStringAsFixed(0)} Stuck')),
              Chip(label: Text(material.condition)),
              Chip(label: Text('${material.distanceKm.toStringAsFixed(1)} km entfernt')),
              Chip(label: Text(material.site?.name ?? material.siteId)),
            ],
          ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: material.status == 'available'
                ? () async {
                    await materialsProvider.reserve(session, material.id);
                    if (context.mounted) Navigator.of(context).pop();
                  }
                : null,
            child: const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Text('Reservieren'),
            ),
          ),
          const SizedBox(height: 12),
          OutlinedButton(
            onPressed: () async {
              await materialsProvider.updateStatus(session, material.id, 'picked_up');
              if (context.mounted) Navigator.of(context).pop();
            },
            child: const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Text('Route starten'),
            ),
          ),
        ],
      ),
    );
  }
}
